import Anthropic from "@anthropic-ai/sdk";
import { EvaluationSignal } from "@/lib/models/types";

export type SearchMode = "quick" | "deep";

const SEARCH_CATEGORIES = [
  {
    category: "benchmark" as const,
    queries: [
      "SWE-bench latest results 2026 AI model coding benchmark",
      "ARC-AGI-2 latest scores frontier models 2026",
      "AIME 2026 AI math benchmark results",
      "GPQA Diamond latest AI model scores 2026",
      "MRCR long context benchmark AI models latest",
    ],
  },
  {
    category: "model_release" as const,
    queries: [
      "Anthropic Claude new model release announcement 2026",
      "OpenAI GPT o3 new model release update 2026",
      "Google Gemini new model version announcement 2026",
      "Perplexity Sonar model update 2026",
      "Midjourney v7 new version update 2026",
      "OpenAI Sora video generation update 2026",
      "Runway Gen-3 new features update 2026",
      "Harvey AI legal platform update 2026",
    ],
  },
  {
    category: "pricing" as const,
    queries: [
      "Anthropic Claude API pricing changes 2026",
      "OpenAI API pricing update o3 GPT 2026",
      "Google Gemini API pricing changes 2026",
      "Midjourney subscription pricing 2026",
    ],
  },
  {
    category: "bug" as const,
    queries: [
      "Gemini Pro code deletion bug status 2026",
      "Claude known issues bugs regression 2026",
      "GPT o3 known bugs issues 2026",
      "AI model reliability issues reports latest 2026",
    ],
  },
  {
    category: "context_window" as const,
    queries: [
      "AI model context window expansion announcement 2026",
      "Claude Opus context window update",
      "Gemini 2M context window changes 2026",
    ],
  },
  {
    category: "prompt_technique" as const,
    queries: [
      "new prompt engineering techniques 2026 best practices",
      "chain of thought prompting improvements latest",
      "context engineering AI agents best practices 2026",
    ],
  },
];

const USE_CASE_SEARCH_QUERIES = [
  {
    useCase: "planning",
    queries: [
      "best AI model project planning roadmapping 2026 Claude o3 Gemini comparison latest",
      "Claude Opus 4.5 vs o3 planning complex tasks performance 2026",
    ],
  },
  {
    useCase: "research",
    queries: [
      "best AI research tool 2026 Perplexity NotebookLM Gemini Deep Research comparison",
      "Perplexity Deep Research vs Gemini Deep Research quality comparison 2026",
    ],
  },
  {
    useCase: "writing",
    queries: [
      "best AI writing tool 2026 Claude GPT comparison quality",
      "Claude Opus vs GPT-5.2 writing quality comparison 2026 latest",
    ],
  },
  {
    useCase: "strategy",
    queries: [
      "best AI model business strategy analysis 2026 o3 Claude GPT",
      "o3 vs Claude Opus strategic reasoning tasks 2026 comparison",
    ],
  },
  {
    useCase: "image_video",
    queries: [
      "Midjourney v7 vs DALL-E comparison quality 2026 latest",
      "best AI image video generation tools 2026 Sora Runway Kling comparison",
    ],
  },
  {
    useCase: "quick_mvp",
    queries: [
      "Bolt.new vs Lovable AI app builder comparison 2026 latest",
      "best AI coding tool MVP build 2026 Claude Sonnet Cursor Bolt",
    ],
  },
  {
    useCase: "finance",
    queries: [
      "best AI model financial modeling Excel automation 2026",
      "o3 vs Claude finance quantitative reasoning 2026 comparison",
    ],
  },
  {
    useCase: "legal",
    queries: [
      "Harvey AI legal platform update 2026 latest features",
      "best AI model contract review legal analysis 2026 Claude GPT",
    ],
  },
  {
    useCase: "bd_gtm",
    queries: [
      "best AI model sales email outreach GTM 2026 GPT Claude comparison",
      "AI tools business development pipeline outreach 2026 best",
    ],
  },
];

// ── Claude client ────────────────────────────────────────────────────────────

function getClaudeClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[Cosmo] ANTHROPIC_API_KEY not set");
    return null;
  }
  return new Anthropic({ apiKey });
}

// ── Perplexity search (kept for live web data when available) ────────────────

