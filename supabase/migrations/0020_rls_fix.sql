-- Fix Supabase Security Advisor warnings:
-- 1. "Policy Exists RLS Disabled" on comments and reactions
-- 2. "RLS Disabled in Public" on comments, reactions, site_config

-- Enable RLS on tables that had policies but RLS was off
ALTER TABLE public.comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly (they existed but were inactive)
DROP POLICY IF EXISTS "public_select_comments" ON public.comments;
DROP POLICY IF EXISTS "public_insert_comments" ON public.comments;
DROP POLICY IF EXISTS "public_select_reactions" ON public.reactions;
DROP POLICY IF EXISTS "public_insert_reactions" ON public.reactions;

-- Comments: all operations open (API routes use anon client; guests interact without auth)
CREATE POLICY "public_select_comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "public_insert_comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_comments" ON public.comments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_comments" ON public.comments FOR DELETE USING (true);

-- Reactions: all operations open
CREATE POLICY "public_select_reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "public_insert_reactions" ON public.reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_reactions"  ON public.reactions FOR DELETE USING (true);

-- site_config: enable RLS with no client-facing policies (legacy table, service role only)
ALTER TABLE IF EXISTS public.site_config ENABLE ROW LEVEL SECURITY;
