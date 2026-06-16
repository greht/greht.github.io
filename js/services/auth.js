import { supabase } from "/config/supabase.js"

export async function signUp(email, password, username, country, age, terms) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        country,
        age,
        terms,
      }
    }
  })
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password
  })
}

export function clearAllStorage() {
  localStorage.clear()
  sessionStorage.clear()
  document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
  })
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  clearAllStorage()
  return { error }
}

export async function getUser() {
  return await supabase.auth.getUser()
}

export async function getSession() {
  return await supabase.auth.getSession()
}

export async function validateSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return null
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return null
  }

  return { session, user }
}

export async function requireAuth(redirectUrl = "/login.html") {
  const result = await validateSession()
  if (!result) {
    window.location.href = redirectUrl
    return false
  }
  return result
}

export async function resetPasswordForEmail(email) {
  const redirectTo = `${window.location.origin}/reset-password.html`
  return await supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export async function updatePassword(password) {
  return await supabase.auth.updateUser({ password })
}