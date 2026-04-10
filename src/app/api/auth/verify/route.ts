import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=MissingToken", req.url));
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token, type: "EMAIL_VERIFICATION" },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.redirect(new URL("/login?error=InvalidToken", req.url));
    }

    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { isActive: true },
    });

    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.redirect(new URL("/login?success=EmailVerified", req.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/login?error=ServerError", req.url));
  }
}
