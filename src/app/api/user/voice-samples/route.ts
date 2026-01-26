import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { createBrandVoiceSample } from "@/lib/services/user-preferences"
import { z } from "zod"

const voiceSampleSchema = z.object({
  platform: z.enum(["twitter", "linkedin", "instagram", "facebook", "tiktok"]),
  sample_text: z.string().min(10).max(5000),
  performance_notes: z.string().max(200).optional(),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const body = await parseJson(request, voiceSampleSchema)
    const sample = await createBrandVoiceSample(auth.userId, body)

    return NextResponse.json(sample)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
