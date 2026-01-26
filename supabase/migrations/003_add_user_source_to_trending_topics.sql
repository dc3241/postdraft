-- Migration: Add user_id and source_id to trending_topics
-- Enables user-specific topics from custom sources and global topics from default sources

-- ============================================================================
-- ADD COLUMNS TO trending_topics TABLE
-- ============================================================================

-- Add user_id column (nullable - null = global/default topics, non-null = user-specific)
ALTER TABLE public.trending_topics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add source_id column (nullable - references custom_sources when topic comes from user's custom source)
ALTER TABLE public.trending_topics 
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.custom_sources(id) ON DELETE SET NULL;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trending_topics_user_id ON public.trending_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_source_id ON public.trending_topics(source_id);

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop the old policy that allows all authenticated users to see all topics
DROP POLICY IF EXISTS "Authenticated users can view trending topics" ON public.trending_topics;

-- Create new policy: Users can view their own topics and global topics
CREATE POLICY "Users can view own and global trending topics"
    ON public.trending_topics FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Allow users to insert their own topics (from custom sources)
CREATE POLICY "Users can insert own trending topics"
    ON public.trending_topics FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Note: UPDATE and DELETE remain restricted to service role only
-- (handled by existing "Service role can manage trending topics" policy)
