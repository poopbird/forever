import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCoupleId } from '@/lib/couple';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

async function getAuthedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const coupleId = await getCoupleId(user.id);
  if (!coupleId) return null;
  return { userId: user.id, coupleId };
}

/** Extract Supabase Storage object path from a public URL */
function storagePathFromUrl(publicUrl: string): string | null {
  try {
    const marker = '/object/public/memories/';
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  } catch {
    return null;
  }
}

/** Delete a single media URL from Supabase Storage (best-effort, no throw) */
async function deleteFromStorage(mediaUrl: string | null | undefined) {
  if (!mediaUrl) return;
  const path = storagePathFromUrl(mediaUrl);
  if (!path) return;
  const admin = createAdminClient();
  await admin.storage.from('memories').remove([path]);
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('memories').select('*').eq('id', id).eq('couple_id', auth.coupleId).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/memories/[id]
 * Optimistic-lock update. Client must send { version: <current_version>, ...fields }
 * Returns 409 if the version has changed since the client loaded the memory.
 * Writes a changelog entry for each changed text field.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { version: clientVersion, ...fields } = body as {
    version: number;
    title?: string;
    caption?: string;
    date?: string;
    location_name?: string;
    lat?: number | null;
    lng?: number | null;
    media_url?: string | null;
    media_urls?: string[];
    [key: string]: unknown;
  };

  if (typeof clientVersion !== 'number') {
    return NextResponse.json({ error: 'version is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch current row to check version and capture old values
  const { data: current, error: fetchErr } = await admin
    .from('memories')
    .select('*')
    .eq('id', id)
    .eq('couple_id', auth.coupleId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Optimistic locking check
  if (current.version !== clientVersion) {
    return NextResponse.json(
      { error: 'Conflict: memory was modified by someone else. Please reload and try again.' },
      { status: 409 },
    );
  }

  // If media is being replaced, delete the old file from Storage
  const oldMediaUrl: string | null = current.media_url ?? null;
  const newMediaUrl: string | null | undefined = fields.media_url;

  if (
    newMediaUrl !== undefined &&
    oldMediaUrl &&
    newMediaUrl !== oldMediaUrl
  ) {
    await deleteFromStorage(oldMediaUrl);

    // Also clean up any extra items in media_urls that pointed to the old file
    if (Array.isArray(current.media_urls)) {
      for (const url of current.media_urls as string[]) {
        if (url !== oldMediaUrl) await deleteFromStorage(url);
      }
    }
  }

  // Build the update payload (increment version)
  const updatePayload = {
    ...fields,
    version: current.version + 1,
  };

  const { data: updated, error: updateErr } = await admin
    .from('memories')
    .update(updatePayload)
    .eq('id', id)
    .eq('couple_id', auth.coupleId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Write changelog entries for each changed text field
  const trackedFields = ['title', 'caption', 'date', 'location_name', 'media_url'];
  const changelogEntries = trackedFields
    .filter(f => f in fields && String(fields[f] ?? '') !== String(current[f] ?? ''))
    .map(f => ({
      memory_id:     id,
      couple_id:     auth.coupleId,
      field_changed: f,
      old_value:     String(current[f] ?? ''),
      new_value:     String(fields[f] ?? ''),
      changed_by:    auth.userId,
    }));

  if (changelogEntries.length > 0) {
    await admin.from('memory_changelog').insert(changelogEntries);
  }

  return NextResponse.json(updated);
}

/** Legacy PUT — kept for backward-compat with MemoryForm (no optimistic locking) */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('memories').update(body).eq('id', id).eq('couple_id', auth.coupleId).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getAuthedUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Fetch media URLs before deleting so we can clean up Storage
  const { data: memory } = await admin
    .from('memories')
    .select('media_url, media_urls')
    .eq('id', id)
    .eq('couple_id', auth.coupleId)
    .single();

  // Delete DB row first (cascade is fine here)
  const { error } = await admin
    .from('memories').delete().eq('id', id).eq('couple_id', auth.coupleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort Storage cleanup (after DB delete so row is already gone)
  if (memory) {
    await deleteFromStorage(memory.media_url);
    if (Array.isArray(memory.media_urls)) {
      for (const url of memory.media_urls as string[]) {
        if (url !== memory.media_url) await deleteFromStorage(url);
      }
    }
  }

  return new NextResponse(null, { status: 204 });
}
