import {
    getBracketPhases,
    getBracketMatchesForPhase,
    swapBracketPositions,
    updateBracketPosition,
    getPreviewConnections
} from "/js/services/admin/bracket-admin.js"
import { checkAdmin } from "/config/admin.js"

function resolveFlagUrl(flagUrl) {
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

let currentPhaseId = null
let phases = []
let currentMatches = []

export async function loadBracketConfigSection() {
    const user = await checkAdmin()
    if (!user) {
        alert("No tienes permisos para acceder a esta sección")
        return
    }

    const container = document.getElementById("bracket-config-section")
    if (!container) return

    phases = await getBracketPhases()

    if (phases.length === 0) {
        container.innerHTML = `
            <div class="bracket-config-empty">
                <p>No hay fases eliminatorias configuradas.</p>
                <p>Crea las fases en "Crear Reglas" primero.</p>
            </div>
        `
        return
    }

    currentPhaseId = phases[0].id

    container.innerHTML = `
        <div class="bracket-config-container">
            <div class="bracket-config-header">
                <h3>Configurar Bracket de Eliminatorias</h3>
                <p>Define el orden de los partidos en cada fase para establecer los cruces del bracket.</p>
            </div>

            <div class="bracket-phase-selector">
                <label>Selecciona una fase:</label>
                <select id="bracket-phase-select">
                    ${phases.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
                </select>
            </div>

            <div id="bracket-config-content">
                <div class="bracket-config-loading">Cargando partidos...</div>
            </div>
        </div>
    `

    const phaseSelect = document.getElementById("bracket-phase-select")
    phaseSelect.addEventListener("change", async (e) => {
        currentPhaseId = e.target.value
        await renderBracketConfig()
    })

    await renderBracketConfig()
}

async function renderBracketConfig() {
    const content = document.getElementById("bracket-config-content")
    if (!content || !currentPhaseId) return

    content.innerHTML = `<div class="bracket-config-loading">Cargando partidos...</div>`

    currentMatches = await getBracketMatchesForPhase(currentPhaseId)

    if (currentMatches.length === 0) {
        content.innerHTML = `
            <div class="bracket-config-empty">
                <p>No hay partidos para esta fase.</p>
                <p>Genera los partidos eliminatorios en "Crear Reglas" primero.</p>
            </div>
        `
        return
    }

    const currentPhase = phases.find(p => p.id === currentPhaseId)
    const currentPhaseIndex = phases.findIndex(p => p.id === currentPhaseId)
    const nextPhase = phases[currentPhaseIndex + 1]

    let previewHtml = ""
    if (nextPhase) {
        const previewData = await getPreviewConnections(currentPhaseId, nextPhase.id)
        previewHtml = renderConnectionPreview(previewData, currentPhase.name, nextPhase.name)
    }

    content.innerHTML = `
        <div class="bracket-config-layout">
            <div class="bracket-match-list-container">
                <div class="bracket-match-list-header">
                    <h4>${currentPhase.name}</h4>
                    <span class="bracket-match-count">${currentMatches.length} partidos</span>
                </div>
                <div class="bracket-match-list">
                    ${currentMatches.map((match, index) => renderBracketMatchRow(match, index)).join("")}
                </div>
            </div>

            ${previewHtml ? `
                <div class="bracket-preview-container">
                    <div class="bracket-preview-header">
                        <h4>Vista previa de conexiones</h4>
                        <span class="bracket-preview-hint">Los ganadores de posiciones 1-2 van a posición 1, 3-4 van a posición 2, etc.</span>
                    </div>
                    ${previewHtml}
                </div>
            ` : ""}
        </div>
    `

    initReorderHandlers()
}

function renderBracketMatchRow(match, index) {
    const homeTeam = match.home_team?.name || "TBD"
    const awayTeam = match.away_team?.name || "TBD"
    const homeFlag = resolveFlagUrl(match.home_team?.flag_url)
    const awayFlag = resolveFlagUrl(match.away_team?.flag_url)
    const position = match.bracket_position || index + 1
    const isFirst = index === 0
    const isLast = index === currentMatches.length - 1

    return `
        <div class="bracket-match-row" data-match-id="${match.id}" data-position="${position}">
            <div class="bracket-position-badge">${position}</div>

            <div class="bracket-match-info">
                <div class="bracket-match-teams-preview">
                    <div class="bracket-team-mini">
                        <img src="${homeFlag}" alt="${homeTeam}" class="bracket-flag-mini">
                        <span>${homeTeam}</span>
                    </div>
                    <span class="bracket-vs">vs</span>
                    <div class="bracket-team-mini">
                        <img src="${awayFlag}" alt="${awayTeam}" class="bracket-flag-mini">
                        <span>${awayTeam}</span>
                    </div>
                </div>
                ${match.home_slot ? `<span class="bracket-slot-info">${match.home_slot} vs ${match.away_slot}</span>` : ""}
            </div>

            <div class="bracket-reorder-controls">
                <button class="bracket-reorder-btn up" data-match-id="${match.id}" data-position="${position}" ${isFirst ? "disabled" : ""}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M12 4l-8 8h5v8h6v-8h5z" fill="currentColor"/>
                    </svg>
                </button>
                <button class="bracket-reorder-btn down" data-match-id="${match.id}" data-position="${position}" ${isLast ? "disabled" : ""}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M12 20l8-8h-5V4H9v8H4z" fill="currentColor"/>
                    </svg>
                </button>
            </div>

            <div class="bracket-position-input-wrapper">
                <input type="number" class="bracket-position-input" value="${position}" min="1" max="${currentMatches.length}" data-match-id="${match.id}">
            </div>
        </div>
    `
}

function renderConnectionPreview(previewData, currentPhaseName, nextPhaseName) {
    const { connections, currentPhaseMatches, nextPhaseMatches } = previewData

    if (connections.length === 0) {
        return `<div class="bracket-preview-empty">No hay conexiones para mostrar.</div>`
    }

    const rowHeight = 60
    const gap = 20
    const leftX = 40
    const rightX = 260
    const midX = 150

    const maxConnections = connections.length
    const svgHeight = maxConnections * (rowHeight + gap) + 40

    let paths = ""
    let leftLabels = ""
    let rightLabels = ""

    connections.forEach((conn, i) => {
        const y1 = 30 + i * (rowHeight + gap) + rowHeight / 2
        const y2 = 30 + i * (rowHeight + gap) + rowHeight / 2

        const child1Y = 30 + (i * 2) * (rowHeight / 2 + gap / 2) + rowHeight / 4
        const child2Y = 30 + (i * 2 + 1) * (rowHeight / 2 + gap / 2) + rowHeight / 4

        const child1 = conn.children[0]
        const child2 = conn.children[1]
        const parent = conn.parent

        if (child1) {
            paths += `<line x1="${leftX + 120}" y1="${child1Y}" x2="${midX}" y2="${y1}" stroke="var(--color-grey-200)" stroke-width="2"/>`
        }
        if (child2) {
            paths += `<line x1="${leftX + 120}" y1="${child2Y}" x2="${midX}" y2="${y2}" stroke="var(--color-grey-200)" stroke-width="2"/>`
        }
        if (parent) {
            paths += `<line x1="${midX}" y1="${y1}" x2="${rightX}" y2="${y1}" stroke="var(--color-accent)" stroke-width="2"/>`
        }

        if (child1) {
            leftLabels += `<text x="${leftX}" y="${child1Y + 4}" font-size="10" fill="var(--color-text)">#${child1.bracket_position || (i * 2 + 1)}</text>`
        }
        if (child2) {
            leftLabels += `<text x="${leftX}" y="${child2Y + 4}" font-size="10" fill="var(--color-text)">#${child2.bracket_position || (i * 2 + 2)}</text>`
        }
        if (parent) {
            rightLabels += `<text x="${rightX + 10}" y="${y1 + 4}" font-size="10" fill="var(--color-text)">#${parent.bracket_position || (i + 1)}</text>`
        }
    })

    return `
        <div class="bracket-preview-svg-container">
            <svg class="bracket-preview-svg" viewBox="0 0 320 ${svgHeight}" width="100%" height="${svgHeight}">
                <text x="${leftX}" y="15" font-size="11" font-weight="600" fill="var(--color-primary)">${currentPhaseName}</text>
                <text x="${rightX}" y="15" font-size="11" font-weight="600" fill="var(--color-primary)">${nextPhaseName}</text>

                ${paths}
                ${leftLabels}
                ${rightLabels}
            </svg>
        </div>
    `
}

function initReorderHandlers() {
    document.querySelectorAll(".bracket-reorder-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const adminUser = await checkAdmin()
            if (!adminUser) return

            const matchId = btn.dataset.matchId
            const currentPosition = parseInt(btn.dataset.position)
            const isUp = btn.classList.contains("up")
            const newPosition = isUp ? currentPosition - 1 : currentPosition + 1

            await performSwap(matchId, currentPosition, newPosition)
        })
    })

    document.querySelectorAll(".bracket-position-input").forEach(input => {
        input.addEventListener("change", async (e) => {
            const adminUser = await checkAdmin()
            if (!adminUser) return

            const matchId = input.dataset.matchId
            const newPosition = parseInt(input.value)
            const currentMatch = currentMatches.find(m => m.id === matchId)
            if (!currentMatch) return

            const currentPosition = currentMatch.bracket_position || currentMatches.indexOf(currentMatch) + 1

            if (newPosition === currentPosition) return
            if (newPosition < 1 || newPosition > currentMatches.length) {
                input.value = currentPosition
                return
            }

            await performSwap(matchId, currentPosition, newPosition)
        })

        input.addEventListener("focus", (e) => {
            e.target.select()
        })
    })
}

