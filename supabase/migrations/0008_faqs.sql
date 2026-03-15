-- ── FAQ table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faqs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id  uuid        NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  category   text,
  question   text        NOT NULL,
  answer     text        NOT NULL DEFAULT '',
  position   int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faqs_couple_id_idx ON public.faqs (couple_id, position);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read FAQs (guest view, no auth required)
CREATE POLICY "faqs_public_select"
  ON public.faqs FOR SELECT
  USING (true);

-- Couple members: full CRUD on their own FAQs
CREATE POLICY "faqs_couple_insert"
  ON public.faqs FOR INSERT
  TO authenticated
  WITH CHECK (couple_id = my_couple_id());

CREATE POLICY "faqs_couple_update"
  ON public.faqs FOR UPDATE
  TO authenticated
  USING (couple_id = my_couple_id());

CREATE POLICY "faqs_couple_delete"
  ON public.faqs FOR DELETE
  TO authenticated
  USING (couple_id = my_couple_id());
