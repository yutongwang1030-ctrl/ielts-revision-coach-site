/* ── Stricter IELTS-calibrated scoring (realistic bands) ── */

const CRITERIA_META = [
  { key: "taskResponse", label: "Task Response" },
  { key: "coherenceCohesion", label: "Coherence & Cohesion" },
  { key: "lexicalResource", label: "Lexical Resource" },
  { key: "grammaticalRange", label: "Grammatical Range & Accuracy" },
];

function roundBand(n) {
  return Math.round(n * 2) / 2;
}

function buildDiagnostic(round = 1, previousBand = null) {
  const baseScores = {
    1: { taskResponse: 5.5, coherenceCohesion: 5.0, lexicalResource: 5.5, grammaticalRange: 5.0 },
    2: { taskResponse: 6.0, coherenceCohesion: 5.5, lexicalResource: 6.0, grammaticalRange: 5.5 },
    3: { taskResponse: 6.5, coherenceCohesion: 6.0, lexicalResource: 6.0, grammaticalRange: 6.0 },
  };
  const scores = baseScores[Math.min(round, 3)] || baseScores[3];
  const overall = roundBand(
    (scores.taskResponse + scores.coherenceCohesion + scores.lexicalResource + scores.grammaticalRange) / 4
  );

  const deductions = {
    taskResponse: [
      { reason: "Position stated but not consistently maintained in body paragraphs", impact: "-0.5" },
      { reason: "Main example in paragraph 2 lacks specific detail and explanation", impact: "-1.0" },
      { reason: "Conclusion restates opinion without synthesizing key arguments", impact: "-0.5" },
    ],
    coherenceCohesion: [
      { reason: "Abrupt shift between paragraphs 2 and 3 with no linking device", impact: "-0.5" },
      { reason: "Over-reliance on basic connectors (On the one hand / On the other hand)", impact: "-0.5" },
      { reason: "Some sentences lack clear referents (unclear 'this' / 'it')", impact: "-0.5" },
    ],
    lexicalResource: [
      { reason: '"important" repeated 4 times — limits lexical range', impact: "-0.5" },
      { reason: '"feel overwhelmed" is informal for academic writing', impact: "-0.5" },
      { reason: 'Collocation "make communication much easier" could be more precise', impact: "-0.5" },
    ],
    grammaticalRange: [
      { reason: "Missing articles before countable nouns (3 instances)", impact: "-0.5" },
      { reason: "Limited complex structures — mostly simple/compound sentences", impact: "-0.5" },
      { reason: "Tense inconsistency in paragraph 2 example", impact: "-0.5" },
    ],
  };

  const roundDeductionScale = { 1: 1, 2: 0.6, 3: 0.3 };
  const scale = roundDeductionScale[Math.min(round, 3)] || 0.3;

  const criteria = CRITERIA_META.map((c) => ({
    key: c.key,
    label: c.label,
    score: scores[c.key],
    maxScore: 9,
    summary: getCriterionSummary(c.key, round),
    deductions: deductions[c.key].map((d) => ({
      ...d,
      impact: round === 1 ? d.impact : `~${(parseFloat(d.impact) * scale).toFixed(1)}`,
    })),
    actionableAdvice: getActionableAdvice(c.key),
  }));

  const improvementDelta =
    previousBand !== null ? roundBand(overall - previousBand) : null;

  return {
    round,
    overallBandEstimate: overall,
    previousBand,
    improvementDelta,
    criteria,
    issues: buildIssues(round),
    errorDetails: buildErrorDetails(),
    strengths: buildStrengths(round),
    encouragingSummary: buildEncouragingSummary(round, overall, previousBand, improvementDelta),
    revisionPriorities: buildPriorities(round),
  };
}

function getCriterionSummary(key, round) {
  const map = {
    taskResponse: {
      1: "You address the question but ideas remain underdeveloped. Examples need more explanation to fully support your position.",
      2: "Task coverage is improving. Your position is clearer, though one body paragraph still needs a stronger example.",
      3: "Good task coverage with a clear position throughout. Minor gaps in example depth remain.",
    },
    coherenceCohesion: {
      1: "Basic paragraph structure exists but transitions are weak. Some pronoun references are unclear.",
      2: "Paragraph logic is clearer. Add more varied linking phrases between ideas.",
      3: "Coherent progression of ideas with improved transitions. Watch for occasional abrupt shifts.",
    },
    lexicalResource: {
      1: "Adequate vocabulary for the topic but noticeable repetition and some informal word choices.",
      2: "Wider vocabulary range emerging. Continue replacing repeated words with precise alternatives.",
      3: "Good lexical variety with some academic collocations. Reduce remaining informal expressions.",
    },
    grammaticalRange: {
      1: "Frequent article and tense errors limit accuracy. Sentence structures are mostly simple.",
      2: "Grammar accuracy improving. More complex sentences attempted — check article usage carefully.",
      3: "Better range of structures with fewer errors. Continue proofreading for articles and tense consistency.",
    },
  };
  return map[key]?.[Math.min(round, 3)] || map[key][1];
}

