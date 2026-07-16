// =======================================
// Vacatory
// app.js
// =======================================

let firms = [];

document.addEventListener("DOMContentLoaded", () => {

    loadFirms();

    document
        .getElementById("searchInput")
        .addEventListener("input", searchFirms);

});

async function loadFirms() {

    const container = document.getElementById("firms");

    container.innerHTML = "<p class='loading'>Loading firms...</p>";

    const { data, error } = await client
        .from("firms")
        .select("*")
        .eq("active", true)
        .order("uk_rank", { ascending: true });

    if (error) {

        console.error(error);

        container.innerHTML =
            "<p class='loading'>Unable to load firms.</p>";

        return;

    }

    firms = data || [];

    displayFirms(firms);

}

function displayFirms(list) {

    const container = document.getElementById("firms");

    if (!list.length) {

        container.innerHTML =
            "<p class='loading'>No firms found.</p>";

        return;

    }

    container.innerHTML = "";

    list.forEach(firm => {

        const card = document.createElement("div");

        card.className = "firm-card";

        const logo = firm.logo_url
            ? `<img src="${firm.logo_url}" alt="${firm.name} logo">`
            : (firm.short_name || firm.name || "V").charAt(0);

        card.innerHTML = `

<div class="firm-card-header">

    <div class="firm-logo">
        ${logo}
    </div>

    <button class="star" aria-label="Favourite firm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2 4.5 5.6 4c2-.3 3.9.7 5 2.3C11.7 4.7 13.6 3.7 15.6 4c3.6.5 5.1 4.2 3.6 7.7C16.7 16.4 12 21 12 21z"></path>
        </svg>
    </button>

</div>

<h3>${firm.name}</h3>

<p class="firm-type">${firm.firm_type ?? "Commercial Law"}</p>

<div class="firm-details">

    <p class="firm-location">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"></path>
            <circle cx="12" cy="10" r="2.4"></circle>
        </svg>
        ${firm.head_office ?? "United Kingdom"}
    </p>

</div>

<a href="#" class="firm-link">
    View profile
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M13 6l6 6-6 6"></path>
    </svg>
</a>

`;

        card.querySelector(".star").addEventListener("click", (e) => {

            e.stopPropagation();

            e.currentTarget.classList.toggle("active");

        });

        card.addEventListener("click", (e) => {

            if (e.target.closest(".star")) return;

            if (e.target.closest(".firm-link")) e.preventDefault();

            alert("Firm profile coming next.");

        });

        container.appendChild(card);

    });

}
function searchFirms() {

    const search = document
        .getElementById("searchInput")
        .value
        .trim()
        .toLowerCase();

    if (!search) {

        displayFirms(firms);

        return;

    }

    const filtered = firms.filter(firm =>

        (firm.name || "")
            .toLowerCase()
            .includes(search)

        ||

        (firm.firm_type || "")
            .toLowerCase()
            .includes(search)

        ||

        (firm.head_office || "")
            .toLowerCase()
            .includes(search)

        ||

        String(firm.uk_rank || "")
            .includes(search)

    );

    displayFirms(filtered);

}
