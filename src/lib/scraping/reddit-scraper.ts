/**
 * Reddit-specific scraper using Reddit's JSON API
 * Handles Reddit post URLs and subreddit URLs
 * Extracts post content + comments, or discovers trending posts from subreddits
 */

import { checkRateLimit } from "./rateLimiter"
import type { ScrapeResult, ScrapedContent, ScrapeError } from "./types"

/**
 * Reddit API response types
 */
interface RedditPost {
  data: {
    id: string
    title: string
    selftext: string // Post body text
    selftext_html: string | null
    author: string
    subreddit: string
    score: number // Upvotes - downvotes
    upvote_ratio: number
    num_comments: number
    created_utc: number // Unix timestamp
    url: string // External URL if link post, or self post URL
    is_self: boolean // True if text post, false if link post
    permalink: string
    domain?: string
    thumbnail?: string
    preview?: {
      images?: Array<{
        source?: {
          url?: string
        }
      }>
    }
  }
}

interface RedditComment {
  data: {
    id: string
    body: string
    body_html: string | null
    author: string
    score: number
    created_utc: number
    replies?: {
      data?: {
        children?: RedditComment[]
      }
    }
    depth?: number
  }
}

interface RedditListing {
  data: {
    children: Array<RedditPost | RedditComment>
  }
}

type RedditAPIResponse = [RedditListing, RedditListing] // [post, comments]

/**
 * Check if a URL is a Reddit URL
 */
export function isRedditUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    return (
      hostname === "reddit.com" ||
      hostname === "www.reddit.com" ||
      hostname.endsWith(".reddit.com")
    )
  } catch {
    return false
  }
}

/**
 * Parse Reddit URL to determine if it's a post or subreddit
 */
interface RedditUrlInfo {
  type: "post" | "subreddit"
  subreddit: string
  postId?: string
  sort?: "hot" | "top" | "new" | "rising"
}

