import { loadNavbar, loadFooter } from "/js/components/navbar.js";
import { initMobileMenu } from "/js/components/mobileMenu.js";
import { supabase } from "/config/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  initMobileMenu();

  const [, , { data: { session } }] = await Promise.all([
    loadNavbar(),
    loadFooter(),
    supabase.auth.getSession(),
  ]);

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "/login.html";
    }
  });

  if (!session) {
    const protectedPages = ["/dashboard.html", "/profile.html", "/predictions.html"];
    if (protectedPages.includes(window.location.pathname)) {
      window.location.href = "/login.html";
    }
  }
});