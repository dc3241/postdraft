import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandler } from '@/lib/api/route-wrapper'
import { getGmailAuthUrl } from '@/lib/services/gmail-oauth'

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) {
      throw new Error('Authentication required')
    }

    const authUrl = getGmailAuthUrl(auth.userId)
    return NextResponse.json({ authUrl })
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)
