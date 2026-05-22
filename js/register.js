import { signUp } from "/js/services/auth.js"
import { insertConsents } from "/js/services/consents.js"

document.addEventListener("DOMContentLoaded", () => {

    let isSubmitting = false

    const form = document.getElementById("registerForm")

    if (!form) {
        console.error("❌ Formulario no encontrado")
        return
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault()

        if (isSubmitting) return
        isSubmitting = true

        // INPUTS
        const username = document.getElementById("username").value
        const email = document.getElementById("email").value
        const country = document.getElementById("country").value
        const password = document.getElementById("password").value
        const repeatPassword = document.getElementById("repeat-password").value

        // CHECKBOXES
        const checkboxes = document.querySelectorAll("input[type='checkbox']")
        const age = checkboxes[0].checked
        const terms = checkboxes[1].checked

        // VALIDACIONES
        if (password !== repeatPassword) {
            alert("Las contraseñas no coinciden")
            isSubmitting = false
            return
        }

        if (!age || !terms) {
            alert("Debes aceptar los consentimientos")
            isSubmitting = false
            return
        }

        try {

            const { data, error } = await signUp(email, password, username, country, age, terms)

            if (error) {
                alert(error.message)
                return
            }

            alert("Usuario creado. Revisa tu correo para confirmar la cuenta.")

        } catch (err) {

            alert("Error al registrar usuario")

        } finally {

            isSubmitting = false

        }
    })
})