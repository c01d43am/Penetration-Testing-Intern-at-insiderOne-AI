const list = document.getElementById("jobs");
const savedList = document.getElementById("saved-jobs");
const savedEmpty = document.getElementById("saved-empty");
const search = document.getElementById("search");
const status = document.getElementById("status");
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

function appendDetailList(parent, headingText, items) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  heading.textContent = headingText;
  const list = document.createElement("ul");
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
  section.append(heading, list);
  parent.append(section);
}

function appendJobFact(parent, labelText, valueText) {
  const fact = document.createElement("div");
  const label = document.createElement("dt");
  label.textContent = labelText;
  const value = document.createElement("dd");
  value.textContent = valueText;
  fact.append(label, value);
  parent.append(fact);
}

function createJobCard(job, actionLabel, onAction, disabled = false) {
  const card = document.createElement("li");
  const top = document.createElement("div");
  top.className = "job-card-top";

  const copy = document.createElement("div");
  copy.className = "job-copy";
  const title = document.createElement("h3");
  title.className = "job-title";
  title.textContent = job.title;
  const company = document.createElement("p");
  company.className = "job-company";
  company.textContent = job.company;
  const facts = document.createElement("dl");
  facts.className = "job-facts";
  appendJobFact(facts, "Location", job.location);
  appendJobFact(facts, "Monthly stipend", inrFormatter.format(job.stipend));
  copy.append(title, company, facts);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = actionLabel;
  button.disabled = disabled;
  button.addEventListener("click", onAction);
  top.append(copy, button);
  card.append(top);

  const details = document.createElement("details");
  details.className = "job-details";
  const summary = document.createElement("summary");
  summary.textContent = "Role details";
  const content = document.createElement("div");
  content.className = "job-details-content";
  const description = document.createElement("p");
  description.className = "job-description";
  description.textContent = job.description;
  const columns = document.createElement("div");
  columns.className = "job-detail-columns";
  appendDetailList(columns, "What you'll do", job.responsibilities);
  appendDetailList(columns, "What you'll bring", job.requirements);
  const learning = document.createElement("p");
  learning.className = "learning-note";
  const label = document.createElement("strong");
  label.textContent = "What you'll learn: ";
  learning.append(label, document.createTextNode(job.learning));
  content.append(description, columns, learning);
  details.append(summary, content);
  card.append(details);
  return card;
}

function renderJobs(jobs, savedIds) {
  list.replaceChildren();
  for (const job of jobs) {
    const isSaved = savedIds.has(job.id);
    const card = createJobCard(job, isSaved ? "Saved" : "Save", async () => {
      try {
        await requestJson("/api/saved", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        });
        status.textContent = "Job saved.";
        await show();
      } catch (error) {
        status.textContent = error.message;
      }
    }, isSaved);
    list.append(card);
  }
}

function renderSavedJobs(jobs) {
  savedList.replaceChildren();
  savedEmpty.hidden = jobs.length > 0;
  for (const job of jobs) {
    const card = createJobCard(job, "Remove", async () => {
      try {
        await requestJson(`/api/saved/${encodeURIComponent(job.id)}`, { method: "DELETE" });
        status.textContent = "Job removed from saved jobs.";
        await show();
      } catch (error) {
        status.textContent = error.message;
      }
    });
    savedList.append(card);
  }
}

async function show(query = search.value) {
  try {
    const [jobs, savedJobs] = await Promise.all([
      requestJson(`/api/jobs?q=${encodeURIComponent(query)}`),
      requestJson("/api/saved"),
    ]);
    const savedIds = new Set(savedJobs.map((job) => job.id));
    renderJobs(jobs, savedIds);
    renderSavedJobs(savedJobs);
  } catch (error) {
    status.textContent = error.message;
  }
}

search.addEventListener("input", () => show(search.value));
show("");
