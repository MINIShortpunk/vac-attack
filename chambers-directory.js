// =======================================
// Vacatory
// chambers-directory.js
// Barristers' chambers directory
// =======================================

const chambersDirectoryState = {
  chambers: [],
  filteredChambers: [],
  chambersById: new Map(),
  chambersByOrganisationId: new Map(),
  chambersByName: new Map()
};

const chambersDirectoryElements = {};

document.addEventListener(
  "DOMContentLoaded",
  initialiseChambersDirectory
);

async function initialiseChambersDirectory() {
  cacheChambersDirectoryElements();
  connectChambersDirectoryFilters();

  if (typeof client === "undefined") {
    console.error("The Supabase client is unavailable.");
    showChambersDirectoryError();
    return;
  }

  try {
    const { data, error } = await client
      .from("chambers")
      .select("*");

    if (error) {
      throw error;
    }

    chambersDirectoryState.chambers = (data || [])
      .filter(chambers => {
        return (
          chambers &&
          chambers.id &&
          getChambersName(chambers) &&
          chambers.active !== false
        );
      })
      .map(normaliseChambers);

    buildChambersMaps();

    await loadSupportingChambersData();

    populateChambersFilterOptions();
    applyChambersFilters();

    chambersDirectoryElements.loading?.classList.add(
      "hidden"
    );
  } catch (error) {
    console.error(
      "Unable to load chambers:",
      error
    );

    showChambersDirectoryError();
  }
}

function cacheChambersDirectoryElements() {
  chambersDirectoryElements.search =
    document.getElementById("directorySearch");

  chambersDirectoryElements.sort =
    document.getElementById("sortFilter");

  chambersDirectoryElements.location =
    document.getElementById("locationFilter");

  chambersDirectoryElements.circuit =
    document.getElementById("circuitFilter");

  chambersDirectoryElements.practice =
    document.getElementById("practiceFilter");

  chambersDirectoryElements.opportunity =
    document.getElementById("opportunityFilter");

  chambersDirectoryElements.clear =
    document.getElementById("clearFilters");

  chambersDirectoryElements.count =
    document.getElementById("directoryCount");

  chambersDirectoryElements.loading =
    document.getElementById("directoryLoading");

  chambersDirectoryElements.error =
    document.getElementById("directoryError");

  chambersDirectoryElements.empty =
    document.getElementById("directoryEmpty");

  chambersDirectoryElements.list =
    document.getElementById("chambersDirectory");
}

function connectChambersDirectoryFilters() {
  chambersDirectoryElements.search?.addEventListener(
    "input",
    applyChambersFilters
  );

  chambersDirectoryElements.sort?.addEventListener(
    "change",
    applyChambersFilters
  );

  chambersDirectoryElements.location?.addEventListener(
    "change",
    applyChambersFilters
  );

  chambersDirectoryElements.circuit?.addEventListener(
    "change",
    applyChambersFilters
  );

  chambersDirectoryElements.practice?.addEventListener(
    "change",
    applyChambersFilters
  );

  chambersDirectoryElements.opportunity?.addEventListener(
    "change",
    applyChambersFilters
  );

  chambersDirectoryElements.clear?.addEventListener(
    "click",
    clearChambersFilters
  );
}

function normaliseChambers(chambers) {
  return {
    ...chambers,
    locations: [],
    circuits: [],
    practiceAreas: [],
    opportunities: []
  };
}

function getChambersName(chambers) {
  return (
    chambers.name ||
    chambers.official_name ||
    chambers.chambers_name ||
    chambers.trading_name ||
    ""
  );
}

function buildChambersMaps() {
  chambersDirectoryState.chambersById.clear();
  chambersDirectoryState.chambersByOrganisationId.clear();
  chambersDirectoryState.chambersByName.clear();

  chambersDirectoryState.chambers.forEach(chambers => {
    chambersDirectoryState.chambersById.set(
      String(chambers.id),
      chambers
    );

    if (chambers.organisation_id) {
      chambersDirectoryState.chambersByOrganisationId.set(
        String(chambers.organisation_id),
        chambers
      );
    }

    const names = [
      chambers.name,
      chambers.official_name,
      chambers.chambers_name,
      chambers.trading_name,
      chambers.short_name
    ].filter(Boolean);

    names.forEach(name => {
      chambersDirectoryState.chambersByName.set(
        normaliseText(name),
        chambers
      );
    });
  });
}

