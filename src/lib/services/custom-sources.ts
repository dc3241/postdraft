import { createClient } from "@/lib/supabase/server"
import { ApiError } from "@/lib/api/auth"
import {
  scrapeUrl,
  isScrapedContent,
  extractTopicsFromContent,
  filterDuplicateTopics,
  generateContentHash,
  isContentHashDuplicate,
} from "@/lib/scraping"
import { getUserPreferences } from "./user-preferences"

/**
 * Get all custom sources for a user
 */
export async function getUserCustomSources(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("custom_sources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch custom sources",
      500,
      error
    )
  }

  return data || []
}

/**
 * Get a single custom source by ID
 */
export async function getCustomSourceById(sourceId: string, userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("custom_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      throw new ApiError("NOT_FOUND", "Custom source not found", 404)
    }
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch custom source",
      500,
      error
    )
  }

  return data
}

/**
 * Create a new custom source
 */
export async function createCustomSource(
  userId: string,
  sourceUrl: string,
  sourceName: string,
  sourceType?: string
) {
  const supabase = await createClient()

  // Basic URL validation
  try {
    new URL(sourceUrl)
  } catch {
    throw new ApiError("INVALID_URL", "Invalid source URL", 400)
  }

  const { data, error } = await supabase
    .from("custom_sources")
    .insert({
      user_id: userId,
      source_url: sourceUrl,
      source_name: sourceName,
      source_type: sourceType,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    throw new ApiError(
      "INSERT_ERROR",
      "Failed to create custom source",
      500,
      error
    )
  }

  return data
}

/**
 * Update a custom source
 */
export async function updateCustomSource(
  sourceId: string,
  userId: string,
  updates: {
    source_url?: string
    source_name?: string
    source_type?: string
    is_active?: boolean
  }
) {
  const supabase = await createClient()

  // Verify ownership first
  await getCustomSourceById(sourceId, userId)

  // Validate URL if provided
  if (updates.source_url) {
    try {
      new URL(updates.source_url)
    } catch {
      throw new ApiError("INVALID_URL", "Invalid source URL", 400)
    }
  }

  const { data, error } = await supabase
    .from("custom_sources")
    .update(updates)
    .eq("id", sourceId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    throw new ApiError(
      "UPDATE_ERROR",
      "Failed to update custom source",
      500,
      error
    )
  }

  return data
}

/**
 * Delete a custom source
 */
export async function deleteCustomSource(sourceId: string, userId: string) {
  const supabase = await createClient()

  // Verify ownership first
  await getCustomSourceById(sourceId, userId)

  const { error } = await supabase
    .from("custom_sources")
    .delete()
    .eq("id", sourceId)
    .eq("user_id", userId)

  if (error) {
    throw new ApiError(
      "DELETE_ERROR",
      "Failed to delete custom source",
      500,
      error
    )
  }

  return { success: true }
}

/**
 * Trigger scrape for a custom source
 * Scrapes the URL, extracts topics using Claude, and stores them in trending_topics
 */
export async function triggerScrape(sourceId: string, userId: string) {
  const supabase = await createClient()

  // Verify ownership and get source details
  const source = await getCustomSourceById(sourceId, userId)

  if (!source.is_active) {
    throw new ApiError(
      "SOURCE_INACTIVE",
      "Cannot scrape inactive source",
      400
    )
  }

  console.log(`Starting scrape for source: ${source.source_name} (${source.source_url})`, {
    sourceId,
    userId,
    timestamp: new Date().toISOString(),
  })

  try {
    // Step 1: Scrape the URL
    const scrapeResult = await scrapeUrl(source.source_url)

    if (!isScrapedContent(scrapeResult)) {
      // Scraping failed
      const errorMessage = scrapeResult.error || "Unknown scraping error"
      console.error(`Scraping failed for source ${sourceId}`, {
        sourceId,
        url: source.source_url,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })

      // Update last_scraped_at even on failure (to track attempts)
      await supabase
        .from("custom_sources")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", sourceId)
        .eq("user_id", userId)

      throw new ApiError(
        "SCRAPE_FAILED",
        `Failed to scrape URL: ${errorMessage}`,
        500
      )
    }

    // Step 2: Get user preferences for context
    let userIndustry: string | undefined
    let userInterests: string[] | undefined

    try {
      const { preferences } = await getUserPreferences(userId)
      if (preferences) {
        userIndustry = preferences.industry || undefined
        userInterests = preferences.content_topics.length > 0 ? preferences.content_topics : undefined
      }
    } catch (error) {
      // If preferences don't exist, continue without context
      console.warn("Could not fetch user preferences for topic extraction", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Step 3: Check for content hash duplicate (early exit if content unchanged)
    const contentHash = generateContentHash(
      scrapeResult.title || "",
      scrapeResult.excerpt || scrapeResult.content.substring(0, 500),
      scrapeResult.url
    )

    const isContentDuplicate = await isContentHashDuplicate(
      contentHash,
      sourceId,
      userId,
      supabase
    )

    if (isContentDuplicate) {
      console.log(`Content hash duplicate detected for source ${sourceId}, skipping topic extraction`, {
        sourceId,
        url: source.source_url,
        contentHash,
        timestamp: new Date().toISOString(),
      })

      // Update last_scraped_at even if content is duplicate
      const { data, error } = await supabase
        .from("custom_sources")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", sourceId)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        throw new ApiError(
          "UPDATE_ERROR",
          "Failed to update last_scraped_at",
          500,
          error
        )
      }

      return {
        ...data,
        scrape_triggered: true,
        topics_found: 0,
        scrape_successful: true,
        skipped_duplicate: true,
      }
    }

    // Step 4: Extract topics from scraped content
    const extractedTopics = await extractTopicsFromContent(
      [scrapeResult],
      userIndustry,
      userInterests
    )

    if (extractedTopics.length === 0) {
      console.warn(`No topics extracted from source ${sourceId}`, {
        sourceId,
        url: source.source_url,
        timestamp: new Date().toISOString(),
      })

      // Update last_scraped_at even if no topics found
      const { data, error } = await supabase
        .from("custom_sources")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", sourceId)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        throw new ApiError(
          "UPDATE_ERROR",
          "Failed to update last_scraped_at",
          500,
          error
        )
      }

      return {
        ...data,
        scrape_triggered: true,
        topics_found: 0,
        scrape_successful: true,
      }
    }

    // Step 5: Filter out duplicate topics (check against database)
    const uniqueTopics = await filterDuplicateTopics(
      extractedTopics,
      userId,
      supabase
    )

    if (uniqueTopics.length === 0) {
      console.log(`All topics are duplicates for source ${sourceId}, skipping insert`, {
        sourceId,
        url: source.source_url,
        originalCount: extractedTopics.length,
        timestamp: new Date().toISOString(),
      })

      // Update last_scraped_at even if all topics are duplicates
      const { data, error } = await supabase
        .from("custom_sources")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", sourceId)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        throw new ApiError(
          "UPDATE_ERROR",
          "Failed to update last_scraped_at",
          500,
          error
        )
      }

      return {
        ...data,
        scrape_triggered: true,
        topics_found: 0,
        scrape_successful: true,
        skipped_duplicates: true,
      }
    }

    // Step 6: Get user's selected niches to assign to topics
    let selectedNiches: string[] = []
    try {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("selected_niches")
        .eq("user_id", userId)
        .single()
      
      selectedNiches = prefs?.selected_niches || []
    } catch (error) {
      console.warn("Could not fetch user niches for topic assignment", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Step 7: Store topics in trending_topics table with niche_id
    const topicsToInsert = uniqueTopics.map((topic) => {
      // Assign niche_id: use first selected niche, or null if none selected
      const nicheId = selectedNiches.length > 0 ? selectedNiches[0] : null
      
      return {
        user_id: userId,
        source_id: sourceId,
        source_type: "custom_link" as const,
        niche_id: nicheId,
        title: topic.title,
        description: topic.description,
        content_snippet: scrapeResult.excerpt || scrapeResult.content.substring(0, 500),
        source_url: scrapeResult.url,
        trend_score: topic.trendingScore,
        metadata: {
          category: topic.category,
          relevance: topic.relevance,
          scrapedAt: scrapeResult.scrapedAt.toISOString(),
          scrapedTitle: scrapeResult.title,
          scrapedAuthor: scrapeResult.author,
          scrapedPublishDate: scrapeResult.publishDate?.toISOString(),
          openGraphTitle: scrapeResult.metadata.openGraphTitle,
          openGraphDescription: scrapeResult.metadata.openGraphDescription,
          openGraphImage: scrapeResult.metadata.openGraphImage,
          content_hash: contentHash,
        },
      }
    })

    const { data: insertedTopics, error: insertError } = await supabase
      .from("trending_topics")
      .insert(topicsToInsert)
      .select()

    if (insertError) {
      console.error(`Failed to insert topics for source ${sourceId}`, {
        sourceId,
        error: insertError.message,
        topicsCount: topicsToInsert.length,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(
        "INSERT_ERROR",
        "Failed to store extracted topics",
        500,
        insertError
      )
    }

    // Step 8: Update last_scraped_at on custom_sources
    const { data: updatedSource, error: updateError } = await supabase
      .from("custom_sources")
      .update({ last_scraped_at: new Date().toISOString() })
      .eq("id", sourceId)
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      // Log error but don't fail - topics were already inserted
      console.error(`Failed to update last_scraped_at for source ${sourceId}`, {
        sourceId,
        error: updateError.message,
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`Successfully scraped and stored topics for source ${sourceId}`, {
      sourceId,
      topicsCount: insertedTopics.length,
      timestamp: new Date().toISOString(),
    })

    return {
      ...(updatedSource || source),
      scrape_triggered: true,
      topics_found: insertedTopics.length,
      scrape_successful: true,
    }
  } catch (error) {
    // If it's already an ApiError, re-throw it
    if (error instanceof ApiError) {
      throw error
    }

    // Otherwise, wrap in ApiError
    console.error(`Unexpected error during scrape for source ${sourceId}`, {
      sourceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    throw new ApiError(
      "SCRAPE_ERROR",
      "An unexpected error occurred during scraping",
      500,
      error
    )
  }
}
