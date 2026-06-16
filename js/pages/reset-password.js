import { updatePassword } from "/js/services/auth.js"

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("resetForm")
    const message = document.getElementById("resetMessage")
    const btn = document.getElementById("btnSubmit")

    if (!form) return

    document.querySelectorAll(".toggle-password").forEach((toggleBtn) => {
        toggleBtn.addEventListener("click", () => {
            const targetId = toggleBtn.dataset.target
            const input = document.getElementById(targetId)
            if (input) {
                if (input.type === "password") {
                    input.type = "text"
                    btn.classList.add("show-password")
                } else {
                    input.type = "password"
                    btn.classList.remove("show-password")
                }
            }
        })
    })

    const btnOriginalHTML = btn.innerHTML
    let isSubmitting = false

    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        if (isSubmitting) return
        isSubmitting = true
        btn.disabled = true
        btn.innerHTML = "Actualizando..."
        message.innerHTML = ""

        const password = document.getElementById("password").value
        const confirmPassword = document.getElementById("confirmPassword").value

        if (!password || password.length < 8) {
            message.innerHTML = '<div class="error-message">La contraseña debe tener al menos 8 caracteres</div>'
            isSubmitting = false
            btn.disabled = false
            btn.innerHTML = btnOriginalHTML
            return
        }

        if (password !== confirmPassword) {
            message.innerHTML = '<div class="error-message">Las contraseñas no coinciden</div>'
            isSubmitting = false
            btn.disabled = false
            btn.innerHTML = btnOriginalHTML
            return
        }

        try {
            const { error } = await updatePassword(password)

            if (error) {
                message.innerHTML = `<div class="error-message">${error.message}</div>`
                isSubmitting = false
                btn.disabled = false
                btn.innerHTML = btnOriginalHTML
                return
            }

            message.innerHTML = '<div class="success-message">Tu contraseña ha sido actualizada correctamente. Redirigiendo al inicio de sesión...</div>'
            btn.innerHTML = "Contraseña actualizada"

            setTimeout(() => {
                window.location.href = "login.html"
            }, 3000)

        } catch (err) {
            message.innerHTML = `<div class="error-message">Error: ${err.message}</div>`
            isSubmitting = false
            btn.disabled = false
            btn.innerHTML = btnOriginalHTML
        }
    })
})
