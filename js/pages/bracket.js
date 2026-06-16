import { requireAuth } from "/js/services/auth.js"
import { getBracketPhases, getBracketMatches, getBracketPredictions, buildBracketStructure } from "/js/services/bracket.js"
import { renderBracketColumn } from "/js/components/bracket/BracketColumn.js"
import { renderBracketConnectors, clearConnectors } from "/js/components/bracket/BracketConnector.js"
import { supabase } from "/config/supabase.js"

let bracketData = null
let resizeTimeout = null

function renderSkeleton() {
    const container = document.getElementById("bracketContainer")
    if (!container) return

    container.innerHTML = `
        <div class="bracket-skeleton">
            ${Array.from({ length: 4 }).map(() => `
                <div class="bracket-column skeleton-col">
                    <div class="bracket-column-header">
                        <span class="skeleton-text bracket-phase-name">Cargando...</span>
                    </div>
                    <div class="bracket-column-matches">
                        ${Array.from({ length: 4 }).map(() => `
                            <div class="bracket-match skeleton-match">
                                <div class="bracket-match-teams">
                                    <div class="bracket-team">
                                        <div class="skeleton-flag"></div>
                                        <span class="skeleton-text">---</span>
                                    </div>
                                    <div class="bracket-team">
                                        <div class="skeleton-flag"></div>
                                        <span class="skeleton-text">---</span>
                                    </div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).join("")}
        </div>
    `
}

function renderBracket(bracketStructure) {
    const container = document.getElementById("bracketContainer")
    if (!container) return

    if (!bracketStructure.phases || bracketStructure.phases.length === 0) {
        container.innerHTML = `
            <div class="bracket-empty">
                <p>No hay eliminatorias disponibles todavía.</p>
                <p>Las llaves se habilitarán cuando se generen los partidos eliminatorios.</p>
            </div>
        `
        return
    }

    const columnsHtml = bracketStructure.phases.map(phase => renderBracketColumn(phase)).join("")

    container.innerHTML = `
        <div class="bracket-wrapper">
            ${columnsHtml}
        </div>
    `

    requestAnimationFrame(() => {
        const wrapper = container.querySelector(".bracket-wrapper")
        if (wrapper) {
            renderBracketConnectors(wrapper)
        }
    })
}

function updateConnectors() {
    const container = document.getElementById("bracketContainer")
    if (!container) return
    const wrapper = container.querySelector(".bracket-wrapper")
    if (!wrapper) return

    clearConnectors(wrapper)
    renderBracketConnectors(wrapper)
}

async function refreshData(userId) {
    const [phases, matches, predictions] = await Promise.all([
        getBracketPhases(),
        getBracketMatches(),
        getBracketPredictions(userId)
    ])

    bracketData = buildBracketStructure(phases, matches, predictions)
    renderBracket(bracketData)
}

document.addEventListener("DOMContentLoaded", async () => {
    const authResult = await requireAuth("/login.html")
    renderSkeleton()

    let userId = null
    if (authResult) {
        userId = authResult.user.id
    }

    await refreshData(userId)

    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(updateConnectors, 200)
    })

    if (bracketData && bracketData.phases.length > 0) {
        const scrollContainer = document.querySelector(".bracket-scroll")
        if (scrollContainer) {
            const lastCol = scrollContainer.querySelector(".bracket-column:last-child")
            if (lastCol) {
                setTimeout(() => {
                    scrollContainer.scrollLeft = scrollContainer.scrollWidth
                }, 300)
            }
        }
    }

    const channel = supabase
        .channel("bracket-matches-changes")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "matches"
            },
            async (payload) => {
                await refreshData(userId)
            }
        )
        .subscribe()
})
