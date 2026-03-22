-- Migration 0017: Add invitation_photo_url to couples
-- Stores the media_url of the selected memory photo for the invitation card.
-- NULL = auto-pick the most recent memory photo.

ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS invitation_photo_url TEXT DEFAULT NULL;
