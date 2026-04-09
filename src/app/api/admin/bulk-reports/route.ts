import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const outbreakId = formData.get("outbreakId") as string;
    
    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID is required" }, { status: 400 });
    }
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    const requiredHeaders = ["email", "reportingdate", "division", "district", "suspected24h", "confirmed24h", "suspecteddeath24h", "confirmeddeath24h", "admitted24h", "discharged24h"];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `Missing required headers: ${missingHeaders.join(", ")}` }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map(v => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });

        const user = await prisma.user.findUnique({
          where: { email: row.email },
          include: { facility: true },
        });

        if (!user || !user.facilityId) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: User or facility not found for email ${row.email}`);
          continue;
        }

        const reportingDate = new Date(row.reportingdate);
        const startOfDay = new Date(reportingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reportingDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existing = await prisma.dailyReport.findFirst({
          where: {
            facilityId: user.facilityId,
            outbreakId: outbreakId as any,
            reportingDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (existing) {
          await prisma.dailyReport.update({
            where: { id: existing.id },
            data: {
              suspected24h: parseInt(row.suspected24h) || 0,
              confirmed24h: parseInt(row.confirmed24h) || 0,
              suspectedDeath24h: parseInt(row.suspecteddeath24h) || 0,
              confirmedDeath24h: parseInt(row.confirmeddeath24h) || 0,
              admitted24h: parseInt(row.admitted24h) || 0,
              discharged24h: parseInt(row.discharged24h) || 0,
            },
          });
        } else {
          await prisma.dailyReport.create({
            data: {
              facilityId: user.facilityId,
              userId: user.id,
              reportingDate: new Date(row.reportingdate),
              suspected24h: parseInt(row.suspected24h) || 0,
              confirmed24h: parseInt(row.confirmed24h) || 0,
              suspectedDeath24h: parseInt(row.suspecteddeath24h) || 0,
              confirmedDeath24h: parseInt(row.confirmeddeath24h) || 0,
              admitted24h: parseInt(row.admitted24h) || 0,
              discharged24h: parseInt(row.discharged24h) || 0,
              serumSent24h: 0,
              outbreakId: outbreakId as any,
            } as any,
          });
        }
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${results.success + results.failed} records`,
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error("CSV upload error:", error);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }
}