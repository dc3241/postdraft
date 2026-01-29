/**
 * TypeScript types for the web scraping system
 */

/**
 * Scraped content result from a URL
 */
export interface ScrapedContent {
  url: string
  title: string | null
  content: string // Clean, parsed text
  publishDate: Date | null
  author: string | null
  excerpt: string | null
  metadata: {
    openGraphTitle?: string
    openGraphDescription?: string
    openGraphImage?: string | null
    metaDescription?: string
    feedTitle?: string | null
    feedUrl?: string
    emailLinks?: string[]
  }
  scrapedAt: Date
  contentLength: number
}

/**
 * Error result when scraping fails
 */
export interface ScrapeError {
  url: string
  error: string
  timestamp: Date
}

/**
 * Result from scraping (success or failure)
 */
export type ScrapeResult = ScrapedContent | ScrapeError

/**
 * Type guard to check if result is ScrapedContent
 */
export function isScrapedContent(result: ScrapeResult): result is ScrapedContent {
  return 'content' in result && 'scrapedAt' in result
}

/**
 * Type guard to check if result is ScrapeError
 */
export function isScrapeError(result: ScrapeResult): result is ScrapeError {
  return 'error' in result && 'timestamp' in result
}

/**
 * Extracted topic from Claude
 */
export interface ExtractedTopic {
  title: string
  description: string
  category: string
  trendingScore: number // 0-100
  relevance: string // Why this topic is trending
}

/**
 * Rate limiter result
 */
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Timestamp when limit resets
}
