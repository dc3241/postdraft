import * as cheerio from "cheerio"
import type { CheerioAPI } from "cheerio"
import type { Element } from "domhandler"
import {
  removeNoiseFromHTML,
  extractCleanText,
  extractMetadata,
  validateContent,
} from "./contentCleaner"
import { checkRateLimit } from "./rateLimiter"
import type { ScrapeResult, ScrapedContent, ScrapeError } from "./types"
import { isRedditUrl, scrapeRedditUrl } from "./reddit-scraper"
import { isRssFeedUrl, scrapeRssFeed } from "./rss-scraper"

/**
 * Generate a random delay between min and max milliseconds
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract title from HTML with priority order
 */
function extractTitle($: CheerioAPI): string | null {
  // Priority 1: h1 tag
  const h1 = $("h1").first().text().trim()
  if (h1) return h1

  // Priority 2: Open Graph title
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim()
  if (ogTitle) return ogTitle

  // Priority 3: title tag
  const titleTag = $("title").text().trim()
  if (titleTag) return titleTag

  return null
}

/**
 * Extract publish date from HTML
 */
function extractPublishDate($: CheerioAPI): Date | null {
  // Try 1: article:published_time meta tag
  const articlePublished = $('meta[property="article:published_time"]').attr("content")
  if (articlePublished) {
    const date = new Date(articlePublished)
    if (!isNaN(date.getTime())) return date
  }

  // Try 2: time tag with datetime attribute
  const timeTag = $('time[datetime]').first().attr("datetime")
  if (timeTag) {
    const date = new Date(timeTag)
    if (!isNaN(date.getTime())) return date
  }

  // Try 3: JSON-LD structured data
  try {
    const jsonLdScripts = $('script[type="application/ld+json"]')
    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html()
      if (scriptContent) {
        try {
          const jsonLd = JSON.parse(scriptContent)
          // Handle both single objects and arrays
          const data = Array.isArray(jsonLd) ? jsonLd[0] : jsonLd

          if (data.datePublished) {
            const date = new Date(data.datePublished)
            if (!isNaN(date.getTime())) return date
          }

          // Also check for @graph array in JSON-LD
          if (data["@graph"] && Array.isArray(data["@graph"])) {
            for (const item of data["@graph"]) {
              if (item.datePublished) {
                const date = new Date(item.datePublished)
                if (!isNaN(date.getTime())) return date
              }
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  } catch {
    // Ignore JSON-LD extraction errors
  }

  return null
}

/**
 * Extract author from HTML
 */
function extractAuthor($: CheerioAPI): string | null {
  // Try 1: meta name="author"
  const metaAuthor = $('meta[name="author"]').attr("content")?.trim()
  if (metaAuthor) return metaAuthor

  // Try 2: a rel="author"
  const relAuthor = $('a[rel="author"]').first().text().trim()
  if (relAuthor) return relAuthor

  // Try 3: JSON-LD structured data
  try {
    const jsonLdScripts = $('script[type="application/ld+json"]')
    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html()
      if (scriptContent) {
        try {
          const jsonLd = JSON.parse(scriptContent)
          const data = Array.isArray(jsonLd) ? jsonLd[0] : jsonLd

          if (data.author) {
            // Handle both string and object authors
            if (typeof data.author === "string") {
              return data.author.trim()
            }
            if (typeof data.author === "object" && data.author.name) {
              return data.author.name.trim()
            }
            if (Array.isArray(data.author) && data.author[0]?.name) {
              return data.author[0].name.trim()
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  } catch {
    // Ignore JSON-LD extraction errors
  }

  return null
}

/**
 * Find main content element in HTML
 * Tries multiple strategies to find the primary content
 */
function findMainContent($: CheerioAPI): cheerio.Cheerio<Element> {
  // Strategy 1: article tag
  const $article = $("article").first()
  if ($article.length > 0) {
    return $article
  }

  // Strategy 2: main tag
  const $main = $("main").first()
  if ($main.length > 0) {
    return $main
  }

  // Strategy 3: largest div with most p tags
  let $bestDiv: cheerio.Cheerio<Element> | null = null
  let maxParagraphs = 0

  $("div").each((_, element) => {
    const $div = $(element)
    const paragraphCount = $div.find("p").length

    if (paragraphCount > maxParagraphs) {
      maxParagraphs = paragraphCount
      $bestDiv = $div
    }
  })

  if ($bestDiv && maxParagraphs > 0) {
    return $bestDiv
  }

  // Fallback: entire body
  return $("body")
}

/**
 * Scrape a single URL
 * 
 * @param url - URL to scrape
 * @returns ScrapeResult (either ScrapedContent or ScrapeError)
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const startTime = Date.now()

  try {
    // Validate URL format
    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch (error) {
      const errorMessage = `Invalid URL format: ${url}`
      console.error(errorMessage, { url, timestamp: new Date().toISOString() })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    // Check if this is a Reddit URL and route to Reddit scraper
    if (isRedditUrl(url)) {
      console.log(`Detected Reddit URL, using Reddit-specific scraper: ${url}`, {
        url,
        timestamp: new Date().toISOString(),
      })
      return await scrapeRedditUrl(url)
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(url)
    if (!rateLimitResult.success) {
      const errorMessage = `Rate limit exceeded for domain: ${urlObj.hostname}`
      console.warn(errorMessage, {
        url,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: new Date(rateLimitResult.reset).toISOString(),
        timestamp: new Date().toISOString(),
      })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    // Add random delay (2-5 seconds) before fetching
    const delay = randomDelay(2000, 5000)
    await sleep(delay)

    // Fetch URL with proper headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        const errorMessage = `Request timeout after 30 seconds: ${url}`
        console.error(errorMessage, { url, timestamp: new Date().toISOString() })
        return {
          url,
          error: errorMessage,
          timestamp: new Date(),
        } as ScrapeError
      }
      throw fetchError
    }

    clearTimeout(timeoutId)

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = `HTTP ${response.status} ${response.statusText}: ${url}`
      console.error(errorMessage, {
        url,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString(),
      })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    // Get HTML content
    const html = await response.text()

    // Load HTML into Cheerio
    const $ = cheerio.load(html)

    // Extract metadata
    const metadata = extractMetadata($)

    // Find main content
    const $mainContent = findMainContent($)
    const mainContentHTML = $mainContent.html() || ""

    // Clean HTML
    const cleanedHTML = removeNoiseFromHTML(mainContentHTML)

    // Extract clean text
    const cleanText = extractCleanText(cleanedHTML)

    // Validate content
    const validation = validateContent(cleanText)
    if (!validation.isValid) {
      const errorMessage = `Content validation failed: ${validation.reason}`
      console.warn(errorMessage, {
        url,
        reason: validation.reason,
        contentLength: cleanText.length,
        timestamp: new Date().toISOString(),
      })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    // Extract title
    const title = extractTitle($)

    // Extract publish date
    const publishDate = extractPublishDate($)

    // Extract author
    const author = extractAuthor($)

    // Generate excerpt (first 200 characters)
    const excerpt = cleanText.substring(0, 200).trim()

    // Build ScrapedContent object
    const scrapedContent: ScrapedContent = {
      url,
      title,
      content: cleanText,
      publishDate,
      author,
      excerpt: excerpt.length < cleanText.length ? excerpt + "..." : excerpt,
      metadata,
      scrapedAt: new Date(),
      contentLength: cleanText.length,
    }

    const duration = Date.now() - startTime
    console.log(`Successfully scraped URL: ${url}`, {
      url,
      title,
      contentLength: cleanText.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    return scrapedContent
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : `Unknown error: ${String(error)}`
    console.error(`Failed to scrape URL: ${url}`, {
      url,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return {
      url,
      error: errorMessage,
      timestamp: new Date(),
    } as ScrapeError
  }
}

/**
 * Batch scrape multiple URLs with controlled concurrency
 * 
 * @param urls - Array of URLs to scrape
 * @param concurrency - Maximum number of concurrent requests (default: 3)
 * @returns Array of ScrapeResult (mix of ScrapedContent and ScrapeError)
 */
export async function batchScrape(
  urls: string[],
  concurrency: number = 3
): Promise<ScrapeResult[]> {
  const pLimit = (await import("p-limit")).default
  const limit = pLimit(concurrency)

  console.log(`Starting batch scrape: ${urls.length} URLs with concurrency ${concurrency}`, {
    urlCount: urls.length,
    concurrency,
    timestamp: new Date().toISOString(),
  })

  const results: ScrapeResult[] = []
  let completed = 0

  // Process URLs with concurrency control
  const promises = urls.map((url) =>
    limit(async () => {
      const result = await scrapeUrl(url)
      results.push(result)
      completed++

      // Log progress
      console.log(`Batch scrape progress: ${completed}/${urls.length}`, {
        completed,
        total: urls.length,
        url,
        success: "content" in result,
        timestamp: new Date().toISOString(),
      })

      // Add random delay between batches (2-5 seconds)
      if (completed < urls.length) {
        const delay = randomDelay(2000, 5000)
        await sleep(delay)
      }

      return result
    })
  )

  // Wait for all promises to settle (using allSettled to handle errors independently)
  await Promise.allSettled(promises)

  const successCount = results.filter((r) => "content" in r).length
  const errorCount = results.filter((r) => "error" in r).length

  console.log(`Batch scrape completed: ${successCount} successful, ${errorCount} failed`, {
    total: urls.length,
    successful: successCount,
    failed: errorCount,
    timestamp: new Date().toISOString(),
  })

  return results
}
