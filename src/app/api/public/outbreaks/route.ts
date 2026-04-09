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

    return NextResponse.json(outbreaks);
  } catch (error) {
    console.error("Fetch public outbreaks error:", error);
    return NextResponse.json({ error: "Failed to fetch outbreaks" }, { status: 500 });
  }
}
