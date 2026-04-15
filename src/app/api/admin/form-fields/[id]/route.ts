import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "formfield:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const field = await prisma.formField.findUnique({ where: { id } });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(field);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "formfield:manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.formField.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { label, labelBn, fieldKey, fieldType, options, section, isRequired, isCoreField, sortOrder, activeFrom, activeTo, validationRules } = body;

  if (fieldKey && fieldKey !== existing.fieldKey) {
    const dup = await prisma.formField.findUnique({ where: { outbreakId_fieldKey: { outbreakId: existing.outbreakId, fieldKey } } });
    if (dup) return NextResponse.json({ error: "Field key already exists" }, { status: 400 });
  }

  const field = await prisma.formField.update({
    where: { id },
    data: {
      ...(label      !== undefined && { label }),
      ...(labelBn    !== undefined && { labelBn: labelBn || null }),
      ...(fieldKey   !== undefined && { fieldKey }),
      ...(fieldType  !== undefined && { fieldType }),
      ...(options    !== undefined && { options: options || null }),
      ...(section    !== undefined && { section }),
      ...(isRequired !== undefined && { isRequired: !!isRequired }),
      ...(isCoreField !== undefined && { isCoreField: !!isCoreField }),
      ...(sortOrder  !== undefined && { sortOrder: Number(sortOrder) }),
      ...(activeFrom !== undefined && { activeFrom: activeFrom ? new Date(activeFrom) : null }),
      ...(activeTo   !== undefined && { activeTo:   activeTo   ? new Date(activeTo)   : null }),
      ...(validationRules !== undefined && { validationRules: Array.isArray(validationRules) ? validationRules : [] }),
    },
  });
  return NextResponse.json(field);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "formfield:manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!await prisma.formField.findUnique({ where: { id } })) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.reportFieldValue.deleteMany({ where: { formFieldId: id } });
  await prisma.formField.delete({ where: { id } });
  return NextResponse.json({ success: true });
}