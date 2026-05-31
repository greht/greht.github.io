import { supabase } from "/config/supabase.js"

let tournamentInitialized = false

export async function loadQualifiedTeamsSection() {
    const container = document.getElementById("tournament-section")
    if (!container) return

    if (tournamentInitialized) return
    tournamentInitialized = true

    const { data: phases } = await supabase
        .from("phases")
        .select("id, name, display_order")
        .gte("display_order", 2)
        .order("display_order")

    const { data: leagues, error: leaguesError } = await supabase.from("leagues").select("id, name").order("name")
    console.log("Leagues from DB:", leagues, leaguesError)
    const hardcodedLeague = { id: '1ebd76d7-5839-4c80-a41a-554de1bb22f5', name: 'FIFA World Cup 2026' }
    const leaguesList = (leagues && leagues.length) ? leagues : [hardcodedLeague]
    const leagueOptions = leaguesList.map(l => `<option value="${l.id}">${l.name}</option>`).join("")

    const knockoutPhases = (phases || []).filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i)
    const stageOptions = knockoutPhases.map(p => `<option value="${p.name}">${p.name}</option>`).join("")
    const phaseIdOptions = knockoutPhases.map(p => `<option value="${p.id}">${p.name}</option>`).join("")
    console.log("Phases from DB:", knockoutPhases)

    container.innerHTML = `
        <section class="tournament-admin">
            <div class="tournament-header">
                <p>Crea las reglas para organizar los encuentros posteriores a la fase eliminatoria</p>
            </div>

            <div class="tournament-tabs">
                <button class="tab-btn active" data-tab="qualified">Equipos Clasificados</button>
                <button class="tab-btn" data-tab="templates">Plantillas KO</button>
                <button class="tab-btn" data-tab="generate">Generar Partidos</button>
            </div>

            <div id="qualified-tab" class="tab-content active">
                <div class="top-stage">
                    <div class="stage-selector">
                        <label>Liga:</label>
                        <select id="qualified-league-select">${leagueOptions}</select>
                    </div>
                    <div class="stage-selector">
                        <label>Etapa:</label>
                        <select id="qualified-stage-select">${stageOptions}</select>
                        <button id="load-qualified-btn" class="btn-secondary">Cargar</button>
                    </div>
                </div>
                <div id="qualified-teams-grid" class="qualified-grid"></div>
                
            </div>

            <div id="templates-tab" class="tab-content">
                <div class="stage-selector">
                    <label>Liga:</label>
                    <select id="template-league-select">${leagueOptions}</select>
                </div>
                <div class="stage-selector">
                    <label>Etapa:</label>
                    <select id="template-stage-select">${stageOptions}</select>
                    <button id="load-templates-btn" class="btn-secondary">Cargar</button>
                    <button id="add-template-btn" class="btn-primary">+ Agregar Plantilla</button>
                </div>
                <div id="templates-grid" class="templates-grid"></div>
            </div>

            <div id="generate-tab" class="tab-content">
                <div class="generate-form">
                    <div class="form-group">
                        <label>Liga:</label>
                        <select id="generate-league-select">${leagueOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>Etapa:</label>
                        <select id="generate-stage">${stageOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>Fase (base de datos):</label>
                        <select id="generate-phase">${phaseIdOptions}</select>
                    </div>
                </div>
                <div id="generate-preview" class="generate-preview"></div>
                <button id="generate-btn" class="btn-primary">Generar Partidos Eliminatorios</button>
                <div id="generate-result" class="generate-result"></div>
            </div>
        </section>
    `

    initTabs()
    initQualifiedTeamsHandlers()
    initTemplatesHandlers()
    initGenerateHandlers()

    loadQualifiedTeams()
}

function initTabs() {
    document.querySelectorAll(".tournament-tabs .tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tournament-tabs .tab-btn").forEach(b => b.classList.remove("active"))
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"))
            btn.classList.add("active")
            const tabId = `${btn.dataset.tab}-tab`
            document.getElementById(tabId).classList.add("active")
            if (btn.dataset.tab === "templates") loadTemplates()
            if (btn.dataset.tab === "qualified") loadQualifiedTeams()
            if (btn.dataset.tab === "generate") loadGeneratePreview()
        })
    })
}

