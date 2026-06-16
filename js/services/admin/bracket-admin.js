import { supabase } from "/config/supabase.js"

export async function getBracketPhases() {
    const { data, error } = await supabase
        .from("phases")
        .select("id, name, display_order")
        .gte("display_order", 2)
        .order("display_order", { ascending: true })

    if (error) {
        console.error("Error fetching bracket phases:", error)
        return []
    }

    return data || []
}

export async function getBracketMatchesForPhase(phaseId) {
    const { data: matches, error } = await supabase
        .from("matches")
        .select("*")
        .eq("phase_id", phaseId)
        .order("bracket_position", { ascending: true })

    if (error) {
        console.error("Error fetching bracket matches:", error)
        return []
    }

    if (!matches || matches.length === 0) return []

    const teamIds = [
        ...new Set(matches.flatMap(m => [m.home_team_id, m.away_team_id]).filter(Boolean))
    ]

    let teamsMap = {}
    if (teamIds.length > 0) {
        const { data: teams } = await supabase
            .from("teams")
            .select("id, name, flag_url, fifa_code")
            .in("id", teamIds)

        if (teams) {
            teamsMap = teams.reduce((acc, t) => {
                acc[t.id] = t
                return acc
            }, {})
        }
    }

    return matches.map(m => ({
        ...m,
        home_team: teamsMap[m.home_team_id] || null,
        away_team: teamsMap[m.away_team_id] || null
    }))
}

export async function updateBracketPosition(matchId, newPosition) {
    const { error } = await supabase
        .from("matches")
        .update({ bracket_position: newPosition })
        .eq("id", matchId)

    if (error) {
        console.error("Error updating bracket position:", error)
        return false
    }

    return true
}

export async function swapBracketPositions(matchId1, matchId2, pos1, pos2) {
    const { error: error1 } = await supabase
        .from("matches")
        .update({ bracket_position: pos2 })
        .eq("id", matchId1)

    if (error1) {
        console.error("Error swapping bracket position 1:", error1)
        return false
    }

    const { error: error2 } = await supabase
        .from("matches")
        .update({ bracket_position: pos1 })
        .eq("id", matchId2)

    if (error2) {
        console.error("Error swapping bracket position 2:", error2)
        return false
    }

    return true
}

export async function getPreviewConnections(currentPhaseId, nextPhaseId) {
    const [currentMatches, nextMatches] = await Promise.all([
        getBracketMatchesForPhase(currentPhaseId),
        getBracketMatchesForPhase(nextPhaseId)
    ])

    const connections = []

    for (let i = 0; i < currentMatches.length; i += 2) {
        const match1 = currentMatches[i]
        const match2 = currentMatches[i + 1]
        const parentIndex = Math.floor(i / 2)
        const parentMatch = nextMatches[parentIndex]

        connections.push({
            children: [match1, match2].filter(Boolean),
            parent: parentMatch || null,
            parentPosition: parentIndex + 1
        })
    }

    return {
        currentPhaseMatches: currentMatches,
        nextPhaseMatches: nextMatches,
        connections
    }
}
