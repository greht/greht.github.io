import { signUp } from "/js/services/auth.js"
import { insertConsents } from "/js/services/consents.js"


console.log("📝 Script de registro cargado")

document.addEventListener("DOMContentLoaded", () => {

    let isSubmitting = false

    console.log("📝 DOM listo")

    const form = document.getElementById("registerForm")

    if (!form) {
        console.error("❌ Formulario no encontrado")
        return
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault()

        if (isSubmitting) return
        isSubmitting = true

        console.log("🚀 CLICK REGISTRO DETECTADO")

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
                console.error("❌ Error auth:", error)
                alert(error.message)
                return
            }

            console.log("✅ Usuario creado:", data.user)

            // Guardar consentimientos
            // await insertConsents(data.user.id)

            alert("Usuario creado 🎉 Revisa tu correo para confirmar la cuenta.")

        } catch (err) {

            console.error("❌ Error general:", err)

        } finally {

            isSubmitting = false

        }
    })
})