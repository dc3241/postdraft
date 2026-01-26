import { createClient } from "@/lib/supabase/server"
import { ApiError } from "@/lib/api/auth"
import { generateWithClaude } from "@/lib/ai/claude"

/**
 * Update user's selected niches
 */
export async function updateUserNiches(userId: string, nicheIds: string[]) {
  const supabase = await createClient()

  // First, ensure user_preferences exists (upsert pattern)
  const { data: existingPrefs } = await supabase
    .from("user_preferences")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (!existingPrefs) {
    // Create preferences if they don't exist
    const { error: insertError } = await supabase
      .from("user_preferences")
      .insert({
        user_id: userId,
        selected_niches: nicheIds,
      })

    if (insertError) {
      throw new ApiError(
        "UPDATE_ERROR",
        "Failed to create user preferences",
        500,
        insertError
      )
    }
  } else {
    // Update existing preferences
    const { error: updateError } = await supabase
      .from("user_preferences")
      .update({ selected_niches: nicheIds })
      .eq("user_id", userId)

    if (updateError) {
      throw new ApiError(
        "UPDATE_ERROR",
        "Failed to update user niches",
        500,
        updateError
      )
    }
  }

  return { success: true }
}

/**
 * Add voice samples for a user
 */
export async function addVoiceSample(
  userId: string,
  content: string,
  platform?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("voice_samples")
    .insert({
      user_id: userId,
      content,
      platform: platform as any,
    })
    .select()
    .single()

  if (error) {
    throw new ApiError(
      "INSERT_ERROR",
      "Failed to add voice sample",
      500,
      error
    )
  }

  return data
}

/**
 * Analyze user's voice samples using Claude
 */
export async function analyzeVoice(userId: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ApiError(
      "PROVIDER_NOT_CONFIGURED",
      "Anthropic API key is not configured",
      503
    )
  }

  const supabase = await createClient()

  // Fetch all voice samples for the user
  const { data: samples, error: fetchError } = await supabase
    .from("voice_samples")
    .select("content, platform")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })

  if (fetchError) {
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch voice samples",
      500,
      fetchError
    )
  }

  if (!samples || samples.length === 0) {
    throw new ApiError(
      "NO_SAMPLES",
      "No voice samples found for analysis",
      400
    )
  }

  // Prepare content for analysis
  const samplesText = samples
    .map((s, i) => `Sample ${i + 1} (${s.platform || "unknown"}):\n${s.content}`)
    .join("\n\n---\n\n")

  const systemPrompt = `You are analyzing a user's writing voice and style from their social media content samples.
Extract:
1. Tone (e.g., professional, casual, educational, provocative, inspirational)
2. Style notes (writing patterns, structure, voice characteristics)
3. Typical length (average word count)
4. Common phrases (recurring expressions or patterns)
5. A prompt template that can be used to generate content in this user's voice

Respond in JSON format with: tone, style_notes, typical_length, common_phrases (array), prompt_template`

  try {
    const analysisText = await generateWithClaude(
      `Analyze these voice samples:\n\n${samplesText}`,
      systemPrompt,
      2000
    )

    // Parse the JSON response
    let analysis
    try {
      analysis = JSON.parse(analysisText)
    } catch {
      // If not valid JSON, extract from text
      analysis = {
        tone: analysisText.match(/tone["\s:]+([^,}]+)/i)?.[1]?.trim() || "learned",
        style_notes: analysisText.substring(0, 500),
        typical_length: parseInt(analysisText.match(/typical_length["\s:]+(\d+)/i)?.[1] || "280"),
        common_phrases: [],
        prompt_template: analysisText,
      }
    }

    // Upsert voice analysis
    const { data: voiceAnalysis, error: insertError } = await supabase
      .from("voice_analysis")
      .upsert(
        {
          user_id: userId,
          tone: analysis.tone,
          style_notes: analysis.style_notes,
          typical_length: analysis.typical_length,
          common_phrases: analysis.common_phrases || [],
          prompt_template: analysis.prompt_template || analysisText,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single()

    if (insertError) {
      throw new ApiError(
        "INSERT_ERROR",
        "Failed to save voice analysis",
        500,
        insertError
      )
    }

    return voiceAnalysis
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      "ANALYSIS_ERROR",
      "Failed to analyze voice samples",
      500,
      error
    )
  }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ onboarding_completed: true })
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new ApiError(
      "UPDATE_ERROR",
      "Failed to complete onboarding",
      500,
      error
    )
  }

  return data
}
