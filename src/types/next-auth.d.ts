import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      facilityName: string;
      facilityId: string;
      facilityCode?: string;
      facilityType?: string;
      division?: string;
      district?: string;
      upazila?: string;
      managedDivisions?: string[];
      managedDistricts?: string[];
      isActive?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    facilityName: string;
    facilityId: string;
    facilityCode?: string;
    facilityType?: string;
    division?: string;
    district?: string;
    upazila?: string;
    managedDivisions?: string[];
    managedDistricts?: string[];
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    facilityName: string;
    facilityId: string;
    facilityCode?: string;
    facilityType?: string;
    division?: string;
    district?: string;
    upazila?: string;
    managedDivisions?: string[];
    managedDistricts?: string[];
    isActive?: boolean;
  }
}
