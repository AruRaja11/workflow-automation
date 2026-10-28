const form = document.querySelector("#business-form");
const result = document.querySelector("#result");
const submitButton = document.querySelector("#submit-button");
const submitLabel = document.querySelector("#submit-label");
const placesSlider = document.querySelector("#placesToScrape");
const placesValue = document.querySelector("#places-value");
const placesSummary = document.querySelector("#places-summary");
const resultsPanel = document.querySelector("#results-panel");
const resultsTitle = document.querySelector("#results-title");
const resultsSubtitle = document.querySelector("#results-subtitle");
const resultsCount = document.querySelector("#results-count");
const resultsList = document.querySelector("#results-list");
const resultsSearch = document.querySelector("#results-search");
const resultsSort = document.querySelector("#results-sort");
const runHistory = document.querySelector("#run-history");
const runHistoryCount = document.querySelector("#run-history-count");
const runHistoryEmpty = document.querySelector("#run-history-empty");
const runHistoryList = document.querySelector("#run-history-list");
let previousRuns = [];
let currentLeads = [];

function updatePlacesSummary() {
  const perType = Number(placesSlider.value);
  placesValue.textContent = `${perType} each`;
  placesSummary.textContent = `Search limit: up to ${perType * 3} places total across 3 business types.`;
}

updatePlacesSummary();
placesSlider.addEventListener("input", updatePlacesSummary);

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function createCopyButton(value, label) {
  const button = document.createElement("button");
  button.className = "copy-button";
  button.type = "button";
  button.dataset.copy = value;
  button.setAttribute("aria-label", `Copy ${label.toLowerCase()}`);
  button.textContent = "Copy";
  return button;
}

