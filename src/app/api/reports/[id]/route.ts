import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    // Filter out fields that shouldn't be updated via this route
    const { userId, reportingDate, facilityName, ...updateData } = data;

    const report = await prisma.report.update({
      where: { id },
      data: {
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

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
