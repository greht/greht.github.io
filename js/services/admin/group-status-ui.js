import { supabase } from "/config/supabase.js";
import { checkAdmin } from "/config/admin.js";
import { renderFlag } from "/js/utils/flagUrl.js";
import {
  getTeamsWithStatus,
  markTeamEliminated,
  markTeamQualified,
  resetTeamStatus,
  suggestEliminationsForAllGroups,
  applyBulkSuggestions,
  TEAM_STATUS,
} from "/js/services/teamStatus.js";

let currentTeams = [];
let currentGroups = [];
let currentSuggestions = [];
let hasLoaded = false;

export async function loadGroupStatusSection() {
  const user = await checkAdmin();
  if (!user) {
    alert("No tienes permisos para acceder a esta sección");
    return;
  }

  const container = document.getElementById("group-status-section");
  if (!container) return;

  container.innerHTML = `
    <div class="group-status-container">
      <div class="group-status-header">
        <div>
          <h3>Estados de equipos</h3>
          <p>Marca manualmente los equipos eliminados o ya clasificados. El sistema también puede sugerirte eliminaciones matemáticas.</p>
        </div>
        <div class="group-status-actions">
          <button id="suggest-eliminations-btn" class="btn-secondary">
            ⚠ Sugerir eliminaciones
          </button>
          <button id="apply-suggestions-btn" class="btn-primary" disabled>
            ✓ Aplicar sugerencias (<span id="suggestion-count">0</span>)
          </button>
          <button id="reload-group-status-btn" class="btn-secondary">
            ↻ Recargar
          </button>
        </div>
      </div>

      <div id="suggestions-banner" class="suggestions-banner hidden"></div>
      <div id="group-status-grid" class="group-status-grid">
        <p class="empty-state">Cargando equipos...</p>
      </div>
    </div>
  `;

  document
    .getElementById("suggest-eliminations-btn")
    .addEventListener("click", handleSuggestEliminations);
  document
    .getElementById("apply-suggestions-btn")
    .addEventListener("click", handleApplySuggestions);
  document
    .getElementById("reload-group-status-btn")
    .addEventListener("click", loadData);

  await loadData();
  hasLoaded = true;
}

