import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseParams, parseJson } from "@/lib/api/validation"
import {
  getCustomSourceById,
  updateCustomSource,
  deleteCustomSource,
} from "@/lib/services/custom-sources"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string().uuid("Invalid source ID"),
})

const updateSchema = z.object({
  sourceUrl: z.string().url("Invalid source URL").optional(),
  sourceName: z.string().min(1).optional(),
  sourceType: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const GET = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    const source = await getCustomSourceById(id, auth.userId)

    return NextResponse.json(source)
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)

export const PATCH = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    const body = await parseJson(request, updateSchema)

    // Map camelCase to snake_case for database
    const updates: {
      source_url?: string
      source_name?: string
      source_type?: string
      is_active?: boolean
    } = {}

    if (body.sourceUrl) updates.source_url = body.sourceUrl
    if (body.sourceName) updates.source_name = body.sourceName
    if (body.sourceType) updates.source_type = body.sourceType
    if (body.isActive !== undefined) updates.is_active = body.isActive

    const source = await updateCustomSource(id, auth.userId, updates)

    return NextResponse.json(source)
  },
  {
    requireAuth: true,
    methods: ["PATCH"],
  }
)

export const DELETE = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    await deleteCustomSource(id, auth.userId)

    return NextResponse.json({ success: true })
  },
  {
    requireAuth: true,
    methods: ["DELETE"],
  }
)
