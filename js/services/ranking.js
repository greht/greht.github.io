import { supabase } from "/config/supabase.js"

export function sortRanking(users) {
  return users.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exact_count !== a.exact_count) return b.exact_count - a.exact_count;
    if (b.goals_hit !== a.goals_hit) return b.goals_hit - a.goals_hit;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

export async function fetchRankingStats() {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_score, away_score")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  if (!matches || matches.length === 0) {
    return {};
  }

  const matchMap = {};
  matches.forEach(m => {
    matchMap[m.id] = {
      home_score: parseInt(m.home_score),
      away_score: parseInt(m.away_score)
    };
  });

  const matchIds = matches.map(m => m.id);

  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_id, match_id, home_predictions, away_predictions, is_exact")
    .in("match_id", matchIds);

  if (!predictions || predictions.length === 0) {
    return {};
  }

  const statsByUser = {};

  predictions.forEach(pred => {
    if (!statsByUser[pred.user_id]) {
      statsByUser[pred.user_id] = { exact_count: 0, goals_hit: 0 };
    }

    if (pred.is_exact) {
      statsByUser[pred.user_id].exact_count++;
    }

    const match = matchMap[pred.match_id];
    if (match) {
      const predictedHome = parseInt(pred.home_predictions);
      const predictedAway = parseInt(pred.away_predictions);

      if (!isNaN(predictedHome) && !isNaN(match.home_score) && predictedHome === match.home_score) {
        statsByUser[pred.user_id].goals_hit++;
      }
      if (!isNaN(predictedAway) && !isNaN(match.away_score) && predictedAway === match.away_score) {
        statsByUser[pred.user_id].goals_hit++;
      }
    }
  });

  return statsByUser;
}

export async function getUserRank(userId) {
  const users = await getAllUsers();

  const total = users.length;
  const rank = users.findIndex(u => u.user_id === userId) + 1;

  return { rank, total };
}

export async function getTopUsers(limit = 10) {
  const users = await getAllUsers();
  return users.slice(0, limit);
}

export async function getAllUsers(countryCode = null) {
  let query = supabase
    .from("profiles")
    .select("user_id, user_name, country_code, points, avatar_url, created_at");

  if (countryCode) {
    query = query.eq("country_code", countryCode);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const statsByUser = await fetchRankingStats();

  const users = data.map(user => {
    const stats = statsByUser[user.user_id] || { exact_count: 0, goals_hit: 0 };
    return {
      ...user,
      exact_count: stats.exact_count,
      goals_hit: stats.goals_hit
    };
  });

  return sortRanking(users);
}

export async function getExactCount(userId) {
  const { count, error } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_exact", true);

  return count || 0;
}