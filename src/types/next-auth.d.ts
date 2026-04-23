import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      facilityId: string | null;
      facilityName: string | null;
      facilityCode: string | null;
      facilityType: string | null;
      division: string | null;
      district: string | null;
      managedDivisions: string[];
      managedDistricts: string[];
      upazila: string | null;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    facilityId: string | null;
    facilityName: string | null;
    facilityCode: string | null;
    facilityType?: string | null;
    division: string | null;
    district: string | null;
    managedDivisions: string[];
    managedDistricts: string[];
    upazila?: string | null;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    facilityId: string | null;
    facilityName: string | null;
    facilityCode: string | null;
    facilityType: string | null;
    division: string | null;
    district: string | null;
    managedDivisions: string[];
    managedDistricts: string[];
    upazila: string | null;
    isActive: boolean;
  }
}
