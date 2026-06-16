import { getUserRank } from "/js/services/ranking.js";
import { updateProgress } from "/js/utils/progress.js";
import { initScoreControls } from "/js/components/scoreControl.js";
import { initMatchCards } from "/js/components/matchCard.js";
import { getMatches } from "/js/services/matches.js"
import { supabase } from "/config/supabase.js"
import { savePrediction, getPredictions } from "/js/services/predictions.js"
import { checkAndCelebrateCompletion } from "/js/utils/celebration.js"
import { requireAuth } from "/js/services/auth.js"
import { getProfile } from "/js/services/profile.js"
import { getTimezoneOffset, toLocalTime, toRealUtcDate, formatLocalDate } from "/js/utils/timezone.js"
import { getSetting } from "/js/services/settings.js"

function resolveFlagUrl(flagUrl) {
  if (!flagUrl) return "/assets/images/flag-mexV2.svg";
  if (flagUrl.startsWith("http://") || flagUrl.startsWith("https://")) return flagUrl;
  if (flagUrl.startsWith("<svg") || flagUrl.startsWith("<?xml")) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(flagUrl);
  }
  const fixes = { "sp.svg": "es.svg" };
  let path = flagUrl;
  for (const [bad, good] of Object.entries(fixes)) {
    path = path.replace(bad, good);
  }
  if (path.startsWith("/")) return path;
  return "/" + path;
}

let matchesGlobal = [];
let currentPhaseName = "";
let currentPhaseId = null;
let savedPredictions = [];
let userTimezoneOffset = 0;

function renderSkeletons() {
  const container = document.querySelector(".card-order");
  if (!container) return;

  container.innerHTML = `
    <div class="matches-group open">
      <div class="matches-group-header">
        <div class="accordion-info">
          <span class="journey skeleton-text">Cargando fechas...</span>
        </div>
      </div>
      <div class="matches-group-content">
        ${Array.from({ length: 2 }).map(() => `
          <div class="match-card empty-state">
            <div class="match-header">
              <div class="match-header-left">
                <span class="tag skeleton-text">...</span>
                <span class="time skeleton-text">--</span>
              </div>
              <div class="match-header-right">
                <span class="skeleton-text">--:--</span>
              </div>
            </div>
            <div class="match-body">
              <div class="team">
                <span class="skeleton-text">Cargando...</span>
                <div class="placeholder-flag"></div>
              </div>
              <div class="score">
                <span class="skeleton-text">vs</span>
              </div>
              <div class="team">
                <span class="skeleton-text">Cargando...</span>
                <div class="placeholder-flag"></div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function groupMatchesByDay(matches) {
  return matches.reduce((groups, match) => {
    const localDate = toLocalTime(match.match_date, userTimezoneOffset);

    const key = formatLocalDate(localDate, "es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long"
    });

    if (!groups[key]) groups[key] = [];
    groups[key].push(match);

    return groups;
  }, {});
}

function canPredict(matchDate) {
  if (!matchDate) return true;
  const realDate = toRealUtcDate(matchDate);
  const matchTime = realDate.getTime();
  const now = new Date().getTime();
  const diffMinutes = (matchTime - now) / (1000 * 60);
  return diffMinutes > 15;
}

