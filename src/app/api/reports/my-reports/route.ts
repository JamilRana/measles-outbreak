import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await prisma.dailyReport.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { reportingDate: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching user reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}