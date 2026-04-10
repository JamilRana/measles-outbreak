import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'formfield:view')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const field = await prisma.formField.findUnique({
      where: { id },
    });

    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error("Fetch form field error:", error);
    return NextResponse.json({ error: "Failed to fetch form field" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'formfield:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, labelBn, fieldKey, fieldType, options, section, isRequired, sortOrder } = body;

    const existing = await prisma.formField.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    // Check for duplicate fieldKey if changing
    if (fieldKey && fieldKey !== existing.fieldKey) {
      const duplicate = await prisma.formField.findUnique({
        where: { outbreakId_fieldKey: { outbreakId: existing.outbreakId, fieldKey } }
      });
      if (duplicate) {
        return NextResponse.json({ error: "Field Key already exists" }, { status: 400 });
      }
    }

    const field = await prisma.formField.update({
      where: { id },
      data: {
        label: label ?? existing.label,
        labelBn: labelBn !== undefined ? labelBn : existing.labelBn,
        fieldKey: fieldKey ?? existing.fieldKey,
        fieldType: fieldType ?? existing.fieldType,
        options: options ? JSON.stringify(options) : existing.options,
        section: section ?? existing.section,
        isRequired: isRequired !== undefined ? isRequired : existing.isRequired,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      },
    });

    return NextResponse.json(field);
  } catch (error) {
    console.error("Update form field error:", error);
    return NextResponse.json({ error: "Failed to update form field" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'formfield:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.formField.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    // Delete associated field values first
    await prisma.reportFieldValue.deleteMany({
      where: { formFieldId: id },
    });

    await prisma.formField.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete form field error:", error);
    return NextResponse.json({ error: "Failed to delete form field" }, { status: 500 });
  }
}