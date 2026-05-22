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

    if (positionEl) positionEl.textContent = rank || "--";
    if (pointsEl) pointsEl.textContent = profile?.points?.toLocaleString() || "0";
    if (weekEl) weekEl.textContent = "+0";
}

async function getProfileData(userId) {
    const { data } = await supabase
        .from("profiles")
        .select("points")
        .eq("user_id", userId)
        .single();
    return data;
}