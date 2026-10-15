
"use strict";

// ========================================
// Job Application Tracker
// ========================================

const API_URL = "https://job-application-tracker-1lpt.onrender.com";
const PAGE_SIZE = 10;

let applications = [];
let currentPage = 1;

let statusChartInstance = null;
let companyChartInstance = null;
let activityChartInstance = null;

const $ = (id) => document.getElementById(id);

// Form elements
const applicationForm = $("applicationForm");
const applicationFormSection = $("applicationFormSection");
const applicationIdInput = $("applicationId");
const companyNameInput = $("companyName");
const jobTitleInput = $("jobTitle");
const applicationDateInput = $("applicationDate");
const applicationStatusInput = $("applicationStatus");
const followUpDateInput = $("followUpDate");
const notesInput = $("notes");
const formHeading = $("formHeading");
const saveApplicationBtn = $("saveApplicationBtn");

// Buttons
const addApplicationBtn = $("addApplicationBtn");
const cancelBtn = $("cancelBtn");
const clearFiltersBtn = $("clearFiltersBtn");
const exportCsvBtn = $("exportCsvBtn");
const previousPageBtn = $("previousPage");
const nextPageBtn = $("nextPage");

// Search and filters
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");
const sortBy = $("sortBy");

// Table and messages
const applicationsTableBody = $("applicationsTableBody");
const pageInfo = $("pageInfo");
const resultsSummary = $("resultsSummary");
const messageElement = $("message");

// ========================================
// Utility functions
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showMessage(message, type = "success") {
    if (!messageElement) {
        console.log(message);
        return;
    }

    messageElement.textContent = message;
    messageElement.className = `message ${type}`;

    clearTimeout(showMessage.timeoutId);

    showMessage.timeoutId = setTimeout(() => {
        messageElement.textContent = "";
        messageElement.className = "message";
    }, 4000);
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        let message = `Request failed (${response.status}).`;

        try {
            const error = await response.json();

            if (typeof error.detail === "string") {
                message = error.detail;
            } else if (Array.isArray(error.detail)) {
                message = error.detail
                    .map((item) => item.msg || "Invalid input")
                    .join(", ");
            }
        } catch {
            // Use the default error message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    const responseText = await response.text();
    return responseText ? JSON.parse(responseText) : null;
}

function getLocalDateString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}

// ========================================
// Load applications and dashboard statistics
// ========================================

async function loadApplications() {
    if (applicationsTableBody) {
        applicationsTableBody.innerHTML =
            '<tr><td colspan="7" class="empty-cell">Loading applications...</td></tr>';
    }

    try {
        const data = await apiRequest(`${API_URL}/applications`);

        applications = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : [];

        currentPage = 1;

        renderApplications();
        renderAnalytics();

        await Promise.all([
            loadStatistics(),
            loadReminders()
        ]);
    } catch (error) {
        console.error("Could not load applications:", error);

        if (applicationsTableBody) {
            applicationsTableBody.innerHTML =
                '<tr><td colspan="7" class="empty-cell">Could not load applications. Check that the API is running.</td></tr>';
        }

        showMessage(
            `Could not load applications: ${error.message}`,
            "error"
        );
    }
}

async function loadStatistics() {
    try {
        const stats = await apiRequest(`${API_URL}/applications/stats`);

        setText("totalApplications", stats.total_applications ?? applications.length);
        setText("appliedCount", stats.applied ?? 0);
        setText("interviewCount", stats.interviews ?? 0);
        setText("rejectedCount", stats.rejected ?? 0);
        setText("offerCount", stats.offers ?? 0);
    } catch (error) {
        console.error("Statistics could not be loaded:", error);

        // Keep the dashboard useful if the statistics endpoint fails.
        const counts = {
            totalApplications: applications.length,
            appliedCount: 0,
            interviewCount: 0,
            rejectedCount: 0,
            offerCount: 0
        };

        applications.forEach((application) => {
            const status = String(application.status || "").toLowerCase();

            if (status === "applied") counts.appliedCount++;
            if (status === "interview") counts.interviewCount++;
            if (status === "rejected") counts.rejectedCount++;
            if (status === "offer" || status === "offered") counts.offerCount++;
        });

        Object.entries(counts).forEach(([id, value]) => setText(id, value));
    }
}

// ========================================
// Search, filters and sorting
// ========================================

