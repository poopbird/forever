'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Memory } from '@/types';
import { storageUrl } from '@/lib/storageUrl';

interface PhotoSheetProps {
  photos:  Memory[];
  onClose: () => void;
}

export default function PhotoSheet({ photos, onClose }: PhotoSheetProps) {
  const [idx, setIdx] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx(i => (i + 1) % photos.length);

  const current = photos[idx];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(0,0,0,0.72)',
          zIndex:     1000,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom sheet */}
      <motion.div
        key="sheet"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0,      opacity: 1 }}
        exit={{    y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
        style={{
          position:     'fixed',
          bottom:       0,
          left:         0,
          right:        0,
          zIndex:       1001,
          background:   '#1a1210',
          borderRadius: '20px 20px 0 0',
          padding:      '20px 0 32px',
          maxHeight:    '88vh',
          display:      'flex',
          flexDirection:'column',
        }}
      >
        {/* Handle + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto' }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position:   'absolute',
              top:        16,
              right:      20,
              background: 'rgba(255,255,255,0.08)',
              border:     'none',
              borderRadius:'50%',
              width:      32,
              height:     32,
              cursor:     'pointer',
              color:      'rgba(255,255,255,0.6)',
              fontSize:   '1rem',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Location label */}
        {current.location_name && (
          <p style={{
            fontFamily:    '"Lato", sans-serif',
            fontSize:      '0.7rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         'rgba(201,150,74,0.7)',
            textAlign:     'center',
            marginBottom:  14,
          }}>
            📍 {current.location_name}
          </p>
        )}

        {/* Photo */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 260 }}>
          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={storageUrl(current.media_url, { width: 800, quality: 80 })}
              alt=""
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1,  scale: 1 }}
              exit={{    opacity: 0,  scale: 0.97 }}
              transition={{ duration: 0.35 }}
              style={{
                position:  'absolute',
                inset:     0,
                width:     '100%',
                height:    '100%',
                objectFit: 'contain',
              }}
            />
          </AnimatePresence>
        </div>

        {/* Nav controls */}
        {photos.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '18px 24px 0' }}>
            <button onClick={prev} style={navBtn}>←</button>

            {/* Dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    width:        i === idx ? 20 : 7,
                    height:       7,
                    borderRadius: 4,
                    background:   i === idx ? 'rgba(201,150,74,0.9)' : 'rgba(255,255,255,0.2)',
                    border:       'none',
                    cursor:       'pointer',
                    transition:   'all 0.25s ease',
                    padding:      0,
                  }}
                />
              ))}
            </div>

            <button onClick={next} style={navBtn}>→</button>
          </div>
        )}

        {/* Date */}
        {current.date && (
          <p style={{
            fontFamily: '"Lato", sans-serif',
            fontSize:   '0.72rem',
            color:      'rgba(255,255,255,0.28)',
            textAlign:  'center',
            marginTop:  10,
          }}>
            {new Date(current.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const navBtn: React.CSSProperties = {
  background:    'rgba(255,255,255,0.07)',
  border:        '1px solid rgba(255,255,255,0.12)',
  borderRadius:  '50%',
  width:         40,
  height:        40,
  cursor:        'pointer',
  color:         'rgba(255,255,255,0.7)',
  fontSize:      '1.1rem',
  display:       'flex',
  alignItems:    'center',
  justifyContent:'center',
};
