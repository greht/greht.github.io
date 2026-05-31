import { loadNavbar, renderNavbarUser } from "/js/components/navbar.js"
import { supabase } from "/config/supabase.js"
import { getUserRank } from "/js/services/ranking.js"
import { getPredictions } from "/js/services/predictions.js"

document.addEventListener("DOMContentLoaded", async () => {

    await loadNavbar()
    await renderNavbarUser()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const profile = await getProfileData(user.id)
    const { rank } = await getUserRank(user.id)
    const predictions = await getPredictions(user.id)
    const exactCount = predictions?.filter(p => p.is_exact === true).length || 0

    document.getElementById("userName").textContent = profile?.user_name || user.email
    document.getElementById("position").textContent = `#${rank || "--"}`
    document.getElementById("predictions").textContent = predictions?.length || 0
    document.getElementById("correct").textContent = exactCount
    document.getElementById("points").textContent = profile?.points?.toLocaleString() || "0"
})

async function getProfileData(userId) {
    const { data } = await supabase
        .from("profiles")
        .select("user_name, points")
        .eq("user_id", userId)
        .single()
    return data
}