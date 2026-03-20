-- Migration: 0014_film_reel_toggle
-- Adds film_reel_enabled flag to couples table.
-- Default is FALSE — Film Reel is hidden unless explicitly enabled by the couple.

ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS film_reel_enabled boolean NOT NULL DEFAULT false;
