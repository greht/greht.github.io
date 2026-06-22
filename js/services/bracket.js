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

export async function getBracketMatches() {
    const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select(`
            *,
            home_team:teams!matches_home_team_id_fkey(id, name, flag_url, fifa_code),
            away_team:teams!matches_away_team_id_fkey(id, name, flag_url, fifa_code),
            phase:phases(id, name, display_order)
        `)
        .not("phase_id", "is", null)
        .order("bracket_position", { ascending: true })

    if (matchesError) {
        console.error("Error fetching bracket matches:", matchesError)
        return []
    }

    if (!matches || matches.length === 0) return []

    return matches
}

export async function getBracketPredictions(userId) {
    if (!userId) return []

    const { data, error } = await supabase
        .from("predictions")
        .select("*, points_earned, is_exact")
        .eq("user_id", userId)

    if (error) {
        console.error("Error fetching bracket predictions:", error)
        return []
    }

    return data || []
}

export function buildBracketStructure(phases, matches, predictions) {
    const predictionsMap = new Map(predictions.map(p => [p.match_id, p]))
    const matchesByPhaseId = new Map()
    matches.forEach(m => {
        if (!matchesByPhaseId.has(m.phase_id)) matchesByPhaseId.set(m.phase_id, [])
        matchesByPhaseId.get(m.phase_id).push(m)
    })

    const bracketPhases = phases.map(phase => {
        const phaseMatches = (matchesByPhaseId.get(phase.id) || [])
            .sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0))
            .map(match => {
                const prediction = predictionsMap.get(match.id)
                return {
                    ...match,
                    prediction: prediction || null,
                    home_predictions: prediction?.home_predictions ?? null,
                    away_predictions: prediction?.away_predictions ?? null,
                    points_earned: prediction?.points_earned ?? null,
                    is_exact: prediction?.is_exact ?? null
                }
            })

        return {
            ...phase,
            matches: phaseMatches
        }
    }).filter(phase => phase.matches.length > 0)

    return { phases: bracketPhases }
}

export function getConnectedMatchPosition(currentPhaseIndex, matchPosition) {
    return Math.ceil(matchPosition / 2)
}
