"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChipInput } from "@/components/onboarding/chip-input"
import { PlatformPriority, type Platform } from "@/components/onboarding/platform-priority"
import { toast } from "sonner"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api-client"

const INDUSTRIES = [
  "SaaS/Tech",
  "E-commerce",
  "Fitness/Health",
  "Marketing/Agency",
  "Creator/Influencer",
  "Finance",
  "Real Estate",
  "Education",
  "Other",
]

const COMMON_TOPICS: Record<string, string[]> = {
  "SaaS/Tech": ["AI", "Productivity", "Automation", "Startups", "SaaS"],
  "E-commerce": ["Dropshipping", "E-commerce", "Marketing", "Sales"],
  "Fitness/Health": ["Fitness", "Nutrition", "Wellness", "Training"],
  "Marketing/Agency": ["Marketing", "SEO", "Advertising", "Growth"],
  "Creator/Influencer": ["Content Creation", "Social Media", "YouTube", "TikTok"],
  "Finance": ["Investing", "Personal Finance", "Crypto", "Trading"],
  "Real Estate": ["Real Estate", "Investing", "Property"],
  "Education": ["Learning", "Online Courses", "Teaching"],
}

type Step = 1 | 2 | 3 | 4

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1: Industry & Topics
  const [industry, setIndustry] = useState("")
  const [customIndustry, setCustomIndustry] = useState("")
  const [contentTopics, setContentTopics] = useState<string[]>([])

  // Step 2: Platform Priorities
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [platformPriorities, setPlatformPriorities] = useState<Record<string, number>>({})

  // Step 3: Brand Voice Samples
  const [voiceSamples, setVoiceSamples] = useState<
    Record<Platform, { text: string; notes?: string }[]>
  >({
    twitter: [],
    linkedin: [],
    instagram: [],
    facebook: [],
    tiktok: [],
  })

  // Step 4: Brand Guidelines
  const [brandGuidelinesDo, setBrandGuidelinesDo] = useState<string[]>([])
  const [brandGuidelinesDont, setBrandGuidelinesDont] = useState<string[]>([])
  const [avoidTopics, setAvoidTopics] = useState<string[]>([])

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("onboarding_progress")
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setCurrentStep(data.step || 1)
        setIndustry(data.industry || "")
        setCustomIndustry(data.customIndustry || "")
        setContentTopics(data.contentTopics || [])
        setSelectedPlatforms(data.selectedPlatforms || [])
        setPlatformPriorities(data.platformPriorities || {})
        setVoiceSamples(data.voiceSamples || { twitter: [], linkedin: [], instagram: [], facebook: [], tiktok: [] })
        setBrandGuidelinesDo(data.brandGuidelinesDo || [])
        setBrandGuidelinesDont(data.brandGuidelinesDont || [])
        setAvoidTopics(data.avoidTopics || [])
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Save progress to localStorage
  useEffect(() => {
    const progress = {
      step: currentStep,
      industry,
      customIndustry,
      contentTopics,
      selectedPlatforms,
      platformPriorities,
      voiceSamples,
      brandGuidelinesDo,
      brandGuidelinesDont,
      avoidTopics,
    }
    localStorage.setItem("onboarding_progress", JSON.stringify(progress))
  }, [
    currentStep,
    industry,
    customIndustry,
    contentTopics,
    selectedPlatforms,
    platformPriorities,
    voiceSamples,
    brandGuidelinesDo,
    brandGuidelinesDont,
    avoidTopics,
  ])

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate step 1
      const finalIndustry = industry === "Other" ? customIndustry : industry
      if (!finalIndustry || finalIndustry.trim().length === 0) {
        toast.error("Please select or enter an industry")
        return
      }
      if (contentTopics.length === 0) {
        toast.error("Please add at least one content topic")
        return
      }
    } else if (currentStep === 2) {
      // Validate step 2
      if (selectedPlatforms.length === 0) {
        toast.error("Please select at least one platform")
        return
      }
    } else if (currentStep === 3) {
      // Validate step 3 - at least one sample per selected platform
      const hasSamples = selectedPlatforms.some(
        (platform) => voiceSamples[platform] && voiceSamples[platform].length > 0
      )
      if (!hasSamples) {
        toast.error("Please add at least one voice sample for your selected platforms")
        return
      }
    }

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step)
    } else {
      await handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const finalIndustry = industry === "Other" ? customIndustry : industry

      // Step 1: Save preferences
      await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: finalIndustry,
          content_topics: contentTopics,
          platform_priorities: platformPriorities,
          brand_guidelines_do: brandGuidelinesDo,
          brand_guidelines_dont: brandGuidelinesDont,
          avoid_topics: avoidTopics,
        }),
      })

      // Step 2: Save voice samples
      const allSamples = selectedPlatforms.flatMap((platform) =>
        (voiceSamples[platform] || []).map((sample) => ({
          platform,
          sample_text: sample.text,
          performance_notes: sample.notes,
        }))
      )

      if (allSamples.length > 0) {
        await fetch("/api/onboarding/voice-samples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ samples: allSamples }),
        })
      }

      // Step 3: Complete onboarding
      await fetch("/api/onboarding/complete", {
        method: "POST",
      })

      // Clear saved progress
      localStorage.removeItem("onboarding_progress")

      toast.success("Onboarding complete! Welcome to PostDraft!")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete onboarding")
    } finally {
      setIsLoading(false)
    }
  }

  const addVoiceSample = (platform: Platform, text: string, notes?: string) => {
    setVoiceSamples((prev) => ({
      ...prev,
      [platform]: [...(prev[platform] || []), { text, notes }],
    }))
  }

  const removeVoiceSample = (platform: Platform, index: number) => {
    setVoiceSamples((prev) => ({
      ...prev,
      [platform]: (prev[platform] || []).filter((_, i) => i !== index),
    }))
  }

  const updateVoiceSample = (platform: Platform, index: number, text: string, notes?: string) => {
    setVoiceSamples((prev) => {
      const updated = [...(prev[platform] || [])]
      updated[index] = { text, notes }
      return { ...prev, [platform]: updated }
    })
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">
                {currentStep === 1 && "Tell us about your content"}
                {currentStep === 2 && "Which platforms do you use?"}
                {currentStep === 3 && "Show us your style"}
                {currentStep === 4 && "Set your boundaries"}
              </CardTitle>
              <CardDescription className="mt-2">
                Step {currentStep} of 4
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    step <= currentStep ? "bg-orange-500" : "bg-stone-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Industry & Topics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {industry === "Other" && (
                  <Input
                    placeholder="Enter your industry"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    maxLength={100}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Content Topics</Label>
                <ChipInput
                  value={contentTopics}
                  onChange={setContentTopics}
                  placeholder="Add a topic (e.g., AI, Productivity)"
                  maxItems={10}
                  maxLength={50}
                />
                {industry && COMMON_TOPICS[industry] && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-stone-500">Suggestions:</span>
                    {COMMON_TOPICS[industry]
                      .filter((topic) => !contentTopics.includes(topic))
                      .map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => {
                            if (contentTopics.length < 10 && !contentTopics.includes(topic)) {
                              setContentTopics([...contentTopics, topic])
                            }
                          }}
                          className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-md text-stone-700"
                        >
                          + {topic}
                        </button>
                      ))}
                  </div>
                )}
                <p className="text-xs text-stone-500">
                  Add topics you want to create content about (1-10 topics)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Platform Priorities */}
          {currentStep === 2 && (
            <PlatformPriority
              selectedPlatforms={selectedPlatforms}
              priorities={platformPriorities}
              onChange={(platforms, priorities) => {
                setSelectedPlatforms(platforms)
                setPlatformPriorities(priorities)
              }}
            />
          )}

          {/* Step 3: Brand Voice Samples */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {selectedPlatforms.length === 0 ? (
                <p className="text-stone-500 text-center py-8">
                  Please go back and select at least one platform first.
                </p>
              ) : (
                selectedPlatforms.map((platform) => {
                  const samples = voiceSamples[platform] || []
                  return (
                    <div key={platform} className="space-y-4 p-4 border border-stone-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold capitalize">{platform}</h3>
                        <span className="text-sm text-stone-500">
                          {samples.length} sample{samples.length !== 1 ? "s" : ""} (min 1, max 5)
                        </span>
                      </div>
                      {samples.map((sample, index) => (
                        <div key={index} className="space-y-2 p-3 bg-stone-50 rounded-md">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-2">
                              <Textarea
                                value={sample.text}
                                onChange={(e) =>
                                  updateVoiceSample(platform, index, e.target.value, sample.notes)
                                }
                                placeholder="Paste your best post here..."
                                rows={4}
                                maxLength={5000}
                              />
                              <Input
                                value={sample.notes || ""}
                                onChange={(e) =>
                                  updateVoiceSample(platform, index, sample.text, e.target.value)
                                }
                                placeholder="Why did this perform well? (optional)"
                                maxLength={200}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVoiceSample(platform, index)}
                              className="ml-2"
                            >
                              <span className="sr-only">Remove</span>
                              ×
                            </Button>
                          </div>
                          <p className="text-xs text-stone-500">
                            {sample.text.length} / 5000 characters
                          </p>
                        </div>
                      ))}
                      {samples.length < 5 && (
                        <VoiceSampleAdder
                          platform={platform}
                          onAdd={(text, notes) => addVoiceSample(platform, text, notes)}
                        />
                      )}
                    </div>
                  )
                })
              )}
              <p className="text-sm text-stone-500">
                These help our AI match your unique voice. Add 3-5 samples per platform for best
                results.
              </p>
            </div>
          )}

          {/* Step 4: Brand Guidelines */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Always include (Do&apos;s)</Label>
                <ChipInput
                  value={brandGuidelinesDo}
                  onChange={setBrandGuidelinesDo}
                  placeholder="Add guideline (e.g., Be conversational)"
                  maxItems={10}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Never include (Don&apos;ts)</Label>
                <ChipInput
                  value={brandGuidelinesDont}
                  onChange={setBrandGuidelinesDont}
                  placeholder="Add guideline (e.g., No jargon)"
                  maxItems={10}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Topics to avoid</Label>
                <ChipInput
                  value={avoidTopics}
                  onChange={setAvoidTopics}
                  placeholder="Add topic (e.g., Politics)"
                  maxItems={10}
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep === 4 ? "Completing..." : "Saving..."}
                </>
              ) : currentStep === 4 ? (
                "Complete Setup"
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VoiceSampleAdder({
  platform,
  onAdd,
}: {
  platform: Platform
  onAdd: (text: string, notes?: string) => void
}) {
  const [text, setText] = useState("")
  const [notes, setNotes] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (text.trim().length < 10) {
      toast.error("Sample text must be at least 10 characters")
      return
    }
    if (text.trim().length > 5000) {
      toast.error("Sample text must be 5000 characters or less")
      return
    }
    onAdd(text.trim(), notes.trim() || undefined)
    setText("")
    setNotes("")
    setIsAdding(false)
  }

  if (!isAdding) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsAdding(true)}
        className="w-full"
      >
        + Add Sample
      </Button>
    )
  }

  return (
    <div className="space-y-2 p-3 border border-dashed border-stone-300 rounded-md">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your best post here..."
        rows={4}
        maxLength={5000}
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Why did this perform well? (optional)"
        maxLength={200}
      />
      <div className="flex gap-2">
        <Button type="button" onClick={handleAdd} size="sm">
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsAdding(false)
            setText("")
            setNotes("")
          }}
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
