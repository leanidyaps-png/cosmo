import { EvaluationSignal } from "@/lib/models/types";
import { USE_CASE_REGISTRY } from "@/lib/models/registry";
import { fetchUseCaseIntel } from "./deep-search";

interface ReportInput {
  signals: EvaluationSignal[];
  date: Date;
}

const CATEGORY_LABELS: Record<string, string> = {
  benchmark: "Benchmark Updates",
  model_release: "Model Releases & Updates",
  pricing: "Pricing Changes",
  bug: "Known Bugs & Issues",
  context_window: "Context Window Changes",
  prompt_technique: "Prompt Engineering Techniques",
};

const SPEED_EMOJI: Record<string, string> = {
  fastest: "⚡⚡⚡",
  fast: "⚡⚡",
  moderate: "⚡",
  slow: "🐢",
  slowest: "🐢🐢",
};

function groupSignals(signals: EvaluationSignal[]): Record<string, EvaluationSignal[]> {
  const groups: Record<string, EvaluationSignal[]> = {};
  for (const sig of signals) {
    if (!groups[sig.category]) groups[sig.category] = [];
    groups[sig.category].push(sig);
  }
  return groups;
}

// ── Static fallback section (used when no OpenAI key or as quick-mode base) ──

function buildStaticUseCaseSection(categoryId: keyof typeof USE_CASE_REGISTRY): string {
  const cat = USE_CASE_REGISTRY[categoryId];
  const weightLabel = cat.weight ? ` — ${cat.weight} of Klein Ventures AI Workflow` : "";

  const modelRows = cat.topModels
    .map(
      (m) =>
        `| **#${m.rank}** | **${m.modelName}** | ${m.provider} | ${m.accessVia} | ${m.speed} ${SPEED_EMOJI[m.speed]} | ${m.costLabel} | ${m.keyBenchmark || "—"} |`
    )
    .join("\n");

  const modelDetails = cat.topModels
    .map((m) => {
      return `#### #${m.rank} ${m.modelName} *(${m.provider})*

> **Verdict:** ${m.verdict}

**Access:** \`${m.accessVia}\` · **Speed:** ${m.speed} ${SPEED_EMOJI[m.speed]} · **Cost:** ${m.costLabel}${m.keyBenchmark ? ` · **Key Benchmark:** ${m.keyBenchmark}` : ""}

**Strengths:**
${m.strengths.map((s) => `  - ${s}`).join("\n")}

**Weaknesses:**
${m.weaknesses.map((w) => `  - ${w}`).join("\n")}

**Best For:** ${m.bestFor.join(", ")}

**Prompt Tip:** *${m.promptTip}*`;
    })
    .join("\n\n---\n\n");

  return `## ${cat.name}${weightLabel}

> ${cat.description}

### Model Comparison

| Rank | Model | Provider | Access Via | Speed | Cost | Key Benchmark |
|------|-------|----------|-----------|-------|------|---------------|
${modelRows}

---

${modelDetails}

---

**Workflow Pattern:** ${cat.workflowTip}`;
}

function buildStaticRoutingTable(): string {
  const rows: string[] = [];
  for (const cat of Object.values(USE_CASE_REGISTRY)) {
    for (const m of cat.topModels) {
      rows.push(
        `| ${cat.name}${cat.weight ? ` (${cat.weight})` : ""} | #${m.rank} ${m.modelName} | ${m.provider} | ${m.accessVia} | ${m.speed} ${SPEED_EMOJI[m.speed]} | ${m.costLabel} |`
      );
    }
  }
  return `| Use Case | Top Model | Provider | Access | Speed | Cost |
|----------|-----------|----------|--------|-------|------|
${rows.join("\n")}`;
}

