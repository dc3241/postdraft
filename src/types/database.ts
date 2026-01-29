export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VoiceStyle = "learned" | "professional" | "casual" | "educational" | "provocative" | "inspirational"
export type Platform = "twitter" | "linkedin" | "facebook" | "instagram" | "other" | "multi"
export type PostStatus = "generated" | "edited" | "posted" | "archived"
export type GenerationType = "manual" | "auto"
export type PlanTier = "free" | "pro" | "team" | "enterprise"
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing"
export type SourceType = "reddit" | "google_trends" | "producthunt" | "hackernews" | "web" | "newsletter" | "custom_link" | "other"
export type ScrapeFrequency = "hourly" | "daily" | "weekly"

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          selected_niches: string[]
          voice_style: VoiceStyle
          daily_post_count: number
          auto_generate_enabled: boolean
          newsletter_weight: number
          notification_email: boolean
          notification_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          selected_niches?: string[]
          voice_style?: VoiceStyle
          daily_post_count?: number
          auto_generate_enabled?: boolean
          newsletter_weight?: number
          notification_email?: boolean
          notification_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          selected_niches?: string[]
          voice_style?: VoiceStyle
          daily_post_count?: number
          auto_generate_enabled?: boolean
          newsletter_weight?: number
          notification_email?: boolean
          notification_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      voice_samples: {
        Row: {
          id: string
          user_id: string
          content: string
          platform: Platform | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          platform?: Platform | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          platform?: Platform | null
          uploaded_at?: string
        }
      }
      voice_analysis: {
        Row: {
          id: string
          user_id: string
          tone: string | null
          style_notes: string | null
          typical_length: number | null
          common_phrases: string[]
          analyzed_at: string
          prompt_template: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tone?: string | null
          style_notes?: string | null
          typical_length?: number | null
          common_phrases?: string[]
          analyzed_at?: string
          prompt_template?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tone?: string | null
          style_notes?: string | null
          typical_length?: number | null
          common_phrases?: string[]
          analyzed_at?: string
          prompt_template?: string | null
        }
      }
      niches: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      scrape_sources: {
        Row: {
          id: string
          niche_id: string
          source_type: SourceType
          source_url: string
          source_name: string
          is_active: boolean
          scrape_frequency: ScrapeFrequency
          last_scraped_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          niche_id: string
          source_type: SourceType
          source_url: string
          source_name: string
          is_active?: boolean
          scrape_frequency?: ScrapeFrequency
          last_scraped_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          niche_id?: string
          source_type?: SourceType
          source_url?: string
          source_name?: string
          is_active?: boolean
          scrape_frequency?: ScrapeFrequency
          last_scraped_at?: string | null
          created_at?: string
        }
      }
      custom_sources: {
        Row: {
          id: string
          user_id: string
          source_url: string
          source_name: string
          source_type: string | null
          is_active: boolean
          last_scraped_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_url: string
          source_name: string
          source_type?: string | null
          is_active?: boolean
          last_scraped_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_url?: string
          source_name?: string
          source_type?: string | null
          is_active?: boolean
          last_scraped_at?: string | null
          created_at?: string
        }
      }
      trending_topics: {
        Row: {
          id: string
          user_id: string | null
          niche_id: string | null
          source_id: string | null
          newsletter_source_id: string | null
          source_type: SourceType
          title: string
          description: string | null
          content_snippet: string | null
          source_url: string | null
          trend_score: number | null
          discovered_at: string
          expires_at: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          niche_id?: string | null
          source_id?: string | null
          newsletter_source_id?: string | null
          source_type: SourceType
          title: string
          description?: string | null
          content_snippet?: string | null
          source_url?: string | null
          trend_score?: number | null
          discovered_at?: string
          expires_at?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          niche_id?: string | null
          source_id?: string | null
          newsletter_source_id?: string | null
          source_type?: SourceType
          title?: string
          description?: string | null
          content_snippet?: string | null
          source_url?: string | null
          trend_score?: number | null
          discovered_at?: string
          expires_at?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      newsletter_sources: {
        Row: {
          id: string
          user_id: string
          sender_id: string
          source_name: string | null
          source_type: string
          is_active: boolean
          last_scraped_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sender_id: string
          source_name?: string | null
          source_type?: string
          is_active?: boolean
          last_scraped_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sender_id?: string
          source_name?: string | null
          source_type?: string
          is_active?: boolean
          last_scraped_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      generated_posts: {
        Row: {
          id: string
          user_id: string
          topic_id: string | null
          platform: Platform
          content: string
          status: PostStatus
          generation_type: GenerationType
          was_used: boolean
          engagement_data: Json | null
          generated_at: string
          posted_at: string | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          topic_id?: string | null
          platform: Platform
          content: string
          status?: PostStatus
          generation_type?: GenerationType
          was_used?: boolean
          engagement_data?: Json | null
          generated_at?: string
          posted_at?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string | null
          platform?: Platform
          content?: string
          status?: PostStatus
          generation_type?: GenerationType
          was_used?: boolean
          engagement_data?: Json | null
          generated_at?: string
          posted_at?: string | null
          archived_at?: string | null
        }
      }
      auto_generation_logs: {
        Row: {
          id: string
          user_id: string
          posts_generated: number
          topics_used: Json
          generated_at: string
          notification_sent: boolean
        }
        Insert: {
          id?: string
          user_id: string
          posts_generated?: number
          topics_used?: Json
          generated_at?: string
          notification_sent?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          posts_generated?: number
          topics_used?: Json
          generated_at?: string
          notification_sent?: boolean
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_tier: PlanTier
          status: SubscriptionStatus
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_tier?: PlanTier
          status?: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_tier?: PlanTier
          status?: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          period_start: string
          manual_generations: number
          auto_generations: number
          custom_sources_count: number
          api_calls_made: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period_start: string
          manual_generations?: number
          auto_generations?: number
          custom_sources_count?: number
          api_calls_made?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period_start?: string
          manual_generations?: number
          auto_generations?: number
          custom_sources_count?: number
          api_calls_made?: number
          created_at?: string
        }
      }
    }
  }
}

export type GeneratedPost = Database["public"]["Tables"]["generated_posts"]["Row"]
