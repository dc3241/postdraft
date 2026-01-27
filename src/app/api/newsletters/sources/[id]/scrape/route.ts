import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandler } from '@/lib/api/route-wrapper'
import { parseParams } from '@/lib/api/validation'
import { processNewsletterEmails } from '@/lib/services/newsletters'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export const POST = createRouteHandler(
  async (request: NextRequest, { auth, params }) => {
    if (!auth) throw new Error('Authentication required')

    const { id } = parseParams(params || {}, paramsSchema)
    const result = await processNewsletterEmails(auth.userId, id)

    return NextResponse.json(result)
  },
  { requireAuth: true, methods: ['POST'] }
)
