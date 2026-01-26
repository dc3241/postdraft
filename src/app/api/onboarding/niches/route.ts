import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { updateUserNiches } from "@/lib/services/onboarding"
import { z } from "zod"

const nichesSchema = z.object({
  nicheIds: z.array(z.string()).min(1, "At least one niche is required"),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required") // Shouldn't happen due to wrapper
    }

    const body = await parseJson(request, nichesSchema)
    const result = await updateUserNiches(auth.userId, body.nicheIds)

    return NextResponse.json(result)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