function renderMatchCard(match) {
  const homeTeam = match.home_team?.name || "Equipo Local";
  const awayTeam = match.away_team?.name || "Equipo Visitante";
  const homeFlag = resolveFlagUrl(match.home_team?.flag_url);
  const awayFlag = resolveFlagUrl(match.away_team?.flag_url);
  const group = match.group?.name ? `Grupo ${match.group.name}` : "Grupo";
  const viewportWidth = window.innerWidth;

  const isMobile =
    viewportWidth <= 480 ||
    (viewportWidth >= 481 && viewportWidth <= 768);


  let matchDate = "Por confirmar";
  let countdown = "";
  let isLocked = false;
  let isCloseToStart = false;
  let diff = null;

  if (match.match_date) {
    try {
      const localDate = toLocalTime(match.match_date, userTimezoneOffset);
      const realDate = toRealUtcDate(match.match_date);

      const now = new Date();
      diff = realDate.getTime() - now.getTime();
      const diffMinutes = diff / (1000 * 60);

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        countdown = `${days}d ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        if (diffMinutes <= 15) isCloseToStart = true;
      } else {
        countdown = "0d 00:00";
      }

      matchDate = formatLocalDate(localDate, "es-ES", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).replace(".", "");

      if (match.status !== "live" && match.status !== "finished") {
        isLocked = !canPredict(match.match_date);
      } else {
        isLocked = true;
      }

    } catch (e) {
      matchDate = "Por confirmar";
    }
  }

  if (match.status === "finished" || match.status === "live") {
    isLocked = true;
  }

  if (match._lockedByTime) {
    isLocked = true;
  }

  const statusMap = {
    scheduled: "Próximamente",
    live: "EN VIVO",
    finished: "Finalizado"
  };

  let statusText;
  if (match.status === "finished") {
    statusText = "Finalizado";
  } else if (match.status === "live") {
    statusText = "EN VIVO";
  } else if (isCloseToStart) {
    statusText = "Por comenzar";
  } else {
    statusText = "Próximamente";
  }
  const pointsEarned = match.points_earned;
  const hasPrediction = match.home_predictions !== null && match.home_predictions !== undefined;
  const showPoints = match.status === "finished" && hasPrediction && pointsEarned !== null && pointsEarned !== undefined;

  let rightBadge = "";
  if (showPoints) {
    rightBadge = `<span class="points-earned ${pointsEarned === 0 ? 'zero' : ''}">+${pointsEarned} pt${pointsEarned !== 1 ? 'os' : ''}</span>`;
  } else if (match.status === "finished" && !hasPrediction) {
    rightBadge = `<span class="points-earned miss">Sin predecir</span>`;
  }

  if (isMobile) {

    return `
    <div class="match-card" data-match-id="${match.id}">

      <div class="match-header">
        <div class="match-header-left">
          <span class="tag">${group}</span>
          <span class="time">${matchDate}</span>
        </div>

        <div class="match-header-right">
          ${(match.status === "live" || match.status === "finished" || diff <= 0) &&
        match.home_score !== null &&
        match.away_score !== null
        ? `<span class="live-score">${match.home_score} - ${match.away_score}</span>`
        : `<span>${countdown}</span>`
      }
        </div>
      </div>

      <div class="mobile-prediction-row">

        <div class="mobile-team">
          <div class="flag-rounded">
            <img class="flag" src="${homeFlag}" alt="flag">
          </div>
          <span>${homeTeam}</span>
        </div>

        <div class="score-control">
          <button type="button" class="score-btn minus" ${isLocked ? "disabled" : ""}>−</button>
          <input class="score-input" type="number" min="0" data-team="home" ${isLocked ? "disabled" : ""}>
          <button type="button" class="score-btn plus" ${isLocked ? "disabled" : ""}>+</button>
        </div>

      </div>

      <div class="mobile-prediction-row">

        <div class="mobile-team">
          <div class="flag-rounded">
            <img class="flag" src="${awayFlag}" alt="flag">
          </div>
          <span>${awayTeam}</span>
        </div>

        <div class="score-control">
          <button type="button" class="score-btn minus" ${isLocked ? "disabled" : ""}>−</button>
          <input class="score-input" type="number" min="0" data-team="away" ${isLocked ? "disabled" : ""}>
          <button type="button" class="score-btn plus" ${isLocked ? "disabled" : ""}>+</button>
        </div>

      </div>

      <div class="match-status">
        <span class="status-left">
          <span class="text">Estado:</span>
          <span class="status-text">${statusText}</span>
        </span>
        ${rightBadge}
      </div>

    </div>
  `;
  }

  return `
    <div class="match-card" data-match-id="${match.id}">
      <div class="match-header">
        <div class="match-header-left">
          <span class="tag">${group}</span>
          <span class="time">${matchDate}</span>
        </div>

        <div class="match-header-right">
          ${(match.status === "live" || match.status === "finished" || diff <= 0) && match.home_score !== null && match.away_score !== null
      ? `<span class="live-score">${match.home_score} - ${match.away_score}</span>`
      : `<span>${countdown}</span>`
    }
        </div>
      </div>

      <div class="match-body">

        <div class="team">
          <span>${homeTeam}</span>
          <div class="flag-rounded">
            <img class="flag" src="${homeFlag}" alt="flag">
          </div>
        </div>

        <div class="score">
          <div class="score-control">
            <button type="button" class="score-btn minus" ${isLocked ? 'disabled' : ''}>−</button>
            <input class="score-input" type="number" min="0" inputmode="numeric" placeholder="—" data-team="home" ${isLocked ? 'disabled' : ''}>
            <button type="button" class="score-btn plus" ${isLocked ? 'disabled' : ''}>+</button>
          </div>

          <span>vs</span>

          <div class="score-control">
            <button type="button" class="score-btn minus" ${isLocked ? 'disabled' : ''}>−</button>
            <input class="score-input" type="number" min="0" inputmode="numeric" placeholder="—" data-team="away" ${isLocked ? 'disabled' : ''}>
            <button type="button" class="score-btn plus" ${isLocked ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <div class="team">
          <span>${awayTeam}</span>
          <div class="flag-rounded">
            <img class="flag" src="${awayFlag}" alt="flag">
          </div>
        </div>

      </div>

      <div class="match-status">
        <span class="status-left">
          <span class="text">Estado: </span>
          <span class="status-text">${statusText}</span>
        </span>
        ${rightBadge}
      </div>
    </div>
  `;
}

function initAccordions() {
  document.querySelectorAll(".matches-group-header").forEach((btn) => {

    const group = btn.parentElement;

    btn.addEventListener("click", () => {

      const isOpen = group.classList.contains("open");

      if (isOpen) {

        group.classList.remove("open");

        group.classList.add("closing");

        setTimeout(() => {
          group.classList.remove("closing");
        }, 900);

      } else {

        group.classList.add("open");

      }

    });

  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function updateStats(matches, savedPredictions, userId) {
  const predictionsEl = document.getElementById("stat-predictions");
  const exactEl = document.getElementById("stat-exact");
  const positionEl = document.getElementById("stat-position");

  if (!predictionsEl || !exactEl || !positionEl) return;

  const totalMatches = matches.length;
  const completedPredictions = savedPredictions ? savedPredictions.length : 0;

  predictionsEl.textContent = `${completedPredictions} / ${totalMatches}`;

  const exactCount = savedPredictions ? savedPredictions.filter(p => p.is_exact === true).length : 0;
  exactEl.textContent = exactCount;

  if (userId) {
    getUserRank(userId).then(({ rank }) => {
      positionEl.textContent = rank ? `#${rank}` : "#--";
    });
  }
}

