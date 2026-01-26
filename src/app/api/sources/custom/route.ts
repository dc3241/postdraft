import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import {
  getUserCustomSources,
  createCustomSource,
} from "@/lib/services/custom-sources"
import { z } from "zod"

const createSchema = z.object({
  sourceUrl: z.string().url("Invalid source URL"),
  sourceName: z.string().min(1, "Source name is required"),
  sourceType: z.string().optional(),
})

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const sources = await getUserCustomSources(auth.userId)
    return NextResponse.json({ sources })
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const body = await parseJson(request, createSchema)
    const source = await createCustomSource(
      auth.userId,
      body.sourceUrl,
      body.sourceName,
      body.sourceType
    )

    return NextResponse.json(source, { status: 201 })
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
