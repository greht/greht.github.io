import { supabase } from "/config/supabase.js"

export async function getQualifiedTeams(leagueId, stage) {
    const { data, error } = await supabase
        .from("qualified_teams")
        .select(`
            *,
            team:teams(id, name, flag_url, fifa_code)
        `)
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .order("slot_code")

    if (error) throw error
    return data || []
}

export async function assignQualifiedTeam(leagueId, stage, slotCode, teamId) {
    const existing = await supabase
        .from("qualified_teams")
        .select("id")
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .eq("slot_code", slotCode)
        .single()

    if (existing.data) {
        const { error } = await supabase
            .from("qualified_teams")
            .update({ team_id: teamId })
            .eq("id", existing.data.id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from("qualified_teams")
            .insert({ league_id: leagueId, stage, slot_code: slotCode, team_id: teamId })
        if (error) throw error
    }
}

export async function removeQualifiedTeam(leagueId, stage, slotCode) {
    const { error } = await supabase
        .from("qualified_teams")
        .delete()
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .eq("slot_code", slotCode)

    if (error) throw error
}

export async function getKnockoutTemplates(leagueId, stage) {
    const { data, error } = await supabase
        .from("knockout_templates")
        .select("*")
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .order("match_order")

    if (error) throw error
    return data || []
}

export async function createKnockoutTemplate(leagueId, stage, matchOrder, homeSlot, awaySlot) {
    const { error } = await supabase
        .from("knockout_templates")
        .insert({
            league_id: leagueId,
            stage,
            match_order: matchOrder,
            home_slot: homeSlot,
            away_slot: awaySlot
        })

    if (error) throw error
}

export async function deleteKnockoutTemplates(leagueId, stage) {
    const { error } = await supabase
        .from("knockout_templates")
        .delete()
        .eq("league_id", leagueId)
        .eq("stage", stage)

    if (error) throw error
}

export async function resolveSlotToTeamId(leagueId, stage, slotCode) {
    const { data, error } = await supabase
        .from("qualified_teams")
        .select("team_id")
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .eq("slot_code", slotCode)
        .single()

    if (error) throw error
    return data?.team_id || null
}

export async function generateKnockoutStage(leagueId, stage, phaseId, matchDate) {
    const templates = await getKnockoutTemplates(leagueId, stage)

    if (!templates.length) {
        throw new Error(`No templates found for stage: ${stage}`)
    }

    const qualifiedTeams = await getQualifiedTeams(leagueId, stage)
    const slotToTeamMap = new Map(qualifiedTeams.map(qt => [qt.slot_code, qt.team_id]))

    const matchesToInsert = []

    for (const template of templates) {
        const homeTeamId = slotToTeamMap.get(template.home_slot)
        const awayTeamId = slotToTeamMap.get(template.away_slot)

        if (!homeTeamId || !awayTeamId) {
            console.warn(`Skipping match ${template.match_order}: missing team for slots ${template.home_slot} or ${template.away_slot}`)
            continue
        }

        matchesToInsert.push({
            league_id: leagueId,
            phase_id: phaseId,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_slot: template.home_slot,
            away_slot: template.away_slot,
            stage,
            status: "scheduled",
            match_date: matchDate
        })
    }

    if (matchesToInsert.length === 0) {
        throw new Error("No valid matches to create. Ensure qualified teams are assigned.")
    }

    const { data, error } = await supabase
        .from("matches")
        .insert(matchesToInsert)
        .select()

    if (error) throw error
    return data
}

export async function getKnockoutMatches(leagueId, stage) {
    const { data, error } = await supabase
        .from("matches")
        .select(`
            *,
            home_team:teams!home_team_id(id, name, flag_url),
            away_team:teams!away_team_id(id, name, flag_url)
        `)
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .order("match_date")

    if (error) throw error
    return data || []
}