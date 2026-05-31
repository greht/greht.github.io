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

export async function updateUsername(userId, username) {
  return await supabase
    .from("profiles")
    .update({ user_name: username })
    .eq("user_id", userId)
}

export async function uploadAvatar(file, userId) {
  const fileExt = file.name.split(".").pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `avatars/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file)

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .single()

  if (profile?.avatar_url && profile.avatar_url.startsWith('http')) {
    const parts = profile.avatar_url.split('/')
    const oldFileName = parts[parts.length - 1]
    if (oldFileName) {
      await supabase.storage.from("avatars").remove([`avatars/${oldFileName}`])
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("user_id", userId)

  if (updateError) {
    throw updateError
  }

  return data.publicUrl
}

export async function updateAvatarUrl(userId, avatarUrl) {
  return await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId)
}