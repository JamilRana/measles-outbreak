import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      facilityId: string;
      facilityName: string;
      facilityCode: string;
      facilityType: string;
      division: string;
      district: string;
      managedDivisions: string[];
      managedDistricts: string[];
      upazila: string;
      isActive: boolean;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.loginType) {
          throw new Error("Invalid credentials");
        }

        if (credentials.loginType === "hrm") {
          return await loginHrmUser(credentials.email, credentials.password);
        }

        return await loginLocalUser(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.facilityId = (user as any).facilityId;
        token.isActive = (user as any).isActive;
        token.division = (user as any).division;
        token.district = (user as any).district;
        token.managedDivisions = (user as any).managedDivisions;
        token.managedDistricts = (user as any).managedDistricts;
        token.facilityName = (user as any).facilityName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.facilityId = token.facilityId as string;
        session.user.isActive = token.isActive as boolean;
        session.user.division = token.division as string;
        session.user.district = token.district as string;
        session.user.managedDivisions = token.managedDivisions as string[];
        session.user.managedDistricts = token.managedDistricts as string[];
        session.user.facilityName = token.facilityName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

async function loginLocalUser(email: string, password: string) {
  if (!password) {
    throw new Error("Password is required for local login");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { facility: true },
  });

  if (!user || !user.password) {
    throw new Error("User not found");
  }

  if (!user.isActive) {
    throw new Error("Your account has been deactivated. Please contact administrator.");
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new Error("Incorrect password");
  }

  const facility = user.facility;
  if (!facility) {
    throw new Error("No facility associated with this account. Please contact administrator.");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? facility.facilityName,
    role: user.role,
    facilityId: facility.id,
    facilityName: facility.facilityName,
    facilityCode: facility.facilityCode,
    facilityType: facility.facilityType ?? undefined,
    division: facility.division,
    district: facility.district,
    managedDivisions: (user as any).managedDivisions,
    managedDistricts: (user as any).managedDistricts,
    upazila: facility.upazila ?? undefined,
    isActive: facility.isActive,
  };
}

async function loginHrmUser(email: string, password: string | null) {
  const hrmData = await verifyHrmUser(email, password);

  if (!hrmData) {
    throw new Error("HRM authentication failed");
  }

  let facility = await prisma.facility.findUnique({
    where: { facilityCode: hrmData.facilityCode },
  });

  if (!facility) {
    facility = await prisma.facility.create({
      data: {
        facilityCode: hrmData.facilityCode,
        facilityName: hrmData.facilityName,
        facilityType: hrmData.facilityType,
        division: hrmData.division,
        district: hrmData.district,
        upazila: hrmData.upazila,
      },
    });
  }

  const user = await prisma.user.upsert({
    where: { email: hrmData.email },
    update: {
      name: hrmData.name,
      role: "USER",
    },
    create: {
      email: hrmData.email,
      name: hrmData.name,
      nameNormalized: hrmData.email.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      facilityId: facility.id,
      role: "USER",
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? facility.facilityName,
    role: user.role,
    facilityId: facility.id,
    facilityName: facility.facilityName,
    facilityCode: facility.facilityCode,
    facilityType: facility.facilityType ?? undefined,
    division: facility.division,
    district: facility.district,
    managedDivisions: (user as any).managedDivisions,
    managedDistricts: (user as any).managedDistricts,
    upazila: facility.upazila ?? undefined,
    isActive: facility.isActive,
  };
}

async function verifyHrmUser(email: string, password: string | null) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/auth/hrm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password: password ?? "" }),
    });

    if (!res.ok) throw new Error("HRM auth failed");
    return await res.json();
  } catch (error) {
    console.error("HRM verification error:", error);
    return null;
  }
}