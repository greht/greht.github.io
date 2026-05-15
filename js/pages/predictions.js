import { loadNavbar } from "../components/navbar.js";
import { updateProgress } from "../utils/progress.js";
import { initScoreControls } from "../components/scoreControl.js";
import { initMatchCards } from "../components/matchCard.js";

document.addEventListener("DOMContentLoaded", async () => {

  await loadNavbar();

  initScoreControls();
  initMatchCards();

  updateProgress();
});