-- PostDraft Initial Schema Migration
-- This migration creates all tables, indexes, RLS policies, triggers, and seed data
-- Run this migration in your Supabase SQL editor or via Supabase CLI

-- ============================================================================
-- 1. CREATE TABLES (in dependency order)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_profiles: Extends Supabase auth.users with application-specific data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    onboarding_completed boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- user_preferences: User customization settings (one-to-one with user_profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    selected_niches text[] DEFAULT '{}' NOT NULL,
    voice_style text DEFAULT 'learned' NOT NULL CHECK (voice_style IN ('learned', 'professional', 'casual', 'educational', 'provocative', 'inspirational')),
    daily_post_count integer DEFAULT 5 NOT NULL CHECK (daily_post_count BETWEEN 3 AND 10),
    auto_generate_enabled boolean DEFAULT false NOT NULL,
    newsletter_weight integer DEFAULT 40 NOT NULL CHECK (newsletter_weight BETWEEN 0 AND 100),
    notification_email boolean DEFAULT true NOT NULL,
    notification_time time DEFAULT '06:00:00' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- voice_samples: User-provided content samples for voice learning
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_samples (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    content text NOT NULL,
    platform text CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'instagram', 'other')),
    uploaded_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- voice_analysis: AI-generated analysis of user's voice/style
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    tone text,
    style_notes text,
    typical_length integer,
    common_phrases text[] DEFAULT '{}' NOT NULL,
    analyzed_at timestamptz DEFAULT now() NOT NULL,
    prompt_template text,
    CONSTRAINT voice_analysis_user_id_key UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- niches: Pre-populated content niches/categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.niches (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    icon text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- scrape_sources: Pre-configured sources for trending topic discovery
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scrape_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    niche_id text NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
    source_type text NOT NULL CHECK (source_type IN ('reddit', 'google_trends', 'producthunt', 'hackernews', 'other')),
    source_url text NOT NULL,
    source_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    scrape_frequency text DEFAULT 'daily' NOT NULL CHECK (scrape_frequency IN ('hourly', 'daily', 'weekly')),
    last_scraped_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- custom_sources: User-defined sources for trending topics
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    source_url text NOT NULL,
    source_name text NOT NULL,
    source_type text,
    is_active boolean DEFAULT true NOT NULL,
    last_scraped_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- trending_topics: Discovered trending topics from various sources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trending_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    niche_id text REFERENCES public.niches(id) ON DELETE SET NULL,
    source_id uuid,
    source_type text NOT NULL CHECK (source_type IN ('web', 'newsletter', 'custom_link')),
    title text NOT NULL,
    description text,
    content_snippet text,
    source_url text,
    trend_score integer CHECK (trend_score BETWEEN 0 AND 100),
    discovered_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz,
    metadata jsonb DEFAULT '{}' NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- generated_posts: AI-generated social media posts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generated_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    topic_id uuid REFERENCES public.trending_topics(id) ON DELETE SET NULL,
    platform text NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'multi')),
    content text NOT NULL,
    status text DEFAULT 'generated' NOT NULL CHECK (status IN ('generated', 'edited', 'posted', 'archived')),
    generation_type text DEFAULT 'manual' NOT NULL CHECK (generation_type IN ('manual', 'auto')),
    was_used boolean DEFAULT false NOT NULL,
    engagement_data jsonb,
    generated_at timestamptz DEFAULT now() NOT NULL,
    posted_at timestamptz,
    archived_at timestamptz
);

-- ----------------------------------------------------------------------------
-- auto_generation_logs: Logs of automated post generation runs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auto_generation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    posts_generated integer DEFAULT 0 NOT NULL,
    topics_used jsonb DEFAULT '[]' NOT NULL,
    generated_at timestamptz DEFAULT now() NOT NULL,
    notification_sent boolean DEFAULT false NOT NULL
);

-- ----------------------------------------------------------------------------
-- subscriptions: User subscription and billing information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    stripe_customer_id text UNIQUE,
    stripe_subscription_id text UNIQUE,
    plan_tier text DEFAULT 'free' NOT NULL CHECK (plan_tier IN ('free', 'pro', 'team', 'enterprise')),
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- usage_tracking: Track user usage for billing and limits
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    period_start date NOT NULL,
    manual_generations integer DEFAULT 0 NOT NULL,
    auto_generations integer DEFAULT 0 NOT NULL,
    custom_sources_count integer DEFAULT 0 NOT NULL,
    api_calls_made integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT usage_tracking_user_period_key UNIQUE (user_id, period_start)
);