function getFilteredApplications() {
    const query = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const status = statusFilter ? statusFilter.value : "All";

    return applications.filter((application) => {
        const company = String(application.company_name ?? "").toLowerCase();
        const title = String(application.job_title ?? "").toLowerCase();

        const matchesSearch =
            company.includes(query) || title.includes(query);

        const matchesStatus =
            !status ||
            status === "All" ||
            status === "All Statuses" ||
            application.status === status;

        return matchesSearch && matchesStatus;
    });
}

function getSortedApplications(items) {
    const sorted = [...items];
    const sort = sortBy ? sortBy.value : "newest";

    if (sort === "newest") {
        sorted.sort((a, b) =>
            String(b.application_date ?? "").localeCompare(
                String(a.application_date ?? "")
            )
        );
    } else if (sort === "oldest") {
        sorted.sort((a, b) =>
            String(a.application_date ?? "").localeCompare(
                String(b.application_date ?? "")
            )
        );
    } else if (sort === "company") {
        sorted.sort((a, b) =>
            String(a.company_name ?? "").localeCompare(
                String(b.company_name ?? "")
            )
        );
    }

    return sorted;
}

function createStatusBadge(status) {
    const classes = {
        Applied: "status-applied",
        Interview: "status-interview",
        Rejected: "status-rejected",
        Offer: "status-offer"
    };

    const safeStatus = status || "Applied";
    const className = classes[safeStatus] || "status-applied";

    return `<span class="status-badge ${className}">${escapeHTML(safeStatus)}</span>`;
}

// ========================================
// Render application table and pagination
// ========================================

