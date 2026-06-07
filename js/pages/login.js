import { signIn } from "/js/services/auth.js"

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm")

    if (!form) return

    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        const email = document.getElementById("email").value
        const password = document.getElementById("password").value

        try {
            const { data, error } = await signIn(email, password)

            if (error) {
                alert(error.message)
                return
            }

            // Redirect to dashboard on success
            window.location.href = "dashboard.html"

        } catch (err) {
            alert("Error: " + err.message)
        }
    })
})