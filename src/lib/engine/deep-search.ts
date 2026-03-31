import { EvaluationSignal } from "@/lib/models/types";

export type SearchMode = "quick" | "deep";

// ── Standard signal categories (unchanged) ────────────────────────────────────
const SEARCH_CATEGORIES = [
  {
    category: "benchmark" as const,
    quickQuery: "AI model benchmark updates SWE-bench ARC-AGI AIME GDPval 2026 latest results this week",
    queries: [
      "SWE-bench latest results 2026 AI model coding benchmark",
      "ARC-AGI-2 latest scores frontier models 2026",
      "AIME 2026 AI math benchmark results",
      "GPQA Diamond latest AI model scores 2026",
      "GDPval knowledge work benchmark AI models 2026",
      "MRCR long context benchmark AI models latest",
      "Finance Agent benchmark AI models latest results",
    ],
  },
  {
    category: "model_release" as const,
    quickQuery: "Claude ChatGPT Gemini Perplexity NotebookLM Midjourney Sora Runway Harvey new model release update 2026",
    queries: [
      "Anthropic Claude new model release announcement 2026",
      "OpenAI GPT o3 new model release update 2026",
      "Google Gemini new model version announcement 2026",
      "Perplexity Sonar model update 2026",
      "NotebookLM new features update 2026",
      "Midjourney v7 new version update 2026",
      "OpenAI Sora video generation update 2026",
      "Runway Gen-3 new features update 2026",
      "Harvey AI legal platform update 2026",
      "Bolt.new Lovable AI coding platform update 2026",
    ],
  },
  {
    category: "pricing" as const,
    quickQuery: "AI model API pricing changes 2026 Claude GPT Gemini Perplexity Midjourney Sora token cost update",
    queries: [
      "Anthropic Claude API pricing changes 2026",
      "OpenAI API pricing update o3 GPT 2026",
      "Google Gemini API pricing changes 2026",
      "Perplexity API pricing update 2026",
      "Midjourney subscription pricing 2026",
      "Sora OpenAI video generation pricing 2026",
      "Runway Gen-3 credits pricing update 2026",
    ],
  },
  {
    category: "bug" as const,
    quickQuery: "AI model known bugs issues regressions 2026 Gemini Claude GPT Sora Runway latest",
    queries: [
      "Gemini Pro code deletion bug status 2026",
      "Claude known issues bugs regression 2026",
      "GPT o3 known bugs issues 2026",
      "Sora video generation issues limitations 2026",
      "Runway Gen-3 quality issues reports",
      "AI model reliability issues reports latest 2026",
    ],
  },
  {
    category: "context_window" as const,
    quickQuery: "AI model context window expansion changes 2026 Claude Gemini GPT",
    queries: [
      "AI model context window expansion announcement 2026",
      "Claude Opus context window update",
      "Gemini 2M context window changes 2026",
      "GPT-4.1 context window expansion update",
    ],
  },
  {
    category: "prompt_technique" as const,
    quickQuery: "new prompt engineering techniques breakthroughs best practices 2026 context engineering",
    queries: [
      "new prompt engineering techniques 2026 best practices",
      "AI prompting breakthroughs latest research 2026",
      "chain of thought prompting improvements latest",
      "context engineering AI agents best practices 2026",
    ],
  },
];

