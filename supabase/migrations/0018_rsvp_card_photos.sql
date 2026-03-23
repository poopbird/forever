-- Add couple-uploaded card photos for the RSVP attending/declining polaroids.
-- If no photo is set, the guest form falls back to a ✓ / ✗ symbol.
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS rsvp_attending_photo_url text,
  ADD COLUMN IF NOT EXISTS rsvp_declining_photo_url text;
