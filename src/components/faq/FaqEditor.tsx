'use client';

import { useState, useEffect } from 'react';
import type { FaqItem } from './FaqAccordion';

const CATEGORIES = ['The Day', 'Venue', 'Guests', 'Dress Code', 'Getting There', 'Gifts', 'General'];

interface FaqEditorProps {
  coupleId: string;
}

export default function FaqEditor({ coupleId }: FaqEditorProps) {
  const [faqs,    setFaqs]    = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null); // id of item being saved
  const [msg,     setMsg]     = useState('');

  // ── Load FAQs ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res  = await fetch(`/api/faqs?coupleId=${coupleId}`);
      const data = await res.json();
      setFaqs(data);
      setLoading(false);

      // Seed defaults if empty
      if (Array.isArray(data) && data.length === 0) {
        const seed = await fetch('/api/faqs', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ seed: true }),
        });
        if (seed.ok) {
          const seeded = await seed.json();
          setFaqs(seeded);
        }
      }
    })();
  }, [coupleId]);

  // ── Optimistic field update + debounced save ───────────────────────────────
  function updateLocal(id: string, field: keyof FaqItem, value: string | number) {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }

  async function saveField(id: string, field: keyof FaqItem, value: string | number) {
    setSaving(id);
    await fetch(`/api/faqs/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: value }),
    });
    setSaving(null);
  }

  // ── Add new FAQ ────────────────────────────────────────────────────────────
  async function handleAdd() {
    const maxPos = faqs.length > 0 ? Math.max(...faqs.map(f => f.position)) + 1 : 0;
    const res    = await fetch('/api/faqs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question: 'New question', answer: '', position: maxPos }),
    });
    if (res.ok) {
      const created = await res.json();
      setFaqs(prev => [...prev, created]);
      setMsg('');
    } else {
      setMsg('✗ Failed to add FAQ');
    }
  }

  // ── Delete FAQ ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setFaqs(prev => prev.filter(f => f.id !== id));
    await fetch(`/api/faqs/${id}`, { method: 'DELETE' });
  }

  // ── Move up/down ───────────────────────────────────────────────────────────
  async function handleMove(id: string, dir: 'up' | 'down') {
    const idx = faqs.findIndex(f => f.id === id);
    if (dir === 'up'   && idx === 0)              return;
    if (dir === 'down' && idx === faqs.length - 1) return;

    const swapIdx  = dir === 'up' ? idx - 1 : idx + 1;
    const newFaqs  = [...faqs];
    const posA     = newFaqs[idx].position;
    const posB     = newFaqs[swapIdx].position;

    newFaqs[idx].position     = posB;
    newFaqs[swapIdx].position = posA;
    newFaqs.sort((a, b) => a.position - b.position);
    setFaqs(newFaqs);

    await Promise.all([
      fetch(`/api/faqs/${newFaqs[idx].id}`,     { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: newFaqs[idx].position }) }),
      fetch(`/api/faqs/${newFaqs[swapIdx].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: newFaqs[swapIdx].position }) }),
    ]);
  }

  if (loading) {
    return <p className="font-sans text-sm text-ink-light animate-pulse">Loading FAQs…</p>;
  }

  return (
    <div>
      {/* FAQ list */}
      <div className="flex flex-col gap-3 mb-5">
        {faqs.length === 0 && (
          <p className="font-sans text-sm text-ink-light">No FAQs yet. Add your first one below.</p>
        )}

        {faqs.map((faq, idx) => (
          <div
            key={faq.id}
            className="rounded-xl border border-rose-pale/40 bg-cream p-4"
            style={{ opacity: saving === faq.id ? 0.6 : 1, transition: 'opacity 0.2s' }}
          >
            {/* Top row: category + reorder + delete */}
            <div className="flex items-center gap-2 mb-3">
              <select
                value={faq.category ?? ''}
                onChange={e => { updateLocal(faq.id, 'category', e.target.value); saveField(faq.id, 'category', e.target.value); }}
                className="form-input text-xs py-1 flex-1"
                style={{ maxWidth: 160 }}
              >
                <option value="">No category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => handleMove(faq.id, 'up')}
                  disabled={idx === 0}
                  title="Move up"
                  className="w-7 h-7 rounded-lg border border-rose-pale/30 text-ink-light hover:text-ink disabled:opacity-25 text-xs flex items-center justify-center"
                >↑</button>
                <button
                  onClick={() => handleMove(faq.id, 'down')}
                  disabled={idx === faqs.length - 1}
                  title="Move down"
                  className="w-7 h-7 rounded-lg border border-rose-pale/30 text-ink-light hover:text-ink disabled:opacity-25 text-xs flex items-center justify-center"
                >↓</button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  title="Delete"
                  className="w-7 h-7 rounded-lg border border-rose-pale/30 text-rose-deep hover:bg-rose-pale/20 text-xs flex items-center justify-center"
                >✕</button>
              </div>
            </div>

            {/* Question */}
            <input
              type="text"
              value={faq.question}
              onChange={e => updateLocal(faq.id, 'question', e.target.value)}
              onBlur={e  => saveField(faq.id, 'question', e.target.value)}
              className="form-input mb-2 font-serif text-sm font-semibold"
              placeholder="Question"
            />

            {/* Answer */}
            <textarea
              value={faq.answer}
              onChange={e => updateLocal(faq.id, 'answer', e.target.value)}
              onBlur={e  => saveField(faq.id, 'answer', e.target.value)}
              rows={3}
              className="form-input resize-none text-sm"
              placeholder="Answer — guests will see this when they tap the question."
            />
          </div>
        ))}
      </div>

      {/* Add button + feedback */}
      <div className="flex items-center gap-4">
        <button onClick={handleAdd} className="btn-primary">
          + Add FAQ
        </button>
        {msg && (
          <span className="font-sans text-sm"
            style={{ color: msg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
