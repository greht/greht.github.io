export function renderBracketConnectors(bracketContainer) {
    const columns = bracketContainer.querySelectorAll(".bracket-column")
    if (columns.length < 2) return

    let svgOverlay = bracketContainer.querySelector(".bracket-connectors-svg")
    if (!svgOverlay) {
        svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgOverlay.classList.add("bracket-connectors-svg")
        svgOverlay.style.position = "absolute"
        svgOverlay.style.top = "0"
        svgOverlay.style.left = "0"
        svgOverlay.style.width = "100%"
        svgOverlay.style.height = "100%"
        svgOverlay.style.pointerEvents = "none"
        svgOverlay.style.zIndex = "1"
        bracketContainer.style.position = "relative"
        bracketContainer.appendChild(svgOverlay)
    }

    svgOverlay.innerHTML = ""

    const containerRect = bracketContainer.getBoundingClientRect()
    svgOverlay.setAttribute("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
    svgOverlay.setAttribute("width", containerRect.width)
    svgOverlay.setAttribute("height", containerRect.height)

    for (let i = 0; i < columns.length - 1; i++) {
        const currentCol = columns[i]
        const nextCol = columns[i + 1]
        const currentMatches = currentCol.querySelectorAll(".bracket-match")
        const nextMatches = nextCol.querySelectorAll(".bracket-match")

        if (currentMatches.length === 0 || nextMatches.length === 0) continue

        for (let j = 0; j < currentMatches.length; j += 2) {
            const match1 = currentMatches[j]
            const match2 = currentMatches[j + 1]
            const parentIndex = Math.floor(j / 2)
            const parentMatch = nextMatches[parentIndex]

            if (!parentMatch) continue

            const rect1 = match1.getBoundingClientRect()
            const rect2 = match2 ? match2.getBoundingClientRect() : rect1
            const rectParent = parentMatch.getBoundingClientRect()

            const x1 = rect1.right - containerRect.left
            const y1 = rect1.top + rect1.height / 2 - containerRect.top

            const x2 = rect2 ? rect2.right - containerRect.left : x1
            const y2 = rect2 ? rect2.top + rect2.height / 2 - containerRect.top : y1

            const xParent = rectParent.left - containerRect.left
            const yParent = rectParent.top + rectParent.height / 2 - containerRect.top

            const midX = (x1 + xParent) / 2

            drawConnector(svgOverlay, x1, y1, midX, y1, midX, yParent, xParent, yParent)

            if (match2) {
                drawConnector(svgOverlay, x2, y2, midX, y2, midX, yParent, xParent, yParent)
            }
        }
    }
}

function drawConnector(svg, x1, y1, midX, y1b, midX2, y2, x2, y2b) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    const d = `M ${x1} ${y1} L ${midX} ${y1b} L ${midX2} ${y2} L ${x2} ${y2b}`
    path.setAttribute("d", d)
    path.setAttribute("fill", "none")
    path.setAttribute("stroke", "var(--color-grey-200)")
    path.setAttribute("stroke-width", "2")
    path.setAttribute("stroke-linecap", "round")
    path.setAttribute("stroke-linejoin", "round")
    svg.appendChild(path)
}

export function clearConnectors(bracketContainer) {
    const svgOverlay = bracketContainer.querySelector(".bracket-connectors-svg")
    if (svgOverlay) {
        svgOverlay.innerHTML = ""
    }
}
