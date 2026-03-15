-- Migration: Allow authenticated users to upload directly from the browser
-- to the `memories` storage bucket (bypasses Next.js API proxy for speed).
--
-- Run this in: Supabase Dashboard → SQL Editor

-- INSERT policy: authenticated users can upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'authenticated_can_insert_memories'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "authenticated_can_insert_memories"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'memories');
    $policy$;
  END IF;
END $$;

-- SELECT policy: public can read (needed for public image URLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'public_can_read_memories'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "public_can_read_memories"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'memories');
    $policy$;
  END IF;
END $$;
