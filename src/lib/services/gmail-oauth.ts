import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { ApiError } from '@/lib/api/auth'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn('Missing Gmail OAuth environment variables')
}

/**
 * Generate Gmail OAuth authorization URL
 */
export function getGmailAuthUrl(userId: string): string {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new ApiError(
      'CONFIG_ERROR',
      'Gmail OAuth not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI',
      500
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
  ]

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url')

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state,
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGmailCode(
  code: string,
  userId: string
): Promise<{ email: string; accessToken: string; refreshToken: string; expiresAt: Date }> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new ApiError(
      'CONFIG_ERROR',
      'Gmail OAuth not configured',
      500
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new ApiError('TOKEN_ERROR', 'Failed to get access/refresh tokens', 500)
  }

  // Get user's email
  oauth2Client.setCredentials(tokens)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const profile = await gmail.users.getProfile({ userId: 'me' })

  if (!profile.data.emailAddress) {
    throw new ApiError('PROFILE_ERROR', 'Failed to get email address', 500)
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000) // Default 1 hour

  return {
    email: profile.data.emailAddress,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  }
}

/**
 * Get authenticated Gmail client for a user
 */
export async function getGmailClient(userId: string) {
  const supabase = await createClient()

  // Get stored connection
  const { data: connection, error } = await supabase
    .from('user_email_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .eq('is_active', true)
    .single()

  if (error || !connection) {
    throw new ApiError('NO_CONNECTION', 'Gmail not connected', 404)
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new ApiError('CONFIG_ERROR', 'Gmail OAuth not configured', 500)
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )

  // Check if token needs refresh
  let accessToken = connection.access_token
  let refreshToken = connection.refresh_token

  if (new Date(connection.expires_at) < new Date()) {
    // Token expired, refresh it
    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token,
    })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        throw new ApiError('REFRESH_ERROR', 'Failed to refresh token', 500)
      }

      accessToken = credentials.access_token
      const newExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000)

      // Update stored token
      await supabase
        .from('user_email_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id)
    } catch (refreshError) {
      console.error('Failed to refresh Gmail token', refreshError)
      // Mark connection as inactive
      await supabase
        .from('user_email_connections')
        .update({ is_active: false })
        .eq('id', connection.id)
      
      throw new ApiError('REFRESH_ERROR', 'Failed to refresh token. Please reconnect Gmail.', 401)
    }
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}