function getActionableAdvice(key) {
  const map = {
    taskResponse: "For each body paragraph, use 'Claim → Example → Explanation' — don't stop at stating the example.",
    coherenceCohesion: "End each paragraph with one sentence that previews the next paragraph's focus.",
    lexicalResource: "Keep a synonym list while revising: important → significant / crucial / vital (choose by context).",
    grammaticalRange: "Read each sentence aloud — if it sounds broken, check articles and verb tense first.",
  };
  return map[key];
}

function buildIssues(round) {
  const all = [
    { id: "issue-1", category: "coherence", severity: "high", title: "Weak paragraph transition", description: "Paragraph 3 begins without connecting to the argument in paragraph 2.", location: "Between ¶2 and ¶3", suggestion: "Add a bridge sentence: 'While these benefits are significant, the drawbacks deserve equal attention.'", reflectivePrompt: "What logical relationship links your second and third main points?", subcategory: "unclear transitions" },
    { id: "issue-2", category: "vocabulary", severity: "medium", title: "Lexical repetition", description: '"important" appears 4 times; "technology" appears 8 times without variation.', location: "Throughout", suggestion: "Replace 2 instances with context-appropriate synonyms you already know.", reflectivePrompt: "Can you express the same idea without repeating the same adjective?", subcategory: "repetitive wording" },
    { id: "issue-3", category: "grammar", severity: "high", title: "Article misuse", description: 'Missing "the" before specific references; incorrect "a" before uncountable nouns.', location: "¶1, sentence 2; ¶2, sentence 1", suggestion: "Circle every noun. Ask: first mention (a/an) or already known (the)?", reflectivePrompt: "Is this noun specific or general in this context?", subcategory: "article misuse" },
    { id: "issue-4", category: "taskResponse", severity: "high", title: "Underdeveloped example", description: "The Zoom example is mentioned but not explained — why does it support your claim?", location: "¶2, last sentence", suggestion: "Add 2 sentences: WHAT happened + WHY it proves your point.", reflectivePrompt: "How does this example specifically support your topic sentence?", subcategory: "unsupported examples" },
    { id: "issue-5", category: "logic", severity: "medium", title: "Weak topic sentence", description: "Paragraph 2 topic sentence is vague — 'On the one hand' doesn't state a clear claim.", location: "¶2, sentence 1", suggestion: "Rewrite the topic sentence to state your specific argument for this paragraph.", reflectivePrompt: "If you removed the rest of the paragraph, would the topic sentence alone make your point?", subcategory: "weak topic sentence" },
    { id: "issue-6", category: "grammar", severity: "medium", title: "Tense inconsistency", description: "Switch between present simple and present perfect without clear reason.", location: "¶2", suggestion: "Decide: are you describing general facts (present) or completed events (past/present perfect)?", reflectivePrompt: "Is this a general truth or a specific past event?", subcategory: "tense inconsistency" },
    { id: "issue-7", category: "vocabulary", severity: "low", title: "Informal expression", description: '"feel overwhelmed" is conversational — too informal for IELTS Task 2.', location: "¶3", suggestion: "Try: 'experience considerable stress' or 'face significant psychological pressure'.", reflectivePrompt: "Would this phrase appear in an academic journal?", subcategory: "informal expressions" },
  ];
  return round >= 2 ? all.filter((_, i) => i !== 4) : all;
}

