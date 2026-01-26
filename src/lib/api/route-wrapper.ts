import { NextRequest, NextResponse } from "next/server"
import { verifyCsrf } from "./csrf"
import { handleApiError } from "./error-handler"
import { requireUser } from "./auth"
import type { AuthContext } from "./auth"

/**
 * Options for route wrapper
 */
interface RouteOptions {
  requireAuth?: boolean
  requireCsrf?: boolean
  methods?: string[]
}

/**
 * Wrapper for API route handlers that provides:
 * - Error handling
 * - Authentication (optional)
 * - CSRF protection (optional)
 * - Method validation
 */
export function createRouteHandler<T = void>(
  handler: (
    request: NextRequest,
    context: { auth?: AuthContext; params?: Record<string, string | undefined> }
  ) => Promise<NextResponse>,
  options: RouteOptions = {}
) {
  const {
    requireAuth = false,
    requireCsrf = true,
    methods = ["GET", "POST", "PUT", "PATCH", "DELETE"],
  } = options

  return async (
    request: NextRequest,
    context?: { params?: Record<string, string | undefined> }
  ): Promise<NextResponse> => {
    try {
      // Validate HTTP method
      if (!methods.includes(request.method)) {
        return NextResponse.json(
          {
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${request.method} not allowed`,
            },
          },
          { status: 405 }
        )
      }

      // Verify CSRF for state-changing methods
      if (requireCsrf) {
        verifyCsrf(request)
      }

      // Require authentication if needed
      let auth: AuthContext | undefined
      if (requireAuth) {
        auth = await requireUser()
      }

      // Call the handler
      return await handler(request, {
        auth,
        params: context?.params,
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