async function performSwap(matchId, currentPosition, newPosition) {
    if (newPosition < 1 || newPosition > currentMatches.length) return

    const currentMatch = currentMatches.find(m => m.id === matchId)
    if (!currentMatch) return

    const currentPos = currentMatch.bracket_position || currentMatches.indexOf(currentMatch) + 1
    const targetPos = newPosition

    if (currentPos === targetPos) return

    const matchesToMove = []

    if (currentPos < targetPos) {
        for (let pos = currentPos + 1; pos <= targetPos; pos++) {
            const match = currentMatches.find(m =>
                (m.bracket_position || currentMatches.indexOf(m) + 1) === pos
            )
            if (match) matchesToMove.push({ match, fromPos: pos, toPos: pos - 1 })
        }
        matchesToMove.push({ match: currentMatch, fromPos: currentPos, toPos: targetPos })
    } else {
        for (let pos = currentPos - 1; pos >= targetPos; pos--) {
            const match = currentMatches.find(m =>
                (m.bracket_position || currentMatches.indexOf(m) + 1) === pos
            )
            if (match) matchesToMove.push({ match, fromPos: pos, toPos: pos + 1 })
        }
        matchesToMove.push({ match: currentMatch, fromPos: currentPos, toPos: targetPos })
    }

    for (const { match, toPos } of matchesToMove) {
        const success = await updateBracketPosition(match.id, toPos)
        if (!success) {
            alert("Error al reordenar los partidos")
            await renderBracketConfig()
            return
        }
        match.bracket_position = toPos
    }

    currentMatches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))

    const matchList = document.querySelector(".bracket-match-list")
    if (matchList) {
        const scrollTop = matchList.scrollTop
        matchList.innerHTML = currentMatches.map((match, index) => renderBracketMatchRow(match, index)).join("")
        initReorderHandlers()
        matchList.scrollTop = scrollTop
    }

    await refreshPreview()
}

async function refreshPreview() {
    const currentPhaseIndex = phases.findIndex(p => p.id === currentPhaseId)
    const nextPhase = phases[currentPhaseIndex + 1]
    if (!nextPhase) return

    const previewContainer = document.querySelector(".bracket-preview-svg-container")
    if (!previewContainer) return

    const previewData = await getPreviewConnections(currentPhaseId, nextPhase.id)
    const currentPhase = phases.find(p => p.id === currentPhaseId)
    const newPreviewHtml = renderConnectionPreview(previewData, currentPhase.name, nextPhase.name)

    previewContainer.outerHTML = newPreviewHtml
}
