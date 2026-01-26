"use client"

import { Copy, Edit2, Trash2, Linkedin, Facebook, Twitter, Instagram, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 25000,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  multi: 3000,
}

export interface Post {
  id: string
  content: string
  platform: string
  status: string
  generated_at: string
  topic_id: string | null
}

function PlatformIcon({ platform }: { platform: string }) {
  const size = 18
  switch (platform?.toLowerCase()) {
    case "twitter":
      return <Twitter className="size-[18px] text-[#1DA1F2]" aria-hidden />
    case "linkedin":
      return <Linkedin className="size-[18px] text-[#0A66C2]" aria-hidden />
    case "facebook":
      return <Facebook className="size-[18px] text-[#1877F2]" aria-hidden />
    case "instagram":
      return <Instagram className="size-[18px] text-[#E4405F]" aria-hidden />
    default:
      return <LayoutGrid className="size-[18px] text-stone-600" aria-hidden />
  }
}

function getStatusStyles(status: string) {
  switch (status) {
    case "posted":
      return "bg-green-100 text-green-700 border-green-200"
    case "edited":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "archived":
      return "bg-stone-100 text-stone-600 border-stone-200"
    default:
      return "bg-stone-100 text-stone-700 border-stone-200"
  }
}

function getPostTitle(post: Post): string {
  // Extract first line as title (up to 100 chars)
  const firstLine = post.content.split('\n')[0].trim()
  if (firstLine.length > 100) {
    return firstLine.substring(0, 100) + '...'
  }
  return firstLine || 'Untitled Post'
}

export function PostCard({
  post,
  id,
  isHighlighted,
  onEdit,
  onCopy,
  onDelete,
}: {
  post: Post
  id?: string
  isHighlighted?: boolean
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  const title = getPostTitle(post)
  const limit = PLATFORM_LIMITS[post.platform?.toLowerCase()] ?? 3000
  const count = post.content.length
  const countLabel = limit < 100000 ? `${count}/${limit}` : `${count} chars`

  return (
    <article
      id={id}
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onEdit()
        }
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all",
        "hover:border-stone-300 hover:shadow-md hover:bg-stone-50/50",
        isHighlighted && "ring-2 ring-orange-500 shadow-md"
      )}
    >
      {/* Left: Platform icon + status */}
      <div className="flex shrink-0 items-center gap-2">
        <PlatformIcon platform={post.platform} />
        <Badge className={cn("shrink-0 border", getStatusStyles(post.status))}>
          {post.status}
        </Badge>
      </div>

      {/* Middle: Title + timestamp (takes up remaining space) */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-lg font-medium text-stone-900">
          {title}
        </h3>
        <p className="text-xs text-stone-500">
          {new Date(post.generated_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Right: Character count + actions */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-stone-500">{countLabel}</span>
        <div
          className="flex shrink-0 gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            onClick={onCopy}
            aria-label="Copy post"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            onClick={onEdit}
            aria-label="Edit post"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={onDelete}
            aria-label="Delete post"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  )
}
