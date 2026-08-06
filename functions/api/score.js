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
        category: "taskResponse",
        severity: "high",
        title: "Example needs stronger explanation",
        description: "One key example is present but not fully connected back to the argument.",
        location: "Body paragraph",
        suggestion: "After the example, add one sentence explaining why it proves the point.",
        reflectivePrompt: "How exactly does this example support the paragraph claim?",
        subcategory: "unsupported examples",
      },
      {
        id: "issue-2",
        category: "grammar",
        severity: "medium",
        title: "Grammar accuracy still inconsistent",
        description: "Article and tense choices are not fully stable yet.",
        location: "Across the draft",
        suggestion: "Circle all nouns and verbs during proofreading to check grammar patterns.",
        reflectivePrompt: "Is this noun general or specific? Is this verb describing a fact or an event?",
        subcategory: "article misuse",
      },
    ],
    errorDetails: [
      {
        id: "err-1",
        category: "taskResponse",
        subcategory: "unsupported examples",
        text: "For example",
        excerpt: "For example, ...",
        paragraph: 2,
        sentence: 3,
        explanation: "The example needs one more sentence that explains why it supports your claim.",
      },
      {
        id: "err-2",
        category: "grammar",
        subcategory: "article misuse",
        text: "the technology",
        excerpt: "...the technology...",
        paragraph: 1,
        sentence: 2,
        explanation: "Check whether the noun needs a definite article or a general noun phrase.",
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
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Missing auth token." }, 401);

    const user = await verifySupabaseUser(token, context.env);
    if (!user) return json({ error: "Invalid login session." }, 401);

    const body = await context.request.json();
    if (!body?.essayContent || !String(body.essayContent).trim()) {
      return json({ error: "Essay content is required." }, 400);
    }

    let diagnostic;
    if (context.env.ENABLE_MOCK_SCORING === "true" || !context.env.AI_API_KEY) {
      diagnostic = buildMockDiagnostic(body.round || 1, body.previousBand ?? null);
    } else {
      diagnostic = await requestProviderScore(body, context.env);
    }

    return json({
      userId: user.id,
      diagnostic,
    });
  } catch (error) {
    return json({ error: error.message || "Scoring failed." }, 500);
  }
}
