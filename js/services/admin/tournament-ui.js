import { supabase } from "/config/supabase.js"
import { checkAdmin } from "/config/admin.js"
import { renderFlag } from "/js/utils/flagUrl.js"

// Caché para evitar consultas repetidas a la BD
const slotLabelCache = new Map()

// Mapeo de fases a su rango de match_numbers esperado
const phaseToMatchNumberRange = {
    'Eliminatoria de 32': { start: 73, count: 16 },
    'Octavos de final': { start: 89, count: 8 },
    'Cuartos de final': { start: 97, count: 4 },
    'Semifinal': { start: 101, count: 2 },
    'Eliminatoria por el 3er lugar': { start: 103, count: 1 },
    'Final': { start: 104, count: 1 }
}

export async function formatSlotLabel(slotCode, leagueId) {
    // Si ya está en caché, devolverlo
    const cacheKey = `${slotCode}_${leagueId}`
    if (slotLabelCache.has(cacheKey)) {
        return slotLabelCache.get(cacheKey)
    }
    
    // Mapeo de prefijos a nombres de fases
    const phaseMap = {
        'R32_': 'Eliminatoria de 32',
        'R16_': 'Octavos de final',
        'QF_': 'Cuartos de final',
        'SF_': 'Semifinal',
        'L_SF_': 'Semifinal'
    }
    
    // Buscar si el slot corresponde a un prefijo conocido
    for (const [prefix, phaseName] of Object.entries(phaseMap)) {
        if (slotCode.startsWith(prefix)) {
            const position = parseInt(slotCode.split('_').pop())
            
            // Primero intentar buscar el partido en la BD
            const phase = await getPhaseByName(phaseName)
            if (phase) {
                const { data: matchData, error } = await supabase
                    .from('matches')
                    .select('id, match_number')
                    .eq('phase_id', phase.id)
                    .eq('bracket_position', position)
                    .eq('league_id', leagueId)
                    .limit(1)
                
                if (!error && matchData && matchData.length > 0) {
                    const matchNumber = matchData[0].match_number
                    const isLoser = slotCode.startsWith('L_SF_')
                    
                    const label = isLoser 
                        ? `Perdedor P${matchNumber}` 
                        : `Ganador P${matchNumber}`
                    
                    slotLabelCache.set(cacheKey, label)
                    return label
                }
            }
            
            // Si no se encuentra en la BD, calcular el match_number esperado
            const range = phaseToMatchNumberRange[phaseName]
            if (range && position >= 1 && position <= range.count) {
                const expectedMatchNumber = range.start + position - 1
                const isLoser = slotCode.startsWith('L_SF_')
                
                const label = isLoser 
                    ? `Perdedor P${expectedMatchNumber}` 
                    : `Ganador P${expectedMatchNumber}`
                
                slotLabelCache.set(cacheKey, label)
                return label
            }
            
            slotLabelCache.set(cacheKey, slotCode)
            return slotCode
        }
    }
    
    // Si no es un slot de fase eliminatoria, devolver tal cual
    slotLabelCache.set(cacheKey, slotCode)
    return slotCode
}

let tournamentInitialized = false

export async function loadQualifiedTeamsSection() {
    const user = await checkAdmin();
    if (!user) {
        alert('No tienes permisos para acceder a esta sección');
        return;
    }
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
    const hardcodedLeague = { id: '1ebd76d7-5839-4c80-a41a-554de1bb22f5', name: 'FIFA World Cup 2026' }
    const leaguesList = (leagues && leagues.length) ? leagues : [hardcodedLeague]
    const leagueOptions = leaguesList.map(l => `<option value="${l.id}">${l.name}</option>`).join("")

    const knockoutPhases = (phases || []).filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i)
    console.log("=== knockoutPhases ===")
    console.log("Fases disponibles:", knockoutPhases)
    
    const stageOptions = knockoutPhases.map(p => `<option value="${p.name}">${p.name}</option>`).join("")
    console.log("stageOptions HTML:", stageOptions)
    
    const phaseIdOptions = knockoutPhases.map(p => `<option value="${p.id}">${p.name}</option>`).join("")

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
            loadQualifiedTeams()
        })
    }
    const leagueSelect = document.getElementById("qualified-league-select")
    if (leagueSelect) {
        leagueSelect.addEventListener("change", loadQualifiedTeams)
    }
    document.getElementById("load-qualified-btn")?.addEventListener("click", loadQualifiedTeams)
}

