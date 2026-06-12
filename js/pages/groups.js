import { getMatches } from "/js/services/matches.js";

function resolveFlagUrl(flagUrl) {
    if (!flagUrl) return "/assets/images/flag-mexV2.svg";
    if (flagUrl.startsWith("http://") || flagUrl.startsWith("https://")) return flagUrl;
    if (flagUrl.startsWith("<svg") || flagUrl.startsWith("<?xml")) {
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(flagUrl);
    }
    const fixes = { "sp.svg": "es.svg" };
    let path = flagUrl;
    for (const [bad, good] of Object.entries(fixes)) {
      path = path.replace(bad, good);
    }
    if (path.startsWith("/")) return path;
    return "/" + path;
}

export async function renderGroups() {
    const container = document.getElementById("groupsList");
    if (!container) return;

    const matches = await getMatches();
    const groupMatches = matches.filter(m => m.group && m.group.id);

    const matchesByGroup = groupMatches.reduce((acc, match) => {
        const groupId = match.group.id;
        if (!acc[groupId]) {
            acc[groupId] = {
                name: match.group.name,
                matches: []
            };
        }
        acc[groupId].matches.push(match);
        return acc;
    }, {});

    const groupsData = Object.values(matchesByGroup).map(group => {
        const standings = calculateStandings(group.matches);
        return {
            name: group.name,
            teams: standings
        };
    });

    groupsData.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = groupsData.map(group => renderGroupCard(group)).join("");
}

function calculateStandings(matches) {
    const teamsStats = {};

    matches.forEach(match => {
        if (!match.home_team || !match.away_team) return;
        if (!match.group) return;

        const homeTeamGroupId = match.home_team.group_id;
        const awayTeamGroupId = match.away_team.group_id;

        if (homeTeamGroupId !== match.group.id || awayTeamGroupId !== match.group.id) {
            return;
        }

        const homeId = match.home_team.id;
        const awayId = match.away_team.id;

        if (!teamsStats[homeId]) {
            teamsStats[homeId] = {
                team: match.home_team,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0
            };
        }
        if (!teamsStats[awayId]) {
            teamsStats[awayId] = {
                team: match.away_team,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0
            };
        }
    });

    matches.forEach(match => {
        if (!match.home_team || !match.away_team) return;
        if (!match.group) return;

        const homeTeamGroupId = match.home_team.group_id;
        const awayTeamGroupId = match.away_team.group_id;

        if (homeTeamGroupId !== match.group.id || awayTeamGroupId !== match.group.id) {
            return;
        }

        const homeGoals = match.home_score;
        const awayGoals = match.away_score;

        if (homeGoals == null || awayGoals == null) return;

        const homeId = match.home_team.id;
        const awayId = match.away_team.id;

        teamsStats[homeId].played++;
        teamsStats[homeId].goalsFor += homeGoals;
        teamsStats[homeId].goalsAgainst += awayGoals;

        teamsStats[awayId].played++;
        teamsStats[awayId].goalsFor += awayGoals;
        teamsStats[awayId].goalsAgainst += homeGoals;

        if (homeGoals > awayGoals) {
            teamsStats[homeId].won++;
            teamsStats[awayId].lost++;
        } else if (homeGoals < awayGoals) {
            teamsStats[awayId].won++;
            teamsStats[homeId].lost++;
        } else {
            teamsStats[homeId].drawn++;
            teamsStats[awayId].drawn++;
        }
    });

    return Object.values(teamsStats)
        .map(t => ({
            ...t,
            points: t.won * 3 + t.drawn,
            goalDiff: t.goalsFor - t.goalsAgainst
        }))
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
            return b.goalsFor - a.goalsFor;
        });
}

function renderGroupCard(group) {
    return `
        <div class="group-card">
            <div class="group-card-header">
                <span class="group-badge">GRUPO ${group.name}</span>
            </div>
            <div class="group-table-view">
                <table class="group-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th></th>
                            <th>PJ</th>
                            <th>G</th>
                            <th>E</th>
                            <th>P</th>
                            <th>GF</th>
                            <th>GC</th>
                            <th>DG</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.teams.map((t, i) => `
                            <tr class="position-${i + 1}">
                                <td class="position-cell">${i + 1}</td>
                                <td>
                                    <div class="team-info">
                                        <img class="team-flag" src="${resolveFlagUrl(t.team.flag_url)}" alt="${t.team.name}">
                                        <span class="team-name">${t.team.name}</span>
                                    </div>
                                </td>
                                <td class="stats-cell">${t.played}</td>
                                <td class="stats-cell">${t.won}</td>
                                <td class="stats-cell">${t.drawn}</td>
                                <td class="stats-cell">${t.lost}</td>
                                <td class="stats-cell">${t.goalsFor}</td>
                                <td class="stats-cell">${t.goalsAgainst}</td>
                                <td class="stats-cell">${t.goalDiff > 0 ? '+' : ''}${t.goalDiff}</td>
                                <td class="pts-cell">${t.points}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
            <div class="group-cards-view">
                ${group.teams.map((t, i) => `
                    <div class="team-card position-${i + 1}">
                        <div class="team-card-main">
                            <div class="team-card-left">
                                <span class="team-card-position">${i + 1}</span>
                                <img class="team-card-flag" src="${resolveFlagUrl(t.team.flag_url)}" alt="${t.team.name}">
                                <span class="team-card-name">${t.team.name}</span>
                            </div>
                            <span class="team-card-pts">${t.points} <span class="team-card-pts-label">pts</span></span>
                        </div>
                        <div class="team-card-stats">
                            <span><b>${t.played}</b> PJ</span>
                            <span><b>${t.won}</b> G</span>
                            <span><b>${t.drawn}</b> E</span>
                            <span><b>${t.lost}</b> P</span>
                            <span><b>${t.goalsFor}:${t.goalsAgainst}</b> GF:GC</span>
                            <span><b>${t.goalDiff > 0 ? '+' : ''}${t.goalDiff}</b> DG</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}