import { supabase } from "/config/supabase.js";

export const TEAM_STATUS = {
  ACTIVE: "active",
  QUALIFIED: "qualified",
  ELIMINATED: "eliminated",
};

export async function getTeamsWithStatus() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, flag_url, group_id, is_eliminated, is_qualified")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching teams with status:", error);
    return [];
  }
  return data || [];
}

export async function getTeamStatus(teamId) {
  const { data, error } = await supabase
    .from("teams")
    .select("is_eliminated, is_qualified, eliminated_at, qualified_at")
    .eq("id", teamId)
    .single();

  if (error) {
    console.error("Error fetching team status:", error);
    return null;
  }
  return data;
}

export async function markTeamEliminated(teamId, eliminated = true) {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    is_eliminated: eliminated,
    eliminated_at: eliminated ? new Date().toISOString() : null,
    updated_by: user?.id || null,
  };

  if (eliminated) {
    payload.is_qualified = false;
    payload.qualified_at = null;
  }

  const { data, error } = await supabase
    .from("teams")
    .update(payload)
    .eq("id", teamId)
    .select("id, is_eliminated, is_qualified")
    .single();

  if (error) {
    console.error("Error marking team eliminated:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

export async function markTeamQualified(teamId, qualified = true) {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    is_qualified: qualified,
    qualified_at: qualified ? new Date().toISOString() : null,
    updated_by: user?.id || null,
  };

  if (qualified) {
    payload.is_eliminated = false;
    payload.eliminated_at = null;
  }

  const { data, error } = await supabase
    .from("teams")
    .update(payload)
    .eq("id", teamId)
    .select("id, is_eliminated, is_qualified")
    .single();

  if (error) {
    console.error("Error marking team qualified:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

export async function resetTeamStatus(teamId) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("teams")
    .update({
      is_eliminated: false,
      is_qualified: false,
      eliminated_at: null,
      qualified_at: null,
      updated_by: user?.id || null,
    })
    .eq("id", teamId)
    .select("id, is_eliminated, is_qualified")
    .single();

  if (error) {
    console.error("Error resetting team status:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

export async function applyBulkSuggestions(suggestions) {
  const { data: { user } } = await supabase.auth.getUser();
  const now = new Date().toISOString();

  const rows = suggestions.map((s) => ({
    id: s.teamId,
    is_eliminated: true,
    eliminated_at: now,
    is_qualified: false,
    qualified_at: null,
    updated_by: user?.id || null,
  }));

  if (rows.length === 0) return { ok: true, count: 0 };

  const { data, error } = await supabase
    .from("teams")
    .upsert(rows, { onConflict: "id" })
    .select("id, is_eliminated, is_qualified");

  if (error) {
    console.error("Error applying bulk suggestions:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, count: data?.length || 0 };
}

export async function suggestEliminationsForGroup(groupId, advanceSlots = 2) {
  try {
    const { data, error } = await supabase.rpc("can_team_still_qualify", {
      p_team_id: null,
      p_group_id: groupId,
      p_advance: advanceSlots,
    });

    if (error) {
      console.warn("RPC can_team_still_qualify no disponible, usando fallback JS:", error.message);
      return await suggestEliminationsForGroupFallback(groupId, advanceSlots);
    }
    return [];
  } catch (err) {
    console.warn("Falling back to JS elimination suggestion:", err);
    return await suggestEliminationsForGroupFallback(groupId, advanceSlots);
  }
}

async function suggestEliminationsForGroupFallback(groupId, advanceSlots = 2) {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("group_id", groupId);

  if (!teams || teams.length === 0) return [];

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, home_score, away_score, status")
    .eq("group_id", groupId);

  const teamStats = {};
  for (const t of teams) {
    teamStats[t.id] = {
      teamId: t.id,
      name: t.name,
      played: 0,
      points: 0,
      remainingMatches: 0,
    };
  }

  const playedPairs = new Set();
  for (const m of matches || []) {
    if (m.status !== "finished") continue;
    if (!m.home_team_id || !m.away_team_id) continue;
    if (m.home_score == null || m.away_score == null) continue;

    if (teamStats[m.home_team_id]) {
      teamStats[m.home_team_id].played += 1;
      if (m.home_score > m.away_score) teamStats[m.home_team_id].points += 3;
      else if (m.home_score === m.away_score) teamStats[m.home_team_id].points += 1;
    }
    if (teamStats[m.away_team_id]) {
      teamStats[m.away_team_id].played += 1;
      if (m.away_score > m.home_score) teamStats[m.away_team_id].points += 3;
      else if (m.home_score === m.away_score) teamStats[m.away_team_id].points += 1;
    }
    playedPairs.add(`${m.home_team_id}_${m.away_team_id}`);
  }

  for (const t of teams) {
    const totalMatches = 3;
    teamStats[t.id].remainingMatches = Math.max(0, totalMatches - teamStats[t.id].played);
  }

  const suggestions = [];
  for (const t of teams) {
    const stats = teamStats[t.id];
    const bestPossible = stats.points + stats.remainingMatches * 3;

    const others = Object.values(teamStats)
      .filter((o) => o.teamId !== t.teamId)
      .map((o) => o.points)
      .sort((a, b) => b - a);

    const cutoff = others[advanceSlots - 1] ?? 0;

    if (bestPossible < cutoff) {
      suggestions.push({
        teamId: t.teamId,
        teamName: t.name,
        currentPoints: stats.points,
        bestPossible,
        cutoff,
      });
    }
  }

  return suggestions;
}

export async function suggestEliminationsForAllGroups(advanceSlots = 2) {
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name");

  if (!groups) return [];

  const allSuggestions = [];
  for (const g of groups) {
    const sg = await suggestEliminationsForGroupFallback(g.id, advanceSlots);
    sg.forEach((s) => (s.groupId = g.id));
    allSuggestions.push(...sg);
  }
  return allSuggestions;
}
