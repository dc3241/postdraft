import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandler } from '@/lib/api/route-wrapper'
import { parseQuery } from '@/lib/api/validation'
import { exchangeGmailCode } from '@/lib/services/gmail-oauth'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
})

export const GET = createRouteHandler(
  async (request: NextRequest) => {
    const query = parseQuery(request, callbackSchema)
    
    // Decode state to get userId
    let userId: string
    try {
      const state = JSON.parse(Buffer.from(query.state, 'base64url').toString())
      userId = state.userId
    } catch (error) {
      return NextResponse.redirect(new URL('/sources?error=invalid_state', request.url))
    }

    if (!userId) {
      return NextResponse.redirect(new URL('/sources?error=invalid_state', request.url))
    }

    try {
      // Exchange code for tokens
      const { email, accessToken, refreshToken, expiresAt } = await exchangeGmailCode(
        query.code,
        userId
      )

      // Store connection
      const supabase = await createClient()
      const { error } = await supabase
        .from('user_email_connections')
        .upsert({
          user_id: userId,
          provider: 'gmail',
          email,
          access_token: accessToken, // TODO: Encrypt before storing
          refresh_token: refreshToken, // TODO: Encrypt before storing
          expires_at: expiresAt.toISOString(),
          is_active: true,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,provider',
        })

      if (error) {
        console.error('Failed to store Gmail connection', error)
        throw error
      }

      return NextResponse.redirect(new URL('/sources?success=gmail_connected', request.url))
    } catch (error) {
      console.error('Gmail OAuth callback error', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Gmail'
      return NextResponse.redirect(
        new URL(`/sources?error=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }
  },
  {
    requireAuth: false, // OAuth callback
    requireCsrf: false,
    methods: ['GET'],
  }
)
