import { NextResponse } from "next/server";
import { getCachedDashboardConfig } from "@/lib/dashboard-cache";

/**
 * GET /api/public/config
 * 
 * Public endpoint to fetch dashboard configuration for a specific outbreak.
 * Returns outbreak metadata, KPI fields (core fields), indicators, and settings.
 * Uses cached data for high performance.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");

    if (!outbreakId) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const config = await getCachedDashboardConfig(outbreakId);
    
    if (!config.outbreak) {
      return NextResponse.json({ error: "Outbreak not found" }, { status: 404 });
    }

    // Dynamic Publication Status Logic
    const { getBdTime } = require("@/lib/timezone");
    const now = getBdTime();
    const outbreak = config.outbreak;
    
    const publishTime = new Date(now);
    publishTime.setHours(outbreak.publishTimeHour || 0, outbreak.publishTimeMinute || 0, 0, 0);
    
    const publicationStatus = now < publishTime ? "PENDING" : "VERIFIED";

    return NextResponse.json({
      ...config,
      publicationStatus
    });
  } catch (error) {
    console.error("Fetch public config error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard configuration" }, { status: 500 });
  }
}