function formatSlotLabelForQualifiedTeams(slot) {
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
    if (!grid) { return }
    if (!stage) { grid.innerHTML = "<p>Selecciona una etapa</p>"; return }

    const stageName = stage.toUpperCase()
    const requiresManualAssignment = stageName.includes("32")

    if (!requiresManualAssignment) {
        grid.innerHTML = `
            <div class="qualified-auto-notice">
                <p><strong>Esta fase no requiere asignación manual de equipos.</strong></p>
                <p>Los equipos se asignan automáticamente cuando se finalizan los partidos de la fase anterior.</p>
                <p>Puedes crear las plantillas directamente en la pestaña "Plantillas KO".</p>
            </div>
        `
        return
    }

    const hasMatches = await checkIfMatchesExist(leagueId, stage)

    let qualifiedQuery = supabase.from("qualified_teams").select("*").eq("stage", stage).order("slot_code")
    if (leagueId) qualifiedQuery = qualifiedQuery.eq("league_id", leagueId)
    const [qualified, teams, groups] = await Promise.all([
        qualifiedQuery,
        loadAllTeams(),
        loadAllGroups()
    ])

    console.warn("Qualified data:", qualified.data, "Stage used:", stage)

    const slots = getSlotsForStage(stage, groups)
    console.warn("Stage:", stage, "Slots:", slots, "Qualified count:", qualified.data?.length || 0)

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

    let noticeHtml = ""
    if (hasMatches) {
        noticeHtml = `
            <div class="qualified-auto-notice info">
                <p><strong>Ya hay partidos generados para esta etapa.</strong></p>
                <p>Al asignar equipos a los slots, los partidos se actualizarán automáticamente.</p>
            </div>
        `
    }

    grid.innerHTML = noticeHtml + slots.map(slot => {
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
                <div class="slot-code">${formatSlotLabelForQualifiedTeams(slot)}</div>
                <div class="slot-team">
                    ${team ? `
                        ${renderFlag(team, "team-flag")}
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

async function checkIfMatchesExist(leagueId, stage) {
    const { data, error } = await supabase
        .from("matches")
        .select("id")
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .limit(1)
    
    if (error) return false
    return data && data.length > 0
}

async function assignSlot(stage, slotCode, teamId) {
    const user = await checkAdmin();
    if (!user) return;

    const leagueId = document.getElementById("qualified-league-select")?.value
    if (!leagueId) { alert("Selecciona una liga"); return }

    const { data: existingData, error: existingError } = await supabase
        .from("qualified_teams")
        .select("id")
        .eq("league_id", leagueId)
        .eq("stage", stage)
        .eq("slot_code", slotCode)
        .limit(1)

    if (existingData && existingData.length > 0) {
        const { error } = await supabase
            .from("qualified_teams")
            .update({ team_id: teamId })
            .eq("id", existingData[0].id)
        if (error) alert("Error actualizando: " + error.message)
    } else {
        const { error } = await supabase
            .from("qualified_teams")
            .insert({ league_id: leagueId, stage, slot_code: slotCode, team_id: teamId })
        if (error) alert("Error insertando: " + error.message)
    }

    await refreshMatchesUsingSlot(leagueId, stage, slotCode, teamId)
}

async function refreshMatchesUsingSlot(leagueId, stage, slotCode, teamId) {
    const { data: matches } = await supabase
        .from("matches")
        .select("id, home_slot, away_slot")
        .eq("league_id", leagueId)
        .eq("stage", stage)
    
    if (!matches) return

    for (const match of matches) {
        const updates = {}
        
        if (match.home_slot === slotCode) {
            updates.home_team_id = teamId
        }
        
        if (match.away_slot === slotCode) {
            updates.away_team_id = teamId
        }
        
        if (Object.keys(updates).length > 0) {
            await supabase
                .from("matches")
                .update(updates)
                .eq("id", match.id)
        }
    }
}

async function removeSlot(stage, slotCode) {
    const user = await checkAdmin();
    if (!user) return;

    const leagueId = document.getElementById("qualified-league-select")?.value
    if (!leagueId) { alert("Selecciona una liga"); return }
    let query = supabase.from("qualified_teams").delete()
        .eq("stage", stage).eq("slot_code", slotCode)
    if (leagueId) query = query.eq("league_id", leagueId)
    const { error } = await query
    if (error) alert("Error eliminando: " + error.message)

    await refreshMatchesUsingSlot(leagueId, stage, slotCode, null)
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

    let query = supabase.from("knockout_templates").select("*").eq("stage", stage).order("match_order")
    if (leagueId) query = query.eq("league_id", leagueId)

    const { data, error } = await query

    if (error) { alert("Error cargando: " + error.message); return }

    const grid = document.getElementById("templates-grid")
    if (!grid) return

    if (!data?.length) {
        grid.innerHTML = `<p class="empty-state">Sin plantillas para ${stage}. Agrega las combinaciones de slots.</p>`
        return
    }

    const teams = await loadAllTeams()
    const teamsMap = new Map(teams.map(t => [t.id, t]))

    const resolvedSlots = new Map()
    for (const t of data) {
        if (!resolvedSlots.has(t.home_slot)) {
            const teamId = await resolveSlotToTeamId(leagueId, stage, t.home_slot)
            resolvedSlots.set(t.home_slot, teamId)
        }
        if (!resolvedSlots.has(t.away_slot)) {
            const teamId = await resolveSlotToTeamId(leagueId, stage, t.away_slot)
            resolvedSlots.set(t.away_slot, teamId)
        }
    }

    // Formatear las etiquetas de los slots
    const formattedSlots = await Promise.all(data.map(async t => {
        const homeSlotLabel = await formatSlotLabel(t.home_slot, leagueId)
        const awaySlotLabel = await formatSlotLabel(t.away_slot, leagueId)
        return { ...t, homeSlotLabel, awaySlotLabel }
    }))

    grid.innerHTML = formattedSlots.map(t => {
        const homeSlotTeam = resolvedSlots.get(t.home_slot)
        const awaySlotTeam = resolvedSlots.get(t.away_slot)
        const homeTeam = homeSlotTeam ? teamsMap.get(homeSlotTeam) : null
        const awayTeam = awaySlotTeam ? teamsMap.get(awaySlotTeam) : null
        const homeLabel = homeTeam?.name || t.homeSlotLabel
        const awayLabel = awayTeam?.name || t.awaySlotLabel
        return `
            <div class="template-card">
                <span class="match-order">#${t.match_order}</span>
                <div class="match-info">
                    <div class="match-team">
                        <span class="slot-badge">${t.homeSlotLabel}</span>
                        <span class="team-name">${homeLabel}</span>
                    </div>
                    <span class="vs-label">vs</span>
                    <div class="match-team">
                        <span class="slot-badge">${t.awaySlotLabel}</span>
                        <span class="team-name">${awayLabel}</span>
                    </div>
                </div>
                <button class="btn-delete-template" data-id="${t.id}">×</button>
            </div>`
    }).join("")

    grid.querySelectorAll(".btn-delete-template").forEach(btn => {
        btn.addEventListener("click", async () => {
            const adminUser = await checkAdmin();
            if (!adminUser) return;

            if (!confirm("Eliminar esta plantilla?")) return
            const { error } = await supabase.from("knockout_templates").delete().eq("id", btn.dataset.id)
            if (error) alert("Error eliminando: " + error.message)
            else loadTemplates()
        })
    })
}

async function showAddTemplateModal() {
    const stage = document.getElementById("template-stage-select")?.value
    const leagueId = document.getElementById("template-league-select")?.value
    const slots = getSlotsForStage(stage)
    const nextOrder = document.querySelectorAll(".template-card").length + 1

    // Formatear las etiquetas de los slots
    const formattedSlots = await Promise.all(slots.map(async s => {
        const label = await formatSlotLabel(s, leagueId)
        return { value: s, label }
    }))

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
                <select id="template-home-slot">${formattedSlots.map(s => `<option value="${s.value}">${s.label}</option>`).join("")}</select>
            </div>
            <div class="form-group">
                <label>Slot Visitante:</label>
                <select id="template-away-slot">${formattedSlots.map(s => `<option value="${s.value}">${s.label}</option>`).join("")}</select>
            </div>
            <div class="modal-actions">
                <button id="save-template-btn" class="btn-primary">Guardar</button>
                <button id="cancel-template-btn" class="btn-secondary">Cancelar</button>
            </div>
        </div>`

    document.body.appendChild(modal)
    modal.querySelector("#cancel-template-btn").addEventListener("click", () => modal.remove())
    modal.querySelector("#save-template-btn").addEventListener("click", async () => {
        const adminUser = await checkAdmin();
        if (!adminUser) { modal.remove(); return; }

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
    console.log("=== initGenerateHandlers ===")
    console.log("generate-stage element:", document.getElementById("generate-stage"))
    console.log("generate-league-select element:", document.getElementById("generate-league-select"))
    
    document.getElementById("generate-btn")?.addEventListener("click", handleGenerate)
    const stageSelect = document.getElementById("generate-stage")
    if (stageSelect) {
        console.log("Agregando event listener a generate-stage")
        stageSelect.addEventListener("change", () => {
            console.log("=== Cambio detectado en generate-stage ===")
            console.log("Nuevo valor:", stageSelect.value)
            loadGeneratePreview()
        })
    }
    const leagueSelect = document.getElementById("generate-league-select")
    if (leagueSelect) {
        leagueSelect.addEventListener("change", () => loadGeneratePreview())
    }
}

async function loadGeneratePreview() {
    const stage = document.getElementById("generate-stage")?.value
    const leagueId = document.getElementById("generate-league-select")?.value
    const preview = document.getElementById("generate-preview")
    
    console.log("=== loadGeneratePreview ===")
    console.log("Stage seleccionado:", stage)
    console.log("League ID:", leagueId)
    
    if (!stage || !preview) return

    let query = supabase.from("knockout_templates").select("*").eq("stage", stage).order("match_order")
    if (leagueId) query = query.eq("league_id", leagueId)

    const { data: templates, error } = await query
    
    console.log("Plantillas encontradas:", templates?.length || 0)
    console.log("Templates:", templates)
    
    if (error) { 
        console.error("Error en consulta:", error)
        preview.innerHTML = `<p class="error">Error: ${error.message}</p>`
        return 
    }

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

    const teams = await loadAllTeams()
    const teamsMap = new Map(teams.map(t => [t.id, t]))

    const resolvedSlots = new Map()
    for (const t of templates) {
        if (!resolvedSlots.has(t.home_slot)) {
            const teamId = await resolveSlotToTeamId(leagueId, stage, t.home_slot)
            resolvedSlots.set(t.home_slot, teamId)
        }
        if (!resolvedSlots.has(t.away_slot)) {
            const teamId = await resolveSlotToTeamId(leagueId, stage, t.away_slot)
            resolvedSlots.set(t.away_slot, teamId)
        }
    }

    // Formatear las etiquetas de los slots
    const formattedTemplates = await Promise.all(templates.map(async t => {
        const homeSlotLabel = await formatSlotLabel(t.home_slot, leagueId)
        const awaySlotLabel = await formatSlotLabel(t.away_slot, leagueId)
        return { ...t, homeSlotLabel, awaySlotLabel }
    }))

    console.log("Formatted templates:", formattedTemplates)

    const previewHtml = `
        <h4>Partidos (${formattedTemplates.length}):</h4>
        <div class="preview-matches">
            ${formattedTemplates.map(t => {
                const homeTeamId = resolvedSlots.get(t.home_slot)
                const awayTeamId = resolvedSlots.get(t.away_slot)
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
                const homeLabel = homeTeam?.name || t.homeSlotLabel
                const awayLabel = awayTeam?.name || t.awaySlotLabel
                return `
                    <div class="preview-match">
                        <span class="preview-order">#${t.match_order}</span>
                        <div class="preview-teams">
                            <div class="preview-team">
                                <span class="slot-badge-sm">${t.homeSlotLabel}</span>
                                <span>${homeLabel}</span>
                            </div>
                            <span class="preview-vs">vs</span>
                            <div class="preview-team">
                                <span class="slot-badge-sm">${t.awaySlotLabel}</span>
                                <span>${awayLabel}</span>
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

    console.log("HTML a renderizar:", previewHtml)
    preview.innerHTML = previewHtml
}

async function handleGenerate() {
    const user = await checkAdmin();
    if (!user) return;

    const stage = document.getElementById("generate-stage")?.value
    const phaseId = document.getElementById("generate-phase")?.value
    const leagueId = document.getElementById("generate-league-select")?.value

    if (!stage || !phaseId || !leagueId) {
        alert("Completa todos los campos"); return
    }

    console.warn("Generating with stage:", stage, "phaseId:", phaseId, "leagueId:", leagueId)

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
        console.warn("Using leagueId:", leagueId)

        let templatesQuery = supabase.from("knockout_templates").select("*").eq("stage", stage).order("match_order")
        if (leagueId) templatesQuery = templatesQuery.eq("league_id", leagueId)
        const { data: templates } = await templatesQuery

        const { data: lastMatch } = await supabase
            .from("matches")
            .select("match_number")
            .order("match_number", { ascending: false })
            .limit(1)

        const nextMatchNumber = (lastMatch?.[0]?.match_number || 0) + 1

        const matches = []
        for (let i = 0; i < templates.length; i++) {
            const t = templates[i]
            const homeSlot = t.home_slot
            const awaySlot = t.away_slot
            const matchDate = matchDateMap.get(`${homeSlot}-${awaySlot}`)

            if (!matchDate) continue

            const homeTeamId = await resolveSlotToTeamId(leagueId, stage, homeSlot)
            const awayTeamId = await resolveSlotToTeamId(leagueId, stage, awaySlot)

            matches.push({
                league_id: leagueId,
                phase_id: phaseId,
                stage,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                home_slot: homeSlot,
                away_slot: awaySlot,
                status: "scheduled",
                match_date: matchDate,
                group_id: null,
                bracket_position: t.match_order,
                match_number: nextMatchNumber + matches.length
            })
        }

        if (!matches.length) throw new Error("No hay partidos para generar. Verifica las plantillas y fechas.")

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
                await supabase.from("matches").update({
                    match_date: match.match_date,
                    home_team_id: match.home_team_id,
                    away_team_id: match.away_team_id,
                    bracket_position: match.bracket_position
                }).eq("id", existingMap.get(key))
                updated++
            } else {
                await supabase.from("matches").insert(match)
                created++
            }
        }

        result.innerHTML = `<p class="success">✓ ${created} creados, ${updated} actualizados</p>`
        
        // Limpiar la caché de etiquetas de slots para que se actualicen
        clearSlotLabelCache()
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
        console.warn("Leagues query result:", data, error)
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

    if (name.includes("32")) {
        return [
            ...groups.flatMap(g => [`${g}1`, `${g}2`]),
            "THIRD_1","THIRD_2","THIRD_3","THIRD_4",
            "THIRD_5","THIRD_6","THIRD_7","THIRD_8"
        ]
    }
    if (name.includes("OCTAVOS") || name.includes("ROUND_OF_16")) {
        return ["R32_1","R32_2","R32_3","R32_4","R32_5","R32_6","R32_7","R32_8",
                "R32_9","R32_10","R32_11","R32_12","R32_13","R32_14","R32_15","R32_16"]
    }
    if (name.includes("CUARTOS") || name.includes("QUARTER")) {
        return ["R16_1","R16_2","R16_3","R16_4","R16_5","R16_6","R16_7","R16_8"]
    }
    if (name.includes("SEMI") && !name.includes("3ER") && !name.includes("TERCER")) {
        return ["QF_1","QF_2","QF_3","QF_4"]
    }
    if (name.includes("3ER") || name.includes("TERCER")) {
        return ["L_SF_1","L_SF_2"]
    }
    if (name.includes("FINAL") && !name.includes("SEMI")) {
        return ["SF_1","SF_2"]
    }
    return []
}

// Función para limpiar la caché de etiquetas de slots
export function clearSlotLabelCache() {
    slotLabelCache.clear()
    console.log('Slot label cache cleared')
}

async function getPhaseByName(name) {
    const { data, error } = await supabase
        .from("phases")
        .select("id, name")
        .eq("name", name)
        .limit(1)
    
    if (error || !data || data.length === 0) return null
    return data[0]
}

async function resolveSlotToTeamId(leagueId, stage, slotCode) {
    if (slotCode.match(/^[A-L][12]$/) || slotCode.startsWith("THIRD_")) {
        const { data, error } = await supabase
            .from("qualified_teams")
            .select("team_id")
            .eq("league_id", leagueId)
            .eq("stage", stage)
            .eq("slot_code", slotCode)
            .limit(1)
        
        if (error || !data || data.length === 0) return null
        return data[0].team_id
    }

    let phaseName = null

    if (slotCode.startsWith("R32_")) {
        phaseName = "Eliminatoria de 32"
    } else if (slotCode.startsWith("R16_")) {
        phaseName = "Octavos de final"
    } else if (slotCode.startsWith("QF_")) {
        phaseName = "Cuartos de final"
    } else if (slotCode.startsWith("SF_")) {
        phaseName = "Semifinal"
    } else if (slotCode.startsWith("L_SF_")) {
        phaseName = "Semifinal"
    }

    if (!phaseName) return null

    const phase = await getPhaseByName(phaseName)
    if (!phase) return null

    let position
    if (slotCode.startsWith("L_SF_")) {
        position = parseInt(slotCode.split("_")[2])
    } else {
        position = parseInt(slotCode.split("_")[1])
    }

    const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, home_score, away_score, status")
        .eq("phase_id", phase.id)
        .eq("bracket_position", position)
        .limit(1)

    if (matchError || !matchData || matchData.length === 0) return null
    const match = matchData[0]

    if (!match || match.status !== "finished") return null

    const isLoser = slotCode.startsWith("L_SF_")

    if (isLoser) {
        if (match.home_score < match.away_score) return match.home_team_id
        if (match.away_score < match.home_score) return match.away_team_id
        return null
    }

    if (match.home_score > match.away_score) return match.home_team_id
    if (match.away_score > match.home_score) return match.away_team_id
    return null
}