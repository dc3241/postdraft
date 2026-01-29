import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ApiError } from "@/lib/api/auth"
import type { Database } from "@/types/database"
import { discoverTrends } from "./trends"
import { generatePost } from "./posts"

/**
 * Trigger auto-generation for a user
 * This would typically be called by a cron job, but we expose it as an API endpoint too
 */
export async function triggerAutoGeneration(userId: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ApiError(
      "PROVIDER_NOT_CONFIGURED",
      "Anthropic API key is not configured",
      503
    )
  }

  const supabase = await createClient()

  // Check user preferences for auto-generation settings
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("auto_generate_enabled, daily_post_count")
    .eq("user_id", userId)
    .single()

  if (!prefs?.auto_generate_enabled) {
    throw new ApiError(
      "NOT_ENABLED",
      "Auto-generation is not enabled for this user",
      400
    )
  }

  // Get user's subscription to check limits
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_tier")
    .eq("user_id", userId)
    .single()

  // Get trending topics
  const topics = await discoverTrends(userId, prefs.daily_post_count || 5)

  if (topics.length === 0) {
    throw new ApiError("NO_TOPICS", "No trending topics found", 400)
  }

  // Get user's preferred platform (default to multi)
  const postsGenerated = []
  const topicsUsed = []

  // Generate posts (limit based on subscription)
  const maxPosts = Math.min(prefs.daily_post_count || 5, topics.length)

  for (let i = 0; i < maxPosts; i++) {
    const topic = topics[i]
    try {
      const post = await generatePost(
        userId,
        topic.id,
        "multi",
        undefined // Use voice analysis for generation
      )
      postsGenerated.push(post)
      topicsUsed.push(topic.id)
    } catch (error) {
      // Log error but continue with other topics
      console.error(`Failed to generate post for topic ${topic.id}:`, error)
    }
  }

  // Log the auto-generation run
  const serviceClient = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client infers never for this table; payload matches Insert type
  const { data: log, error: logError } = await serviceClient
    .from("auto_generation_logs")
    .insert({
      user_id: userId,
      posts_generated: postsGenerated.length,
      topics_used: topicsUsed,
      notification_sent: false,
    } as any)
    .select()
    .single()

  if (logError) {
    console.error("Failed to log auto-generation:", logError)
  }

  return {
    success: true,
    postsGenerated: postsGenerated.length,
    topicsUsed: topicsUsed.length,
    log,
  }
}

/**
 * Get latest auto-generation log for a user
 */
export async function getLatestAutoGeneration(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("auto_generation_logs")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No logs yet
      return null
    }
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch auto-generation log",
      500,
      error
    )
  }

  return data
}
