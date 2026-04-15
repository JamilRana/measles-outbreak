import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/fields
 * 
 * Public endpoint to fetch form configuration for specific outbreaks.
 * Used by the reporting form and the dashboard KPI engine.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");
    const coreOnly = searchParams.get("coreOnly") === "true";

    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const fields = await prisma.formField.findMany({
      where: { 
        outbreakId,
        ...(coreOnly && { isCoreField: true }) 
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Fetch public fields error:", error);
    return NextResponse.json({ error: "Failed to fetch form fields" }, { status: 500 });
  }
}