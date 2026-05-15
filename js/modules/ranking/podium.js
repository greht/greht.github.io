import { getProcessedUsers, getUsersByCountry } from "../../data/users.js";

export function renderPodium(filterCountry = "global") {

    let users;
    if (filterCountry === "global") {
        users = getProcessedUsers().slice(0, 3);
    } else {
        users = getUsersByCountry(filterCountry).slice(0, 3);
    }

    const podiumContainer = document.querySelector(".ranking-podium");

    if (!users || users.length === 0) {
        if (podiumContainer) {
            podiumContainer.innerHTML = `
                <div class="podium-empty">
                    <p>No hay datos para mostrar</p>
                </div>
            `;
        }
        return;
    }

    const slots = [
        document.querySelector(".first"),
        document.querySelector(".second"),
        document.querySelector(".third")
    ];

    slots.forEach((el, i) => {
        if (!el) return;

        const user = users[i];

        if (user) {
            el.style.display = "flex";
            el.querySelector(".name").textContent = user.name;
            el.querySelector(".stats-result").textContent = user.points;
            el.querySelector(".stat-successes").textContent = user.correct;
            el.querySelector(".rank-card-avatar").src =
                `assets/images/${user.avatar}`;
        } else {
            el.style.display = "none";
        }
    });
}