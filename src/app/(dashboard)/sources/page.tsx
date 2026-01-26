"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Loader2, Plus, Trash2, Edit2, Database, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"

interface CustomSource {
  id: string
  source_url: string
  source_name: string
  source_type: string | null
  is_active: boolean
  last_scraped_at: string | null
  created_at: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<CustomSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<CustomSource | null>(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    setIsLoading(true)
    try {
      const data = await api.sources.list()
      setSources(data.sources as CustomSource[])
    } catch (error) {
      toast.error("Failed to load sources")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (sourceUrl: string, sourceName: string, sourceType?: string) => {
    try {
      await api.sources.create(sourceUrl, sourceName, sourceType)
      toast.success("Source created successfully!")
      setDialogOpen(false)
      loadSources()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create source")
    }
  }

  const handleUpdate = async (id: string, updates: { sourceUrl?: string; sourceName?: string; sourceType?: string; isActive?: boolean }) => {
    try {
      await api.sources.update(id, updates)
      toast.success("Source updated successfully!")
      setEditingSource(null)
      loadSources()
    } catch (error) {
      toast.error("Failed to update source")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this source?")) return
    try {
      await api.sources.delete(id)
      toast.success("Source deleted!")
      loadSources()
    } catch (error) {
      toast.error("Failed to delete source")
    }
  }

  const handleTriggerScrape = async (id: string) => {
    try {
      await api.sources.triggerScrape(id)
      toast.success("Scrape triggered!")
      loadSources()
    } catch (error) {
      toast.error("Failed to trigger scrape")
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Custom Sources"
        description="Manage your custom content sources"
        action={{
          label: "Add Source",
          onClick: () => setDialogOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="rounded-xl border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Add Custom Source</DialogTitle>
            <DialogDescription className="text-stone-600">
              Add a new source to scrape for trending topics
            </DialogDescription>
          </DialogHeader>
          <SourceForm onSubmit={handleCreate} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Database}
              title="No custom sources yet"
              description="Add your first source to start discovering trending topics!"
              action={{
                label: "Add Source",
                onClick: () => setDialogOpen(true),
              }}
              iconColor="blue"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-stone-900">{source.source_name}</CardTitle>
                    <CardDescription className="mt-1 break-all text-stone-600">
                      {source.source_url}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSource(source)}
                      className="hover:bg-stone-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(source.id)}
                      className="hover:bg-red-50 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={source.is_active ? "default" : "secondary"}
                    className={
                      source.is_active
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-100"
                    }
                  >
                    {source.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {source.source_type && (
                    <Badge variant="outline" className="border-stone-200 text-stone-700">
                      {source.source_type}
                    </Badge>
                  )}
                </div>
                {source.last_scraped_at && (
                  <p className="text-xs text-stone-500">
                    Last scraped: {new Date(source.last_scraped_at).toLocaleString()}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-stone-200 hover:bg-stone-50"
                  onClick={() => handleTriggerScrape(source.id)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Trigger Scrape
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingSource && (
        <Dialog open={!!editingSource} onOpenChange={(open) => !open && setEditingSource(null)}>
          <DialogContent className="rounded-xl border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-stone-900">Edit Source</DialogTitle>
              <DialogDescription className="text-stone-600">
                Update your custom source settings
              </DialogDescription>
            </DialogHeader>
            <SourceForm
              source={editingSource}
              onSubmit={(url, name, type, isActive) =>
                handleUpdate(editingSource.id, {
                  sourceUrl: url !== editingSource.source_url ? url : undefined,
                  sourceName: name !== editingSource.source_name ? name : undefined,
                  sourceType: type !== editingSource.source_type ? type : undefined,
                  isActive: isActive !== editingSource.is_active ? isActive : undefined,
                })
              }
              onCancel={() => setEditingSource(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function SourceForm({
  source,
  onSubmit,
  onCancel,
}: {
  source?: CustomSource
  onSubmit: (url: string, name: string, type?: string, isActive?: boolean) => void
  onCancel: () => void
}) {
  const [url, setUrl] = useState(source?.source_url || "")
  const [name, setName] = useState(source?.source_name || "")
  const [type, setType] = useState(source?.source_type || "none")
  const [isActive, setIsActive] = useState(source?.is_active ?? true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !name) {
      toast.error("Please fill in all required fields")
      return
    }
    setIsSubmitting(true)
    try {
      const sourceType = type === "none" ? undefined : type
      await onSubmit(url, name, sourceType, isActive)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-stone-700">Source Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Blog"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url" className="text-stone-700">Source URL *</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type" className="text-stone-700">Source Type (Optional)</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="rss">RSS Feed</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-orange-500 focus:ring-orange-500"
        />
        <Label htmlFor="isActive" className="cursor-pointer text-stone-700">
          Active
        </Label>
      </div>
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1 border-stone-200 hover:bg-stone-50"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {source ? "Updating..." : "Creating..."}
            </>
          ) : (
            source ? "Update" : "Create"
          )}
        </Button>
      </div>
    </form>
  )
}
