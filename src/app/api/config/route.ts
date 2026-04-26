import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    const settings = await prisma.settings.findFirst();
    let targetId = outbreakId || settings?.defaultOutbreakId;
    
    let config = {
      cutoffHour: 10,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
      publishTimeHour: 14,
      publishTimeMinute: 0,
      controlRoomContact: process.env.NEXT_PUBLIC_CONTROL_ROOM_CONTACT || "MIS, DGHS",
      outbreakBacklog: null as any,
    };

    if (!targetId) {
      const activeOutbreak = await prisma.outbreak.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
      });
      if (activeOutbreak) {
        targetId = activeOutbreak.id;
      }
    }

    if (targetId) {
      const outbreak = await prisma.outbreak.findUnique({
        where: { id: targetId },
        select: { 
          cutoffHour: true, 
          cutoffMinute: true, 
          editDeadlineHour: true, 
          editDeadlineMinute: true, 
          publishTimeHour: true, 
          publishTimeMinute: true,
          allowBacklogReporting: true,
          backlogStartDate: true,
          backlogEndDate: true
        }
      });

      if (outbreak) {
        config = {
          ...config,
          cutoffHour: outbreak.cutoffHour,
          cutoffMinute: outbreak.cutoffMinute,
          editDeadlineHour: outbreak.editDeadlineHour,
          editDeadlineMinute: outbreak.editDeadlineMinute,
          publishTimeHour: outbreak.publishTimeHour,
          publishTimeMinute: outbreak.publishTimeMinute,
          outbreakBacklog: {
            allowBacklogReporting: outbreak.allowBacklogReporting,
            backlogStartDate: outbreak.backlogStartDate ? outbreak.backlogStartDate.toISOString().split('T')[0] : null,
            backlogEndDate: outbreak.backlogEndDate ? outbreak.backlogEndDate.toISOString().split('T')[0] : null,
          }
        };
      }
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("[ConfigAPI] Error:", error);
    return NextResponse.json({
      cutoffHour: 10,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
      publishTimeHour: 14,
      publishTimeMinute: 0,
      controlRoomContact: "MIS, DGHS",
    });
  }
}