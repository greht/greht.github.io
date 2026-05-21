import { getProcessedUsers, getUsersByCountry } from "/js/data/users.js";

let currentPage = 1;
let rowsPerPage = 10;
let currentFilter = "global";

export function setFilter(filter) {
    currentFilter = filter;
}

export function getState(filterCountry = "global") {
    if (filterCountry !== "global") {
        currentFilter = filterCountry;
    }
    
    let allUsers = filterCountry === "global" 
        ? getProcessedUsers() 
        : getUsersByCountry(filterCountry);

    // Recalcular rank para país (empezar desde 1)
    if (filterCountry !== "global") {
        allUsers = allUsers.map((user, index) => ({
            ...user,
            rank: index + 1
        }));
        
        // Para país, excluir podium (rank 1-3) de la tabla
        allUsers = allUsers.filter(u => u.rank > 3);
    } else {
        // Para global, excluir podium (rank 1-3)
        allUsers = allUsers.filter(u => u.rank > 3);
    }

    const users = allUsers;

    const totalPages = Math.max(1, Math.ceil(users.length / rowsPerPage));

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return {
        currentPage,
        rowsPerPage,
        totalPages,
        usersPage: users.slice(start, end),
        totalUsers: users.length,
        filterCountry
    };
}

export function nextPage(filterCountry = "global") {
    const state = getState(filterCountry);
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
            nextPage(currentFilter);
            onChange(getState(currentFilter));
        });

    document.querySelector(".btn-page.prev")
        ?.addEventListener("click", () => {
            prevPage();
            onChange(getState(currentFilter));
        });

    document.getElementById("rowsPerPageSelect")
        ?.addEventListener("change", (e) => {
            setRowsPerPage(Number(e.target.value));
            onChange(getState(currentFilter));
        });
}

export function updatePaginationButtons(state) {
    const { currentPage, totalPages } = state;

    const prevBtn = document.querySelector(".btn-page.prev");
    const nextBtn = document.querySelector(".btn-page.next");

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}