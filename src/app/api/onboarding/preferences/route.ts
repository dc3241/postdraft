import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { upsertUserPreferences } from "@/lib/services/user-preferences"
import { z } from "zod"

const preferencesSchema = z.object({
  industry: z.string().min(1).max(100),
  content_topics: z.array(z.string().min(1).max(50)).min(1).max(10),
  platform_priorities: z.record(z.string(), z.number()).refine(
    (obj) => Object.keys(obj).length > 0,
    "At least one platform priority is required"
  ),
  brand_guidelines_do: z.array(z.string().max(200)).max(10).optional(),
  brand_guidelines_dont: z.array(z.string().max(200)).max(10).optional(),
  avoid_topics: z.array(z.string().max(100)).max(10).optional(),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const body = await parseJson(request, preferencesSchema)
    const preferences = await upsertUserPreferences(auth.userId, body)

    return NextResponse.json(preferences)
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
