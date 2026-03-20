-- Migration: 0015_highlights_max_20
-- Raise the position constraint on couple_highlights from 10 to 20,
-- aligning the DB with the app's 20-polaroid picker UI.

ALTER TABLE couple_highlights
  DROP CONSTRAINT IF EXISTS couple_highlights_position_check;

ALTER TABLE couple_highlights
  ADD CONSTRAINT couple_highlights_position_check
  CHECK (position BETWEEN 1 AND 20);
