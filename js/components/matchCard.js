export function initMatchCards() {
    document.querySelectorAll(".match-card").forEach(card => {

        const inputs = card.querySelectorAll(".score-input");
        const statusText = card.querySelector(".status-text");

        if (!statusText) return;

        let timeout = null;
        let hasSaved = false;

        inputs.forEach(input => {
            input.addEventListener("input", () => {

                card.classList.add("saving");
                input.value = input.value.replace(/[^0-9]/g, '');

                const values = Array.from(inputs).map(i => i.value);
                const empty = values.every(v => v === "");

                if (empty) {
                    statusText.textContent = "Sin registrar datos";
                    card.classList.remove("saving");
                    return;
                }

                statusText.textContent = "Guardando...";

                clearTimeout(timeout);

                timeout = setTimeout(() => {
                    statusText.textContent = hasSaved ? "Actualizado ✓" : "Guardado ✓";
                    hasSaved = true;
                    card.classList.remove("saving");
                }, 1000);
            });
        });
    });
}