"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2, CreditCard, Settings as SettingsIcon } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

interface Subscription {
  plan_tier: string
  status: string
  current_period_end: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    setIsLoading(true)
    try {
      const data = await api.billing.getSubscription()
      setSubscription(data.subscription as Subscription)
    } catch (error) {
      toast.error("Failed to load subscription")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async () => {
    // This would need actual Stripe price IDs
    toast.info("Please configure Stripe price IDs in the billing service")
  }

  const handleManageBilling = async () => {
    try {
      const data = await api.billing.createPortal()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error("Failed to open billing portal")
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account settings and subscription"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-900">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription className="text-stone-600">
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-8">
                <div>
                  <p className="font-semibold text-stone-900">Current Plan</p>
                  <Badge 
                    variant="default" 
                    className="mt-1 bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                  >
                    {subscription?.plan_tier || "free"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-stone-600">Status</p>
                  <Badge 
                    variant="secondary" 
                    className="mt-1 bg-green-100 text-green-700 hover:bg-green-100"
                  >
                    {subscription?.status || "active"}
                  </Badge>
                </div>
              </div>

              {subscription?.current_period_end && (
                <div className="rounded-lg bg-stone-50 border border-stone-200 p-4">
                  <p className="text-sm text-stone-700">
                    <strong className="text-stone-900">Current period ends:</strong>{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {subscription?.plan_tier === "free" ? (
                  <Button 
                    onClick={handleUpgrade}
                    className="bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
                  >
                    Upgrade Plan
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={handleManageBilling}
                    className="border-stone-200 hover:bg-stone-50"
                  >
                    Manage Billing
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-900">
            <SettingsIcon className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription className="text-stone-600">
            Update your account preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Manage your brand voice, content preferences, and platform settings.
            </p>
            <Button
              onClick={() => router.push("/settings/specifications")}
              className="bg-gradient-to-r from-orange-500 to-purple-600 text-white"
            >
              Manage Specifications
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
