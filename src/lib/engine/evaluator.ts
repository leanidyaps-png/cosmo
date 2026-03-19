import { prisma } from "@/lib/db";
import { EvaluationSignal } from "@/lib/models/types";
import { runDeepSearch, SearchMode } from "./deep-search";
import { generateComprehensiveReport, generateDailyReport } from "./report-generator";
import { sendDailyReportEmail } from "@/lib/email/send-report";

export async function runDailyEvaluation(
  mode: SearchMode = "deep"
): Promise<{
  success: boolean;
  reportId?: string;
  signalCount?: number;
  mode?: SearchMode;
  error?: string;
}> {
  const report = await prisma.dailyReport.create({
    data: {
      markdownContent: "",
      status: "searching",
    },
  });

  try {
    let signals: EvaluationSignal[];
    try {
      signals = await runDeepSearch(mode);
    } catch (err) {
      console.error("Deep search failed, continuing with empty signals:", err);
      signals = [];
    }

    await prisma.dailyReport.update({
      where: { id: report.id },
      data: { status: "analyzing" },
    });

    for (const signal of signals) {
      await prisma.signal.create({
        data: {
          reportId: report.id,
          category: signal.category,
          title: signal.title,
          description: signal.description,
          source: signal.source,
          confidence: signal.confidence ?? 0.5,
        },
      });
    }

    await prisma.dailyReport.update({
      where: { id: report.id },
      data: { status: "generating" },
    });

    let markdownContent: string;
    if (mode === "quick") {
      markdownContent = generateDailyReport({ signals, date: new Date() });
    } else {
      markdownContent = await generateComprehensiveReport(signals);
    }

    await prisma.dailyReport.update({
      where: { id: report.id },
      data: {
        markdownContent,
        signalCount: signals.length,
        status: "complete",
        completedAt: new Date(),
      },
    });

    const recipients = await prisma.emailRecipient.findMany({
      where: { isActive: true },
    });

    if (recipients.length > 0) {
      let sentCount = 0;
      for (const recipient of recipients) {
        const emailResult = await sendDailyReportEmail(
          recipient.email,
          markdownContent,
          recipient.name
        );
        if (emailResult.success) sentCount++;
      }

      await prisma.dailyReport.update({
        where: { id: report.id },
        data: {
          deliveryStatus:
            sentCount === recipients.length
              ? "sent"
              : sentCount > 0
                ? "partial"
                : "failed",
          emailSentAt: sentCount > 0 ? new Date() : null,
        },
      });
    }

    return {
      success: true,
      reportId: report.id,
      signalCount: signals.length,
      mode,
    };
  } catch (err) {
    console.error("Evaluation failed:", err);

    await prisma.dailyReport.update({
      where: { id: report.id },
      data: { status: "failed" },
    });

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
