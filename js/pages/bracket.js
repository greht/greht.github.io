import { requireAuth } from "/js/services/auth.js"
import { getBracketPhases, getBracketMatches, getBracketPredictions, buildBracketStructure } from "/js/services/bracket.js"
import { renderBracketMatch } from "/js/components/bracket/BracketMatch.js"
import { renderBracketConnectors, clearConnectors } from "/js/components/bracket/BracketConnector.js"
import { supabase } from "/config/supabase.js"

let bracketData = null
let resizeTimeout = null

function renderSkeleton() {
    const container = document.getElementById("bracketContainer")
    if (!container) return

    const skeletonCol = (phaseName, matchCount) => `
        <div class="bracket-column skeleton-col">
            <div class="bracket-column-header">
                <span class="skeleton-text bracket-phase-name">${phaseName}</span>
            </div>
            <div class="bracket-column-matches">
                ${Array.from({ length: matchCount }).map(() => `
                    <div class="bracket-match skeleton-match">
                        <div class="bracket-match-top">
                            <span class="skeleton-bar skeleton-bar-short"></span>
                        </div>
                        <div class="bracket-match-teams">
                            <div class="bracket-team">
                                <div class="skeleton-flag"></div>
                                <span class="skeleton-bar"></span>
                            </div>
                            <div class="bracket-team">
                                <div class="skeleton-flag"></div>
                                <span class="skeleton-bar"></span>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `

    const skeletonCenterRow = (label) => `
        <div class="bracket-center-row">
            <div class="bracket-match skeleton-match skeleton-match-wide">
                <div class="bracket-match-top">
                    <span class="skeleton-bar skeleton-bar-short"></span>
                </div>
                <div class="bracket-match-teams">
                    <div class="bracket-team">
                        <div class="skeleton-flag"></div>
                        <span class="skeleton-bar"></span>
                    </div>
                    <div class="bracket-team">
                        <div class="skeleton-flag"></div>
                        <span class="skeleton-bar"></span>
                    </div>
                </div>
            </div>
        </div>
    `

    container.innerHTML = `
        <div class="bracket-wrapper bracket-symmetric bracket-skeleton-wrapper">
            <div class="bracket-skeleton-left">
                ${skeletonCol("Eliminatorias 32", 8)}
                ${skeletonCol("Octavos", 4)}
                ${skeletonCol("Cuartos", 2)}
            </div>
            <div class="bracket-center-column">
                ${skeletonCenterRow("Final")}
                ${skeletonCenterRow("Semifinal")}
                ${skeletonCenterRow("3.er Puesto")}
            </div>
            <div class="bracket-skeleton-right">
                ${skeletonCol("Cuartos", 2)}
                ${skeletonCol("Octavos", 4)}
                ${skeletonCol("Eliminatorias 32", 8)}
            </div>
        </div>
    `
}

async function renderSymmetricBracket(bracketStructure, leagueId) {
    const container = document.getElementById("bracketContainer")
    if (!container) return

    const phases = bracketStructure.phases

    const r32Phase = phases.find(p => p.name.includes("32"))
    const r16Phase = phases.find(p => p.name.includes("Octavos") || p.name.includes("ROUND_OF_16"))
    const qfPhase = phases.find(p => p.name.includes("Cuartos") || p.name.includes("QUARTER"))
    const sfPhase = phases.find(p => p.name.includes("Semifinal") && !p.name.includes("3er"))
    const finalPhase = phases.find(p => p.name.includes("Final") && !p.name.includes("3er") && !p.name.includes("Semifinal"))
    const thirdPlacePhase = phases.find(p => p.name.includes("3er") || p.name.includes("TERCER"))

    if (!r32Phase || !r16Phase || !qfPhase || !sfPhase || !finalPhase) {
        container.innerHTML = `
            <div class="bracket-empty">
                <p>No hay eliminatorias disponibles todavía.</p>
            </div>
        `
        return
    }

    const r32Matches = r32Phase.matches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
    const r16Matches = r16Phase.matches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
    const qfMatches = qfPhase.matches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
    const sfMatches = sfPhase.matches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
    const finalMatches = finalPhase.matches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
    const thirdPlaceMatches = thirdPlacePhase ? thirdPlacePhase.matches.sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0)) : []

    const halfR32 = Math.ceil(r32Matches.length / 2)
    const leftR32 = r32Matches.slice(0, halfR32)
    const rightR32 = r32Matches.slice(halfR32)

    const halfR16 = Math.ceil(r16Matches.length / 2)
    const leftR16 = r16Matches.slice(0, halfR16)
    const rightR16 = r16Matches.slice(halfR16)

    const halfQF = Math.ceil(qfMatches.length / 2)
    const leftQF = qfMatches.slice(0, halfQF)
    const rightQF = qfMatches.slice(halfQF)

    const r32Order = r32Phase.display_order
    const r16Order = r16Phase.display_order
    const qfOrder = qfPhase.display_order
    const sfOrder = sfPhase.display_order
    const finalOrder = finalPhase.display_order
    const thirdOrder = thirdPlacePhase ? thirdPlacePhase.display_order : finalOrder + 1

    const leftHtml = `
        <div class="bracket-column left" data-phase="R32" data-phase-order="${r32Order}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">Eliminatorias 32</span>
                <span class="bracket-phase-count">${leftR32.length} partidos</span>
            </div>
            <div class="bracket-column-matches">
                ${await renderMatches(leftR32, leagueId, r32Order)}
            </div>
        </div>
        <div class="bracket-column left" data-phase="R16" data-phase-order="${r16Order}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">Octavos</span>
                <span class="bracket-phase-count">${leftR16.length} partidos</span>
            </div>
            <div class="bracket-column-matches">
                ${await renderMatches(leftR16, leagueId, r16Order)}
            </div>
        </div>
        <div class="bracket-column left" data-phase="QF" data-phase-order="${qfOrder}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">Cuartos</span>
                <span class="bracket-phase-count">${leftQF.length} partidos</span>
            </div>
            <div class="bracket-column-matches">
                ${await renderMatches(leftQF, leagueId, qfOrder)}
            </div>
        </div>
    `

    const rightHtml = `
        <div class="bracket-column right" data-phase="QF" data-phase-order="${qfOrder}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">Cuartos</span>
                <span class="bracket-phase-count">${rightQF.length} partidos</span>
            </div>
            <div class="bracket-column-matches">
                ${await renderMatches(rightQF, leagueId, qfOrder)}
            </div>
        </div>
        <div class="bracket-column right" data-phase="R16" data-phase-order="${r16Order}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">Octavos</span>
                <span class="bracket-phase-count">${rightR16.length} partidos</span>
            </div>
            <div class="bracket-column-matches">
                ${await renderMatches(rightR16, leagueId, r16Order)}
            </div>
        </div>
        <div class="bracket-column right" data-phase="R32" data-phase-order="${r32Order}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">Eliminatorias 32</span>
                <span class="bracket-phase-count">${rightR32.length} partidos</span>
            </div>
            <div class="bracket-column-matches">
                ${await renderMatches(rightR32, leagueId, r32Order)}
            </div>
        </div>
    `

    const finalHtml = `
        <div class="bracket-center-column">
            <div class="bracket-center-row bracket-row-final">
                ${await renderMatchesWithType(finalMatches, leagueId, finalOrder, "Final", "final")}
            </div>
            <div class="bracket-center-row bracket-row-sf">
                ${await renderMatchesWithLabel(sfMatches, leagueId, sfOrder, "Semifinal")}
            </div>
            <div class="bracket-center-row bracket-row-third">
                ${thirdPlaceMatches.length > 0 ? await renderMatchesWithType(thirdPlaceMatches, leagueId, thirdOrder, "3.er Puesto", "third") : ''}
            </div>
        </div>
    `

    container.innerHTML = `
        <div class="bracket-wrapper bracket-symmetric" id="bracketSymmetric">
            ${leftHtml}
            ${finalHtml}
            ${rightHtml}
        </div>
    `

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const wrapper = container.querySelector(".bracket-wrapper")
            if (wrapper) {
                renderBracketConnectors(wrapper)
            }
        })
    })
}

async function renderMatches(matches, leagueId, phaseOrder) {
    const results = await Promise.all(
        matches.map(match => renderBracketMatch(match, leagueId, phaseOrder))
    )
    return results.join("")
}

async function renderMatchesWithLabel(matches, leagueId, phaseOrder, phaseLabel) {
    const results = await Promise.all(
        matches.map(match => renderBracketMatch(match, leagueId, phaseOrder, phaseLabel))
    )
    return results.join("")
}

async function renderMatchesWithType(matches, leagueId, phaseOrder, phaseLabel, matchType) {
    const results = await Promise.all(
        matches.map(match => renderBracketMatch(match, leagueId, phaseOrder, phaseLabel, matchType))
    )
    return results.join("")
}

function updateConnectors() {
    const container = document.getElementById("bracketContainer")
    if (!container) return
    const wrapper = container.querySelector(".bracket-wrapper")
    if (!wrapper) return

    clearConnectors(wrapper)
    renderBracketConnectors(wrapper)
}

async function refreshData(userId, showSkeleton = true) {
    if (showSkeleton) {
        renderSkeleton()
    }

    const startTime = Date.now()

    const [phases, matches, predictions] = await Promise.all([
        getBracketPhases(),
        getBracketMatches(),
        getBracketPredictions(userId)
    ])

    bracketData = buildBracketStructure(phases, matches, predictions)

    const leagueId = matches.find(m => m.league_id)?.league_id || '1ebd76d7-5839-4c80-a41a-554de1bb22f5'

    // Garantizar mínimo de 400ms de skeleton para evitar parpadeo
    const elapsed = Date.now() - startTime
    if (elapsed < 400) {
        await new Promise(resolve => setTimeout(resolve, 400 - elapsed))
    }

    await renderSymmetricBracket(bracketData, leagueId)
}

document.addEventListener("DOMContentLoaded", async () => {
    const authResult = await requireAuth("/login.html")

    let userId = null
    if (authResult) {
        userId = authResult.user.id
    }

    await refreshData(userId, true)

    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(updateConnectors, 200)
    })

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
                await refreshData(userId, true)
            }
        )
        .subscribe()
})
