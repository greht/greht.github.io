import { renderNavbarUser } from "/js/components/navbar.js";
import { supabase } from "/config/supabase.js";
import { renderTable } from "/js/modules/ranking/table.js";
import { renderPodium } from "/js/modules/ranking/podium.js";
import { renderHeaderStats } from "/js/modules/ranking/headerStats.js";
import { initPagination, getState, setPage, updatePaginationButtons, resetPagination, setFilter, setUsers } from "/js/modules/ranking/pagination.js";
import { renderUserStickyCard } from "/js/modules/ranking/userStickyCard.js";
import { renderPaginationUI } from "/js/modules/ranking/paginationUI.js";
import { getAllUsers } from "/js/services/ranking.js";
import { forceSaveSnapshot } from "/js/services/snapshot.js";

let currentFilter = "global";
let countries = [];

function initStatTooltips() {
    document.querySelectorAll(".stat[data-tooltip]").forEach(stat => {
        if (stat.querySelector(".stat-tooltip")) return;
        const tooltip = document.createElement("div");
        tooltip.className = "stat-tooltip";
        tooltip.textContent = stat.dataset.tooltip;
        tooltip.style.cssText = 'position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%);';
        stat.appendChild(tooltip);
    });
}

async function loadCountries() {
  const res = await fetch("/data/countries.json");
  countries = await res.json();
}

async function saveDailySnapshotIfNeeded() {
    const today = new Date().toISOString().split('T')[0];

    const { data: existingSnapshots, error: checkError } = await supabase
        .from("ranking_snapshots")
        .select("user_id")
        .gte("snapshot_date", today)
        .limit(1);

    if (checkError) {
        console.error("Error checking snapshots:", checkError);
        return;
    }

    if (existingSnapshots && existingSnapshots.length > 0) {
        return;
    }

    const allUsers = await getAllUsers();

    if (!allUsers || allUsers.length === 0) {
        console.warn("No users found for snapshot");
        return;
    }

    const snapshotDate = new Date().toISOString();
    const snapshots = allUsers.map((user, index) => ({
        user_id: user.user_id,
        total_points: user.points,
        rank_position: index + 1,
        snapshot_date: snapshotDate
    }));

    const { error: insertError } = await supabase
        .from("ranking_snapshots")
        .insert(snapshots);

    if (insertError) {
        console.error("Error saving daily snapshot:", insertError);
    } else {
        console.log(`Snapshot saved for ${snapshots.length} users on ${today}`);
    }
}

function populateCountryFilter() {
  const select = document.getElementById("countryFilter");
  if (!select) return;

  select.innerHTML = "";

  const globalOption = document.createElement("option");
  globalOption.value = "global";
  globalOption.textContent = "🌍 Todos los países";
  select.appendChild(globalOption);

  const separator = document.createElement("option");
  separator.value = "";
  separator.textContent = "────────────";
  separator.disabled = true;
  select.appendChild(separator);

  countries.forEach(country => {
    const option = document.createElement("option");
    option.value = country.code;
    option.textContent = `${country.flag} ${country.name}`;
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    currentFilter = e.target.value;
    setFilter(currentFilter);
    resetPagination();
    renderAll();
  });
}

async function renderAll() {
  let users = [];
  const { data: { user } } = await supabase.auth.getUser();

  if (currentFilter === "global") {
    users = await getAllUsers();
  } else {
    users = await getAllUsers(currentFilter);
  }
  setUsers(users);

  const state = getState(currentFilter);
  state.currentUserId = user?.id;

  renderTable(state, currentFilter);
  renderPodium(currentFilter, users);
  await renderHeaderStats();
  await renderNavbarUser();

  await renderUserStickyCard({ ...state, usersPage: users });

  renderPaginationUI(state, (page) => {
    setPage(page);
    renderAll();
  });

  updatePaginationButtons(state);
}

function loadCountryFilter() {
  populateCountryFilter();
}

function initForceSnapshotButton() {
    const btn = document.getElementById("forceSnapshotBtn");
    if (!btn) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        btn.style.display = "block";
        btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Guardando...";
            const result = await forceSaveSnapshot();
            btn.disabled = false;
            btn.textContent = result.success ? `✓ ${result.count} usuarios` : "Error";
            setTimeout(() => {
                btn.textContent = "Guardar Snapshot";
            }, 3000);
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {

  await loadCountries();
  loadCountryFilter();
  initStatTooltips();
  initForceSnapshotButton();

  await saveDailySnapshotIfNeeded();

  initPagination((state) => {
    renderAll();
  });

  renderAll();
});
