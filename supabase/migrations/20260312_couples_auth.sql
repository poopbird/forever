-- ─────────────────────────────────────────────────────────────────────────────
-- Epic 1 — Couple Onboarding & Auth
-- Run this in the Supabase SQL editor (Database → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. COUPLES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couples (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL DEFAULT 'Our Story',
  start_date       date,
  bio              text,
  cover_photo_url  text,
  cover_video_url  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER couples_updated_at
  BEFORE UPDATE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. COUPLE_MEMBERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_members (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'partner')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (couple_id, user_id)
);

CREATE INDEX IF NOT EXISTS couple_members_user_id_idx ON public.couple_members(user_id);

-- 3. INVITES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  token      text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  accepted   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invites_token_idx ON public.invites(token);

-- 4. ADD couple_id TO MEMORIES ────────────────────────────────────────────────
-- Nullable so existing POC memories are preserved during migration.
-- New memories created through the app will always have couple_id set.
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS memories_couple_id_idx ON public.memories(couple_id);

-- 5. ROW LEVEL SECURITY ───────────────────────────────────────────────────────

-- helpers: a stable function to look up the caller's couple_id
CREATE OR REPLACE FUNCTION public.my_couple_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT couple_id FROM public.couple_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- couples: anyone can read (guest view needs this); only members can update
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read couples"
  ON public.couples FOR SELECT USING (true);

CREATE POLICY "Members update their couple"
  ON public.couples FOR UPDATE
  USING (id = public.my_couple_id());

-- couple_members: users see only their own row
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own membership read"
  ON public.couple_members FOR SELECT
  USING (user_id = auth.uid());

-- invites: members of the couple can read; public read needed for token validation
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read invites by token"
  ON public.invites FOR SELECT USING (true);

-- memories: couple members can read their couple's memories; public view also reads them
-- The app layer always filters by couple_id, RLS is a safety net
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members read memories"
  ON public.memories FOR SELECT
  USING (couple_id = public.my_couple_id() OR couple_id IS NULL);

CREATE POLICY "Couple members insert memories"
  ON public.memories FOR INSERT
  WITH CHECK (couple_id = public.my_couple_id());

CREATE POLICY "Couple members update memories"
  ON public.memories FOR UPDATE
  USING (couple_id = public.my_couple_id());

CREATE POLICY "Couple members delete memories"
  ON public.memories FOR DELETE
  USING (couple_id = public.my_couple_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- AFTER RUNNING: go to Supabase Dashboard → Authentication → Settings and
-- set "Enable email confirmations" to OFF for easier local development.
-- Re-enable for production.
-- ─────────────────────────────────────────────────────────────────────────────
