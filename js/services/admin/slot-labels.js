import { supabase } from "/config/supabase.js"

const DEFAULT_LEAGUE_ID = "1ebd76d7-5839-4c80-a41a-554de1bb22f5"

export const SLOT_PREFIX_TO_PHASE = {
    R32_: "Eliminatoria de 32",
    R16_: "Octavos de final",
    QF_: "Cuartos de final",
    SF_: "Semifinal",
    L_SF_: "Semifinal",
}

export const PHASE_TO_MATCH_NUMBER_RANGE = {
    "Eliminatoria de 32": { start: 73, count: 16 },
    "Octavos de final": { start: 89, count: 8 },
    "Cuartos de final": { start: 97, count: 4 },
    Semifinal: { start: 101, count: 2 },
    "Eliminatoria por el 3er lugar": { start: 103, count: 1 },
    Final: { start: 104, count: 1 },
}

const slotLabelCache = new Map()

export function getPhaseNameForSlot(slotCode) {
    if (!slotCode) return null
    for (const [prefix, phaseName] of Object.entries(SLOT_PREFIX_TO_PHASE)) {
        if (slotCode.startsWith(prefix)) return phaseName
    }
    return null
}

export function computeFallbackLabel(slotCode, phaseName) {
    const range = PHASE_TO_MATCH_NUMBER_RANGE[phaseName]
    if (!range) return slotCode
    const position = parseInt(slotCode.split("_").pop())
    if (!position || position < 1 || position > range.count) return slotCode
    const expectedMatchNumber = range.start + position - 1
    const isLoser = slotCode.startsWith("L_SF_")
    return isLoser
        ? `Perdedor P${expectedMatchNumber}`
        : `Ganador P${expectedMatchNumber}`
}

export function resolveSlotLabel(slotCode, slotLabelMap) {
    if (!slotCode) return null
    if (slotLabelMap && slotLabelMap.has(slotCode)) {
        const entry = slotLabelMap.get(slotCode)
        return entry?.label || slotCode
    }
    if (slotLabelCache.has(slotCode)) {
        return slotLabelCache.get(slotCode).label
    }
    return slotCode
}

export function applySlotLabels(container) {
    const slotElements = container.querySelectorAll("[data-slot-code]")
    if (slotElements.length === 0) return
    for (const el of slotElements) {
        const code = el.dataset.slotCode
        const entry = slotLabelCache.get(code)
        if (entry && entry.label) {
            const teamName = el.dataset.teamName
            el.textContent = teamName
                ? `${entry.label} - ${teamName}`
                : entry.label
        }
    }
}

async function resolveOne(slotCode, leagueId) {
    if (slotLabelCache.has(slotCode)) return slotLabelCache.get(slotCode)

    const phaseName = getPhaseNameForSlot(slotCode)
    if (!phaseName) {
        const entry = { label: slotCode, status: "fallback" }
        slotLabelCache.set(slotCode, entry)
        return entry
    }

    const { data: phase } = await supabase
        .from("phases")
        .select("id, name")
        .eq("name", phaseName)
        .limit(1)

    const phaseRecord = phase && phase.length > 0 ? phase[0] : null
    if (!phaseRecord) {
        const entry = {
            label: computeFallbackLabel(slotCode, phaseName),
            status: "fallback",
        }
        slotLabelCache.set(slotCode, entry)
        return entry
    }

    const position = parseInt(slotCode.split("_").pop())
    if (!position) {
        const entry = { label: slotCode, status: "fallback" }
        slotLabelCache.set(slotCode, entry)
        return entry
    }

    const { data: matchData } = await supabase
        .from("matches")
        .select("match_number")
        .eq("phase_id", phaseRecord.id)
        .eq("bracket_position", position)
        .eq("league_id", leagueId)
        .limit(1)

    const matchRecord = matchData && matchData.length > 0 ? matchData[0] : null
    if (matchRecord && matchRecord.match_number) {
        const isLoser = slotCode.startsWith("L_SF_")
        const label = isLoser
            ? `Perdedor P${matchRecord.match_number}`
            : `Ganador P${matchRecord.match_number}`
        const entry = { label, status: "resolved" }
        slotLabelCache.set(slotCode, entry)
        return entry
    }

    const entry = {
        label: computeFallbackLabel(slotCode, phaseName),
        status: "fallback",
    }
    slotLabelCache.set(slotCode, entry)
    return entry
}

export async function preloadSlotLabels(slotCodes, leagueId = DEFAULT_LEAGUE_ID) {
    const uniqueCodes = [...new Set((slotCodes || []).filter(Boolean))]
    if (uniqueCodes.length === 0) return new Map()

    const result = new Map()
    const uncached = []

    for (const code of uniqueCodes) {
        if (slotLabelCache.has(code)) {
            result.set(code, slotLabelCache.get(code))
        } else {
            uncached.push(code)
        }
    }

    if (uncached.length > 0) {
        const resolvedEntries = await Promise.all(
            uncached.map((code) => resolveOne(code, leagueId)),
        )
        uncached.forEach((code, idx) => {
            const entry = resolvedEntries[idx]
            result.set(code, entry)
        })
    }

    return result
}

export function formatSlotLabel(slotCode, leagueId = DEFAULT_LEAGUE_ID) {
    if (slotLabelCache.has(slotCode)) {
        return slotLabelCache.get(slotCode).label
    }
    const phaseName = getPhaseNameForSlot(slotCode)
    if (!phaseName) return slotCode
    return computeFallbackLabel(slotCode, phaseName)
}
