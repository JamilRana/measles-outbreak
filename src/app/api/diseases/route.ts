import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const diseases = await prisma.disease.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(diseases);
  } catch (error) {
    console.error("Fetch diseases error:", error);
    return NextResponse.json({ error: "Failed to fetch diseases" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, code, description } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: "Name and Code are required" }, { status: 400 });
    }

    const disease = await prisma.disease.create({
      data: {
        name,
        code: code.toUpperCase(),
        description,
        isActive: true,
      },
    });

    return NextResponse.json(disease, { status: 201 });
  } catch (error) {
    console.error("Create disease error:", error);
    return NextResponse.json({ error: "Failed to create disease" }, { status: 500 });
  }
}
