import { resetPasswordForEmail } from "/js/services/auth.js"

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgotForm")
    const message = document.getElementById("forgotMessage")
    const btn = document.getElementById("btnSubmit")

    if (!form) return

    const btnOriginalHTML = btn.innerHTML
    let isSubmitting = false

    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        if (isSubmitting) return
        isSubmitting = true
        btn.disabled = true
        btn.innerHTML = "Enviando..."
        message.innerHTML = ""

        const email = document.getElementById("email").value.trim()

        if (!email) {
            message.innerHTML = '<div class="error-message">Ingresa tu correo electrónico</div>'
            isSubmitting = false
            btn.disabled = false
            btn.innerHTML = btnOriginalHTML
            return
        }

        try {
            const { error } = await resetPasswordForEmail(email)

            if (error) {
                message.innerHTML = `<div class="error-message">${error.message}</div>`
                isSubmitting = false
                btn.disabled = false
                btn.innerHTML = btnOriginalHTML
                return
            }

            message.innerHTML = '<div class="success-message">Te enviamos un enlace a tu correo para restablecer tu contraseña. Revisa tu bandeja de entrada.</div>'
            btn.innerHTML = "Enlace enviado"

        } catch (err) {
            message.innerHTML = `<div class="error-message">Error: ${err.message}</div>`
            isSubmitting = false
            btn.disabled = false
            btn.innerHTML = btnOriginalHTML
        }
    })
})
