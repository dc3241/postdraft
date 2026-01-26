import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { analyzeVoice } from "@/lib/services/onboarding"

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const result = await analyzeVoice(auth.userId)
    return NextResponse.json(result)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
