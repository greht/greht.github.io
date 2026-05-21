import { getCurrentUser, getCurrentUserFromSupabase } from "/js/data/users.js";

import { signOut } from "/js/services/auth.js"

export async function loadNavbar() {
  const container = document.getElementById("navbarContainer");

  if (!container) return;

  try {
    const res = await fetch("/navbar.html");

    if (!res.ok) throw new Error("Navbar no encontrada");

    container.innerHTML = await res.text();
    
    // Render user info (async)
    await renderNavbarUser();

  } catch (err) {
    console.error("Navbar error:", err);
  }
}

export async function renderNavbarUser() {
  // Intentar obtener usuario de Supabase primero
  let user = await getCurrentUserFromSupabase();
  
  // Fallback a datos locales si no hay sesión
  if (!user) {
    user = getCurrentUser();
  }

  const rankEl = document.getElementById("navRank");
  const pointsEl = document.getElementById("navPoints");
  const avatarEl = document.getElementById("navAvatar");
  const logoutBtn = document.getElementById("logoutBtn");

  console.log("Navbar render - user:", user);

  // 🔒 seguridad DOM (más robusto)
  if (!rankEl || !pointsEl || !avatarEl) {
    console.log("Missing required elements, returning early");
    return;
  }

  // 👤 fallback consistente
  if (!user) {
    rankEl.textContent = "RANK #--";
    pointsEl.textContent = "-- pts";
    avatarEl.src = "/assets/images/default.png";
    return;
  }

  // 📊 render
  rankEl.textContent = `RANK #${user.rank || "--"}`;
  pointsEl.textContent = `${user.points?.toLocaleString() || "0"} pts`;

  // Si es URL completa (http/https), usarla directamente, si no, buscar en assets
  const avatarSrc = user.avatar?.startsWith('http') 
    ? user.avatar 
    : `/assets/images/${user.avatar}`;
  
  avatarEl.src = avatarSrc;
  avatarEl.onerror = () => {
    avatarEl.onerror = null; // prevent infinite loop
    avatarEl.src = "/assets/images/avatar.png";
  };

  // Setup dropdown click
  const dropdownMenu = document.getElementById("dropdownMenu");
  const userDropdown = document.getElementById("userDropdown");
  
  if (avatarEl && userDropdown && dropdownMenu) {
    userDropdown.onclick = function(e) {
      e.stopPropagation();
      const current = dropdownMenu.style.display;
      dropdownMenu.style.display = current === "none" ? "block" : "none";
    };
  }

  // Cerrar dropdown al hacer click fuera
  document.addEventListener("click", function(e) {
    if (dropdownMenu && userDropdown && !userDropdown.contains(e.target)) {
      dropdownMenu.style.display = "none";
    }
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function(e) {
      e.preventDefault();
      e.stopPropagation();
      await signOut();
      window.location.href = "/login.html";
    });
  }
}