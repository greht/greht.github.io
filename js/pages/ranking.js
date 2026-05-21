import { loadNavbar, renderNavbarUser } from "/js/components/navbar.js";
import { renderTable } from "/js/modules/ranking/table.js";
import { renderPodium } from "/js/modules/ranking/podium.js";
import { renderHeaderStats } from "/js/modules/ranking/headerStats.js";
import { initPagination, getState, setPage, updatePaginationButtons, resetPagination, setFilter } from "/js/modules/ranking/pagination.js";
import { renderUserStickyCard } from "/js/modules/ranking/userStickyCard.js";
import { renderPaginationUI } from "/js/modules/ranking/paginationUI.js";
import { getCountries, getUsersByCountry } from "/js/data/users.js";

let currentFilter = "global";

async function renderAll() {
  const state = getState(currentFilter);

  renderTable(state, currentFilter);
  renderPodium(currentFilter);
  await renderHeaderStats();
  await renderNavbarUser();

  await renderUserStickyCard(state);

  renderPaginationUI(state, (page) => {
    setPage(page);
    renderAll();
  });

  updatePaginationButtons(state);
}

function loadCountryFilter() {
  const select = document.getElementById("countryFilter");
  if (!select) return;

  // Add "País" separator option
  const separator = document.createElement("option");
  separator.value = "";
  separator.textContent = "────────────";
  separator.disabled = true;
  select.appendChild(separator);

  // Sort countries alphabetically
  const countries = getCountries().sort((a, b) => a.name.localeCompare(b.name));
  
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
