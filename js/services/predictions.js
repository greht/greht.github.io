import { supabase } from "../../config/supabase.js"


export async function savePrediction(
    userId,
    matchId,
    homePredictions,
    awayPredictions
) {

    const { data, error } = await supabase
        .from("predictions")
        .upsert({
            user_id: userId,
            match_id: matchId,
            home_predictions: homePredictions,
            away_predictions: awayPredictions,
            update_at: new Date()
        }, { onConflict: "user_id, match_id" })

    if (error) {
        console.error("❌ Error guardando predicción:", error)
        return null
    }

    return data
}

export async function getPredictions(userId) {

    const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId)

    if (error) {
        console.error(error)
        return []
    }

    return data
}