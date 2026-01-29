import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { triggerScrape } from "./custom-sources"
import { processNewsletterEmails } from "./newsletters"
import { triggerAutoGeneration } from "./auto-generate"
import { ApiError } from "@/lib/api/auth"

interface MorningScrapeResult {
  userId: string
  customSourcesScraped: number
  newsletterSourcesScraped: number
  topicsFound: number
  postsGenerated: number
  errors: string[]
}

/**
 * Process morning scraping and generation for a single user
 */
async function processUserMorningScrape(userId: string): Promise<MorningScrapeResult> {
  const serviceClient = createServiceRoleClient()
  const result: MorningScrapeResult = {
    userId,
    customSourcesScraped: 0,
    newsletterSourcesScraped: 0,
    topicsFound: 0,
    postsGenerated: 0,
    errors: [],
  }

  try {
    // Get user's active custom sources
    const { data: customSources, error: customError } = await serviceClient
      .from("custom_sources")
      .select("id, source_name, source_url")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (customError) {
      result.errors.push(`Failed to fetch custom sources: ${customError.message}`)
    } else if (customSources && customSources.length > 0) {
      type CustomSourceRow = { id: string; source_name: string; source_url: string }
      const sources = customSources as CustomSourceRow[]
      for (const source of sources) {
        try {
          // Note: triggerScrape and processNewsletterEmails use createClient() which requires cookies
          // In cron context, we don't have user cookies, but these functions take userId as parameter
          // They should still work since they query by userId. If issues occur, we may need to
          // refactor these functions to accept an optional Supabase client parameter.
          const scrapeResult = await triggerScrape(source.id, userId)
          result.customSourcesScraped++
          if (scrapeResult.topics_found) {
            result.topicsFound += scrapeResult.topics_found
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Failed to scrape custom source ${source.source_name}: ${errorMsg}`)
          console.error(`Failed to scrape custom source ${source.id} for user ${userId}`, error)
        }
      }
    }

    // Get user's active newsletter sources
    const { data: newsletterSources, error: newsletterError } = await serviceClient
      .from("newsletter_sources")
      .select("id, source_name")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (newsletterError) {
      result.errors.push(`Failed to fetch newsletter sources: ${newsletterError.message}`)
    } else if (newsletterSources && newsletterSources.length > 0) {
      type NewsletterSourceRow = { id: string; source_name: string | null }
      const sources = newsletterSources as NewsletterSourceRow[]
      for (const source of sources) {
        try {
          const scrapeResult = await processNewsletterEmails(userId, source.id)
          result.newsletterSourcesScraped++
          result.topicsFound += scrapeResult.topicsFound
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Failed to scrape newsletter ${source.source_name}: ${errorMsg}`)
          console.error(`Failed to scrape newsletter ${source.id} for user ${userId}`, error)
        }
      }
    }

    // Check if user has auto-generation enabled
    const { data: prefs } = await serviceClient
      .from("user_preferences")
      .select("auto_generate_enabled")
      .eq("user_id", userId)
      .single()

    const prefsRow = prefs as { auto_generate_enabled: boolean } | null
    if (prefsRow?.auto_generate_enabled) {
      try {
        const genResult = await triggerAutoGeneration(userId)
        result.postsGenerated = genResult.postsGenerated
      } catch (error) {
        // Don't add to errors if it's just "no topics" - that's expected sometimes
        if (error instanceof ApiError && error.code !== "NO_TOPICS") {
          const errorMsg = error.message
          result.errors.push(`Failed to generate posts: ${errorMsg}`)
          console.error(`Failed to generate posts for user ${userId}`, error)
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`Unexpected error processing user: ${errorMsg}`)
    console.error(`Unexpected error processing user ${userId}`, error)
  }

  return result
}

/**
 * Process morning scraping and generation for all users
 * This is the main function called by the cron job
 */
export async function processAllUsersMorningScrape(): Promise<{
  totalUsers: number
  successfulUsers: number
  totalTopicsFound: number
  totalPostsGenerated: number
  results: MorningScrapeResult[]
  errors: string[]
}> {
  const serviceClient = createServiceRoleClient()
  const allErrors: string[] = []
  const results: MorningScrapeResult[] = []

  try {
    // Get all users who have active sources (custom or newsletter)
    const { data: usersWithCustomSources, error: customError } = await serviceClient
      .from("custom_sources")
      .select("user_id")
      .eq("is_active", true)
      .not("user_id", "is", null)

    const { data: usersWithNewsletters, error: newsletterError } = await serviceClient
      .from("newsletter_sources")
      .select("user_id")
      .eq("is_active", true)
      .not("user_id", "is", null)

    if (customError) {
      allErrors.push(`Failed to fetch users with custom sources: ${customError.message}`)
    }

    if (newsletterError) {
      allErrors.push(`Failed to fetch users with newsletter sources: ${newsletterError.message}`)
    }

    // Combine and deduplicate user IDs
    type UserIdRow = { user_id: string }
    const userIds = new Set<string>()
    ;(usersWithCustomSources as UserIdRow[] | null)?.forEach((row) => {
      if (row.user_id) userIds.add(row.user_id)
    })
    ;(usersWithNewsletters as UserIdRow[] | null)?.forEach((row) => {
      if (row.user_id) userIds.add(row.user_id)
    })

    const uniqueUserIds = Array.from(userIds)
    console.log(`Starting morning scrape for ${uniqueUserIds.length} users`, {
      timestamp: new Date().toISOString(),
    })

    let totalTopicsFound = 0
    let totalPostsGenerated = 0
    let successfulUsers = 0

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        const result = await processUserMorningScrape(userId)
        results.push(result)
        totalTopicsFound += result.topicsFound
        totalPostsGenerated += result.postsGenerated

        if (result.errors.length === 0 || result.topicsFound > 0 || result.postsGenerated > 0) {
          successfulUsers++
        }

        // Add user-specific errors to all errors
        if (result.errors.length > 0) {
          allErrors.push(`User ${userId}: ${result.errors.join("; ")}`)
        }

        // Small delay between users to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        allErrors.push(`Failed to process user ${userId}: ${errorMsg}`)
        console.error(`Failed to process user ${userId}`, error)
      }
    }

    console.log(`Completed morning scrape`, {
      totalUsers: uniqueUserIds.length,
      successfulUsers,
      totalTopicsFound,
      totalPostsGenerated,
      timestamp: new Date().toISOString(),
    })

    return {
      totalUsers: uniqueUserIds.length,
      successfulUsers,
      totalTopicsFound,
      totalPostsGenerated,
      results,
      errors: allErrors,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    allErrors.push(`Fatal error in morning scrape: ${errorMsg}`)
    console.error("Fatal error in morning scrape", error)

    return {
      totalUsers: 0,
      successfulUsers: 0,
      totalTopicsFound: 0,
      totalPostsGenerated: 0,
      results,
      errors: allErrors,
    }
  }
}
