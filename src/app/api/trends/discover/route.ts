import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseQuery } from "@/lib/api/validation"
import { discoverTrends } from "@/lib/services/trends"
import { z } from "zod"

const discoverSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const query = parseQuery(request, discoverSchema)
    const trends = await discoverTrends(auth.userId, query.limit)

    return NextResponse.json({ trends })
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)
