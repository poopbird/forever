-- Add country_code to memories for 3D globe country highlighting
ALTER TABLE memories ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Index for fast per-couple country lookups (stat ribbon)
CREATE INDEX IF NOT EXISTS memories_country_code_idx ON memories(couple_id, country_code);
