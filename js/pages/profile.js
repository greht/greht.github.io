import { loadNavbar, renderNavbarUser } from "/js/components/navbar.js"
import { getProfile, updateUsername, uploadAvatar } from "/js/services/profile.js"
import { getUserRank } from "/js/services/ranking.js"
import { getExactCount } from "/js/services/ranking.js"
import { supabase } from "/config/supabase.js"
import { requireAuth } from "/js/services/auth.js"

let currentUser = null

async function loadProfile() {
    const authResult = await requireAuth("/login.html")
    if (!authResult) return

    currentUser = authResult.user

    const { data: profile } = await getProfile(currentUser.id)
    if (!profile) return

    const avatarSrc = profile.avatar_url
        ? profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `/assets/images/${profile.avatar_url}`
        : "/assets/images/avatar.png"
    document.getElementById("avatarPreview").src = avatarSrc
    document.getElementById("usernameModalAvatar").src = avatarSrc

    document.getElementById("displayUsername").textContent = profile.user_name || "Usuario"
    document.getElementById("displayEmail").textContent = currentUser.email || ""

    if (profile.country_code) {
        const res = await fetch("/data/countries.json")
        const countries = await res.json()
        const country = countries.find(c => c.code === profile.country_code)
        document.getElementById("displayCountry").textContent = country
            ? `${country.flag} ${country.name}`
            : profile.country_code
    }

    const { rank } = await getUserRank(currentUser.id)
    document.getElementById("statRank").textContent = `#${rank || '--'}`

    if (profile.points) {
        document.getElementById("statPoints").textContent = profile.points.toLocaleString()
    }

    const exactCount = await getExactCount(currentUser.id)
    document.getElementById("statExact").textContent = exactCount || 0
}

function openAvatarModal() {
    const modal = document.getElementById("avatarModalOverlay")
    const currentSrc = document.getElementById("avatarPreview").src
    document.getElementById("avatarModalPreview").src = currentSrc
    document.getElementById("avatarInput").value = ""
    modal.classList.add("active")
    document.getElementById("avatarForm").classList.add("active")
    document.body.style.overflow = "hidden"
}

function closeAvatarModal() {
    const modal = document.getElementById("avatarModalOverlay")
    modal.classList.remove("active")
    document.getElementById("avatarForm").classList.remove("active")
    document.body.style.overflow = ""
}

document.getElementById("editAvatarBtn")?.addEventListener("click", openAvatarModal)

document.getElementById("avatarModalClose")?.addEventListener("click", closeAvatarModal)

document.getElementById("cancelAvatarBtn")?.addEventListener("click", closeAvatarModal)

document.getElementById("avatarModalOverlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeAvatarModal()
})

function openUsernameModal() {
    const modal = document.getElementById("usernameModalOverlay")
    const input = document.getElementById("usernameInput")
    const avatarSrc = document.getElementById("avatarPreview").src
    document.getElementById("usernameModalAvatar").src = avatarSrc
    input.value = document.getElementById("displayUsername").textContent
    modal.classList.add("active")
    document.getElementById("usernameForm").classList.add("active")
    document.body.style.overflow = "hidden"
    setTimeout(() => input.focus(), 100)
}

function closeUsernameModal() {
    const modal = document.getElementById("usernameModalOverlay")
    modal.classList.remove("active")
    document.getElementById("usernameForm").classList.remove("active")
    document.body.style.overflow = ""
}

document.getElementById("editUsernameBtn")?.addEventListener("click", openUsernameModal)

document.getElementById("usernameModalClose")?.addEventListener("click", closeUsernameModal)

document.getElementById("usernameModalOverlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeUsernameModal()
})

document.getElementById("usernameForm")?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const newUsername = document.getElementById("usernameInput").value.trim()
    if (!newUsername) return

    try {
        const { error } = await updateUsername(currentUser.id, newUsername)
        if (error) throw error

        document.getElementById("displayUsername").textContent = newUsername
        closeUsernameModal()
        await renderNavbarUser()
    } catch (err) {
        alert("Error al actualizar: " + err.message)
    }
})

document.getElementById("cancelUsernameBtn")?.addEventListener("click", closeUsernameModal)

document.getElementById("avatarInput")?.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
        document.getElementById("avatarPreview").src = ev.target.result
        document.getElementById("avatarModalPreview").src = ev.target.result
    }
    reader.readAsDataURL(file)
})

document.getElementById("avatarForm")?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const file = document.getElementById("avatarInput").files[0]
    if (!file) return

    try {
        await uploadAvatar(file, currentUser.id)
        await loadProfile()
        await renderNavbarUser()
        alert("Foto actualizada con éxito")
        closeAvatarModal()
    } catch (err) {
        alert("Error al subir la foto: " + err.message)
    }
})

document.getElementById("passwordForm")?.addEventListener("submit", async (e) => {
    e.preventDefault()

    const newPassword = document.getElementById("newPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value

    if (newPassword !== confirmPassword) {
        const msg = document.getElementById("passwordMessage")
        msg.className = "error-message"
        msg.textContent = "Las contraseñas no coinciden"
        return
    }

    if (newPassword.length < 8) {
        const msg = document.getElementById("passwordMessage")
        msg.className = "error-message"
        msg.textContent = "La nueva contraseña debe tener al menos 8 caracteres"
        return
    }

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (error) throw error

        document.getElementById("passwordForm").reset()
        const msg = document.getElementById("passwordMessage")
        msg.className = "success-message"
        msg.textContent = "Contraseña actualizada con éxito"
    } catch (err) {
        const msg = document.getElementById("passwordMessage")
        msg.className = "error-message"
        msg.textContent = "Error: " + err.message
    }
})

document.getElementById("cancelPasswordBtn")?.addEventListener("click", () => {
    document.getElementById("passwordForm").reset()
    document.getElementById("passwordMessage").textContent = ""
})

document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target)
        if (input.type === "password") {
            input.type = "text"
            btn.textContent = "🙈"
        } else {
            input.type = "password"
            btn.textContent = "👁️"
        }
    })
})

document.addEventListener("DOMContentLoaded", async () => {
    await loadProfile()
})