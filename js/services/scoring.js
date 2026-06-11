import { supabase } from "/config/supabase.js";

export const POINTS = {
    EXACT_SCORE: 3,
    CORRECT_RESULT: 1,
    NO_MATCH: 0
};

export const PREDICTION_DEADLINE_MINUTES = 15;

export function calculatePoints(prediction, matchResult) {
    if (!prediction || !matchResult) {
        return { points: 0, type: "none" };
    }

    const { home_predictions, away_predictions } = prediction;
    const { home_score, away_score } = matchResult;

    if (home_score === null || away_score === null) {
        return { points: 0, type: "pending" };
    }

    const predictedHome = parseInt(home_predictions);
    const predictedAway = parseInt(away_predictions);
    const actualHome = parseInt(home_score);
    const actualAway = parseInt(away_score);

    if (isNaN(predictedHome) || isNaN(predictedAway) || isNaN(actualHome) || isNaN(actualAway)) {
        return { points: 0, type: "invalid" };
    }

    const exactMatch = predictedHome === actualHome && predictedAway === actualAway;
    if (exactMatch) {
        return { points: POINTS.EXACT_SCORE, type: "exact" };
    }

    const predictedWinner = getWinner(predictedHome, predictedAway);
    const actualWinner = getWinner(actualHome, actualAway);

    if (predictedWinner === actualWinner) {
        return { points: POINTS.CORRECT_RESULT, type: "result" };
    }

    return { points: POINTS.NO_MATCH, type: "miss" };
}

function getWinner(home, away) {
    if (home > away) return "home";
    if (away > home) return "away";
    return "draw";
}

export function canPredict(matchDate) {
    const now = new Date();
    const match = new Date(matchDate);
    const deadline = new Date(match.getTime() - PREDICTION_DEADLINE_MINUTES * 60 * 1000);
    return now < deadline;
}

export function isMatchFinished(matchStatus) {
    return matchStatus === "finished";
}

export function getResultTypeLabel(type) {
    const labels = {
        exact: "Marcador exacto (+3)",
        result: "Resultado correcto (+1)",
        miss: "Sin acierto (+0)",
        pending: "Pendiente",
        invalid: "Datos inválidos"
    };
    return labels[type] || type;
}

export async function processFinishedMatches() {
    const { data: finishedMatches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "finished")
        .not("home_score", "is", null)
        .not("away_score", "is", null);

    if (matchesError) {
        console.error("Error fetching finished matches:", matchesError);
        return;
    }

    if (!finishedMatches || finishedMatches.length === 0) {
        return;
    }

    for (const match of finishedMatches) {
        await processMatchPredictions(match);
    }

    await updateAllUserPoints();
    await saveRankingSnapshot();
}

async function processMatchPredictions(match) {
    const { data: predictions, error: predError } = await supabase
        .from("predictions")
        .select("*")
        .eq("match_id", match.id)
        .is("points_earned", null);

    if (predError) {
        console.error("Error fetching predictions for match", match.id, predError);
        return;
    }

    if (!predictions || predictions.length === 0) {
        return;
    }

    const updates = predictions.map(prediction => {
        const result = calculatePoints(prediction, match);
        return {
            id: prediction.id,
            points_earned: result.points
        };
    });

    const { error: updateError } = await supabase
        .from("predictions")
        .upsert(updates);

    if (updateError) {
        console.error("Error updating predictions for match", match.id, updateError);
    }
}

export async function updateAllUserPoints() {
    const { data: allPredictions, error: predError } = await supabase
        .from("predictions")
        .select("user_id, points_earned");

    if (predError) {
        console.error("Error fetching predictions for points update:", predError);
        return;
    }

    const pointsByUser = {};

    allPredictions.forEach(pred => {
        if (!pointsByUser[pred.user_id]) {
            pointsByUser[pred.user_id] = 0;
        }
        pointsByUser[pred.user_id] += pred.points_earned || 0;
    });

    console.log("[DEBUG] Points breakdown:");
    Object.entries(pointsByUser).forEach(([userId, totalPoints]) => {
        const userPredictions = allPredictions.filter(p => p.user_id === userId);
        console.log(`[DEBUG] User: ${userId} - Total: ${totalPoints} - Predictions:`, userPredictions.map(p => ({ id: p.id, points: p.points_earned })));
    });

    const profileUpdates = Object.entries(pointsByUser).map(([userId, points]) => ({
        user_id: userId,
        points: points
    }));

    for (const update of profileUpdates) {
        console.log("[DEBUG] Executing UPDATE for:", update.user_id, "points:", update.points);
        const { error } = await supabase
            .from("profiles")
            .update({ points: update.points })
            .eq("user_id", update.user_id);
        if (error) {
            console.error("[DEBUG] Error:", error);
        } else {
            console.log("[DEBUG] Success for:", update.user_id);
        }
    }
}

export async function updateUserPoints(userId) {
    const { data: predictions, error } = await supabase
        .from("predictions")
        .select("points_earned")
        .eq("user_id", userId);

    if (error) {
        console.error("Error fetching user predictions:", error);
        return;
    }

    const totalPoints = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);

    const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: totalPoints })
        .eq("user_id", userId);

    if (updateError) {
        console.error("Error updating user points:", updateError);
    }

    return totalPoints;
}

export async function saveRankingSnapshot() {
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, points")
        .order("points", { ascending: false });

    if (profilesError) {
        console.error("Error fetching profiles for snapshot:", profilesError);
        return;
    }

    const snapshotDate = new Date().toISOString();
    const snapshots = profiles.map((profile, index) => ({
        user_id: profile.user_id,
        total_points: profile.points,
        rank_position: index + 1,
        snapshot_date: snapshotDate
    }));

    const { error: insertError } = await supabase
        .from("ranking_snapshots")
        .insert(snapshots);

    if (insertError) {
        console.error("Error saving ranking snapshot:", insertError);
    }
}