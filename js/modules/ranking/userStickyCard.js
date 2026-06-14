import { supabase } from "/config/supabase.js";
import { getAllUsers } from "/js/services/ranking.js";

function randomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

function syncStickyCardWidth() {
    const table = document.querySelector(".table-wrapper");
    const sticky = document.getElementById("userStickyCard");

    if (!table || !sticky) return;

    const tableWidth = table.offsetWidth;
    sticky.style.width = `${tableWidth}px`;
}

export async function renderUserStickyCard(state) {
    const container = document.getElementById("userStickyCard");
    if (!container) return;

    syncStickyCardWidth();

    window.addEventListener("resize", syncStickyCardWidth);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const users = state?.usersPage || [];

    let profile = users.find(u => u.user_id === user.id);

    if (!profile) {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("user_id, user_name, country_code, points, avatar_url")
            .eq("user_id", user.id)
            .single();
        profile = profileData;
    }

    const points = profile?.points || 0;
    const userName = profile?.user_name || user.email;
    const avatarUrl = profile?.avatar_url
        ? profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `/assets/images/${profile.avatar_url}`
        : "/assets/images/avatar.png";
    const countryCode = profile?.country_code || "";

    const globalUsers = await getAllUsers();

    const rankIndex = globalUsers ? globalUsers.findIndex(u => u.user_id === user.id) : -1;
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;

    const top1 = globalUsers?.[0];
    const top3 = globalUsers?.[2];
    const nextUser = rank > 1 ? globalUsers[rank - 2] : null;

    const rankMainEl = document.getElementById("stickyRankMain");
    const rankSubEl = document.getElementById("stickyRankSub");
    const pointsMainEl = document.getElementById("stickyPointsMain");
    const pointsSubEl = document.getElementById("stickyPointsSub");
    const messageEl = document.getElementById("stickyMessage");
    const avatarEl = document.getElementById("stickyAvatar");
    const flagEl = document.getElementById("stickyFlag");

    const top10 = globalUsers ? globalUsers.slice(0, 10) : [];
    const top10MinPoints = top10?.[top10.length - 1]?.points || 1;

    let progress = top10MinPoints > 0 ? Math.min((points / top10MinPoints) * 100, 100) : 0;
    progress = progress.toFixed(0);

    let baseMessage = "";

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
    } else if (rank <= 3) {
        const diffTop1 = (top1?.points || 0) - points;
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
    } else if (rank <= 10) {
        const diffPodium = (top3?.points || 0) - points;
        baseMessage = randomMessage([
            `🚀 Te faltan ${diffPodium.toLocaleString()} pts para entrar al podio`,
            "🔥 El Top 3 está cada vez más cerca",
            "⚡ Una buena fecha lo cambia todo",
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
    } else if (rank <= 20 && nextUser) {
        const diffNext = nextUser.points - points;
        baseMessage = randomMessage([
            `⚡ Estás a ${diffNext} pts de superar a ${nextUser.user_name || 'otro'}`,
            "🔥 Vas subiendo poco a poco",
            "💪 Mantén el ritmo",
            "🚀 Cada fecha puede hacerte subir",
            "💪 Estás escalando posiciones",
            "🚀 El top 10 no está tan lejos",
            "⚡ Cada acierto te impulsa",
            "🔥 Vas en la dirección correcta",
            "📊 Estás en zona de crecimiento",
            "🎯 Un buen sprint te hace subir rápido",
            "💪 Sigue así, estás avanzando",
            "🚀 El ranking se está moviendo a tu favor"
        ]);
    } else {
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
            "💡 Todos empezaron desde abajo"
        ]);
    }

    if (avatarEl) avatarEl.src = avatarUrl;
    if (flagEl && countryCode) {
        flagEl.src = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
        flagEl.title = countryCode;
    }

    if (rankMainEl) rankMainEl.textContent = `#${rank || '--'}`;
    if (rankSubEl) rankSubEl.textContent = `Tu posición actual`;

    if (pointsMainEl) pointsMainEl.textContent = `${points.toLocaleString()} pts`;
    if (pointsSubEl) pointsSubEl.textContent = `Puntos acumulados`;

    if (messageEl) messageEl.textContent = baseMessage;

    container.classList.remove("hidden");
}