async function loadSupportingChambersData() {
  const [
    organisationLocations,
    chambersPracticeAreas,
    organisationPracticeAreas,
    opportunities,
    deadlines
  ] = await Promise.all([
    readOptionalChambersTable(
      "organisation_locations"
    ),

    readOptionalChambersTable(
      "chambers_practice_areas"
    ),

    readOptionalChambersTable(
      "organisation_practice_areas"
    ),

    readOptionalChambersTable(
      "vacation_schemes"
    ),

    readOptionalChambersTable(
      "deadlines_public_view"
    )
  ]);

  addChambersLocationRows(
    organisationLocations
  );

  addChambersPracticeAreaRows([
    ...chambersPracticeAreas,
    ...organisationPracticeAreas
  ]);

  addChambersOpportunityRows(
    opportunities
  );

  addChambersDeadlineRows(
    deadlines
  );

  chambersDirectoryState.chambers.forEach(chambers => {
    addChambersOwnFields(chambers);

    chambers.locations = uniqueSorted(
      chambers.locations
    );

    chambers.circuits = uniqueSorted(
      chambers.circuits
    );

    chambers.practiceAreas = uniqueSorted(
      chambers.practiceAreas
    );

    chambers.opportunities = uniqueSorted(
      chambers.opportunities
    );
  });
}

async function readOptionalChambersTable(
  tableName
) {
  try {
    const { data, error } = await client
      .from(tableName)
      .select("*");

    if (error) {
      console.warn(
        `Optional source unavailable: ${tableName}`,
        error.message
      );

      return [];
    }

    return data || [];
  } catch (error) {
    console.warn(
      `Optional source unavailable: ${tableName}`,
      error
    );

    return [];
  }
}

function findChambersForRow(row) {
  const chambersIds = [
    row.chambers_id,
    row.provider_chambers_id
  ].filter(Boolean);

  for (const id of chambersIds) {
    const chambers =
      chambersDirectoryState.chambersById.get(
        String(id)
      );

    if (chambers) {
      return chambers;
    }
  }

  const organisationIds = [
    row.organisation_id,
    row.legal_organisation_id,
    row.provider_id
  ].filter(Boolean);

  for (const id of organisationIds) {
    const chambers =
      chambersDirectoryState
        .chambersByOrganisationId
        .get(String(id));

    if (chambers) {
      return chambers;
    }
  }

  const possibleNames = [
    row.chambers_name,
    row.provider_name,
    row.organisation_name,
    row.legal_organisation_name
  ].filter(Boolean);

  for (const name of possibleNames) {
    const chambers =
      chambersDirectoryState.chambersByName.get(
        normaliseText(name)
      );

    if (chambers) {
      return chambers;
    }
  }

  return null;
}

function addChambersOwnFields(chambers) {
  const location = (
    chambers.principal_location ||
    chambers.principal_city ||
    chambers.city ||
    chambers.location
  );

  if (location) {
    chambers.locations.push(location);
  }

  if (chambers.circuit) {
    chambers.circuits.push(chambers.circuit);
  }

  if (chambers.region) {
    chambers.circuits.push(chambers.region);
  }

  addValuesFromField(
    chambers.practiceAreas,
    chambers.practice_areas
  );

  addValuesFromField(
    chambers.opportunities,
    chambers.opportunities
  );
}

function addValuesFromField(target, value) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => {
      if (item) {
        target.push(String(item));
      }
    });

    return;
  }

  if (typeof value === "string") {
    value
      .split(/[,;|]/)
      .map(item => item.trim())
      .filter(Boolean)
      .forEach(item => target.push(item));
  }
}

function addChambersLocationRows(rows) {
  rows.forEach(row => {
    const chambers = findChambersForRow(row);

    if (!chambers) {
      return;
    }

    const city =
      row.city ||
      row.location_name ||
      row.office_name ||
      row.name;

    const country = row.country;

    if (city) {
      const locationLabel = country
        ? `${city}, ${country}`
        : city;

      chambers.locations.push(locationLabel);
    }

    if (row.circuit) {
      chambers.circuits.push(row.circuit);
    }

    if (row.region) {
      chambers.circuits.push(row.region);
    }
  });
}

function addChambersPracticeAreaRows(rows) {
  rows.forEach(row => {
    const chambers = findChambersForRow(row);

    if (!chambers) {
      return;
    }

    const practiceArea =
      row.practice_area ||
      row.practice_name ||
      row.service_name ||
      row.name;

    if (practiceArea) {
      chambers.practiceAreas.push(
        practiceArea
      );
    }
  });
}

function addChambersOpportunityRows(rows) {
  rows.forEach(row => {
    const pathway = normaliseText(
      row.career_pathway || ""
    );

    if (
      pathway &&
      pathway !== "barrister"
    ) {
      return;
    }

    const chambers = findChambersForRow(row);

    if (!chambers) {
      return;
    }

    const opportunity = normaliseOpportunityType(
      row.opportunity_type_name ||
      row.opportunity_type ||
      row.scheme_type ||
      row.scheme_name ||
      row.programme_name
    );

    if (opportunity) {
      chambers.opportunities.push(
        opportunity
      );
    }
  });
}

