import * as cheerio from 'cheerio'
import type { ScrapedContent } from './types'

/**
 * Parse email HTML body and extract clean content
 * Similar to contentCleaner but optimized for email HTML
 */
export function parseEmailContent(
  htmlBody: string,
  subject: string,
  from: string,
  date: Date
): ScrapedContent {
  const $ = cheerio.load(htmlBody)

  // Remove email-specific noise
  $('style, script, noscript').remove()
  $('img[width="1"], img[height="1"]').remove() // Tracking pixels
  $('a[href^="mailto:"]').remove() // Email links
  $('.unsubscribe, [class*="unsubscribe"], [id*="unsubscribe"]').remove()
  $('.footer, [class*="footer"], [id*="footer"]').remove()
  $('.header, [class*="header"], [id*="header"]').remove()

  // Remove common email newsletter noise
  $('[class*="promo"]').remove()
  $('[class*="banner"]').remove()
  $('[class*="ad"]').remove()
  $('table[width="100%"]').each((_, el) => {
    // Remove full-width tables that are often headers/footers
    const $el = $(el)
    if ($el.find('a[href*="unsubscribe"]').length > 0) {
      $el.remove()
    }
  })

  // Find main content (similar to scraper.ts logic)
  let $mainContent = $('article, .content, [class*="content"], .main, [class*="main"]').first()
  
  if ($mainContent.length === 0) {
    // Fallback: find div with most paragraphs
    let maxParagraphs = 0
    $('div').each((_, el) => {
      const pCount = $(el).find('p').length
      if (pCount > maxParagraphs) {
        maxParagraphs = pCount
        $mainContent = $(el)
      }
    })
  }

  if ($mainContent.length === 0) {
    // Last resort: use body but remove common email wrapper elements
    $mainContent = $('body')
    $mainContent.find('table[role="presentation"]').each((_, el) => {
      const $table = $(el)
      // Keep tables that have substantial content
      if ($table.find('p').length < 2) {
        $table.remove()
      }
    })
  }

  // Extract text
  const cleanText = $mainContent
    .find('p, h1, h2, h3, h4, h5, h6, li, blockquote')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(text => text.length > 0)
    .join('\n\n')

  // Extract links (for "read more" URLs)
  const links: string[] = []
  $mainContent.find('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && href.startsWith('http') && !links.includes(href)) {
      // Filter out common non-content links
      const lowerHref = href.toLowerCase()
      if (
        !lowerHref.includes('unsubscribe') &&
        !lowerHref.includes('preferences') &&
        !lowerHref.includes('view-in-browser') &&
        !lowerHref.includes('mailto:')
      ) {
        links.push(href)
      }
    }
  })

  // Generate excerpt
  const excerpt = cleanText.substring(0, 200).trim()

  return {
    url: '', // Email doesn't have a URL
    title: subject,
    content: cleanText,
    publishDate: date,
    author: from,
    excerpt: excerpt.length < cleanText.length ? excerpt + '...' : excerpt,
    metadata: {
      emailLinks: links,
    },
    scrapedAt: new Date(),
    contentLength: cleanText.length,
  }
}
