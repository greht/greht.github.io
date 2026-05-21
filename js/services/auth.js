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

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getUser() {
  return await supabase.auth.getUser()
}

export async function getSession() {
  return await supabase.auth.getSession()
}