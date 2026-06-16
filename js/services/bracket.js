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
        .select("*")
        .not("phase_id", "is", null)
        .order("bracket_position", { ascending: true })

    if (matchesError) {
        console.error("Error fetching bracket matches:", matchesError)
        return []
    }

    if (!matches || matches.length === 0) return []

    const { data: teams } = await supabase
        .from("teams")
        .select("id, name, flag_url, fifa_code")

    const { data: phases } = await supabase
        .from("phases")
        .select("id, name, display_order")
        .order("display_order", { ascending: true })

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || [])
    const phasesMap = new Map(phases?.map(p => [p.id, p]) || [])

    return matches.map(m => ({
        ...m,
        home_team: teamsMap.get(m.home_team_id) || null,
        away_team: teamsMap.get(m.away_team_id) || null,
        phase: phasesMap.get(m.phase_id) || null
    }))
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

    const bracketPhases = phases.map(phase => {
        const phaseMatches = matches
            .filter(m => m.phase_id === phase.id)
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
