'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FaqItem {
  id:       string;
  category: string | null;
  question: string;
  answer:   string;
  position: number;
}

interface FaqAccordionProps {
  faqs: FaqItem[];
}

// Group by category, preserving insertion order
function groupByCategory(faqs: FaqItem[]): Map<string, FaqItem[]> {
  const map = new Map<string, FaqItem[]>();
  for (const faq of faqs) {
    const cat = faq.category ?? 'General';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(faq);
  }
  return map;
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  if (faqs.length === 0) {
    return (
      <p style={{
        fontFamily: '"Lato", sans-serif',
        fontSize:   '0.9rem',
        color:      'rgba(255,255,255,0.35)',
        textAlign:  'center',
        padding:    '48px 0',
      }}>
        No FAQs yet — check back soon.
      </p>
    );
  }

  const grouped = groupByCategory(faqs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          {/* Category label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(201,150,74,0.22)' }} />
            <p style={{
              fontFamily:    '"Lato", sans-serif',
              fontSize:      '0.6rem',
              letterSpacing: '0.38em',
              textTransform: 'uppercase',
              color:         'rgba(201,150,74,0.6)',
              whiteSpace:    'nowrap',
            }}>
              {category}
            </p>
            <div style={{ height: 1, flex: 1, background: 'rgba(201,150,74,0.22)' }} />
          </div>

          {/* FAQ items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(faq => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  style={{
                    borderRadius: 10,
                    background:   isOpen ? 'rgba(201,150,74,0.07)' : 'rgba(255,255,255,0.03)',
                    border:       `1px solid ${isOpen ? 'rgba(201,150,74,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    overflow:     'hidden',
                    transition:   'background 0.2s, border-color 0.2s',
                  }}
                >
                  {/* Question row */}
                  <button
                    onClick={() => toggle(faq.id)}
                    style={{
                      width:          '100%',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      gap:            16,
                      padding:        '18px 22px',
                      background:     'transparent',
                      border:         'none',
                      cursor:         'pointer',
                      textAlign:      'left',
                    }}
                  >
                    <span style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize:   'clamp(0.95rem, 2vw, 1.05rem)',
                      fontWeight: 600,
                      color:      isOpen ? 'rgba(232,201,123,0.97)' : 'rgba(253,248,240,0.85)',
                      lineHeight: 1.4,
                      transition: 'color 0.2s',
                    }}>
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.22 }}
                      style={{
                        display:    'block',
                        flexShrink: 0,
                        fontSize:   '1.1rem',
                        color:      'rgba(201,150,74,0.7)',
                        lineHeight: 1,
                      }}
                    >
                      +
                    </motion.span>
                  </button>

                  {/* Answer */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{    height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p style={{
                          fontFamily:  '"Lato", sans-serif',
                          fontSize:    'clamp(0.88rem, 1.8vw, 0.97rem)',
                          color:       'rgba(240,220,200,0.68)',
                          lineHeight:  1.8,
                          padding:     '0 22px 20px',
                          whiteSpace:  'pre-wrap',
                          wordBreak:   'break-word',
                          overflowWrap: 'anywhere',
                        }}>
                          {faq.answer || <em style={{ opacity: 0.4 }}>Answer coming soon…</em>}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
