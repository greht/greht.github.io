import { supabase } from "../config/supabase.js"

document.addEventListener("DOMContentLoaded", async () => {

    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
        console.log("🟢 Usuario logueado:", session.user)
        // aquí rediriges o muestras dashboard
    } else {
        console.log("🔴 No hay sesión")
        // mostrar login
    }

})