async function loadData() {
  const [teams, groupsRes] = await Promise.all([
    getTeamsWithStatus(),
    supabase.from("groups").select("id, name").order("name"),
  ]);

  currentTeams = teams;
  currentGroups = groupsRes.data || [];
  currentSuggestions = [];

  document.getElementById("suggestion-count").textContent = "0";
  const applyBtn = document.getElementById("apply-suggestions-btn");
  if (applyBtn) applyBtn.disabled = true;
  const banner = document.getElementById("suggestions-banner");
  if (banner) banner.classList.add("hidden");

  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("group-status-grid");
  if (!grid) return;

  if (currentTeams.length === 0) {
    grid.innerHTML = `<p class="empty-state">No hay equipos cargados.</p>`;
    return;
  }

  const teamsByGroup = currentTeams.reduce((acc, t) => {
    const key = t.group_id || "__no_group__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const groupsSorted = [...currentGroups].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  let html = "";
  for (const g of groupsSorted) {
    const teams = teamsByGroup[g.id] || [];
    if (teams.length === 0) continue;
    html += renderGroupStatusCard(g, teams);
  }

  const noGroupTeams = teamsByGroup["__no_group__"] || [];
  if (noGroupTeams.length > 0) {
    html += renderGroupStatusCard(
      { id: "__no_group__", name: "Sin grupo" },
      noGroupTeams,
    );
  }

  grid.innerHTML = html || `<p class="empty-state">No hay equipos con grupo asignado.</p>`;
  initStatusButtons();
}

function renderGroupStatusCard(group, teams) {
  const sorted = teams.sort((a, b) => a.name.localeCompare(b.name));
  const stats = {
    active: teams.filter((t) => !t.is_eliminated && !t.is_qualified).length,
    qualified: teams.filter((t) => t.is_qualified).length,
    eliminated: teams.filter((t) => t.is_eliminated).length,
  };

  return `
    <div class="group-status-card">
      <div class="group-status-card-header">
        <span class="group-status-badge">GRUPO ${group.name}</span>
        <div class="group-status-stats">
          <span class="status-pill status-pill-active" title="Activos">● ${stats.active}</span>
          <span class="status-pill status-pill-qualified" title="Clasificados">✓ ${stats.qualified}</span>
          <span class="status-pill status-pill-eliminated" title="Eliminados">✕ ${stats.eliminated}</span>
        </div>
      </div>
      <div class="group-status-list">
        ${sorted
          .map((team) => renderTeamStatusRow(team, group))
          .join("")}
      </div>
    </div>
  `;
}

function renderTeamStatusRow(team, group) {
  const isSuggested = currentSuggestions.some((s) => s.teamId === team.id);
  const status = team.is_eliminated
    ? "eliminated"
    : team.is_qualified
    ? "qualified"
    : "active";

  return `
    <div class="team-status-row status-${status}" data-team-id="${team.id}">
      <div class="team-status-info">
        <span class="team-status-position">${team.fifa_code || "—"}</span>
        ${renderFlag(team, "team-status-flag", team.name)}
        <span class="team-status-name">${team.name}</span>
        ${isSuggested ? `<span class="suggestion-badge" title="Sugerido por el sistema">⚠ Sugerido</span>` : ""}
      </div>
      <div class="team-status-actions">
        <button
          class="status-action-btn ${status === "active" ? "active" : ""}"
          data-action="active"
          data-team-id="${team.id}"
          title="Marcar como activo"
        >
          ● Activo
        </button>
        <button
          class="status-action-btn status-action-qualified ${status === "qualified" ? "active" : ""}"
          data-action="qualified"
          data-team-id="${team.id}"
          title="Marcar como clasificado"
        >
          ✓ Clasificado
        </button>
        <button
          class="status-action-btn status-action-eliminated ${status === "eliminated" ? "active" : ""}"
          data-action="eliminated"
          data-team-id="${team.id}"
          title="Marcar como eliminado"
        >
          ✕ Eliminado
        </button>
      </div>
    </div>
  `;
}

function initStatusButtons() {
  document.querySelectorAll(".status-action-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const teamId = btn.dataset.teamId;
      const action = btn.dataset.action;
      const team = currentTeams.find((t) => t.id === teamId);
      if (!team) return;

      btn.disabled = true;
      try {
        if (action === "active") {
          await resetTeamStatus(teamId);
          team.is_eliminated = false;
          team.is_qualified = false;
        } else if (action === "qualified") {
          const res = await markTeamQualified(teamId, true);
          if (!res.ok) {
            alert("Error: " + res.error);
            return;
          }
          team.is_qualified = true;
          team.is_eliminated = false;
        } else if (action === "eliminated") {
          const res = await markTeamEliminated(teamId, true);
          if (!res.ok) {
            alert("Error: " + res.error);
            return;
          }
          team.is_eliminated = true;
          team.is_qualified = false;
        }
        currentSuggestions = currentSuggestions.filter(
          (s) => s.teamId !== teamId,
        );
        document.getElementById("suggestion-count").textContent =
          currentSuggestions.length;
        if (currentSuggestions.length === 0) {
          const applyBtn = document.getElementById("apply-suggestions-btn");
          if (applyBtn) applyBtn.disabled = true;
        }
        renderGrid();
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function handleSuggestEliminations() {
  const btn = document.getElementById("suggest-eliminations-btn");
  btn.disabled = true;
  btn.textContent = "⏳ Analizando...";

  try {
    currentSuggestions = await suggestEliminationsForAllGroups(2);
    renderSuggestionsBanner();
    renderGrid();

    const applyBtn = document.getElementById("apply-suggestions-btn");
    if (applyBtn) applyBtn.disabled = currentSuggestions.length === 0;
    document.getElementById("suggestion-count").textContent =
      currentSuggestions.length;
  } catch (err) {
    alert("Error al sugerir: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "⚠ Sugerir eliminaciones";
  }
}

function renderSuggestionsBanner() {
  const banner = document.getElementById("suggestions-banner");
  if (!banner) return;

  if (currentSuggestions.length === 0) {
    banner.classList.add("hidden");
    return;
  }

  const list = currentSuggestions
    .map((s) => {
      const group = currentGroups.find((g) => g.id === s.groupId);
      return `<li><b>${s.teamName}</b> <span class="muted">(Grupo ${group?.name || "?"})</span> — ${s.currentPoints} pts, máximo ${s.bestPossible}, necesita ${s.cutoff}</li>`;
    })
    .join("");

  banner.classList.remove("hidden");
  banner.innerHTML = `
    <div class="banner-content">
      <strong>⚠ ${currentSuggestions.length} equipo(s) matemáticamente eliminado(s):</strong>
      <ul>${list}</ul>
      <small>Revisa y aplica las sugerencias con el botón "Aplicar sugerencias".</small>
    </div>
  `;
}

async function handleApplySuggestions() {
  if (currentSuggestions.length === 0) return;
  if (
    !confirm(
      `¿Marcar ${currentSuggestions.length} equipo(s) como eliminados? Esta acción se puede revertir.`,
    )
  )
    return;

  const btn = document.getElementById("apply-suggestions-btn");
  btn.disabled = true;
  btn.textContent = "Aplicando...";

  const res = await applyBulkSuggestions(currentSuggestions);
  if (!res.ok) {
    alert("Error: " + res.error);
    btn.disabled = false;
    btn.textContent = "✓ Aplicar sugerencias";
    return;
  }

  alert(`✓ ${res.count} equipo(s) marcados como eliminados`);
  currentSuggestions = [];
  await loadData();
}

export function isGroupStatusInitialized() {
  return hasLoaded;
}