function parseRedditUrl(url: string): RedditUrlInfo | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname

    // Match Reddit post URL pattern: /r/{subreddit}/comments/{post_id}/{optional_title}/
    const postMatch = pathname.match(/\/r\/([^/]+)\/comments\/([^/]+)/)
    if (postMatch) {
      const [, subreddit, postId] = postMatch
      return {
        type: "post",
        subreddit,
        postId,
      }
    }

    // Match subreddit URL pattern: /r/{subreddit}/ or /r/{subreddit}/{sort}/
    const subredditMatch = pathname.match(/\/r\/([^/]+)(?:\/(hot|top|new|rising))?\/?$/)
    if (subredditMatch) {
      const [, subreddit, sort] = subredditMatch
      return {
        type: "subreddit",
        subreddit,
        sort: (sort as "hot" | "top" | "new" | "rising") || "hot",
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Convert Reddit post URL to JSON API endpoint
 * Examples:
 * - https://www.reddit.com/r/subreddit/comments/post_id/title/ -> https://www.reddit.com/r/subreddit/comments/post_id.json
 * - https://www.reddit.com/r/subreddit/comments/post_id/ -> https://www.reddit.com/r/subreddit/comments/post_id.json
 */
function convertToRedditPostJsonUrl(url: string): string | null {
  const urlInfo = parseRedditUrl(url)
  if (!urlInfo || urlInfo.type !== "post" || !urlInfo.postId) {
    return null
  }

  return `https://www.reddit.com/r/${urlInfo.subreddit}/comments/${urlInfo.postId}.json`
}

/**
 * Convert subreddit URL to JSON API endpoint for listing posts
 * Examples:
 * - https://www.reddit.com/r/startups/ -> https://www.reddit.com/r/startups/hot.json
 * - https://www.reddit.com/r/startups/top/ -> https://www.reddit.com/r/startups/top.json
 */
function convertToRedditSubredditJsonUrl(url: string): string | null {
  const urlInfo = parseRedditUrl(url)
  if (!urlInfo || urlInfo.type !== "subreddit") {
    return null
  }

  const sort = urlInfo.sort || "hot"
  return `https://www.reddit.com/r/${urlInfo.subreddit}/${sort}.json?limit=25`
}

/**
 * Recursively extract comments and their replies
 */
function extractComments(
  comments: RedditComment[],
  maxDepth: number = 3,
  currentDepth: number = 0
): string[] {
  const commentTexts: string[] = []

  for (const comment of comments) {
    if (!comment.data || comment.data.body === "[deleted]" || comment.data.body === "[removed]") {
      continue
    }

    // Extract comment text (strip HTML if present)
    const body = comment.data.body || ""
    if (body.trim()) {
      // Add author and score context
      const author = comment.data.author || "unknown"
      const score = comment.data.score || 0
      const commentWithContext = `[Comment by u/${author} (${score} points)]: ${body}`
      commentTexts.push(commentWithContext)
    }

    // Recursively extract replies if within depth limit
    if (
      currentDepth < maxDepth &&
      comment.data.replies &&
      comment.data.replies.data &&
      comment.data.replies.data.children
    ) {
      const replies = comment.data.replies.data.children.filter(
        (child): child is RedditComment => "data" in child && "body" in child.data
      )
      const replyTexts = extractComments(replies, maxDepth, currentDepth + 1)
      commentTexts.push(...replyTexts)
    }
  }

  return commentTexts
}

/**
 * Calculate trending score for a post
 * Higher score = more trending
 * Factors: upvotes, upvote ratio, comments, recency
 */
function calculateTrendingScore(post: RedditPost["data"]): number {
  const score = post.score || 0
  const upvoteRatio = post.upvote_ratio || 0.5
  const commentCount = post.num_comments || 0
  const ageHours = (Date.now() / 1000 - post.created_utc) / 3600

  // Weighted scoring:
  // - Score (upvotes): 40% weight
  // - Upvote ratio: 20% weight (higher = better)
  // - Comments: 30% weight (engagement indicator)
  // - Recency: 10% weight (newer posts get slight boost)

  // Normalize scores (using log scale for upvotes/comments to prevent outliers from dominating)
  const normalizedScore = Math.log10(Math.max(score, 1)) * 10
  const normalizedComments = Math.log10(Math.max(commentCount, 1)) * 10
  const recencyBoost = Math.max(0, 1 - ageHours / 48) // Boost for posts < 48 hours old

  const trendingScore =
    normalizedScore * 0.4 +
    upvoteRatio * 100 * 0.2 +
    normalizedComments * 0.3 +
    recencyBoost * 10 * 0.1

  return trendingScore
}

/**
 * Fetch subreddit listing (hot/top posts)
 */
async function fetchSubredditListing(
  jsonUrl: string,
  url: string
): Promise<RedditPost["data"][]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let response: Response
  try {
    response = await fetch(jsonUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ContentIdeaScorer/1.0 (Web Scraper for Content Ideas)",
        Accept: "application/json",
      },
    })
  } catch (fetchError) {
    clearTimeout(timeoutId)
    if (fetchError instanceof Error && fetchError.name === "AbortError") {
      throw new Error(`Request timeout after 30 seconds: ${url}`)
    }
    throw fetchError
  }

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`)
  }

  const data: RedditListing = await response.json()

  if (!data.data || !data.data.children) {
    throw new Error("Invalid subreddit listing response format")
  }

  // Extract posts from listing
  const posts: RedditPost["data"][] = []
  for (const child of data.data.children) {
    if ("data" in child && "title" in child.data) {
      posts.push((child as RedditPost).data)
    }
  }

  return posts
}

/**
 * Scrape a single Reddit post (internal function, used by both single post and subreddit scraping)
 */
async function scrapeSingleRedditPost(postUrl: string): Promise<ScrapedContent | null> {
  const jsonUrl = convertToRedditPostJsonUrl(postUrl)
  if (!jsonUrl) {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let response: Response
  try {
    response = await fetch(jsonUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ContentIdeaScorer/1.0 (Web Scraper for Content Ideas)",
        Accept: "application/json",
      },
    })
  } catch (fetchError) {
    clearTimeout(timeoutId)
    if (fetchError instanceof Error && fetchError.name === "AbortError") {
      throw new Error(`Request timeout after 30 seconds: ${postUrl}`)
    }
    throw fetchError
  }

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${postUrl}`)
  }

  const data: RedditAPIResponse = await response.json()

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("Invalid Reddit API response format")
  }

  const postListing = data[0] as RedditListing
  if (!postListing.data || !postListing.data.children || postListing.data.children.length === 0) {
    throw new Error("No post data found in Reddit response")
  }

  const postData = (postListing.data.children[0] as RedditPost).data
  if (!postData) {
    throw new Error("Invalid post data structure")
  }

  // Extract comments
  const commentsListing = data[1] as RedditListing | undefined
  let comments: RedditComment[] = []
  if (commentsListing && commentsListing.data && commentsListing.data.children) {
    comments = commentsListing.data.children.filter(
      (child): child is RedditComment => "data" in child && "body" in child.data
    )
  }

  // Build content text
  const contentParts: string[] = []
  const title = postData.title || ""
  contentParts.push(`Title: ${title}`)

  if (postData.is_self && postData.selftext) {
    contentParts.push(`\nPost Content:\n${postData.selftext}`)
  }

  const metadataInfo = [
    `Subreddit: r/${postData.subreddit}`,
    `Author: u/${postData.author}`,
    `Score: ${postData.score} (${Math.round(postData.upvote_ratio * 100)}% upvoted)`,
    `Comments: ${postData.num_comments}`,
  ]
  contentParts.push(`\nPost Details:\n${metadataInfo.join("\n")}`)

  let commentTexts: string[] = []
  if (comments.length > 0) {
    const topComments = comments
      .sort((a, b) => (b.data.score || 0) - (a.data.score || 0))
      .slice(0, 20)

    commentTexts = extractComments(topComments, 2)
    if (commentTexts.length > 0) {
      contentParts.push(`\n\nTop Comments:\n${commentTexts.join("\n\n")}`)
    }
  }

  const fullContent = contentParts.join("\n")

  if (fullContent.length < 100) {
    return null // Skip posts with too little content
  }

  const publishDate = postData.created_utc ? new Date(postData.created_utc * 1000) : null
  const excerpt = fullContent.substring(0, 300).trim() + "..."

  return {
    url: postUrl,
    title: title || null,
    content: fullContent,
    publishDate,
    author: postData.author ? `u/${postData.author}` : null,
    excerpt,
    metadata: {
      openGraphTitle: title || undefined,
      openGraphDescription: postData.selftext?.substring(0, 200) || undefined,
      openGraphImage: postData.thumbnail !== "self" ? postData.thumbnail : undefined,
      metaDescription: `Reddit post from r/${postData.subreddit} with ${postData.num_comments} comments and ${postData.score} upvotes`,
    },
    scrapedAt: new Date(),
    contentLength: fullContent.length,
  }
}

