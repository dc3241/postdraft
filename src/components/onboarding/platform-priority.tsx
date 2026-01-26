"use client"

"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export type Platform = "twitter" | "linkedin" | "instagram" | "facebook" | "tiktok"

interface PlatformPriorityProps {
  selectedPlatforms: Platform[]
  priorities: Record<string, number>
  onChange: (platforms: Platform[], priorities: Record<string, number>) => void
  disabled?: boolean
}

const ALL_PLATFORMS: { value: Platform; label: string }[] = [
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
]

export function PlatformPriority({
  selectedPlatforms,
  priorities,
  onChange,
  disabled,
}: PlatformPriorityProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  const handleToggle = (platform: Platform) => {
    if (disabled) return

    if (selectedPlatforms.includes(platform)) {
      // Remove platform
      const newPlatforms = selectedPlatforms.filter((p) => p !== platform)
      const newPriorities = { ...priorities }
      delete newPriorities[platform]

      // Reorder priorities
      const reorderedPriorities: Record<string, number> = {}
      newPlatforms.forEach((p, index) => {
        reorderedPriorities[p] = index + 1
      })

      onChange(newPlatforms, reorderedPriorities)
    } else {
      // Add platform
      const newPlatforms = [...selectedPlatforms, platform]
      const newPriorities = {
        ...priorities,
        [platform]: newPlatforms.length,
      }
      onChange(newPlatforms, newPriorities)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newPlatforms = [...selectedPlatforms]
    const [removed] = newPlatforms.splice(draggedIndex, 1)
    newPlatforms.splice(dragOverIndex, 0, removed)

    const newPriorities: Record<string, number> = {}
    newPlatforms.forEach((platform, index) => {
      newPriorities[platform] = index + 1
    })

    onChange(newPlatforms, newPriorities)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const sortedPlatforms = React.useMemo(() => {
    return selectedPlatforms
      .map((platform) => ({
        platform,
        priority: priorities[platform] || 999,
      }))
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.platform)
  }, [selectedPlatforms, priorities])

  return (
    <div className="space-y-4">
      {/* Unselected platforms */}
      <div className="space-y-2">
        {ALL_PLATFORMS.filter((p) => !selectedPlatforms.includes(p.value)).map((platform) => (
          <label
            key={platform.value}
            className={cn(
              "flex items-center gap-3 p-3 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Checkbox
              checked={false}
              onCheckedChange={() => handleToggle(platform.value)}
              disabled={disabled}
            />
            <span className="font-medium text-stone-900">{platform.label}</span>
          </label>
        ))}
      </div>

      {/* Selected platforms with drag-to-reorder */}
      {sortedPlatforms.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700 mb-2">
            Priority Order (drag to reorder):
          </p>
          {sortedPlatforms.map((platform, index) => {
            const platformInfo = ALL_PLATFORMS.find((p) => p.value === platform)
            return (
              <div
                key={platform}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg cursor-move transition-colors",
                  draggedIndex === index
                    ? "opacity-50 border-orange-500"
                    : dragOverIndex === index
                    ? "border-orange-500 bg-orange-50"
                    : "border-stone-200 hover:bg-stone-50",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <GripVertical className="h-5 w-5 text-stone-400" />
                <div className="flex-1 flex items-center gap-3">
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => handleToggle(platform)}
                    disabled={disabled}
                  />
                  <span className="font-medium text-stone-900">
                    {platformInfo?.label || platform}
                  </span>
                  <span className="ml-auto text-sm text-stone-500">
                    Priority {index + 1}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedPlatforms.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-4">
          Select at least one platform to continue
        </p>
      )}
    </div>
  )
}

// Simple Checkbox component
function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  ...props
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
} & Omit<React.ComponentProps<"input">, "type" | "checked" | "onChange">) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
      {...props}
    />
  )
}
