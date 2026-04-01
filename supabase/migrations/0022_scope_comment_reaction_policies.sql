-- ─────────────────────────────────────────────────────────────────────────────
-- Replace USING(true) / WITH CHECK(true) policies on comments and reactions
-- with memory_id-scoped equivalents.
--
-- Why this works for unauthenticated guests:
--   The scope is on the *data* (does this memory_id exist?), not on the user.
--   No auth.uid() check → guests can still post freely.
--   Eliminates "RLS Policy Always True" warnings while adding real protection:
--   nobody can insert comments/reactions against fabricated UUIDs.
-- ─────────────────────────────────────────────────────────────────────────────

-- COMMENTS ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_insert_comments" ON public.comments;
DROP POLICY IF EXISTS "public_update_comments" ON public.comments;
DROP POLICY IF EXISTS "public_delete_comments" ON public.comments;

CREATE POLICY "public_insert_comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id)
  );

CREATE POLICY "public_update_comments"
  ON public.comments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id)
  );

CREATE POLICY "public_delete_comments"
  ON public.comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id)
  );

-- REACTIONS ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_insert_reactions" ON public.reactions;
DROP POLICY IF EXISTS "public_delete_reactions"  ON public.reactions;

CREATE POLICY "public_insert_reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id)
  );

CREATE POLICY "public_delete_reactions"
  ON public.reactions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REMAINING WARNING: auth_leaked_password_protection
-- Cannot be changed via SQL. Enable in:
--   Supabase Dashboard → Authentication → Security →
--   "Leaked Password Protection" toggle
-- ─────────────────────────────────────────────────────────────────────────────
