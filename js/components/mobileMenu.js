export function initMobileMenu() {
  const hamburger = document.getElementById("hamburgerMenu");
  if (!hamburger) return;

  const mobileMenu = document.getElementById("mobileMenu");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
  const mobileMenuClose = document.getElementById("mobileMenuClose");
  const mobileMenuLinks = mobileMenu?.querySelectorAll("a") || [];

  function open() {
    hamburger.classList.add("active");
    mobileMenu?.classList.add("active");
    mobileMenuOverlay?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function close() {
    hamburger.classList.remove("active");
    mobileMenu?.classList.remove("active");
    mobileMenuOverlay?.classList.remove("active");
    document.body.style.overflow = "";
  }

  hamburger.addEventListener("click", () => {
    mobileMenu?.classList.contains("active") ? close() : open();
  });
  mobileMenuOverlay?.addEventListener("click", close);
  mobileMenuClose?.addEventListener("click", close);
  mobileMenuLinks.forEach((link) => link.addEventListener("click", close));
}
