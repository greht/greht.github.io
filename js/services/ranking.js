import { supabase } from "/config/supabase.js"

export async function getUserRank(userId) {
  const { data: allUsers, error } = await supabase
    .from("profiles")
    .select("user_id, points")
    .order("points", { ascending: false })

  if (error) {
    return { rank: null, total: 0 }
  }

  const total = allUsers.length
  const rank = allUsers.findIndex(u => u.user_id === userId) + 1

  return { rank, total }
}

export async function getTopUsers(limit = 10) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, user_name, country_code, points, avatar_url")
    .order("points", { ascending: false })
    .limit(limit)

  if (error) {
    return []
  }

  return data
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, user_name, country_code, points, avatar_url")
    .order("points", { ascending: false })

  if (error) {
    return []
  }

  const usersWithExact = await Promise.all(data.map(async (user) => {
    const { count } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.user_id)
      .eq("is_exact", true);

    return { ...user, exact_count: count || 0 };
  }));

  return usersWithExact;
}

export async function getExactCount(userId) {
  const { count, error } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_exact", true);

  return count || 0;
}