import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const fields = await prisma.formField.findMany({
      where: { outbreakId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Fetch public fields error:", error);
    return NextResponse.json({ error: "Failed to fetch form fields" }, { status: 500 });
  }
}