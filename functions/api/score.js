function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function roundBand(value) {
  return Math.round(value * 2) / 2;
}

function getRuntimeEnv(env = {}) {
  return {
    SUPABASE_URL: env.SUPABASE_URL || "https://gfjehljokdxbucgltykc.supabase.co",
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "sb_publishable_n-ZHGrqY77-PMyOn24ivcg_-aRR8xwA",
    ENABLE_MOCK_SCORING: env.ENABLE_MOCK_SCORING || "true",
    AI_API_KEY: env.AI_API_KEY || "",
    AI_API_URL: env.AI_API_URL || "",
    AI_MODEL: env.AI_MODEL || "",
  };
}

function buildMockDiagnostic(round = 1, previousBand = null) {
  const scoreTable = {
    1: { taskResponse: 5.5, coherenceCohesion: 5.0, lexicalResource: 5.5, grammaticalRange: 5.0 },
    2: { taskResponse: 6.0, coherenceCohesion: 5.5, lexicalResource: 6.0, grammaticalRange: 5.5 },
    3: { taskResponse: 6.5, coherenceCohesion: 6.0, lexicalResource: 6.0, grammaticalRange: 6.0 },
  };
  const scores = scoreTable[Math.min(round, 3)] || scoreTable[3];
  const overallBandEstimate = roundBand(
    (scores.taskResponse + scores.coherenceCohesion + scores.lexicalResource + scores.grammaticalRange) / 4
  );

  return {
    round,
    previousBand,
    improvementDelta: previousBand == null ? null : roundBand(overallBandEstimate - previousBand),
    overallBandEstimate,
    criteria: [
      {
        key: "taskResponse",
        label: "Task Response",
        score: scores.taskResponse,
        maxScore: 9,
        summary: "The response addresses the prompt, but examples and explanations can be developed further.",
        deductions: [
          { reason: "One supporting example is still underdeveloped.", impact: "-0.5" },
        ],
        actionableAdvice: "Use Claim → Example → Explanation in each body paragraph.",
      },
      {
        key: "coherenceCohesion",
        label: "Coherence & Cohesion",
        score: scores.coherenceCohesion,
        maxScore: 9,
        summary: "Ideas generally progress logically, but some transitions remain mechanical.",
        deductions: [
          { reason: "Transitions between paragraphs are not always explicit enough.", impact: "-0.5" },
        ],
        actionableAdvice: "Add one sentence that bridges each paragraph to the next.",
      },
      {
        key: "lexicalResource",
        label: "Lexical Resource",
        score: scores.lexicalResource,
        maxScore: 9,
        summary: "Vocabulary is adequate, though a few repeated adjectives reduce precision.",
        deductions: [
          { reason: "Repeated high-frequency words limit lexical range.", impact: "-0.5" },
        ],
        actionableAdvice: "Swap repeated words for precise academic alternatives.",
      },
      {
        key: "grammaticalRange",
        label: "Grammatical Range & Accuracy",
        score: scores.grammaticalRange,
        maxScore: 9,
        summary: "Sentence control is improving, but article and tense errors still affect accuracy.",
        deductions: [
          { reason: "Article usage and tense consistency still need proofreading.", impact: "-0.5" },
        ],
        actionableAdvice: "Do a final grammar pass for articles, verb tense, and sentence boundaries.",
      },
    ],
    issues: [
      {
        id: "issue-1",
        category: "logic",
        severity: "high",
        title: "Paragraph 2 opens with a weak topic sentence",
        description: "The first sentence introduces the paragraph with a template opener, but it does not clearly state the exact benefit you want to prove.",
        location: "Paragraph 2, sentence 1",
        suggestion: "Rewrite the topic sentence so it states the paragraph's exact claim directly, not through 'On the one hand'.",
        reflectivePrompt: "This issue is complete when the paragraph opens with a clear, specific claim instead of a template phrase.",
        subcategory: "weak topic sentence",
      },
      {
        id: "issue-2",
        category: "taskResponse",
        severity: "high",
        title: "Zoom example is named but not explained",
        description: "The example is relevant, but the essay stops at naming it instead of showing how it supports the paragraph argument.",
        location: "Paragraph 2, final sentence",
        suggestion: "Add 1 to 2 sentences after the Zoom example explaining what happened and why that proves technology improves communication.",
        reflectivePrompt: "This issue is complete when the example is explicitly linked back to the paragraph's claim.",
        subcategory: "unsupported examples",
      },
      {
        id: "issue-3",
        category: "coherence",
        severity: "medium",
        title: "Paragraph 3 transition is too mechanical",
        description: "The switch from advantages to disadvantages is abrupt because the transition phrase does not explain the logical shift.",
        location: "Paragraph 3, sentence 1",
        suggestion: "Replace the transition with a sentence that refers back to the previous benefit before introducing the drawback.",
        reflectivePrompt: "This issue is complete when the first sentence of paragraph 3 clearly bridges from benefit to drawback.",
        subcategory: "unclear transitions",
      },
      {
        id: "issue-4",
        category: "grammar",
        severity: "medium",
        title: "Article usage is still inaccurate",
        description: "Several countable nouns and specific references are missing articles, which lowers grammatical accuracy.",
        location: "Paragraph 1 sentence 2; Paragraph 2 sentence 1",
        suggestion: "Review the exact noun phrases in these sentences and decide whether each one needs a/an/the before it.",
        reflectivePrompt: "This issue is complete when each flagged noun phrase has the correct article choice.",
        subcategory: "article misuse",
      },
      {
        id: "issue-5",
        category: "vocabulary",
        severity: "medium",
        title: "Key vocabulary is repetitive and informal",
        description: "The essay repeats broad words like 'important' and uses conversational phrasing such as 'feel overwhelmed'.",
        location: "Paragraph 2 sentence 2; Paragraph 3 sentence 2",
        suggestion: "Replace repeated general adjectives with precise academic alternatives and upgrade the informal phrase to a more academic expression.",
        reflectivePrompt: "This issue is complete when those exact phrases are replaced by more precise academic wording.",
        subcategory: "repetitive wording",
      },
    ],
    errorDetails: [
      {
        id: "err-1",
        category: "logic",
        subcategory: "weak topic sentence",
        text: "On the one hand",
        excerpt: "On the one hand, technology has made communication much easier.",
        paragraph: 2,
        sentence: 1,
        explanation: "This opening signals structure, but it does not state a precise paragraph claim strongly enough.",
      },
      {
        id: "err-2",
        category: "taskResponse",
        subcategory: "unsupported examples",
        text: "Zoom example",
        excerpt: "For example, during the pandemic, many families stayed connected through Zoom.",
        paragraph: 2,
        sentence: 4,
        explanation: "The example is relevant, but it needs a follow-up sentence explaining exactly how it proves easier communication.",
      },
      {
        id: "err-3",
        category: "coherence",
        subcategory: "unclear transitions",
        text: "On the other hand",
        excerpt: "On the other hand, technology can create stress and distraction.",
        paragraph: 3,
        sentence: 1,
        explanation: "This transition is too generic. It does not explicitly connect the drawback paragraph to the previous advantage paragraph.",
      },
      {
        id: "err-4",
        category: "grammar",
        subcategory: "article misuse",
        text: "the technology",
        excerpt: "...the technology...",
        paragraph: 1,
        sentence: 2,
        explanation: "Check whether this noun phrase should be general or specific, then supply the correct article choice.",
      },
      {
        id: "err-5",
        category: "vocabulary",
        subcategory: "repetitive wording",
        text: "important / feel overwhelmed",
        excerpt: "This is important... / ...feel overwhelmed.",
        paragraph: 2,
        sentence: 2,
        explanation: "These phrases are either too repetitive or too conversational for IELTS Task 2 academic style.",
      },
    ],
    strengths: [
      "Clear position established early in the essay",
      "Relevant topic vocabulary appears throughout",
      "Paragraph structure gives the essay a readable flow",
    ],
    encouragingSummary: "This score reflects a realistic IELTS-style diagnosis. The essay already has a clear position and usable structure; the next gains will come from developing examples and tightening grammar accuracy.",
    revisionPriorities: [
      "Explain your best example more fully",
      "Replace repeated general adjectives with precise academic wording",
      "Proofread for article and tense consistency",
    ],
  };
}

