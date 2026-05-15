import { getCurrentUser } from "../../data/users.js";

export function renderHeaderStats() {
    const user = getCurrentUser();
    if (!user) return;

    const positionEl = document.getElementById("headerPosition");
    const pointsEl = document.getElementById("headerPoints");
    const weekEl = document.getElementById("headerWeek");

    if (positionEl) positionEl.textContent = user.rank;
    if (pointsEl) pointsEl.textContent = user.points.toLocaleString();
    if (weekEl) weekEl.textContent = "+0";
}