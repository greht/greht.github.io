import { supabase } from "/config/supabase.js";
import { getAllUsers } from "/js/services/ranking.js";

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

    slots.forEach(async (el, i) => {
        if (!el) return;

        const user = users[i];

        if (user) {
            el.style.display = "flex";
            el.querySelector(".name").textContent = user.user_name || "Usuario";
            el.querySelector(".stats-result").textContent = user.points || 0;
            el.querySelector(".stat-successes").textContent = user.exact_count || 0;

            const weeklyChange = await getWeeklyChangeForUser(user.user_id);
            const statPosEl = el.querySelector(".stat-pos");
            if (statPosEl) {
                if (weeklyChange > 0) {
                    statPosEl.textContent = `+${weeklyChange}`;
                    statPosEl.style.color = "var(--color-accent)";
                } else if (weeklyChange < 0) {
                    statPosEl.textContent = `${weeklyChange}`;
                    statPosEl.style.color = "#e53e3e";
                } else {
                    statPosEl.textContent = "0";
                    statPosEl.style.color = "var(--color-text-secundary)";
                }
            }

            const avatarSrc = user.avatar_url
                ? user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `/assets/images/${user.avatar_url}`
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

async function getWeeklyChangeForUser(userId) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoStr = oneWeekAgo.toISOString();

    const { data: snapshots } = await supabase
        .from("ranking_snapshots")
        .select("rank_position, snapshot_date")
        .eq("user_id", userId)
        .lte("snapshot_date", weekAgoStr)
        .order("snapshot_date", { ascending: false })
        .limit(1);

    if (!snapshots || snapshots.length === 0) {
        return 0;
    }

    const allUsers = await getAllUsers();

    if (!allUsers) return 0;

    const currentRank = allUsers.findIndex(u => u.user_id === userId) + 1;
    const pastRank = snapshots[0].rank_position;

    return pastRank - currentRank;
}