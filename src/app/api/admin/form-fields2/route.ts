import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, "formfield:view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");
    const coreOnly = searchParams.get("coreOnly") === "true";

    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const where: any = { outbreakId };
    if (coreOnly) where.isCoreField = true;

    const fields = await prisma.formField.findMany({
      where,
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
    if (!session || !hasPermission(session.user.role, "formfield:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      label, labelBn, fieldKey, fieldType, options,
      section, isRequired, isCoreField, sortOrder,
      activeFrom, activeTo,
    } = body;

    if (!label || !fieldKey) {
      return NextResponse.json({ error: "Label and Field Key are required" }, { status: 400 });
    }

    // Check duplicate fieldKey
    const existing = await prisma.formField.findUnique({
      where: { outbreakId_fieldKey: { outbreakId, fieldKey } },
    });
    if (existing) {
      return NextResponse.json({ error: "Field key already exists for this outbreak" }, { status: 400 });
    }

    const field = await prisma.formField.create({
      data: {
        outbreakId,
        label,
        labelBn: labelBn || null,
        fieldKey,
        fieldType: fieldType || "NUMBER",
        options: options || null,
        section: section || "other",
        isRequired: !!isRequired,
        isCoreField: !!isCoreField,
        sortOrder: Number(sortOrder) || 0,
        activeFrom: activeFrom ? new Date(activeFrom) : null,
        activeTo: activeTo ? new Date(activeTo) : null,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error("Create form field error:", error);
    return NextResponse.json({ error: "Failed to create form field" }, { status: 500 });
  }
}