async function searchWithPerplexity(
  queries: string[]
): Promise<{ query: string; answer: string; citations: string[] }[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.log("[Cosmo] PERPLEXITY_API_KEY not set, skipping web search layer");
    return [];
  }

  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content:
                  "You are a concise AI industry analyst. Return factual, current updates about AI models, benchmarks, pricing, and capabilities. Be specific with numbers, dates, and model names.",
              },
              { role: "user", content: query },
            ],
            max_tokens: 600,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.warn(`[Cosmo] Perplexity ${response.status}: ${errText.substring(0, 150)}`);
          return { query, answer: "", citations: [] };
        }
        const data = await response.json();
        return {
          query,
          answer: data.choices?.[0]?.message?.content || "",
          citations: data.citations || [],
        };
      } catch (err) {
        console.warn(`[Cosmo] Perplexity error:`, err instanceof Error ? err.message : err);
        return { query, answer: "", citations: [] };
      }
    })
  );

  const filtered = results.filter((r) => r.answer.length > 0);
  console.log(`[Cosmo] Perplexity: ${filtered.length}/${queries.length} queries returned results`);
  return filtered;
}

// ── 3-Model Claude Pipeline ─────────────────────────────────────────────────
// Model 1: Generate initial intelligence analysis
// Model 2: Critique and fact-check the initial output
// Model 3: Synthesize both into final verified signals

