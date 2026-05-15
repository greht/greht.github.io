const items = document.querySelectorAll(".accordion-item");

items.forEach(item => {
  const header = item.querySelector(".accordion-header");
  const content = item.querySelector(".accordion-content");

  header.addEventListener("click", () => {

    const isOpen = item.classList.contains("active");

    items.forEach(i => {
      const c = i.querySelector(".accordion-content");

      if (i.classList.contains("active")) {
        // fijar altura actual
        c.style.height = c.scrollHeight + "px";

        // forzar reflow
        c.offsetHeight;

        // cerrar suave
        c.style.height = "0px";
        c.style.opacity = 0;

        i.classList.remove("active");
      }
    });

    if (!isOpen) {
      item.classList.add("active");

      // abrir suave
      content.style.height = content.scrollHeight + "px";

      setTimeout(() => {
        content.style.opacity = 1;
      }, 50);
    }
  });
});

