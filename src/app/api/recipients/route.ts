import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const recipients = await prisma.emailRecipient.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recipients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.emailRecipient.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This email is already added" },
      { status: 409 }
    );
  }

  const recipient = await prisma.emailRecipient.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
    },
  });

  return NextResponse.json(recipient, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.emailRecipient.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await prisma.emailRecipient.update({
    where: { id },
    data: { isActive: !!isActive },
  });

  return NextResponse.json(updated);
}