function addChambersDeadlineRows(rows) {
  rows.forEach(row => {
    const pathway = normaliseText(
      row.career_pathway || ""
    );

    if (
      pathway &&
      pathway !== "barrister"
    ) {
      return;
    }

    const chambers = findChambersForRow(row);

    if (!chambers) {
      return;
    }

    const opportunity = normaliseOpportunityType(
      row.opportunity_type_name ||
      row.opportunity_type ||
      row.opportunity_name ||
      row.programme_name
    );

    if (opportunity) {
      chambers.opportunities.push(
        opportunity
      );
    }
  });
}

function normaliseOpportunityType(value) {
  const opportunity = normaliseText(value);

  if (!opportunity) {
    return "";
  }

  if (
    opportunity.includes("assessed") &&
    opportunity.includes("mini")
  ) {
    return "assessed_mini_pupillage";
  }

  if (opportunity.includes("mini")) {
    return "mini_pupillage";
  }

  if (opportunity.includes("pupillage")) {
    return "pupillage";
  }

  return opportunity
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function populateChambersFilterOptions() {
  const locations = uniqueSorted(
    chambersDirectoryState.chambers.flatMap(
      chambers => chambers.locations
    )
  );

  const circuits = uniqueSorted(
    chambersDirectoryState.chambers.flatMap(
      chambers => chambers.circuits
    )
  );

  const practiceAreas = uniqueSorted(
    chambersDirectoryState.chambers.flatMap(
      chambers => chambers.practiceAreas
    )
  );

  addChambersSelectOptions(
    chambersDirectoryElements.location,
    locations
  );

  addChambersSelectOptions(
    chambersDirectoryElements.circuit,
    circuits
  );

  addChambersSelectOptions(
    chambersDirectoryElements.practice,
    practiceAreas
  );
}

function addChambersSelectOptions(
  selectElement,
  values
) {
  if (!selectElement) {
    return;
  }

  values.forEach(value => {
    const option =
      document.createElement("option");

    option.value = value;
    option.textContent = value;

    selectElement.appendChild(option);
  });
}

function applyChambersFilters() {
  const searchTerm = normaliseText(
    chambersDirectoryElements.search?.value || ""
  );

  const selectedLocation =
    chambersDirectoryElements.location?.value || "";

  const selectedCircuit =
    chambersDirectoryElements.circuit?.value || "";

  const selectedPractice =
    chambersDirectoryElements.practice?.value || "";

  const selectedOpportunity =
    chambersDirectoryElements.opportunity?.value || "";

  const selectedSort =
    chambersDirectoryElements.sort?.value || "az";

  chambersDirectoryState.filteredChambers =
    chambersDirectoryState.chambers.filter(
      chambers => {
        const searchableText = normaliseText(
          [
            getChambersName(chambers),
            chambers.short_name,
            chambers.chambers_type,
            chambers.overview,
            ...chambers.locations,
            ...chambers.circuits,
            ...chambers.practiceAreas,
            ...chambers.opportunities
          ]
            .filter(Boolean)
            .join(" ")
        );

        const matchesSearch =
          !searchTerm ||
          searchableText.includes(searchTerm);

        const matchesLocation =
          !selectedLocation ||
          chambers.locations.includes(
            selectedLocation
          );

        const matchesCircuit =
          !selectedCircuit ||
          chambers.circuits.includes(
            selectedCircuit
          );

        const matchesPractice =
          !selectedPractice ||
          chambers.practiceAreas.includes(
            selectedPractice
          );

        const matchesOpportunity =
          !selectedOpportunity ||
          chambers.opportunities.includes(
            selectedOpportunity
          );

        return (
          matchesSearch &&
          matchesLocation &&
          matchesCircuit &&
          matchesPractice &&
          matchesOpportunity
        );
      }
    );

  sortChambers(
    chambersDirectoryState.filteredChambers,
    selectedSort
  );

  renderChambersDirectory();
}

function sortChambers(
  chambers,
  sortValue
) {
  chambers.sort((first, second) => {
    const firstName =
      getChambersName(first);

    const secondName =
      getChambersName(second);

    if (sortValue === "za") {
      return secondName.localeCompare(
        firstName
      );
    }

    return firstName.localeCompare(
      secondName
    );
  });
}

function renderChambersDirectory() {
  if (!chambersDirectoryElements.list) {
    return;
  }

  chambersDirectoryElements.loading
    ?.classList.add("hidden");

  chambersDirectoryElements.error
    ?.classList.add("hidden");

  const totalChambers =
    chambersDirectoryState.chambers.length;

  const visibleChambers =
    chambersDirectoryState.filteredChambers.length;

  if (chambersDirectoryElements.count) {
    if (totalChambers === 0) {
      chambersDirectoryElements.count.textContent =
        "No verified chambers profiles added yet";
    } else if (
      visibleChambers === totalChambers
    ) {
      chambersDirectoryElements.count.textContent =
        `${totalChambers} chambers`;
    } else {
      chambersDirectoryElements.count.textContent =
        `${visibleChambers} of ${totalChambers} chambers`;
    }
  }

  if (!visibleChambers) {
    chambersDirectoryElements.list.innerHTML = "";

    chambersDirectoryElements.empty
      ?.classList.remove("hidden");

    return;
  }

  chambersDirectoryElements.empty
    ?.classList.add("hidden");

  chambersDirectoryElements.list.innerHTML =
    chambersDirectoryState.filteredChambers
      .map(createChambersCard)
      .join("");
}

function createChambersCard(chambers) {
  const chambersName =
    getChambersName(chambers) ||
    "Barristers’ chambers";

  const initials = (
    chambers.short_name ||
    chambersName
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const logo = chambers.logo_url
    ? `
      <img
        src="${escapeHtml(chambers.logo_url)}"
        alt=""
        loading="lazy"
      >
    `
    : escapeHtml(initials);

  const chambersType =
    chambers.chambers_type ||
    chambers.type ||
    "Barristers’ chambers";

  const location =
    chambers.locations[0] ||
    chambers.principal_address ||
    "Location being researched";

  const circuit =
    chambers.circuits[0] || "";

  const opportunityText =
    getChambersOpportunityText(
      chambers.opportunities
    );

  return `
    <a
      class="firm-card"
      href="chamber-profile.html?id=${encodeURIComponent(chambers.id)}"
      aria-label="View ${escapeHtml(chambersName)} profile"
    >
      <div class="firm-card-header">
        <div
          class="firm-logo"
          aria-hidden="true"
        >
          ${logo}
        </div>
      </div>

      <h3>
        ${escapeHtml(chambersName)}
      </h3>

      <p class="firm-type">
        ${escapeHtml(chambersType)}
      </p>

      <div class="firm-details">
        <p class="firm-location">
          ${escapeHtml(location)}
        </p>

        ${
          circuit
            ? `
              <p class="firm-location">
                ${escapeHtml(circuit)}
              </p>
            `
            : ""
        }

        <span class="status-pill">
          ${escapeHtml(opportunityText)}
        </span>
      </div>

      <span class="firm-link">
        View chambers profile
        <span aria-hidden="true">→</span>
      </span>
    </a>
  `;
}

function getChambersOpportunityText(
  opportunities
) {
  if (
    opportunities.includes("pupillage")
  ) {
    return "Pupillage information available";
  }

  if (
    opportunities.includes(
      "assessed_mini_pupillage"
    )
  ) {
    return "Assessed mini-pupillage";
  }

  if (
    opportunities.includes("mini_pupillage")
  ) {
    return "Mini-pupillage information";
  }

  return "Opportunities being researched";
}

function clearChambersFilters() {
  if (chambersDirectoryElements.search) {
    chambersDirectoryElements.search.value = "";
  }

  if (chambersDirectoryElements.sort) {
    chambersDirectoryElements.sort.value = "az";
  }

  if (chambersDirectoryElements.location) {
    chambersDirectoryElements.location.value = "";
  }

  if (chambersDirectoryElements.circuit) {
    chambersDirectoryElements.circuit.value = "";
  }

  if (chambersDirectoryElements.practice) {
    chambersDirectoryElements.practice.value = "";
  }

  if (chambersDirectoryElements.opportunity) {
    chambersDirectoryElements.opportunity.value = "";
  }

  applyChambersFilters();

  chambersDirectoryElements.search?.focus();
}

function showChambersDirectoryError() {
  chambersDirectoryElements.loading
    ?.classList.add("hidden");

  chambersDirectoryElements.empty
    ?.classList.add("hidden");

  chambersDirectoryElements.error
    ?.classList.remove("hidden");

  if (chambersDirectoryElements.count) {
    chambersDirectoryElements.count.textContent =
      "The chambers directory could not be loaded.";
  }
}

function uniqueSorted(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(value => String(value).trim())
        .filter(Boolean)
    )
  ].sort((first, second) =>
    first.localeCompare(second)
  );
}

function normaliseText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
