import { loadNavbar, renderNavbarUser } from "/js/components/navbar.js"
import { getProfile, updateUsername, uploadAvatar } from "/js/services/profile.js"
import { getUserRank } from "/js/services/ranking.js"
import { getExactCount } from "/js/services/ranking.js"
import { supabase } from "/config/supabase.js"

let currentUser = null

async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        window.location.href = "/login.html"
        return
    }
    currentUser = user

    const { data: profile } = await getProfile(user.id)
    if (!profile) return

    const avatarSrc = profile.avatar_url
        ? profile.avatar_url.startsWith('http')
            ? profile.avatar_url
            : `/assets/images/${profile.avatar_url}`
        : "/assets/images/avatar.png"
    document.getElementById("avatarPreview").src = avatarSrc

    document.getElementById("displayUsername").textContent = profile.user_name || "Usuario"
    document.getElementById("displayEmail").textContent = user.email || ""

    if (profile.country_code) {
        const res = await fetch("/data/countries.json")
        const countries = await res.json()
        const country = countries.find(c => c.code === profile.country_code)
        document.getElementById("displayCountry").textContent = country
            ? `${country.flag} ${country.name}`
            : profile.country_code
    }

    const { rank } = await getUserRank(user.id)
    document.getElementById("statRank").textContent = `#${rank || '--'}`

    if (profile.points) {
        document.getElementById("statPoints").textContent = profile.points.toLocaleString()
    }

    const exactCount = await getExactCount(user.id)
    document.getElementById("statExact").textContent = exactCount || 0
}

document.getElementById("editAvatarBtn")?.addEventListener("click", () => {
    document.getElementById("avatarForm").classList.toggle("active")
})

document.getElementById("editUsernameBtn")?.addEventListener("click", () => {
    const form = document.getElementById("usernameForm")
    const input = document.getElementById("usernameInput")
    form.classList.toggle("active")
    if (form.classList.contains("active")) {
        input.value = document.getElementById("displayUsername").textContent
        input.focus()
    }
})

document.getElementById("usernameForm")?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const newUsername = document.getElementById("usernameInput").value.trim()
    if (!newUsername) return

    try {
        const { error } = await updateUsername(currentUser.id, newUsername)
        if (error) throw error

        document.getElementById("displayUsername").textContent = newUsername
        document.getElementById("usernameForm").classList.remove("active")
        await renderNavbarUser()
    } catch (err) {
        alert("Error al actualizar: " + err.message)
    }
})

document.getElementById("cancelUsernameBtn")?.addEventListener("click", () => {
    document.getElementById("usernameForm").classList.remove("active")
})

document.getElementById("avatarInput")?.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
        document.getElementById("avatarPreview").src = ev.target.result
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
        document.getElementById("avatarForm").classList.remove("active")
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
    await loadNavbar()
    await loadProfile()
    await renderNavbarUser()
})