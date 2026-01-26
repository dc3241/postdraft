import { NextRequest } from "next/server"
import { ApiError } from "./auth"

/**
 * Verify CSRF protection for state-changing HTTP methods.
 * Checks that the Origin header matches the expected app URL(s).
 */
export function verifyCsrf(request: NextRequest): void {
  const method = request.method
  // Only enforce CSRF on state-changing methods
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    return
  }

  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Allow same-origin requests (no origin header) from trusted referer
  if (!origin) {
    if (referer && new URL(referer).origin === new URL(appUrl).origin) {
      return
    }
    // In production, require origin header for API routes
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        "CSRF_ERROR",
        "Origin header required for state-changing requests",
        403
      )
    }
    return
  }

  // Verify origin matches app URL
  const originUrl = new URL(origin)
  const appOrigin = new URL(appUrl)

  if (originUrl.origin !== appOrigin.origin) {
    throw new ApiError(
      "CSRF_ERROR",
      "Request origin does not match application origin",
      403
    )
  }
}
