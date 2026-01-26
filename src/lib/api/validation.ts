import { z, ZodError, ZodSchema } from "zod"
import { NextRequest } from "next/server"
import { ApiError } from "./auth"

/**
 * Parse and validate JSON request body with Zod schema
 */
export async function parseJson<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Invalid request data",
        400,
        error.errors
      )
    }
    if (error instanceof SyntaxError) {
      throw new ApiError("INVALID_JSON", "Request body must be valid JSON", 400)
    }
    throw error
  }
}

/**
 * Parse and validate query parameters with Zod schema
 */
export function parseQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  try {
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())
    return schema.parse(params)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        error.errors
      )
    }
    throw error
  }
}

/**
 * Parse and validate route parameters with Zod schema
 */
export function parseParams<T>(
  params: Record<string, string | undefined>,
  schema: ZodSchema<T>
): T {
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Invalid route parameters",
        400,
        error.errors
      )
    }
    throw error
  }
}

/**
 * Bad request helper for consistent error responses
 */
export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError("BAD_REQUEST", message, 400, details)
}
