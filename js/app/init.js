import { loadNavbar, loadFooter } from "/js/components/navbar.js";
import { supabase } from "/config/supabase.js";
import { requireAuth } from "/js/services/auth.js";

document.addEventListener("DOMContentLoaded", async () => {

  await loadNavbar();
  await loadFooter();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "/login.html";
    }
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const protectedPages = ["/dashboard.html", "/profile.html", "/predictions.html"];
    if (protectedPages.includes(window.location.pathname)) {
      window.location.href = "/login.html";
    }
  }
});