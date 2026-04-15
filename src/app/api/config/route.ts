import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    const settings = await prisma.settings.findFirst();
    let targetId = outbreakId || settings?.defaultOutbreakId;
    
    console.log(`[ConfigAPI] Resolved targetId: ${targetId} (from param: ${outbreakId}, from settings: ${settings?.defaultOutbreakId})`);

    let config = {
      cutoffHour: 14,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
      publishTimeHour: 9,
      publishTimeMinute: 0,
      controlRoomContact: process.env.NEXT_PUBLIC_CONTROL_ROOM_CONTACT || "MIS, DGHS",
      outbreakBacklog: null as any,
    };

    // If still no targetId, fallback to the first active outbreak found
    if (!targetId) {
      const activeOutbreak = await prisma.outbreak.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true }
      });
      if (activeOutbreak) {
        targetId = activeOutbreak.id;
        console.log(`[ConfigAPI] Falling back to active outbreak: ${targetId}`);
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
        console.log(`[ConfigAPI] Found outbreak configuration: ${JSON.stringify(outbreak)}`);
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
      } else {
        console.warn(`[ConfigAPI] Outbreak with ID ${targetId} not found in database.`);
      }
    } else {
      console.warn(`[ConfigAPI] No target outbreak ID could be resolved.`);
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("[ConfigAPI] Error:", error);
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