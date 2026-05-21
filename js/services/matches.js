import { supabase } from "/config/supabase.js"

export async function getMatches() {
    console.log("Fetching matches...")
    
    const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: true })

    if (matchesError) {
        console.error("Error fetching matches:", matchesError)
        return []
    }

    console.log("Matches:", matches?.length)
    
    if (!matches || matches.length === 0) return []

    console.log("Fetching teams...")
    const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, flag_url")

    if (teamsError) {
        console.error("Error fetching teams:", teamsError)
    }
    console.log("Teams:", teams?.length, teams)

    console.log("Fetching groups...")
    const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, name")

    if (groupsError) {
        console.error("Error fetching groups:", groupsError)
    }
    console.log("Groups:", groups?.length, groups)

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || [])
    const groupsMap = new Map(groups?.map(g => [g.id, g]) || [])

    console.log("Teams map size:", teamsMap.size)
    console.log("Teams map entries:", [...teamsMap.entries()].slice(0, 5))

    return matches.map(m => {
        const home = teamsMap.get(m.home_team_id)
        const away = teamsMap.get(m.away_team_id)
        console.log(`Match ${m.id}: home=${m.home_team_id} => found=`, home)
        
        return {
            ...m,
            home_team: home || null,
            away_team: away || null,
            group: groupsMap.get(m.group_id) || null
        }
    })
}