import { loadNavbar, loadFooter } from "/js/components/navbar.js";
import { supabase } from "/config/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

  // NAVBAR
  await loadNavbar();

  // FOOTER
  await loadFooter();

  // SESSION ACTUAL
  const { data: { session } } = await supabase.auth.getSession();

if (session) {

  } else {

  }

  // LISTENER GLOBAL AUTH
  supabase.auth.onAuthStateChange((event, session) => {

    if (event === "SIGNED_IN") {

    }

    if (event === "SIGNED_OUT") {

      // ejemplo:
      window.location.href = "/login.html";
    }

  });

});