// ── Use-case specific searches — runs every day to keep rankings fresh ─────────
const USE_CASE_SEARCH_QUERIES = [
  {
    useCase: "planning",
    queries: [
      "best AI model project planning roadmapping 2026 Claude o3 Gemini comparison latest",
      "Claude Opus 4.5 vs o3 planning complex tasks performance 2026",
      "AI tools enterprise OKR roadmap planning best models March 2026",
    ],
  },
  {
    useCase: "research",
    queries: [
      "best AI research tool 2026 Perplexity NotebookLM Gemini Deep Research comparison",
      "Perplexity Deep Research vs Gemini Deep Research quality comparison 2026",
      "NotebookLM Plus vs Perplexity Sonar Pro research 2026",
    ],
  },
  {
    useCase: "writing",
    queries: [
      "best AI writing tool 2026 Claude GPT comparison quality",
      "Claude Opus vs GPT-5.2 writing quality comparison 2026 latest",
      "AI content writing tools professional use 2026 benchmark",
    ],
  },
  {
    useCase: "strategy",
    queries: [
      "best AI model business strategy analysis 2026 o3 Claude GPT",
      "o3 vs Claude Opus strategic reasoning tasks 2026 comparison",
      "AI business strategy consulting tools best models 2026",
    ],
  },
  {
    useCase: "image_video",
    queries: [
      "Midjourney v7 vs DALL-E comparison quality 2026 latest",
      "OpenAI Sora video generation quality updates March 2026",
      "Runway Gen-3 vs Sora video AI comparison 2026 latest",
      "best AI image generation tools 2026 Midjourney Flux comparison",
      "AI video generation tools comparison 2026 Sora Runway Kling",
    ],
  },
  {
    useCase: "quick_mvp",
    queries: [
      "Bolt.new vs Lovable AI app builder comparison 2026 latest",
      "best AI coding tool MVP build 2026 Claude Sonnet Cursor Bolt",
      "Claude Sonnet Bolt.new full stack app quality 2026",
      "Firebase Studio AI coding Google 2026 update",
    ],
  },
  {
    useCase: "finance",
    queries: [
      "best AI model financial modeling Excel automation 2026",
      "o3 vs Claude finance quantitative reasoning 2026 comparison",
      "GPT Code Interpreter Excel automation finance 2026 best practices",
      "AI financial analysis tools 2026 comparison Claude GPT o3",
    ],
  },
  {
    useCase: "legal",
    queries: [
      "Harvey AI legal platform update 2026 latest features",
      "best AI model contract review legal analysis 2026 Claude GPT",
      "Harvey AI vs Claude Opus legal document review comparison 2026",
      "AI legal tools law firms 2026 adoption comparison",
    ],
  },
  {
    useCase: "bd_gtm",
    queries: [
      "best AI model sales email outreach GTM 2026 GPT Claude comparison",
      "GPT-4.1 vs Claude Sonnet BD content writing 2026",
      "AI tools business development pipeline outreach 2026 best",
      "Perplexity Sonar account research sales intelligence 2026",
    ],
  },
];

const NEWSLETTER_SOURCES = [
  "The Batch deeplearning.ai AI newsletter latest",
  "TLDR AI newsletter latest updates",
  "Ben's Bites AI newsletter latest",
  "Import AI newsletter latest developments",
  "The Rundown AI newsletter latest",
  "AI Breakfast newsletter latest model updates",
  "Superhuman AI newsletter latest",
];

const LONG_TAIL_QUERIES = [
  "reddit r/ClaudeAI latest model updates user reports",
  "reddit r/ChatGPT latest model quality changes user reports",
  "reddit r/artificial best AI model comparison 2026",
  "reddit r/PromptEngineering latest techniques breakthroughs",
  "Hacker News AI model comparison discussion latest",
  "Twitter/X AI model updates announcements latest",
  "YouTube AI model review comparison latest 2026",
  "developer blog posts AI model switching experiences 2026",
  "AI model comparison practitioner reports 2026",
  "frontier model evaluation independent testing latest",
  "Midjourney community updates model quality 2026",
  "Sora users feedback quality 2026",
  "Harvey AI legal tech adoption news 2026",
  "Bolt.new Lovable user experience comparison 2026",
];

