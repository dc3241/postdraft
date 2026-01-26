import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const POST = createRouteHandler(
  async (request: NextRequest) => {
    const body = await parseJson(request, loginSchema)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error) {
      return NextResponse.json(
        {
          error: {
            code: "LOGIN_ERROR",
            message: error.message,
          },
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  },
  {
    requireAuth: false,
    methods: ["POST"],
  }
)
