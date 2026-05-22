let currentPage = 1;
let rowsPerPage = 10;
let currentFilter = "global";
let allUsers = [];

export function setFilter(filter) {
    currentFilter = filter;
}

export function setUsers(users) {
    allUsers = users;
}

export function getState(filterCountry = "global") {
    if (filterCountry !== "global") {
        currentFilter = filterCountry;
    }

    let users = allUsers;

    // Excluir podium (primeros 3) de la tabla
    const tableUsers = users.slice(3);

    const totalPages = Math.max(1, Math.ceil(tableUsers.length / rowsPerPage));

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return {
        currentPage,
        rowsPerPage,
        totalPages,
        usersPage: tableUsers.slice(start, end),
        totalUsers: tableUsers.length,
        filterCountry
    };
}

export function nextPage() {
    const state = getState();
    if (currentPage < state.totalPages) currentPage++;
}

export function prevPage() {
    if (currentPage > 1) currentPage--;
}

export function setPage(page) {
    currentPage = Math.min(Math.max(page, 1), getState().totalPages);
}

export function resetPagination() {
    currentPage = 1;
}

export function setRowsPerPage(value) {
    rowsPerPage = value;
    currentPage = 1;
}

export function initPagination(onChange) {

    document.querySelector(".btn-page.next")
        ?.addEventListener("click", () => {
            nextPage();
            onChange(getState());
        });

    document.querySelector(".btn-page.prev")
        ?.addEventListener("click", () => {
            prevPage();
            onChange(getState());
        });

    document.getElementById("rowsPerPageSelect")
        ?.addEventListener("change", (e) => {
            setRowsPerPage(Number(e.target.value));
            onChange(getState());
        });
}

export function updatePaginationButtons(state) {
    const { currentPage, totalPages } = state;

    const prevBtn = document.querySelector(".btn-page.prev");
    const nextBtn = document.querySelector(".btn-page.next");

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}