async function loadAllTeams() {
    const { data } = await supabase.from("teams").select("id, name, fifa_code, flag_url, group_id")
    return data || []
}

async function loadAllGroups() {
    const { data } = await supabase.from("groups").select("id, name")
    return data || []
}

function initQualifiedTeamsHandlers() {
    const select = document.getElementById("qualified-stage-select")
    if (select) {
        select.addEventListener("change", () => {
            console.log("Dropdown changed to:", select.value)
            loadQualifiedTeams()
        })
    }
    const leagueSelect = document.getElementById("qualified-league-select")
    if (leagueSelect) {
        leagueSelect.addEventListener("change", loadQualifiedTeams)
    }
    document.getElementById("load-qualified-btn")?.addEventListener("click", loadQualifiedTeams)
}

function formatSlotLabel(slot) {
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]
    const thirdMatch = slot.match(/^THIRD_(\d+)$/)
    if (thirdMatch) return `Mejor 3° #${thirdMatch[1]}`
    const groupMatch = slot.match(/^([A-L])(\d)$/)
    if (groupMatch) return `Grupo ${groupMatch[1]} - ${groupMatch[2] === "1" ? "1°" : "2°"}`
    return slot
}

async function loadQualifiedTeams() {
    const stage = document.getElementById("qualified-stage-select")?.value
    const leagueId = document.getElementById("qualified-league-select")?.value
    const grid = document.getElementById("qualified-teams-grid")
    if (!grid) { console.log("no grid"); return }
    if (!stage) { grid.innerHTML = "<p>Selecciona una etapa</p>"; return }

    let qualifiedQuery = supabase.from("qualified_teams").select("*").eq("stage", stage).order("slot_code")
    if (leagueId) qualifiedQuery = qualifiedQuery.eq("league_id", leagueId)
    const [qualified, teams, groups] = await Promise.all([
        qualifiedQuery,
        loadAllTeams(),
        loadAllGroups()
    ])

    console.log("Qualified data:", qualified.data, "Stage used:", stage)

    const slots = getSlotsForStage(stage, groups)
    console.log("Stage:", stage, "Slots:", slots, "Qualified count:", qualified.data?.length || 0)

    if (!slots.length) {
        grid.innerHTML = `<p>No hay slots para esta etapa. Stage: "${stage}"</p>`
        return
    }

    const teamsMap = new Map(teams.map(t => [t.id, t]))
    const groupsMapById = new Map(groups.map(g => [g.id, g]))

    const teamsByGroupLetter = new Map()
    groups.forEach(g => {
        teamsByGroupLetter.set(g.name.toUpperCase(), [])
    })
    teams.forEach(t => {
        if (t.group_id) {
            const group = groupsMapById.get(t.group_id)
            if (group) {
                const key = group.name.toUpperCase()
                if (!teamsByGroupLetter.has(key)) teamsByGroupLetter.set(key, [])
                teamsByGroupLetter.get(key).push(t)
            }
        }
    })

    const allTeamsOptions = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join("")

    grid.innerHTML = slots.map(slot => {
        const assigned = qualified.data?.find(q => q.slot_code === slot)
        const team = assigned?.team_id ? teamsMap.get(assigned.team_id) : null
        const slotMatch = slot.match(/^([A-L])([12])$/)
        const isThird = slot.startsWith("THIRD_")

        let options
        if (isThird) {
            const usedTeamIds = qualified.data?.map(q => q.team_id).filter(Boolean) || []
            const availableTeams = teams.filter(t => !usedTeamIds.includes(t.id))
            options = availableTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join("")
        } else if (slotMatch) {
            const groupLetter = slotMatch[1]
            const groupTeams = teamsByGroupLetter.get(groupLetter) || []
            const usedInGroup = qualified.data?.filter(q => q.slot_code.startsWith(groupLetter)).map(q => q.team_id) || []
            const available = groupTeams.filter(t => !usedInGroup.includes(t.id))
            options = available.map(t => `<option value="${t.id}">${t.name}</option>`).join("")
        } else {
            options = allTeamsOptions
        }

        return `
            <div class="qualified-slot-card">
                <div class="slot-code">${formatSlotLabel(slot)}</div>
                <div class="slot-team">
                    ${team ? `
                        <img src="${team.flag_url}" class="team-flag">
                        <span>${team.name}</span>
                        <button class="btn-remove-slot" data-slot="${slot}">×</button>
                    ` : `
                        <select class="team-select" data-slot="${slot}">
                            <option value="">Seleccionar...</option>
                            ${options}
                        </select>
                    `}
                </div>
            </div>
        `
    }).join("")

    grid.querySelectorAll(".team-select").forEach(select => {
        select.addEventListener("change", async (e) => {
            if (e.target.value) {
                await assignSlot(stage, select.dataset.slot, e.target.value)
                loadQualifiedTeams()
            }
        })
    })

    grid.querySelectorAll(".btn-remove-slot").forEach(btn => {
        btn.addEventListener("click", async () => {
            await removeSlot(stage, btn.dataset.slot)
            loadQualifiedTeams()
        })
    })
}

