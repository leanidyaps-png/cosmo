export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/cron/scheduler");
    // Runs every day at 5:00 AM PST (America/Los_Angeles timezone in scheduler)
    startScheduler("0 5 * * *", "deep");
  }
}
