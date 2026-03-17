'use client';

import { useEffect, useState } from 'react';
import type { Comment } from '@/types';

const storageKey = (memoryId: string) => `forever_comments_${memoryId}`;

function readMyIds(memoryId: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(memoryId)) ?? '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function addMyId(memoryId: string, id: string) {
  const ids = readMyIds(memoryId);
  ids.add(id);
  localStorage.setItem(storageKey(memoryId), JSON.stringify([...ids]));
}

function removeMyId(memoryId: string, id: string) {
  const ids = readMyIds(memoryId);
  ids.delete(id);
  localStorage.setItem(storageKey(memoryId), JSON.stringify([...ids]));
}

interface CommentSectionProps {
  memoryId: string;
}

export default function CommentSection({ memoryId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Per-comment edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMyIds(readMyIds(memoryId));
    fetch(`/api/comments?memory_id=${memoryId}`)
      .then((r) => r.json())
      .then(setComments);
  }, [memoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) return;

    setSubmitting(true);
    setError('');

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memory_id: memoryId,
        author_name: authorName.trim(),
        body: body.trim(),
      }),
    });

    if (res.ok) {
      const newComment: Comment = await res.json();
      setComments((prev) => [...prev, newComment]);
      addMyId(memoryId, newComment.id);
      setMyIds((prev) => new Set([...prev, newComment.id]));
      setBody('');
    } else {
      setError('Failed to post comment. Please try again.');
    }

    setSubmitting(false);
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody('');
  }

  async function saveEdit(id: string) {
    if (!editBody.trim()) return;
    setEditSaving(true);

    const res = await fetch(`/api/comments?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: editBody.trim() }),
    });

    if (res.ok) {
      const updated: Comment = await res.json();
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      setEditBody('');
    }

    setEditSaving(false);
  }

  async function confirmDelete(id: string) {
    setDeleting(true);

    const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });

    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id));
      removeMyId(memoryId, id);
      setMyIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setConfirmDeleteId(null);
    }

    setDeleting(false);
  }

  return (
    <div className="mt-2">
      <h3 className="font-serif text-lg text-ink mb-3">
        {comments.length > 0 ? `${comments.length} Comment${comments.length > 1 ? 's' : ''}` : 'Comments'}
      </h3>

      {comments.length === 0 && (
        <p className="text-sm text-ink-light font-sans mb-4">
          Be the first to leave a message.
        </p>
      )}

      {comments.length > 0 && (
        <ul className="space-y-3 mb-5">
          {comments.map((c) => {
            const isMine = myIds.has(c.id);
            const isEditing = editingId === c.id;
            const isConfirmingDelete = confirmDeleteId === c.id;

            return (
              <li key={c.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-rose-deep font-sans mb-1">
                    {c.author_name}
                    <span className="text-ink-light/60 font-normal ml-2">
                      {new Date(c.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </p>

                  {isMine && !isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-xs text-ink-light hover:text-ink font-sans transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteId(c.id); setEditingId(null); }}
                        className="text-xs text-red-400 hover:text-red-600 font-sans transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className="form-input resize-none w-full text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        disabled={editSaving || !editBody.trim()}
                        className="btn-primary text-xs py-1 px-3"
                      >
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-ink-light hover:text-ink font-sans transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isConfirmingDelete ? (
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-xs text-ink-light font-sans">Delete this comment?</p>
                    <button
                      onClick={() => confirmDelete(c.id)}
                      disabled={deleting}
                      className="text-xs text-red-500 hover:text-red-700 font-sans font-semibold transition-colors"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-ink-light hover:text-ink font-sans transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-ink font-sans leading-relaxed">{c.body}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Your name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="form-input"
          required
          maxLength={80}
        />
        <textarea
          placeholder="Leave a message for the couple…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="form-input resize-none"
          required
          maxLength={500}
        />
        {error && <p className="text-red-600 text-xs font-sans">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Posting…' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
