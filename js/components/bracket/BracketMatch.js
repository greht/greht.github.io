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

export function renderBracketMatch(match) {
    const matchShortId = match.id ? match.id.slice(-2).toUpperCase() : "??"
    const homeTeam = match.home_team?.name || `Ganador P${matchShortId}`
    const awayTeam = match.away_team?.name || `Ganador P${matchShortId}`
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

    let statusBadge = ""
    if (isFinished) {
        statusBadge = `<span class="bracket-match-status finished">Finalizado</span>`
    } else if (isLive) {
        statusBadge = `<span class="bracket-match-status live">EN VIVO</span>`
    } else {
        statusBadge = `<span class="bracket-match-status scheduled">Próximamente</span>`
    }

    let pointsBadge = ""
    if (showPoints) {
        const ptsClass = match.points_earned === 0 ? "zero" : ""
        pointsBadge = `<span class="bracket-points ${ptsClass}">+${match.points_earned} pt${match.points_earned !== 1 ? "os" : ""}</span>`
    } else if (isFinished && !hasPrediction) {
        pointsBadge = `<span class="bracket-points miss">Sin predecir</span>`
    }

    let predictionRow = ""
    if (hasPrediction && !isFinished && !isLive) {
        predictionRow = `
            <div class="bracket-prediction">
                <span class="bracket-pred-label">Tu pronóstico</span>
                <span class="bracket-pred-score">${homePredDisplay} - ${awayPredDisplay}</span>
            </div>
        `
    }

    return `
        <div class="bracket-match" data-match-id="${match.id}" data-position="${match.bracket_position}">
            <div class="bracket-match-teams">
                <div class="bracket-team home ${isFinished && match.home_score > match.away_score ? "winner" : ""} ${homeIsTbd ? "tbd" : ""}">
                    <div class="bracket-flag">
                        <img src="${homeFlag}" alt="${homeTeam}">
                    </div>
                    <span class="bracket-team-name">${homeTeam}</span>
                    <span class="bracket-score official">${homeScore}</span>
                    ${hasPrediction ? `<span class="bracket-score prediction">${homePredDisplay}</span>` : ""}
                </div>
                <div class="bracket-team away ${isFinished && match.away_score > match.home_score ? "winner" : ""} ${awayIsTbd ? "tbd" : ""}">
                    <div class="bracket-flag">
                        <img src="${awayFlag}" alt="${awayTeam}">
                    </div>
                    <span class="bracket-team-name">${awayTeam}</span>
                    <span class="bracket-score official">${awayScore}</span>
                    ${hasPrediction ? `<span class="bracket-score prediction">${awayPredDisplay}</span>` : ""}
                </div>
            </div>
            ${predictionRow}
            <div class="bracket-match-footer">
                ${statusBadge}
                ${pointsBadge}
            </div>
        </div>
    `
}
