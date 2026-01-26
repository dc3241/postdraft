import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseParams } from "@/lib/api/validation"
import { triggerScrape } from "@/lib/services/custom-sources"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string().uuid("Invalid source ID"),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    const result = await triggerScrape(id, auth.userId)

    return NextResponse.json(result)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
