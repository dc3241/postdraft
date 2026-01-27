import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandler } from '@/lib/api/route-wrapper'
import { createClient } from '@/lib/supabase/server'

export const GET = createRouteHandler(
  async (request: NextRequest, { auth }) => {
    if (!auth) throw new Error('Authentication required')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('newsletter_sources')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Failed to fetch newsletter sources')
    }

    return NextResponse.json({ sources: data || [] })
  },
  { requireAuth: true, methods: ['GET'] }
)
