# Cosmo — Dynamic Model Picker

AI Model Routing & Prompt Optimization System by Klein Ventures.

Cosmo runs an automated deep-search evaluation every 24 hours to verify whether the LLM currently assigned to each client's optimized prompt is still the best model for that task. The output is a refreshed markdown report delivered via email, containing current model recommendations, prompt-format adjustments, and a changelog of any routing changes.

## Features

- **5-Platform Model Registry**: Claude, ChatGPT, Gemini, NotebookLM, Perplexity with 18+ models
- **Deterministic Routing Engine**: 4-step routing (hard exclusions → primary task routing → secondary modifiers → workflow detection)
- **7-Dimension Weighted Scoring**: Task-fit (35%), Benchmark (20%), Precision (15%), Cost (10%), Speed (10%), Bug Risk (5%), Context (5%)
- **Triple-Layer Deep Search Agent**:
  - Layer 1: Tavily for broad web crawl, long-tail update variations, newsletter content
  - Layer 2: Perplexity Sonar for real-time cited research and official announcements
  - Layer 3: OpenAI for signal synthesis, cross-reference validation, and confidence scoring
- **Newsletter Monitoring**: Tracks The Batch, TLDR AI, Ben's Bites, Import AI, The Rundown AI
- **Platform-Specific Prompt Reformatter**: Auto-reformats prompts when models switch (XML tags, CTCO, Gemini format, etc.)
- **Automated Email Reports**: Beautifully formatted HTML emails via Resend every 24 hours
- **Dashboard UI**: Full management interface for clients, prompts, evaluations, model registry, and settings

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Initialize database
npx prisma migrate dev

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite connection string (default: `file:./dev.db`) |
| `RESEND_API_KEY` | Yes | Resend API key for email delivery |
| `TAVILY_API_KEY` | Yes | Tavily API key for broad web search (Layer 1) |
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key for cited research (Layer 2) |
| `OPENAI_API_KEY` | Recommended | OpenAI API key for signal synthesis (Layer 3) |
| `FROM_EMAIL` | No | Sender email address (default: cosmo@kleinventures.com) |
| `CRON_SECRET` | No | Secret for authenticating the `/api/cron` endpoint |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   DAILY TRIGGER                      │
│              (Every 24 hours per client)              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         TRIPLE-LAYER DEEP SEARCH                     │
│  L1: Tavily → broad crawl, newsletters, forums      │
│  L2: Perplexity → cited benchmarks, announcements    │
│  L3: OpenAI → synthesis, cross-reference, scoring    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│            SCORING & EVALUATION                      │
│  1. Load client prompt + current model               │
│  2. Score all eligible models (7 dimensions)         │
│  3. Compare vs current (15% threshold)               │
│  4. If switch: reformat prompt for new platform      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│             REPORT & DELIVERY                        │
│  1. Generate markdown report                         │
│  2. Convert to styled HTML email                     │
│  3. Send via Resend to client inbox                  │
└─────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/clients` | List / create clients |
| GET/PUT/DELETE | `/api/clients/[id]` | Client CRUD |
| GET/POST | `/api/prompts` | List / create prompts (auto-routes on create) |
| GET/PUT/DELETE | `/api/prompts/[id]` | Prompt CRUD |
| POST | `/api/evaluate` | Trigger evaluation (`{ promptId }` or `{ all: true }`) |
| GET | `/api/evaluations` | List all evaluation cycles |
| GET | `/api/evaluations/[id]` | Evaluation detail with scores, signals, report |
| GET | `/api/reports/[id]` | Get full report |
| GET | `/api/models` | Model registry data |
| GET | `/api/settings` | System configuration status |
| GET/POST | `/api/cron` | Cron trigger endpoint (auth with `CRON_SECRET`) |

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite
- Resend (email)
- Tavily (web search)
- Perplexity Sonar API (cited research)
- OpenAI API (analysis)
- node-cron (scheduling)
