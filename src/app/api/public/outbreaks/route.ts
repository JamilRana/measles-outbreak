import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const outbreaks = await prisma.outbreak.findMany({
      where: { 
        isActive: true,
        status: 'ACTIVE'
      },
      include: {
        disease: {
          select: { name: true, code: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const result = outbreaks.map(o => ({
      ...o,
      backlogStartDate: o.backlogStartDate ? o.backlogStartDate.toISOString().split('T')[0] : null,
      backlogEndDate: o.backlogEndDate ? o.backlogEndDate.toISOString().split('T')[0] : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch public outbreaks error:", error);
    return NextResponse.json({ error: "Failed to fetch outbreaks" }, { status: 500 });
  }
}
