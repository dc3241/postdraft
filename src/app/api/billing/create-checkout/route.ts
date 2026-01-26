import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { createCheckoutSession } from "@/lib/services/billing"
import { z } from "zod"

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  planTier: z.enum(["pro", "team", "enterprise"]),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const body = await parseJson(request, checkoutSchema)
    const result = await createCheckoutSession(
      auth.userId,
      body.priceId,
      body.planTier
    )

    return NextResponse.json(result)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
