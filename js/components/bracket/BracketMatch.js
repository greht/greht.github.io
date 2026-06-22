import { formatSlotLabel } from "/js/services/admin/tournament-ui.js"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function formatMatchDate(dateStr) {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const day = DAYS[d.getUTCDay()]
    const num = d.getUTCDate()
    const month = MONTHS[d.getUTCMonth()]
    const h = String(d.getUTCHours()).padStart(2, "0")
    const m = String(d.getUTCMinutes()).padStart(2, "0")
    return `${day} ${num} ${month} • ${h}:${m}`
}

export function resolveFlagUrl(flagUrl) {
    if (!flagUrl) return "/assets/images/predictilab-gray.svg"
    if (flagUrl.startsWith("http://") || flagUrl.startsWith("https://")) return flagUrl
    if (flagUrl.startsWith("<svg") || flagUrl.startsWith("<?xml")) {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(flagUrl)
    }
    const fixes = { "sp.svg": "es.svg" }
    let path = flagUrl
    for (const [bad, good] of Object.entries(fixes)) {
        path = path.replace(bad, good)
    }
    if (path.startsWith("/")) return path
    return "/" + path
}

export async function renderBracketMatch(match, leagueId, phaseOrder = 0, phaseLabel = "", matchType = "normal") {
    const matchNumberLabel = match.match_number ? `P${match.match_number}` : `P${match.id ? match.id.slice(-2).toUpperCase() : "??"}`

    // Formatear los slots para mostrar etiquetas más intuitivas
    const homeSlotLabel = match.home_slot ? await formatSlotLabel(match.home_slot, leagueId) : matchNumberLabel
    const awaySlotLabel = match.away_slot ? await formatSlotLabel(match.away_slot, leagueId) : matchNumberLabel

    // Supabase puede devolver joins como objeto o array
    const homeTeamData = Array.isArray(match.home_team) ? match.home_team[0] : match.home_team
    const awayTeamData = Array.isArray(match.away_team) ? match.away_team[0] : match.away_team

    const homeTeam = homeTeamData?.name || homeSlotLabel
    const awayTeam = awayTeamData?.name || awaySlotLabel
    const homeFlag = homeTeamData?.flag_url
        ? resolveFlagUrl(homeTeamData.flag_url)
        : "/assets/images/tbd-flag.svg"
    const awayFlag = awayTeamData?.flag_url
        ? resolveFlagUrl(awayTeamData.flag_url)
        : "/assets/images/tbd-flag.svg"
    const homeIsTbd = !homeTeamData
    const awayIsTbd = !awayTeamData

    const isFinished = match.status === "finished"
    const isLive = match.status === "live"
    const hasPrediction = match.home_predictions !== null && match.home_predictions !== undefined
    const showPoints = isFinished && hasPrediction && match.points_earned !== null && match.points_earned !== undefined

    const phaseTag = phaseLabel ? `<span class="bracket-mini-phase">${phaseLabel}</span>` : ''

    // Íconos decorativos para Final y 3er lugar
    let matchIcon = ''
    let matchNumberClass = ''
    if (matchType === "final") {
        matchIcon = '<span class="bracket-match-icon">🏆</span>'
        matchNumberClass = ' bracket-match-number-final'
    } else if (matchType === "third") {
        matchIcon = '<span class="bracket-match-icon">🥉</span>'
        matchNumberClass = ' bracket-match-number-third'
    }

    let homeScore, awayScore
    let homePredDisplay, awayPredDisplay

    if (isFinished || isLive) {
        homeScore = match.home_score ?? "-"
        awayScore = match.away_score ?? "-"
    } else {
        homeScore = "-"
        awayScore = "-"
    }

    if (hasPrediction) {
        homePredDisplay = match.home_predictions
        awayPredDisplay = match.away_predictions
    }

    let statusClass = "scheduled"
    let statusText = "Próximamente"
    if (isFinished) {
        statusClass = "finished"
        statusText = "Finalizado"
    } else if (isLive) {
        statusClass = "live"
        statusText = "EN VIVO"
    }

    let pointsBadge = ""
    if (showPoints) {
        const ptsClass = match.points_earned === 0 ? "zero" : ""
        pointsBadge = `<span class="bracket-points ${ptsClass}">+${match.points_earned}</span>`
    } else if (isFinished && !hasPrediction) {
        pointsBadge = `<span class="bracket-points miss">-</span>`
    }

    let predictionDisplay = ""
    if (hasPrediction && !isFinished && !isLive) {
        predictionDisplay = `<span class="bracket-pred-mini">${homePredDisplay}-${awayPredDisplay}</span>`
    }

    const dateTimeDisplay = !isFinished ? formatMatchDate(match.match_date) : ""

    const typeClass = matchType !== "normal" ? ` bracket-match-${matchType}` : ''

    return `
        <div class="bracket-match${typeClass}" data-match-id="${match.id}" data-position="${match.bracket_position}" data-phase-order="${phaseOrder}">
            <div class="bracket-match-top">
                ${matchIcon}
                <span class="bracket-match-number${matchNumberClass}">${matchNumberLabel}</span>
                ${phaseTag}
                ${dateTimeDisplay ? `<span class="bracket-match-datetime">${dateTimeDisplay}</span>` : ""}
            </div>
            <div class="bracket-match-teams">
                <div class="bracket-team home ${isFinished && match.home_score > match.away_score ? "winner" : ""} ${homeIsTbd ? "tbd" : ""}">
                    <div class="bracket-flag">
                        <img src="${homeFlag}" alt="${homeTeam}">
                    </div>
                    <span class="bracket-team-name">${homeTeam}</span>
                    <span class="bracket-score official">${homeScore}</span>
                </div>
                <div class="bracket-team away ${isFinished && match.away_score > match.home_score ? "winner" : ""} ${awayIsTbd ? "tbd" : ""}">
                    <div class="bracket-flag">
                        <img src="${awayFlag}" alt="${awayTeam}">
                    </div>
                    <span class="bracket-team-name">${awayTeam}</span>
                    <span class="bracket-score official">${awayScore}</span>
                </div>
            </div>
            <div class="bracket-match-meta">
                <span class="bracket-match-status ${statusClass}">${statusText}</span>
                ${predictionDisplay}
                ${pointsBadge}
            </div>
        </div>
    `
}
