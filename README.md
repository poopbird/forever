# Forever

A warm, romantic couples' memory website — interactive timeline, world map, EXIF-powered photo upload, and guest reactions/comments.

Built with **Next.js 15** · **Supabase** · **Leaflet** · **Tailwind CSS** · **Framer Motion**

---

## POC scope

| Feature | Status |
|---|---|
| Memory upload with EXIF extraction | ✅ |
| Client-side reverse geocoding (Nominatim) | ✅ |
| Chronological timeline with milestone markers | ✅ |
| Interactive world map with pin clustering | ✅ |
| Guest emoji reactions | ✅ |
| Guest comments | ✅ |
| Romantic, responsive UI | ✅ |
| Auth / couple accounts | ❌ deferred |
| Guest contributions + approval flow | ❌ deferred |

---

## Getting started

### 1. Clone & install

```bash
git clone <your-repo>
cd forever
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Copy **Project URL** and **anon public key** from **Settings → API**.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

NEXT_PUBLIC_COUPLE_NAME="Alex & Jordan"
NEXT_PUBLIC_RELATIONSHIP_START_DATE=2020-06-14
NEXT_PUBLIC_COVER_PHOTO_URL=          # optional — leave blank for gradient
```

### 4. Run the database migration

In your Supabase project, go to **SQL Editor** and paste the contents of:

```
supabase/migrations/0001_init.sql
```

Run it. This creates the `memories`, `comments`, and `reactions` tables with public RLS policies.

### 5. Create the storage bucket

In your Supabase project:

1. Go to **Storage → New bucket**
2. Name it `memories`
3. Enable **Public bucket** (so uploaded media URLs are publicly accessible)

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
forever/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main page (server component)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── memories/route.ts     # GET all, POST new
│   │       ├── memories/[id]/route.ts# GET, PUT, DELETE
│   │       ├── comments/route.ts     # GET (by memory), POST
│   │       ├── reactions/route.ts    # GET counts, POST
│   │       └── upload/route.ts       # POST → Supabase Storage
│   ├── components/
│   │   ├── layout/CoverHero.tsx      # Full-screen hero section
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx          # Timeline container + modals
│   │   │   ├── TimelineEntry.tsx     # Individual memory card
│   │   │   └── MilestoneMarker.tsx   # Gold dot + label pill
│   │   ├── map/
│   │   │   ├── MemoryMap.tsx         # SSR-safe wrapper (dynamic import)
│   │   │   └── MapInner.tsx          # Leaflet map (client-only)
│   │   ├── memory/
│   │   │   ├── MemoryDetail.tsx      # Full-screen modal
│   │   │   └── MemoryForm.tsx        # Add / edit form with EXIF extraction
│   │   └── guest/
│   │       ├── ReactionBar.tsx       # Emoji reaction buttons
│   │       └── CommentSection.tsx    # Comments list + post form
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   └── server.ts             # Server Supabase client
│   │   ├── exif.ts                   # Client-side EXIF extraction (exifr)
│   │   └── geocoding.ts              # Nominatim reverse geocoding
│   └── types/index.ts                # Shared TypeScript types
└── supabase/
    └── migrations/0001_init.sql      # DB schema + RLS policies
```

---

## Key technical notes

- **EXIF extraction is 100% client-side** — raw GPS coordinates never leave the browser. They are passed to Nominatim for reverse geocoding, and only the resulting place name string is stored.
- **Leaflet** is loaded dynamically with `ssr: false` to avoid SSR issues with browser-only APIs.
- **No auth in the POC** — the RLS policies grant full public read/write access. Lock these down before going to production.
