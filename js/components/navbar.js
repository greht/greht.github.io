import { supabase } from "/config/supabase.js";
import { signOut } from "/js/services/auth.js";
import { getUserRank } from "/js/services/ranking.js";

export async function loadNavbar() {
  const container = document.getElementById("navbarContainer");

  if (!container) return;
  if (container.innerHTML.trim() !== "") return;

  try {
    const res = await fetch("/navbar.html");
    if (!res.ok) throw new Error("Navbar no encontrada");
    container.innerHTML = await res.text();
    await renderNavbarUser();
  } catch (err) {
    console.error("Navbar error:", err);
  }
}

export async function renderNavbarUser() {
  const { data: { user } } = await supabase.auth.getUser();

  const rankEl = document.getElementById("navRank");
  const pointsEl = document.getElementById("navPoints");
  const avatarEl = document.getElementById("navAvatar");
  const logoutBtn = document.getElementById("logoutBtn");

  setupDropdownEvents();

  if (!user || !rankEl || !pointsEl || !avatarEl) {
    if (rankEl) rankEl.textContent = "RANK #--";
    if (pointsEl) pointsEl.textContent = "-- pts";
    if (avatarEl) avatarEl.src = "/assets/images/avatar.png";
    return;
  }

  const profile = await getProfileData(user.id);
  const { rank } = await getUserRank(user.id);

  if (profile?.role === "admin") {
    const adminLink = document.getElementById("adminLink");
    if (adminLink) adminLink.style.display = "block";
  }

  rankEl.textContent = `RANK #${rank || "--"}`;
  pointsEl.textContent = `${profile?.points?.toLocaleString() || "0"} pts`;

  const avatarSrc = profile?.avatar_url
    ? profile.avatar_url.startsWith('http')
        ? profile.avatar_url
        : `/assets/images/${profile.avatar_url}`
    : `/assets/images/avatar.png`;

  avatarEl.src = avatarSrc;
  avatarEl.onerror = () => {
    avatarEl.onerror = null;
    avatarEl.src = "/assets/images/avatar.png";
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function(e) {
      e.preventDefault();
      e.stopPropagation();
      localStorage.clear();
      sessionStorage.clear();
      await signOut();
      window.location.href = "/login.html";
    });
  }
}

function setupDropdownEvents() {
  const dropdownMenu = document.getElementById("dropdownMenu");
  const userDropdown = document.getElementById("userDropdown");

  if (!userDropdown || !dropdownMenu) return;

  userDropdown.onclick = function(e) {
    e.stopPropagation();
    userDropdown.classList.toggle("active");
  };

  document.addEventListener("click", function(e) {
    if (!userDropdown.contains(e.target)) {
      userDropdown.classList.remove("active");
    }
  });
}

async function getProfileData(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("points, avatar_url, role")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function loadFooter() {
  const container = document.getElementById("footer");

  if (!container) return;

  try {
    const res = await fetch("/footer.html");

    if (!res.ok) throw new Error("Footer no encontrado");

    container.innerHTML = await res.text();

  } catch (err) {
    console.error("Footer error:", err);
  }
}