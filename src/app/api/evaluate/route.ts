import { NextRequest, NextResponse } from "next/server";
import { runDailyEvaluation } from "@/lib/engine/evaluator";
import { SearchMode } from "@/lib/engine/deep-search";

export async function POST(req: NextRequest) {
  let mode: SearchMode = "deep";

  try {
    const body = await req.json();
    if (body.mode === "quick" || body.mode === "deep") {
      mode = body.mode;
    }
  } catch {
    // no body is fine, default to deep
  }

  const result = await runDailyEvaluation(mode);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    message: `${mode === "quick" ? "Quick" : "In-depth"} intelligence report generated`,
    reportId: result.reportId,
    signalCount: result.signalCount,
    mode: result.mode,
    timestamp: new Date().toISOString(),
  });
}
