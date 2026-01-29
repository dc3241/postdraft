"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const voiceSampleSchema = z.object({
  content: z.string().min(50, "Please provide at least 50 characters of content"),
  platform: z.enum(["twitter", "linkedin", "facebook", "instagram", "other"]).optional(),
})

type VoiceSampleForm = z.infer<typeof voiceSampleSchema>

export default function OnboardingVoicePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [samplesAdded, setSamplesAdded] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VoiceSampleForm>({
    resolver: zodResolver(voiceSampleSchema),
  })

  const platform = watch("platform")

  const onSubmit = async (data: VoiceSampleForm) => {
    setIsLoading(true)
    try {
      await api.onboarding.addVoiceSample(data.content, data.platform)
      toast.success("Voice sample added!")
      setSamplesAdded((prev) => prev + 1)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add voice sample")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (samplesAdded === 0) {
      toast.error("Please add at least one voice sample first")
      return
    }

    setIsAnalyzing(true)
    try {
      await api.onboarding.analyzeVoice()
      toast.success("Voice analysis complete!")
      router.push("/onboarding/preferences")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to analyze voice")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Add Voice Samples</CardTitle>
          <CardDescription>
            Provide samples of your existing content so we can learn your writing
            style. Add 3-5 samples for best results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Samples added:</strong> {samplesAdded}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add more samples or click &quot;Analyze Voice&quot; when you&apos;re ready.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform (Optional)</Label>
              <Select
                value={platform || ""}
                onValueChange={(value) =>
                  setValue("platform", value as VoiceSampleForm["platform"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content Sample</Label>
              <Textarea
                id="content"
                placeholder="Paste your content here... (minimum 50 characters)"
                rows={8}
                {...register("content")}
                disabled={isLoading}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Sample"
              )}
            </Button>
          </form>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/onboarding/niches")}
            >
              Back
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || samplesAdded === 0}
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Voice & Continue"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
