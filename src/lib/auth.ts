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
      facilityName: string;
      facilityCode: string;
      facilityType: string;
      division: string;
      district: string;
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
        token.facilityName = user.facilityName;
        token.facilityCode = user.facilityCode;
        token.facilityType = user.facilityType;
        token.division = user.division;
        token.district = user.district;
        token.upazila = user.upazila;
        token.isActive = user.isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.facilityName = token.facilityName as string;
        session.user.facilityCode = token.facilityCode as string;
        session.user.facilityType = token.facilityType as string;
        session.user.division = token.division as string;
        session.user.district = token.district as string;
        session.user.upazila = token.upazila as string;
        session.user.isActive = token.isActive as boolean;
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

  return {
    id: user.id,
    email: user.email,
    name: user.facilityName,
    role: user.role,
    facilityName: user.facilityName,
    facilityCode: user.facilityCode ?? undefined,
    facilityType: user.facilityType ?? undefined,
    division: user.division ?? undefined,
    district: user.district ?? undefined,
    upazila: user.upazila ?? undefined,
    isActive: user.isActive,
  };
}

async function loginHrmUser(email: string, password: string | null) {
  const hrmData = await verifyHrmUser(email, password);

  if (!hrmData) {
    throw new Error("HRM authentication failed");
  }

  const user = await prisma.user.upsert({
    where: { email: hrmData.email },
    update: {
      facilityName: hrmData.facilityName,
      facilityCode: hrmData.facilityCode,
      facilityType: hrmData.facilityType,
      division: hrmData.division,
      district: hrmData.district,
      upazila: hrmData.upazila,
      role: "USER",
    },
    create: {
      email: hrmData.email,
      facilityName: hrmData.facilityName,
      nameNormalized: hrmData.facilityName.toLowerCase().replace(/\s+/g, "_"),
      facilityCode: hrmData.facilityCode,
      facilityType: hrmData.facilityType,
      division: hrmData.division,
      district: hrmData.district,
      upazila: hrmData.upazila,
      role: "USER",
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.facilityName,
    role: user.role,
    facilityName: user.facilityName,
    facilityCode: user.facilityCode ?? undefined,
    facilityType: user.facilityType ?? undefined,
    division: user.division ?? undefined,
    district: user.district ?? undefined,
    upazila: user.upazila ?? undefined,
  };
}

async function verifyHrmUser(email: string, password: string | null) {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/hrm/`, {
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