async function verifySupabaseUser(token, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variables.");
  }

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

function buildPrompt(body) {
  return `
You are an IELTS Writing examiner and revision coach.
Return ONLY valid JSON.
Every issue must be concrete, tied to an exact paragraph/sentence or quoted excerpt, and include a specific revision action the student can execute directly.
Do not give broad advice like 'improve coherence' or 'check the structure'. Each issue must point to a precise weakness and a precise fix.

Required JSON shape:
{
  "round": number,
  "previousBand": number|null,
  "improvementDelta": number|null,
  "overallBandEstimate": number,
  "criteria": [
    {
      "key": "taskResponse"|"coherenceCohesion"|"lexicalResource"|"grammaticalRange",
      "label": string,
      "score": number,
      "maxScore": 9,
      "summary": string,
      "deductions": [{ "reason": string, "impact": string }],
      "actionableAdvice": string
    }
  ],
  "issues": [
    {
      "id": string,
      "category": "grammar"|"vocabulary"|"coherence"|"logic"|"taskResponse"|"sentenceStructure",
      "severity": "low"|"medium"|"high",
      "title": string,
      "description": string,
      "location": string,
      "suggestion": string,
      "reflectivePrompt": string,
      "subcategory": string
    }
  ],
  "errorDetails": [
    {
      "id": string,
      "category": string,
      "subcategory": string,
      "text": string,
      "excerpt": string,
      "paragraph": number,
      "sentence": number,
      "explanation": string
    }
  ],
  "strengths": string[],
  "encouragingSummary": string,
  "revisionPriorities": string[]
}

Essay metadata:
- taskType: ${body.taskType || "task2"}
- round: ${body.round || 1}
- previousBand: ${body.previousBand ?? "null"}
- prompt: ${body.prompt || ""}

Essay text:
${body.essayContent}
  `.trim();
}

