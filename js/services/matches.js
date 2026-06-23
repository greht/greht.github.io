import { supabase } from "/config/supabase.js"

export async function getMatches() {

    const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true })

    if (matchesError) {
        console.error("Error fetching matches:", matchesError)
        return []
    }


    if (!matches || matches.length === 0) return []

    const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, flag_url, group_id, is_eliminated, is_qualified, fifa_code")

    if (teamsError) {
        console.error("Error fetching teams:", teamsError)
    }

    const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, name")

    if (groupsError) {
        console.error("Error fetching groups:", groupsError)
    }

    const { data: phases, error: phasesError } = await supabase
        .from("phases")
        .select("id, name, display_order")
        .order("display_order", { ascending: true })

    if (phasesError) {
        console.error("Error fetching phases:", phasesError)
    }

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || [])
    const groupsMap = new Map(groups?.map(g => [g.id, g]) || [])
    const phasesMap = new Map(phases?.map(p => [p.id, p]) || [])


    return matches.map(m => {
        const home = teamsMap.get(m.home_team_id)
        const away = teamsMap.get(m.away_team_id)
        const phase = phasesMap.get(m.phase_id) || null

        return {
            ...m,
            home_team: home || null,
            away_team: away || null,
            group: groupsMap.get(m.group_id) || null,
            phase: phase
        }
    })
}