function createProspectCard(lead, index) {
  const card = document.createElement("article");
  card.className = "prospect-card";

  const top = document.createElement("div");
  top.className = "prospect-card-top";
  top.append(createTextElement("span", "prospect-index", String(index + 1).padStart(2, "0")));
  if (lead.category) top.append(createTextElement("span", "prospect-category", lead.category));
  card.append(top);

  const heading = createTextElement("h3", "prospect-name", lead.name || "Unnamed business");
  card.append(heading);

  const meta = document.createElement("div");
  meta.className = "prospect-meta";
  if (lead.rating !== null && lead.rating !== undefined && lead.rating !== "") {
    const rating = createTextElement("span", "prospect-rating", `★ ${lead.rating}`);
    rating.setAttribute("aria-label", `Rating ${lead.rating} out of 5`);
    meta.append(rating);
  }
  if (lead.address) {
    const address = createTextElement("span", "prospect-address", lead.address);
    meta.append(address);
  }
  if (meta.childElementCount) card.append(meta);

  const actions = document.createElement("div");
  actions.className = "prospect-actions";
  if (lead.phone) {
    const callLink = createTextElement("a", "prospect-action prospect-action-primary", "Call");
    const phoneUri = String(lead.phone).replace(/[^\d+*#;,]/g, "");
    if (phoneUri) {
      callLink.href = `tel:${phoneUri}`;
      callLink.setAttribute("aria-label", `Call ${lead.name || "business"} at ${lead.phone}`);
      actions.append(callLink);
    }
    actions.append(createCopyButton(lead.phone, "phone number"));
  }

  const mapsUrl = lead.google_maps_url || lead.google_map_url;
  if (mapsUrl) {
    try {
      const parsedUrl = new URL(mapsUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("Unsupported map URL protocol");
      }
      const mapLink = createTextElement("a", "prospect-action", "Open map");
      mapLink.href = parsedUrl.href;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      actions.append(mapLink);
    } catch {
      actions.append(createTextElement("span", "prospect-action-disabled", "Map unavailable"));
    }
  }
  if (actions.childElementCount) card.append(actions);

  const details = document.createElement("details");
  details.className = "prospect-message";
  const messageSummary = document.createElement("summary");
  messageSummary.append(createTextElement("span", "prospect-message-label", "Suggested outreach message"));
  if (lead.cold_message) {
    messageSummary.append(createTextElement("span", "prospect-message-hint", "View and copy"));
  }
  details.append(messageSummary);
  const messageBody = document.createElement("div");
  messageBody.className = "prospect-message-body";
  messageBody.append(
    createTextElement(
      "p",
      "prospect-message-text",
      lead.cold_message || "No message was generated for this prospect.",
    ),
  );
  if (lead.cold_message) {
    messageBody.append(createCopyButton(lead.cold_message, "cold message"));
  }
  details.append(messageBody);
  card.append(details);

  if (lead.seq_id !== null && lead.seq_id !== undefined) {
    card.append(createTextElement("span", "prospect-record-id", `Record #${lead.seq_id}`));
  }

  return card;
}

function extractLeads(payload) {
  const leadResults = payload?.scrap_leads ?? payload;
  if (!leadResults || !Array.isArray(leadResults.leads)) {
    throw new Error("The response did not include a valid prospect list.");
  }
  return leadResults.leads;
}

function filterAndSortLeads() {
  const query = resultsSearch.value.trim().toLocaleLowerCase();
  const filtered = currentLeads.filter((lead) => {
    const searchableText = [
      lead.name,
      lead.category,
      lead.address,
      lead.phone,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    return searchableText.includes(query);
  });

  if (resultsSort.value === "name") {
    filtered.sort((left, right) => (left.name || "").localeCompare(right.name || ""));
  } else if (resultsSort.value === "rating") {
    filtered.sort((left, right) => {
      const leftRating = Number(left.rating) || 0;
      const rightRating = Number(right.rating) || 0;
      return rightRating - leftRating || (left.name || "").localeCompare(right.name || "");
    });
  }
  return filtered;
}

function renderResults(leads) {
  currentLeads = leads;
  resultsSearch.value = "";
  resultsSort.value = "relevance";
  resultsPanel.hidden = false;
  renderVisibleResults();
}

function renderVisibleResults() {
  const leads = filterAndSortLeads();
  resultsList.replaceChildren();
  resultsCount.textContent = `${leads.length} of ${currentLeads.length} ${currentLeads.length === 1 ? "prospect" : "prospects"}`;
  resultsSubtitle.textContent = resultsSearch.value.trim()
    ? "Filtered by your search. Clear it to see the full prospect list."
    : "Review each business and choose your next step.";

  if (leads.length === 0) {
    resultsList.append(
      createTextElement(
        "p",
        "results-empty",
        currentLeads.length
          ? "No prospects match that search. Try another name, category, phone, or location."
          : "No prospects were found for this search. Try a different business type or location.",
      ),
    );
    return;
  }

  leads.forEach((lead, index) => {
    resultsList.append(createProspectCard(lead, index));
  });
}

resultsSearch.addEventListener("input", renderVisibleResults);
resultsSort.addEventListener("change", renderVisibleResults);

function formatRunDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderRunHistory() {
  runHistoryCount.textContent = String(previousRuns.length);
  runHistoryCount.setAttribute(
    "aria-label",
    `${previousRuns.length} previous ${previousRuns.length === 1 ? "run" : "runs"}`,
  );
  runHistoryEmpty.textContent = previousRuns.length
    ? ""
    : "No completed runs yet. Your successful searches will appear here.";
  runHistoryEmpty.hidden = previousRuns.length > 0;
  runHistoryList.replaceChildren();

  previousRuns.forEach((run) => {
    const item = document.createElement("li");
    item.className = "run-history-entry";
    const businessTypes = [run.business1, run.business2, run.business3].filter(Boolean);
    const title = businessTypes.join(", ") || "Prospecting run";
    const location = run.location || "Location not provided";
    const date = formatRunDate(run.created_date);

    item.append(createTextElement("span", "run-history-item-title", title));
    item.append(
      createTextElement(
        "span",
        "run-history-item-meta",
        `${location} · ${date} · up to ${run.search_place_count} places per type`,
      ),
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "run-history-action";
    button.textContent = "Check executions";
    button.setAttribute("aria-label", `Check executions for ${title} in ${location}`);
    button.addEventListener("click", () => loadRunExecutions(run, button, title, location, date));
    item.append(button);
    runHistoryList.append(item);
  });
}

async function loadPreviousRuns() {
  runHistoryEmpty.textContent = "Loading previous runs...";
  runHistoryEmpty.hidden = false;
  runHistoryCount.textContent = "…";

  try {
    const response = await fetch("/previous-runs");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || payload.error || "Could not load previous runs.");
    }
    if (!Array.isArray(payload)) throw new Error("The previous runs response was invalid.");

    previousRuns = payload;
    renderRunHistory();
  } catch (error) {
    previousRuns = [];
    runHistoryCount.textContent = "!";
    runHistoryCount.setAttribute("aria-label", "Previous runs unavailable");
    runHistoryEmpty.textContent = error instanceof Error
      ? error.message
      : "Could not load previous runs.";
    runHistoryEmpty.hidden = false;
    runHistoryList.replaceChildren();
  }
}

async function loadRunExecutions(run, button, title, location, date) {
  button.disabled = true;
  button.textContent = "Loading executions...";

  try {
    const response = await fetch(
      `/previous-runs/${encodeURIComponent(run.id)}/executions`,
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || payload.error || "Could not load executions.");
    }
    if (!Array.isArray(payload)) throw new Error("The executions response was invalid.");

    renderResults(payload);
    resultsTitle.textContent = `Execution results · ${date}`;
    result.dataset.state = "success";
    result.textContent = `Showing ${payload.length} ${payload.length === 1 ? "prospect" : "prospects"} from ${title} in ${location}.`;
    runHistory.open = false;
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    result.dataset.state = "error";
    result.textContent = error instanceof Error
      ? error.message
      : "Could not load this run's executions.";
  } finally {
    button.disabled = false;
    button.textContent = "Check executions";
  }
}

loadPreviousRuns();

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable.");
}

resultsList.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-button");
  if (!button) return;

  const originalLabel = button.textContent;
  button.disabled = true;
  try {
    await copyText(button.dataset.copy);
    button.textContent = "Copied";
    result.textContent = `${button.getAttribute("aria-label").replace("Copy ", "")} copied.`;
    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1600);
  } catch {
    result.dataset.state = "error";
    result.textContent = "Could not copy this value. Select and copy it manually.";
  } finally {
    button.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.textContent = "Submitting...";
  result.dataset.state = "";
  resultsPanel.hidden = true;
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");
  submitLabel.textContent = "Building your prospecting brief...";

  try {
    const response = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || payload.detail || "Submission failed.");

    const leads = extractLeads(payload);
    renderResults(leads);
    result.dataset.state = "success";
    result.textContent = leads.length
      ? `Your brief is ready. ${leads.length} ${leads.length === 1 ? "prospect" : "prospects"} found.`
      : "Your search completed, but no prospects were found.";
    resultsTitle.textContent = "Prospects found";
    await loadPreviousRuns();
  } catch (error) {
    resultsPanel.hidden = true;
    result.dataset.state = "error";
    result.textContent = error instanceof Error ? error.message : "Submission failed.";
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
    submitLabel.textContent = "Build my prospecting brief";
  }
});
