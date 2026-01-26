"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const preferencesSchema = z.object({
  voiceStyle: z.enum(["learned", "professional", "casual", "educational", "provocative", "inspirational"]),
  dailyPostCount: z.number().min(3).max(10),
  autoGenerateEnabled: z.boolean(),
})

type PreferencesForm = z.infer<typeof preferencesSchema>

export default function OnboardingPreferencesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      voiceStyle: "learned",
      dailyPostCount: 5,
      autoGenerateEnabled: false,
    },
  })

  const autoGenerateEnabled = watch("autoGenerateEnabled")

  const onSubmit = async (data: PreferencesForm) => {
    setIsLoading(true)
    try {
      // Update preferences via Supabase directly
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            voice_style: data.voiceStyle,
            daily_post_count: data.dailyPostCount,
            auto_generate_enabled: data.autoGenerateEnabled,
          },
          { onConflict: "user_id" }
        )

      if (error) throw error

      // Complete onboarding
      await api.onboarding.complete()
      toast.success("Preferences saved! Welcome to PostDraft!")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save preferences")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Finalize Your Preferences</CardTitle>
          <CardDescription>
            Set your preferences for content generation and auto-generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="voiceStyle">Voice Style</Label>
              <Select
                defaultValue="learned"
                onValueChange={(value) =>
                  setValue("voiceStyle", value as PreferencesForm["voiceStyle"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learned">Learned (from your samples)</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="provocative">Provocative</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
              {errors.voiceStyle && (
                <p className="text-sm text-destructive">{errors.voiceStyle.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyPostCount">Daily Post Count</Label>
              <Input
                id="dailyPostCount"
                type="number"
                min={3}
                max={10}
                defaultValue={5}
                {...register("dailyPostCount", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Number of posts to generate per day (3-10)
              </p>
              {errors.dailyPostCount && (
                <p className="text-sm text-destructive">
                  {errors.dailyPostCount.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoGenerateEnabled"
                className="h-4 w-4 rounded border-gray-300"
                {...register("autoGenerateEnabled")}
              />
              <Label htmlFor="autoGenerateEnabled" className="cursor-pointer">
                Enable automatic post generation
              </Label>
            </div>

            {autoGenerateEnabled && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  Automatic generation will create posts daily based on trending topics
                  in your selected niches.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/onboarding/voice")}
              >
                Back
              </Button>
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
