import * as cheerio from "cheerio"
import type { CheerioAPI } from "cheerio"

/**
 * Remove noise from HTML (scripts, styles, navigation, ads, etc.)
 * 
 * @param html - Raw HTML string
 * @returns Cleaned HTML string with noise removed
 */
export function removeNoiseFromHTML(html: string): string {
  const $ = cheerio.load(html)

  // Remove script and style tags
  $("script, style").remove()

  // Remove navigation elements
  $("nav, header, footer, aside").remove()

  // Remove HTML comments
  $.root()
    .find("*")
    .contents()
    .filter(function () {
      return this.type === "comment"
    })
    .remove()

  // Remove common ad containers
  // Match class or id containing: "ad", "advertisement", "banner", "sidebar", "promo"
  const adSelectors = [
    '[class*="ad"]',
    '[class*="advertisement"]',
    '[class*="banner"]',
    '[class*="sidebar"]',
    '[class*="promo"]',
    '[id*="ad"]',
    '[id*="advertisement"]',
    '[id*="banner"]',
    '[id*="sidebar"]',
    '[id*="promo"]',
  ]

  adSelectors.forEach((selector) => {
    try {
      $(selector).remove()
    } catch (error) {
      // Ignore selector errors
    }
  })

  // Keep only semantic content elements
  // We'll preserve: article, main, section, p, h1-h6, blockquote, and their parent containers
  const $body = $("body")
  if ($body.length === 0) {
    return $.html()
  }

  // Return cleaned HTML
  return $.html()
}

/**
 * Extract clean text from HTML
 * Converts HTML to plain text with proper formatting
 * 
 * @param html - Cleaned HTML string
 * @returns Clean plain text with preserved paragraph breaks
 */
export function extractCleanText(html: string): string {
  const $ = cheerio.load(html)

  // Remove remaining script/style tags (safety check)
  $("script, style, nav, header, footer, aside").remove()

  // Extract text from semantic content elements
  const textElements: string[] = []

  // Get text from article, main, or section tags first
  $("article, main, section").each((_, element) => {
    const text = $(element).text()
    if (text.trim()) {
      textElements.push(text)
    }
  })

  // If no article/main/section found, get text from body
  if (textElements.length === 0) {
    const bodyText = $("body").text()
    if (bodyText.trim()) {
      textElements.push(bodyText)
    }
  }

  // Combine all text
  let combinedText = textElements.join("\n\n")

  // Remove excessive whitespace
  // Replace multiple spaces with single space
  combinedText = combinedText.replace(/[ \t]+/g, " ")

  // Replace multiple newlines (3+) with double newline (paragraph break)
  combinedText = combinedText.replace(/\n{3,}/g, "\n\n")

  // Remove leading/trailing whitespace from each line
  combinedText = combinedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")

  // Preserve paragraph breaks (double newline)
  // Single newlines become spaces, double newlines stay as paragraph breaks
  combinedText = combinedText.replace(/\n(?!\n)/g, " ").replace(/\n\n+/g, "\n\n")

  return combinedText.trim()
}

/**
 * Extract metadata from HTML (Open Graph, meta tags)
 * 
 * @param $ - Cheerio API instance
 * @returns Metadata object with Open Graph and meta description
 */
export function extractMetadata($: CheerioAPI): {
  openGraphTitle?: string
  openGraphDescription?: string
  openGraphImage?: string
  metaDescription?: string
} {
  const metadata: {
    openGraphTitle?: string
    openGraphDescription?: string
    openGraphImage?: string
    metaDescription?: string
  } = {}

  // Extract Open Graph tags
  const ogTitle = $('meta[property="og:title"]').attr("content")
  if (ogTitle) {
    metadata.openGraphTitle = ogTitle.trim()
  }

  const ogDescription = $('meta[property="og:description"]').attr("content")
  if (ogDescription) {
    metadata.openGraphDescription = ogDescription.trim()
  }

  const ogImage = $('meta[property="og:image"]').attr("content")
  if (ogImage) {
    metadata.openGraphImage = ogImage.trim()
  }

  // Extract meta description
  const metaDesc = $('meta[name="description"]').attr("content")
  if (metaDesc) {
    metadata.metaDescription = metaDesc.trim()
  }

  return metadata
}

/**
 * Validate content quality
 * Ensures content meets minimum requirements for processing
 * 
 * @param content - Clean text content to validate
 * @returns Validation result with isValid flag and optional reason
 */
export function validateContent(content: string): {
  isValid: boolean
  reason?: string
} {
  // Minimum content length: 100 characters
  if (content.length < 100) {
    return {
      isValid: false,
      reason: `Content too short: ${content.length} characters (minimum 100)`,
    }
  }

  // Maximum content length: 50,000 characters
  if (content.length > 50000) {
    return {
      isValid: false,
      reason: `Content too long: ${content.length} characters (maximum 50,000)`,
    }
  }

  // Must contain at least 10 words
  const words = content.split(/\s+/).filter((word) => word.length > 0)
  if (words.length < 10) {
    return {
      isValid: false,
      reason: `Too few words: ${words.length} words (minimum 10)`,
    }
  }

  // Reject if content is mostly special characters or numbers
  // Check if more than 70% of characters are non-alphabetic
  const alphabeticChars = content.replace(/[^a-zA-Z\s]/g, "").length
  const totalChars = content.replace(/\s/g, "").length
  if (totalChars > 0) {
    const alphabeticRatio = alphabeticChars / totalChars
    if (alphabeticRatio < 0.3) {
      return {
        isValid: false,
        reason: "Content contains too many special characters or numbers",
      }
    }
  }

  return { isValid: true }
}