async function searchWithTavily(
  queries: string[],
  depth: "basic" | "advanced" = "advanced",
  maxResults: number = 5
): Promise<{ query: string; results: { title: string; url: string; content: string }[] }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set, skipping Tavily layer");
    return [];
  }

  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: depth,
            max_results: maxResults,
            include_answer: true,
            include_raw_content: false,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.warn(`[Cosmo] Tavily ${response.status} for "${query.substring(0, 50)}": ${errText.substring(0, 200)}`);
          return { query, results: [] };
        }
        const data = await response.json();
        return {
          query,
          results: (data.results || []).map(
            (r: { title: string; url: string; content: string }) => ({
              title: r.title,
              url: r.url,
              content: r.content?.substring(0, 600) || "",
            })
          ),
        };
      } catch (err) {
        console.warn(`[Cosmo] Tavily error for "${query.substring(0, 50)}":`, err instanceof Error ? err.message : err);
        return { query, results: [] };
      }
    })
  );

  const filtered = results.filter((r) => r.results.length > 0);
  console.log(`[Cosmo] Tavily: ${filtered.length}/${queries.length} queries returned results`);
  return filtered;
}

async function searchWithPerplexity(
  queries: string[]
): Promise<{ query: string; answer: string; citations: string[] }[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn("PERPLEXITY_API_KEY not set, skipping Perplexity layer");
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
                  "You are a concise AI industry analyst. Return factual, current updates about AI models, benchmarks, pricing, and capabilities. Be specific with numbers, dates, and model names. Focus on changes from the last 14 days where relevant, but also include current state-of-the-art comparisons.",
              },
              { role: "user", content: query },
            ],
            max_tokens: 600,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.warn(`[Cosmo] Perplexity ${response.status} for "${query.substring(0, 50)}": ${errText.substring(0, 200)}`);
          return { query, answer: "", citations: [] };
        }
        const data = await response.json();
        return {
          query,
          answer: data.choices?.[0]?.message?.content || "",
          citations: data.citations || [],
        };
      } catch (err) {
        console.warn(`[Cosmo] Perplexity error for "${query.substring(0, 50)}":`, err instanceof Error ? err.message : err);
        return { query, answer: "", citations: [] };
      }
    })
  );

  const filtered = results.filter((r) => r.answer.length > 0);
  console.log(`[Cosmo] Perplexity: ${filtered.length}/${queries.length} queries returned results`);
  return filtered;
}

async function synthesizeSignalsWithOpenAI(
  tavilyResults: { query: string; results: { title: string; url: string; content: string }[] }[],
  perplexityResults: { query: string; answer: string; citations: string[] }[],
  category: string
): Promise<EvaluationSignal[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return extractSignalsFromRawData(tavilyResults, perplexityResults, category);
  }

  const tavilySummary = tavilyResults
    .map(
      (r) =>
        `Query: ${r.query}\nResults:\n${r.results.map((res) => `- ${res.title}: ${res.content}`).join("\n")}`
    )
    .join("\n\n");

  const perplexitySummary = perplexityResults
    .map(
      (r) =>
        `Query: ${r.query}\nAnswer: ${r.answer}\nSources: ${r.citations.join(", ")}`
    )
    .join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI model evaluation analyst. Analyze search results and extract actionable signals about AI model changes across all categories including: benchmarks, releases, pricing, bugs, context windows, prompt techniques, and use-case performance (planning, research, writing, strategy, image/video, MVP building, finance, legal, BD/GTM).

Return a JSON object with a "signals" key containing an array. Each signal must have:
- "category": one of "benchmark", "model_release", "pricing", "bug", "context_window", "prompt_technique"
- "title": concise title under 80 chars
- "description": detailed description with specific numbers, dates, model names
- "source": URL or source name if available
- "confidence": 0.0-1.0 rating of signal reliability

