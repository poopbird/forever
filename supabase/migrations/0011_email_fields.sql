-- ─────────────────────────────────────────────────────────────────────────────
-- 0011 — Email / messaging fields for Phase 2
-- Adds invite tracking timestamps to rsvp_guests
-- Adds reminder_days_before + invite_message_template to couples
-- Run in Supabase SQL Editor after 0010_rsvp.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── rsvp_guests additions ─────────────────────────────────────────────────────
ALTER TABLE public.rsvp_guests
  ADD COLUMN IF NOT EXISTS invite_sent_at    timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at  timestamptz DEFAULT NULL;

-- ── couples additions ─────────────────────────────────────────────────────────
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS reminder_days_before      int  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_message_template   text DEFAULT NULL;
