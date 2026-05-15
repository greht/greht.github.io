export function renderPaginationUI(state, onChangePage) {
    const pagesContainer = document.querySelector(".pages");
    const info = document.querySelector(".pagination-info");

    if (!pagesContainer || !info) return;

    const { currentPage, totalPages, totalUsers, rowsPerPage } = state;

    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(start + rowsPerPage, totalUsers);

    info.textContent = `Mostrando ${start}-${end} de ${totalUsers}`;

    pagesContainer.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");

        btn.className = `page ${i === currentPage ? "active" : ""}`;
        btn.textContent = i;

        btn.addEventListener("click", () => {
            onChangePage(i);
        });

        pagesContainer.appendChild(btn);
    }
}