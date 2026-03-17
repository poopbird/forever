import Link from 'next/link';
import type { FaqItem } from './FaqAccordion';

interface FaqPreviewProps {
  faqs:       FaqItem[];
  coupleId:   string;
  totalCount: number;
  isOwner?:   boolean;
}

export default function FaqPreview({ faqs, coupleId, totalCount, isOwner = false }: FaqPreviewProps) {
  if (faqs.length === 0) return null;

  const remaining = totalCount - faqs.length;

  return (
    <section style={{
      background: '#111118',
      padding:    'clamp(60px, 10vh, 90px) 24px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{
          fontFamily:    '"Lato", sans-serif',
          fontSize:      '0.6rem',
          letterSpacing: '0.44em',
          textTransform: 'uppercase',
          color:         'rgba(201,150,74,0.55)',
          marginBottom:  14,
        }}>
          ✦ &nbsp; Wedding Day &nbsp; ✦
        </p>
        <h2 style={{
          fontFamily:    '"Playfair Display", Georgia, serif',
          fontSize:      'clamp(1.8rem, 4vw, 2.6rem)',
          fontStyle:     'italic',
          fontWeight:    700,
          color:         'rgba(253,248,240,0.92)',
          margin:        0,
        }}>
          Good to Know
        </h2>
      </div>

      {/* 3 FAQ items — static, no accordion */}
      <div style={{
        maxWidth:  680,
        margin:    '0 auto',
        display:   'flex',
        flexDirection: 'column',
        gap:       2,
        marginBottom: 40,
      }}>
        {faqs.map((faq, i) => (
          <div
            key={faq.id}
            style={{
              padding:      '20px 24px',
              borderRadius: 10,
              background:   'rgba(255,255,255,0.03)',
              border:       '1px solid rgba(255,255,255,0.07)',
              animation:    `fadeUp 0.5s ease ${i * 0.08}s both`,
            }}
          >
            <p style={{
              fontFamily:   '"Playfair Display", Georgia, serif',
              fontSize:     'clamp(0.92rem, 2vw, 1rem)',
              fontWeight:   600,
              color:        'rgba(232,201,123,0.88)',
              marginBottom: 8,
              lineHeight:   1.4,
            }}>
              {faq.question}
            </p>
            <p style={{
              fontFamily:   '"Lato", sans-serif',
              fontSize:     'clamp(0.84rem, 1.8vw, 0.93rem)',
              color:        'rgba(240,220,200,0.58)',
              lineHeight:   1.75,
              margin:       0,
              whiteSpace:   'pre-wrap',
              wordBreak:    'break-word',
              overflowWrap: 'anywhere',
            }}>
              {faq.answer || <em style={{ opacity: 0.4 }}>Coming soon…</em>}
            </p>
          </div>
        ))}
      </div>

      {/* View all link */}
      <div style={{ textAlign: 'center' }}>
        <Link
          href={`/view/${coupleId}/faq${isOwner ? '?back=home' : ''}`}
          style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           10,
            padding:       '12px 28px',
            borderRadius:  '100px',
            border:        '1px solid rgba(201,150,74,0.38)',
            background:    'rgba(201,150,74,0.08)',
            color:         'rgba(232,201,123,0.9)',
            fontFamily:    '"Lato", sans-serif',
            fontSize:      '0.75rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration:'none',
            backdropFilter:'blur(8px)',
            transition:    'all 0.2s',
          }}
        >
          {remaining > 0
            ? `View all FAQs  ·  ${remaining} more question${remaining === 1 ? '' : 's'}`
            : 'View all FAQs'}
          <span style={{ fontSize: '0.9rem' }}>→</span>
        </Link>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
