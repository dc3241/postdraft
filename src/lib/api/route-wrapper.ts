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

/** Next.js App Router context: params is a Promise for dynamic routes */
type NextRouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Normalize Next.js params (may include string[]) to Record<string, string | undefined>
 */
function normalizeParams(
  resolved: Record<string, string | string[] | undefined> | undefined
): Record<string, string | undefined> | undefined {
  if (!resolved) return undefined
  const params: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(resolved)) {
    params[key] = Array.isArray(value) ? value[0] : value
  }
  return params
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
    context?: NextRouteContext
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

      // Resolve params (Next.js passes params as Promise for App Router)
      const resolvedParams = context?.params != null ? await context.params : undefined
      const params = normalizeParams(resolvedParams)

      // Call the handler
      return await handler(request, {
        auth,
        params,
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
