"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Copy, Trash2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Post } from "./PostCard"

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 25000,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  multi: 3000,
}

export interface PostModalProps {
  post: Post | null
  open: boolean
  onOpenChange: (open: boolean) => void
  editContent: string
  onEditContentChange: (value: string) => void
  onSave: () => void
  onRegenerate: () => void
  onCopy: () => void
  onDelete: () => void
  isSaving?: boolean
  isRegenerating?: boolean
  triggerRef?: React.RefObject<HTMLElement | null>
}

export function PostModal({
  post,
  open,
  onOpenChange,
  editContent,
  onEditContentChange,
  onSave,
  onRegenerate,
  onCopy,
  onDelete,
  isSaving = false,
  isRegenerating = false,
  triggerRef,
}: PostModalProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onSave()
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "c") {
      e.preventDefault()
      onCopy()
      return
    }
  }

  const platform = post?.platform ?? "multi"
  const limit = PLATFORM_LIMITS[platform?.toLowerCase()] ?? 3000
  const count = editContent.length
  const overLimit = limit < 100000 && count > limit

  if (!post) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        aria-describedby="post-modal-desc"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          textareaRef.current?.focus()
        }}
        onCloseAutoFocus={() => {
          triggerRef?.current?.focus()
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "max-h-[80vh] w-[calc(100vw-2rem)] max-w-[700px] overflow-y-auto rounded-xl border-stone-200 duration-200",
          "sm:max-w-[min(700px,90vw)]"
        )}
      >
        <DialogHeader>
          <DialogTitle id="post-modal-title" className="text-stone-900">
            Edit Post
          </DialogTitle>
          <DialogDescription id="post-modal-desc" className="text-stone-600">
            <span className="font-medium capitalize">{platform}</span>
            {" · "}
            {new Date(post.generated_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            placeholder="Post content..."
            rows={12}
            className="min-h-[200px] resize-y font-mono text-sm"
            disabled={isSaving || isRegenerating}
          />
          <p
            className={cn(
              "text-right text-xs",
              overLimit ? "text-red-600" : "text-stone-500"
            )}
          >
            {limit < 100000 ? `${count} / ${limit}` : `${count} characters`}
          </p>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onSave}
              disabled={isSaving || isRegenerating}
              className="bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRegenerate}
              disabled={isSaving || isRegenerating || !post.topic_id}
              className="border-stone-200"
              title={!post.topic_id ? "Regenerate only available for topic-based posts" : undefined}
            >
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCopy}
              disabled={isSaving || isRegenerating}
              className="border-stone-200"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isSaving || isRegenerating}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
