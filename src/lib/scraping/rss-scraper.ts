import type { ScrapeResult, ScrapedContent, ScrapeError } from "./types"
import { checkRateLimit } from "./rateLimiter"

/**
 * Check if a URL is likely an RSS feed
 */
export function isRssFeedUrl(url: string): boolean {
  const urlLower = url.toLowerCase()
  return (
    urlLower.includes("/feed") ||
    urlLower.includes("/rss") ||
    urlLower.endsWith(".rss") ||
    urlLower.endsWith(".xml") ||
    urlLower.includes("?feed=rss") ||
    urlLower.includes("?feed=atom")
  )
}

/**
 * Check if content is RSS/Atom XML
 */
function isRssContent(content: string): boolean {
  const contentLower = content.trim().toLowerCase()
  return (
    contentLower.includes("<rss") ||
    contentLower.includes("<feed") ||
    contentLower.includes("xmlns=\"http://www.w3.org/2005/atom\"") ||
    contentLower.includes("xmlns=\"http://purl.org/rss/1.0/\"")
  )
}

/**
 * Parse RSS 2.0 feed
 */
function parseRss2Feed(xml: string, feedUrl: string): ScrapedContent[] {
  const items: ScrapedContent[] = []
  
  // Extract channel title
  const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title>([^<]+)<\/title>/i)
  const channelTitle = channelTitleMatch ? channelTitleMatch[1].trim() : null

  // Extract all items
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let itemMatch

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1]
    
    // Extract title
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? cleanXmlText(titleMatch[1]) : null

    // Extract link
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i)
    const link = linkMatch ? cleanXmlText(linkMatch[1]) : null

    // Extract description/content
    const descriptionMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i)
    const contentMatch = itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)
    const content = contentMatch 
      ? cleanXmlText(contentMatch[1]) 
      : (descriptionMatch ? cleanXmlText(descriptionMatch[1]) : "")

    // Extract publish date
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)
    const publishDate = pubDateMatch ? parseRssDate(cleanXmlText(pubDateMatch[1])) : null

    // Extract author
    const authorMatch = itemXml.match(/<author>([\s\S]*?)<\/author>/i) || 
                       itemXml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i)
    const author = authorMatch ? cleanXmlText(authorMatch[1]) : null

    if (title && link) {
      // Clean HTML from content
      const cleanContent = stripHtmlTags(content)
      const excerpt = cleanContent.substring(0, 200).trim()

      items.push({
        url: link,
        title,
        content: cleanContent,
        publishDate,
        author,
        excerpt: excerpt.length < cleanContent.length ? excerpt + "..." : excerpt,
        metadata: {
          openGraphTitle: title,
          openGraphDescription: excerpt,
          openGraphImage: undefined,
          feedTitle: channelTitle,
          feedUrl,
        },
        scrapedAt: new Date(),
        contentLength: cleanContent.length,
      })
    }
  }

  return items
}

/**
 * Parse Atom feed
 */
function parseAtomFeed(xml: string, feedUrl: string): ScrapedContent[] {
  const items: ScrapedContent[] = []
  
  // Extract feed title
  const feedTitleMatch = xml.match(/<feed[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i)
  const feedTitle = feedTitleMatch ? cleanXmlText(feedTitleMatch[1]) : null

  // Extract all entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
  let entryMatch

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryXml = entryMatch[1]
    
    // Extract title
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? cleanXmlText(titleMatch[1]) : null

    // Extract link (prefer href attribute)
    const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i) ||
                      entryXml.match(/<link>([\s\S]*?)<\/link>/i)
    const link = linkMatch ? cleanXmlText(linkMatch[1]) : null

    // Extract content/summary
    const contentMatch = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i)
    const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)
    const content = contentMatch 
      ? cleanXmlText(contentMatch[1]) 
      : (summaryMatch ? cleanXmlText(summaryMatch[1]) : "")

    // Extract publish date
    const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/i)
    const updatedMatch = entryXml.match(/<updated>([\s\S]*?)<\/updated>/i)
    const dateStr = publishedMatch ? cleanXmlText(publishedMatch[1]) : 
                    (updatedMatch ? cleanXmlText(updatedMatch[1]) : null)
    const publishDate = dateStr ? parseAtomDate(dateStr) : null

    // Extract author
    const authorMatch = entryXml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i)
    const author = authorMatch ? cleanXmlText(authorMatch[1]) : null

    if (title && link) {
      // Clean HTML from content
      const cleanContent = stripHtmlTags(content)
      const excerpt = cleanContent.substring(0, 200).trim()

      items.push({
        url: link,
        title,
        content: cleanContent,
        publishDate,
        author,
        excerpt: excerpt.length < cleanContent.length ? excerpt + "..." : excerpt,
        metadata: {
          openGraphTitle: title,
          openGraphDescription: excerpt,
          openGraphImage: undefined,
          feedTitle,
          feedUrl,
        },
        scrapedAt: new Date(),
        contentLength: cleanContent.length,
      })
    }
  }

  return items
}

/**
 * Clean XML text (remove CDATA, decode entities)
 */
function cleanXmlText(text: string): string {
  if (!text) return ""
  
  // Remove CDATA wrapper
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
  
  // Decode common XML entities
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
  
  return text.trim()
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  if (!html) return ""
  
  // Remove HTML tags
  let text = html.replace(/<[^>]+>/g, " ")
  
  // Decode HTML entities
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim()
  
  return text
}

/**
 * Parse RSS date format (RFC 822)
 */
function parseRssDate(dateStr: string): Date | null {
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

/**
 * Parse Atom date format (ISO 8601)
 */
function parseAtomDate(dateStr: string): Date | null {
  try {
    return new Date(dateStr)
  } catch {
    return null
  }
}

/**
 * Scrape an RSS/Atom feed and return multiple items
 */
export async function scrapeRssFeed(url: string): Promise<ScrapeResult | ScrapedContent[]> {
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

    // Fetch RSS feed
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
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

    // Get XML content
    const xml = await response.text()

    // Verify it's RSS/Atom content
    if (!isRssContent(xml)) {
      const errorMessage = `Content is not a valid RSS/Atom feed: ${url}`
      console.error(errorMessage, { url, timestamp: new Date().toISOString() })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    // Parse RSS or Atom feed
    let items: ScrapedContent[] = []
    if (xml.includes("<rss") || xml.includes("<channel>")) {
      items = parseRss2Feed(xml, url)
    } else if (xml.includes("<feed") || xml.includes("xmlns=\"http://www.w3.org/2005/atom\"")) {
      items = parseAtomFeed(xml, url)
    } else {
      const errorMessage = `Unknown feed format: ${url}`
      console.error(errorMessage, { url, timestamp: new Date().toISOString() })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    if (items.length === 0) {
      const errorMessage = `No items found in RSS feed: ${url}`
      console.warn(errorMessage, { url, timestamp: new Date().toISOString() })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    const duration = Date.now() - startTime
    console.log(`Successfully scraped RSS feed: ${url}`, {
      url,
      itemsCount: items.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    return items
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : `Unknown error: ${String(error)}`
    console.error(`Failed to scrape RSS feed: ${url}`, {
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
