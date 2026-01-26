import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { createClient } from "@/lib/supabase/server"

export const GET = createRouteHandler(
  async (request: NextRequest) => {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ user: null, session: null })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    return NextResponse.json({
      user,
      session,
    })
  },
  {
    requireAuth: false,
    methods: ["GET"],
  }
)
