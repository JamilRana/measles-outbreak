import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.facilityName = user.facilityName;
        token.facilityCode = user.facilityCode;
        token.facilityType = user.facilityType;
        token.division = user.division;
        token.district = user.district;
        token.upazila = user.upazila;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.facilityName = token.facilityName;
        session.user.facilityCode = token.facilityCode;
        session.user.facilityType = token.facilityType;
        session.user.division = token.division;
        session.user.district = token.district;
        session.user.upazila = token.upazila;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
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

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new Error("Incorrect password");
  }

  if (!user.emailVerified) {
    throw new Error("Please verify your email first");
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
      role: "SUBMITTER",
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
      role: "SUBMITTER",
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
    const res = await fetch(`${process.env.HRM_API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("HRM verification error:", error);
    return null;
  }
}
