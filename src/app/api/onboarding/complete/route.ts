import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { completeOnboarding } from "@/lib/services/user-preferences"

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const result = await completeOnboarding(auth.userId)

    return NextResponse.json(result)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
