import { signUp } from "/js/services/auth.js"
import { insertConsents } from "/js/services/consents.js"

async function loadCountries() {
    try {
        const res = await fetch("/data/countries.json")
        const countries = await res.json()
        const select = document.getElementById("country")

        countries.forEach(c => {
            const option = document.createElement("option")
            option.value = c.code
            option.textContent = `${c.flag} ${c.name}`
            select.appendChild(option)
        })
    } catch (err) {
        console.error("Error loading countries:", err)
    }
}

document.addEventListener("DOMContentLoaded", () => {

    loadCountries()

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
                if (error.message.includes("User already registered")) {
                    alert("Parece que este correo ya forma parte de PredictiLab ⚽\nInicia sesión para continuar o intenta con otro correo.")
                } else {
                    alert(error.message)
                }
                return
            }

            alert("Usuario creado. Ya puedes iniciar sesión en tu cuenta. 🥳")
            
            document.getElementById("registerForm").reset()
            window.location.href = "login.html"

        } catch (err) {

            alert("Error al registrar usuario")

        } finally {

            isSubmitting = false

        }
    })
})