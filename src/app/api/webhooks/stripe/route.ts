import { NextRequest, NextResponse } from "next/server"
import { handleStripeWebhook } from "@/lib/services/billing"
import Stripe from "stripe"
import { ApiError } from "@/lib/api/auth"

/**
 * Stripe webhook handler - no auth/CSRF required (signature verification instead)
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_SIGNATURE",
            message: "Stripe signature header is required",
          },
        },
        { status: 400 }
      )
    }

    // Get raw body (Stripe needs it for signature verification)
    const rawBody = await request.text()
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2026-01-28.clover",
    })

    // Verify and construct event
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      )
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_SIGNATURE",
            message: "Invalid webhook signature",
          },
        },
        { status: 400 }
      )
    }

    // Handle the webhook (signature already verified above)
    await handleStripeWebhook(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse()
    }

    console.error("Stripe webhook error:", error)
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_ERROR",
          message: "Failed to process webhook",
        },
      },
      { status: 500 }
    )
  }
}
