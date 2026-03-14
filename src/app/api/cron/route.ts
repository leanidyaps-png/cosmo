import { NextRequest, NextResponse } from "next/server";
import { runDailyEvaluation } from "@/lib/engine/evaluator";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyEvaluation();
  return NextResponse.json({
    message: "Daily intelligence report complete",
    ...result,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
