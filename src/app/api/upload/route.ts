import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const MAX_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

// Allowed MIME-type prefixes
const ALLOWED_TYPES = ['image/', 'video/'];

/**
 * POST /api/upload
 * Uploads a media file to the `memories` Supabase Storage bucket and returns
 * the public URL. The bucket must be created manually in your Supabase project
 * with public access enabled.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Server-side type guard
  const typeAllowed = ALLOWED_TYPES.some(prefix => file.type.startsWith(prefix));
  if (!typeAllowed) {
    return NextResponse.json(
      { error: `File type "${file.type}" is not allowed. Only images and videos are accepted.` },
      { status: 415 },
    );
  }

  // Server-side size guard (client may be bypassed)
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 150 MB limit (received ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 413 },
    );
  }

  const ext          = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const storagePath  = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('memories')
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('memories').getPublicUrl(storagePath);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
