"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Loader2, TrendingUp, Database, ArrowRight, FileText, Sparkles } from "lucide-react"

interface TrendingTopic {
  id: string
  title: string
  description: string | null
  trend_score: number | null
  niche_id: string | null
  discovered_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [trends, setTrends] = useState<TrendingTopic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [generatingPost, setGeneratingPost] = useState<string | null>(null)
  const [stats, setStats] = useState({
    trendingTopics: 0,
    generatedPosts: 0,
    activeSources: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    loadTrends()
    loadStats()
  }, [])

  const loadTrends = async () => {
    setIsLoading(true)
    try {
      const data = await api.trends.discover(10)
      setTrends(data.trends as TrendingTopic[])
    } catch (error) {
      toast.error("Failed to load trending topics")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    setIsLoadingStats(true)
    try {
      // Load trending topics count
      const trendsData = await api.trends.discover(100)
      const trendingCount = (trendsData.trends as TrendingTopic[]).length

      // Load generated posts count
      const postsData = await api.posts.getSaved()
      const postsCount = (postsData.posts || []).length

      // Load active sources count
      const sourcesData = await api.sources.list()
      const activeSourcesCount = (sourcesData.sources || []).filter(
        (source: any) => source.is_active !== false
      ).length

      setStats({
        trendingTopics: trendingCount,
        generatedPosts: postsCount,
        activeSources: activeSourcesCount,
      })
    } catch (error) {
      console.error("Failed to load stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleGeneratePost = async (topicId: string) => {
    setGeneratingPost(topicId)
    try {
      const post = await api.posts.generate(topicId, "multi")
      toast.success("Post generated successfully!")
      router.push(`/posts?highlight=${post.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate post")
    } finally {
      setGeneratingPost(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Dashboard</h1>
        <p className="mt-2 text-base text-stone-600">
          Discover trending topics and generate content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Trending Topics Stat Card */}
        <div className="group rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-stone-900">
            {isLoadingStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            ) : (
              stats.trendingTopics
            )}
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-900">
            Trending Topics
          </div>
          <div className="mt-1 text-sm text-stone-600">
            Available to explore
          </div>
        </div>

        {/* Generated Posts Stat Card */}
        <div className="group rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-stone-900">
            {isLoadingStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            ) : (
              stats.generatedPosts
            )}
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-900">
            Generated Posts
          </div>
          <div className="mt-1 text-sm text-stone-600">
            Total posts created
          </div>
        </div>

        {/* Active Sources Stat Card */}
        <div className="group rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-stone-900">
            {isLoadingStats ? (
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            ) : (
              stats.activeSources
            )}
          </div>
          <div className="mt-1 text-sm font-semibold text-stone-900">
            Active Sources
          </div>
          <div className="mt-1 text-sm text-stone-600">
            Content sources active
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trending Topics Action Card */}
        <div className="group rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Trending Topics</h3>
              <p className="text-sm text-stone-600">
                Explore the latest trending topics in your niches
              </p>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
            onClick={() => router.push("/posts")}
          >
            Explore Topics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Quick Generate Action Card */}
        <div className="group rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-md hover:scale-[1.01]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Quick Generate</h3>
              <p className="text-sm text-stone-600">
                Generate a post from trending topics instantly
              </p>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
            onClick={() => router.push("/posts")}
          >
            Generate Post
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Trending Topics Section */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        {/* Header */}
        <div className="rounded-t-2xl bg-gradient-to-b from-stone-50 to-white px-6 py-4">
          <h2 className="text-lg font-bold text-stone-900">Trending Topics</h2>
          <p className="mt-1 text-sm text-stone-600">
            Top trending topics in your selected niches
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            </div>
          ) : trends.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-purple-600">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">
                No trending topics found
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                Check back later for new trending topics in your niches
              </p>
              <Button
                className="mt-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
                onClick={loadTrends}
              >
                Refresh Topics
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {trends.map((trend) => (
                <div
                  key={trend.id}
                  className="flex items-start justify-between rounded-lg border border-stone-200 bg-white p-4 transition-all hover:shadow-sm"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-900">{trend.title}</h3>
                      {trend.trend_score && (
                        <Badge className="bg-stone-100 text-stone-700 hover:bg-stone-100">
                          Score: {trend.trend_score}
                        </Badge>
                      )}
                    </div>
                    {trend.description && (
                      <p className="text-sm text-stone-600">
                        {trend.description}
                      </p>
                    )}
                    <p className="text-xs text-stone-500">
                      Discovered{" "}
                      {new Date(trend.discovered_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGeneratePost(trend.id)}
                    disabled={generatingPost === trend.id}
                    className="ml-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {generatingPost === trend.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Post
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
