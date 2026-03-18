-- Migration 0012: wedding time (start/end) + calendar description
-- Run in Supabase SQL Editor

ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS wedding_time_start  time,
  ADD COLUMN IF NOT EXISTS wedding_time_end    time,
  ADD COLUMN IF NOT EXISTS calendar_description text;