function buildPromptBestPractices(): string {
  return `### Cross-Platform Prompt Fundamentals

1. **Few-Shot Prompting** — 2–5 input → output examples eliminate ambiguity more reliably than verbose instructions
2. **Context Engineering** — Manage all information the model sees as a curated token budget, not just the instruction string
3. **Decomposition** — Split complex requests into sequential sub-prompts for better accuracy and auditability
4. **Chain-of-Thought** — "Think step by step" or "Show your reasoning" activates deeper, more reliable reasoning
5. **Self-Criticism / Iterative Refinement** — Ask the model to critique and revise its own output before returning it
6. **Eval-Driven Iteration** — Treat prompts like code: pin a model version, build automated evals, measure, iterate

### Format by Use Case

| Use Case | Primary Model | Format to Use |
|----------|---------------|---------------|
| Planning | Claude Opus | XML tags: \`<goal>\`, \`<constraints>\`, \`<timeline>\`, \`<deliverables>\` |
| Research | Perplexity | SCOPE → DEPTH → FORMAT → SOURCE PREFERENCE |
| Writing | Claude / GPT | Style example + audience + length + tone spec |
| Strategy | o3 / Claude | CTCO + ask for risks before recommendations |
| Image/Video | Midjourney/Sora | Director description: subject, lighting, camera, mood, style |
| Quick MVP | Claude Sonnet | Full app description: stack + data models + features in one prompt |
| Finance | o3 / GPT Code | Raw numbers + model type + "show all assumptions" |
| Legal | Claude Opus | Full doc + jurisdiction + "flag severity, suggest redlines" |
| BD / GTM | GPT-4.1 | ICP profile + "generate 5 variations with different hooks" |

### Platform-Specific Rules

- **Claude (all tasks):** XML tags, positive framing, provide motivation ("why"), use extended thinking for complex analysis
- **ChatGPT / o3:** CTCO framework with Markdown; put critical instructions at top AND bottom; set reasoning_effort=high for o3
- **Gemini:** Place instructions AFTER data for long contexts; keep temperature at 1.0 (lowering causes loops); pass actual media files
- **Perplexity:** Search-friendly language, NO few-shot examples, include time constraints, specify source types
- **NotebookLM:** Upload sources first; use 5 Essential Questions technique; ask for contradictions between sources`;
}

// ── Report header and shell ───────────────────────────────────────────────────

