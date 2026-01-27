import { NextRequest, NextResponse } from "next/server"
import { processAllUsersMorningScrape } from "@/lib/services/morning-scrape"

/**
 * API route for morning scraping cron job
 * Protected by CRON_SECRET environment variable
 * 
 * Usage:
 * - Set CRON_SECRET in your environment variables
 * - Call this endpoint with header: Authorization: Bearer <CRON_SECRET>
 * - Or use Vercel Cron which automatically adds the Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication via CRON_SECRET
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("CRON_SECRET is not configured")
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      )
    }

    // Check authorization
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      // Also check for Vercel Cron header (if using Vercel)
      const vercelCronHeader = request.headers.get("x-vercel-cron")
      if (vercelCronHeader !== "1") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
    }

    console.log("Starting morning scrape cron job", {
      timestamp: new Date().toISOString(),
    })

    // Process all users
    const result = await processAllUsersMorningScrape()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    console.error("Error in morning scrape cron job", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