Only include signals with confidence >= 0.5. Cross-reference both sources — higher confidence when both agree.
Return ONLY valid JSON: {"signals": [...]}`,
          },
          {
            role: "user",
            content: `Category focus: ${category}\n\n=== TAVILY ===\n${tavilySummary || "None"}\n\n=== PERPLEXITY ===\n${perplexitySummary || "None"}\n\nExtract actionable signals.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Cosmo] OpenAI synthesis ${response.status} for ${category}: ${errText.substring(0, 200)}`);
      return extractSignalsFromRawData(tavilyResults, perplexityResults, category);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    try {
      const parsed = JSON.parse(content);
      const rawSignals = Array.isArray(parsed) ? parsed : parsed.signals || [];
      const signals = rawSignals
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
      console.log(`[Cosmo] OpenAI synthesis for ${category}: ${rawSignals.length} raw → ${signals.length} after filter`);
      return signals;
    } catch (parseErr) {
      console.warn(`[Cosmo] OpenAI JSON parse failed for ${category}:`, parseErr instanceof Error ? parseErr.message : parseErr);
      return extractSignalsFromRawData(tavilyResults, perplexityResults, category);
    }
  } catch (err) {
    console.warn(`[Cosmo] OpenAI synthesis error for ${category}:`, err instanceof Error ? err.message : err);
    return extractSignalsFromRawData(tavilyResults, perplexityResults, category);
  }
}

function extractSignalsFromRawData(
  tavilyResults: { query: string; results: { title: string; url: string; content: string }[] }[],
  perplexityResults: { query: string; answer: string; citations: string[] }[],
  category: string
): EvaluationSignal[] {
  const signals: EvaluationSignal[] = [];

  for (const result of perplexityResults) {
    if (result.answer && result.answer.length > 50) {
      signals.push({
        category: category as EvaluationSignal["category"],
        title: `Update: ${result.query.substring(0, 60)}`,
        description: result.answer.substring(0, 500),
        source: result.citations[0] || undefined,
      });
    }
  }

  for (const result of tavilyResults) {
    for (const item of result.results) {
      const keywords = ["new", "update", "release", "change", "fix", "bug", "improved", "launch", "announce", "best", "vs", "comparison"];
      if (keywords.some((k) => item.content.toLowerCase().includes(k))) {
        signals.push({
          category: category as EvaluationSignal["category"],
          title: item.title.substring(0, 80),
          description: item.content.substring(0, 500),
          source: item.url,
        });
        break;
      }
    }
  }

  return signals;
}

function deduplicateSignals(signals: EvaluationSignal[]): EvaluationSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.category}:${signal.title.toLowerCase().substring(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Quick mode: ~1-2 min ──────────────────────────────────────────────────────
async function runQuickSearch(): Promise<EvaluationSignal[]> {
  console.log("[Cosmo] Quick search: running broad parallel queries...");

  const tavilyQueries = SEARCH_CATEGORIES.map((c) => c.quickQuery);

  // Also grab one quick query per use-case to keep rankings fresh
  const useCaseQuickQueries = USE_CASE_SEARCH_QUERIES.map((u) => u.queries[0]);

  const perplexityQueries = [
    "What are the most significant AI model updates, benchmark changes, pricing changes, or new bugs in the last 7 days across Claude, ChatGPT (o3, GPT-4.1, GPT-5.2), Gemini, Perplexity, NotebookLM, Midjourney, Sora, Runway, and Harvey AI? Be specific.",
    "What are current practitioners saying about the best AI models for planning, research, writing, strategy, image/video generation, MVP building, finance, legal, and business development in 2026? Which models are winning each category right now?",
  ];

  const [tavilyResults, useCaseResults, perplexityResults] = await Promise.all([
    searchWithTavily(tavilyQueries, "basic", 3),
    searchWithTavily(useCaseQuickQueries, "basic", 3),
    searchWithPerplexity(perplexityQueries),
  ]);

  const signals = await synthesizeSignalsWithOpenAI(
    [...tavilyResults, ...useCaseResults],
    perplexityResults,
    "model_release"
  );

  return deduplicateSignals(signals);
}

// ── Deep mode: ~5-10 min ──────────────────────────────────────────────────────
async function runDeepSearchFull(): Promise<EvaluationSignal[]> {
  console.log("[Cosmo] Deep search: running full multi-layer search...");
  const allSignals: EvaluationSignal[] = [];

  // Layer 1: Standard signal categories (benchmarks, releases, pricing, bugs, etc.)
  const categoryPromises = SEARCH_CATEGORIES.map(async (searchCategory) => {
    const allQueries = [...searchCategory.queries];

    if (searchCategory.category === "model_release" || searchCategory.category === "benchmark") {
      allQueries.push(
        ...LONG_TAIL_QUERIES.filter((q) => {
          if (searchCategory.category === "model_release") return q.includes("update") || q.includes("model");
          return q.includes("comparison") || q.includes("evaluation");
        })
      );
    }

    const newsletterQueries = NEWSLETTER_SOURCES.slice(0, 3).map(
      (nl) => `${nl} ${searchCategory.category.replace("_", " ")} updates`
    );

    const [tavilyResults, perplexityResults, tavilyNewsletters] = await Promise.all([
      searchWithTavily(allQueries),
      searchWithPerplexity(searchCategory.queries.slice(0, 3)),
      searchWithTavily(newsletterQueries, "basic", 3),
    ]);

    return synthesizeSignalsWithOpenAI(
      [...tavilyResults, ...tavilyNewsletters],
      perplexityResults,
      searchCategory.category
    );
  });

  // Layer 2: Use-case specific searches — keeps model rankings current every run
  const useCasePromises = USE_CASE_SEARCH_QUERIES.map(async (uc) => {
    const [tavilyResults, perplexityResults] = await Promise.all([
      searchWithTavily(uc.queries, "advanced", 5),
      searchWithPerplexity(uc.queries.slice(0, 2)),
    ]);

    return synthesizeSignalsWithOpenAI(tavilyResults, perplexityResults, "model_release");
  });

  const [categoryResults, useCaseResults] = await Promise.all([
    Promise.all(categoryPromises),
    Promise.all(useCasePromises),
  ]);

  for (const signals of [...categoryResults, ...useCaseResults]) {
    allSignals.push(...signals);
  }

  // Layer 3: Long-tail community/practitioner signals
  const [ltTavily, ltPerplexity] = await Promise.all([
    searchWithTavily(LONG_TAIL_QUERIES),
    searchWithPerplexity([
      "What are the most significant AI model changes this week across Claude, GPT, Gemini, Perplexity, Midjourney, Sora, Runway, Harvey, and Bolt.new?",
      "Which AI models are practitioners recommending right now for planning, research, writing, finance, legal work, and business development in 2026?",
    ]),
  ]);

  const longTailSignals = await synthesizeSignalsWithOpenAI(ltTavily, ltPerplexity, "model_release");
  allSignals.push(...longTailSignals);

  return deduplicateSignals(allSignals);
}

export async function runDeepSearch(mode: SearchMode = "deep"): Promise<EvaluationSignal[]> {
  if (mode === "quick") return runQuickSearch();
  return runDeepSearchFull();
}

// ── Export raw use-case intel for report generator ────────────────────────────
export async function fetchUseCaseIntel(): Promise<{
  useCase: string;
  tavilyResults: { query: string; results: { title: string; url: string; content: string }[] }[];
  perplexityResults: { query: string; answer: string; citations: string[] }[];
}[]> {
  console.log("[Cosmo] Fetching live use-case intelligence for dynamic report...");

  const results = await Promise.all(
    USE_CASE_SEARCH_QUERIES.map(async (uc) => {
      const [tavilyResults, perplexityResults] = await Promise.all([
        searchWithTavily(uc.queries, "advanced", 5),
        searchWithPerplexity(uc.queries),
      ]);
      return { useCase: uc.useCase, tavilyResults, perplexityResults };
    })
  );

  return results;
}