function buildErrorDetails() {
  return [
    { id: "err-1", category: "grammar", subcategory: "article misuse", text: "communication much easier", excerpt: "...technology has made communication much easier...", paragraph: 2, sentence: 1, explanation: "Missing article before a modified countable concept — consider 'communication significantly easier' or restructure." },
    { id: "err-2", category: "grammar", subcategory: "tense inconsistency", text: "during the pandemic, many families stayed", excerpt: "...during the pandemic, many families stayed connected...", paragraph: 2, sentence: 4, explanation: "Past event in a paragraph using present tense for general claims — tense shift needs justification or consistency." },
    { id: "err-3", category: "vocabulary", subcategory: "repetitive wording", text: "important", excerpt: "This is important because...", paragraph: 2, sentence: 2, explanation: '"important" used 4 times. Replace with significant, crucial, or vital depending on context.' },
    { id: "err-4", category: "vocabulary", subcategory: "informal expressions", text: "feel overwhelmed", excerpt: "...can make people feel overwhelmed.", paragraph: 3, sentence: 2, explanation: "Too conversational for academic writing. Use 'experience considerable pressure' instead." },
    { id: "err-5", category: "coherence", subcategory: "unclear transitions", text: "On the other hand", excerpt: "On the other hand, technology can create...", paragraph: 3, sentence: 1, explanation: "Mechanical transition — doesn't explicitly link back to the previous paragraph's argument." },
    { id: "err-6", category: "logic", subcategory: "unsupported examples", text: "many families stayed connected through Zoom", excerpt: "...many families stayed connected through Zoom.", paragraph: 2, sentence: 4, explanation: "Example stated but not explained — HOW does Zoom demonstrate easier communication?" },
    { id: "err-7", category: "logic", subcategory: "weak topic sentence", text: "On the one hand, technology has made communication much easier", excerpt: "On the one hand, technology has made communication much easier.", paragraph: 2, sentence: 1, explanation: "Template opener weakens the claim. State the specific benefit directly." },
    { id: "err-8", category: "grammar", subcategory: "sentence fragments", text: "The constant notifications and social media pressure", excerpt: "The constant notifications and social media pressure can make...", paragraph: 3, sentence: 2, explanation: "Long noun phrase before verb — acceptable here, but watch for true fragments elsewhere." },
  ];
}

function buildStrengths(round) {
  const base = [
    "Clear overall opinion stated in the introduction",
    "Attempt at balanced discussion (both views addressed)",
    "Relevant contemporary example chosen (pandemic/Zoom)",
  ];
  if (round >= 2) base.push("Improved paragraph structure after revision");
  if (round >= 3) base.push("More varied vocabulary in revised sections");
  return base;
}

function buildEncouragingSummary(round, band, prev, delta) {
  if (round === 1) {
    return `Your essay shows you understand the task and have relevant ideas — that's a solid foundation at Band ${band}. The scores reflect real IELTS standards: there's room to grow in example development, transitions, and vocabulary precision. Every revision round is a step forward — let's work on your priorities together.`;
  }
  if (delta > 0) {
    return `Wonderful progress! Your revised draft moved from Band ${prev} to Band ${band} (+${delta}). You're building real writing skills, not just fixing surface errors. The improvements in your revised sections show you're learning the logic behind good academic writing. Ready for another cycle?`;
  }
  return `Your current estimate is Band ${band}. Some areas improved while others still need attention — this is normal in iterative learning. Focus on the remaining priorities and remember: understanding WHY a change helps matters more than the score itself.`;
}

function buildPriorities(round) {
  const map = {
    1: ["Develop the Zoom example with specific detail", "Fix article errors in paragraphs 1–2", "Replace repeated 'important' with varied vocabulary"],
    2: ["Strengthen paragraph 3 transition", "Upgrade informal phrases to academic register", "Add one complex sentence per body paragraph"],
    3: ["Polish remaining grammar inconsistencies", "Ensure conclusion synthesizes both sides", "Self-proofread for collocation accuracy"],
  };
  return map[Math.min(round, 3)];
}

/* ── API functions ── */

function analyzeEssay(round = 1) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(buildDiagnostic(round, null)), 900);
  });
}

function reEvaluateEssay(round, previousBand) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(buildDiagnostic(round, previousBand)), 1100);
  });
}

