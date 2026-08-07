const DEFAULT_METRICS = {
  grammarAccuracy: [],
  vocabularyScore: [],
  coherenceScore: [],
  revisionCount: [],
  bandHistory: [],
  dates: [],
  commonMistakes: [],
  vocabularyGrowth: [],
};

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

let supabaseClient;
let authListenerBound = false;

function createEmptyMetrics() {
  return JSON.parse(JSON.stringify(DEFAULT_METRICS));
}

function getAppConfig() {
  return window.APP_CONFIG || {};
}

function isSupabaseConfigured() {
  const config = getAppConfig();
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase?.createClient);
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured yet.");
  }
  if (!supabaseClient) {
    const config = getAppConfig();
    supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  if (!authListenerBound) {
    supabaseClient.auth.onAuthStateChange(() => {
      refreshAuthUI().catch(() => {});
    });
    authListenerBound = true;
  }
  return supabaseClient;
}

function generateId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "essay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function badgeClass(category) {
  const map = {
    grammar: "badge-grammar",
    vocabulary: "badge-vocab",
    coherence: "badge-coherence",
    logic: "badge-warning",
    taskResponse: "badge-task",
    sentenceStructure: "badge-default",
  };
  return map[category] || "badge-default";
}

function severityBadge(severity) {
  const map = { low: "badge-default", medium: "badge-warning", high: "badge-danger" };
  return map[severity] || "badge-default";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function formatBandDelta(delta) {
  if (delta === null || delta === undefined) return "";
  if (delta > 0) return `<span class="band-delta positive">+${delta}</span>`;
  if (delta < 0) return `<span class="band-delta negative">${delta}</span>`;
  return `<span class="band-delta neutral">±0</span>`;
}

function formatDateLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function migrateEssay(essay) {
  if (!essay) return null;
  if (!essay.scoringHistory) {
    essay.scoringHistory = essay.diagnostic
      ? [{
          round: 1,
          band: essay.diagnostic.overallBandEstimate,
          diagnostic: essay.diagnostic,
          versionId: essay.versions?.[0]?.id,
          createdAt: essay.createdAt,
        }]
      : [];
  }
  if (!essay.revisionRounds) {
    essay.revisionRounds = [{
      round: 1,
      startedAt: essay.createdAt,
      status: essay.status === "completed" ? "completed" : "active",
    }];
  }
  if (!essay.revisionExplanations) essay.revisionExplanations = [];
  if (!essay.errorDetails) essay.errorDetails = essay.diagnostic?.errorDetails || [];
  if (!essay.reflection) essay.reflection = null;
  if (!essay.currentRound) essay.currentRound = essay.revisionRounds.length;
  if (!essay.hints) essay.hints = [];
  if (!essay.hintsUnlocked) essay.hintsUnlocked = 1;
  if (!essay.revisionChecklist) essay.revisionChecklist = [];
  if (!essay.lastRevisionResult) essay.lastRevisionResult = null;
  return essay;
}

function getScoreProgression(essay) {
  return (essay.scoringHistory || []).map((score) => ({
    round: score.round,
    band: score.band,
    date: score.createdAt ? new Date(score.createdAt).toLocaleDateString() : "",
    versionLabel: essay.versions.find((version) => version.id === score.versionId)?.label || `Round ${score.round}`,
  }));
}

function computeSummary(essays) {
  const diagnosed = essays.filter((essay) => essay.diagnostic);
  const latestBands = essays
    .map((essay) => {
      const history = essay.scoringHistory || [];
      return history.length ? history[history.length - 1].band : essay.diagnostic?.overallBandEstimate;
    })
    .filter(Boolean);
  const avgBand = latestBands.length ? latestBands.reduce((sum, band) => sum + band, 0) / latestBands.length : 0;
  const totalRevisions = essays.reduce((sum, essay) => sum + Math.max(0, essay.versions.length - 1), 0);
  const totalRounds = essays.reduce((sum, essay) => sum + (essay.revisionRounds?.length || 1), 0);
  return {
    essayCount: essays.length,
    diagnosedCount: diagnosed.length,
    avgBand: Math.round(avgBand * 10) / 10,
    totalRevisions,
    totalRounds,
  };
}

function createMetricsFromEssays(essays) {
  const metrics = createEmptyMetrics();
  const scoreTimeline = [];
  const weaknessMap = new Map();

  essays
    .slice()
    .sort((a, b) => new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt))
    .forEach((essay) => {
      const diagnostic = essay.diagnostic;
      if (diagnostic) {
        const grammar = diagnostic.criteria.find((item) => item.key === "grammaticalRange")?.score ?? 0;
        const vocabulary = diagnostic.criteria.find((item) => item.key === "lexicalResource")?.score ?? 0;
        const coherence = diagnostic.criteria.find((item) => item.key === "coherenceCohesion")?.score ?? 0;

        metrics.grammarAccuracy.push(Math.round(grammar * 11));
        metrics.vocabularyScore.push(Math.round(vocabulary * 11));
        metrics.coherenceScore.push(Math.round(coherence * 11));
      }

      metrics.revisionCount.push(Math.max(0, essay.versions.length - 1));

      (essay.scoringHistory || []).forEach((entry) => {
        scoreTimeline.push({
          band: entry.band,
          createdAt: entry.createdAt || essay.updatedAt || essay.createdAt,
        });
      });

      (essay.errorDetails || diagnostic?.errorDetails || []).forEach((error) => {
        const current = weaknessMap.get(error.category) || {
          category: error.category,
          count: 0,
          subcategories: new Set(),
        };
        current.count += 1;
        if (error.subcategory) current.subcategories.add(error.subcategory);
        weaknessMap.set(error.category, current);
      });
    });

  scoreTimeline
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-12)
    .forEach((entry) => {
      metrics.bandHistory.push(entry.band);
      metrics.dates.push(formatDateLabel(entry.createdAt));
    });

  metrics.commonMistakes = Array.from(weaknessMap.values()).map((item) => ({
    category: item.category,
    count: item.count,
    subcategories: Array.from(item.subcategories),
  }));

  return metrics;
}