function getPredictedCount(matches) {
  let completed = 0;
  matches.forEach(match => {
    if (hasPrediction(match)) {
      completed++;
    }
  });
  return completed;
}

function hasPrediction(match) {
  return (
    match &&
    match.home_predictions !== null &&
    match.home_predictions !== undefined &&
    match.home_predictions !== "" &&
    match.away_predictions !== null &&
    match.away_predictions !== undefined &&
    match.away_predictions !== ""
  );
}

function updateAccordionProgress(savedCard, allMatches) {
  const group = savedCard.closest(".matches-group");
  if (!group) return;

  const dayMatches = group.querySelectorAll(".match-card");
  let completed = 0;

  dayMatches.forEach(card => {
    const matchId = card.dataset.matchId;
    const match = allMatches.find(m => m.id === matchId);
    if (hasPrediction(match)) {
      completed++;
    }
  });

  const totalMatches = dayMatches.length;
  const countEl = group.querySelector(".count");
  if (countEl) {
    countEl.textContent = `${completed}/${totalMatches}`;
  }
}

function getGroupPoints(dayMatches, predictions) {
  let points = 0;
  dayMatches.forEach(match => {
    if (match.status === "finished") {
      const pred = predictions.find(p => p.match_id == match.id);
      if (pred && pred.points_earned !== null && pred.points_earned !== undefined) {
        points += pred.points_earned;
      }
    }
  });
  return points;
}

function isGroupFinished(dayMatches) {
  return dayMatches.every(match => match.status === "finished");
}

function splitGroupsByStatus(grouped) {
  const active = [];
  const finished = [];

  Object.entries(grouped).forEach(([dayLabel, dayMatches]) => {
    if (isGroupFinished(dayMatches)) {
      finished.push([dayLabel, dayMatches]);
    } else {
      active.push([dayLabel, dayMatches]);
    }
  });

  return { active, finished };
}

function renderTabs(activeCount, finishedCount) {
  return `
    <div class="predictions-tabs">
      <button class="tab-btn active" data-tab="active">
        Fechas Activas
        ${activeCount > 0 ? `<span class="tab-count">${activeCount}</span>` : ""}
      </button>
      <button class="tab-btn" data-tab="finished">
        Fechas Finalizadas
        ${finishedCount > 0 ? `<span class="tab-count finished">${finishedCount}</span>` : ""}
      </button>
    </div>
  `;
}

