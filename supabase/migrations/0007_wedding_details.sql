-- ─────────────────────────────────────────────────────────────────────────────
-- 0007 — Wedding details on couples + expand highlights limit to 20
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add optional wedding detail fields to couples
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS wedding_date  text,
  ADD COLUMN IF NOT EXISTS wedding_venue text,
  ADD COLUMN IF NOT EXISTS wedding_city  text;

-- Expand couple_highlights position check from 1–10 to 1–20
ALTER TABLE couple_highlights
  DROP CONSTRAINT IF EXISTS couple_highlights_position_check;

ALTER TABLE couple_highlights
  ADD CONSTRAINT couple_highlights_position_check
  CHECK (position BETWEEN 1 AND 20);
