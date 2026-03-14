export type Platform = "claude" | "chatgpt" | "gemini" | "notebooklm" | "perplexity";

export type UseCaseCategory =
  | "planning"
  | "research"
  | "writing"
  | "strategy"
  | "image_video"
  | "quick_mvp"
  | "finance"
  | "legal"
  | "bd_gtm";

export interface ModelEntry {
  id: string;
  platform: Platform;
  name: string;
  primaryUseCases: string[];
  contextWindow: string;
  speed: "fastest" | "fast" | "moderate" | "slow" | "slowest";
  costInput: number | null;
  costOutput: number | null;
  costLabel: string;
  strengths: string[];
  weaknesses: string[];
  benchmarks: Record<string, string>;
  knownBugs: string[];
  promptFormat: string;
}

export interface PlatformInfo {
  id: Platform;
  name: string;
  provider: string;
  identity: string;
  color: string;
  promptFormatName: string;
  promptFormatTemplate: string;
  promptingRules: string[];
  rankedStrengths: string[];
  knownWeaknesses: string[];
  hardExclusions: string[];
  models: ModelEntry[];
}

export interface UseCaseModelEntry {
  rank: number;
  modelName: string;
  provider: string;
  accessVia: string;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  costLabel: string;
  speed: "fastest" | "fast" | "moderate" | "slow" | "slowest";
  promptTip: string;
  keyBenchmark?: string;
}

export interface UseCaseCategoryInfo {
  id: UseCaseCategory;
  name: string;
  weight?: string;
  description: string;
  topModels: UseCaseModelEntry[];
  workflowTip: string;
}

export interface EvaluationSignal {
  category: "benchmark" | "model_release" | "pricing" | "bug" | "context_window" | "prompt_technique";
  title: string;
  description: string;
  source?: string;
  confidence?: number;
}
