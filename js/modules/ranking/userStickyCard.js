import { getCurrentUser, currentUserId } from "../../data/users.js";

function randomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

export function renderUserStickyCard(state) {

    const container = document.getElementById("userStickyCard");
    if (!container) return;

    const rankMainEl = document.getElementById("stickyRankMain");
    const rankSubEl = document.getElementById("stickyRankSub");

    const pointsMainEl = document.getElementById("stickyPointsMain");
    const pointsSubEl = document.getElementById("stickyPointsSub");

    const messageEl = document.getElementById("stickyMessage");

    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    const avatarEl = document.getElementById("stickyAvatar");

    const users = state?.usersPage || [];
    const user = users.find(u => u.id === currentUserId) || getCurrentUser();

    const prev = JSON.parse(sessionStorage.getItem("sticky_prev")) || null;

    // 🛑 safety
    if (!user || !users.length) return;

    // ==============================
    // VISIBILIDAD
    // ==============================
    const row = document.querySelector("tr.is-you");

    const isVisible = row
        ? (row.getBoundingClientRect().top < window.innerHeight &&
            row.getBoundingClientRect().bottom > 0)
        : false;

    container.classList.toggle("in-table-view", isVisible);
    container.classList.toggle("floating", !isVisible);

    // 🖼 avatar
    if (avatarEl && user.avatar) {
        avatarEl.src = `assets/images/${user.avatar}`;
    }

    // 🖼 bandera
    const flagEl = document.getElementById("stickyFlag");
    if (flagEl && user.country) {
        flagEl.src = `https://flagcdn.com/w40/${user.country.toLowerCase()}.png`;
        flagEl.title = user.countryName || user.country;
    }

    const rank = user.rank;
    const points = user.points;

    const top1 = users[0];
    const top3 = users[2];
    const nextUser = users.find(u => u.rank === rank - 1);

    // 📊 PROGRESO
    const top10 = users.slice(0, 10);
    const top10MinPoints = top10?.[top10.length - 1]?.points || 1;

    let progress = Math.min((points / top10MinPoints) * 100, 100);
    progress = progress.toFixed(0);

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) {
        progressText.textContent = `Progreso hacia Top 10 (${progress}%)`;
    }

    // 💬 MENSAJES (nuevo cada vez que se refresca)
    let baseMessage = "";
    let movementMessage = "";

    if (rank === 1) {
        baseMessage = randomMessage([
            "👑 Todos intentan alcanzarte",
            "🔥 Eres el líder absoluto",
            "🏆 Defiende tu posición",
            "⚡ El Top 1 te pertenece",
            "👑 Eres el líder del ranking, nadie te supera",
            "🔥 Estás en la cima, defiéndela con todo",
            "🏆 El resto del mundo te persigue",
            "⚡ Eres el punto de referencia del juego",
            "💎 Estás en otro nivel ahora mismo",
            "🚀 Dominio total del ranking",
            "👑 El trono es tuyo… por ahora",
"🔥 La presión está en ti, no en ellos"
        ]);
        }
    else if (rank <= 3) {

        const diffTop1 = top1?.points - points;

        baseMessage = randomMessage([
            `🔥 A ${diffTop1.toLocaleString()} pts del #1`,
            "🏆 Estás dentro del podio",
            "🚀 No aflojes ahora",
            "⚡ El primer lugar está cerca",
            "🏆 Estás a un paso de la gloria total",
            "🔥 El oro está muy cerca",
            "⚡ No dejes que te bajen del podio",
            "🚀 Estás peleando entre los mejores",
            "💪 Solo unos puntos te separan del #1",
            "🥈 Podio asegurado… pero puedes subir más",
            "🔥 El primer lugar te está mirando",
            "🏁 La carrera sigue abierta"
        ]);
        }
    else if (rank <= 10) {

        const diffPodium = top3?.points - points;

        baseMessage = randomMessage([
            `🚀 Te faltan ${diffPodium.toLocaleString()} pts para entrar al podio`,
            "🔥 El Top 3 está cada vez más cerca",
            "⚡ Una buena jornada lo cambia todo",
            "🏆 Estás compitiendo con los mejores",
            "🚀 Estás en zona de élite",
            "🔥 El podio está a tu alcance",
            "⚡ Una buena racha cambia todo",
            "💪 Estás compitiendo con los mejores",
            "🏆 No estás lejos del top 3",
            "📈 Cada punto te acerca al podio",
            "🎯 Estás en la pelea seria",
            "🔥 No bajes el ritmo ahora"
        ]);
    }
    else if (rank <= 20 && nextUser) {

        const diffNext = nextUser.points - points;

        baseMessage = randomMessage([
            `⚡ Estás a ${diffNext} pts de superar a ${nextUser.name}`,
            "🔥 Vas subiendo poco a poco",
            "💪 Mantén el ritmo",
            "🚀 Cada jornada puede hacerte subir",
            "💪 Estás escalando posiciones",
            "🚀 El top 10 no está tan lejos",
            "⚡ Cada acierto te impulsa",
            "🔥 Vas en la dirección correcta",
            "📊 Estás en zona de crecimiento",
            "🎯 Un buen sprint te hace subir rápido",
            "💪 Sigue así, estás avanzando",
            "🚀 El ranking se está moviendo a tu favor",
        ]);
    }
    else {
        baseMessage = randomMessage([
            "💪 No te desanimes. Cada predicción puede cambiar el ranking",
            "🔥 Sigue jugando y escala posiciones",
            "⚡ Una buena semana puede cambiarlo todo",
            "🚀 Nunca subestimes una racha ganadora",
            "⚡ Cada punto cuenta, sigue jugando",
            "🔥 No subestimes una buena racha",
            "💪 Puedes escalar mucho más",
            "🚀 El ranking cambia rápido",
            "📊 Estás construyendo tu progreso",
            "🎯 El primer paso ya lo diste",
            "🔥 La consistencia te va a subir",
            "💡 Todos empezaron desde abajo",
        ]);
        }

    const finalMessage =
        movementMessage && baseMessage
            ? `${movementMessage} • ${baseMessage}`
            : baseMessage;

    // 🎯 render
    if (rankMainEl) rankMainEl.textContent = `#${rank}`;
    if (rankSubEl) rankSubEl.textContent = `Tu posición actual`;

    if (pointsMainEl) pointsMainEl.textContent = `${points.toLocaleString()} pts`;
    if (pointsSubEl) pointsSubEl.textContent = `Puntos acumulados`;

    if (messageEl) messageEl.textContent = finalMessage;

    container.classList.remove("hidden");
}