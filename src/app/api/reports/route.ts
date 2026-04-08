import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const reportingDate = new Date(data.reportingDate);
    
    // Check if report already exists for this facility on this date
    const existing = await prisma.report.findFirst({
      where: {
        userId: session.user.id,
        reportingDate: {
          gte: startOfDay(reportingDate),
          lte: endOfDay(reportingDate),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already submitted a report for this date." }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reportingDate,
        division: session.user.division ?? "",
        district: session.user.district ?? "",
        userId: session.user.id,
        facilityName: session.user.facilityName,
        suspected24h: Number(data.suspected24h) || 0,
        suspectedYTD: Number(data.suspectedYTD) || 0,
        confirmed24h: Number(data.confirmed24h) || 0,
        confirmedYTD: Number(data.confirmedYTD) || 0,
        suspectedDeath24h: Number(data.suspectedDeath24h) || 0,
        suspectedDeathYTD: Number(data.suspectedDeathYTD) || 0,
        confirmedDeath24h: Number(data.confirmedDeath24h) || 0,
        confirmedDeathYTD: Number(data.confirmedDeathYTD) || 0,
        admitted24h: Number(data.admitted24h) || 0,
        admittedYTD: Number(data.admittedYTD) || 0,
        discharged24h: Number(data.discharged24h) || 0,
        dischargedYTD: Number(data.dischargedYTD) || 0,
        serumSentYTD: Number(data.serumSentYTD) || 0,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Report submission error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Allow public access for the dashboard

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const divisions = searchParams.get("divisions")?.split(",").filter(Boolean);
  const districts = searchParams.get("districts")?.split(",").filter(Boolean);

  try {
    const where: any = {};
    
    if (date) {
      const d = new Date(date);
      where.reportingDate = {
        gte: startOfDay(d),
        lte: endOfDay(d),
      };
    } else if (startDate && endDate) {
      where.reportingDate = {
        gte: startOfDay(new Date(startDate)),
        lte: endOfDay(new Date(endDate)),
      };
    }

    if (divisions && divisions.length > 0) {
      where.division = { in: divisions };
    }
    if (districts && districts.length > 0) {
      where.district = { in: districts };
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { reportingDate: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
