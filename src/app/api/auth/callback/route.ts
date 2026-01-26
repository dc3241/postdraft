import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { createClient } from "@/lib/supabase/server"
import { parseQuery } from "@/lib/api/validation"
import { z } from "zod"

const callbackSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const GET = createRouteHandler(
  async (request: NextRequest) => {
    const supabase = await createClient()
    const query = parseQuery(request, callbackSchema)

    // Handle OAuth errors
    if (query.error) {
      const url = new URL(request.url)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(query.error_description || query.error)}`, url.origin)
      )
    }

    // Exchange code for session
    if (query.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(query.code)
      
      if (error) {
        const url = new URL(request.url)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
        )
      }
    }

    // Redirect to dashboard on success
    const url = new URL(request.url)
    return NextResponse.redirect(new URL("/dashboard", url.origin))
  },
  {
    requireAuth: false,
    requireCsrf: false, // OAuth callback doesn't need CSRF
    methods: ["GET"],
  }
)

