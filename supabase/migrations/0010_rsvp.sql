-- ─────────────────────────────────────────────────────────────────────────────
-- 0010 — RSVP feature
-- Creates rsvp_guests table + adds rsvp_enabled / rsvp_locked_at to couples
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE public.rsvp_status_enum AS ENUM ('pending', 'attending', 'declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.dietary_preset_enum AS ENUM ('none', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── rsvp_guests ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rsvp_guests (
  id                      uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id               uuid                        NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name                    text                        NOT NULL,
  email                   text,
  phone                   text,
  token                   uuid                        NOT NULL DEFAULT gen_random_uuid(),
  plus_one_invited        boolean                     NOT NULL DEFAULT false,
  rsvp_status             public.rsvp_status_enum     NOT NULL DEFAULT 'pending',
  plus_one_attending      boolean,
  plus_one_name           text,
  dietary_preset          public.dietary_preset_enum,
  dietary_notes           text,
  plus_one_dietary_preset public.dietary_preset_enum,
  plus_one_dietary_notes  text,
  responded_at            timestamptz,
  created_at              timestamptz                 NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rsvp_guests_token_idx     ON public.rsvp_guests (token);
CREATE        INDEX IF NOT EXISTS rsvp_guests_couple_id_idx ON public.rsvp_guests (couple_id);
CREATE        INDEX IF NOT EXISTS rsvp_guests_email_idx     ON public.rsvp_guests (couple_id, lower(email)) WHERE email IS NOT NULL;

-- ── RSVP columns on couples ───────────────────────────────────────────────────
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS rsvp_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_locked_at  date;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.rsvp_guests ENABLE ROW LEVEL SECURITY;

-- Authenticated couple members: full access to their own guests
CREATE POLICY "rsvp_guests_couple_all"
  ON public.rsvp_guests
  TO authenticated
  USING (couple_id = my_couple_id())
  WITH CHECK (couple_id = my_couple_id());
