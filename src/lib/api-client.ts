/**
 * Client-side API utilities for making requests to our API endpoints
 */

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Generic API fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include", // Include cookies for auth
  })

  const data = await response.json()

  if (!response.ok) {
    const error = data as ApiError
    throw new Error(error.error?.message || "An error occurred")
  }

  return data as T
}

/**
 * API client functions for each endpoint group
 */
export const api = {
  // Auth
  auth: {
    signup: async (email: string, password: string, fullName?: string) => {
      return apiFetch<{ user: unknown; session: unknown }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      })
    },
    login: async (email: string, password: string) => {
      return apiFetch<{ user: unknown; session: unknown }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    },
    logout: async () => {
      return apiFetch<{ success: boolean }>("/api/auth/logout", {
        method: "POST",
      })
    },
    session: async () => {
      return apiFetch<{ user: unknown; session: unknown }>("/api/auth/session")
    },
  },

  // Onboarding
  onboarding: {
    updateNiches: async (nicheIds: string[]) => {
      return apiFetch<{ success: boolean }>("/api/onboarding/niches", {
        method: "POST",
        body: JSON.stringify({ nicheIds }),
      })
    },
    addVoiceSample: async (content: string, platform?: string) => {
      return apiFetch("/api/onboarding/voice-samples", {
        method: "POST",
        body: JSON.stringify({ content, platform }),
      })
    },
    analyzeVoice: async () => {
      return apiFetch("/api/onboarding/analyze-voice", {
        method: "POST",
      })
    },
    complete: async () => {
      return apiFetch("/api/onboarding/complete", {
        method: "POST",
      })
    },
  },

  // Trends
  trends: {
    discover: async (limit = 20) => {
      return apiFetch<{ trends: unknown[] }>(
        `/api/trends/discover?limit=${limit}`
      )
    },
    getById: async (id: string) => {
      return apiFetch(`/api/trends/${id}`)
    },
  },

  // Posts
  posts: {
    generate: async (topicId: string | null, platform: string, customPrompt?: string) => {
      return apiFetch("/api/posts/generate", {
        method: "POST",
        body: JSON.stringify({ topicId, platform, customPrompt }),
      })
    },
    getSaved: async (status?: string, limit = 50) => {
      const params = new URLSearchParams()
      if (status) params.append("status", status)
      params.append("limit", limit.toString())
      return apiFetch<{ posts: unknown[] }>(`/api/posts/saved?${params}`)
    },
    getById: async (id: string) => {
      return apiFetch(`/api/posts/${id}`)
    },
    update: async (id: string, updates: unknown) => {
      return apiFetch(`/api/posts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      })
    },
    delete: async (id: string) => {
      return apiFetch<{ success: boolean }>(`/api/posts/${id}`, {
        method: "DELETE",
      })
    },
  },

  // Custom Sources
  sources: {
    list: async () => {
      return apiFetch<{ sources: unknown[] }>("/api/sources/custom")
    },
    create: async (sourceUrl: string, sourceName: string, sourceType?: string) => {
      return apiFetch("/api/sources/custom", {
        method: "POST",
        body: JSON.stringify({ sourceUrl, sourceName, sourceType }),
      })
    },
    getById: async (id: string) => {
      return apiFetch(`/api/sources/custom/${id}`)
    },
    update: async (id: string, updates: unknown) => {
      return apiFetch(`/api/sources/custom/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      })
    },
    delete: async (id: string) => {
      return apiFetch<{ success: boolean }>(`/api/sources/custom/${id}`, {
        method: "DELETE",
      })
    },
    triggerScrape: async (id: string) => {
      return apiFetch(`/api/sources/custom/${id}/scrape`, {
        method: "POST",
      })
    },
  },

  // Billing
  billing: {
    getSubscription: async () => {
      return apiFetch<{ subscription: unknown }>("/api/billing/subscription")
    },
    createCheckout: async (priceId: string, planTier: string) => {
      return apiFetch<{ sessionId: string; url: string }>(
        "/api/billing/create-checkout",
        {
          method: "POST",
          body: JSON.stringify({ priceId, planTier }),
        }
      )
    },
    createPortal: async () => {
      return apiFetch<{ url: string }>("/api/billing/create-portal", {
        method: "POST",
      })
    },
  },

  // Auto-generation
  autoGenerate: {
    trigger: async () => {
      return apiFetch("/api/auto-generate/trigger", {
        method: "POST",
      })
    },
    getLatest: async () => {
      return apiFetch<{ log: unknown }>("/api/auto-generate/latest")
    },
  },
}
