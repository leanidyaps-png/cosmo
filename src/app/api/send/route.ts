import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendDailyReportEmail } from "@/lib/email/send-report";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reportId } = body;

  if (!reportId) {
    return NextResponse.json(
      { error: "reportId is required" },
      { status: 400 }
    );
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
  });

  if (!report || !report.markdownContent) {
    return NextResponse.json(
      { error: "Report not found or empty" },
      { status: 404 }
    );
  }

  const recipients = await prisma.emailRecipient.findMany({
    where: { isActive: true },
  });

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No active recipients configured" },
      { status: 400 }
    );
  }

  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const recipient of recipients) {
    const result = await sendDailyReportEmail(
      recipient.email,
      report.markdownContent
    );
    results.push({
      email: recipient.email,
      success: result.success,
      error: result.error,
    });
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  await prisma.dailyReport.update({
    where: { id: reportId },
    data: {
      deliveryStatus: failed === 0 ? "sent" : sent > 0 ? "partial" : "failed",
      emailSentAt: sent > 0 ? new Date() : null,
    },
  });

  return NextResponse.json({
    sent,
    failed,
    total: recipients.length,
    results,
  });
}
