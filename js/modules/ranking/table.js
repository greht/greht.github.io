import { supabase } from "/config/supabase.js";

export function renderTable(state, filter = "global") {
  const tbody = document.getElementById("ranking-body");
  if (!tbody) return;

  const users = state.usersPage || [];
  const rowsPerPage = state.rowsPerPage || 10;
  const currentPage = state.currentPage || 1;
  const startRank = (currentPage - 1) * rowsPerPage + 4;

  tbody.innerHTML = users.map((user, index) => {
    const rank = startRank + index;
    const isYou = user.user_id === state.currentUserId;
    const flagUrl = user.country_code ? `https://flagcdn.com/w40/${user.country_code.toLowerCase()}.png` : "";
    const exactCount = user.exact_count || 0;

    return `
      <tr class="${isYou ? "is-you" : ""}">
        <td class="rank">${rank}</td>

        <td class="user-cell">
          <img src="${user.avatar_url ? `/assets/images/${user.avatar_url}` : '/assets/images/avatar.png'}" class="avatar">
          <span>${user.user_name || 'Usuario'}</span>
          ${isYou ? '<span class="tag-you">TÚ</span>' : ""}
        </td>

        <td class="country-cell">
          ${user.country_code ? `<span class="country-label">${user.country_code.toUpperCase()}</span>` : ""}
          ${flagUrl ? `<img src="${flagUrl}" alt="${user.country_code || ''}" class="flag" title="${user.country_code || ''}">` : ""}
        </td>

        <td>${exactCount}</td>
        <td class="points">${user.points || 0}</td>
      </tr>
    `;
  }).join("");

  requestAnimationFrame(() => {
    const row = document.querySelector("tr.is-you");

    if (row) {
      row.classList.add("highlight-you");

      setTimeout(() => {
        row.classList.remove("highlight-you");
      }, 1200);
    }
  });
}