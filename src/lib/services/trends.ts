import { createClient } from "@/lib/supabase/server"
import { ApiError } from "@/lib/api/auth"

/**
 * Discover trending topics for a user based on their selected niches
 * Only shows topics that match the user's selected niches (regardless of source)
 */
export async function discoverTrends(userId: string, limit: number = 20) {
  const supabase = await createClient()

  // Get user's selected niches
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("selected_niches")
    .eq("user_id", userId)
    .single()

  const selectedNiches = prefs?.selected_niches || []

  // If user has no niches selected, return empty array
  if (selectedNiches.length === 0) {
    return []
  }

  // Build query to include:
  // 1. User-specific topics (user_id = userId)
  // 2. Global topics (user_id IS NULL)
  let query = supabase
    .from("trending_topics")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)

  // Filter by selected niches - only show topics that match user's niches
  query = query.in("niche_id", selectedNiches)

  // Filter out expired topics
  const now = new Date().toISOString()
  query = query.or(`expires_at.is.null,expires_at.gt.${now}`)

  // Order and limit
  query = query
    .order("trend_score", { ascending: false })
    .order("discovered_at", { ascending: false })
    .limit(limit)

  const { data, error } = await query

  if (error) {
    throw new ApiError("FETCH_ERROR", "Failed to fetch trends", 500, error)
  }

  return data || []
}

/**
 * Get a single trending topic by ID
 */
export async function getTrendById(topicId: string, userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("trending_topics")
    .select("*")
    .eq("id", topicId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError("NOT_FOUND", "Trending topic not found", 404)
    }
    throw new ApiError("FETCH_ERROR", "Failed to fetch trend", 500, error)
  }

  // Check if topic is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new ApiError("EXPIRED", "Trending topic has expired", 410)
  }

  return data
}
