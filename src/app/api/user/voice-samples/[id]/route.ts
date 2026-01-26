import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseParams } from "@/lib/api/validation"
import { deleteBrandVoiceSample } from "@/lib/services/user-preferences"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string().uuid("Invalid sample ID"),
})

export const DELETE = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    const result = await deleteBrandVoiceSample(id, auth.userId)

    return NextResponse.json(result)
  },
  {
    requireAuth: true,
    methods: ["DELETE"],
  }
)
