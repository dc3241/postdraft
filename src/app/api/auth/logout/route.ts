import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { createClient } from "@/lib/supabase/server"

export const POST = createRouteHandler(
  async (request: NextRequest) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        {
          error: {
            code: "LOGOUT_ERROR",
            message: error.message,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  },
  {
    requireAuth: true,
    methods: ["POST"],
  }
)
