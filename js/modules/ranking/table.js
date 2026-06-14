import { supabase } from "/config/supabase.js";

export async function renderTable(state, filter = "global") {
  const tbody = document.getElementById("ranking-body");
  if (!tbody) return;

  const users = state.usersPage || [];
  const rowsPerPage = state.rowsPerPage || 10;
  const currentPage = state.currentPage || 1;
  const startRank = (currentPage - 1) * rowsPerPage + 4;

  const weeklyChanges = await getWeeklyChangesForUsers(users);

  tbody.innerHTML = users.map((user, index) => {
    const rank = startRank + index;
    const isYou = user.user_id === state.currentUserId;
    const flagUrl = user.country_code ? `https://flagcdn.com/w40/${user.country_code.toLowerCase()}.png` : "";
    const exactCount = user.exact_count || 0;
    const goalsHit = user.goals_hit || 0;
    const weeklyChange = weeklyChanges[user.user_id] || 0;

    const avatarUrl = user.avatar_url
        ? user.avatar_url.startsWith('http')
            ? user.avatar_url
            : `/assets/images/${user.avatar_url}`
        : '/assets/images/avatar.png';

    let weekDisplay = "0";
    let weekColor = "var(--color-text-secundary)";
    if (weeklyChange > 0) {
      weekDisplay = `+${weeklyChange}`;
      weekColor = "var(--color-accent)";
    } else if (weeklyChange < 0) {
      weekDisplay = `${weeklyChange}`;
      weekColor = "#e53e3e";
    }

    return `
      <tr class="${isYou ? "is-you" : ""}">
        <td class="rank">${rank}</td>

        <td class="user-cell">
          <img src="${avatarUrl}" class="avatar">
          <span>${user.user_name || 'Usuario'}</span>
          ${isYou ? '<span class="tag-you">TÚ</span>' : ""}
        </td>

        <td class="country-cell">
          ${user.country_code ? `<span class="country-label">${user.country_code.toUpperCase()}</span>` : ""}
          ${flagUrl ? `<img src="${flagUrl}" alt="${user.country_code || ''}" class="flag" title="${user.country_code || ''}">` : ""}
        </td>

        <td class="points">${user.points || 0}</td>
        <td>${exactCount}</td>
        <td>${goalsHit}</td>
        <td style="color: ${weekColor}">${weekDisplay}</td>
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

async function getWeeklyChangesForUsers(users) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString();

  const { data: snapshots } = await supabase
    .from("ranking_snapshots")
    .select("user_id, rank_position, snapshot_date")
    .lte("snapshot_date", weekAgoStr)
    .order("snapshot_date", { ascending: false });

  if (!snapshots || snapshots.length === 0) {
    return {};
  }

  const latestSnapshotByUser = {};
  snapshots.forEach(snap => {
    if (!latestSnapshotByUser[snap.user_id]) {
      latestSnapshotByUser[snap.user_id] = snap.rank_position;
    }
  });

  const { data: allUsers } = await supabase
    .from("profiles")
    .select("user_id")
    .order("points", { ascending: false });

  if (!allUsers) return {};

  const currentRankByUser = {};
  allUsers.forEach((u, idx) => {
    currentRankByUser[u.user_id] = idx + 1;
  });

  const changes = {};
  users.forEach(user => {
    const pastRank = latestSnapshotByUser[user.user_id];
    const currentRank = currentRankByUser[user.user_id];
    if (pastRank && currentRank) {
      changes[user.user_id] = pastRank - currentRank;
    }
  });

  return changes;
}