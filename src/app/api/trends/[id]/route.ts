import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseParams } from "@/lib/api/validation"
import { getTrendById } from "@/lib/services/trends"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string().uuid("Invalid topic ID"),
})

export const GET = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    const trend = await getTrendById(id, auth.userId)

    return NextResponse.json(trend)
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)
