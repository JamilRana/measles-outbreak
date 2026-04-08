import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recipients = await prisma.emailRecipient.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(recipients);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, designation, organization } = await req.json();
    const recipient = await prisma.emailRecipient.create({
      data: { email, designation, organization },
    });
    return NextResponse.json(recipient, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create recipient" }, { status: 500 });
  }
}
