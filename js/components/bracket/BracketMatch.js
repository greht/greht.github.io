import { formatSlotLabel } from "/js/services/admin/tournament-ui.js"

export function resolveFlagUrl(flagUrl) {
    if (!flagUrl) return "/assets/images/flag-mexV2.svg"
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

    const homeTeam = match.home_team?.name || homeSlotLabel
    const awayTeam = match.away_team?.name || awaySlotLabel
    const homeFlag = match.home_team?.flag_url
        ? resolveFlagUrl(match.home_team.flag_url)
        : "/assets/images/tbd-flag.svg"
    const awayFlag = match.away_team?.flag_url
        ? resolveFlagUrl(match.away_team.flag_url)
        : "/assets/images/tbd-flag.svg"
    const homeIsTbd = !match.home_team
    const awayIsTbd = !match.away_team

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

    const typeClass = matchType !== "normal" ? ` bracket-match-${matchType}` : ''

    return `
        <div class="bracket-match${typeClass}" data-match-id="${match.id}" data-position="${match.bracket_position}" data-phase-order="${phaseOrder}">
            <div class="bracket-match-top">
                ${matchIcon}
                <span class="bracket-match-number${matchNumberClass}">${matchNumberLabel}</span>
                ${phaseTag}
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
