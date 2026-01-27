/**
 * Main exports for the scraping system
 */

// Types
export type {
  ScrapedContent,
  ScrapeError,
  ScrapeResult,
  ExtractedTopic,
  RateLimitResult,
} from "./types"
export { isScrapedContent, isScrapeError } from "./types"

// Rate Limiter
export { checkRateLimit } from "./rateLimiter"

// Content Cleaner
export {
  removeNoiseFromHTML,
  extractCleanText,
  extractMetadata,
  validateContent,
} from "./contentCleaner"

// Scraper
export { scrapeUrl, batchScrape } from "./scraper"

// Topic Extractor
export { extractTopicsFromContent } from "./topicExtractor"

// Email Parser
export { parseEmailContent } from "./email-parser"

// Duplicate Detector
export {
  calculateSimilarity,
  isDuplicateTopic,
  filterDuplicateTopics,
  generateContentHash,
  isContentHashDuplicate,
} from "./duplicate-detector"
