import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

export interface AuthContext {
  user: User
  userId: string
}

/**
 * Require authentication for a route handler.
 * Returns the authenticated user or throws an error response.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401)
  }

  return {
    user,
    userId: user.id,
  }
}

/**
 * Custom API error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details != null ? { details: this.details } : {}),
        },
      },
      { status: this.statusCode }
    )
  }
}
