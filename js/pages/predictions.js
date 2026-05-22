import { getUserRank } from "/js/services/ranking.js";
import { loadNavbar } from "/js/components/navbar.js";
import { updateProgress } from "/js/utils/progress.js";
import { initScoreControls } from "/js/components/scoreControl.js";
import { initMatchCards } from "/js/components/matchCard.js";
import { getMatches } from "/js/services/matches.js"
import { supabase } from "/config/supabase.js"
import { savePrediction, getPredictions } from "/js/services/predictions.js"

function renderSkeletons() {
  const container = document.querySelector(".card-order");
  if (!container) return;

  container.innerHTML = Array.from({ length: 3 }).map(() => `
    <div class="match-card empty-state">
      <div class="match-header">
        <div class="match-header-left">
          <span class="tag">Cargando...</span>
          <span class="time">--</span>
        </div>
        <div class="match-header-right">
          <span>--:--</span>
        </div>
      </div>

      <div class="match-body">
        <div class="team">
          <span>Equipo local</span>
          <div class="placeholder-flag"></div>
        </div>

        <div class="score">
          <span>vs</span>
        </div>

        <div class="team">
          <span>Equipo visitante</span>
          <div class="placeholder-flag"></div>
        </div>
      </div>
    </div>
  `).join("");
}

function groupMatchesByDay(matches) {
  return matches.reduce((groups, match) => {
    const date = new Date(match.match_date);

    const key = date.toLocaleDateString("es-ES", {
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
    const matchTime = new Date(matchDate).getTime();
    const now = new Date().getTime();
    const diffMinutes = (matchTime - now) / (1000 * 60);
    return diffMinutes > 15;
}

function renderMatchCard(match) {
  const homeTeam = match.home_team?.name || "Equipo Local";
  const awayTeam = match.away_team?.name || "Equipo Visitante";
  const homeFlag = match.home_team?.flag_url || "/assets/images/flag-mexV2.svg";
  const awayFlag = match.away_team?.flag_url || "/assets/images/flag-mexV2.svg";
  const group = match.group?.name ? `Grupo ${match.group.name}` : "Grupo";

  let matchDate = "Por confirmar";
  let countdown = "";
  let isLocked = false;

  if (match.match_date) {
    try {
      const date = new Date(match.match_date);
      const argentinaDate = new Date(date.getTime() + 3 * 60 * 60 * 1000);

      const now = new Date();
      const diff = argentinaDate.getTime() - now.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        countdown = `${days}d ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      } else {
        countdown = "En vivo";
      }

      matchDate = argentinaDate.toLocaleString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).replace(".", "");

      isLocked = !canPredict(match.match_date);

    } catch (e) {
      matchDate = "Por confirmar";
    }
  }

  if (match.status === "finished") {
    isLocked = true;
  }

  const statusMap = {
    scheduled: "Próximamente",
    live: "EN VIVO",
    finished: "Finalizado"
  };

  const statusText = statusMap[match.status] || "Sin registrar";
  const pointsEarned = match.points_earned;
  const hasPrediction = match.home_predictions !== null && match.home_predictions !== undefined;
  const showPoints = match.status === "finished" && pointsEarned !== undefined && pointsEarned !== null;

  let rightBadge = "";
  if (showPoints) {
    rightBadge = `<span class="points-earned">+${pointsEarned} pt${pointsEarned !== 1 ? 'os' : ''}</span>`;
  } else if (match.status === "finished" && !hasPrediction) {
    rightBadge = `<span class="points-earned miss">Sin predecir</span>`;
  }

  return `
    <div class="match-card" data-match-id="${match.id}">
      <div class="match-header">
        <div class="match-header-left">
          <span class="tag">${group}</span>
          <span class="time">${matchDate}</span>
        </div>

        <div class="match-header-right">
          <span>${countdown}</span>
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
            <input class="score-input" type="number" min="0" inputmode="numeric" placeholder="0" data-team="home" ${isLocked ? 'disabled' : ''}>
            <button type="button" class="score-btn plus" ${isLocked ? 'disabled' : ''}>+</button>
          </div>

          <span>vs</span>

          <div class="score-control">
            <button type="button" class="score-btn minus" ${isLocked ? 'disabled' : ''}>−</button>
            <input class="score-input" type="number" min="0" inputmode="numeric" placeholder="0" data-team="away" ${isLocked ? 'disabled' : ''}>
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

// function initAccordions() {
//   const headers = document.querySelectorAll(".matches-group-header");

//   headers.forEach((btn, index) => {
//     btn.addEventListener("click", () => {
//       btn.parentElement.classList.toggle("open");
//     });

//     // abre el primero por defecto (o “hoy”)
//     if (index === 0) {
//       btn.parentElement.classList.add("open");
//     }
//   });
// }

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

function renderMatches(matches, predictions = []) {
  const container = document.querySelector(".card-order");
  if (!container) return;

  const grouped = groupMatchesByDay(matches);

  container.innerHTML = Object.entries(grouped).map(([dayLabel, dayMatches], index) => {

    const predictedCount = getPredictedCount(dayMatches);
    const totalMatches = dayMatches.length;
    const groupPoints = getGroupPoints(dayMatches, predictions);
    const phaseName = dayMatches[0]?.phase?.name || "";
    const journeyLabel = phaseName ? `Fecha ${index + 1} - ${phaseName}` : `Fecha ${index + 1}`;

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

    <div class="accordion-progress">

      <span class="count">
        ${predictedCount}/${totalMatches}
      </span>

      <span class="progress-label">
        pronunciados
      </span>

    </div>

    ${groupPoints > 0 ? `<span class="group-points">+${groupPoints} pts</span>` : ""}

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

  await loadNavbar()

  renderSkeletons()

  const matches = await getMatches()

  if (matches && matches.length > 0) {

    renderMatches(matches)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const savedPredictions = await getPredictions(user.id)

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

    document.querySelectorAll(".match-card").forEach(card => {

      const inputs = card.querySelectorAll(".score-input")

      let timeout

      inputs.forEach(input => {

        input.addEventListener("input", () => {

          clearTimeout(timeout)

          timeout = setTimeout(async () => {

            const matchId = card.dataset.matchId

            const homeScore =
              card.querySelector('[data-team="home"]').value || 0

            const awayScore =
              card.querySelector('[data-team="away"]').value || 0

            const homeScoreVal = parseInt(homeScore) || 0
            const awayScoreVal = parseInt(awayScore) || 0

            await savePrediction(
              user.id,
              matchId,
              homeScoreVal,
              awayScoreVal
            )

            const match = matches.find(m => m.id == matchId)
            if (match) {
              match.home_predictions = homeScoreVal
              match.away_predictions = awayScoreVal
            }

            updateAccordionProgress(card, matches)
updateStats(matches, savedPredictions, user.id)

          }, 800)

        })

      })

    })

  }



  initScoreControls()
  initMatchCards()
  updateProgress()

  if (!matches || matches.length === 0) return

  setInterval(() => {
    document.querySelectorAll(".match-card").forEach(card => {
      const matchId = card.dataset.matchId;
      const match = matches.find(m => m.id === matchId);

      if (!match || !match.match_date) return;

      const date = new Date(match.match_date);
      const argentinaDate = new Date(date.getTime() + 3 * 60 * 60 * 1000);
      const now = new Date();
      const diff = argentinaDate.getTime() - now.getTime();

      const countdownEl = card.querySelector(".match-header-right span");
      if (countdownEl) {
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          countdownEl.textContent = `${days}d ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        } else {
          countdownEl.textContent = "En vivo";
        }
      }
    });
  }, 60000);

})