function renderMatches(matches, predictions = []) {
  const container = document.querySelector(".card-order");
  const tabsContainer = document.getElementById("predictionsTabsContainer");
  const phaseTabsContainer = document.getElementById("phaseTabsContainer");
  if (!container) return;

  matchesGlobal = matches;

  const grouped = groupMatchesByDay(matches);
  const { active, finished } = splitGroupsByStatus(grouped);

  if (tabsContainer) {
    tabsContainer.innerHTML = renderTabs(active.length, finished.length);
    initTabs(active, finished, predictions, phaseTabsContainer);
  }

  renderGroupList(active, predictions, container);
}

function initTabs(active, finished, predictions, phaseTabsContainer) {
  const tabsContainer = document.getElementById("predictionsTabsContainer");
  if (!tabsContainer) return;

  let phaseTabsInitialized = false;

  function updatePhaseTabs(groups) {
    const uniquePhases = [...new Set(groups.map(([_, matches]) => matches[0]?.phase?.name).filter(Boolean))];

    const findPhaseId = (phaseName) => {
      for (const [_, matches] of groups) {
        const match = matches.find(m => m.phase?.name === phaseName)
        if (match) return match.phase?.id || match.phase_id || null
      }
      return null
    }

    if (uniquePhases.length > 0) {
      currentPhaseName = uniquePhases[0];
      currentPhaseId = findPhaseId(uniquePhases[0]);
    }

    if (phaseTabsContainer && uniquePhases.length > 1) {
      phaseTabsContainer.innerHTML = renderPhaseTabs(uniquePhases);
      initPhaseTabs(uniquePhases, groups, predictions, phaseTabsContainer, findPhaseId);
      phaseTabsContainer.style.display = "block";
    } else if (phaseTabsContainer) {
      phaseTabsContainer.innerHTML = "";
      phaseTabsContainer.style.display = "none";
    }
  }

  updatePhaseTabs(active);

  tabsContainer.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".tab-btn");
    if (!tabBtn) return;

    const tab = tabBtn.dataset.tab;

    tabsContainer.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    tabBtn.classList.add("active");

    function restoreInputValues(predictions) {
      predictions.forEach(p => {
        const card = document.querySelector(`.match-card[data-match-id="${p.match_id}"]`)
        if (!card) return
        const homeInput = card.querySelector('[data-team="home"]')
        const awayInput = card.querySelector('[data-team="away"]')
        if (homeInput) homeInput.value = p.home_predictions ?? ""
        if (awayInput) awayInput.value = p.away_predictions ?? ""
      });
    }

    const container = document.querySelector(".card-order");
    if (tab === "active") {
      updatePhaseTabs(active);
      renderGroupList(active, predictions, container);
      restoreInputValues(predictions);
    } else {
      updatePhaseTabs(finished);
      renderGroupList(finished, predictions, container);
      restoreInputValues(predictions);
    }
  });

  function initPhaseTabs(phases, groups, predictions, phaseTabsContainer, findPhaseId) {
    if (!phaseTabsContainer || phaseTabsInitialized) return;
    phaseTabsInitialized = true;

    const updateCurrentPhase = (phaseName) => {
      currentPhaseName = phaseName
      currentPhaseId = findPhaseId(phaseName)
    }

    if (phases.length > 0) {
      updateCurrentPhase(phases[0])
    }

    phaseTabsContainer.addEventListener("click", (e) => {
      const tabBtn = e.target.closest(".phase-tab-btn");
      if (!tabBtn) return;

      const selectedPhase = tabBtn.dataset.phase;
      updateCurrentPhase(selectedPhase)

      phaseTabsContainer.querySelectorAll(".phase-tab-btn").forEach(b => b.classList.remove("active"));
      tabBtn.classList.add("active");

      const filtered = groups.filter(([_, matches]) => matches[0]?.phase?.name === selectedPhase);
      const container = document.querySelector(".card-order");
      renderGroupList(filtered, predictions, container);
    });
  }
}

function renderPhaseTabs(phases) {
  return `
    <div class="phase-tabs">
      ${phases.map((phase, i) => `
        <button class="phase-tab-btn ${i === 0 ? 'active' : ''}" data-phase="${phase}">
          ${phase}
        </button>
      `).join("")}
    </div>
  `;
}

