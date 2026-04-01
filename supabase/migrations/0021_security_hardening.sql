-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening — fixes Supabase Security Advisor warnings
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. FIX: Function Search Path Mutable
--    Recreate both functions with SET search_path = '' to prevent search_path
--    injection attacks. All object references are now schema-qualified.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_couple_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT couple_id
  FROM public.couple_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. FIX: RLS Policy Always True on memories (INSERT / UPDATE / DELETE)
--    These were the original open POC policies from 0001_init.sql.
--    They are now superseded by the couple-scoped policies added in
--    20260312_couples_auth.sql ("Couple members insert/update/delete memories").
--    Dropping them removes the permissive override and restores proper scoping.
--    The SELECT policy (public_select_memories) is intentionally kept —
--    it allows the public guest view and kiosk to read memories without auth.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_insert_memories" ON public.memories;
DROP POLICY IF EXISTS "public_update_memories" ON public.memories;
DROP POLICY IF EXISTS "public_delete_memories" ON public.memories;

-- NOTE: comments + reactions INSERT/UPDATE/DELETE policies remain USING (true).
-- These tables have no couple_id column; guests interact without authentication
-- (commenting and reacting on a public wedding showcase). The permissive
-- policies are intentional and the warnings for those tables are accepted.

-- NOTE: auth_leaked_password_protection cannot be changed via SQL.
-- Enable it in: Supabase Dashboard → Authentication → Security →
-- "Leaked Password Protection" toggle.
-- ─────────────────────────────────────────────────────────────────────────────
