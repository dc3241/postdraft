"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2, Plus, Sparkles, FileText } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { PostCard, type Post } from "@/components/posts/PostCard"
import { PostModal } from "@/components/posts/PostModal"
import { Label } from "@/components/ui/label"

export default function PostsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams?.get("highlight")

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const loadPosts = useCallback(async () => {
    setIsLoading(true)
    try {
      const filterValue = statusFilter === "all" ? undefined : statusFilter
      const data = await api.posts.getSaved(filterValue)
      setPosts(data.posts as Post[])
    } catch (error) {
      toast.error("Failed to load posts")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (highlightId) {
      const t = setTimeout(() => {
        const el = document.getElementById(`post-${highlightId}`)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 500)
      return () => clearTimeout(t)
    }
  }, [highlightId, posts.length])

  const handleGenerate = async (
    topicId: string | null,
    platform: string,
    customPrompt?: string
  ) => {
    try {
      const post = await api.posts.generate(topicId, platform, customPrompt)
      toast.success("Post generated successfully!")
      setGenerateDialogOpen(false)
      await loadPosts()
      router.push(`/posts?highlight=${post.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate post"
      )
    }
  }

  const handleEdit = (post: Post) => {
    setEditingPost(post)
    setEditContent(post.content)
  }

  const handleSaveEdit = async () => {
    if (!editingPost) return
    setIsSaving(true)
    try {
      await api.posts.update(editingPost.id, {
        content: editContent,
        status: "edited",
      })
      toast.success("Post updated successfully!")
      setEditingPost(null)
      await loadPosts()
    } catch {
      toast.error("Failed to update post")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!editingPost?.topic_id) return
    setIsRegenerating(true)
    try {
      const post = await api.posts.generate(
        editingPost.topic_id,
        editingPost.platform
      )
      toast.success("Post regenerated!")
      setEditingPost(null)
      await loadPosts()
      router.push(`/posts?highlight=${post.id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate post"
      )
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!editingPost) return
    if (!confirm("Are you sure you want to delete this post?")) return
    try {
      await api.posts.delete(editingPost.id)
      toast.success("Post deleted!")
      setEditingPost(null)
      await loadPosts()
    } catch {
      toast.error("Failed to delete post")
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard!")
  }

  const modalOpen = !!editingPost

  return (
    <div className="space-y-8">
      <PageHeader
        title="Posts"
        description="Manage your generated posts"
        action={{
          label: "Generate Post",
          onClick: () => setGenerateDialogOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="rounded-xl border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-stone-900">
              Generate New Post
            </DialogTitle>
            <DialogDescription className="text-stone-600">
              Generate a post from a trending topic or with a custom prompt
            </DialogDescription>
          </DialogHeader>
          <GeneratePostForm onSubmit={handleGenerate} />
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="edited">Edited</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => loadPosts()}
          className="border-stone-200 hover:bg-stone-50"
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No posts found"
              description="Generate your first post to get started!"
              action={{
                label: "Generate Post",
                onClick: () => setGenerateDialogOpen(true),
              }}
              iconColor="purple"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              id={`post-${post.id}`}
              isHighlighted={highlightId === post.id}
              onEdit={() => handleEdit(post)}
              onCopy={() => copyToClipboard(post.content)}
              onDelete={() => {
                if (confirm("Are you sure you want to delete this post?")) {
                  api.posts
                    .delete(post.id)
                    .then(() => {
                      toast.success("Post deleted!")
                      loadPosts()
                    })
                    .catch(() => toast.error("Failed to delete post"))
                }
              }}
            />
          ))}
        </div>
      )}

      <PostModal
        post={editingPost}
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) setEditingPost(null)
        }}
        editContent={editContent}
        onEditContentChange={setEditContent}
        onSave={handleSaveEdit}
        onRegenerate={handleRegenerate}
        onCopy={() => copyToClipboard(editContent)}
        onDelete={handleDelete}
        isSaving={isSaving}
        isRegenerating={isRegenerating}
      />
    </div>
  )
}

function GeneratePostForm({
  onSubmit,
}: {
  onSubmit: (
    topicId: string | null,
    platform: string,
    customPrompt?: string
  ) => Promise<void>
}) {
  const [platform, setPlatform] = useState("multi")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(null, platform, customPrompt || undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="platform" className="text-stone-700">
          Platform
        </Label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twitter">Twitter</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="multi">Multi-platform</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="customPrompt" className="text-stone-700">
          Custom Prompt (Optional)
        </Label>
        <Textarea
          id="customPrompt"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Describe what you want the post to be about..."
          rows={4}
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Post
          </>
        )}
      </Button>
    </form>
  )
}
