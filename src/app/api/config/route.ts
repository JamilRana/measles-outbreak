import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AppConfig {
  submissionOpenHour: number;
  submissionOpenMinute: number;
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  publishTimeHour: number;
  publishTimeMinute: number;
  hasDashboard: boolean;
  controlRoomContact: string;
  outbreakBacklog: any;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    const settings = await prisma.settings.findFirst();
    let targetId = outbreakId || settings?.defaultOutbreakId;
    
    let config: AppConfig = {
      submissionOpenHour: 0,
      submissionOpenMinute: 0,
      cutoffHour: 10,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
      publishTimeHour: 14,
      publishTimeMinute: 0,
      hasDashboard: true,
      controlRoomContact: process.env.NEXT_PUBLIC_CONTROL_ROOM_CONTACT || "MIS, DGHS",
      outbreakBacklog: null,
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
      const outbreak = await (prisma.outbreak.findUnique({
        where: { id: targetId },
        select: { 
          submissionOpenHour: true,
          submissionOpenMinute: true,
          cutoffHour: true, 
          cutoffMinute: true, 
          editDeadlineHour: true, 
          editDeadlineMinute: true, 
          publishTimeHour: true, 
          publishTimeMinute: true,
          hasDashboard: true,
          allowBacklogReporting: true,
          backlogStartDate: true,
          backlogEndDate: true
        } as any
      }) as any);

      if (outbreak) {
        config = {
          ...config,
          submissionOpenHour: outbreak.submissionOpenHour,
          submissionOpenMinute: outbreak.submissionOpenMinute,
          cutoffHour: outbreak.cutoffHour,
          cutoffMinute: outbreak.cutoffMinute,
          editDeadlineHour: outbreak.editDeadlineHour,
          editDeadlineMinute: outbreak.editDeadlineMinute,
          publishTimeHour: outbreak.publishTimeHour,
          publishTimeMinute: outbreak.publishTimeMinute,
          hasDashboard: outbreak.hasDashboard,
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