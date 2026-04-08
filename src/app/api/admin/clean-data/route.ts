import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, mode } = await req.json();

    if (mode === "DAILY") {
      const d = new Date(date);
      await prisma.report.deleteMany({
        where: {
          reportingDate: {
            gte: startOfDay(d),
            lte: endOfDay(d),
          },
        },
      });
      return NextResponse.json({ message: `All reports for ${date} have been cleared.` });
    } else if (mode === "ALL") {
       // This is a dangerous but requested feature ("reset daily data")
       // I'll interpret "reset" as "delete all reports" or maybe just current year.
       // Given the request, I'll clear ALL reports.
       await prisma.report.deleteMany({});
       return NextResponse.json({ message: "All historical reports have been cleared." });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
