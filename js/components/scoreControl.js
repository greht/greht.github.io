import { updateProgress } from "../utils/progress.js";

export function initScoreControls() {
    document.querySelectorAll(".score-control").forEach(control => {
        const input = control.querySelector(".score-input");
        const plus = control.querySelector(".plus");
        const minus = control.querySelector(".minus");

        if (!input || !plus || !minus) return;

        plus.addEventListener("click", () => {
            const isEmpty = !input.value || input.value === "";
            if (isEmpty) {
                input.value = 0;
            } else {
                let value = parseInt(input.value) || 0;
                if (value < 20) {
                    input.value = value + 1;
                }
            }
            input.dispatchEvent(new Event("input"));
        });

        minus.addEventListener("click", () => {
            let value = parseInt(input.value) || 0;
            if (value > 0) {
                input.value = value - 1;
            }
            input.dispatchEvent(new Event("input"));
        });

        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            if (parseInt(input.value) > 20) input.value = 20;

            updateProgress();
        });
    });
}