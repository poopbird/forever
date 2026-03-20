-- Migration 0013: couple_albums + album_memories
-- Run in Supabase SQL Editor

-- 1. Album mode on couples (year | freeform)
ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS album_mode text NOT NULL DEFAULT 'year';

-- 2. couple_albums — one row per album on the shelf
CREATE TABLE IF NOT EXISTS couple_albums (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       uuid        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  label           text        NOT NULL,
  caption         text,
  cover_photo_url text,
  -- For year mode: date range that determines which memories belong here
  date_start      date,
  date_end        date,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. album_memories — free-form membership junction
CREATE TABLE IF NOT EXISTS album_memories (
  album_id  uuid NOT NULL REFERENCES couple_albums(id) ON DELETE CASCADE,
  memory_id uuid NOT NULL REFERENCES memories(id)      ON DELETE CASCADE,
  couple_id uuid NOT NULL,
  PRIMARY KEY (album_id, memory_id)
);

-- 4. RLS
ALTER TABLE couple_albums  ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_memories ENABLE ROW LEVEL SECURITY;

-- couple_albums: public read (guests can view shelf), couple write
CREATE POLICY "albums_public_read"
  ON couple_albums FOR SELECT USING (true);

CREATE POLICY "albums_couple_insert"
  ON couple_albums FOR INSERT
  WITH CHECK (couple_id = my_couple_id());

CREATE POLICY "albums_couple_update"
  ON couple_albums FOR UPDATE
  USING (couple_id = my_couple_id());

CREATE POLICY "albums_couple_delete"
  ON couple_albums FOR DELETE
  USING (couple_id = my_couple_id());

-- album_memories: public read, couple write
CREATE POLICY "album_mem_public_read"
  ON album_memories FOR SELECT USING (true);

CREATE POLICY "album_mem_couple_insert"
  ON album_memories FOR INSERT
  WITH CHECK (couple_id = my_couple_id());

CREATE POLICY "album_mem_couple_delete"
  ON album_memories FOR DELETE
  USING (couple_id = my_couple_id());
