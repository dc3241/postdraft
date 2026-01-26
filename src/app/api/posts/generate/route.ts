import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { generatePost } from "@/lib/services/posts"
import { z } from "zod"

const generateSchema = z.object({
  topicId: z.string().uuid("Invalid topic ID").optional().nullable(),
  platform: z.enum(["twitter", "linkedin", "facebook", "multi"]),
  customPrompt: z.string().optional(),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const body = await parseJson(request, generateSchema)
    const post = await generatePost(
      auth.userId,
      body.topicId || null,
      body.platform,
      body.customPrompt
    )

    return NextResponse.json(post, { status: 201 })
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