-- ============================================================================
-- 2. CREATE INDEXES (for performance optimization)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_user_id ON public.voice_samples(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_sources_user_id ON public.custom_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_niche_score ON public.trending_topics(niche_id, trend_score DESC) WHERE niche_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trending_topics_discovered ON public.trending_topics(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_expires ON public.trending_topics(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_posts_user_generated ON public.generated_posts(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_posts_status ON public.generated_posts(status);
CREATE INDEX IF NOT EXISTS idx_scrape_sources_last_scraped ON public.scrape_sources(last_scraped_at) WHERE last_scraped_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES - User Data Tables
-- ============================================================================

-- Policies for user_profiles
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for user_preferences
-- Note: user_preferences.user_id references user_profiles.user_id which is auth.users.id
-- So we can directly compare user_id to auth.uid()
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
    ON public.user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for voice_samples
CREATE POLICY "Users can view own voice samples"
    ON public.voice_samples FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice samples"
    ON public.voice_samples FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice samples"
    ON public.voice_samples FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice samples"
    ON public.voice_samples FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for voice_analysis
CREATE POLICY "Users can view own voice analysis"
    ON public.voice_analysis FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice analysis"
    ON public.voice_analysis FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice analysis"
    ON public.voice_analysis FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice analysis"
    ON public.voice_analysis FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for custom_sources
CREATE POLICY "Users can view own custom sources"
    ON public.custom_sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom sources"
    ON public.custom_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom sources"
    ON public.custom_sources FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom sources"
    ON public.custom_sources FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for generated_posts
CREATE POLICY "Users can view own generated posts"
    ON public.generated_posts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated posts"
    ON public.generated_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated posts"
    ON public.generated_posts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated posts"
    ON public.generated_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for auto_generation_logs
CREATE POLICY "Users can view own auto generation logs"
    ON public.auto_generation_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own auto generation logs"
    ON public.auto_generation_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auto generation logs"
    ON public.auto_generation_logs FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for subscriptions
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE for subscriptions should be handled by service role via webhooks
CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions
    USING (auth.role() = 'service_role');

-- Policies for usage_tracking
CREATE POLICY "Users can view own usage tracking"
    ON public.usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage tracking"
    ON public.usage_tracking FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE RLS POLICIES - Public Tables (Read-only for authenticated users)
-- ============================================================================

-- Policies for niches (read-only for authenticated users)
CREATE POLICY "Authenticated users can view niches"
    ON public.niches FOR SELECT
    TO authenticated
    USING (true);

-- Policies for scrape_sources (read-only for authenticated users)
CREATE POLICY "Authenticated users can view scrape sources"
    ON public.scrape_sources FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Policies for trending_topics (read-only for authenticated users)
CREATE POLICY "Authenticated users can view trending topics"
    ON public.trending_topics FOR SELECT
    TO authenticated
    USING (true);

-- Note: INSERT/UPDATE/DELETE for public tables should be restricted to service role
CREATE POLICY "Service role can manage public tables"
    ON public.niches
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scrape sources"
    ON public.scrape_sources
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage trending topics"
    ON public.trending_topics
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. CREATE TRIGGERS - Auto-update timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. CREATE TRIGGERS - Auto-create user profile and subscription on signup
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (user_id)
    VALUES (NEW.id);
    
    -- Create default subscription (free tier)
    INSERT INTO public.subscriptions (user_id, plan_tier, status)
    VALUES (NEW.id, 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile and subscription when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. CREATE FUNCTIONS - Business logic helpers
-- ============================================================================

-- Function to set expires_at on trending_topics (7 days from discovered_at)
CREATE OR REPLACE FUNCTION public.set_trending_topic_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at = NEW.discovered_at + INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set expires_at
CREATE TRIGGER set_trending_topic_expiry_trigger
    BEFORE INSERT ON public.trending_topics
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trending_topic_expiry();

-- Function to get usage limits based on subscription tier
CREATE OR REPLACE FUNCTION public.get_usage_limits(p_user_id uuid)
RETURNS TABLE (
    max_manual_generations integer,
    max_auto_generations integer,
    max_custom_sources integer,
    max_api_calls integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN s.plan_tier = 'free' THEN 10
            WHEN s.plan_tier = 'pro' THEN 100
            WHEN s.plan_tier = 'team' THEN 500
            WHEN s.plan_tier = 'enterprise' THEN -1  -- unlimited
            ELSE 10
        END as max_manual_generations,
        CASE 
            WHEN s.plan_tier = 'free' THEN 5
            WHEN s.plan_tier = 'pro' THEN 50
            WHEN s.plan_tier = 'team' THEN 250
            WHEN s.plan_tier = 'enterprise' THEN -1  -- unlimited
            ELSE 5
        END as max_auto_generations,
        CASE 
            WHEN s.plan_tier = 'free' THEN 3
            WHEN s.plan_tier = 'pro' THEN 20
            WHEN s.plan_tier = 'team' THEN 100
            WHEN s.plan_tier = 'enterprise' THEN -1  -- unlimited
            ELSE 3
        END as max_custom_sources,
        CASE 
            WHEN s.plan_tier = 'free' THEN 100
            WHEN s.plan_tier = 'pro' THEN 1000
            WHEN s.plan_tier = 'team' THEN 5000
            WHEN s.plan_tier = 'enterprise' THEN -1  -- unlimited
            ELSE 100
        END as max_api_calls
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. SEED DATA - Pre-populated niches
-- ============================================================================

INSERT INTO public.niches (id, name, description, icon) VALUES
    ('saas-tech', 'SaaS & Tech', 'Software, startups, and technology trends', '💻'),
    ('ecommerce', 'E-Commerce', 'Online retail, dropshipping, and digital products', '🛒'),
    ('content-creation', 'Content Creation', 'YouTube, podcasting, and digital content', '🎬'),
    ('coaching', 'Coaching & Consulting', 'Life coaching, business consulting, courses', '🎯'),
    ('real-estate', 'Real Estate', 'Property investment, real estate marketing', '🏠'),
    ('finance', 'Finance & Investing', 'Personal finance, crypto, stock market', '💰'),
    ('health-fitness', 'Health & Fitness', 'Wellness, nutrition, and fitness training', '💪'),
    ('marketing', 'Digital Marketing', 'SEO, ads, social media marketing', '📈'),
    ('social-media', 'Social Media Management', 'Instagram growth, TikTok, influencer marketing', '📱'),
    ('ai-automation', 'AI & Automation', 'AI tools, workflow automation, productivity', '🤖')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. SEED DATA - Pre-populated scrape sources
-- ============================================================================

-- SaaS & Tech sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('saas-tech', 'reddit', 'https://www.reddit.com/r/SaaS', 'Reddit - r/SaaS', 'daily'),
    ('saas-tech', 'reddit', 'https://www.reddit.com/r/startups', 'Reddit - r/startups', 'daily'),
    ('saas-tech', 'hackernews', 'https://news.ycombinator.com', 'Hacker News', 'hourly'),
    ('saas-tech', 'producthunt', 'https://www.producthunt.com', 'Product Hunt', 'daily')
ON CONFLICT DO NOTHING;

-- AI & Automation sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('ai-automation', 'reddit', 'https://www.reddit.com/r/artificial', 'Reddit - r/artificial', 'daily'),
    ('ai-automation', 'reddit', 'https://www.reddit.com/r/MachineLearning', 'Reddit - r/MachineLearning', 'daily'),
    ('ai-automation', 'google_trends', 'https://trends.google.com/trends/explore?q=AI', 'Google Trends - AI', 'daily')
ON CONFLICT DO NOTHING;

-- E-Commerce sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('ecommerce', 'reddit', 'https://www.reddit.com/r/ecommerce', 'Reddit - r/ecommerce', 'daily'),
    ('ecommerce', 'reddit', 'https://www.reddit.com/r/shopify', 'Reddit - r/shopify', 'daily')
ON CONFLICT DO NOTHING;

-- Content Creation sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('content-creation', 'reddit', 'https://www.reddit.com/r/NewTubers', 'Reddit - r/NewTubers', 'daily'),
    ('content-creation', 'reddit', 'https://www.reddit.com/r/podcasting', 'Reddit - r/podcasting', 'daily')
ON CONFLICT DO NOTHING;

-- Coaching & Consulting sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('coaching', 'reddit', 'https://www.reddit.com/r/lifecoaching', 'Reddit - r/lifecoaching', 'daily')
ON CONFLICT DO NOTHING;

-- Finance & Investing sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('finance', 'reddit', 'https://www.reddit.com/r/investing', 'Reddit - r/investing', 'daily'),
    ('finance', 'reddit', 'https://www.reddit.com/r/CryptoCurrency', 'Reddit - r/CryptoCurrency', 'daily')
ON CONFLICT DO NOTHING;

-- Health & Fitness sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('health-fitness', 'reddit', 'https://www.reddit.com/r/Fitness', 'Reddit - r/Fitness', 'daily'),
    ('health-fitness', 'reddit', 'https://www.reddit.com/r/nutrition', 'Reddit - r/nutrition', 'daily')
ON CONFLICT DO NOTHING;

-- Digital Marketing sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('marketing', 'reddit', 'https://www.reddit.com/r/marketing', 'Reddit - r/marketing', 'daily'),
    ('marketing', 'reddit', 'https://www.reddit.com/r/SEO', 'Reddit - r/SEO', 'daily')
ON CONFLICT DO NOTHING;

-- Social Media Management sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('social-media', 'reddit', 'https://www.reddit.com/r/socialmedia', 'Reddit - r/socialmedia', 'daily'),
    ('social-media', 'reddit', 'https://www.reddit.com/r/influencermarketing', 'Reddit - r/influencermarketing', 'daily')
ON CONFLICT DO NOTHING;

-- Real Estate sources
INSERT INTO public.scrape_sources (niche_id, source_type, source_url, source_name, scrape_frequency) VALUES
    ('real-estate', 'reddit', 'https://www.reddit.com/r/realestateinvesting', 'Reddit - r/realestateinvesting', 'daily')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
