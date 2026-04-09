import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: outbreakId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: outbreakId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'formfield:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { label, labelBn, fieldKey, fieldType, options, section, isRequired, sortOrder } = body;

    if (!label || !fieldKey || !fieldType) {
      return NextResponse.json({ error: "Label, Key, and Type are required" }, { status: 400 });
    }

    const field = await prisma.formField.create({
      data: {
        outbreakId,
        label,
        labelBn,
        fieldKey,
        fieldType,
        options: options ? JSON.stringify(options) : null,
        section,
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