function renderGroupList(groups, predictions, container) {
  if (groups.length === 0) {
    container.innerHTML = `<p class="no-matches">No hay fechas en esta sección.</p>`;
    return;
  }

  const grouped = groupMatchesByDay(matchesGlobal);
  const allKeys = Object.keys(grouped);

  container.innerHTML = groups.map(([dayLabel, dayMatches]) => {
    const originalIndex = allKeys.indexOf(dayLabel);
    const phaseNumber = originalIndex + 1;

    const predictedCount = getPredictedCount(dayMatches);
    const totalMatches = dayMatches.length;
    const groupPoints = getGroupPoints(dayMatches, predictions);
    const phaseName = dayMatches[0]?.phase?.name || "";
    const journeyLabel = phaseName ? `Fecha ${phaseNumber} - ${phaseName}` : `Fecha ${phaseNumber}`;

    return `
      <div class="matches-group">

        <button class="matches-group-header">

  <div class="accordion-info">
    <span class="journey">
      ${journeyLabel}
    </span>

    <span class="date-label">
      ${capitalize(dayLabel)}
    </span>
  </div>

  <div class="accordion-right">

    <div class="accordion-right-content">

      ${groupPoints > 0 ? `<span class="group-points">+${groupPoints} pts</span>` : ""}

      <div class="accordion-progress">

        <span class="count">
          ${predictedCount}/${totalMatches}
        </span>

        <span class="progress-label">
          pronosticados
        </span>

      </div>

    </div>

    <svg class="accordion-arrow" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

  </div>

</button>

        <div class="matches-group-content">
          ${dayMatches.map(match => renderMatchCard(match)).join("")}
        </div>

      </div>
    `;
  }).join("");

  initAccordions();
}

