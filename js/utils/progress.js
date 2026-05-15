export function updateProgress() {
  const cards = document.querySelectorAll(".match-card");

  let totalMatches = cards.length;
  let completed = 0;

  cards.forEach(card => {
    const inputs = card.querySelectorAll(".score-input");
    const filled = Array.from(inputs).every(i => i.value !== "");
    if (filled) completed++;
  });

  const remaining = totalMatches - completed;
  const percentage = totalMatches > 0 ? (completed / totalMatches) * 100 : 0;

  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const remainingText = document.getElementById("remaining");
  const banner = document.querySelector(".insight-banner");

  if (!progressFill || !progressText || !remainingText) return;

  progressFill.style.width = percentage + "%";
  progressText.textContent = `${completed} de ${totalMatches} completadas`;
  remainingText.textContent = remaining;

  if (banner) {
    banner.style.background = remaining === 0 ? "#E8F5E9" : "";
  }
}