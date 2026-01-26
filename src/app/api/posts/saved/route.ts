import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseQuery } from "@/lib/api/validation"
import { getSavedPosts } from "@/lib/services/posts"
import { z } from "zod"

const savedSchema = z.object({
  status: z.enum(["generated", "edited", "posted", "archived"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error("Authentication required")
    }

    const query = parseQuery(request, savedSchema)
    const posts = await getSavedPosts(auth.userId, query.status, query.limit)

    return NextResponse.json({ posts })
  },
  {
    requireAuth: true,
    methods: ["GET"],
  }
)
