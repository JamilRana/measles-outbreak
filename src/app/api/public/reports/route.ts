import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBdStartOfDay, getBdEndOfDay } from "@/lib/timezone";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facilityId");
    const dateQuery = searchParams.get("date"); // YYYY-MM-DD

    if (!facilityId || !dateQuery) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const requestedDate = new Date(dateQuery);
    const startOfDay = getBdStartOfDay(requestedDate);
    const endOfDay = getBdEndOfDay(requestedDate);

    const report = await prisma.report.findFirst({
      where: {
        facilityId: facilityId,
        periodStart: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        fieldValues: true
      }
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Public reports fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

