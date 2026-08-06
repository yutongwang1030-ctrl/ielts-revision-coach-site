const STORAGE_KEY = "ielts-revision-data";

const DEFAULT_METRICS = {
  grammarAccuracy: [],
  vocabularyScore: [],
  coherenceScore: [],
  revisionCount: [],
  bandHistory: [],
  dates: [],
  commonMistakes: [
    { category: "grammar", count: 12, subcategories: ["article misuse", "tense inconsistency", "sentence fragments"] },
    { category: "vocabulary", count: 8, subcategories: ["repetitive wording", "informal expressions", "inaccurate collocations"] },
    { category: "coherence", count: 6, subcategories: ["unclear transitions"] },
    { category: "taskResponse", count: 5, subcategories: ["unsupported examples"] },
    { category: "logic", count: 4, subcategories: ["weak topic sentence"] },
    { category: "sentenceStructure", count: 3, subcategories: [] },
  ],
  vocabularyGrowth: [
    { word: "facilitate", firstSeen: "Jan 19", mastered: true },
    { word: "considerable", firstSeen: "Jan 19", mastered: true },
    { word: "simultaneously", firstSeen: "Jan 26", mastered: false },
    { word: "sustain", firstSeen: "Jan 26", mastered: false },
    { word: "psychological strain", firstSeen: "Feb 2", mastered: false },
  ],
};

function createEmptyMetrics() {
  return JSON.parse(JSON.stringify(DEFAULT_METRICS));
}

function defaultStudents() {
  return [
    { id: "student-demo", name: "Alex Chen", email: "alex@example.com", essays: [], metrics: createEmptyMetrics() },
    { id: "student-2", name: "Maria Santos", email: "maria@example.com", essays: [], metrics: createEmptyMetrics() },
    { id: "student-3", name: "James Park", email: "james@example.com", essays: [], metrics: createEmptyMetrics() },
  ];
}

function normalizeAppData(data) {
  if (!data || !Array.isArray(data.students)) return data;
  const essays = Array.isArray(data.essays) ? data.essays : [];

  data.students.forEach((student) => {
    if (!student.metrics) student.metrics = createEmptyMetrics();
    if (!Array.isArray(student.essays)) student.essays = [];

    const hasSavedEssay = essays.some((essay) => essay.studentId === student.id);
    if (!hasSavedEssay) {
      student.metrics = createEmptyMetrics();
      student.essays = [];
    }
  });

  return data;
}

function getAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { students: defaultStudents(), essays: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return normalizeAppData(JSON.parse(raw));
  } catch {
    return { students: defaultStudents(), essays: [] };
  }
}

function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCurrentStudentId() {
  return localStorage.getItem("ielts-student-id") || "student-demo";
}

function getEssay(id) {
  const essay = getAppData().essays.find((e) => e.id === id);
  return essay ? migrateEssay(essay) : null;
}

function migrateEssay(essay) {
  if (!essay.scoringHistory) essay.scoringHistory = essay.diagnostic ? [{ round: 1, band: essay.diagnostic.overallBandEstimate, diagnostic: essay.diagnostic, versionId: essay.versions[0]?.id, createdAt: essay.createdAt }] : [];
  if (!essay.revisionRounds) essay.revisionRounds = [{ round: 1, startedAt: essay.createdAt, status: essay.status === "completed" ? "completed" : "active" }];
  if (!essay.revisionExplanations) essay.revisionExplanations = [];
  if (!essay.errorDetails) essay.errorDetails = essay.diagnostic?.errorDetails || [];
  if (!essay.reflection) essay.reflection = null;
  if (!essay.currentRound) essay.currentRound = essay.revisionRounds.length;
  return essay;
}

function saveEssay(essay) {
  const data = getAppData();
  const migrated = migrateEssay(essay);
  const idx = data.essays.findIndex((e) => e.id === migrated.id);
  if (idx >= 0) data.essays[idx] = migrated;
  else data.essays.push(migrated);

  const student = data.students.find((s) => s.id === migrated.studentId);
  if (student) {
    updateStudentMetrics(student, migrated);
    const sIdx = student.essays.findIndex((e) => e.id === migrated.id);
    if (sIdx >= 0) student.essays[sIdx] = migrated;
    else student.essays.push(migrated);
  }
  saveAppData(data);
}

