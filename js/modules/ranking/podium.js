export function renderPodium(filterCountry = "global", allUsers = []) {

    let users;
    if (filterCountry === "global") {
        users = allUsers.slice(0, 3);
    } else {
        users = allUsers.filter(u => u.country_code === filterCountry).slice(0, 3);
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
            el.querySelector(".name").textContent = user.user_name || "Usuario";
            el.querySelector(".stats-result").textContent = user.points || 0;
            el.querySelector(".stat-successes").textContent = user.exact_count || 0;
            const avatarSrc = user.avatar_url
                ? `/assets/images/${user.avatar_url}`
                : "/assets/images/avatar.png";
            const avatarEl = el.querySelector(".rank-card-avatar");
            if (avatarEl) {
                avatarEl.src = avatarSrc;
                avatarEl.onerror = () => {
                    avatarEl.onerror = null;
                    avatarEl.src = "/assets/images/avatar.png";
                };
            }

            const flagEl = el.querySelector(".flag");
            if (flagEl && user.country_code) {
                flagEl.src = `https://flagcdn.com/w40/${user.country_code.toLowerCase()}.png`;
                flagEl.alt = user.country_code || "";
            }
        } else {
            el.style.display = "none";
        }
    });
}