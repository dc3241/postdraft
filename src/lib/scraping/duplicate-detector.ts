import type { ExtractedTopic } from "./types"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Calculate simple string similarity between two strings
 * Returns a ratio between 0 and 1 (Jaccard similarity)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().trim().split(/\s+/))
  const words2 = new Set(str2.toLowerCase().trim().split(/\s+/))

  const intersection = new Set([...words1].filter((word) => words2.has(word)))
  const union = new Set([...words1, ...words2])

  if (union.size === 0) return 0

  return intersection.size / union.size
}

/**
 * Check if a topic is a duplicate of existing topics in the database
 * Returns true if similarity > 80% with any existing topic
 */
export async function isDuplicateTopic(
  topic: ExtractedTopic,
  userId: string,
  supabase: SupabaseClient<Database>,
  similarityThreshold: number = 0.8
): Promise<boolean> {
  // Get existing topics for this user (from last 30 days to avoid checking all history)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: existingTopics, error } = await supabase
    .from("trending_topics")
    .select("title")
    .eq("user_id", userId)
    .gte("discovered_at", thirtyDaysAgo.toISOString())
    .or("expires_at.is.null,expires_at.gt.now()")

  if (error) {
    console.warn("Failed to check for duplicate topics", { error, userId })
    // If we can't check, assume it's not a duplicate to be safe
    return false
  }

  if (!existingTopics || existingTopics.length === 0) {
    return false
  }

  // Check similarity against existing topics
  const normalizedNewTitle = topic.title.toLowerCase().trim()

  for (const existing of existingTopics) {
    if (!existing.title) continue

    const normalizedExistingTitle = existing.title.toLowerCase().trim()

    // Exact match (case-insensitive)
    if (normalizedNewTitle === normalizedExistingTitle) {
      return true
    }

    // Similarity check
    const similarity = calculateSimilarity(topic.title, existing.title)
    if (similarity >= similarityThreshold) {
      return true
    }
  }

  return false
}

/**
 * Filter out duplicate topics by checking against database
 * Returns only topics that don't already exist
 */
export async function filterDuplicateTopics(
  topics: ExtractedTopic[],
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<ExtractedTopic[]> {
  const uniqueTopics: ExtractedTopic[] = []

  for (const topic of topics) {
    const isDuplicate = await isDuplicateTopic(topic, userId, supabase)
    if (!isDuplicate) {
      uniqueTopics.push(topic)
    }
  }

  return uniqueTopics
}

/**
 * Generate a content hash from scraped content
 * Used to detect if the same content was scraped before
 */
export function generateContentHash(
  title: string,
  excerpt: string,
  url?: string
): string {
  // Server-side only - uses Node.js crypto
  const crypto = require("crypto")
  const content = `${title}|${excerpt.substring(0, 500)}|${url || ""}`
  return crypto.createHash("sha256").update(content).digest("hex")
}

/**
 * Check if content hash already exists for a source
 * Returns true if hash was seen recently (last 7 days)
 */
export async function isContentHashDuplicate(
  contentHash: string,
  sourceId: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Check if this hash exists in metadata of recent topics from this source
  const { data: existingTopics, error } = await supabase
    .from("trending_topics")
    .select("metadata")
    .eq("user_id", userId)
    .or(`source_id.eq.${sourceId},newsletter_source_id.eq.${sourceId}`)
    .gte("discovered_at", sevenDaysAgo.toISOString())

  if (error || !existingTopics) {
    return false
  }

  // Check metadata for content_hash
  for (const topic of existingTopics) {
    const metadata = topic.metadata as any
    if (metadata?.content_hash === contentHash) {
      return true
    }
  }

  return false
}
