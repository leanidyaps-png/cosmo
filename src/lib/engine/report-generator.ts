import Anthropic from "@anthropic-ai/sdk";
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
  const pstOffset = 8;
  nextRun.setUTCHours(5 + pstOffset, 0, 0, 0);

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

**Scheduled:** ${nextRun.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at 5:00 AM PST

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

// ── Dynamic report (deep mode — Claude 3-model pipeline) ─────────────────────

export async function generateComprehensiveReport(
  signals: EvaluationSignal[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return generateDailyReport({ signals, date: new Date() });
  }

  const client = new Anthropic({ apiKey });
  const date = new Date();
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Fetch live use-case intelligence
  let useCaseIntel: Awaited<ReturnType<typeof fetchUseCaseIntel>> = [];
  try {
    useCaseIntel = await fetchUseCaseIntel();
  } catch (err) {
    console.error("[Cosmo] Use-case intel fetch failed, falling back to static:", err);
    return generateDailyReport({ signals, date });
  }

  // Serialize the static baseline registry
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
    const perplexityText = uc.perplexityResults
      .map((r) => `[${uc.useCase}] Q: ${r.query}\nA: ${r.answer.substring(0, 400)}`)
      .join("\n");
    return `=== ${uc.useCase.toUpperCase()} ===\n${perplexityText}`;
  }).join("\n\n");

  const signalContext = signals
    .map((s) => `[${s.category.toUpperCase()}] ${s.title}: ${s.description}`)
    .join("\n");

  const reportPrompt = `You are Cosmo, an AI model intelligence analyst for Klein Ventures. Today is ${dateStr}.

You write a daily intelligence report covering 30 AI models across 9 use-case categories:
1. Planning (26% of workflow)
2. Research (16%)
3. Writing (17%)
4. Strategy (16%)
5. Image & Video Generation
6. Quick MVP / Lovable / Bolt
7. Finance, Excel & Numbers
8. Legal & Lawyers
9. BD, GTM & Business Development

BASELINE REGISTRY:
${JSON.stringify(registryBaseline, null, 2)}

LIVE INTEL (gathered today):
${liveIntelSummary || "No live intel available — use baseline."}

TODAY'S SIGNALS:
${signalContext || "No specific signals today."}

Write the FULL dynamic report body covering all 9 categories. For each category:
- Update model rankings based on live intel
- Include a markdown table: Rank | Model | Provider | Access Via | Speed | Cost | Key Benchmark
- Below the table: "#### #1 Model Name *(Provider)*" with Verdict, Strengths, Weaknesses, Best For, Prompt Tip
- End each category with "**Workflow Pattern:**" tip
- After all 9 categories: "## Master Model Routing Table" with all 30 models
- Be specific with numbers, model names, dates, benchmark scores
- No fluff, just signal`;

  console.log("[Cosmo] Generating report — Step 1: Initial draft...");

  try {
    // Step 1: Generate initial report
    const step1 = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: reportPrompt }],
    });
    const initialDraft = step1.content[0].type === "text" ? step1.content[0].text : "";

    if (initialDraft.length < 500) {
      return generateDailyReport({ signals, date });
    }

    console.log("[Cosmo] Step 2: Fact-checking report...");

    // Step 2: Critique the report
    const step2 = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Review this AI intelligence report for accuracy. Flag any:
1. Incorrect model names, versions, or benchmark scores
2. Outdated pricing or capabilities
3. Missing important recent developments
4. Rankings that don't match current evidence
5. Claims that lack supporting evidence

REPORT TO REVIEW:
${initialDraft.substring(0, 6000)}

Provide specific corrections with accurate information.`,
        },
      ],
    });
    const critique = step2.content[0].type === "text" ? step2.content[0].text : "";

    console.log("[Cosmo] Step 3: Synthesizing final report...");

    // Step 3: Final synthesis
    const step3 = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `You are producing the final version of an AI intelligence report. You have the initial draft and a fact-check review.

INITIAL DRAFT:
${initialDraft}

FACT-CHECK REVIEW:
${critique}

Produce the FINAL report incorporating all corrections from the fact-check. Keep the same format and structure but fix any inaccuracies. If the critique identified missing information, add it. If it flagged incorrect claims, correct or remove them.

Output ONLY the final report body in markdown (no preamble, no meta-commentary).`,
        },
      ],
    });
    const finalBody = step3.content[0].type === "text" ? step3.content[0].text : "";

    if (finalBody.length < 500) {
      return generateDailyReport({ signals, date });
    }

    const { header, footer } = buildReportShell(date, signals);
    return `${header}

${finalBody}

${footer}`;
  } catch (err) {
    console.error("[Cosmo] Claude report generation error:", err);
    return generateDailyReport({ signals, date });
  }
}
