import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'formfield:view')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    console.error("Fetch form fields error:", error);
    return NextResponse.json({ error: "Failed to fetch form fields" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'formfield:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { label, labelBn, fieldKey, fieldType, options, section, isRequired, sortOrder } = body;

    if (!label || !fieldKey) {
      return NextResponse.json({ error: "Label and Field Key are required" }, { status: 400 });
    }

    // Check if fieldKey already exists for this outbreak
    const existing = await prisma.formField.findUnique({
      where: { outbreakId_fieldKey: { outbreakId, fieldKey } }
    });

    if (existing) {
      return NextResponse.json({ error: "Field Key already exists for this outbreak" }, { status: 400 });
    }

    const field = await prisma.formField.create({
      data: {
        outbreakId,
        label,
        labelBn: labelBn || null,
        fieldKey,
        fieldType: fieldType || 'NUMBER',
        options: options ? JSON.stringify(options) : null,
        section: section || null,
        isRequired: !!isRequired,
        sortOrder: Number(sortOrder) || 0,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error("Create form field error:", error);
    return NextResponse.json({ error: "Failed to create form field" }, { status: 500 });
  }
}