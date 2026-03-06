-- ─────────────────────────────────────────────────────────────────────────────
-- Forever — initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── memories ─────────────────────────────────────────────────────────────────
create table if not exists memories (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null    default now(),

  -- The actual date the moment occurred (not the upload date)
  date            date        not null,
  caption         text        not null,
  media_url       text        not null,
  media_type      text        not null    check (media_type in ('photo', 'video')),

  -- Location — stored as a readable name; raw GPS coords are never persisted
  location_name   text,
  lat             double precision,
  lng             double precision,
  show_on_map     boolean     not null    default true,

  milestone_label text
);

-- ── comments ─────────────────────────────────────────────────────────────────
create table if not exists comments (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  memory_id   uuid        not null    references memories (id) on delete cascade,
  author_name text        not null,
  body        text        not null
);

-- ── reactions ────────────────────────────────────────────────────────────────
-- No de-duplication per guest in POC — one click = one reaction row
create table if not exists reactions (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  memory_id   uuid        not null    references memories (id) on delete cascade,
  emoji       text        not null
);

-- ── indexes ───────────────────────────────────────────────────────────────────
create index if not exists memories_date_idx    on memories  (date);
create index if not exists comments_memory_idx  on comments  (memory_id);
create index if not exists reactions_memory_idx on reactions (memory_id);

-- ── Row Level Security (POC: fully open — no auth) ───────────────────────────
alter table memories  enable row level security;
alter table comments  enable row level security;
alter table reactions enable row level security;

-- memories
create policy "public_select_memories" on memories for select using (true);
create policy "public_insert_memories" on memories for insert with check (true);
create policy "public_update_memories" on memories for update using (true);
create policy "public_delete_memories" on memories for delete using (true);

-- comments
create policy "public_select_comments" on comments for select using (true);
create policy "public_insert_comments" on comments for insert with check (true);

-- reactions
create policy "public_select_reactions" on reactions for select using (true);
create policy "public_insert_reactions" on reactions for insert with check (true);
