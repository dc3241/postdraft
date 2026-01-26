import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseParams, parseJson } from "@/lib/api/validation"
import { getPostById, updatePost, deletePost } from "@/lib/services/posts"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string().uuid("Invalid post ID"),
})

const updateSchema = z.object({
  content: z.string().optional(),
  status: z.enum(["generated", "edited", "posted", "archived"]).optional(),
  was_used: z.boolean().optional(),
  engagement_data: z.record(z.unknown()).optional(),
})

export const GET = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const { id } = parseParams(params || {}, paramsSchema)
    const post = await getPostById(id, auth.userId)

    return NextResponse.json(post)
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
    const post = await updatePost(id, auth.userId, body)

    return NextResponse.json(post)
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
    await deletePost(id, auth.userId)

    return NextResponse.json({ success: true })
  },
  {
    requireAuth: true,
    methods: ["DELETE"],
  }
)
