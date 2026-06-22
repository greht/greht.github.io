const SVG_NS = "http://www.w3.org/2000/svg"

export function renderBracketConnectors(bracketContainer) {
    const matches = bracketContainer.querySelectorAll(".bracket-match")
    if (matches.length === 0) return

    let svgOverlay = bracketContainer.querySelector(".bracket-connectors-svg")
    if (!svgOverlay) {
        svgOverlay = document.createElementNS(SVG_NS, "svg")
        svgOverlay.classList.add("bracket-connectors-svg")
        svgOverlay.setAttribute("xmlns", SVG_NS)
        bracketContainer.style.position = "relative"
        bracketContainer.appendChild(svgOverlay)

        const defs = document.createElementNS(SVG_NS, "defs")
        const gradient = document.createElementNS(SVG_NS, "linearGradient")
        gradient.setAttribute("id", "bracketConnectorGradient")
        gradient.setAttribute("x1", "0%")
        gradient.setAttribute("y1", "0%")
        gradient.setAttribute("x2", "100%")
        gradient.setAttribute("y2", "0%")
        const stop1 = document.createElementNS(SVG_NS, "stop")
        stop1.setAttribute("offset", "0%")
        stop1.setAttribute("stop-color", "#5d1b6b")
        stop1.setAttribute("stop-opacity", "0.35")
        const stop2 = document.createElementNS(SVG_NS, "stop")
        stop2.setAttribute("offset", "100%")
        stop2.setAttribute("stop-color", "#5d1b6b")
        stop2.setAttribute("stop-opacity", "0.9")
        gradient.appendChild(stop1)
        gradient.appendChild(stop2)
        defs.appendChild(gradient)

        const gradientR = document.createElementNS(SVG_NS, "linearGradient")
        gradientR.setAttribute("id", "bracketConnectorGradientR")
        gradientR.setAttribute("x1", "0%")
        gradientR.setAttribute("y1", "0%")
        gradientR.setAttribute("x2", "100%")
        gradientR.setAttribute("y2", "0%")
        const stopR1 = document.createElementNS(SVG_NS, "stop")
        stopR1.setAttribute("offset", "0%")
        stopR1.setAttribute("stop-color", "#5d1b6b")
        stopR1.setAttribute("stop-opacity", "0.9")
        const stopR2 = document.createElementNS(SVG_NS, "stop")
        stopR2.setAttribute("offset", "100%")
        stopR2.setAttribute("stop-color", "#5d1b6b")
        stopR2.setAttribute("stop-opacity", "0.35")
        gradientR.appendChild(stopR1)
        gradientR.appendChild(stopR2)
        defs.appendChild(gradientR)

        svgOverlay.appendChild(defs)
    }

    while (svgOverlay.lastChild && svgOverlay.lastChild.tagName !== "defs") {
        svgOverlay.removeChild(svgOverlay.lastChild)
    }

    const containerRect = bracketContainer.getBoundingClientRect()
    svgOverlay.setAttribute("viewBox", `0 0 ${containerRect.width} ${containerRect.height}`)
    svgOverlay.setAttribute("width", containerRect.width)
    svgOverlay.setAttribute("height", containerRect.height)
    svgOverlay.style.position = "absolute"
    svgOverlay.style.top = "0"
    svgOverlay.style.left = "0"
    svgOverlay.style.width = containerRect.width + "px"
    svgOverlay.style.height = containerRect.height + "px"
    svgOverlay.style.pointerEvents = "none"
    svgOverlay.style.zIndex = "1"
    svgOverlay.style.overflow = "visible"

    const matchMap = new Map()
    matches.forEach(matchEl => {
        const phaseOrder = parseInt(matchEl.dataset.phaseOrder)
        const position = parseInt(matchEl.dataset.position)
        if (!isNaN(phaseOrder) && !isNaN(position)) {
            if (!matchMap.has(phaseOrder)) matchMap.set(phaseOrder, new Map())
            matchMap.get(phaseOrder).set(position, matchEl)
        }
    })

    const phaseOrders = Array.from(matchMap.keys()).sort((a, b) => a - b)
    if (phaseOrders.length < 2) return

    const maxPhaseOrder = phaseOrders[phaseOrders.length - 1]
    const minPhaseOrder = phaseOrders[0]

    for (let i = 0; i < phaseOrders.length; i++) {
        const currentOrder = phaseOrders[i]
        const positions = Array.from(matchMap.get(currentOrder).keys()).sort((a, b) => a - b)

        for (const pos of positions) {
            const matchEl = matchMap.get(currentOrder).get(pos)
            if (!matchEl) continue

            if (currentOrder === maxPhaseOrder) continue

            const parentPosition = Math.ceil(pos / 2)

            let nextPhaseOrder = currentOrder + 1
            while (nextPhaseOrder <= maxPhaseOrder && !matchMap.has(nextPhaseOrder)) {
                nextPhaseOrder++
            }
            if (nextPhaseOrder > maxPhaseOrder) continue

            const parentMatch = matchMap.get(nextPhaseOrder)?.get(parentPosition)
            if (!parentMatch) continue

            drawBezierConnector(svgOverlay, matchEl, parentMatch, containerRect, parentPosition)
        }
    }
}

