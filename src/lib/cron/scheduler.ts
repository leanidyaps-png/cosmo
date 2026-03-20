import cron, { type ScheduledTask } from "node-cron";
import { runDailyEvaluation } from "@/lib/engine/evaluator";
import type { SearchMode } from "@/lib/engine/deep-search";

let scheduledTask: ScheduledTask | null = null;

export function startScheduler(
  cronExpression: string = "0 5 * * *",
  mode: SearchMode = "deep"
) {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      console.log(
        `[Cosmo] Starting ${mode} intelligence report at ${new Date().toISOString()}`
      );

      try {
        const result = await runDailyEvaluation(mode);
        if (result.success) {
          console.log(
            `[Cosmo] Report complete — ${result.signalCount} signals detected, report ID: ${result.reportId}`
          );
        } else {
          console.error(`[Cosmo] Report failed: ${result.error}`);
        }
      } catch (err) {
        console.error("[Cosmo] Report failed:", err);
      }
    },
    { timezone: "America/Los_Angeles" }
  );

  console.log(
    `[Cosmo] Scheduler started: "${cronExpression}" in ${mode} mode`
  );
  return scheduledTask;
}

export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[Cosmo] Scheduler stopped");
  }
}

export function getNextRunTime(
  cronExpression: string = "0 5 * * *"
): Date {
  const now = new Date();
  const [minute, hour] = cronExpression.split(" ");
  const pstOffset = 8;
  const next = new Date(now);
  next.setUTCHours((parseInt(hour) || 5) + pstOffset, parseInt(minute) || 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
