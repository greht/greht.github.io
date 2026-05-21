import { loadNavbar } from "/js/components/navbar.js";
import { supabase } from "/config/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

  // NAVBAR
  await loadNavbar();

  // SESSION ACTUAL
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {

    console.log("🟢 Usuario logueado:", session.user);

  } else {

    console.log("🔴 No hay sesión");

  }

  // LISTENER GLOBAL AUTH
  supabase.auth.onAuthStateChange((event, session) => {

    console.log("Auth event:", event);

    if (event === "SIGNED_IN") {

      console.log("🟢 Login exitoso");

    }

    if (event === "SIGNED_OUT") {

      console.log("🔴 Logout");

      // ejemplo:
      window.location.href = "/login.html";
    }

  });

});