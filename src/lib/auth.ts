import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, LIMIT_PROFILES } from "@/lib/rate-limit";


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

        // Rate limiting: 5 attempts per 5 minutes per email/identifier
        const cleanEmail = credentials.email.trim().toLowerCase();
        const rl = await rateLimit(`auth:${cleanEmail}`, LIMIT_PROFILES.AUTH);
        if (!rl.success) {
          throw new Error("Too many login attempts. Please try again in 5 minutes.");
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
      const now = Date.now();
      const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours idle timeout

      if (token.lastActivity && (now - (token.lastActivity as number)) > IDLE_TIMEOUT_MS) {
        // Expire token on idle timeout
        return { ...token, id: "", isExpired: true };
      }
      token.lastActivity = now;

      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.facilityId = u.facilityId ?? null;
        token.isActive = u.isActive ?? true;
        token.division = u.division ?? null;
        token.district = u.district ?? null;
        token.managedDivisions = u.managedDivisions ?? [];
        token.managedDistricts = u.managedDistricts ?? [];
        token.facilityName = u.facilityName ?? null;
        token.facilityIsActive = u.facilityIsActive ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id || token.isExpired) {
        return null as any;
      }
      session.user.id = token.id as string;
      session.user.role = token.role as any;
      session.user.facilityId = token.facilityId as string;
      session.user.isActive = token.isActive as boolean;
      session.user.division = token.division as string;
      session.user.district = token.district as string;
      session.user.managedDivisions = token.managedDivisions as string[];
      session.user.managedDistricts = token.managedDistricts as string[];
      session.user.facilityName = token.facilityName as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days lifetime
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: false,
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
  const centralRoles = ['ADMIN', 'EDITOR', 'VIEWER'];
  const isCentralUser = centralRoles.includes(user.role);

  // Allow central role users to login without a facility
  if (!facility && !isCentralUser) {
    throw new Error("No facility associated with this account. Please contact administrator.");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? facility?.facilityName ?? 'System Admin',
    role: user.role,
    facilityId: facility?.id ?? null,
    facilityName: facility?.facilityName ?? null,
    facilityCode: facility?.facilityCode ?? null,
    facilityType: facility?.facilityType ?? undefined,
    division: facility?.division ?? null,
    district: facility?.district ?? null,
    managedDivisions: (user as any).managedDivisions,
    managedDistricts: (user as any).managedDistricts,
    upazila: facility?.upazila ?? undefined,
    isActive: user.isActive,
    facilityIsActive: facility?.isActive ?? null,
  };
}

async function loginHrmUser(email: string, password: string | null) {
  const hrmData = await verifyHrmUser(email, password);

  if (!hrmData) {
    throw new Error("HRM authentication failed");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: hrmData.email },
  });

  let facility;

  // 1. Try finding a facility with code `hrmData.facilityCode`
  const facilityByCode = await prisma.facility.findUnique({
    where: { facilityCode: hrmData.facilityCode },
  });

  if (facilityByCode) {
    // If a facility with this code already exists, update it with HRM details
    facility = await prisma.facility.update({
      where: { id: facilityByCode.id },
      data: {
        facilityName: hrmData.facilityName,
        facilityType: hrmData.facilityType,
        division: hrmData.division,
        district: hrmData.district,
        upazila: hrmData.upazila,
        phone: hrmData.phone,
        email: hrmData.email,
      },
    });
  } else if (existingUser && existingUser.facilityId) {
    // If facility with the code doesn't exist, but the user already has a linked facility,
    // we update that existing facility with HRM details (including the new code).
    facility = await prisma.facility.update({
      where: { id: existingUser.facilityId },
      data: {
        facilityCode: hrmData.facilityCode,
        facilityName: hrmData.facilityName,
        facilityType: hrmData.facilityType,
        division: hrmData.division,
        district: hrmData.district,
        upazila: hrmData.upazila,
        phone: hrmData.phone,
        email: hrmData.email,
      },
    });
  } else {
    // Neither exists, so create a new facility.
    facility = await prisma.facility.create({
      data: {
        facilityCode: hrmData.facilityCode,
        facilityName: hrmData.facilityName,
        facilityType: hrmData.facilityType,
        division: hrmData.division,
        district: hrmData.district,
        upazila: hrmData.upazila,
        phone: hrmData.phone,
        email: hrmData.email,
      },
    });
  }

  const user = await prisma.user.upsert({
    where: { email: hrmData.email },
    update: {
      name: hrmData.name,
      role: "USER",
      facilityId: facility.id,
    },
    create: {
      email: hrmData.email,
      name: hrmData.facilityName,
      nameNormalized: hrmData.facilityName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
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
    facilityIsActive: facility.isActive,
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