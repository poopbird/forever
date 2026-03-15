export interface Couple {
  id: string;
  name: string;
  start_date: string | null;
  bio: string | null;
  cover_photo_url: string | null;
  cover_video_url: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  couple_id: string;
  token: string;
  accepted: boolean;
  created_at: string;
}

export interface Memory {
  id: string;
  created_at: string;
  /** ISO date string e.g. "2023-07-04" — the date the moment occurred */
  date: string;
  caption: string;
  media_url: string;
  /** All uploaded photos for this memory (includes media_url as first entry) */
  media_urls?: string[];
  media_type: 'photo' | 'video';
  location_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  show_on_map: boolean;
  milestone_label?: string | null;
  /** Emoji shown as the timeline dot for this memory e.g. "❤️", "✈️" */
  dot_emoji?: string | null;
  /** Optimistic-lock version — incremented on every PATCH */
  version?: number;
}

export interface Comment {
  id: string;
  created_at: string;
  memory_id: string;
  author_name: string;
  body: string;
}

export interface Reaction {
  id: string;
  created_at: string;
  memory_id: string;
  emoji: string;
}

/** Emoji → count map returned by GET /api/reactions */
export type ReactionCounts = Record<string, number>;

/** Raw data extracted from a photo's EXIF headers */
export interface ExifData {
  date?: Date;
  lat?: number;
  lng?: number;
}
