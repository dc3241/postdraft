"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface Niche {
  id: string
  name: string
  description: string | null
  icon: string | null
}

export default function OnboardingNichesPage() {
  const router = useRouter()
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchNiches() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("niches")
          .select("*")
          .eq("is_active", true)
          .order("name")

        if (error) throw error
        setNiches(data || [])
      } catch (error) {
        toast.error("Failed to load niches")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNiches()
  }, [])

  const toggleNiche = (nicheId: string) => {
    setSelectedNiches((prev) =>
      prev.includes(nicheId)
        ? prev.filter((id) => id !== nicheId)
        : [...prev, nicheId]
    )
  }

  const handleSubmit = async () => {
    if (selectedNiches.length === 0) {
      toast.error("Please select at least one niche")
      return
    }

    setIsSubmitting(true)
    try {
      await api.onboarding.updateNiches(selectedNiches)
      toast.success("Niches saved!")
      router.push("/onboarding/voice")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save niches")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Select Your Niches</CardTitle>
          <CardDescription>
            Choose the content niches you&apos;re interested in. You can select multiple.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {niches.map((niche) => (
              <button
                key={niche.id}
                onClick={() => toggleNiche(niche.id)}
                className={`rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                  selectedNiches.includes(niche.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {niche.icon && <span className="text-2xl">{niche.icon}</span>}
                      <h3 className="font-semibold">{niche.name}</h3>
                    </div>
                    {niche.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {niche.description}
                      </p>
                    )}
                  </div>
                  {selectedNiches.includes(niche.id) && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedNiches.length === 0}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
