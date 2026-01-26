// Deprecated: Use /api/auth/logout instead
// Keeping this for backwards compatibility but it redirects
import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { createClient } from "@/lib/supabase/server"

export const POST = createRouteHandler(
  async (request: NextRequest) => {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const url = new URL(request.url)
    return NextResponse.redirect(new URL("/login", url.origin))
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