function renderApplications() {
    if (!applicationsTableBody) return;

    const sorted = getSortedApplications(getFilteredApplications());
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    if (previousPageBtn) {
        previousPageBtn.disabled = currentPage <= 1;
    }

    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    setText("pageInfo", `Page ${currentPage} of ${totalPages}`);

    if (resultsSummary) {
        resultsSummary.textContent = total
            ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} applications`
            : "No applications found";
    }

    if (!pageItems.length) {
        applicationsTableBody.innerHTML =
            '<tr><td colspan="7" class="empty-cell">No applications found. Try changing your search or filters.</td></tr>';
        return;
    }

    applicationsTableBody.innerHTML = pageItems.map((application) => `
        <tr>
            <td class="company-name">${escapeHTML(application.company_name)}</td>
            <td>${escapeHTML(application.job_title)}</td>
            <td>${formatDate(application.application_date)}</td>
            <td>${createStatusBadge(application.status)}</td>
            <td>${formatDate(application.follow_up_date)}</td>
            <td class="notes-cell">${escapeHTML(application.notes || "—")}</td>
            <td>
                <div class="action-buttons">
                    <button
                        class="action-button edit-button"
                        type="button"
                        data-action="edit"
                        data-id="${Number(application.id)}"
                    >Edit</button>
                    <button
                        class="action-button delete-button"
                        type="button"
                        data-action="delete"
                        data-id="${Number(application.id)}"
                    >Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

// ========================================
// Add and edit application form
// ========================================

function openAddForm() {
    if (!applicationForm || !applicationFormSection) return;

    applicationForm.reset();

    if (applicationIdInput) applicationIdInput.value = "";
    if (applicationStatusInput) applicationStatusInput.value = "Applied";
    if (applicationDateInput) applicationDateInput.value = getLocalDateString();
    if (followUpDateInput) followUpDateInput.value = "";

    setText("formHeading", "Add Application");

    if (saveApplicationBtn) {
        saveApplicationBtn.textContent = "Save Application";
    }

    applicationFormSection.classList.remove("hidden");
    applicationFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeForm() {
    if (!applicationForm || !applicationFormSection) return;

    applicationForm.reset();

    if (applicationIdInput) applicationIdInput.value = "";

    applicationFormSection.classList.add("hidden");
    setText("formHeading", "Add Application");

    if (saveApplicationBtn) {
        saveApplicationBtn.textContent = "Save Application";
        saveApplicationBtn.disabled = false;
    }
}

function editApplication(id) {
    const application = applications.find(
        (item) => Number(item.id) === Number(id)
    );

    if (!application) {
        showMessage("Application not found.", "error");
        return;
    }

    if (applicationIdInput) applicationIdInput.value = application.id;
    if (companyNameInput) companyNameInput.value = application.company_name ?? "";
    if (jobTitleInput) jobTitleInput.value = application.job_title ?? "";

    if (applicationDateInput) {
        applicationDateInput.value =
            String(application.application_date ?? "").slice(0, 10);
    }

    if (applicationStatusInput) {
        applicationStatusInput.value = application.status ?? "Applied";
    }

    if (followUpDateInput) {
        followUpDateInput.value =
            String(application.follow_up_date ?? "").slice(0, 10);
    }

    if (notesInput) notesInput.value = application.notes ?? "";

    setText("formHeading", "Edit Application");

    if (saveApplicationBtn) {
        saveApplicationBtn.textContent = "Update Application";
    }

    if (applicationFormSection) {
        applicationFormSection.classList.remove("hidden");
        applicationFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

async function saveApplication(event) {
    event.preventDefault();

    const id = applicationIdInput ? applicationIdInput.value : "";

    const payload = {
        company_name: companyNameInput.value.trim(),
        job_title: jobTitleInput.value.trim(),
        application_date: applicationDateInput.value,
        status: applicationStatusInput.value,
        notes: notesInput.value.trim(),
        follow_up_date: followUpDateInput
            ? (followUpDateInput.value || null)
            : null
    };

    if (
        !payload.company_name ||
        !payload.job_title ||
        !payload.application_date
    ) {
        showMessage("Please complete all required fields.", "error");
        return;
    }

    if (saveApplicationBtn) {
        saveApplicationBtn.disabled = true;
    }

    try {
        if (id) {
            await apiRequest(`${API_URL}/applications/${id}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            showMessage("Application updated successfully.");
        } else {
            await apiRequest(`${API_URL}/applications`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage("Application added successfully.");
        }

        closeForm();
        await loadApplications();
    } catch (error) {
        showMessage(`Could not save application: ${error.message}`, "error");
    } finally {
        if (saveApplicationBtn) {
            saveApplicationBtn.disabled = false;
            saveApplicationBtn.textContent = id
                ? "Update Application"
                : "Save Application";
        }
    }
}

async function deleteApplication(id) {
    const application = applications.find(
        (item) => Number(item.id) === Number(id)
    );

    if (!application) return;

    const confirmed = confirm(
        `Delete ${application.company_name} — ${application.job_title}?`
    );

    if (!confirmed) return;

    try {
        await apiRequest(`${API_URL}/applications/${id}`, {
            method: "DELETE"
        });

        showMessage("Application deleted successfully.");
        await loadApplications();
    } catch (error) {
        showMessage(`Could not delete application: ${error.message}`, "error");
    }
}

// ========================================
// Follow-up reminders
// ========================================

function renderReminderList(containerId, items, emptyMessage) {
    const container = $(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<p class="empty-cell">${escapeHTML(emptyMessage)}</p>`;
        return;
    }

    container.innerHTML = items.map((item) => `
        <article class="reminder-item">
            <h3>${escapeHTML(item.company_name || "Unknown company")}</h3>
            <p>${escapeHTML(item.job_title || "")}</p>
            <p><strong>Follow-up:</strong> ${formatDate(item.follow_up_date)}</p>
            ${item.status ? `<p><strong>Status:</strong> ${escapeHTML(item.status)}</p>` : ""}
            ${item.notes ? `<p>${escapeHTML(item.notes)}</p>` : ""}
        </article>
    `).join("");
}

async function loadReminders() {
    try {
        const data = await apiRequest(`${API_URL}/applications/reminders`);

        const overdue = Array.isArray(data.overdue) ? data.overdue : [];
        const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];

        setText("overdueReminderCount", data.overdue_count ?? overdue.length);
        setText("upcomingReminderCount", data.upcoming_count ?? upcoming.length);

        renderReminderList(
            "overdueReminders",
            overdue,
            "No overdue follow-ups."
        );

        renderReminderList(
            "upcomingReminders",
            upcoming,
            "No upcoming follow-ups."
        );
    } catch (error) {
        console.error("Follow-up reminders could not be loaded:", error);

        setText("overdueReminderCount", "0");
        setText("upcomingReminderCount", "0");

        renderReminderList(
            "overdueReminders",
            [],
            "Reminders could not be loaded."
        );

        renderReminderList(
            "upcomingReminders",
            [],
            "Reminders could not be loaded."
        );
    }
}

// ========================================
// Clear filters and CSV export
// ========================================

function clearFilters() {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "All";
    if (sortBy) sortBy.value = "newest";

    currentPage = 1;
    renderApplications();
}

function exportApplicationsToCSV() {
    if (!applications.length) {
        showMessage("There are no applications to export.", "error");
        return;
    }

    const headers = [
        "ID",
        "Company Name",
        "Job Title",
        "Application Date",
        "Status",
        "Follow-Up Date",
        "Notes"
    ];

    function csvCell(value) {
        let text = String(value ?? "");

        // Reduce spreadsheet formula injection risk.
        if (/^[\s]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return `"${text.replace(/"/g, '""')}"`;
    }

    const rows = applications.map((application) => [
        application.id,
        application.company_name,
        application.job_title,
        String(application.application_date ?? "").slice(0, 10),
        application.status,
        String(application.follow_up_date ?? "").slice(0, 10),
        application.notes
    ]);

    const csv = [
        headers.map(csvCell).join(","),
        ...rows.map((row) => row.map(csvCell).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "job_applications.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showMessage(`${applications.length} applications exported successfully.`);
}

// ========================================
// Dashboard analytics and charts
// ========================================

function renderAnalytics() {
    const statusCanvas = $("statusChart");
    const companyCanvas = $("companyChart");
    const activityCanvas = $("activityChart");

    const statuses = {
        Applied: 0,
        Interview: 0,
        Rejected: 0,
        Offer: 0
    };

    const companies = {};
    const activity = {};

    applications.forEach((application) => {
        const status = application.status || "Applied";

        if (Object.prototype.hasOwnProperty.call(statuses, status)) {
            statuses[status]++;
        }

        const company = application.company_name || "Unknown";
        companies[company] = (companies[company] || 0) + 1;

        const date = String(application.application_date ?? "").slice(0, 10);

        if (date) {
            activity[date] = (activity[date] || 0) + 1;
        }
    });

    const total = applications.length;

    setText(
        "interviewRate",
        `${(total ? statuses.Interview / total * 100 : 0).toFixed(1)}%`
    );

    setText(
        "offerRate",
        `${(total ? statuses.Offer / total * 100 : 0).toFixed(1)}%`
    );

    // Chart.js is loaded in index.html. If unavailable, the rest of the app still works.
    if (typeof Chart === "undefined") {
        console.error("Chart.js did not load.");
        return;
    }

    if (statusChartInstance) statusChartInstance.destroy();
    if (companyChartInstance) companyChartInstance.destroy();
    if (activityChartInstance) activityChartInstance.destroy();

    if (statusCanvas) {
        statusChartInstance = new Chart(statusCanvas, {
            type: "doughnut",
            data: {
                labels: Object.keys(statuses),
                datasets: [{
                    data: Object.values(statuses),
                    backgroundColor: [
                        "#5145ed",
                        "#f59e0b",
                        "#ef4444",
                        "#16a34a"
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    }

    if (companyCanvas) {
        const topCompanies = Object.entries(companies)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        companyChartInstance = new Chart(companyCanvas, {
            type: "bar",
            data: {
                labels: topCompanies.map((item) => item[0]),
                datasets: [{
                    label: "Applications",
                    data: topCompanies.map((item) => item[1]),
                    backgroundColor: "#5145ed",
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    if (activityCanvas) {
        const dates = Object.keys(activity).sort();

        activityChartInstance = new Chart(activityCanvas, {
            type: "line",
            data: {
                labels: dates,
                datasets: [{
                    label: "Applications",
                    data: dates.map((date) => activity[date]),
                    borderColor: "#5145ed",
                    backgroundColor: "rgba(81, 69, 237, 0.12)",
                    fill: true,
                    tension: 0.25
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
}

// ========================================
// Event listeners
// ========================================

if (addApplicationBtn) {
    addApplicationBtn.addEventListener("click", openAddForm);
}

if (cancelBtn) {
    cancelBtn.addEventListener("click", closeForm);
}

if (applicationForm) {
    applicationForm.addEventListener("submit", saveApplication);
}

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearFilters);
}

if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportApplicationsToCSV);
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        currentPage = 1;
        renderApplications();
    });
}

if (statusFilter) {
    statusFilter.addEventListener("change", () => {
        currentPage = 1;
        renderApplications();
    });
}

if (sortBy) {
    sortBy.addEventListener("change", () => {
        currentPage = 1;
        renderApplications();
    });
}

if (previousPageBtn) {
    previousPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderApplications();
        }
    });
}

if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
        const total = getFilteredApplications().length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        if (currentPage < totalPages) {
            currentPage++;
            renderApplications();
        }
    });
}

if (applicationsTableBody) {
    applicationsTableBody.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action][data-id]");
        if (!button) return;

        const id = button.dataset.id;

        if (button.dataset.action === "edit") {
            editApplication(id);
        } else if (button.dataset.action === "delete") {
            deleteApplication(id);
        }
    });
}

// Start the dashboard.
loadApplications();
