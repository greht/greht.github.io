import { loadNavbar, renderNavbarUser } from "/js/components/navbar.js"
import { getCurrentUser, getCurrentUserFromSupabase } from "/js/data/users.js"
import { getProcessedUsers } from "/js/data/users.js"

document.addEventListener("DOMContentLoaded", async () => {

    await loadNavbar()
    await renderNavbarUser()
    
    // Obtener usuario de Supabase
    let currentUser = await getCurrentUserFromSupabase();
    
    // Fallback a datos locales
    if (!currentUser) {
        currentUser = getCurrentUser();
    }
    
    if (currentUser) {
        document.getElementById("userName").textContent = currentUser.name
        document.getElementById("position").textContent = `#${currentUser.rank || "--"}`
        document.getElementById("predictions").textContent = currentUser.correct || "0"
        document.getElementById("correct").textContent = currentUser.correct || "0"
        document.getElementById("points").textContent = currentUser.points || "0"
    } else {
        document.getElementById("userName").textContent = "Invitado"
    }
})