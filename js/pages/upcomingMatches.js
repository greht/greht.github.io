import { supabase } from "/config/supabase.js"

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

const track = document.getElementById("carouselTrack")
const dotsContainer = document.getElementById("carouselDots")

let currentIndex = 0
let slides = []
let autoTimer = null

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function formatDate(dateStr) {
    const d = new Date(dateStr)
    const day = DAYS[d.getUTCDay()]
    const num = d.getUTCDate()
    const month = MONTHS[d.getUTCMonth()]
    const h = String(d.getUTCHours()).padStart(2, "0")
    const m = String(d.getUTCMinutes()).padStart(2, "0")
    return `${day} ${num} ${month} • ${h}:${m}`
}

function buildSlide(match) {
    const homeName = match.home_team?.name || "TBD"
    const awayName = match.away_team?.name || "TBD"
    const homeFlag = resolveFlagUrl(match.home_team?.flag_url)
    const awayFlag = resolveFlagUrl(match.away_team?.flag_url)
    const dateStr = formatDate(match.match_date)
    const phaseName = match.phase?.name || ""
    const groupName = match.group?.name || ""

    const slide = document.createElement("div")
    slide.className = "carousel-slide"
    slide.innerHTML = `
        <div class="match-card">
            <div class="card-header">
                <span class="card-header-title">Próximos partidos</span>
                <div class="card-header-meta">
                    ${phaseName ? `<span class="match-phase">${phaseName}</span>` : ""}
                    ${groupName ? `<span class="match-group">${groupName}</span>` : ""}
                    <span class="match-date">${dateStr}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="team">
                    <img src="${homeFlag}" alt="${homeName}">
                    <span>${homeName}</span>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <img src="${awayFlag}" alt="${awayName}">
                    <span>${awayName}</span>
                </div>
            </div>
        </div>
    `
    return slide
}

function goTo(index) {
    if (slides.length === 0) return
    currentIndex = ((index % slides.length) + slides.length) % slides.length
    track.style.transform = `translateX(-${currentIndex * 100}%)`
    updateDots()
}

function updateDots() {
    dotsContainer.querySelectorAll(".carousel-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === currentIndex)
    })
}

function renderDots(count) {
    dotsContainer.innerHTML = ""
    for (let i = 0; i < count; i++) {
        const dot = document.createElement("button")
        dot.className = "carousel-dot" + (i === 0 ? " active" : "")
        dot.setAttribute("aria-label", `Partido ${i + 1}`)
        dot.addEventListener("click", () => {
            goTo(i)
            resetAuto()
        })
        dotsContainer.appendChild(dot)
    }
}

function resetAuto() {
    clearInterval(autoTimer)
    autoTimer = setInterval(() => goTo(currentIndex + 1), 10000)
}

function renderEmpty() {
    track.innerHTML = `
        <div class="carousel-slide">
            <div class="match-card">
                <div class="card-title">
                    <span class="title-left">Próximos partidos</span>
                    <span class="title-right">Predicciones</span>
                </div>
                <div class="card-body" style="justify-content: center;">
                    <p style="color: var(--color-text-secundary); font-size: 14px;">No hay partidos programados</p>
                </div>
            </div>
        </div>
    `
    dotsContainer.innerHTML = ""
}

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { goTo(currentIndex - 1); resetAuto() }
    if (e.key === "ArrowRight") { goTo(currentIndex + 1); resetAuto() }
})

let touchStartX = 0
track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX }, { passive: true })
track.addEventListener("touchend", (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
        diff > 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1)
        resetAuto()
    }
})

async function init() {
    const { data: matches, error } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "scheduled")
        .order("match_date", { ascending: true })
        .limit(5)

    if (error || !matches || matches.length === 0) {
        renderEmpty()
        return
    }

    const teamIds = [...new Set(matches.flatMap(m => [m.home_team_id, m.away_team_id]))]
    const phaseIds = [...new Set(matches.map(m => m.phase_id).filter(Boolean))]
    const groupIds = [...new Set(matches.map(m => m.group_id).filter(Boolean))]

    const { data: teams } = await supabase
        .from("teams")
        .select("id, name, flag_url, fifa_code")
        .in("id", teamIds)

    const { data: phases } = await supabase
        .from("phases")
        .select("id, name")
        .in("id", phaseIds)

    const { data: groups } = await supabase
        .from("groups")
        .select("id, name")
        .in("id", groupIds)

    const teamsMap = new Map(teams?.map(t => [t.id, t]) || [])
    const phasesMap = new Map(phases?.map(p => [p.id, p]) || [])
    const groupsMap = new Map(groups?.map(g => [g.id, g]) || [])

    const enriched = matches.map(m => ({
        ...m,
        home_team: teamsMap.get(m.home_team_id) || null,
        away_team: teamsMap.get(m.away_team_id) || null,
        phase: phasesMap.get(m.phase_id) || null,
        group: groupsMap.get(m.group_id) || null
    }))

    track.innerHTML = ""
    slides = enriched.map(m => {
        const slide = buildSlide(m)
        track.appendChild(slide)
        return slide
    })

    renderDots(slides.length)
    resetAuto()
}

init()
