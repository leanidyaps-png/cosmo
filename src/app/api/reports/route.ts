import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const reports = await prisma.dailyReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      _count: { select: { signals: true } },
    },
  });

  return NextResponse.json(reports);
}
