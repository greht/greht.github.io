import { signIn } from "./services/auth.js"

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm")

    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        const email = document.getElementById("email").value
        const password = document.getElementById("password").value

        const { data, error } = await signIn(email, password)

        if (error) {
            alert(error.message)
            return
        }

        // redirigir
        window.location.href = "/dashboard.html"
    })

})