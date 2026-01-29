import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ApiError } from "@/lib/api/auth"
import type { Database } from "@/types/database"
import Stripe from "stripe"

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  : null

/**
 * Get user's subscription information
 */
export async function getUserSubscription(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No subscription exists yet (free tier)
      return {
        plan_tier: "free",
        status: "active",
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }
    }
    throw new ApiError(
      "FETCH_ERROR",
      "Failed to fetch subscription",
      500,
      error
    )
  }

  return data
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  planTier: string
) {
  if (!stripe) {
    throw new ApiError(
      "PROVIDER_NOT_CONFIGURED",
      "Stripe is not configured",
      503
    )
  }

  const supabase = await createClient()

  // Get or create Stripe customer
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()

  let customerId = subscription?.stripe_customer_id

  if (!customerId) {
    // Get user email
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      throw new ApiError("USER_ERROR", "User email not found", 400)
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId,
      },
    })
    customerId = customer.id

    // Save customer ID to subscription
    const serviceClient = createServiceRoleClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client infers never for this table; payload matches Insert type
    await serviceClient
      .from("subscriptions")
      .upsert(
        { user_id: userId, stripe_customer_id: customerId } as any,
        { onConflict: "user_id" }
      )
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
    metadata: {
      userId,
      planTier,
    },
  })

  return { sessionId: session.id, url: session.url }
}

/**
 * Create Stripe portal session for subscription management
 */
export async function createPortalSession(userId: string) {
  if (!stripe) {
    throw new ApiError(
      "PROVIDER_NOT_CONFIGURED",
      "Stripe is not configured",
      503
    )
  }

  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()

  if (!subscription?.stripe_customer_id) {
    throw new ApiError(
      "NO_SUBSCRIPTION",
      "No active subscription found",
      400
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  })

  return { url: session.url }
}

/**
 * Handle Stripe webhook events
 * This should be called from the webhook route (no auth required)
 * Note: Signature verification is done in the route handler before calling this
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  if (!stripe) {
    throw new ApiError(
      "PROVIDER_NOT_CONFIGURED",
      "Stripe is not configured",
      503
    )
  }

  const serviceClient = createServiceRoleClient()

  // Handle different event types
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object as Stripe.Subscription
      const customerId = stripeSubscription.customer as string

      // Find user by customer ID
      const { data: sub } = await serviceClient
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single()

      const subRow = sub as { user_id: string } | null
      if (!subRow) {
        throw new ApiError("NOT_FOUND", "Subscription not found", 404)
      }

      // Determine plan tier from price ID (you'll need to map these)
      const priceId = stripeSubscription.items.data[0]?.price.id
      const planTier = mapPriceIdToPlanTier(priceId || "")

      // Update subscription (Stripe.Subscription has current_period_start/end as number)
      const stripeSub = stripeSubscription as Stripe.Subscription & {
        current_period_start: number
        current_period_end: number
      }
      const subsTable = serviceClient.from("subscriptions") as any
      await subsTable
        .update({
          stripe_subscription_id: stripeSub.id,
          plan_tier: planTier,
          status: stripeSub.status,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end,
        })
        .eq("user_id", subRow.user_id)

      break
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription
      const customerId = stripeSubscription.customer as string

      // Find and update subscription
      const subsTable = serviceClient.from("subscriptions") as any
      await subsTable
        .update({ status: "cancelled", plan_tier: "free" })
        .eq("stripe_customer_id", customerId)

      break
    }

    default:
      // Ignore other events
      break
  }

  return { success: true }
}

/**
 * Map Stripe price ID to plan tier
 * You should update this with your actual price IDs
 */
function mapPriceIdToPlanTier(priceId: string): string {
  // This is a placeholder - update with your actual Stripe price IDs
  const priceIdMap: Record<string, string> = {
    // Add your price IDs here
    // "price_xxxxx": "pro",
    // "price_yyyyy": "team",
    // "price_zzzzz": "enterprise",
  }

  return priceIdMap[priceId] || "free"
}
