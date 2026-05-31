import { loadNavbar, renderNavbarUser } from "/js/components/navbar.js";
import { supabase } from "/config/supabase.js";
import { renderTable } from "/js/modules/ranking/table.js";
import { renderPodium } from "/js/modules/ranking/podium.js";
import { renderHeaderStats } from "/js/modules/ranking/headerStats.js";
import { initPagination, getState, setPage, updatePaginationButtons, resetPagination, setFilter, setUsers } from "/js/modules/ranking/pagination.js";
import { renderUserStickyCard } from "/js/modules/ranking/userStickyCard.js";
import { renderPaginationUI } from "/js/modules/ranking/paginationUI.js";
import { getAllUsers } from "/js/services/ranking.js";

let currentFilter = "global";
let countries = [];

async function loadCountries() {
  const res = await fetch("/data/countries.json");
  countries = await res.json();
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

document.addEventListener("DOMContentLoaded", async () => {

  await loadNavbar();
  await loadCountries();
  loadCountryFilter();

  initPagination((state) => {
    renderAll();
  });

  renderAll();
});
