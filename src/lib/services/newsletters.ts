import { createClient } from '@/lib/supabase/server'
import { ApiError } from '@/lib/api/auth'
import { getGmailClient } from './gmail-oauth'
import { parseEmailContent } from '@/lib/scraping/email-parser'
import { scrapeUrl, isScrapedContent, filterDuplicateTopics, generateContentHash } from '@/lib/scraping'
import { extractTopicsFromContent } from '@/lib/scraping/topicExtractor'
import { getUserPreferences } from './user-preferences'

/**
 * Fetch recent emails from selected newsletter senders
 */
export async function fetchNewsletterEmails(
  userId: string,
  daysBack: number = 7
): Promise<Array<{ subject: string; from: string; date: Date; body: string }>> {
  const supabase = await createClient()
  const gmail = await getGmailClient(userId)

  // Get user's selected newsletter senders
  const { data: senders } = await supabase
    .from('user_newsletter_senders')
    .select('*')
    .eq('user_id', userId)
    .eq('is_enabled', true)

  if (!senders || senders.length === 0) {
    return []
  }

  const emails: Array<{ subject: string; from: string; date: Date; body: string }> = []
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - daysBack)

  // Fetch emails from each sender
  for (const sender of senders) {
    try {
      // Gmail query: from specific sender, after date
      const query = `from:${sender.sender_email} after:${Math.floor(sinceDate.getTime() / 1000)}`

      const { data: messageList } = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10, // Limit per sender
      })

      if (!messageList.messages) continue

      // Get full message details
      for (const message of messageList.messages.slice(0, 5)) { // Limit to 5 per sender
        try {
          const { data: messageData } = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full',
          })

          const headers = messageData.payload?.headers || []
          const subject = headers.find(h => h.name === 'Subject')?.value || ''
          const from = headers.find(h => h.name === 'From')?.value || sender.sender_email
          const dateHeader = headers.find(h => h.name === 'Date')?.value
          const date = dateHeader ? new Date(dateHeader) : new Date()

          // Extract body (HTML or plain text)
          let body = ''
          if (messageData.payload?.body?.data) {
            body = Buffer.from(messageData.payload.body.data, 'base64').toString()
          } else if (messageData.payload?.parts) {
            // Multipart message
            for (const part of messageData.payload.parts) {
              if (part.mimeType === 'text/html' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString()
                break
              } else if (part.mimeType === 'text/plain' && part.body?.data && !body) {
                body = Buffer.from(part.body.data, 'base64').toString()
              }
            }
          }

          if (body) {
            emails.push({ subject, from, date, body })
          }
        } catch (messageError) {
          console.error(`Failed to fetch message ${message.id}`, messageError)
          // Continue with next message
        }
      }
    } catch (error) {
      console.error(`Failed to fetch emails from ${sender.sender_email}`, error)
      // Continue with other senders
    }
  }

  return emails
}

/**
 * Process newsletter emails: parse, optionally scrape links, extract topics
 */
export async function processNewsletterEmails(userId: string, newsletterSourceId: string) {
  const supabase = await createClient()

  // Get newsletter source
  const { data: source } = await supabase
    .from('newsletter_sources')
    .select('*, sender:user_newsletter_senders(*)')
    .eq('id', newsletterSourceId)
    .eq('user_id', userId)
    .single()

  if (!source) {
    throw new ApiError('NOT_FOUND', 'Newsletter source not found', 404)
  }

  // Fetch emails
  const emails = await fetchNewsletterEmails(userId, 7)

  if (emails.length === 0) {
    // Update last_scraped_at even if no emails found
    await supabase
      .from('newsletter_sources')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', newsletterSourceId)

    return { topicsFound: 0, emailsProcessed: 0 }
  }

  // Parse emails into ScrapedContent format
  const scrapedContents = emails.map(email =>
    parseEmailContent(email.body, email.subject, email.from, email.date)
  )

  // Optionally scrape "read more" links
  const linkContents: typeof scrapedContents = []
  for (const content of scrapedContents) {
    const links = content.metadata.emailLinks as string[] | undefined
    if (links && links.length > 0) {
      // Scrape first 3 links (to avoid too many requests)
      for (const link of links.slice(0, 3)) {
        try {
          const scraped = await scrapeUrl(link)
          if (isScrapedContent(scraped)) {
            linkContents.push(scraped)
          }
        } catch (error) {
          console.error(`Failed to scrape link ${link}`, error)
        }
      }
    }
  }

  // Combine email content + scraped link content
  const allContent = [...scrapedContents, ...linkContents]

  // Get user preferences for context
  let userIndustry: string | undefined
  let userInterests: string[] | undefined

  try {
    const { preferences } = await getUserPreferences(userId)
    if (preferences) {
      userIndustry = preferences.industry || undefined
      userInterests = preferences.content_topics.length > 0 ? preferences.content_topics : undefined
    }
  } catch (error) {
    console.warn('Could not fetch user preferences', error)
  }

  // Extract topics
  const topics = await extractTopicsFromContent(allContent, userIndustry, userInterests)

  if (topics.length === 0) {
    // Update last_scraped_at even if no topics found
    await supabase
      .from('newsletter_sources')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', newsletterSourceId)

    return { topicsFound: 0, emailsProcessed: emails.length }
  }

  // Filter out duplicate topics (check against database)
  const uniqueTopics = await filterDuplicateTopics(topics, userId, supabase)

  if (uniqueTopics.length === 0) {
    console.log(`All topics are duplicates for newsletter source ${newsletterSourceId}, skipping insert`, {
      newsletterSourceId,
      originalCount: topics.length,
      timestamp: new Date().toISOString(),
    })

    // Update last_scraped_at even if all topics are duplicates
    await supabase
      .from('newsletter_sources')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', newsletterSourceId)

    return { topicsFound: 0, emailsProcessed: emails.length, skippedDuplicates: true }
  }

  // Generate content hash from first email (for tracking)
  const contentHash = scrapedContents.length > 0
    ? generateContentHash(
        scrapedContents[0].title || '',
        scrapedContents[0].excerpt || scrapedContents[0].content.substring(0, 500),
        ''
      )
    : null

  // Get user's selected niches to assign to topics
  let selectedNiches: string[] = []
  try {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("selected_niches")
      .eq("user_id", userId)
      .single()
    
    selectedNiches = prefs?.selected_niches || []
  } catch (error) {
    console.warn("Could not fetch user niches for topic assignment", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Store topics in trending_topics with niche_id
  const topicsToInsert = uniqueTopics.map(topic => {
    // Assign niche_id: use first selected niche, or null if none selected
    const nicheId = selectedNiches.length > 0 ? selectedNiches[0] : null
    
    return {
      user_id: userId,
      newsletter_source_id: newsletterSourceId,
      source_type: 'newsletter' as const,
      niche_id: nicheId,
      title: topic.title,
      description: topic.description,
      content_snippet: scrapedContents[0]?.excerpt || '',
      source_url: null, // Emails don't have URLs
      trend_score: topic.trendingScore,
      metadata: {
        category: topic.category,
        relevance: topic.relevance,
        emailsProcessed: emails.length,
        content_hash: contentHash,
      },
    }
  })

  const { error: insertError } = await supabase
    .from('trending_topics')
    .insert(topicsToInsert)

  if (insertError) {
    throw new ApiError('INSERT_ERROR', 'Failed to store topics', 500, insertError)
  }

  // Update last_scraped_at
  await supabase
    .from('newsletter_sources')
    .update({ last_scraped_at: new Date().toISOString() })
    .eq('id', newsletterSourceId)

  return { topicsFound: uniqueTopics.length, emailsProcessed: emails.length }
}