function generateRevisionExplanations(original, revised) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "exp-1",
          issueType: "weak topic sentence",
          category: "logic",
          original: "On the one hand, technology has made communication much easier.",
          revised: "One significant benefit of modern technology is its capacity to facilitate global communication.",
          reason: "Replaced template opener with a direct, specific claim that states the paragraph's argument clearly.",
          solved: "Weak topic sentence — the reader now knows exactly what this paragraph will prove.",
        },
        {
          id: "exp-2",
          issueType: "unsupported examples",
          category: "taskResponse",
          original: "For example, during the pandemic, many families stayed connected through Zoom.",
          revised: "For instance, during the COVID-19 pandemic, video platforms such as Zoom enabled families separated by distance to maintain daily contact, demonstrating how technology bridges geographical barriers.",
          reason: "Expanded the example using 'What → How → So what' structure to connect evidence to the claim.",
          solved: "Underdeveloped example — now explicitly shows HOW the example supports the argument.",
        },
        {
          id: "exp-3",
          issueType: "repetitive wording",
          category: "vocabulary",
          original: "This is important because it helps maintain relationships.",
          revised: "This is particularly significant because it enables people to sustain meaningful relationships.",
          reason: "Replaced repeated 'important' with 'significant' and upgraded 'helps maintain' to a more precise collocation.",
          solved: "Lexical repetition and weak collocation.",
        },
        {
          id: "exp-4",
          issueType: "unclear transitions",
          category: "coherence",
          original: "On the other hand, technology can create stress and distraction.",
          revised: "Despite these communication benefits, technology simultaneously introduces considerable psychological costs, including stress and distraction.",
          reason: "Added an explicit bridge referencing the previous paragraph's argument before introducing the counterpoint.",
          solved: "Abrupt paragraph transition — reader can now see the logical relationship between paragraphs.",
        },
        {
          id: "exp-5",
          issueType: "informal expressions",
          category: "vocabulary",
          original: "The constant notifications and social media pressure can make people feel overwhelmed.",
          revised: "The relentless stream of notifications and social media demands can lead individuals to experience significant psychological strain.",
          reason: "Replaced informal 'feel overwhelmed' with academic register while preserving meaning.",
          solved: "Informal expression inappropriate for IELTS Task 2 academic writing.",
        },
      ]);
    }, 700);
  });
}

function buildRevisionChecklistFromDiagnostic(diagnostic, existingChecklist = []) {
  const existingMap = new Map((existingChecklist || []).map((item) => [item.id, item]));
  const issues = diagnostic?.issues || [];
  const errorDetails = diagnostic?.errorDetails || [];

  return issues.map((issue, index) => {
    const matchedDetail = errorDetails.find((detail) =>
      detail.id === issue.id ||
      (detail.category === issue.category && detail.subcategory === issue.subcategory) ||
      (issue.location && detail.excerpt && issue.location.includes(`¶${detail.paragraph}`))
    );

    const task = {
      id: issue.id || `task-${index + 1}`,
      order: index + 1,
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      location: issue.location || (matchedDetail ? `Paragraph ${matchedDetail.paragraph}, sentence ${matchedDetail.sentence}` : "Specific sentence / paragraph"),
      problem: issue.description,
      evidence: matchedDetail?.excerpt || matchedDetail?.text || "",
      explanation: matchedDetail?.explanation || "",
      action: issue.suggestion,
      doneCriteria: issue.reflectivePrompt || "Revise this exact point before moving on.",
      rewriteExample: issue.rewriteExample || null,
      resolved: false,
    };

    if (existingMap.has(task.id)) {
      const existing = existingMap.get(task.id);
      return {
        ...task,
        resolved: !!existing.resolved,
        rewriteExample: existing.rewriteExample || task.rewriteExample,
      };
    }
    return task;
  });
}

function summarizeRevisionCompletion(checklist = []) {
  const total = checklist.length;
  const resolved = checklist.filter((item) => item.resolved).length;
  return {
    total,
    resolved,
    allResolved: total > 0 && resolved === total,
    remaining: Math.max(0, total - resolved),
  };
}

function generateReflection(essay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        expressions: [
          { phrase: "facilitate global communication", type: "collocation", context: "Describing technology benefits", saved: false },
          { phrase: "bridges geographical barriers", type: "collocation", context: "Explaining how technology connects people", saved: false },
          { phrase: "considerable psychological costs", type: "academic phrase", context: "Introducing drawbacks formally", saved: false },
          { phrase: "Despite these communication benefits", type: "linking phrase", context: "Transitioning to counter-argument", saved: false },
          { phrase: "simultaneously introduces", type: "linking phrase", context: "Adding a contrasting effect", saved: false },
          { phrase: "particularly significant because", type: "argument structure", context: "Explaining why an example matters", saved: false },
          { phrase: "experience significant psychological strain", type: "collocation", context: "Academic alternative to 'feel overwhelmed'", saved: false },
          { phrase: "sustain meaningful relationships", type: "collocation", context: "Upgraded from 'maintain relationships'", saved: false },
        ],
        weaknesses: [
          { area: "Grammar", pattern: "Article misuse (a/the)", frequency: "Recurring", advice: "Before submitting, circle every noun and ask: specific or general?" },
          { area: "Vocabulary", pattern: "Adjective repetition (important, good)", frequency: "Recurring", advice: "Build a personal synonym bank for 10 common adjectives you overuse." },
          { area: "Task Response", pattern: "Examples stated but not explained", frequency: "Frequent", advice: "Use the 3-step rule: State example → Explain how → Link to claim." },
          { area: "Coherence", pattern: "Template transitions (On the one/other hand)", frequency: "Occasional", advice: "Replace templates with content-specific bridges that reference your actual argument." },
          { area: "Logic", pattern: "Vague topic sentences", frequency: "Occasional", advice: "Write topic sentences LAST — after you know what the paragraph proves." },
        ],
        habits: [
          "You tend to save example development for later — prioritize it in Round 1.",
          "Your revisions show strong vocabulary upgrades but grammar checks come late.",
          "You respond well to reflective prompts — keep asking 'why does this matter?'",
        ],
        priorities: [
          "Article accuracy in proofreading pass",
          "Example development before vocabulary polish",
          "Content-specific transitions over templates",
        ],
        coachMessage: "You've completed a full revision cycle with real measurable growth. Your writing is becoming more academic and precise — not because AI rewrote it, but because you understood the logic behind each change. Keep building your personal expression bank and focus on proofreading articles in your next essay.",
      });
    }, 800);
  });
}