document.addEventListener("DOMContentLoaded", async () => {

  const authResult = await requireAuth("/login.html")

  renderSkeletons()

  // Verificar si el bracket es visible
  const isBracketVisible = await getSetting("bracket_visible")
  const bracketVisible = isBracketVisible === "true"

  let matches = await getMatches()
  
  // Si el bracket no es visible, filtrar partidos de fases eliminatorias
  if (!bracketVisible) {
    matches = matches.filter(match => !match.phase_id)
  }
  
  matchesGlobal = matches;

  if (matches && matches.length > 0) {

    if (!authResult) {
      renderMatches(matches, []);
      return
    }

    const { user } = authResult

    const { data: profile } = await getProfile(user.id)
    if (profile?.country_code) {
      userTimezoneOffset = getTimezoneOffset(profile.country_code)
    }

    savedPredictions = await getPredictions(user.id)

    matches.forEach(match => {

      const prediction = savedPredictions.find(
        p => p.match_id == match.id
      );

      if (prediction) {
        match.home_predictions = prediction.home_predictions;
        match.away_predictions = prediction.away_predictions;
        match.points_earned = prediction.points_earned;
      }

    });

    renderMatches(matches, savedPredictions);

    if (savedPredictions && savedPredictions.length > 0) {
      savedPredictions.forEach(p => {
        const card = document.querySelector(`.match-card[data-match-id="${p.match_id}"]`)
        if (!card) return
        const homeInput = card.querySelector('[data-team="home"]')
        const awayInput = card.querySelector('[data-team="away"]')
        if (homeInput) homeInput.value = p.home_predictions ?? ""
        if (awayInput) awayInput.value = p.away_predictions ?? ""
      })

      document.querySelectorAll(".matches-group").forEach(group => {
        const dayMatches = group.querySelectorAll(".match-card")
        let completed = 0
        dayMatches.forEach(card => {
          const matchId = card.dataset.matchId
          const match = matches.find(m => m.id == matchId)
          if (hasPrediction(match)) {
            completed++
          }
        })
        const countEl = group.querySelector(".count")
        const totalMatches = dayMatches.length
        if (countEl) countEl.textContent = `${completed}/${totalMatches}`
      })
    }

    updateStats(matches, savedPredictions, user.id)
    updateProgress(matches, savedPredictions || [])

    function attachInputListeners() {
      document.querySelectorAll(".match-card").forEach(card => {
        const inputs = card.querySelectorAll(".score-input")
        let timeout

        inputs.forEach(input => {
          input.addEventListener("input", () => {
            clearTimeout(timeout)
            timeout = setTimeout(async () => {
              const matchId = card.dataset.matchId
              const homeScore = card.querySelector('[data-team="home"]').value || 0
              const awayScore = card.querySelector('[data-team="away"]').value || 0
              const homeScoreVal = parseInt(homeScore) || 0
              const awayScoreVal = parseInt(awayScore) || 0

              await savePrediction(user.id, matchId, homeScoreVal, awayScoreVal)

              const match = matches.find(m => m.id == matchId)
              if (match) {
                match.home_predictions = homeScoreVal
                match.away_predictions = awayScoreVal
              }

              updateAccordionProgress(card, matches)
              updateStats(matches, savedPredictions, user.id)

              const updatedPredictions = await getPredictions(user.id)
              checkAndCelebrateCompletion(matches, updatedPredictions, currentPhaseName, currentPhaseId)
            }, 800)
          })
        })
      })
    }

    attachInputListeners()

    initScoreControls()
    initMatchCards()

    updateStats(matches, savedPredictions, user.id)
    updateProgress(matches, savedPredictions || [])

    const channel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedMatch = payload.new;
            const matchIndex = matches.findIndex(m => m.id === updatedMatch.id);
            if (matchIndex !== -1) {
              Object.assign(matches[matchIndex], updatedMatch);
            } else {
              matches.push(updatedMatch);
            }
            matchesGlobal = matches;
            renderMatches(matches, savedPredictions);
            savedPredictions.forEach(p => {
              const card = document.querySelector(`.match-card[data-match-id="${p.match_id}"]`)
              if (!card) return
              const homeInput = card.querySelector('[data-team="home"]')
              const awayInput = card.querySelector('[data-team="away"]')
              if (homeInput) homeInput.value = p.home_predictions ?? ""
              if (awayInput) awayInput.value = p.away_predictions ?? ""
            });
            initScoreControls();
            attachInputListeners();
            updateStats(matches, savedPredictions, user.id);
          }
        }
      )
      .subscribe();

    setInterval(() => {
      let needsRerender = false;

      document.querySelectorAll(".match-card").forEach(card => {
        const matchId = card.dataset.matchId;
        const match = matches.find(m => m.id === matchId);

        if (!match || !match.match_date) return;

        const realDate = toRealUtcDate(match.match_date);
        const now = new Date();
        const diff = realDate.getTime() - now.getTime();
        const diffMinutes = diff / (1000 * 60);

        const countdownEl = card.querySelector(".match-header-right span");
        if (countdownEl) {
          if (match.status === "live" || match.status === "finished" || diff <= 0) {
            countdownEl.textContent = `${match.home_score ?? 0} - ${match.away_score ?? 0}`;
            countdownEl.classList.add("live-score");
          } else if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            countdownEl.textContent = `${days}d ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
            countdownEl.classList.remove("live-score");
          } else {
            countdownEl.textContent = "0d 00:00";
            countdownEl.classList.remove("live-score");
          }
        }

        const statusEl = card.querySelector(".status-text");
        if (statusEl) {
          if (diff <= 0 && match.status !== "finished") {
            statusEl.textContent = "En vivo";
          } else if (diffMinutes <= 15 && match.status !== "finished") {
            statusEl.textContent = "Por comenzar";
          }
        }

        if (match.status !== "finished" && match.status !== "live" && diffMinutes <= 15 && diffMinutes > 0) {
          if (!match._lockedByTime) {
            match._lockedByTime = true;
            needsRerender = true;
          }
          const inputs = card.querySelectorAll(".score-input");
          const buttons = card.querySelectorAll(".score-btn");
          inputs.forEach(input => input.disabled = true);
          buttons.forEach(btn => btn.disabled = true);
        }
      });

      if (needsRerender) {
        renderMatches(matches, savedPredictions);
        savedPredictions.forEach(p => {
          const card = document.querySelector(`.match-card[data-match-id="${p.match_id}"]`)
          if (!card) return
          const homeInput = card.querySelector('[data-team="home"]')
          const awayInput = card.querySelector('[data-team="away"]')
          if (homeInput) homeInput.value = p.home_predictions ?? ""
          if (awayInput) awayInput.value = p.away_predictions ?? ""
        });
        initScoreControls();
        attachInputListeners();
      }
    }, 60000);
  }

  if (!matches || matches.length === 0) return

})