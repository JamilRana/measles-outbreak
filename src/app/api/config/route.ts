import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst();
    
    // Default values
    const response = {
      cutoffHour: settings?.cutoffHour ?? 14,
      cutoffMinute: settings?.cutoffMinute ?? 0,
      editDeadlineHour: settings?.editDeadlineHour ?? 10,
      editDeadlineMinute: settings?.editDeadlineMinute ?? 0,
      publishTimeHour: settings?.publishTimeHour ?? 9,
      publishTimeMinute: settings?.publishTimeMinute ?? 0,
      controlRoomContact: process.env.NEXT_PUBLIC_CONTROL_ROOM_CONTACT || "MIS, DGHS",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({
      cutoffHour: 14,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
      publishTimeHour: 9,
      publishTimeMinute: 0,
      controlRoomContact: "MIS, DGHS",
    });
  }
}