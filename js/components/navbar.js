import { getCurrentUser } from "../data/users.js";

export async function loadNavbar() {
  const container = document.getElementById("navbarContainer");

  if (!container) return;

  try {
    const res = await fetch("navbar.html");

    if (!res.ok) throw new Error("Navbar no encontrada");

    container.innerHTML = await res.text();

    // 🔥 más estable que requestAnimationFrame para este caso
    setTimeout(renderNavbarUser, 0);

  } catch (err) {
    console.error("Navbar error:", err);
  }
}

export function renderNavbarUser() {
  const user = getCurrentUser();

  const rankEl = document.getElementById("navRank");
  const pointsEl = document.getElementById("navPoints");
  const avatarEl = document.getElementById("navAvatar");

  // 🔒 seguridad DOM (más robusto)
  if (!rankEl || !pointsEl || !avatarEl) return;

  // 👤 fallback consistente
  if (!user) {
    rankEl.textContent = "RANK #--";
    pointsEl.textContent = "-- pts";
    avatarEl.src = "/assets/images/default.png";
    return;
  }

  // 📊 render
  rankEl.textContent = `RANK #${user.rank}`;
  pointsEl.textContent = `${user.points.toLocaleString()} pts`;

  avatarEl.src = `/assets/images/${user.avatar}`;
  avatarEl.onerror = () => {
    avatarEl.src = "/assets/images/default.png";
  };
}