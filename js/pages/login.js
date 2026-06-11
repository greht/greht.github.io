import { signIn } from "/js/services/auth.js"

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm")

    if (!form) return

    document.querySelectorAll(".toggle-password").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target
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