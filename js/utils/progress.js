export function updateProgress(matches = null, predictions = []) {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const remainingText = document.getElementById("remaining");
  const phaseLabel = document.getElementById("phaseLabel");

  if (!progressFill || !progressText || !remainingText) return;

  let totalMatches, completed;

  if (matches && matches.length > 0) {
    totalMatches = matches.length;
    completed = predictions.filter(p =>
      p.home_predictions !== null &&
      p.home_predictions !== undefined &&
      p.home_predictions !== "" &&
      p.away_predictions !== null &&
      p.away_predictions !== undefined &&
      p.away_predictions !== ""
    ).length;
  } else {
    const cards = document.querySelectorAll(".match-card");
    totalMatches = cards.length;
    completed = 0;
    cards.forEach(card => {
      const inputs = card.querySelectorAll(".score-input");
      const filled = Array.from(inputs).every(i => i.value !== "");
      if (filled) completed++;
    });
  }

  const remaining = totalMatches - completed;
  const percentage = totalMatches > 0 ? (completed / totalMatches) * 100 : 0;

  progressFill.style.width = percentage + "%";
  progressText.textContent = `${completed} de ${totalMatches} completadas`;
  remainingText.textContent = remaining;

  if (phaseLabel && matches && matches.length > 0) {
    const phase = matches[0].phase?.name || "Fase de grupos";
    phaseLabel.textContent = phase;
  }

  const banner = document.querySelector(".insight-banner");
  if (banner) {
    banner.style.background = remaining === 0 ? "#E8F5E9" : "";
  }
}