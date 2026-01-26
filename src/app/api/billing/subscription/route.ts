import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { getUserSubscription } from "@/lib/services/billing"

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const subscription = await getUserSubscription(auth.userId)
    return NextResponse.json({ subscription })
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)
