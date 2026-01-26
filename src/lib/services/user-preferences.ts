import { createClient } from "@/lib/supabase/server"
import { ApiError } from "@/lib/api/auth"

export type Platform = "twitter" | "linkedin" | "instagram" | "facebook" | "tiktok"

export interface UserPreferences {
  id: string
  user_id: string
  industry: string | null
  content_topics: string[]
  platform_priorities: Record<string, number>
  brand_guidelines_do: string[]
  brand_guidelines_dont: string[]
  avoid_topics: string[]
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface BrandVoiceSample {
  id: string
  user_id: string
  platform: Platform
  sample_text: string
  performance_notes: string | null
  created_at: string
  updated_at: string
}

export interface CreatePreferencesInput {
  industry: string
  content_topics: string[]
  platform_priorities: Record<string, number>
  brand_guidelines_do?: string[]
  brand_guidelines_dont?: string[]
  avoid_topics?: string[]
}

export interface CreateVoiceSampleInput {
  platform: Platform
  sample_text: string
  performance_notes?: string
}

/**
 * Get user preferences and brand voice samples
 */
export async function getUserPreferences(userId: string): Promise<{
  preferences: UserPreferences | null
  voice_samples: BrandVoiceSample[]
}> {
  const supabase = await createClient()

  // Fetch preferences
  const { data: preferences, error: prefsError } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (prefsError && prefsError.code !== "PGRST116") {
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch user preferences",
      500,
      prefsError
    )
  }

  // Fetch voice samples
  const { data: voice_samples, error: samplesError } = await supabase
    .from("brand_voice_samples")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (samplesError) {
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch brand voice samples",
      500,
      samplesError
    )
  }

  return {
    preferences: preferences || null,
    voice_samples: voice_samples || [],
  }
}

/**
 * Create or update user preferences
 */
export async function upsertUserPreferences(
  userId: string,
  input: CreatePreferencesInput
): Promise<UserPreferences> {
  const supabase = await createClient()

  // Validate input
  if (!input.industry || input.industry.length > 100) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Industry is required and must be 100 characters or less",
      400
    )
  }

  if (!input.content_topics || input.content_topics.length === 0 || input.content_topics.length > 10) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Content topics must have 1-10 items",
      400
    )
  }

  if (input.content_topics.some(topic => topic.length > 50)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Each content topic must be 50 characters or less",
      400
    )
  }

  if (!input.platform_priorities || Object.keys(input.platform_priorities).length === 0) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "At least one platform priority is required",
      400
    )
  }

  if (input.brand_guidelines_do && input.brand_guidelines_do.length > 10) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Brand guidelines (do) must have 10 items or less",
      400
    )
  }

  if (input.brand_guidelines_dont && input.brand_guidelines_dont.length > 10) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Brand guidelines (don't) must have 10 items or less",
      400
    )
  }

  if (input.avoid_topics && input.avoid_topics.length > 10) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Avoid topics must have 10 items or less",
      400
    )
  }

  // Upsert preferences
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        industry: input.industry,
        content_topics: input.content_topics,
        platform_priorities: input.platform_priorities,
        brand_guidelines_do: input.brand_guidelines_do || [],
        brand_guidelines_dont: input.brand_guidelines_dont || [],
        avoid_topics: input.avoid_topics || [],
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single()

  if (error) {
    throw new ApiError(
      "UPSERT_ERROR",
      "Failed to save user preferences",
      500,
      error
    )
  }

  return data
}

/**
 * Create brand voice samples (multiple at once)
 */
