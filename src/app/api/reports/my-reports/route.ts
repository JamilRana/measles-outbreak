import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.facilityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await prisma.report.findMany({
      where: {
        facilityId: session.user.facilityId,
      },
      orderBy: { periodStart: "desc" },
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
            division: true,
            district: true,
          }
        },
        fieldValues: {
          include: { formField: true }
        }
      }
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching facility reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}