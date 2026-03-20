'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Memory } from '@/types';

interface Props {
  allMemories:       Memory[];
  currentHighlights: Memory[];
  onSave:  (saved: Memory[]) => void;
  onClose: () => void;
}

export default function PolaroidPicker({
  allMemories,
  currentHighlights,
  onSave,
  onClose,
}: Props) {
  const photos = allMemories.filter(m => m.media_url);

  const [selected, setSelected] = useState<string[]>(
    currentHighlights.map(m => m.id),
  );
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 20) return prev; // cap at 20
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/highlights', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ memoryIds: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');

      // Return the saved memories in selected order
      const saved = selected
        .map(id => allMemories.find(m => m.id === id))
        .filter(Boolean) as Memory[];
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     200,
        background: 'rgba(26,18,16,0.88)',
        backdropFilter: 'blur(8px)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:    '24px 16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background:    '#FDF8F0',
          borderRadius:  '20px',
          width:         '100%',
          maxWidth:      740,
          maxHeight:     '88vh',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          boxShadow:     '0 32px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding:       '24px 28px 20px',
            borderBottom:  '1px solid rgba(242,208,216,0.5)',
            display:       'flex',
            alignItems:    'flex-start',
            justifyContent:'space-between',
            gap:           16,
            flexShrink:    0,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize:   '1.35rem',
                fontStyle:  'italic',
                color:      '#7B1E3C',
                marginBottom: 4,
              }}
            >
              Curate Your Highlights
            </h2>
            <p style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.78rem', color: '#6B4F4F', opacity: 0.7 }}>
              Pick up to <strong style={{ color: '#C9964A' }}>20 photos</strong> — these fly in as polaroids when guests visit your page.
            </p>
          </div>

          {/* Counter badge */}
          <div
            style={{
              background:    selected.length === 20 ? 'rgba(201,150,74,0.15)' : 'rgba(123,30,60,0.08)',
              border:        `1px solid ${selected.length === 20 ? 'rgba(201,150,74,0.5)' : 'rgba(242,208,216,0.6)'}`,
              borderRadius:  '100px',
              padding:       '4px 14px',
              flexShrink:    0,
            }}
          >
            <span style={{
              fontFamily: '"Lato", sans-serif',
              fontSize:   '0.8rem',
              fontWeight: 700,
              color:      selected.length === 20 ? '#C9964A' : '#7B1E3C',
            }}>
              {selected.length} / 20
            </span>
          </div>
        </div>

        {/* ── Photo grid ── */}
        <div
          style={{
            flex:       1,
            overflowY:  'auto',
            padding:    '20px 24px',
          }}
        >
          {photos.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px 0', fontFamily: '"Lato", sans-serif', fontSize: '0.85rem', color: '#6B4F4F', opacity: 0.6 }}>
              No photos yet — add some memories first.
            </p>
          ) : (
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap:                 10,
              }}
            >
              {photos.map(memory => {
                const idx        = selected.indexOf(memory.id);
                const isSelected = idx !== -1;
                const isDisabled = !isSelected && selected.length >= 20;

                return (
                  <button
                    key={memory.id}
                    onClick={() => !isDisabled && toggle(memory.id)}
                    style={{
                      position:     'relative',
                      aspectRatio:  '1',
                      borderRadius: '10px',
                      overflow:     'hidden',
                      border:       isSelected
                        ? '2.5px solid #C9964A'
                        : '2.5px solid transparent',
                      cursor:       isDisabled ? 'not-allowed' : 'pointer',
                      opacity:      isDisabled ? 0.4 : 1,
                      transition:   'all 0.18s ease',
                      padding:      0,
                      background:   'transparent',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={memory.media_url}
                      alt={memory.caption}
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover', display: 'block',
                        transition: 'transform 0.3s ease',
                        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                      }}
                    />

                    {/* Dark overlay when not selected */}
                    {!isSelected && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(26,18,16,0.35)',
                        transition: 'opacity 0.2s',
                      }} />
                    )}

                    {/* Order badge */}
                    {isSelected && (
                      <div
                        style={{
                          position:     'absolute',
                          top:          6,
                          right:        6,
                          width:        24,
                          height:       24,
                          borderRadius: '50%',
                          background:   '#C9964A',
                          color:        'white',
                          fontFamily:   '"Lato", sans-serif',
                          fontSize:     '0.7rem',
                          fontWeight:   700,
                          display:      'flex',
                          alignItems:   'center',
                          justifyContent: 'center',
                          boxShadow:    '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {idx + 1}
                      </div>
                    )}

                    {/* Caption tooltip on hover */}
                    <div
                      style={{
                        position:   'absolute',
                        bottom:     0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(26,18,16,0.85), transparent)',
                        padding:    '20px 8px 8px',
                        transform:  'translateY(0)',
                      }}
                    >
                      <p style={{
                        fontFamily: '"Lato", sans-serif',
                        fontSize:   '0.62rem',
                        color:      'rgba(255,255,255,0.85)',
                        overflow:   'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {memory.caption}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding:      '16px 24px',
            borderTop:    '1px solid rgba(242,208,216,0.5)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            gap:          12,
            flexShrink:   0,
          }}
        >
          {error && (
            <p style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.75rem', color: '#c0392b' }}>
              {error}
            </p>
          )}
          {!error && (
            <p style={{ fontFamily: '"Lato", sans-serif', fontSize: '0.72rem', color: '#6B4F4F', opacity: 0.55 }}>
              {selected.length === 0
                ? 'Select photos to feature as polaroids'
                : selected.length < 20
                ? `${20 - selected.length} more slot${20 - selected.length !== 1 ? 's' : ''} available`
                : '20 photos selected — looking great!'}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{
                background:    'transparent',
                border:        '1px solid rgba(242,208,216,0.8)',
                borderRadius:  '100px',
                padding:       '8px 20px',
                fontFamily:    '"Lato", sans-serif',
                fontSize:      '0.78rem',
                color:         '#6B4F4F',
                cursor:        'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selected.length === 0}
              style={{
                background:    selected.length > 0 ? '#7B1E3C' : 'rgba(123,30,60,0.3)',
                border:        'none',
                borderRadius:  '100px',
                padding:       '8px 24px',
                fontFamily:    '"Lato", sans-serif',
                fontSize:      '0.78rem',
                fontWeight:    700,
                color:         'white',
                cursor:        selected.length > 0 && !saving ? 'pointer' : 'not-allowed',
                opacity:       saving ? 0.7 : 1,
                transition:    'all 0.2s ease',
              }}
            >
              {saving ? 'Saving…' : `Save ${selected.length > 0 ? `(${selected.length})` : ''}`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
