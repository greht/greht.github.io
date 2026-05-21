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

function renderMatches(matches) {
  const container = document.querySelector(".card-order");
  if (!container) return;

  container.innerHTML = matches.map(match => {
    const homeTeam = match.home_team?.name || "Equipo Local";
    const awayTeam = match.away_team?.name || "Equipo Visitante";
    const homeFlag = match.home_team?.flag_url || "/assets/images/flag-mexV2.svg";
    const awayFlag = match.away_team?.flag_url || "/assets/images/flag-mexV2.svg";
    const group = match.group?.name ? `Grupo ${match.group.name}` : "Grupo";
    let matchDate = "Por confirmar";
    let countdown = "";

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

        const options = {
          weekday: "long",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        };
        matchDate = argentinaDate.toLocaleString("es-ES", options).replace(".", "");
      } catch (e) {
        matchDate = "Por confirmar";
      }
    }

    const statusMap = {
      scheduled: "Próximamente",
      live: "EN VIVO",
      finished: "Finalizado"
    };
    const statusText = statusMap[match.status] || "Sin registrar";

    return `
      <div class="match-card" data-match-id="${match.id}">
        <div class="match-header">
          <div class="match-header-left">
            <span class="tag">${group}</span>
            <span class="time">${matchDate}</span>
          </div>
          <div class="match-header-right">
            <svg class="stat-card-icon4">
              <use href="assets/icons/icons.svg#icon-time"></use>
            </svg>
            <span>${countdown}</span>
          </div>
        </div>
        <div class="match-body">
          <div class="team">
            <span>${homeTeam}</span>
            <div class="flag-rounded" >
              <img class="flag" src="${homeFlag}" alt="flag">
            </div>
          </div>
          <div class="score">
            <div class="score-control">
              <button type="button" class="score-btn minus">−</button>
              <input class="score-input" type="number" min="0" inputmode="numeric" placeholder="0" data-team="home">
              <button type="button" class="score-btn plus">+</button>
            </div>
            <span>vs</span>
            <div class="score-control">
              <button type="button" class="score-btn minus">−</button>
              <input class="score-input" type="number" min="0" inputmode="numeric" placeholder="0" data-team="away">
              <button type="button" class="score-btn plus">+</button>
            </div>
          </div>
          <div class="team">
            <span>${awayTeam}</span>
            <div class="flag-rounded" >
              <img class="flag" src="${awayFlag}" alt="flag">
            </div>
          </div>
        </div>
        <div class="match-status">
          <span class="text">Estado: </span> 
          <span class="status-text">${statusText}</span>
        </div>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {

  await loadNavbar()

  renderSkeletons()

  const matches = await getMatches()
  console.log("MATCHES:", matches)

  if (matches && matches.length > 0) {

    renderMatches(matches)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log("Usuario no autenticado")
      return
    }

    const savedPredictions = await getPredictions(user.id)
    if (savedPredictions && savedPredictions.length > 0) {
      savedPredictions.forEach(p => {
        const card = document.querySelector(`.match-card[data-match-id="${p.match_id}"]`)
        if (!card) return
        const homeInput = card.querySelector('[data-team="home"]')
        const awayInput = card.querySelector('[data-team="away"]')
        if (homeInput) homeInput.value = p.home_predictions ?? ""
        if (awayInput) awayInput.value = p.away_predictions ?? ""
      })
    }

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

            console.log("💾 Guardando...")

            await savePrediction(
              user.id,
              matchId,
              parseInt(homeScore) || 0,
              parseInt(awayScore) || 0
            )

            console.log("✅ Guardado")

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