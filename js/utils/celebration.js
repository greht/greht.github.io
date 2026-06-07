import confetti from "https://esm.sh/canvas-confetti@1.9.3"

export function celebrateCompletion(phaseName, phaseId) {
    const flagKey = `celebrated-${phaseId}`
    if (localStorage.getItem(flagKey)) {
        return false
    }

    localStorage.setItem(flagKey, "true")

    const duration = 3000
    const end = Date.now() + duration

    const colors = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"]

    ;(function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        })
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        })

        if (Date.now() < end) {
            requestAnimationFrame(frame)
        }
    }())

    showCelebrationToast(phaseName)
    return true
}

function showCelebrationToast(phaseName) {
    const existing = document.getElementById("celebration-toast")
    if (existing) existing.remove()

    const toast = document.createElement("div")
    toast.id = "celebration-toast"
    toast.innerHTML = `
        <div class="celebration-content">
            <span class="celebration-icon">🎉</span>
            <div class="celebration-text">
                <strong>¡Etapa completada!</strong>
                <span>Has registrado todos tus pronosticos${phaseName ? ` de ${phaseName}` : ""}.</span>
            </div>
            <button class="celebration-close">×</button>
        </div>
    `

    document.body.appendChild(toast)

    toast.querySelector(".celebration-close").addEventListener("click", () => {
        toast.remove()
    })

    setTimeout(() => {
        if (document.getElementById("celebration-toast")) {
            toast.remove()
        }
    }, 5000)
}

export function isPhaseCelebrated(phaseId) {
    if (!phaseId) return false
    return localStorage.getItem(`celebrated-${phaseId}`) === "true"
}

export function resetCelebration(phaseId) {
    if (!phaseId) return
    localStorage.removeItem(`celebrated-${phaseId}`)
}

export function checkAndCelebrateCompletion(matches, predictions, currentPhaseName, currentPhaseId) {
    if (!matches || matches.length === 0) {
        return
    }

    if (!currentPhaseId) {
        return
    }

    if (isPhaseCelebrated(currentPhaseId)) {
        return
    }

    const phaseMatches = matches.filter(m => m.phase_id === currentPhaseId || m.phase?.id === currentPhaseId)

    if (phaseMatches.length === 0) {
        return
    }

    const completedCount = phaseMatches.filter(m => {
        const pred = predictions.find(p => p.match_id === m.id)
        return pred && pred.home_predictions !== null && pred.away_predictions !== null
    }).length

    const totalPhaseMatches = phaseMatches.length

    if (completedCount >= totalPhaseMatches) {
        celebrateCompletion(currentPhaseName, currentPhaseId)
    }
}