async function assignSlot(stage, slotCode, teamId) {
    const leagueId = document.getElementById("qualified-league-select")?.value
    if (!leagueId) { alert("Selecciona una liga"); return }

    const existing = await supabase
        .from("qualified_teams")
        .select("id")
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .eq("slot_code", slotCode)
        .single()

    if (existing.data) {
        const { error } = await supabase
            .from("qualified_teams")
            .update({ team_id: teamId })
            .eq("id", existing.data.id)
        if (error) alert("Error actualizando: " + error.message)
    } else {
        const { error } = await supabase
            .from("qualified_teams")
            .insert({ league_id: leagueId, stage, slot_code: slotCode, team_id: teamId })
        if (error) alert("Error insertando: " + error.message)
    }
}

async function removeSlot(stage, slotCode) {
    const leagueId = document.getElementById("qualified-league-select")?.value
    if (!leagueId) { alert("Selecciona una liga"); return }
    let query = supabase.from("qualified_teams").delete()
        .eq("stage", stage).eq("slot_code", slotCode)
    if (leagueId) query = query.eq("league_id", leagueId)
    const { error } = await query
    if (error) alert("Error eliminando: " + error.message)
}

function initTemplatesHandlers() {
    document.getElementById("load-templates-btn")?.addEventListener("click", loadTemplates)
    document.getElementById("add-template-btn")?.addEventListener("click", showAddTemplateModal)
    const stageSelect = document.getElementById("template-stage-select")
    if (stageSelect) stageSelect.addEventListener("change", loadTemplates)
    const leagueSelect = document.getElementById("template-league-select")
    if (leagueSelect) leagueSelect.addEventListener("change", loadTemplates)
}