async function claudeGenerate(
  client: Anthropic,
  searchContext: string,
  category: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are an AI model intelligence analyst. Analyze the following context about the "${category}" category and generate a detailed intelligence briefing.

${searchContext ? `=== LIVE WEB SEARCH RESULTS ===\n${searchContext}\n\n` : ""}Based on your knowledge and any search results provided, identify the most significant recent developments, changes, and actionable signals in the "${category}" category for AI models.

For each signal you identify, provide:
- A concise title
- A detailed description with specific model names, numbers, dates, and benchmark scores
- The source or basis for this information
- Your confidence level (0.0-1.0)

Focus on: benchmarks, model releases, pricing changes, bugs/regressions, context window updates, and prompt engineering techniques.

Be specific and factual. Include concrete numbers and model names. Do not speculate — only report what you can substantiate.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function claudeCritique(
  client: Anthropic,
  initialAnalysis: string,
  category: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a rigorous fact-checker and AI industry expert. Review the following intelligence analysis for the "${category}" category and identify any issues:

=== INITIAL ANALYSIS ===
${initialAnalysis}

Your job:
1. Flag any claims that are inaccurate, outdated, or unverifiable
2. Note any missing important developments that should have been included
3. Identify any confidence ratings that seem too high or too low
4. Point out any vague claims that lack specific numbers, dates, or model names
5. Suggest corrections with the accurate information where you know it

Be constructive and specific. For each issue, explain what's wrong and what the correct information is. If a claim is well-supported, say so.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function claudeSynthesize(
  client: Anthropic,
  initialAnalysis: string,
  critique: string,
  category: string
): Promise<EvaluationSignal[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are the final editor for an AI intelligence report. You have the initial analysis and a fact-check critique. Synthesize both into a final set of verified signals.

=== INITIAL ANALYSIS ===
${initialAnalysis}

=== FACT-CHECK CRITIQUE ===
${critique}

Produce the final verified signals. For each signal:
- Incorporate corrections from the critique
- Remove signals that were flagged as inaccurate and cannot be corrected
- Adjust confidence levels based on the critique
- Add any missing signals the critique identified

Return ONLY a JSON object: {"signals": [...]} where each signal has:
- "category": one of "benchmark", "model_release", "pricing", "bug", "context_window", "prompt_technique"
- "title": concise title under 80 chars
- "description": detailed description with specific numbers, dates, model names
- "source": source or basis for the information
- "confidence": 0.0-1.0 (adjusted based on fact-check — lower if critique found issues, higher if critique confirmed)

Include signals with confidence >= 0.3. Return ONLY valid JSON, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    // Extract JSON from response (may have markdown code block wrapper)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const signals = Array.isArray(parsed) ? parsed : parsed.signals || [];

    return signals
      .filter((s: { confidence?: number }) => (s.confidence || 0) >= 0.3)
      .map(
        (s: {
          category?: string;
          title?: string;
          description?: string;
          source?: string;
          confidence?: number;
        }) => ({
          category: (s.category || category) as EvaluationSignal["category"],
          title: s.title || "Unknown signal",
          description: s.description || "",
          source: s.source,
          confidence: s.confidence,
        })
      );
  } catch (err) {
    console.warn(`[Cosmo] Claude synthesis JSON parse failed for ${category}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function runClaudePipeline(
  client: Anthropic,
  searchContext: string,
  category: string
): Promise<EvaluationSignal[]> {
  console.log(`[Cosmo] Running 3-model pipeline for ${category}...`);

  // Step 1: Generate initial analysis
  const initial = await claudeGenerate(client, searchContext, category);
  console.log(`[Cosmo] ${category} — Step 1 (generate): ${initial.length} chars`);

  // Step 2: Critique and fact-check
  const critique = await claudeCritique(client, initial, category);
  console.log(`[Cosmo] ${category} — Step 2 (critique): ${critique.length} chars`);

  // Step 3: Synthesize final verified signals
  const signals = await claudeSynthesize(client, initial, critique, category);
  console.log(`[Cosmo] ${category} — Step 3 (synthesize): ${signals.length} signals`);

  return signals;
}

// ── Deduplication ───────────────────────────────────────────────────────────

function deduplicateSignals(signals: EvaluationSignal[]): EvaluationSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.category}:${signal.title.toLowerCase().substring(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Quick mode ──────────────────────────────────────────────────────────────

async function runQuickSearch(): Promise<EvaluationSignal[]> {
  console.log("[Cosmo] Quick search: running Claude 3-model pipeline...");

  const client = getClaudeClient();
  if (!client) return [];

  // Try Perplexity for live web context
  const perplexityResults = await searchWithPerplexity([
    "What are the most significant AI model updates, benchmark changes, pricing changes, or new bugs in the last 7 days across Claude, ChatGPT, Gemini, Perplexity, Midjourney, Sora, Runway? Be specific with model names and numbers.",
    "Which AI models are best for planning, research, writing, strategy, image/video, MVP building, finance, legal, and business development right now in 2026?",
  ]);

  const searchContext = perplexityResults.length > 0
    ? perplexityResults.map((r) => `Q: ${r.query}\nA: ${r.answer}\nSources: ${r.citations.join(", ")}`).join("\n\n")
    : "";

  // Run single pipeline with all categories combined for quick mode
  const signals = await runClaudePipeline(client, searchContext, "all categories");
  return deduplicateSignals(signals);
}

// ── Deep mode ───────────────────────────────────────────────────────────────

async function runDeepSearchFull(): Promise<EvaluationSignal[]> {
  console.log("[Cosmo] Deep search: running full Claude 3-model pipeline...");

  const client = getClaudeClient();
  if (!client) return [];

  // Gather Perplexity web search context (if available)
  const allQueries = [
    ...SEARCH_CATEGORIES.flatMap((c) => c.queries.slice(0, 2)),
    ...USE_CASE_SEARCH_QUERIES.map((u) => u.queries[0]),
  ];

  const perplexityResults = await searchWithPerplexity(allQueries);

  // Build per-category search context from Perplexity results
  const categoryContext: Record<string, string> = {};
  for (const cat of SEARCH_CATEGORIES) {
    const relevant = perplexityResults.filter((r) =>
      cat.queries.some((q) => r.query === q)
    );
    categoryContext[cat.category] = relevant.length > 0
      ? relevant.map((r) => `Q: ${r.query}\nA: ${r.answer}\nSources: ${r.citations.join(", ")}`).join("\n\n")
      : "";
  }

  // Add use-case context
  const useCaseContext = perplexityResults
    .filter((r) => USE_CASE_SEARCH_QUERIES.some((u) => u.queries.includes(r.query)))
    .map((r) => `Q: ${r.query}\nA: ${r.answer}\nSources: ${r.citations.join(", ")}`)
    .join("\n\n");

  // Run 3-model pipeline for each category in parallel (3 categories at a time to avoid rate limits)
  const allSignals: EvaluationSignal[] = [];

  const categories = SEARCH_CATEGORIES.map((c) => c.category);
  const batchSize = 3;

  for (let i = 0; i < categories.length; i += batchSize) {
    const batch = categories.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((cat) => runClaudePipeline(client, categoryContext[cat] || useCaseContext, cat))
    );
    for (const signals of batchResults) {
      allSignals.push(...signals);
    }
  }

  // Also run use-case focused pipeline
  const useCaseSignals = await runClaudePipeline(
    client,
    useCaseContext || categoryContext["model_release"] || "",
    "model_release"
  );
  allSignals.push(...useCaseSignals);

  console.log(`[Cosmo] Deep search total: ${allSignals.length} signals before dedup`);
  return deduplicateSignals(allSignals);
}

export async function runDeepSearch(mode: SearchMode = "deep"): Promise<EvaluationSignal[]> {
  if (mode === "quick") return runQuickSearch();
  return runDeepSearchFull();
}

// ── Export raw use-case intel for report generator ────────────────────────────

export async function fetchUseCaseIntel(): Promise<{
  useCase: string;
  perplexityResults: { query: string; answer: string; citations: string[] }[];
}[]> {
  console.log("[Cosmo] Fetching live use-case intelligence for dynamic report...");

  const results = await Promise.all(
    USE_CASE_SEARCH_QUERIES.map(async (uc) => {
      const perplexityResults = await searchWithPerplexity(uc.queries);
      return { useCase: uc.useCase, perplexityResults };
    })
  );

  return results;
}
