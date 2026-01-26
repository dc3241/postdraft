import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { getLatestAutoGeneration } from "@/lib/services/auto-generate"

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const log = await getLatestAutoGeneration(auth.userId)
    return NextResponse.json({ log })
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)