function normalizeProfile(profile, user) {
  return {
    id: profile?.id || user.id,
    email: profile?.email || user.email,
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
    role: profile?.role || "student",
    metrics: createEmptyMetrics(),
  };
}

function buildFallbackProfile(user, overrides = {}) {
  return {
    id: user.id,
    email: overrides.email || user.email,
    full_name: overrides.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
    role: overrides.role || "student",
  };
}

function buildStudentFromEssays(user, profile, essays) {
  const normalized = normalizeProfile(profile, user);
  normalized.metrics = createMetricsFromEssays(essays);
  return normalized;
}

async function ensureProfile(user, overrides = {}) {
  const client = getSupabase();
  const selectProfile = async () => {
    const { data, error } = await client
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return { __error: error };
    return data;
  };

  let existing = await selectProfile();
  if (existing && !existing.__error) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    existing = await selectProfile();
    if (existing && !existing.__error) return existing;
  }

  return buildFallbackProfile(user, overrides);
}

async function getSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSession();
  return session?.user || null;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureProfile(user);
}

function getReturnToUrl() {
  return window.location.pathname.split("/").pop() + window.location.search;
}

function redirectToAuth() {
  const returnTo = encodeURIComponent(getReturnToUrl());
  window.location.href = `auth.html?returnTo=${returnTo}`;
}

async function refreshAuthUI() {
  const authSlotNodes = document.querySelectorAll("[data-auth-slot]");
  if (!authSlotNodes.length) return;

  let user = null;
  let profile = null;
  if (isSupabaseConfigured()) {
    user = await getCurrentUser();
    if (user) {
      try {
        profile = await getCurrentProfile();
      } catch (error) {
        profile = buildFallbackProfile(user);
      }
    }
  }

  authSlotNodes.forEach((node) => {
    const isMobile = node.classList.contains("mobile-auth-slot");
    if (user) {
      const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || "Student";
      const displayEmail = user.email || "";
      const avatarInitial = (displayName || displayEmail || "S").trim().charAt(0).toUpperCase();
      node.innerHTML = `
        <div class="${isMobile ? "mobile-account-card" : "nav-account-card"}">
          <div class="nav-account-summary">
            <div class="nav-avatar" aria-hidden="true">${escapeHtml(avatarInitial)}</div>
            <div class="nav-account-meta">
              <span class="nav-user">${escapeHtml(displayName)}</span>
              <span class="nav-user-email">${escapeHtml(displayEmail)}</span>
            </div>
          </div>
          <div class="nav-account-actions">
            <a href="journey.html" class="btn btn-outline btn-sm">My Journey</a>
            <button type="button" class="btn btn-outline btn-sm" data-sign-out>Sign Out</button>
          </div>
        </div>
      `;
    } else {
      node.innerHTML = `<a href="auth.html" class="btn btn-primary btn-sm">Sign In</a>`;
    }
  });

  document.querySelectorAll("[data-sign-out]").forEach((button) => {
    button.addEventListener("click", async () => {
      await signOutUser();
      window.location.href = "auth.html";
    });
  });

  document.querySelectorAll("[data-admin-link]").forEach((node) => {
    node.style.display = profile?.role === "admin" ? "" : "none";
  });
}

function renderSetupRequired(containerId, message) {
  const target = document.getElementById(containerId);
  if (!target) return;
  target.innerHTML = `
    <div class="glass-card empty-state">
      <div class="icon">⚙️</div>
      <p>Cloud setup is still missing.</p>
      <p style="color:#94a3b8;">${message || "Please add your Supabase config before using the live product version."}</p>
      <a href="auth.html" class="btn btn-primary mt-4">Open Auth Setup</a>
    </div>
  `;
}