function updateStudentMetrics(student, essay) {
  if (!essay.diagnostic) return;
  const m = student.metrics;
  const d = essay.diagnostic;
  const grammar = d.criteria.find((c) => c.key === "grammaticalRange")?.score ?? 5;
  const vocab = d.criteria.find((c) => c.key === "lexicalResource")?.score ?? 5;
  const coherence = d.criteria.find((c) => c.key === "coherenceCohesion")?.score ?? 5;

  m.grammarAccuracy.push(Math.round(grammar * 11));
  m.vocabularyScore.push(Math.round(vocab * 11));
  m.coherenceScore.push(Math.round(coherence * 11));
  m.revisionCount.push(Math.max(0, essay.versions.length - 1));
  if (!m.bandHistory) m.bandHistory = [];
  m.bandHistory.push(d.overallBandEstimate);
  m.dates.push(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }));

  [m.grammarAccuracy, m.vocabularyScore, m.coherenceScore, m.revisionCount, m.bandHistory, m.dates].forEach((arr) => {
    if (arr.length > 12) arr.shift();
  });
}

function generateId() {
  return "essay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const CATEGORY_LABELS = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  coherence: "Coherence",
  logic: "Argument Logic",
  taskResponse: "Task Response",
  sentenceStructure: "Sentence Structure",
};

const SUBCATEGORY_LABELS = {
  "tense inconsistency": "Tense Inconsistency",
  "article misuse": "Article Misuse",
  "sentence fragments": "Sentence Fragments",
  "repetitive wording": "Repetitive Wording",
  "inaccurate collocations": "Inaccurate Collocations",
  "informal expressions": "Informal Expressions",
  "weak topic sentence": "Weak Topic Sentence",
  "unsupported examples": "Unsupported Examples",
  "unclear transitions": "Unclear Transitions",
};

function badgeClass(category) {
  const map = {
    grammar: "badge-grammar", vocabulary: "badge-vocab", coherence: "badge-coherence",
    logic: "badge-warning", taskResponse: "badge-task", sentenceStructure: "badge-default",
  };
  return map[category] || "badge-default";
}

function severityBadge(severity) {
  const map = { low: "badge-default", medium: "badge-warning", high: "badge-danger" };
  return map[severity] || "badge-default";
}

function computeSummary(essays) {
  const diagnosed = essays.filter((e) => e.diagnostic);
  const latestBands = essays.map((e) => {
    const hist = e.scoringHistory || [];
    return hist.length ? hist[hist.length - 1].band : e.diagnostic?.overallBandEstimate;
  }).filter(Boolean);
  const avgBand = latestBands.length ? latestBands.reduce((a, b) => a + b, 0) / latestBands.length : 0;
  const totalRevisions = essays.reduce((s, e) => s + Math.max(0, e.versions.length - 1), 0);
  const totalRounds = essays.reduce((s, e) => s + (e.revisionRounds?.length || 1), 0);
  return {
    essayCount: essays.length,
    diagnosedCount: diagnosed.length,
    avgBand: Math.round(avgBand * 10) / 10,
    totalRevisions,
    totalRounds,
  };
}

function getScoreProgression(essay) {
  return (essay.scoringHistory || []).map((s) => ({
    round: s.round,
    band: s.band,
    date: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
    versionLabel: essay.versions.find((v) => v.id === s.versionId)?.label || `Round ${s.round}`,
  }));
}

function highlightText(text, searchPhrase) {
  if (!searchPhrase || !text) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(searchPhrase.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + searchPhrase.length);
  const after = text.slice(idx + searchPhrase.length);
  return escapeHtml(before) + `<mark class="error-highlight">${escapeHtml(match)}</mark>` + escapeHtml(after);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatBandDelta(delta) {
  if (delta === null || delta === undefined) return "";
  if (delta > 0) return `<span class="band-delta positive">+${delta}</span>`;
  if (delta < 0) return `<span class="band-delta negative">${delta}</span>`;
  return `<span class="band-delta neutral">±0</span>`;
}
