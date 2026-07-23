// =======================================
// Vacatory
// deadlines.js
// Application deadlines directory
// =======================================

let allDeadlines = [];

document.addEventListener("DOMContentLoaded", () => {
  const searchInput =
    document.getElementById("deadlineSearch");

  const typeSelect =
    document.getElementById("deadlineType");

  const resetButton =
    document.getElementById("deadlineReset");

  searchInput?.addEventListener(
    "input",
    applyDeadlineFilters
  );

  typeSelect?.addEventListener(
    "change",
    applyDeadlineFilters
  );

  resetButton?.addEventListener(
    "click",
    resetDeadlineFilters
  );

  loadDeadlines();
});

async function loadDeadlines() {
  const list =
    document.getElementById("deadlinesList");

  const count =
    document.getElementById("deadlineCount");

  if (!list || !count) {
    return;
  }

  if (typeof client === "undefined") {
    console.error(
      "The Supabase client is unavailable."
    );

    showDeadlineError();
    return;
  }

  list.innerHTML = `
    <p class="loading">
      Loading deadlines…
    </p>
  `;

  count.textContent =
    "Loading deadlines…";

  try {
    const [
      firmsResult,
      schemesResult,
      contractsResult
    ] = await Promise.all([
      client
        .from("firms")
        .select("id, name, active")
        .eq("active", true),

      client
        .from("vacation_schemes")
        .select("*"),

      client
        .from("training_contracts")
        .select("*")
    ]);

    const error =
      firmsResult.error ||
      schemesResult.error ||
      contractsResult.error;

    if (error) {
      throw error;
    }

    const firmNames = new Map();

    (firmsResult.data || []).forEach(firm => {
      firmNames.set(
        firm.id,
        firm.name || "Law firm"
      );
    });

    const deadlines = [];

    (schemesResult.data || []).forEach(
      scheme => {
        const closingDate =
          scheme.deadline ||
          scheme.application_deadline ||
          scheme.application_close_date ||
          scheme.closes_on;

        if (!closingDate) {
          return;
        }

        deadlines.push(
          normaliseVacationScheme(
            scheme,
            firmNames
          )
        );
      }
    );

    (contractsResult.data || []).forEach(
      contract => {
        const closingDate =
          contract.application_deadline ||
          contract.application_close_date;

        if (!closingDate) {
          return;
        }

        deadlines.push(
          normaliseTrainingContract(
            contract,
            firmNames
          )
        );
      }
    );

    const seen = new Set();

    allDeadlines = deadlines
      .filter(Boolean)
      .filter(item =>
        firmNames.has(item.firmId)
      )
      .filter(item => {
        const key = [
          item.firmId,
          item.type,
          item.title,
          item.closingDate
        ].join("|");

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort(sortByClosingDate);

    displayDeadlines(allDeadlines);
  } catch (error) {
    console.error(
      "Unable to load deadlines:",
      error
    );

    showDeadlineError();
  }
}

function normaliseVacationScheme(
  scheme,
  firmNames
) {
  const firmId =
    scheme.firm_id;

  const title =
    scheme.scheme_name ||
    scheme.opportunity_name ||
    scheme.programme_name ||
    "Vacation scheme";

  return {
    firmId,

    firmName:
      firmNames.get(firmId) ||
      "Law firm",

    title,

    type:
      scheme.scheme_type ||
      scheme.opportunity_type ||
      "Vacation scheme",

    location:
      scheme.location ||
      scheme.location_text ||
      "Location not stated",

    openingDate:
      scheme.opens_on ||
      scheme.application_open ||
      scheme.application_open_date,

    closingDate:
      scheme.deadline ||
      scheme.application_deadline ||
      scheme.application_close_date ||
      scheme.closes_on,

    startDate:
      scheme.programme_start_date ||
      scheme.start_date ||
      scheme.scheme_start_date,

    programmeDates:
      scheme.programme_dates ||
      scheme.scheme_dates ||
      scheme.actual_programme_dates,

    duration:
      scheme.duration ||
      scheme.programme_length,

    salary:
      scheme.salary ||
      scheme.payment,

    status:
      scheme.status ||
      scheme.application_status,

    eligibility:
      scheme.eligibility,

    academicRequirements:
      scheme.academic_requirements ||
      scheme.academic_requirement,

    degreeRequirements:
      scheme.degree_requirements ||
      scheme.degree_requirement,

    applicationProcess:
      scheme.application_process ||
      scheme.selection_process ||
      scheme.application_stages,

    assessments:
      scheme.assessments ||
      scheme.assessment_details ||
      scheme.online_tests,

    additionalDetails:
      scheme.additional_details ||
      scheme.notes ||
      scheme.description,

    applicationLink:
      scheme.application_link ||
      scheme.application_url
  };
}

function normaliseTrainingContract(
  contract,
  firmNames
) {
  const firmId =
    contract.firm_id;

  const intake =
    contract.intake_year ||
    contract.start_year ||
    "";

  const baseTitle =
    contract.programme_name ||
    contract.training_contract_name ||
    "Training contract";

  const title = intake
    ? `${baseTitle} — ${intake} intake`
    : baseTitle;

  return {
    firmId,

    firmName:
      firmNames.get(firmId) ||
      "Law firm",

    title,

    type:
      contract.contract_type ||
      contract.opportunity_type ||
      "Training contract",

    location:
      contract.location ||
      contract.location_text ||
      "Location not stated",

    openingDate:
      contract.application_open ||
      contract.application_open_date,

    closingDate:
      contract.application_deadline ||
      contract.application_close_date,

    startDate:
      contract.start_date ||
      contract.programme_start_date,

    programmeDates:
      contract.programme_dates,

    duration:
      contract.duration,

    firstYearSalary:
      contract.salary_first_year,

    secondYearSalary:
      contract.salary_second_year,

    nqSalary:
      contract.salary_qualification ||
      contract.nq_salary,

    seats:
      contract.seats ||
      contract.number_of_seats,

    status:
      contract.status ||
      contract.application_status,

    eligibility:
      contract.eligibility,

    academicRequirements:
      contract.academic_requirements ||
      contract.academic_requirement,

    degreeRequirements:
      contract.degree_requirements ||
      contract.degree_requirement,

    applicationProcess:
      contract.application_process ||
      contract.selection_process ||
      contract.application_stages,

    assessments:
      contract.assessments ||
      contract.assessment_details ||
      contract.online_tests,

    sponsorship:
      contract.sponsorship ||
      contract.sqe_support ||
      contract.study_support,

    visaInformation:
      contract.visa_sponsorship ||
      contract.visa_information ||
      contract.right_to_work,

    additionalDetails:
      contract.additional_details ||
      contract.notes ||
      contract.description,

    applicationLink:
      contract.application_link ||
      contract.application_url
  };
}

function displayDeadlines(deadlines) {
  const list =
    document.getElementById("deadlinesList");

  const count =
    document.getElementById("deadlineCount");

  if (!list || !count) {
    return;
  }

  const sortedDeadlines =
    [...deadlines].sort(
      sortByClosingDate
    );

  count.textContent =
    sortedDeadlines.length === 1
      ? "Showing 1 opportunity"
      : `Showing ${sortedDeadlines.length} opportunities`;

  if (!sortedDeadlines.length) {
    list.innerHTML = `
      <p class="loading">
        No deadlines found.
      </p>
    `;

    return;
  }

  list.innerHTML = sortedDeadlines
    .map(renderDeadline)
    .join("");
}

function renderDeadline(item) {
  const deadline =
    formatDate(item.closingDate) ||
    "Not announced";

  const startDate =
    formatOpportunityStart(item) ||
    "Not announced";

  const facts =
    buildDeadlineFacts(item);

  const detailSections =
    buildDeadlineDetailSections(item);

  return `
    <details class="deadline-item">

      <summary class="deadline-summary">

        <div class="deadline-date-panel">
          <span>Closing</span>
          <strong>
            ${escapeHtml(deadline)}
          </strong>
        </div>

        <div class="deadline-summary-main">

          <p class="deadline-firm-name">
            ${escapeHtml(item.firmName)}
          </p>

          <h3>
            ${escapeHtml(item.title)}
          </h3>

          <div class="deadline-summary-meta">

            <span>
              <strong>Type:</strong>
              ${escapeHtml(item.type)}
            </span>

            <span>
              <strong>Location:</strong>
              ${escapeHtml(item.location)}
            </span>

            <span>
              <strong>Starts:</strong>
              ${escapeHtml(startDate)}
            </span>

          </div>

        </div>

        <span
          class="deadline-chevron"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </span>

      </summary>

      <div class="deadline-expanded">

        ${
          facts
            ? `
              <div class="deadline-facts">
                ${facts}
              </div>
            `
            : ""
        }

        ${
          detailSections.length
            ? `
              <div class="deadline-detail-sections">
                ${detailSections.join("")}
              </div>
            `
            : `
              <p class="deadline-no-details">
                Further details have not yet been added.
              </p>
            `
        }

        <div class="deadline-actions">

          <a
            href="firm-profile.html?id=${encodeURIComponent(
              item.firmId
            )}"
            class="deadline-profile-link"
          >
            View firm profile
          </a>

          ${
            item.applicationLink
              ? `
                <a
                  href="${escapeHtml(
                    item.applicationLink
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="deadline-official-link"
                >
                  View official opportunity page

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7"></path>
                    <path d="M7 7h10v10"></path>
                  </svg>
                </a>
              `
              : ""
          }

        </div>

      </div>

    </details>
  `;
}

function buildDeadlineFacts(item) {
  return [
    fact(
      "Applications open",
      formatDate(item.openingDate)
    ),

    fact(
      "Closing date",
      formatDate(item.closingDate)
    ),

    fact(
      "Start date",
      formatDate(item.startDate)
    ),

    fact(
      "Programme dates",
      formatDisplayValue(
        item.programmeDates
      )
    ),

    fact(
      "Duration",
      item.duration
    ),

    fact(
      "Status",
      item.status
    ),

    fact(
      "Salary",
      item.salary
    ),

    fact(
      "First-year salary",
      formatMoney(
        item.firstYearSalary
      )
    ),

    fact(
      "Second-year salary",
      formatMoney(
        item.secondYearSalary
      )
    ),

    fact(
      "NQ salary",
      formatMoney(
        item.nqSalary
      )
    ),

    fact(
      "Seats",
      item.seats
    )
  ]
    .filter(Boolean)
    .join("");
}

function buildDeadlineDetailSections(item) {
  const sections = [];

  addBulletSection(
    sections,
    "Eligibility",
    item.eligibility
  );

  addBulletSection(
    sections,
    "Academic requirements",
    item.academicRequirements
  );

  addBulletSection(
    sections,
    "Degree requirements",
    item.degreeRequirements
  );

  addBulletSection(
    sections,
    "Application process",
    item.applicationProcess
  );

  addBulletSection(
    sections,
    "Assessments",
    item.assessments
  );

  addBulletSection(
    sections,
    "Study support and sponsorship",
    item.sponsorship
  );

  addBulletSection(
    sections,
    "Visa and right-to-work information",
    item.visaInformation
  );

  addBulletSection(
    sections,
    "Further information",
    item.additionalDetails
  );

  return sections;
}

function addBulletSection(
  sections,
  heading,
  value
) {
  const points =
    splitIntoBulletPoints(value);

  if (!points.length) {
    return;
  }

  sections.push(`
    <section class="deadline-detail-section">

      <h4>
        ${escapeHtml(heading)}
      </h4>

      <ul class="deadline-bullets">
        ${points
          .map(point => `
            <li>
              ${escapeHtml(point)}
            </li>
          `)
          .join("")}
      </ul>

    </section>
  `);
}

function splitIntoBulletPoints(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return uniqueCleanPoints(
      value.flatMap(
        splitIntoBulletPoints
      )
    );
  }

  if (typeof value === "object") {
    return uniqueCleanPoints(
      Object.values(value)
        .flatMap(
          splitIntoBulletPoints
        )
    );
  }

  const text = String(value)
    .replace(/\r/g, "\n")
    .replace(/[•●▪◦]/g, "\n")
    .replace(/\s+-\s+/g, "\n")
    .replace(/;\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  let points = text
    .split("\n")
    .map(cleanBulletPoint)
    .filter(Boolean);

  if (points.length === 1) {
    points = points[0]
      .split(
        /(?<=[.!?])\s+(?=[A-Z0-9])/
      )
      .map(cleanBulletPoint)
      .filter(Boolean);
  }

  return uniqueCleanPoints(points);
}

function cleanBulletPoint(value) {
  return String(value || "")
    .replace(
      /^[\s\-–—:;,.]+/,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueCleanPoints(points) {
  return [
    ...new Set(
      points
        .map(cleanBulletPoint)
        .filter(Boolean)
    )
  ];
}

function applyDeadlineFilters() {
  const searchInput =
    document.getElementById("deadlineSearch");

  const typeSelect =
    document.getElementById("deadlineType");

  const resetButton =
    document.getElementById("deadlineReset");

  const search =
    searchInput?.value
      .trim()
      .toLowerCase() || "";

  const type =
    typeSelect?.value || "";

  const filtered = allDeadlines.filter(
    item => {
      const searchText = [
        item.firmName,
        item.title,
        item.type,
        item.location
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        searchText.includes(search);

      const matchesType =
        !type ||
        item.type === type ||
        (
          type === "Vacation scheme" &&
          item.type
            .toLowerCase()
            .includes("vacation")
        ) ||
        (
          type === "Training contract" &&
          item.type
            .toLowerCase()
            .includes("training")
        );

      return (
        matchesSearch &&
        matchesType
      );
    }
  );

  resetButton?.classList.toggle(
    "hidden",
    !(search || type)
  );

  displayDeadlines(filtered);
}

function resetDeadlineFilters() {
  const searchInput =
    document.getElementById("deadlineSearch");

  const typeSelect =
    document.getElementById("deadlineType");

  if (searchInput) {
    searchInput.value = "";
  }

  if (typeSelect) {
    typeSelect.value = "";
  }

  applyDeadlineFilters();
}

function showDeadlineError() {
  const list =
    document.getElementById("deadlinesList");

  const count =
    document.getElementById("deadlineCount");

  if (list) {
    list.innerHTML = `
      <p class="loading">
        Unable to load deadlines.
      </p>
    `;
  }

  if (count) {
    count.textContent =
      "Something went wrong loading deadlines.";
  }
}

function sortByClosingDate(
  first,
  second
) {
  const firstGroup =
    closingDateGroup(
      first.closingDate
    );

  const secondGroup =
    closingDateGroup(
      second.closingDate
    );

  if (firstGroup !== secondGroup) {
    return firstGroup - secondGroup;
  }

  const firstDate =
    dateValue(first.closingDate);

  const secondDate =
    dateValue(second.closingDate);

  if (firstGroup === 2) {
    return secondDate - firstDate;
  }

  if (firstDate !== secondDate) {
    return firstDate - secondDate;
  }

  return first.firmName.localeCompare(
    second.firmName
  );
}

function closingDateGroup(value) {
  if (!value || !isValidDate(value)) {
    return 1;
  }

  return startOfDate(value) >=
    startOfToday()
      ? 0
      : 2;
}

function formatOpportunityStart(item) {
  if (item.startDate) {
    return formatDate(
      item.startDate
    );
  }

  if (item.programmeDates) {
    return formatDisplayValue(
      item.programmeDates
    );
  }

  return "";
}

function fact(label, value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return `
    <div class="fact">

      <span class="fact-label">
        ${escapeHtml(label)}
      </span>

      <span class="fact-value">
        ${escapeHtml(
          formatDisplayValue(value)
        )}
      </span>

    </div>
  `;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

function formatDisplayValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .filter(Boolean)
      .join(", ");
  }

  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return String(value);
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const number =
    Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return `£${number.toLocaleString(
    "en-GB"
  )}`;
}

function dateValue(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? Number.POSITIVE_INFINITY
    : timestamp;
}

function isValidDate(value) {
  return !Number.isNaN(
    new Date(value).getTime()
  );
}

function startOfToday() {
  const date =
    new Date();

  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

function startOfDate(value) {
  const date =
    new Date(value);

  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
