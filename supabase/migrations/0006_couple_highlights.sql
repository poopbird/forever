-- ─────────────────────────────────────────────────────────────────────────────
-- couple_highlights: ordered list of up to 10 "top" memories per couple,
-- used to drive the polaroid scroll-jacked highlight reel.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS couple_highlights (
  couple_id  uuid     NOT NULL REFERENCES couples(id)  ON DELETE CASCADE,
  memory_id  uuid     NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  position   smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
  PRIMARY KEY (couple_id, position),
  UNIQUE      (couple_id, memory_id)
);

ALTER TABLE couple_highlights ENABLE ROW LEVEL SECURITY;

-- Couple members can read + write their own highlights
CREATE POLICY "couple members manage highlights"
  ON couple_highlights FOR ALL
  USING  (couple_id = my_couple_id())
  WITH CHECK (couple_id = my_couple_id());

-- Public (guests) can read highlights for any couple
CREATE POLICY "public read highlights"
  ON couple_highlights FOR SELECT
  USING (true);
