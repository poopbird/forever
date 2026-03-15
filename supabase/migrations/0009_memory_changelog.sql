-- ── Optimistic locking: version column on memories ─────────────────────────
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- ── Change log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.memory_changelog (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id     uuid        NOT NULL REFERENCES public.memories(id)  ON DELETE CASCADE,
  couple_id     uuid        NOT NULL REFERENCES public.couples(id)   ON DELETE CASCADE,
  field_changed text        NOT NULL,
  old_value     text,
  new_value     text,
  changed_by    uuid        NOT NULL REFERENCES auth.users(id),
  changed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_changelog_memory_idx ON public.memory_changelog (memory_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS memory_changelog_couple_idx ON public.memory_changelog (couple_id, changed_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.memory_changelog ENABLE ROW LEVEL SECURITY;

-- Couple members can read their own changelog
CREATE POLICY "changelog_couple_select"
  ON public.memory_changelog FOR SELECT
  TO authenticated
  USING (couple_id = my_couple_id());

-- Couple members can insert their own changelog entries
CREATE POLICY "changelog_couple_insert"
  ON public.memory_changelog FOR INSERT
  TO authenticated
  WITH CHECK (couple_id = my_couple_id());