function drawBezierConnector(svg, sourceEl, targetEl, containerRect, parentPosition) {
    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()

    const sourceCenterX = sourceRect.left + sourceRect.width / 2 - containerRect.left
    const sourceCenterY = sourceRect.top + sourceRect.height / 2 - containerRect.top
    const targetCenterX = targetRect.left + targetRect.width / 2 - containerRect.left
    const targetCenterY = targetRect.top + targetRect.height / 2 - containerRect.top

    const isSourceLeft = sourceCenterX < targetCenterX
    const isTargetAbove = targetCenterY < sourceCenterY
    const isTargetBelow = targetCenterY > sourceCenterY

    let startX, startY, endX, endY
    let c1x, c1y, c2x, c2y

    if (isSourceLeft && !isTargetAbove && !isTargetBelow) {
        startX = sourceRect.right - containerRect.left
        startY = sourceCenterY
        endX = targetRect.left - containerRect.left
        endY = targetCenterY
        const midX = (startX + endX) / 2
        c1x = midX
        c1y = startY
        c2x = midX
        c2y = endY
    } else if (!isSourceLeft && !isTargetAbove && !isTargetBelow) {
        startX = sourceRect.left - containerRect.left
        startY = sourceCenterY
        endX = targetRect.right - containerRect.left
        endY = targetCenterY
        const midX = (startX + endX) / 2
        c1x = midX
        c1y = startY
        c2x = midX
        c2y = endY
    } else if (isSourceLeft && isTargetAbove) {
        startX = sourceRect.right - containerRect.left
        startY = sourceCenterY
        endX = targetCenterX
        endY = targetRect.bottom - containerRect.top
        const midX = (startX + endX) / 2
        c1x = midX
        c1y = startY
        c2x = endX
        c2y = endY
    } else if (isSourceLeft && isTargetBelow) {
        startX = sourceRect.right - containerRect.left
        startY = sourceCenterY
        endX = targetCenterX
        endY = targetRect.top - containerRect.top
        const midX = (startX + endX) / 2
        c1x = midX
        c1y = startY
        c2x = endX
        c2y = endY
    } else if (!isSourceLeft && isTargetAbove) {
        startX = sourceRect.left - containerRect.left
        startY = sourceCenterY
        endX = targetCenterX
        endY = targetRect.bottom - containerRect.top
        const midX = (startX + endX) / 2
        c1x = midX
        c1y = startY
        c2x = endX
        c2y = endY
    } else {
        startX = sourceRect.left - containerRect.left
        startY = sourceCenterY
        endX = targetCenterX
        endY = targetRect.top - containerRect.top
        const midX = (startX + endX) / 2
        c1x = midX
        c1y = startY
        c2x = endX
        c2y = endY
    }

    const gradientId = isSourceLeft ? "bracketConnectorGradient" : "bracketConnectorGradientR"
    const path = document.createElementNS(SVG_NS, "path")
    const d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`
    path.setAttribute("d", d)
    path.setAttribute("fill", "none")
    path.setAttribute("stroke", `url(#${gradientId})`)
    path.setAttribute("stroke-width", "2.5")
    path.setAttribute("stroke-linecap", "round")
    path.setAttribute("opacity", "0.7")
    svg.appendChild(path)

    const dot = document.createElementNS(SVG_NS, "circle")
    dot.setAttribute("cx", endX)
    dot.setAttribute("cy", endY)
    dot.setAttribute("r", "3")
    dot.setAttribute("fill", "#5d1b6b")
    dot.setAttribute("opacity", "0.9")
    svg.appendChild(dot)
}

export function clearConnectors(bracketContainer) {
    const svgOverlay = bracketContainer.querySelector(".bracket-connectors-svg")
    if (!svgOverlay) return
    Array.from(svgOverlay.children).forEach(child => {
        if (child.tagName !== "defs") svgOverlay.removeChild(child)
    })
}
