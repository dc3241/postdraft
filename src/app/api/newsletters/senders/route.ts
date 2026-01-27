import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandler } from '@/lib/api/route-wrapper'
import { parseJson, parseQuery } from '@/lib/api/validation'
import { createClient } from '@/lib/supabase/server'
import { getGmailClient } from '@/lib/services/gmail-oauth'
import { z } from 'zod'

// GET: List available senders (from recent emails)
export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) throw new Error('Authentication required')

    const supabase = await createClient()
    const gmail = await getGmailClient(auth.userId)

    // Fetch recent emails to discover senders
    const { data: messageList } = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      q: 'after:' + Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // Last 30 days
    })

    // Extract unique senders
    const sendersMap = new Map<string, { email: string; name: string; count: number }>()

    if (messageList.messages) {
      for (const message of messageList.messages.slice(0, 50)) { // Limit to 50
        try {
          const { data: msg } = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'metadata',
            metadataHeaders: ['From'],
          })

          const fromHeader = msg.payload?.headers?.find(h => h.name === 'From')?.value
          if (fromHeader) {
            // Parse "Name <email@domain.com>" or just "email@domain.com"
            const match = fromHeader.match(/^(.*?)\s*<(.+?)>$|^(.+?)$/)
            const email = match?.[2] || match?.[3] || fromHeader
            const name = match?.[1]?.trim() || email

            if (!sendersMap.has(email)) {
              sendersMap.set(email, { email, name, count: 0 })
            }
            sendersMap.get(email)!.count++
          }
        } catch (error) {
          console.error(`Failed to fetch message ${message.id}`, error)
          // Continue with next message
        }
      }
    }

    // Get already-selected senders
    const { data: selectedSenders } = await supabase
      .from('user_newsletter_senders')
      .select('*')
      .eq('user_id', auth.userId)

    const senders = Array.from(sendersMap.values())
      .sort((a, b) => b.count - a.count)
      .map(sender => ({
        ...sender,
        isSelected: selectedSenders?.some(s => s.sender_email === sender.email) || false,
      }))

    return NextResponse.json({ senders })
  },
  { requireAuth: true, methods: ['GET'] }
)

// POST: Add selected senders
const addSendersSchema = z.object({
  senderEmails: z.array(z.string().email()),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) throw new Error('Authentication required')

    const body = await parseJson(request, addSendersSchema)
    const supabase = await createClient()

    // Get email connection
    const { data: connection } = await supabase
      .from('user_email_connections')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('provider', 'gmail')
      .single()

    if (!connection) {
      throw new Error('Gmail not connected')
    }

    // Get sender names from the senders list
    const { data: allSenders } = await supabase
      .from('user_newsletter_senders')
      .select('sender_email, sender_name')
      .eq('user_id', auth.userId)

    // Insert senders
    const sendersToInsert = body.senderEmails.map(email => {
      // Try to find existing name
      const existing = allSenders?.find(s => s.sender_email === email)
      return {
        user_id: auth.userId,
        email_connection_id: connection.id,
        sender_email: email,
        sender_name: existing?.sender_name || null,
        is_enabled: true,
      }
    })

    const { data: insertedSenders, error } = await supabase
      .from('user_newsletter_senders')
      .upsert(sendersToInsert, {
        onConflict: 'user_id,sender_email',
      })
      .select()

    if (error) throw error

    // Create newsletter sources for each sender
    for (const sender of insertedSenders || []) {
      await supabase
        .from('newsletter_sources')
        .upsert({
          user_id: auth.userId,
          sender_id: sender.id,
          source_name: sender.sender_name || sender.sender_email,
          source_type: 'newsletter',
          is_active: true,
        }, {
          onConflict: 'user_id,sender_id',
        })
    }

    return NextResponse.json({ success: true, senders: insertedSenders })
  },
  { requireAuth: true, methods: ['POST'] }
)
