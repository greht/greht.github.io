import {
    getBracketPhases,
    getBracketMatchesForPhase,
    swapBracketPositions,
    updateBracketPosition,
    getPreviewConnections
} from "/js/services/admin/bracket-admin.js"
import { checkAdmin } from "/config/admin.js"
import { renderFlag } from "/js/utils/flagUrl.js"
import { preloadSlotLabels, resolveSlotLabel } from "/js/services/admin/slot-labels.js"

const DEFAULT_LEAGUE_ID = "1ebd76d7-5839-4c80-a41a-554de1bb22f5"

let currentPhaseId = null
let phases = []
let currentMatches = []
let currentSlotLabelMap = new Map()

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

    const currentPhase = phases.find(p => String(p.id) === String(currentPhaseId))
    const currentPhaseIndex = phases.findIndex(p => String(p.id) === String(currentPhaseId))
    const nextPhase = phases[currentPhaseIndex + 1]

    if (!currentPhase) return

    const slotCodes = [
        ...new Set(
            currentMatches
                .flatMap(m => [m.home_slot, m.away_slot])
                .filter(Boolean)
        )
    ]
    currentSlotLabelMap = await preloadSlotLabels(slotCodes, DEFAULT_LEAGUE_ID)

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
                    ${currentMatches.map((match, index) => renderBracketMatchRow(match, index, currentMatches.length, currentSlotLabelMap)).join("")}
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

function getTeamDisplay(match, slotKey, slotLabelMap) {
    const team = slotKey === "home" ? match.home_team : match.away_team
    const slotCode = slotKey === "home" ? match.home_slot : match.away_slot
    if (team?.name) return team.name
    const label = resolveSlotLabel(slotCode, slotLabelMap)
    if (label) return `TBD (${label})`
    return "TBD"
}

function getSlotInfoText(match, slotLabelMap) {
    const homeLabel = resolveSlotLabel(match.home_slot, slotLabelMap) || match.home_slot
    const awayLabel = resolveSlotLabel(match.away_slot, slotLabelMap) || match.away_slot
    return `${homeLabel} vs ${awayLabel}`
}

function renderBracketMatchRow(match, index, totalMatches, slotLabelMap) {
    const homeTeamName = getTeamDisplay(match, "home", slotLabelMap)
    const awayTeamName = getTeamDisplay(match, "away", slotLabelMap)
    const homeFlag = renderFlag(match.home_team, "bracket-flag-mini", homeTeamName)
    const awayFlag = renderFlag(match.away_team, "bracket-flag-mini", awayTeamName)
    const localPosition = index + 1
    const isFirst = index === 0
    const isLast = index === currentMatches.length - 1

    const halfMark = totalMatches / 2
    const isLeftSide = localPosition <= halfMark
    const sideLabel = isLeftSide ? "IZQ" : "DER"
    const sideClass = isLeftSide ? "left" : "right"

    return `
        <div class="bracket-match-row" data-match-id="${match.id}" data-position="${localPosition}" data-side="${isLeftSide ? 'left' : 'right'}">
            <div class="bracket-position-badge">${localPosition}</div>
            <div class="bracket-side-badge ${sideClass}">${sideLabel}</div>

            <div class="bracket-match-info">
                <div class="bracket-match-teams-preview">
                    <div class="bracket-team-mini">
                        ${homeFlag}
                        <span>${homeTeamName}</span>
                    </div>
                    <span class="bracket-vs">vs</span>
                    <div class="bracket-team-mini">
                        ${awayFlag}
                        <span>${awayTeamName}</span>
                    </div>
                </div>
                ${match.home_slot ? `<span class="bracket-slot-info">${getSlotInfoText(match, slotLabelMap)}</span>` : ""}
            </div>

            <div class="bracket-reorder-controls">
                <button class="bracket-reorder-btn up" data-match-id="${match.id}" data-position="${localPosition}" ${isFirst ? "disabled" : ""}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M12 4l-8 8h5v8h6v-8h5z" fill="currentColor"/>
                    </svg>
                </button>
                <button class="bracket-reorder-btn down" data-match-id="${match.id}" data-position="${localPosition}" ${isLast ? "disabled" : ""}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M12 20l8-8h-5V4H9v8H4z" fill="currentColor"/>
                    </svg>
                </button>
            </div>

            <div class="bracket-position-input-wrapper">
                <input type="number" class="bracket-position-input" value="${localPosition}" min="1" max="${currentMatches.length}" data-match-id="${match.id}">
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
            if (!adminUser) {
                alert("No tienes permisos para reordenar")
                return
            }

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
            if (!adminUser) {
                alert("No tienes permisos para reordenar")
                return
            }

            const matchId = input.dataset.matchId
            const newPosition = parseInt(input.value)
            const currentIdx = currentMatches.findIndex(m => m.id === matchId)
            if (currentIdx === -1) return

            const currentPosition = currentIdx + 1

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

async function performSwap(matchId, currentLocalPos, newLocalPos) {
    if (newLocalPos < 1 || newLocalPos > currentMatches.length) return
    if (currentLocalPos === newLocalPos) return

    const currentIdx = currentLocalPos - 1
    const targetIdx = newLocalPos - 1

    const originalBracketPositions = currentMatches.map(m => m.bracket_position)
    const reorderedLocalOrder = currentMatches.map((_, i) => i + 1)
    const [movedLocalPos] = reorderedLocalOrder.splice(currentIdx, 1)
    reorderedLocalOrder.splice(targetIdx, 0, movedLocalPos)

    for (let newLocalPos = 1; newLocalPos <= currentMatches.length; newLocalPos++) {
        const originalLocalPos = reorderedLocalOrder[newLocalPos - 1]
        const match = currentMatches[originalLocalPos - 1]
        const newBracketPos = originalBracketPositions[newLocalPos - 1]

        if (!match || newBracketPos == null) continue
        if (match.bracket_position === newBracketPos) continue

        const success = await updateBracketPosition(match.id, newBracketPos)
        if (!success) {
            alert("Error al reordenar los partidos")
            await renderBracketConfig()
            return
        }
        match.bracket_position = newBracketPos
    }

    currentMatches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))

    const slotCodes = [
        ...new Set(
            currentMatches
                .flatMap(m => [m.home_slot, m.away_slot])
                .filter(Boolean)
        )
    ]
    currentSlotLabelMap = await preloadSlotLabels(slotCodes, DEFAULT_LEAGUE_ID)

    const matchList = document.querySelector(".bracket-match-list")
    if (matchList) {
        const scrollTop = matchList.scrollTop
        matchList.innerHTML = currentMatches.map((match, index) => renderBracketMatchRow(match, index, currentMatches.length, currentSlotLabelMap)).join("")
        initReorderHandlers()
        matchList.scrollTop = scrollTop
    }

    await refreshPreview()
}

async function refreshPreview() {
    const currentPhaseIndex = phases.findIndex(p => String(p.id) === String(currentPhaseId))
    const nextPhase = phases[currentPhaseIndex + 1]
    if (!nextPhase) return

    const previewContainer = document.querySelector(".bracket-preview-svg-container")
    if (!previewContainer) return

    const previewData = await getPreviewConnections(currentPhaseId, nextPhase.id)
    const currentPhase = phases.find(p => String(p.id) === String(currentPhaseId))
    if (!currentPhase) return
    const newPreviewHtml = renderConnectionPreview(previewData, currentPhase.name, nextPhase.name)

    previewContainer.outerHTML = newPreviewHtml
}
