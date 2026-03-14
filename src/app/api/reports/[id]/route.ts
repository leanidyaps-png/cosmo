import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: { signals: { orderBy: { detectedAt: "desc" } } },
  });

  if (!report)
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json(report);
}
