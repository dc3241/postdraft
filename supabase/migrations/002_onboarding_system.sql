-- Migration: Onboarding Flow & User Specifications System
-- Adds new tables and columns for comprehensive user personalization

-- ============================================================================
-- 1. ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add onboarding_step to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0 NOT NULL;

-- Add new columns to user_preferences for onboarding system
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS content_topics text[] DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS platform_priorities jsonb DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS brand_guidelines_do text[] DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS brand_guidelines_dont text[] DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS avoid_topics text[] DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false NOT NULL;

-- Add constraint for industry (max 100 chars)
ALTER TABLE public.user_preferences
ADD CONSTRAINT check_industry_length CHECK (industry IS NULL OR length(industry) <= 100);

-- ============================================================================
-- 2. CREATE NEW TABLE: brand_voice_samples
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brand_voice_samples (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'instagram', 'facebook', 'tiktok')),
    sample_text text NOT NULL CHECK (length(sample_text) >= 10 AND length(sample_text) <= 5000),
    performance_notes text CHECK (performance_notes IS NULL OR length(performance_notes) <= 200),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for user_id and platform
CREATE INDEX IF NOT EXISTS idx_brand_voice_samples_user_id ON public.brand_voice_samples(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_samples_platform ON public.brand_voice_samples(platform);
CREATE INDEX IF NOT EXISTS idx_brand_voice_samples_user_platform ON public.brand_voice_samples(user_id, platform);

-- Note: The "max 10 samples per platform per user" constraint is enforced
-- in the application layer (see lib/services/user-preferences.ts)

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.brand_voice_samples ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Policies for brand_voice_samples
CREATE POLICY "Users can view own brand voice samples"
    ON public.brand_voice_samples FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand voice samples"
    ON public.brand_voice_samples FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand voice samples"
    ON public.brand_voice_samples FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand voice samples"
    ON public.brand_voice_samples FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at for brand_voice_samples
CREATE TRIGGER update_brand_voice_samples_updated_at
    BEFORE UPDATE ON public.brand_voice_samples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. SET EXISTING USERS' ONBOARDING STATUS
-- ============================================================================

-- Set onboarding_completed = false for all existing users
UPDATE public.user_profiles
SET onboarding_completed = false
WHERE onboarding_completed = true;

-- Set onboarding_completed = false in user_preferences for existing users
UPDATE public.user_preferences
SET onboarding_completed = false
WHERE onboarding_completed IS NULL OR onboarding_completed = true;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
