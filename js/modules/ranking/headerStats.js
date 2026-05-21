import { getCurrentUser, getCurrentUserFromSupabase } from "/js/data/users.js";

export async function renderHeaderStats() {
    // Obtener usuario de Supabase primero
    let user = await getCurrentUserFromSupabase();
    
    // Fallback a datos locales
    if (!user) {
        user = getCurrentUser();
    }
    
    if (!user) return;

    const positionEl = document.getElementById("headerPosition");
    const pointsEl = document.getElementById("headerPoints");
    const weekEl = document.getElementById("headerWeek");

    if (positionEl) positionEl.textContent = user?.rank || "--";
    if (pointsEl) pointsEl.textContent = user?.points?.toLocaleString() || "0";
    if (weekEl) weekEl.textContent = "+0";
}