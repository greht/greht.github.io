let tapHandlerAttached = false;

function attachTapHandler() {
  if (tapHandlerAttached) return;
  tapHandlerAttached = true;

  document.addEventListener("click", (e) => {
    const segment = e.target.closest(".progress-segment");
    document.querySelectorAll(".progress-segment.show-tooltip").forEach((s) => {
      if (s !== segment) s.classList.remove("show-tooltip");
    });
    if (segment) segment.classList.toggle("show-tooltip");
  });

  document.addEventListener("mouseout", (e) => {
    const segment = e.target.closest(".progress-segment");
    if (segment && !segment.contains(e.relatedTarget)) {
      segment.classList.remove("show-tooltip");
    }
  });
}

const PREDICTION_DEADLINE_MINUTES = 15;

function parseMatchDate(matchDate) {
  if (!matchDate) return null;
  const parts = String(matchDate).match(
    /(\d+)[-\sT]+(\d+)[-\sT]+(\d+)[\sT]+(\d+):(\d+):(\d+)/
  );
  if (!parts) {
    const d = new Date(matchDate);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, second));
}

function isMatchClosed(match, now = new Date()) {
  if (!match) return false;
  if (match.status === "finished") return true;
  const matchTime = parseMatchDate(match.match_date);
  if (!matchTime) return false;
  const deadline =
    matchTime.getTime() - PREDICTION_DEADLINE_MINUTES * 60 * 1000;
  return now.getTime() >= deadline;
}

function isPhasePast(phase, now = new Date()) {
  if (!phase.matches || phase.matches.length === 0) return false;
  return phase.matches.every((m) => isMatchClosed(m, now));
}

export function renderSegmentedProgress(matches = [], predictions = []) {
  const segmentsContainer = document.getElementById("progressSegments");
  const progressText = document.getElementById("progressText");
  const remainingText = document.getElementById("remaining");
  const phaseLabel = document.getElementById("phaseLabel");
  const insightInProgress = document.getElementById("insightInProgress");
  const insightComplete = document.getElementById("insightComplete");

  if (!segmentsContainer || !progressText || !remainingText) return;

  const hasPrediction = (p) =>
    p &&
    p.home_predictions !== null &&
    p.home_predictions !== undefined &&
    p.home_predictions !== "" &&
    p.away_predictions !== null &&
    p.away_predictions !== undefined &&
    p.away_predictions !== "";

  const predictionsByMatch = new Map(
    (predictions || []).map((p) => [p.match_id, p])
  );

  const phasesMap = new Map();
  for (const match of matches) {
    const phaseId = match.phase_id || match.phase?.id;
    if (!phaseId) continue;

    if (!phasesMap.has(phaseId)) {
      phasesMap.set(phaseId, {
        id: phaseId,
        name: match.phase?.name || "Fase",
        displayOrder: match.phase?.display_order ?? 999,
        matches: []
      });
    }
    phasesMap.get(phaseId).matches.push(match);
  }

  const phases = Array.from(phasesMap.values()).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  const now = new Date();
  let globalTotal = 0;
  let globalCompleted = 0;
  let firstIncomplete = null;
  let activeRemaining = 0;
  let anyActiveIncomplete = false;

  const segmentsHtml = phases
    .map((phase) => {
      const total = phase.matches.length;
      const completed = phase.matches.filter((m) => {
        const pred = predictionsByMatch.get(m.id);
        return hasPrediction(pred);
      }).length;
      const missing = Math.max(0, total - completed);

      globalTotal += total;
      globalCompleted += completed;

      const past = isPhasePast(phase, now);
      if (!past && missing > 0) {
        activeRemaining += missing;
        anyActiveIncomplete = true;
        if (!firstIncomplete) {
          firstIncomplete = {
            name: phase.name,
            remaining: missing
          };
        }
      }

      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isCompleted = total > 0 && completed === total;
      const isPastComplete = past && isCompleted;
      const isPastMissed = past && missing > 0;

      let segmentClass = "";
      let status = "";
      if (isPastMissed) {
        segmentClass = "past-missed";
        status = `🔒 Cerrada — ${missing} sin predecir`;
      } else if (isPastComplete) {
        segmentClass = "past-complete";
        status = "🔒 Cerrada";
      } else if (isCompleted) {
        segmentClass = "completed";
        status = "✓ Completa";
      } else {
        status = "En progreso";
      }

      const tooltip = `${phase.name}\n${completed}/${total} — ${percent}%\n${status}`;

      return `
        <div
          class="progress-segment ${segmentClass}"
          style="flex-grow: ${total};"
          data-phase="${phase.name}"
          data-completed="${completed}"
          data-total="${total}"
          data-tooltip="${tooltip}"
        >
          <div class="fill" style="width: ${percent}%;"></div>
        </div>
      `;
    })
    .join("");

  segmentsContainer.innerHTML = segmentsHtml;

  attachTapHandler();

  progressText.textContent = `${globalCompleted} de ${globalTotal} completadas`;

  const allComplete = globalTotal > 0 && activeRemaining === 0;

  if (allComplete) {
    if (insightInProgress) insightInProgress.style.display = "none";
    if (insightComplete) insightComplete.style.display = "";
  } else {
    if (insightInProgress) insightInProgress.style.display = "";
    if (insightComplete) insightComplete.style.display = "none";

    if (firstIncomplete) {
      remainingText.textContent = firstIncomplete.remaining;
      if (phaseLabel) {
        phaseLabel.textContent = `la ${firstIncomplete.name.toLowerCase()}`;
      }
    } else {
      remainingText.textContent = activeRemaining;
      if (phaseLabel) {
        phaseLabel.textContent = "el torneo";
      }
    }
  }

  const banner = document.querySelector(".insight-banner");
  if (banner) {
    banner.style.background = allComplete ? "#E8F5E9" : "";
  }
}

export function updateProgress(matches = null, predictions = []) {
  if (!matches || matches.length === 0) {
    const cards = document.querySelectorAll(".match-card");
    const total = cards.length;
    let completed = 0;
    cards.forEach((card) => {
      const inputs = card.querySelectorAll(".score-input");
      const filled = Array.from(inputs).every((i) => i.value !== "");
      if (filled) completed++;
    });

    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
    const remainingText = document.getElementById("remaining");
    const phaseLabel = document.getElementById("phaseLabel");

    if (progressText) {
      progressText.textContent = `${completed} de ${total} completadas`;
    }
    if (remainingText) {
      remainingText.textContent = total - completed;
    }
    if (progressFill) {
      const percent = total > 0 ? (completed / total) * 100 : 0;
      progressFill.style.width = percent + "%";
    }

    const banner = document.querySelector(".insight-banner");
    if (banner) {
      banner.style.background = total - completed === 0 ? "#E8F5E9" : "";
    }
    return;
  }

  renderSegmentedProgress(matches, predictions);
}
