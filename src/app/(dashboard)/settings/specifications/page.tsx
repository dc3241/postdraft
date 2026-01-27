"use client"

import * as React from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ChipInput } from "@/components/onboarding/chip-input"
import { PlatformPriority, type Platform } from "@/components/onboarding/platform-priority"
import { PageHeader } from "@/components/shared/page-header"
import { toast } from "sonner"
import { Loader2, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { api } from "@/lib/api-client"
import type {
  UserPreferences,
  BrandVoiceSample,
} from "@/lib/services/user-preferences"

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

type Tab = "profile" | "platforms" | "voice" | "guidelines"

export default function SpecificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [voiceSamples, setVoiceSamples] = useState<BrandVoiceSample[]>([])

  // Form state
  const [industry, setIndustry] = useState("")
  const [customIndustry, setCustomIndustry] = useState("")
  const [contentTopics, setContentTopics] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [platformPriorities, setPlatformPriorities] = useState<Record<string, number>>({})
  const [brandGuidelinesDo, setBrandGuidelinesDo] = useState<string[]>([])
  const [brandGuidelinesDont, setBrandGuidelinesDont] = useState<string[]>([])
  const [avoidTopics, setAvoidTopics] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/preferences")
      if (!response.ok) throw new Error("Failed to load preferences")
      const data = await response.json()
      
      setPreferences(data.preferences)
      setVoiceSamples(data.voice_samples || [])

      if (data.preferences) {
        // Handle industry: check if it's a predefined option or custom
        const savedIndustry = data.preferences.industry || ""
        const predefinedIndustries = INDUSTRIES.filter((ind) => ind !== "Other")
        
        if (savedIndustry && predefinedIndustries.includes(savedIndustry)) {
          // It's a predefined industry
          setIndustry(savedIndustry)
          setCustomIndustry("")
        } else if (savedIndustry) {
          // It's a custom industry
          setIndustry("Other")
          setCustomIndustry(savedIndustry)
        } else {
          // No industry set
          setIndustry("")
          setCustomIndustry("")
        }
        
        setContentTopics(data.preferences.content_topics || [])
        setPlatformPriorities(data.preferences.platform_priorities || {})
        setBrandGuidelinesDo(data.preferences.brand_guidelines_do || [])
        setBrandGuidelinesDont(data.preferences.brand_guidelines_dont || [])
        setAvoidTopics(data.preferences.avoid_topics || [])

        // Set selected platforms from priorities
        const platforms = Object.keys(data.preferences.platform_priorities || {}) as Platform[]
        setSelectedPlatforms(platforms)
      }
    } catch (error) {
      toast.error("Failed to load preferences")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      // Validate custom industry if "Other" is selected
      if (industry === "Other" && !customIndustry?.trim()) {
        toast.error("Please enter a custom industry")
        setIsSaving(false)
        return
      }
      
      const finalIndustry = industry === "Other" ? customIndustry.trim() : industry
      
      await fetch("/api/user/preferences", {
        method: "PATCH",
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

      toast.success("Profile saved successfully")
      await loadData()
    } catch (error) {
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePlatforms = async () => {
    setIsSaving(true)
    try {
      // Validate custom industry if "Other" is selected
      if (industry === "Other" && !customIndustry?.trim()) {
        toast.error("Please enter a custom industry")
        setIsSaving(false)
        return
      }
      
      const finalIndustry = industry === "Other" ? customIndustry.trim() : industry
      
      await fetch("/api/user/preferences", {
        method: "PATCH",
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

      toast.success("Platform settings saved successfully")
      await loadData()
    } catch (error) {
      toast.error("Failed to save platform settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddVoiceSample = async (platform: Platform, text: string, notes?: string) => {
    try {
      await fetch("/api/user/voice-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          sample_text: text,
          performance_notes: notes,
        }),
      })

      toast.success("Voice sample added")
      await loadData()
    } catch (error) {
      toast.error("Failed to add voice sample")
    }
  }

  const handleDeleteVoiceSample = async (sampleId: string) => {
    try {
      await fetch(`/api/user/voice-samples/${sampleId}`, {
        method: "DELETE",
      })

      toast.success("Voice sample deleted")
      await loadData()
    } catch (error) {
      toast.error("Failed to delete voice sample")
    }
  }

  const handleSaveGuidelines = async () => {
    setIsSaving(true)
    try {
      // Validate custom industry if "Other" is selected
      if (industry === "Other" && !customIndustry?.trim()) {
        toast.error("Please enter a custom industry")
        setIsSaving(false)
        return
      }
      
      const finalIndustry = industry === "Other" ? customIndustry.trim() : industry
      
      await fetch("/api/user/preferences", {
        method: "PATCH",
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

      toast.success("Brand guidelines saved successfully")
      await loadData()
    } catch (error) {
      toast.error("Failed to save brand guidelines")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Brand Profile" },
    { id: "platforms", label: "Platform Settings" },
    { id: "voice", label: "Brand Voice" },
    { id: "guidelines", label: "Brand Guidelines" },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title="Specifications"
        description="Manage your brand voice, content preferences, and platform settings"
      />

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Tab 1: Brand Profile */}
          {activeTab === "profile" && (
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
                  placeholder="Add a topic"
                  maxItems={10}
                  maxLength={50}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Platform Settings */}
          {activeTab === "platforms" && (
            <div className="space-y-6">
              <PlatformPriority
                selectedPlatforms={selectedPlatforms}
                priorities={platformPriorities}
                onChange={(platforms, priorities) => {
                  setSelectedPlatforms(platforms)
                  setPlatformPriorities(priorities)
                }}
              />
              <div className="flex justify-end">
                <Button onClick={handleSavePlatforms} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Tab 3: Brand Voice */}
          {activeTab === "voice" && (
            <div className="space-y-6">
              {(["twitter", "linkedin", "instagram", "facebook", "tiktok"] as Platform[]).map(
                (platform) => {
                  const platformSamples = voiceSamples.filter((s) => s.platform === platform)
                  return (
                    <div key={platform} className="space-y-4 p-4 border border-stone-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold capitalize">{platform}</h3>
                        <VoiceSampleModal
                          platform={platform}
                          onAdd={handleAddVoiceSample}
                        />
                      </div>
                      {platformSamples.length === 0 ? (
                        <p className="text-sm text-stone-500">No samples yet</p>
                      ) : (
                        <div className="space-y-3">
                          {platformSamples.map((sample) => (
                            <VoiceSampleRow
                              key={sample.id}
                              sample={sample}
                              onDelete={() => handleDeleteVoiceSample(sample.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>
          )}

          {/* Tab 4: Brand Guidelines */}
          {activeTab === "guidelines" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Always include (Do&apos;s)</Label>
                <ChipInput
                  value={brandGuidelinesDo}
                  onChange={setBrandGuidelinesDo}
                  placeholder="Add guideline"
                  maxItems={10}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Never include (Don&apos;ts)</Label>
                <ChipInput
                  value={brandGuidelinesDont}
                  onChange={setBrandGuidelinesDont}
                  placeholder="Add guideline"
                  maxItems={10}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Topics to avoid</Label>
                <ChipInput
                  value={avoidTopics}
                  onChange={setAvoidTopics}
                  placeholder="Add topic"
                  maxItems={10}
                  maxLength={100}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGuidelines} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function VoiceSampleRow({
  sample,
  onDelete,
}: {
  sample: BrandVoiceSample
  onDelete: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="p-3 bg-stone-50 rounded-md space-y-2">
      <p
        className={`text-sm whitespace-pre-wrap ${!isExpanded ? "line-clamp-3" : ""}`}
      >
        {sample.sample_text}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-stone-600 hover:text-stone-900"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show more
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
      {sample.performance_notes && (
        <p className="text-xs text-stone-500">
          <strong>Performance:</strong> {sample.performance_notes}
        </p>
      )}
    </div>
  )
}

function VoiceSampleModal({
  platform,
  onAdd,
}: {
  platform: Platform
  onAdd: (platform: Platform, text: string, notes?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      toast.error("Sample text must be at least 10 characters")
      return
    }
    if (text.trim().length > 5000) {
      toast.error("Sample text must be 5000 characters or less")
      return
    }

    setIsSubmitting(true)
    try {
      await onAdd(platform, text.trim(), notes.trim() || undefined)
      setText("")
      setNotes("")
      setOpen(false)
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Sample
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {platform} Voice Sample</DialogTitle>
          <DialogDescription>
            Paste one of your best {platform} posts to help our AI match your voice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sample Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your post here..."
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-stone-500">{text.length} / 5000 characters</p>
          </div>
          <div className="space-y-2">
            <Label>Performance Notes (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did this perform well?"
              maxLength={200}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Sample"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
