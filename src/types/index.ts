export interface Memory {
  id: string;
  created_at: string;
  /** ISO date string e.g. "2023-07-04" — the date the moment occurred */
  date: string;
  caption: string;
  media_url: string;
  media_type: 'photo' | 'video';
  location_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  show_on_map: boolean;
  milestone_label?: string | null;
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
