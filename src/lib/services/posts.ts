import { createClient } from "@/lib/supabase/server"
import { ApiError } from "@/lib/api/auth"
import { generateWithClaude } from "@/lib/ai/claude"
import { getUserContextForGeneration } from "./user-preferences"

/**
 * Generate a post from a trending topic
 */
export async function generatePost(
  userId: string,
  topicId: string | null,
  platform: string,
  customPrompt?: string
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ApiError(
      "PROVIDER_NOT_CONFIGURED",
      "Anthropic API key is not configured",
      503
    )
  }

  const supabase = await createClient()

  // Fetch topic if provided
  let topic = null
  if (topicId) {
    const { data, error } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("id", topicId)
      .single()

    if (error && error.code !== "PGRST116") {
      throw new ApiError("FETCH_ERROR", "Failed to fetch topic", 500, error)
    }
    topic = data
  }

  // Fetch user's preferences and voice samples for AI context
  let userContext
  try {
    userContext = await getUserContextForGeneration(userId, platform)
  } catch (error) {
    // If preferences don't exist, continue with defaults
    console.warn("Could not fetch user preferences:", error)
    userContext = {
      industry: null,
      content_topics: [],
      voice_samples: [],
      brand_guidelines_do: [],
      brand_guidelines_dont: [],
      avoid_topics: [],
    }
  }

  // Fetch user's voice analysis (legacy support)
  const { data: voiceAnalysis } = await supabase
    .from("voice_analysis")
    .select("*")
    .eq("user_id", userId)
    .single()

  // Build comprehensive system prompt with user context
  let systemPromptParts: string[] = []

  if (userContext.industry) {
    systemPromptParts.push(`You are writing for a ${userContext.industry} brand.`)
  }

  if (userContext.content_topics.length > 0) {
    systemPromptParts.push(
      `Focus on topics like: ${userContext.content_topics.join(", ")}.`
    )
  }

  if (userContext.voice_samples.length > 0) {
    systemPromptParts.push(
      `Match the voice and style of these examples:\n${userContext.voice_samples
        .map((sample, i) => `${i + 1}. ${sample}`)
        .join("\n")}`
    )
  } else if (voiceAnalysis?.prompt_template) {
    systemPromptParts.push(voiceAnalysis.prompt_template)
  } else if (voiceAnalysis?.style_notes) {
    systemPromptParts.push(`Generate content in this style: ${voiceAnalysis.style_notes}`)
  } else {
    systemPromptParts.push("Generate engaging social media content that matches the user's voice.")
  }

  if (userContext.brand_guidelines_do.length > 0) {
    systemPromptParts.push(
      `Always: ${userContext.brand_guidelines_do.join("; ")}.`
    )
  }

  if (userContext.brand_guidelines_dont.length > 0) {
    systemPromptParts.push(
      `Never: ${userContext.brand_guidelines_dont.join("; ")}.`
    )
  }

  if (userContext.avoid_topics.length > 0) {
    systemPromptParts.push(
      `Avoid mentioning: ${userContext.avoid_topics.join(", ")}.`
    )
  }

  systemPromptParts.push(
    `CRITICAL: Output PLAIN TEXT ONLY. Never use markdown formatting like **bold**, *italic*, or numbered lists with markdown (e.g. **1. Item**). Social media platforms do not support markdown—it looks AI-generated and unprofessional.

FORBIDDEN: **bold**, *italic*, **1. Item**, or any other markdown syntax.

ALLOWED: Line breaks for structure; dashes for lists (- item); numbers without markdown (1. item); ALL CAPS for emphasis (sparingly); emojis only if the user's brand voice uses them; natural punctuation and spacing. Write like a human posting on social media.`
  )

  const systemPrompt = systemPromptParts.join("\n\n")

  let userPrompt = customPrompt || ""
  if (topic) {
    userPrompt = `Generate a ${platform} post about this trending topic:\n\nTitle: ${topic.title}\nDescription: ${topic.description || ""}\n\n${customPrompt ? `Additional context: ${customPrompt}` : ""}`
  } else if (customPrompt) {
    userPrompt = customPrompt
  } else {
    throw new ApiError(
      "INVALID_REQUEST",
      "Either topicId or customPrompt is required",
      400
    )
  }

  try {
    const content = await generateWithClaude(userPrompt, systemPrompt, 500)

    // Save generated post
    const { data: post, error: insertError } = await supabase
      .from("generated_posts")
      .insert({
        user_id: userId,
        topic_id: topicId,
        platform: platform as any,
        content,
        generation_type: "manual",
      })
      .select()
      .single()

    if (insertError) {
      throw new ApiError(
        "INSERT_ERROR",
        "Failed to save generated post",
        500,
        insertError
      )
    }

    return post
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      "GENERATION_ERROR",
      "Failed to generate post",
      500,
      error
    )
  }
}

/**
 * Get user's saved posts
 */
export async function getSavedPosts(
  userId: string,
  status?: string,
  limit: number = 50
) {
  const supabase = await createClient()

  let query = supabase
    .from("generated_posts")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    throw new ApiError("FETCH_ERROR", "Failed to fetch posts", 500, error)
  }

  return data || []
}

/**
 * Get a single post by ID (with ownership check)
 */
export async function getPostById(postId: string, userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("generated_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError("NOT_FOUND", "Post not found", 404)
    }
    throw new ApiError("FETCH_ERROR", "Failed to fetch post", 500, error)
  }

  return data
}

/**
 * Update a post
 */
export async function updatePost(
  postId: string,
  userId: string,
  updates: {
    content?: string
    status?: string
    was_used?: boolean
    engagement_data?: unknown
  }
) {
  const supabase = await createClient()

  // Verify ownership first
  await getPostById(postId, userId)

  const { data, error } = await supabase
    .from("generated_posts")
    .update(updates)
    .eq("id", postId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new ApiError("UPDATE_ERROR", "Failed to update post", 500, error)
  }

  return data
}

/**
 * Delete a post
 */
export async function deletePost(postId: string, userId: string) {
  const supabase = await createClient()

  // Verify ownership first
  await getPostById(postId, userId)

  const { error } = await supabase
    .from("generated_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId)

  if (error) {
    throw new ApiError("DELETE_ERROR", "Failed to delete post", 500, error)
  }

  return { success: true }
}
