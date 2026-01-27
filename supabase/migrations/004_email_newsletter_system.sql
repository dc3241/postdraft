-- Migration: Email Newsletter System
-- Enables Gmail/Outlook OAuth integration and newsletter content scraping

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_email_connections: Store OAuth tokens for Gmail/Outlook
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_email_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email text NOT NULL,
    access_token text NOT NULL, -- Should be encrypted in application layer
    refresh_token text NOT NULL, -- Should be encrypted in application layer
    expires_at timestamptz NOT NULL,
    token_scope text, -- Store granted scopes for debugging
    is_active boolean DEFAULT true NOT NULL,
    last_synced_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_email_connections_user_provider_unique UNIQUE (user_id, provider)
);

-- ----------------------------------------------------------------------------
-- user_newsletter_senders: User-selected newsletter senders to monitor
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_newsletter_senders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    email_connection_id uuid NOT NULL REFERENCES public.user_email_connections(id) ON DELETE CASCADE,
    sender_email text NOT NULL,
    sender_name text,
    is_enabled boolean DEFAULT true NOT NULL,
    last_email_fetched_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_newsletter_senders_user_sender_unique UNIQUE (user_id, sender_email)
);

-- ----------------------------------------------------------------------------
-- newsletter_sources: Track each newsletter as a "source" (similar to custom_sources)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.user_newsletter_senders(id) ON DELETE CASCADE,
    source_name text NOT NULL, -- e.g., "Morning Brew", "The Hustle"
    source_type text DEFAULT 'newsletter' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_scraped_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT newsletter_sources_user_sender_unique UNIQUE (user_id, sender_id)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_email_connections_user_id ON public.user_email_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_connections_provider ON public.user_email_connections(provider);
CREATE INDEX IF NOT EXISTS idx_user_newsletter_senders_user_id ON public.user_newsletter_senders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_newsletter_senders_connection ON public.user_newsletter_senders(email_connection_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sources_user_id ON public.newsletter_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sources_sender ON public.newsletter_sources(sender_id);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.user_email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_newsletter_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sources ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- user_email_connections policies
CREATE POLICY "Users can view own email connections"
    ON public.user_email_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email connections"
    ON public.user_email_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email connections"
    ON public.user_email_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email connections"
    ON public.user_email_connections FOR DELETE
    USING (auth.uid() = user_id);

-- user_newsletter_senders policies
CREATE POLICY "Users can view own newsletter senders"
    ON public.user_newsletter_senders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own newsletter senders"
    ON public.user_newsletter_senders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own newsletter senders"
    ON public.user_newsletter_senders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own newsletter senders"
    ON public.user_newsletter_senders FOR DELETE
    USING (auth.uid() = user_id);

-- newsletter_sources policies
CREATE POLICY "Users can view own newsletter sources"
    ON public.newsletter_sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own newsletter sources"
    ON public.newsletter_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own newsletter sources"
    ON public.newsletter_sources FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own newsletter sources"
    ON public.newsletter_sources FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_email_connections_updated_at
    BEFORE UPDATE ON public.user_email_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_newsletter_senders_updated_at
    BEFORE UPDATE ON public.user_newsletter_senders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_sources_updated_at
    BEFORE UPDATE ON public.newsletter_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. UPDATE trending_topics TO SUPPORT newsletter_sources
-- ============================================================================

-- Add foreign key constraint for newsletter_sources (if not already handled by source_id)
-- Note: source_id currently references custom_sources, but we'll use it for newsletter_sources too
-- We'll need to handle this in application logic or create a polymorphic relationship

-- For now, we can add a newsletter_source_id column or use source_id with a type discriminator
-- Since source_type already exists in trending_topics, we can use source_id to reference
-- either custom_sources OR newsletter_sources based on source_type

-- Add newsletter_source_id column (alternative approach - more explicit)
ALTER TABLE public.trending_topics 
ADD COLUMN IF NOT EXISTS newsletter_source_id UUID REFERENCES public.newsletter_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trending_topics_newsletter_source ON public.trending_topics(newsletter_source_id);