async function loadTemplates() {
    const stage = document.getElementById("template-stage-select")?.value
    const leagueId = document.getElementById("template-league-select")?.value
    if (!stage) return

    console.log("Loading templates for stage:", stage, "leagueId:", leagueId)

    let query = supabase.from("knockout_templates").select("*").eq("stage", stage).order("match_order")
    if (leagueId) query = query.eq("league_id", leagueId)

    const { data, error } = await query

    if (error) { alert("Error cargando: " + error.message); return }
    console.log("Templates data:", data)

    const grid = document.getElementById("templates-grid")
    if (!grid) return

    if (!data?.length) {
        grid.innerHTML = `<p class="empty-state">Sin plantillas para ${stage}. Agrega las combinaciones de slots.</p>`
        return
    }

    const teams = await loadAllTeams()
    const teamsMap = new Map(teams.map(t => [t.id, t]))
    const qualified = await supabase.from("qualified_teams").select("slot_code, team_id").eq("stage", stage)
        if (qualified.error) console.warn("Qualified query error:", qualified.error)
const qualifiedData = qualified.data || []
    const slotToTeam = new Map(qualifiedData.map(q => [q.slot_code, q.team_id]))

    grid.innerHTML = data.map(t => {
        const homeSlotTeam = slotToTeam.get(t.home_slot)
        const awaySlotTeam = slotToTeam.get(t.away_slot)
        const homeTeam = homeSlotTeam ? teamsMap.get(homeSlotTeam) : null
        const awayTeam = awaySlotTeam ? teamsMap.get(awaySlotTeam) : null
        return `
            <div class="template-card">
                <span class="match-order">#${t.match_order}</span>
                <div class="match-info">
                    <div class="match-team">
                        <span class="slot-badge">${t.home_slot}</span>
                        <span class="team-name">${homeTeam?.name || "Sin asignar"}</span>
                    </div>
                    <span class="vs-label">vs</span>
                    <div class="match-team">
                        <span class="slot-badge">${t.away_slot}</span>
                        <span class="team-name">${awayTeam?.name || "Sin asignar"}</span>
                    </div>
                </div>
                <button class="btn-delete-template" data-id="${t.id}">×</button>
            </div>`
    }).join("")

    grid.querySelectorAll(".btn-delete-template").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("Eliminar esta plantilla?")) return
            const { error } = await supabase.from("knockout_templates").delete().eq("id", btn.dataset.id)
            if (error) alert("Error eliminando: " + error.message)
            else loadTemplates()
        })
    })
}

