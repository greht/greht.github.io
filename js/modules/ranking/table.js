import { getCurrentUser } from "../../data/users.js";

export function renderTable(state) {
  const tbody = document.getElementById("ranking-body");
  if (!tbody) return;

  const currentUser = getCurrentUser();
  const users = state.usersPage || [];

  tbody.innerHTML = users.map(user => {
    const isYou = user.id === currentUser?.id;
    const flagUrl = user.country ? `https://flagcdn.com/w40/${user.country.toLowerCase()}.png` : "";

    return `
      <tr class="${isYou ? "is-you" : ""}">
        <td class="rank">${user.rank}</td>

        <td class="user-cell">
          <img src="assets/images/${user.avatar}" class="avatar">
          <span>${user.name}</span>
          ${isYou ? '<span class="tag-you">TÚ</span>' : ""}
        </td>

        <td class="country-cell">
          ${user.countryName ? `<span class="country-label">${user.countryName.substring(0, 3).toUpperCase()}</span>` : ""}
          ${flagUrl ? `<img src="${flagUrl}" alt="${user.countryName || user.country}" class="flag" title="${user.countryName || ""}">` : ""}
        </td>

        <td>${user.correct}</td>
        <td class="points">${user.points}</td>
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