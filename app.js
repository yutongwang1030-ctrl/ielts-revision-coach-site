function initNav(activePage) {
  const links = [
    { href: "index.html", label: "Home", id: "home" },
    { href: "upload.html", label: "Upload Essay", id: "upload" },
    { href: "journey.html", label: "Revision Journey", id: "journey" },
    { href: "teacher.html", label: "Teacher Mode", id: "teacher" },
  ];
  const navHtml = links.map((l) => `<a href="${l.href}" class="${l.id === activePage ? "active" : ""}">${l.label}</a>`).join("");
  const mobileHtml = links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("");
  document.querySelectorAll("[data-nav-desktop]").forEach((el) => {
    el.innerHTML = navHtml + `<a href="upload.html" class="btn btn-primary" style="margin-left:0.5rem;padding:0.5rem 1.25rem;border-radius:0.75rem;color:white;">Start Revising</a>`;
  });
  document.querySelectorAll("[data-nav-mobile]").forEach((el) => { el.innerHTML = mobileHtml; });
  const toggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  if (toggle && mobileNav) toggle.addEventListener("click", () => mobileNav.classList.toggle("open"));
}

function showLoading(message) {
  let el = document.getElementById("loading-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-overlay";
    el.className = "loading-overlay";
    el.innerHTML = '<div class="spinner"></div><p style="margin-top:1rem;color:#64748b;font-size:0.875rem;"></p>';
    document.body.appendChild(el);
  }
  el.querySelector("p").textContent = message || "Loading...";
  el.classList.remove("hidden");
}

function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.add("hidden");
}

function renderNavFooter(activePage) { initNav(activePage); }

function renderRoundTimeline(essay) {
  const progression = getScoreProgression(essay);
  const versions = essay.versions || [];
  return `<div class="round-timeline">${versions.map((v, i) => {
    const score = progression[i];
    const isLast = i === versions.length - 1;
    return `<div class="round-step ${isLast ? "active" : "done"}">
      <div class="round-dot">${i + 1}</div>
      <span class="round-label">${v.label}</span>
      ${score ? `<span class="round-band">Band ${score.band}</span>` : ""}
    </div>`;
  }).join("")}</div>`;
}

function renderWorkflowBanner(step) {
  const steps = [
    { id: "upload", label: "Upload" },
    { id: "diagnose", label: "Diagnose" },
    { id: "revise", label: "Revise" },
    { id: "compare", label: "Compare" },
    { id: "reflect", label: "Reflect" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return `<div class="workflow-banner">${steps.map((s, i) =>
    `<span class="workflow-step ${i === idx ? "active" : i < idx ? "done" : ""}">${i < idx ? "✓" : i + 1}. ${s.label}</span>`
  ).join('<span style="color:#d1dfd1;">→</span>')}</div>`;
}

function renderScoreProgression(essay) {
  const prog = getScoreProgression(essay);
  if (!prog.length) return "";
  const max = 9;
  return `<div class="score-progression">${prog.map((p) =>
    `<div class="score-bar-wrap">
      <div class="score-bar" style="height:${(p.band / max) * 100}%"></div>
      <span class="score-bar-label">${p.versionLabel}</span>
      <strong style="font-size:0.8rem;color:var(--sage-700);">${p.band}</strong>
    </div>`
  ).join("")}</div>`;
}

function bindExpandPanels() {
  document.querySelectorAll(".expand-header").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".expand-panel").classList.toggle("open"));
  });
}

function bindTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      container.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
      container.querySelectorAll(".tab-content").forEach((c) => c.classList.toggle("hidden", c.dataset.tab !== tab));
    });
  });
}