function parseModelPayload(raw) {
  if (!raw) throw new Error("Empty model response.");
  if (typeof raw === "object") return raw;
  const trimmed = String(raw).trim();
  return JSON.parse(trimmed);
}

async function requestProviderScore(body, env) {
  const endpoint = env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
  const model = env.AI_MODEL || "gpt-4.1-mini";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You score IELTS Writing realistically and return strict JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(body),
        },
      ],
    }),
  });

  if (!response.ok) {
    const failure = await response.text();
    throw new Error(`AI provider error: ${failure}`);
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.choices?.[0]?.message?.content ||
    payload.choices?.[0]?.text ||
    payload.response ||
    "";

  return parseModelPayload(outputText);
}

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost(context) {
  try {
    const runtimeEnv = getRuntimeEnv(context.env);
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Missing auth token." }, 401);

    const user = await verifySupabaseUser(token, runtimeEnv);
    if (!user) return json({ error: "Invalid login session." }, 401);

    const body = await context.request.json();
    if (!body?.essayContent || !String(body.essayContent).trim()) {
      return json({ error: "Essay content is required." }, 400);
    }

    let diagnostic;
    if (runtimeEnv.ENABLE_MOCK_SCORING === "true" || !runtimeEnv.AI_API_KEY) {
      diagnostic = buildMockDiagnostic(body.round || 1, body.previousBand ?? null);
    } else {
      diagnostic = await requestProviderScore(body, runtimeEnv);
    }

    return json({
      userId: user.id,
      diagnostic,
    });
  } catch (error) {
    return json({ error: error.message || "Scoring failed." }, 500);
  }
}
