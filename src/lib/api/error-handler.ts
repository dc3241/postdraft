import { NextResponse } from "next/server"
import { ApiError } from "./auth"

/**
 * Global error handler for API routes.
 * Catches errors and returns consistent JSON error responses.
 */
export function handleApiError(error: unknown): NextResponse {
  // Handle our custom ApiError
  if (error instanceof ApiError) {
    return error.toResponse()
  }

  // Handle validation errors
  if (error instanceof Error) {
    // Log unexpected errors in development
    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", error)
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: process.env.NODE_ENV === "production"
            ? "An internal error occurred"
            : error.message,
        },
      },
      { status: 500 }
    )
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  )
}

/**
 * Wrapper for async route handlers with error handling
 */
export function withErrorHandling(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch(handleApiError)
}