function showAddTemplateModal() {
    const stage = document.getElementById("template-stage-select")?.value
    const slots = getSlotsForStage(stage)
    const nextOrder = document.querySelectorAll(".template-card").length + 1

    const modal = document.createElement("div")
    modal.className = "modal-overlay"
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Agregar Plantilla</h3>
            <div class="form-group">
                <label>Orden:</label>
                <input type="number" id="template-order" value="${nextOrder}" min="1">
            </div>
            <div class="form-group">
                <label>Slot Local:</label>
                <select id="template-home-slot">${slots.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
            </div>
            <div class="form-group">
                <label>Slot Visitante:</label>
                <select id="template-away-slot">${slots.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
            </div>
            <div class="modal-actions">
                <button id="save-template-btn" class="btn-primary">Guardar</button>
                <button id="cancel-template-btn" class="btn-secondary">Cancelar</button>
            </div>
        </div>`

    document.body.appendChild(modal)
    modal.querySelector("#cancel-template-btn").addEventListener("click", () => modal.remove())
    modal.querySelector("#save-template-btn").addEventListener("click", async () => {
        const leagueId = document.getElementById("template-league-select")?.value
        const stage = document.getElementById("template-stage-select")?.value
        const { error } = await supabase.from("knockout_templates").insert({
            league_id: leagueId,
            stage,
            match_order: parseInt(document.getElementById("template-order").value),
            home_slot: document.getElementById("template-home-slot").value,
            away_slot: document.getElementById("template-away-slot").value
        })
        if (error) alert("Error: " + error.message)
        else { modal.remove(); loadTemplates() }
    })
}

function initGenerateHandlers() {
    document.getElementById("generate-btn")?.addEventListener("click", handleGenerate)
    const stageSelect = document.getElementById("generate-stage")
    if (stageSelect) stageSelect.addEventListener("change", () => loadGeneratePreview())
    const leagueSelect = document.getElementById("generate-league-select")
    if (leagueSelect) leagueSelect.addEventListener("change", () => loadGeneratePreview())
}

async function loadGeneratePreview() {
    const stage = document.getElementById("generate-stage")?.value
    const leagueId = document.getElementById("generate-league-select")?.value
    const preview = document.getElementById("generate-preview")
    if (!stage || !preview) return

    let query = supabase.from("knockout_templates").select("*").eq("stage", stage).order("match_order")
    if (leagueId) query = query.eq("league_id", leagueId)

    const { data: templates, error } = await query
    if (error) { preview.innerHTML = `<p class="error">Error: ${error.message}</p>`; return }

    if (!templates?.length) {
        preview.innerHTML = `<p class="empty-state">No hay plantillas para ${stage}. Agrega plantillas primero.</p>`
        return
    }

    const existingMatches = await supabase
        .from("matches")
        .select("id, home_slot, away_slot, match_date")
        .eq("league_id", leagueId)
        .eq("stage", stage)

    const matchDateMap = new Map()
    if (existingMatches.data) {
        existingMatches.data.forEach(m => {
            matchDateMap.set(`${m.home_slot}-${m.away_slot}`, m.match_date)
        })
    }

    let qualifiedQuery = supabase.from("qualified_teams").select("slot_code, team_id").eq("stage", stage)
    if (leagueId) qualifiedQuery = qualifiedQuery.eq("league_id", leagueId)
    const qualified = await qualifiedQuery
    const teams = await loadAllTeams()
    const teamsMap = new Map(teams.map(t => [t.id, t]))
    const slotToTeam = new Map((qualified.data || []).map(q => [q.slot_code, q.team_id]))

    preview.innerHTML = `
        <h4>Partidos (${templates.length}):</h4>
        <div class="preview-matches">
            ${templates.map(t => {
                const homeTeamId = slotToTeam.get(t.home_slot)
                const awayTeamId = slotToTeam.get(t.away_slot)
                const homeTeam = homeTeamId ? teamsMap.get(homeTeamId) : null
                const awayTeam = awayTeamId ? teamsMap.get(awayTeamId) : null
                const existingDate = (() => {
                    const d = matchDateMap.get(`${t.home_slot}-${t.away_slot}`)
                    if (!d) return ""
                    try {
                        const date = new Date(d)
                        return date.toISOString().slice(0, 16)
                    } catch { return "" }
                })()
                return `
                    <div class="preview-match">
                        <span class="preview-order">#${t.match_order}</span>
                        <div class="preview-teams">
                            <div class="preview-team">
                                <span class="slot-badge-sm">${t.home_slot}</span>
                                <span>${homeTeam?.name || "Sin asignar"}</span>
                            </div>
                            <span class="preview-vs">vs</span>
                            <div class="preview-team">
                                <span class="slot-badge-sm">${t.away_slot}</span>
                                <span>${awayTeam?.name || "Sin asignar"}</span>
                            </div>
                        </div>
                        <input type="datetime-local" class="match-datetime" 
                            data-match="${t.match_order}" 
                            data-home="${t.home_slot}" 
                            data-away="${t.away_slot}" 
                            value="${existingDate}" 
                            placeholder="Fecha y hora">
                    </div>
                `
            }).join("")}
        </div>
    `
}

async function handleGenerate() {
    const stage = document.getElementById("generate-stage")?.value
    const phaseId = document.getElementById("generate-phase")?.value
    const leagueId = document.getElementById("generate-league-select")?.value

    if (!stage || !phaseId || !leagueId) {
        alert("Completa todos los campos"); return
    }

    console.log("Generating with stage:", stage, "phaseId:", phaseId, "leagueId:", leagueId)

    const datetimeInputs = document.querySelectorAll(".match-datetime")
    const matchDateMap = new Map()
    datetimeInputs.forEach(input => {
        const home = input.dataset.home
        const away = input.dataset.away
        const value = input.value
        if (value && home && away) matchDateMap.set(`${home}-${away}`, value)
    })

    if (matchDateMap.size === 0) {
        alert("Ingresa al menos una fecha"); return
    }

    const btn = document.getElementById("generate-btn")
    const result = document.getElementById("generate-result")
    btn.disabled = true; btn.textContent = "Generando..."

    try {
        console.log("Using leagueId:", leagueId)

        let templatesQuery = supabase.from("knockout_templates").select("*").eq("stage", stage).order("match_order")
        if (leagueId) templatesQuery = templatesQuery.eq("league_id", leagueId)
        const { data: templates } = await templatesQuery

        let qualifiedQuery = supabase.from("qualified_teams").select("*").eq("stage", stage)
        if (leagueId) qualifiedQuery = qualifiedQuery.eq("league_id", leagueId)
        const { data: qualifiedTeams } = await qualifiedQuery

        const slotMap = new Map((qualifiedTeams || []).map(q => [q.slot_code, q.team_id]))
        const matches = templates
            .map(t => {
                const homeSlot = t.home_slot
                const awaySlot = t.away_slot
                const homeTeamId = slotMap.get(homeSlot)
                const awayTeamId = slotMap.get(awaySlot)
                const matchDate = matchDateMap.get(`${homeSlot}-${awaySlot}`)

                if (!homeTeamId || !awayTeamId || !matchDate) return null

                const match = {
                    league_id: leagueId,
                    phase_id: phaseId,
                    stage,
                    home_team_id: homeTeamId,
                    away_team_id: awayTeamId,
                    home_slot: homeSlot,
                    away_slot: awaySlot,
                    status: "scheduled",
                    match_date: matchDate,
                    group_id: null
                }
                return match
            })
            .filter(m => m !== null)

        if (!matches.length) throw new Error("Faltan equipos o fechas")

        const existingMatches = await supabase
            .from("matches")
            .select("id, home_slot, away_slot, stage, league_id")
            .eq("league_id", leagueId)
            .eq("stage", stage)

        const existingMap = new Map()
        if (existingMatches.data) {
            existingMatches.data.forEach(m => {
                existingMap.set(`${m.home_slot}-${m.away_slot}`, m.id)
            })
        }

        let created = 0, updated = 0
        for (const match of matches) {
            const key = `${match.home_slot}-${match.away_slot}`
            if (existingMap.has(key)) {
                await supabase.from("matches").update({ match_date: match.match_date }).eq("id", existingMap.get(key))
                updated++
            } else {
                await supabase.from("matches").insert(match)
                created++
            }
        }

        result.innerHTML = `<p class="success">✓ ${created} creados, ${updated} actualizados</p>`
    } catch (err) {
        result.innerHTML = `<p class="error">✗ ${err.message}</p>`
    }

    btn.disabled = false; btn.textContent = "Generar Partidos Eliminatorios"
}

async function getCurrentLeagueId() {
    try {
        const { data, error } = await supabase
            .from("leagues")
            .select("id")
            .limit(1)
        console.log("Leagues query result:", data, error)
        if (error || !data?.length) {
            throw new Error(error?.message || "No league found")
        }
        return data[0].id
    } catch (e) {
        console.warn("Could not get leagueId, using hardcoded:", e)
        return "1ebd76d7-5839-4c80-a41a-554de1bb22f5"
    }
}

function getSlotsForStage(stageName, groupsInDb = []) {
    const name = stageName.toUpperCase()
    const groups = groupsInDb.length ? groupsInDb.map(g => g.name.toUpperCase()) : ["A","B","C","D","E","F","G","H","I","J","K","L"]

    if (name.includes("32") || name.includes("OCTAVOS") || name.includes("ROUND_OF_16")) {
        return [
            ...groups.flatMap(g => [`${g}1`, `${g}2`]),
            "THIRD_1","THIRD_2","THIRD_3","THIRD_4",
            "THIRD_5","THIRD_6","THIRD_7","THIRD_8"
        ]
    }
    if (name.includes("CUARTOS") || name.includes("QUARTER")) {
        return ["R16_1","R16_2","R16_3","R16_4","R16_5","R16_6","R16_7","R16_8"]
    }
    if (name.includes("SEMI") || name.includes("SEMIFINAL")) {
        return ["QF_1","QF_2","QF_3","QF_4"]
    }
    if (name.includes("FINAL") && !name.includes("SEMI")) {
        return ["SF_1","SF_2"]
    }
    return []
}