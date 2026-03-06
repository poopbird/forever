'use client';

import { useEffect, useState } from 'react';
import type { Comment } from '@/types';

interface CommentSectionProps {
  memoryId: string;
}

export default function CommentSection({ memoryId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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
      setBody('');
    } else {
      setError('Failed to post comment. Please try again.');
    }

    setSubmitting(false);
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
          {comments.map((c) => (
            <li key={c.id} className="bg-white rounded-xl p-3 shadow-sm">
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
              <p className="text-sm text-ink font-sans leading-relaxed">{c.body}</p>
            </li>
          ))}
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
