import { NextRequest, NextResponse } from "next/server"
import { createRouteHandler } from "@/lib/api/route-wrapper"
import { parseJson } from "@/lib/api/validation"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().optional(),
})

export const POST = createRouteHandler(
  async (request: NextRequest) => {
    const body = await parseJson(request, signupSchema)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          full_name: body.fullName,
        },
      },
    })

    if (error) {
      return NextResponse.json(
        {
          error: {
            code: "SIGNUP_ERROR",
            message: error.message,
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        user: data.user,
        session: data.session,
      },
      { status: 201 }
    )
  },
  {
    requireAuth: false,
    methods: ["POST"],
  }
)
