import { loadNavbar, renderNavbarUser } from "../components/navbar.js";
import { renderTable } from "../modules/ranking/table.js";
import { renderPodium } from "../modules/ranking/podium.js";
import { renderHeaderStats } from "../modules/ranking/headerStats.js";
import { initPagination, getState, setPage, updatePaginationButtons, resetPagination, setFilter } from "../modules/ranking/pagination.js";
import { renderUserStickyCard } from "../modules/ranking/userStickyCard.js";
import { renderPaginationUI } from "../modules/ranking/paginationUI.js";
import { getCountries, getUsersByCountry } from "../data/users.js";

let currentFilter = "global";

function renderAll() {
  const state = getState(currentFilter);

  renderTable(state, currentFilter);
  renderPodium(currentFilter);
  renderHeaderStats();
  renderNavbarUser();

  renderUserStickyCard(state);

  renderPaginationUI(state, (page) => {
    setPage(page);
    renderAll();
  });

  updatePaginationButtons(state);
}

function loadCountryFilter() {
  const select = document.getElementById("countryFilter");
  if (!select) return;

  const countries = getCountries();
  countries.forEach(({ code, name }) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    currentFilter = e.target.value;
    setFilter(currentFilter);
    resetPagination();
    renderAll();
  });
}

document.addEventListener("DOMContentLoaded", async () => {

  await loadNavbar();
  loadCountryFilter();

  initPagination((state) => {
    renderAll();
  });

  renderAll();
});
