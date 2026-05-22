import { supabase } from "../config/supabase.js"

document.addEventListener("DOMContentLoaded", async () => {

const { data: { session } } = await supabase.auth.getSession()

    if (session) {

    } else {

    }
}

})