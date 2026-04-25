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

    return NextResponse.json(config);
  } catch (error) {
    console.error("Fetch public config error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard configuration" }, { status: 500 });
  }
}
