import { supabase } from "/config/supabase.js"

export async function createProfile(userId, username, country) {
  return await supabase.from("profiles").insert({
    user_id: userId,
    user_name: username,
    country_code: country,
    avatar_url: "avatar.png"
  })
}

export async function getProfile(userId) {
  return await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single()
}