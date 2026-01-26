import { generateWithClaude } from "@/lib/ai/claude"
import type { ScrapedContent, ExtractedTopic, ScrapeResult } from "./types"
import { isScrapedContent } from "./types"

/**
 * Calculate simple string similarity between two strings
 * Returns a ratio between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().trim().split(/\s+/))
  const words2 = new Set(str2.toLowerCase().trim().split(/\s+/))

  const intersection = new Set([...words1].filter((word) => words2.has(word)))
  const union = new Set([...words1, ...words2])

  if (union.size === 0) return 0

  return intersection.size / union.size
}

/**
 * Deduplicate topics by title similarity
 * Keeps the topic with higher trendingScore when duplicates are found
 */
function deduplicateTopics(topics: ExtractedTopic[]): ExtractedTopic[] {
  const unique: ExtractedTopic[] = []
  const seen: string[] = []

  for (const topic of topics) {
    // Check for exact duplicate (case-insensitive)
    const normalizedTitle = topic.title.toLowerCase().trim()
    if (seen.includes(normalizedTitle)) {
      continue
    }

    // Check for similar topics (>80% similarity)
    let isDuplicate = false
    for (const existingTopic of unique) {
      const similarity = calculateSimilarity(topic.title, existingTopic.title)
      if (similarity > 0.8) {
        // Keep the one with higher trendingScore
        if (topic.trendingScore > existingTopic.trendingScore) {
          // Replace existing with this one
          const index = unique.indexOf(existingTopic)
          unique[index] = topic
        }
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      unique.push(topic)
      seen.push(normalizedTitle)
    }
  }

  return unique
}

/**
 * Combine scraped content into a batched text block for Claude
 * Keeps total under ~15,000 characters to avoid token limits
 */
function combineContentForBatching(
  scrapedContent: ScrapedContent[],
  maxChars: number = 15000
): string {
  const parts: string[] = []

  for (const content of scrapedContent) {
    // Include title, excerpt (first 500 chars), and metadata
    const part = [
      `=== Source: ${content.url} ===`,
      `Title: ${content.title || "No title"}`,
      `Excerpt: ${content.excerpt || content.content.substring(0, 500)}`,
      content.metadata.openGraphDescription
        ? `Description: ${content.metadata.openGraphDescription}`
        : "",
      content.publishDate
        ? `Published: ${content.publishDate.toISOString()}`
        : "",
    ]
      .filter((line) => line.length > 0)
      .join("\n")

    // Check if adding this part would exceed the limit
    const currentLength = parts.join("\n\n").length
    if (currentLength + part.length > maxChars) {
      break // Stop adding more content
    }

    parts.push(part)
  }

  return parts.join("\n\n")
}

/**
 * Build Claude API prompt for topic extraction
 */
function buildTopicExtractionPrompt(
  combinedContent: string,
  userIndustry?: string,
  userInterests?: string[]
): string {
  const industryContext = userIndustry || "general"
  const interestsContext =
    userInterests && userInterests.length > 0
      ? userInterests.join(", ")
      : "all topics"

  return `You are analyzing web content to identify trending topics for social media content creation.

User context:
- Industry: ${industryContext}
- Interests: ${interestsContext}

Web content to analyze:
${combinedContent}

Extract 5-10 trending topics from this content. For each topic:
- Title: Clear, concise topic name (5-10 words max)
- Description: Why this topic is trending and why it matters (2-3 sentences)
- Category: One of [Technology, Business, Marketing, Health, Entertainment, Politics, Science, Sports, Lifestyle, Other]
- Trending Score: 0-100 based on recency, relevance, and potential engagement
- Relevance: Brief explanation of why this topic matches the user's industry/interests

Focus on:
- Recent developments (prioritize newer content)
- Topics with broad appeal or timely relevance
- Actionable topics that could generate engaging social media posts

Return ONLY valid JSON array of topics, no other text:
[
  {
    "title": "...",
    "description": "...",
    "category": "...",
    "trendingScore": 85,
    "relevance": "..."
  }
]`
}

/**
 * Parse and validate Claude's JSON response
 */
function parseTopicsFromResponse(response: string): ExtractedTopic[] {
  try {
    // Try to extract JSON from response (in case Claude adds extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    const jsonStr = jsonMatch ? jsonMatch[0] : response

    const parsed = JSON.parse(jsonStr)

    if (!Array.isArray(parsed)) {
      console.warn("Claude response is not an array", { response })
      return []
    }

    // Validate and filter topics
    const validTopics: ExtractedTopic[] = []

    for (const item of parsed) {
      // Validate required fields
      if (
        typeof item.title === "string" &&
        typeof item.description === "string" &&
        typeof item.category === "string" &&
        typeof item.trendingScore === "number" &&
        typeof item.relevance === "string" &&
        item.trendingScore >= 40 && // Filter out low quality topics
        item.trendingScore <= 100
      ) {
        validTopics.push({
          title: item.title.trim(),
          description: item.description.trim(),
          category: item.category.trim(),
          trendingScore: Math.round(item.trendingScore),
          relevance: item.relevance.trim(),
        })
      } else {
        console.warn("Invalid topic structure, skipping", { item })
      }
    }

    return validTopics
  } catch (error) {
    console.error("Failed to parse topics from Claude response", {
      error: error instanceof Error ? error.message : String(error),
      response: response.substring(0, 500), // Log first 500 chars
    })

    // Try to extract topics manually from text response
    return extractTopicsFromText(response)
  }
}

/**
 * Fallback: Extract topics from text response when JSON parsing fails
 */
function extractTopicsFromText(text: string): ExtractedTopic[] {
  const topics: ExtractedTopic[] = []

  // Try to find topic-like patterns in the text
  // This is a fallback, so we'll be lenient
  const titleMatches = text.match(/title["\s:]+([^,}]+)/gi)
  const scoreMatches = text.match(/trendingScore["\s:]+(\d+)/gi)

  // If we can't extract structured data, return empty array
  // The user should see an error rather than bad data
  return topics
}

/**
 * Extract trending topics from scraped content using Claude API
 * 
 * @param scrapedContent - Array of ScrapeResult (will filter out errors)
 * @param userIndustry - Optional user industry for context
 * @param userInterests - Optional user interests for context
 * @returns Array of ExtractedTopic
 */
export async function extractTopicsFromContent(
  scrapedContent: ScrapeResult[],
  userIndustry?: string,
  userInterests?: string[]
): Promise<ExtractedTopic[]> {
  try {
    // Filter out ScrapeError results
    const validContent = scrapedContent.filter(isScrapedContent)

    if (validContent.length === 0) {
      console.warn("No valid scraped content to extract topics from", {
        totalResults: scrapedContent.length,
        timestamp: new Date().toISOString(),
      })
      return []
    }

    console.log(`Extracting topics from ${validContent.length} scraped sources`, {
      sourceCount: validContent.length,
      userIndustry,
      userInterests,
      timestamp: new Date().toISOString(),
    })

    // Combine content for batching
    const combinedContent = combineContentForBatching(validContent)

    if (combinedContent.length === 0) {
      console.warn("Combined content is empty after batching", {
        timestamp: new Date().toISOString(),
      })
      return []
    }

    // Build prompt
    const prompt = buildTopicExtractionPrompt(combinedContent, userIndustry, userInterests)

    // Call Claude API
    const systemPrompt =
      "You are an expert at identifying trending topics from web content. Extract actionable, engaging topics suitable for social media content creation."

    const response = await generateWithClaude(prompt, systemPrompt, 2000)

    if (!response || response.trim().length === 0) {
      console.warn("Empty response from Claude API", {
        timestamp: new Date().toISOString(),
      })
      return []
    }

    // Parse and validate response
    let topics = parseTopicsFromResponse(response)

    // Deduplicate topics
    topics = deduplicateTopics(topics)

    // Filter out low quality topics (trendingScore < 40 already filtered in parseTopicsFromResponse)
    // But we can add additional filtering here if needed

    console.log(`Extracted ${topics.length} unique topics from content`, {
      topicCount: topics.length,
      timestamp: new Date().toISOString(),
    })

    return topics
  } catch (error) {
    // If Claude API fails, log error and return empty array
    console.error("Failed to extract topics from content", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return []
  }
}
