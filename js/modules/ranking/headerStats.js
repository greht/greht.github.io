import { supabase } from "/config/supabase.js";
import { getUserRank } from "/js/services/ranking.js";

export async function renderHeaderStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const positionEl = document.getElementById("headerPosition");
    const pointsEl = document.getElementById("headerPoints");
    const weekEl = document.getElementById("headerWeek");

    const profile = await getProfileData(user.id);
    const { rank } = await getUserRank(user.id);
    const weeklyChange = await getWeeklyChange(user.id, rank);

    if (positionEl) positionEl.textContent = rank || "--";
    if (pointsEl) pointsEl.textContent = profile?.points?.toLocaleString() || "0";
    if (weekEl) {
        if (weeklyChange > 0) {
            weekEl.textContent = `+${weeklyChange}`;
            weekEl.style.color = "var(--color-accent)";
        } else if (weeklyChange < 0) {
            weekEl.textContent = `${weeklyChange}`;
            weekEl.style.color = "#e53e3e";
        } else {
            weekEl.textContent = "0";
            weekEl.style.color = "var(--color-text-secundary)";
        }
    }
}

async function getProfileData(userId) {
    const { data } = await supabase
        .from("profiles")
        .select("points")
        .eq("user_id", userId)
        .single();
    return data;
}

async function getWeeklyChange(userId, currentRank) {
    if (!currentRank) return 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoDate = oneWeekAgo.toISOString().split('T')[0];

    const { data: snapshots } = await supabase
        .from("ranking_snapshots")
        .select("rank_position, snapshot_date")
        .eq("user_id", userId)
        .gte("snapshot_date", weekAgoDate)
        .order("snapshot_date", { ascending: true })
        .limit(1);

    if (!snapshots || snapshots.length === 0) {
        return 0;
    }

    const pastRank = snapshots[0].rank_position;
    const change = pastRank - currentRank;

    return change;
}