async function initPage(options = {}) {
  const { requireAuth = false, requireAdmin = false, containerId = "page-root" } = options;
  await refreshAuthUI().catch(() => {});

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      error: "Supabase is not configured.",
      containerId,
    };
  }

  const session = await getSession();
  const user = session?.user || null;

  if (requireAuth && !user) {
    redirectToAuth();
    return { configured: true, redirected: true };
  }

  let profile = null;
  if (user) {
    try {
      profile = await ensureProfile(user);
    } catch (error) {
      profile = buildFallbackProfile(user);
    }
  }
  if (requireAdmin && profile?.role !== "admin") {
    return {
      configured: true,
      user,
      profile,
      unauthorized: true,
      containerId,
    };
  }

  return {
    configured: true,
    user,
    profile,
    containerId,
  };
}

async function signUpWithEmail({ email, password, fullName }) {
  const client = getSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
  return data;
}

async function signInWithEmail({ email, password }) {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    await ensureProfile(data.user);
  }
  return data;
}

async function signOutUser() {
  if (!isSupabaseConfigured()) return;
  const client = getSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function getCurrentStudentId() {
  const user = await getCurrentUser();
  return user?.id || null;
}

function serializeEssay(essay, user, profile) {
  const migrated = migrateEssay({
    ...essay,
    id: essay.id || generateId(),
    studentId: user.id,
    studentName: profile?.full_name || user.email || "Student",
  });
  const latestBand = migrated.scoringHistory?.length
    ? migrated.scoringHistory[migrated.scoringHistory.length - 1].band
    : migrated.diagnostic?.overallBandEstimate || null;
  const latestVersion = migrated.versions[migrated.versions.length - 1];

  return {
    id: migrated.id,
    user_id: user.id,
    title: migrated.title,
    task_type: migrated.taskType,
    prompt: migrated.prompt || "",
    status: migrated.status || "draft",
    latest_band: latestBand,
    current_round: migrated.currentRound || 1,
    word_count: latestVersion?.wordCount || 0,
    payload: migrated,
    updated_at: new Date().toISOString(),
  };
}

async function listEssaysForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) return [];
  const client = getSupabase();
  const { data, error } = await client
    .from("essays")
    .select("payload")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => migrateEssay(row.payload));
}

async function getEssay(id) {
  if (!id) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const client = getSupabase();
  const { data, error } = await client
    .from("essays")
    .select("payload")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? migrateEssay(data.payload) : null;
}

async function saveEssay(essay) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in to save essays.");
  const profile = await ensureProfile(user);
  const client = getSupabase();
  const row = serializeEssay(essay, user, profile);
  const { data, error } = await client
    .from("essays")
    .upsert(row, { onConflict: "id" })
    .select("payload")
    .single();
  if (error) throw error;
  return migrateEssay(data.payload);
}

async function getAppData() {
  const user = await getCurrentUser();
  if (!user) return { students: [], essays: [] };
  let profile;
  try {
    profile = await ensureProfile(user);
  } catch (error) {
    profile = buildFallbackProfile(user);
  }
  let essays = [];
  try {
    essays = await listEssaysForCurrentUser();
  } catch (error) {
    essays = [];
  }
  return {
    students: [buildStudentFromEssays(user, profile, essays)],
    essays,
  };
}

async function getTeacherDashboardData() {
  const state = await initPage({ requireAuth: true, requireAdmin: true });
  if (!state.configured || state.redirected || state.unauthorized) return state;

  const client = getSupabase();
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, email, full_name, role")
    .order("created_at", { ascending: true });
  if (profilesError) throw profilesError;

  const { data: essayRows, error: essaysError } = await client
    .from("essays")
    .select("user_id, payload")
    .order("updated_at", { ascending: false });
  if (essaysError) throw essaysError;

  const allEssays = (essayRows || []).map((row) => migrateEssay(row.payload));
  const students = (profiles || [])
    .filter((profile) => profile.role !== "admin")
    .map((profile) => {
      const essays = allEssays.filter((essay) => essay.studentId === profile.id || essay.user_id === profile.id);
      return {
        id: profile.id,
        name: profile.full_name || profile.email,
        email: profile.email,
        role: profile.role,
        metrics: createMetricsFromEssays(essays),
      };
    });

  return {
    ...state,
    students,
    essays: allEssays,
  };
}

async function requestScore({ essayContent, prompt, taskType, round = 1, previousBand = null }) {
  const config = getAppConfig();
  const endpoint = config.SCORE_ENDPOINT || "/api/score";
  const session = await getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in before scoring an essay.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      essayContent,
      prompt,
      taskType,
      round,
      previousBand,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Scoring request failed.");
  }
  return payload.diagnostic;
}
