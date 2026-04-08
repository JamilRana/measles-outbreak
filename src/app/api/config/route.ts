import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    cutoffHour: parseInt(process.env.REPORT_CUTOFF_HOUR || "14", 10),
    cutoffMinute: parseInt(process.env.REPORT_CUTOFF_MINUTE || "0", 10),
    controlRoomContact: process.env.NEXT_PUBLIC_CONTROL_ROOM_CONTACT || "MIS, DGHS",
  });
}
