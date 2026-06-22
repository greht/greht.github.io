import { supabase } from "/config/supabase.js"

export async function getSetting(key) {
  const cacheKey = `setting_cache_${key}`
  const cached = localStorage.getItem(cacheKey)
  
  if (cached) {
    const { value, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    if (age < 5 * 60 * 1000) {
      return value
    }
  }
  
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .limit(1)
  
  if (error || !data || data.length === 0) {
    if (error) console.error("Error fetching setting:", error)
    return null
  }
  
  localStorage.setItem(cacheKey, JSON.stringify({
    value: data[0].value,
    timestamp: Date.now()
  }))
  
  return data[0].value || null
}

export async function updateSetting(key, value) {
  const { error } = await supabase
    .from("settings")
    .upsert({ 
      key, 
      value, 
      updated_at: new Date().toISOString() 
    }, { onConflict: "key" })
  
  if (error) {
    console.error("Error updating setting:", error)
    return false
  }
  
  localStorage.removeItem(`setting_cache_${key}`)
  return true
}