const MOCK_HINTS = {
  1: [
    { id: "hint-1-1", layer: 1, title: "Check your essay skeleton", hint: "Read only your topic sentences. Do they form a logical argument on their own?", focusArea: "logic", reflectiveQuestion: "If someone read only your topic sentences, would they understand your full argument?", unlocked: true },
    { id: "hint-1-2", layer: 1, title: "Task response check", hint: "Highlight every sentence that directly answers the essay question.", focusArea: "taskResponse", reflectiveQuestion: "Does every paragraph earn its place by addressing the task?", unlocked: true },
  ],
  2: [
    { id: "hint-2-1", layer: 2, title: "Bridge your paragraphs", hint: "At the end of paragraph 2, add one sentence that previews paragraph 3.", focusArea: "coherence", reflectiveQuestion: "What word or phrase could signal the shift to your next idea?", unlocked: false },
    { id: "hint-2-2", layer: 2, title: "Deepen your example", hint: "Find your weakest example. Add WHAT happened and WHY it matters.", focusArea: "taskResponse", reflectiveQuestion: "What would a skeptical reader ask about this example?", unlocked: false },
  ],
  3: [
    { id: "hint-3-1", layer: 3, title: "Article check", hint: "Circle every noun in one paragraph. Check if each needs a/an/the.", focusArea: "grammar", reflectiveQuestion: "Is this noun being introduced for the first time or referring back?", unlocked: false },
    { id: "hint-3-2", layer: 3, title: "Sentence variety", hint: "Find two sentences that start the same way. Rewrite one with a different opening.", focusArea: "sentenceStructure", reflectiveQuestion: "How can you vary rhythm without changing your meaning?", unlocked: false },
  ],
};

function getHints(layer) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve((MOCK_HINTS[layer] || []).map((h) => ({ ...h, unlocked: layer === 1 })));
    }, 500);
  });
}

const SAMPLE_ESSAY = `Some people believe that technology has made our lives more complicated, while others think it has simplified daily tasks. In my opinion, technology has both positive and negative effects on modern life.

On the one hand, technology has made communication much easier. People can connect with friends and family around the world through social media and video calls. This is important because it helps maintain relationships despite geographical distance. For example, during the pandemic, many families stayed connected through Zoom.

On the other hand, technology can create stress and distraction. Many people spend too much time on their phones, which affects their productivity and mental health. The constant notifications and social media pressure can make people feel overwhelmed.

In conclusion, while technology offers important benefits for communication and convenience, we should be mindful of its potential drawbacks and use it responsibly.`;

const SAMPLE_REVISED = `Some people believe that technology has made our lives more complicated, while others think it has simplified daily tasks. In my opinion, technology has both positive and negative effects on modern life.

One significant benefit of modern technology is its capacity to facilitate global communication. People can connect with friends and family around the world through social media and video calls. This is particularly significant because it enables people to sustain meaningful relationships despite geographical distance. For instance, during the COVID-19 pandemic, video platforms such as Zoom enabled families separated by distance to maintain daily contact, demonstrating how technology bridges geographical barriers.

Despite these communication benefits, technology simultaneously introduces considerable psychological costs, including stress and distraction. Many people spend excessive time on their phones, which affects their productivity and mental health. The relentless stream of notifications and social media demands can lead individuals to experience significant psychological strain.

In conclusion, while technology offers substantial benefits for communication and convenience, we should remain mindful of its potential drawbacks and adopt responsible usage habits.`;