function buildReportShell(date: Date, signals: EvaluationSignal[]): {
  header: string;
  signalsSection: string;
  footer: string;
} {
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timestamp = date.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const grouped = groupSignals(signals);

  const nextRun = new Date(date);
  nextRun.setDate(nextRun.getDate() + 1);
  nextRun.setHours(6, 0, 0, 0);

  const signalsSummary =
    signals.length > 0
      ? `${signals.length} signals detected across ${Object.keys(grouped).length} categories: ` +
        Object.entries(grouped)
          .map(([cat, sigs]) => `${sigs.length} ${CATEGORY_LABELS[cat] || cat}`)
          .join(", ") + "."
      : "No significant signals detected in the last 24 hours. All platforms operating within expected parameters.";

  const signalSections = Object.entries(grouped)
    .map(([cat, sigs]) => {
      const bullets = sigs
        .map(
          (s) =>
            `- **${s.title}**${s.confidence ? ` (confidence: ${(s.confidence * 100).toFixed(0)}%)` : ""}\n  ${s.description}${s.source ? `\n  *Source: ${s.source}*` : ""}`
        )
        .join("\n\n");
      return `#### ${CATEGORY_LABELS[cat] || cat}\n\n${bullets}`;
    })
    .join("\n\n---\n\n");

  const header = `# Cosmo AI Model Intelligence Report
**Prepared for:** Sam Klein, Klein Ventures
**Date:** ${dateStr}
**Generated:** ${timestamp}
**Report Type:** 30-Model Use-Case Deep Dive (Live Intelligence)
**Signals Detected:** ${signals.length}
**Categories Covered:** Planning (26%) · Research (16%) · Writing (17%) · Strategy (16%) · Image & Video · Quick MVP / Bolt · Finance & Excel · Legal · BD & GTM

---

## Executive Summary

${signalsSummary}

This report covers **30 AI models** ranked across **9 use-case categories** mapped to Klein Ventures' workflow. Every section is generated fresh from today's live web intelligence — model rankings, verdicts, and recommendations update automatically each run.

---

## Signals Detected (Last 24 Hours)

${signals.length > 0 ? signalSections : "*No actionable signals detected this cycle. All platforms operating within expected parameters.*"}

---`;

  const footer = `---

## Prompt Engineering Best Practices

${buildPromptBestPractices()}

---

## Multi-Platform Workflow Patterns

| Workflow | Platform Sequence | When to Use |
|----------|-------------------|-------------|
| Research → Plan → Execute | Perplexity Deep Research → Claude Opus (plan) → Claude Sonnet (iterate) | New market entry, product launches, major initiatives |
| Research → Analyze → Write | Perplexity / NotebookLM → o3 (analysis) → Claude Opus (memo) | Investment memos, due diligence reports |
| Brief → Create → Polish | GPT-5.2 (creative draft) → Claude Sonnet (structure) → Claude Opus (precision) | Blog posts, white papers, marketing content |
| Prospect → Pitch → Outreach | Perplexity Sonar Pro (research) → Claude Sonnet (proposal) → GPT-4.1 (email sequence) | BD pipeline, GTM campaigns |
| Data → Model → Present | o3 (model) → GPT-5.2 Code Interpreter (Excel) → Claude Opus (narrative) | Financial analysis, investor materials |
| Contract → Review → Memo | Claude Opus (redline) → GPT-5.2 Pro (legal research) → Claude Opus (summary memo) | Legal due diligence, compliance review |
| Concept → Visual → Video | Midjourney (stills) → Runway Gen-3 (motion) → Sora (full scenes) | Marketing campaigns, brand videos |
| Scaffold → Refine → Ship | Bolt.new / Claude Sonnet (scaffold) → Cursor (refine) → Vercel/Firebase (deploy) | MVP builds, internal tools, hackathons |

---

## Next Report

**Scheduled:** ${nextRun.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at 6:00 AM UTC

---

*Cosmo AI Model Intelligence Report v3.0 — Klein Ventures — 30 Models · 9 Use Cases — Live Intelligence Refreshed Daily*`;

  return { header, signalsSection: "", footer };
}

// ── Static report (quick mode or no API key) ──────────────────────────────────

export function generateDailyReport({ signals, date }: ReportInput): string {
  const { header, footer } = buildReportShell(date, signals);

  const categoryKeys = Object.keys(USE_CASE_REGISTRY) as (keyof typeof USE_CASE_REGISTRY)[];
  const categorySections = categoryKeys
    .map((k) => buildStaticUseCaseSection(k))
    .join("\n\n---\n\n");

  return `${header}

${categorySections}

---

## Master Model Routing Table — All 30 Models

${buildStaticRoutingTable()}

${footer}`;
}

// ── Dynamic report (deep mode — live intelligence every run) ──────────────────

