import { renderBracketMatch } from "/js/components/bracket/BracketMatch.js"

export function renderBracketColumn(phase) {
    const matchesHtml = phase.matches.map(match => renderBracketMatch(match)).join("")

    return `
        <div class="bracket-column" data-phase-id="${phase.id}" data-phase-index="${phase.display_order}">
            <div class="bracket-column-header">
                <span class="bracket-phase-name">${phase.name}</span>
                <span class="bracket-phase-count">${phase.matches.length} partido${phase.matches.length !== 1 ? "s" : ""}</span>
            </div>
            <div class="bracket-column-matches">
                ${matchesHtml}
            </div>
        </div>
    `
}