/**
 * Scrape a Reddit post or subreddit using Reddit's JSON API
 */
export async function scrapeRedditUrl(url: string): Promise<ScrapeResult> {
  const startTime = Date.now()

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(url)
    if (!rateLimitResult.success) {
      const errorMessage = `Rate limit exceeded for Reddit`
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

    // Parse URL to determine if it's a post or subreddit
    const urlInfo = parseRedditUrl(url)
    if (!urlInfo) {
      const errorMessage = `Invalid Reddit URL format: ${url}`
      console.error(errorMessage, { url, timestamp: new Date().toISOString() })
      return {
        url,
        error: errorMessage,
        timestamp: new Date(),
      } as ScrapeError
    }

    // Handle single post URL
    if (urlInfo.type === "post") {
      try {
        const scrapedPost = await scrapeSingleRedditPost(url)
        if (!scrapedPost) {
          const errorMessage = `Failed to scrape Reddit post: ${url}`
          console.error(errorMessage, { url, timestamp: new Date().toISOString() })
          return {
            url,
            error: errorMessage,
            timestamp: new Date(),
          } as ScrapeError
        }

        const duration = Date.now() - startTime
        console.log(`Successfully scraped Reddit post: ${url}`, {
          url,
          title: scrapedPost.title,
          contentLength: scrapedPost.contentLength,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })

        return scrapedPost
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Unknown error: ${String(error)}`
        console.error(`Failed to scrape Reddit post: ${url}`, {
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

    // Handle subreddit URL - discover and scrape trending posts
    if (urlInfo.type === "subreddit") {
      console.log(`Detected subreddit URL, discovering trending posts: ${url}`, {
        url,
        subreddit: urlInfo.subreddit,
        sort: urlInfo.sort,
        timestamp: new Date().toISOString(),
      })

      try {
        // Fetch subreddit listing
        const jsonUrl = convertToRedditSubredditJsonUrl(url)
        if (!jsonUrl) {
          const errorMessage = `Invalid subreddit URL format: ${url}`
          console.error(errorMessage, { url, timestamp: new Date().toISOString() })
          return {
            url,
            error: errorMessage,
            timestamp: new Date(),
          } as ScrapeError
        }

        const posts = await fetchSubredditListing(jsonUrl, url)

        if (posts.length === 0) {
          const errorMessage = `No posts found in subreddit: r/${urlInfo.subreddit}`
          console.warn(errorMessage, { url, timestamp: new Date().toISOString() })
          return {
            url,
            error: errorMessage,
            timestamp: new Date(),
          } as ScrapeError
        }

        // Calculate trending scores and sort
        const postsWithScores = posts.map((post) => ({
          post,
          trendingScore: calculateTrendingScore(post),
        }))

        // Sort by trending score (highest first) and take top 5-8 posts
        const topTrendingPosts = postsWithScores
          .sort((a, b) => b.trendingScore - a.trendingScore)
          .slice(0, 7) // Scrape top 7 trending posts

        console.log(`Found ${posts.length} posts, selecting top ${topTrendingPosts.length} trending posts`, {
          url,
          subreddit: urlInfo.subreddit,
          selectedCount: topTrendingPosts.length,
          timestamp: new Date().toISOString(),
        })

        // Scrape each trending post
        const scrapedPosts: ScrapedContent[] = []
        const errors: string[] = []

        for (let i = 0; i < topTrendingPosts.length; i++) {
          const { post } = topTrendingPosts[i]
          const postUrl = `https://www.reddit.com${post.permalink}`

          try {
            // Add small delay between requests to respect rate limits
            if (i > 0) {
              await new Promise((resolve) => setTimeout(resolve, 2000))
            }

            const scrapedPost = await scrapeSingleRedditPost(postUrl)
            if (scrapedPost) {
              scrapedPosts.push(scrapedPost)
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            errors.push(`Failed to scrape post "${post.title}": ${errorMsg}`)
            console.warn(`Failed to scrape post: ${postUrl}`, {
              postUrl,
              error: errorMsg,
              timestamp: new Date().toISOString(),
            })
          }
        }

        if (scrapedPosts.length === 0) {
          const errorMessage = `Failed to scrape any posts from subreddit: r/${urlInfo.subreddit}. Errors: ${errors.join("; ")}`
          console.error(errorMessage, { url, errors, timestamp: new Date().toISOString() })
          return {
            url,
            error: errorMessage,
            timestamp: new Date(),
          } as ScrapeError
        }

        // Aggregate content from all scraped posts
        const aggregatedContent: string[] = []
        aggregatedContent.push(
          `=== TRENDING POSTS FROM r/${urlInfo.subreddit.toUpperCase()} ===\n`
        )
        aggregatedContent.push(
          `Scraped ${scrapedPosts.length} trending posts from ${posts.length} total posts\n`
        )

        scrapedPosts.forEach((post, index) => {
          aggregatedContent.push(`\n${"=".repeat(60)}`)
          aggregatedContent.push(`POST ${index + 1} of ${scrapedPosts.length}`)
          aggregatedContent.push(`${"=".repeat(60)}\n`)
          aggregatedContent.push(post.content)
          aggregatedContent.push("\n")
        })

        const fullContent = aggregatedContent.join("\n")
        const title = `Trending Posts from r/${urlInfo.subreddit}`
        const excerpt = `Aggregated content from ${scrapedPosts.length} trending posts in r/${urlInfo.subreddit}. ${scrapedPosts[0]?.excerpt || ""}`

        const aggregatedScrapedContent: ScrapedContent = {
          url,
          title,
          content: fullContent,
          publishDate: scrapedPosts[0]?.publishDate || null,
          author: null, // Multiple authors
          excerpt: excerpt.substring(0, 300).trim() + "...",
          metadata: {
            openGraphTitle: title,
            openGraphDescription: `Top ${scrapedPosts.length} trending posts from r/${urlInfo.subreddit}`,
            metaDescription: `Aggregated trending content from r/${urlInfo.subreddit} with ${scrapedPosts.length} posts`,
          },
          scrapedAt: new Date(),
          contentLength: fullContent.length,
        }

        const duration = Date.now() - startTime
        console.log(`Successfully scraped subreddit: ${url}`, {
          url,
          subreddit: urlInfo.subreddit,
          postsFound: posts.length,
          postsScraped: scrapedPosts.length,
          errors: errors.length,
          contentLength: fullContent.length,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })

        return aggregatedScrapedContent
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : `Unknown error: ${String(error)}`
        console.error(`Failed to scrape subreddit: ${url}`, {
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

    // Should not reach here, but handle just in case
    const errorMessage = `Unsupported Reddit URL type: ${url}`
    console.error(errorMessage, { url, timestamp: new Date().toISOString() })
    return {
      url,
      error: errorMessage,
      timestamp: new Date(),
    } as ScrapeError
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : `Unknown error: ${String(error)}`
    console.error(`Failed to scrape Reddit URL: ${url}`, {
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
