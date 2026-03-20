export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/cron/scheduler");
    // Runs every day at 7:00 AM Pacific Time (handles PST/PDT automatically)
    startScheduler("0 5 * * *", "deep");
  }
}