export async function createBrandVoiceSamples(
  userId: string,
  samples: CreateVoiceSampleInput[]
): Promise<BrandVoiceSample[]> {
  const supabase = await createClient()

  // Validate samples
  if (!samples || samples.length === 0) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "At least one voice sample is required",
      400
    )
  }

  // Group by platform and check limits
  const platformCounts: Record<string, number> = {}
  for (const sample of samples) {
    const platform = sample.platform
    platformCounts[platform] = (platformCounts[platform] || 0) + 1

    // Validate sample text
    if (!sample.sample_text || sample.sample_text.length < 10 || sample.sample_text.length > 5000) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Sample text for ${platform} must be between 10 and 5000 characters`,
        400
      )
    }

    if (sample.performance_notes && sample.performance_notes.length > 200) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Performance notes for ${platform} must be 200 characters or less`,
        400
      )
    }
  }

  // Check existing samples per platform
  const { data: existingSamples } = await supabase
    .from("brand_voice_samples")
    .select("platform")
    .eq("user_id", userId)

  const existingCounts: Record<string, number> = {}
  existingSamples?.forEach(sample => {
    existingCounts[sample.platform] = (existingCounts[sample.platform] || 0) + 1
  })

  // Check if adding these would exceed limit
  for (const platform of Object.keys(platformCounts)) {
    const existing = existingCounts[platform] || 0
    const newCount = platformCounts[platform]
    if (existing + newCount > 10) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Cannot exceed 10 samples per platform. You have ${existing} existing samples for ${platform} and are trying to add ${newCount} more.`,
        400
      )
    }
  }

  // Insert samples
  const { data, error } = await supabase
    .from("brand_voice_samples")
    .insert(
      samples.map(sample => ({
        user_id: userId,
        platform: sample.platform,
        sample_text: sample.sample_text,
        performance_notes: sample.performance_notes || null,
      }))
    )
    .select()

  if (error) {
    throw new ApiError(
      "INSERT_ERROR",
      "Failed to create brand voice samples",
      500,
      error
    )
  }

  return data
}

/**
 * Create a single brand voice sample
 */
export async function createBrandVoiceSample(
  userId: string,
  input: CreateVoiceSampleInput
): Promise<BrandVoiceSample> {
  const samples = await createBrandVoiceSamples(userId, [input])
  return samples[0]
}

/**
 * Delete a brand voice sample
 */
export async function deleteBrandVoiceSample(
  sampleId: string,
  userId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // Verify ownership
  const { data: sample, error: fetchError } = await supabase
    .from("brand_voice_samples")
    .select("user_id")
    .eq("id", sampleId)
    .single()

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ApiError("NOT_FOUND", "Voice sample not found", 404)
    }
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch voice sample",
      500,
      fetchError
    )
  }

  if (sample.user_id !== userId) {
    throw new ApiError("FORBIDDEN", "You don't own this voice sample", 403)
  }

  // Delete
  const { error } = await supabase
    .from("brand_voice_samples")
    .delete()
    .eq("id", sampleId)
    .eq("user_id", userId)

  if (error) {
    throw new ApiError(
      "DELETE_ERROR",
      "Failed to delete voice sample",
      500,
      error
    )
  }

  return { success: true }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(userId: string): Promise<{
  success: boolean
  redirect: string
}> {
  const supabase = await createClient()

  // Update user_profiles
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: 4,
    })
    .eq("user_id", userId)

  if (profileError) {
    throw new ApiError(
      "UPDATE_ERROR",
      "Failed to update user profile",
      500,
      profileError
    )
  }

  // Update user_preferences
  const { error: prefsError } = await supabase
    .from("user_preferences")
    .update({ onboarding_completed: true })
    .eq("user_id", userId)

  if (prefsError && prefsError.code !== "PGRST116") {
    // It's okay if preferences don't exist yet
    throw new ApiError(
      "UPDATE_ERROR",
      "Failed to update user preferences",
      500,
      prefsError
    )
  }

  return { success: true, redirect: "/dashboard" }
}

/**
 * Get user preferences for AI generation context
 */
export async function getUserContextForGeneration(
  userId: string,
  platform: string
): Promise<{
  industry: string | null
  content_topics: string[]
  voice_samples: string[]
  brand_guidelines_do: string[]
  brand_guidelines_dont: string[]
  avoid_topics: string[]
}> {
  const { preferences, voice_samples } = await getUserPreferences(userId)

  // Filter voice samples for the specific platform
  const platformSamples = voice_samples
    .filter(sample => sample.platform === platform)
    .map(sample => sample.sample_text)

  return {
    industry: preferences?.industry || null,
    content_topics: preferences?.content_topics || [],
    voice_samples: platformSamples,
    brand_guidelines_do: preferences?.brand_guidelines_do || [],
    brand_guidelines_dont: preferences?.brand_guidelines_dont || [],
    avoid_topics: preferences?.avoid_topics || [],
  }
}