export async function generateComprehensiveReport(
  signals: EvaluationSignal[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return generateDailyReport({ signals, date: new Date() });
  }

  const date = new Date();
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Fetch live use-case intelligence in parallel with report shell construction
  let useCaseIntel: Awaited<ReturnType<typeof fetchUseCaseIntel>> = [];
  try {
    useCaseIntel = await fetchUseCaseIntel();
  } catch (err) {
    console.error("[Cosmo] Use-case intel fetch failed, falling back to static:", err);
    return generateDailyReport({ signals, date });
  }

  // Serialize the static baseline registry for OpenAI context
  const registryBaseline = Object.values(USE_CASE_REGISTRY).map((cat) => ({
    category: cat.name,
    weight: cat.weight,
    description: cat.description,
    models: cat.topModels.map((m) => ({
      rank: m.rank,
      name: m.modelName,
      provider: m.provider,
      accessVia: m.accessVia,
      costLabel: m.costLabel,
      speed: m.speed,
      keyBenchmark: m.keyBenchmark,
      verdict: m.verdict,
      strengths: m.strengths,
      weaknesses: m.weaknesses,
      bestFor: m.bestFor,
      promptTip: m.promptTip,
    })),
    workflowTip: cat.workflowTip,
  }));

  // Serialize live intel
  const liveIntelSummary = useCaseIntel.map((uc) => {
    const tavilyText = uc.tavilyResults
      .flatMap((r) => r.results.map((res) => `[${uc.useCase}] ${res.title}: ${res.content.substring(0, 300)}`))
      .join("\n");
    const perplexityText = uc.perplexityResults
      .map((r) => `[${uc.useCase}] Q: ${r.query}\nA: ${r.answer.substring(0, 400)}`)
      .join("\n");
    return `=== ${uc.useCase.toUpperCase()} ===\n${perplexityText}\n${tavilyText}`;
  }).join("\n\n");

  // Signal context
  const signalContext = signals
    .map((s) => `[${s.category.toUpperCase()}] ${s.title}: ${s.description}`)
    .join("\n");

  console.log("[Cosmo] Generating dynamic full report with live intelligence...");

  try {
    // Single comprehensive OpenAI call to generate the full dynamic report body
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Cosmo, an AI model intelligence analyst for Klein Ventures. Today is ${dateStr}.

You write a daily intelligence report covering 30 AI models across 9 use-case categories that map to Klein Ventures' workflow:
1. Planning (26% of workflow)
2. Research (16%)
3. Writing (17%)
4. Strategy (16%)
5. Image & Video Generation
6. Quick MVP / Lovable / Bolt
7. Finance, Excel & Numbers
8. Legal & Lawyers
9. BD, GTM & Business Development

You are given:
A) A BASELINE REGISTRY — the established knowledge about each category's top models (may be slightly stale)
B) LIVE INTEL — fresh web search results gathered TODAY about each category
C) SIGNALS — specific changes detected in the last 24 hours

Your job: Write the FULL dynamic report body covering all 9 categories. For each category:
- Update model rankings based on live intel (if something has changed, reflect it)
- Note any models that have improved, declined, or been superseded since the baseline
- Keep the same structured format as the baseline, but with live context baked in
- If live intel confirms the baseline, say so and reinforce it with current evidence
- If live intel reveals a change (new model, pricing shift, quality regression, better alternative), update the rankings and explain why

FORMAT REQUIREMENTS (mandatory):
- Use "## Category Name" for each of the 9 categories
- Include a markdown table with columns: Rank | Model | Provider | Access Via | Speed | Cost | Key Benchmark
- Below the table, include "#### #1 Model Name *(Provider)*" sections with Verdict, Strengths, Weaknesses, Best For, Prompt Tip
- End each category with "**Workflow Pattern:**" tip
- After all 9 categories, write "## Master Model Routing Table" with a full table of all 30 models
- Use bold for key terms, italics for prompt tips
- Be specific with numbers, model names, dates, and benchmark scores

Write authoritatively. Sam Klein is a sophisticated user who uses these models daily — no fluff, just signal.`,
          },
          {
            role: "user",
            content: `BASELINE REGISTRY (established knowledge):
${JSON.stringify(registryBaseline, null, 2)}

LIVE INTEL (gathered today, ${dateStr}):
${liveIntelSummary || "No live intel available — use baseline."}

TODAY'S SIGNALS (specific 24h changes):
${signalContext || "No specific signals today."}

Generate the complete dynamic report body covering all 9 use-case categories and the master routing table. Apply today's live intel to update any rankings or recommendations that have changed. Flag any changes from the baseline prominently.`,
          },
        ],
        max_tokens: 8000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("[Cosmo] OpenAI report generation failed, falling back to static");
      return generateDailyReport({ signals, date });
    }

    const data = await response.json();
    const dynamicBody = data.choices?.[0]?.message?.content || "";

    if (dynamicBody.length < 500) {
      return generateDailyReport({ signals, date });
    }

    // Build the final report: shell header + dynamic body + shell footer
    const { header, footer } = buildReportShell(date, signals);
    return `${header}

${dynamicBody}

${footer}`;
  } catch (err) {
    console.error("[Cosmo] Report generation error:", err);
    return generateDailyReport({ signals, date });
  }
}
