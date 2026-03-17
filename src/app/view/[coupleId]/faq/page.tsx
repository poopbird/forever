import { createAdminClient } from '@/lib/supabase/admin';
import { notFound }          from 'next/navigation';
import Link                  from 'next/link';
import FaqAccordion          from '@/components/faq/FaqAccordion';
import type { FaqItem }      from '@/components/faq/FaqAccordion';

export const revalidate = 60;

type Params = { params: Promise<{ coupleId: string }>; searchParams: Promise<{ back?: string }> };

export default async function FaqPage({ params, searchParams }: Params) {
  const { coupleId } = await params;
  const { back } = await searchParams;
  const backHref = back === 'home' ? '/' : `/view/${coupleId}`;
  const admin = createAdminClient();

  const [{ data: couple }, { data: faqs }] = await Promise.all([
    admin.from('couples').select('id, name').eq('id', coupleId).single(),
    admin.from('faqs').select('*').eq('couple_id', coupleId).order('position', { ascending: true }),
  ]);

  if (!couple) notFound();

  const faqList: FaqItem[] = faqs ?? [];

  return (
    <main style={{ minHeight: '100vh', background: '#1a1210' }}>

      {/* ── Header ── */}
      <div style={{
        background:   'linear-gradient(180deg, #0f0c0a 0%, #1a1210 100%)',
        padding:      'clamp(60px, 10vh, 100px) 24px 48px',
        textAlign:    'center',
        borderBottom: '1px solid rgba(201,150,74,0.12)',
      }}>
        {/* Back link */}
        <div style={{ marginBottom: 40 }}>
          <Link
            href={backHref}
            style={{
              fontFamily:    '"Lato", sans-serif',
              fontSize:      '0.68rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color:         'rgba(201,150,74,0.6)',
              textDecoration: 'none',
            }}
          >
            ← Back to {couple.name}
          </Link>
        </div>

        {/* Eyebrow */}
        <p style={{
          fontFamily:    '"Lato", sans-serif',
          fontSize:      '0.6rem',
          letterSpacing: '0.44em',
          textTransform: 'uppercase',
          color:         'rgba(201,150,74,0.55)',
          marginBottom:  18,
        }}>
          ✦ &nbsp; Wedding Day Info &nbsp; ✦
        </p>

        {/* Title */}
        <h1 style={{
          fontFamily:    '"Playfair Display", Georgia, serif',
          fontSize:      'clamp(2.4rem, 6vw, 4rem)',
          fontStyle:     'italic',
          fontWeight:    700,
          color:         'rgba(253,248,240,0.95)',
          lineHeight:    1.1,
          margin:        '0 0 16px',
          letterSpacing: '-0.01em',
        }}>
          Frequently Asked<br />Questions
        </h1>

        <p style={{
          fontFamily: '"Lato", sans-serif',
          fontSize:   'clamp(0.85rem, 2vw, 1rem)',
          color:      'rgba(240,220,200,0.45)',
          maxWidth:   480,
          margin:     '0 auto',
          lineHeight: 1.7,
        }}>
          Everything you need to know for {couple.name}&apos;s big day.
        </p>
      </div>

      {/* ── FAQ content ── */}
      <div style={{
        maxWidth: 720,
        margin:   '0 auto',
        padding:  'clamp(40px, 8vh, 80px) 24px clamp(60px, 12vh, 120px)',
      }}>
        <FaqAccordion faqs={faqList} />
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop:   '1px solid rgba(201,150,74,0.1)',
        padding:     '28px 24px',
        textAlign:   'center',
      }}>
        <p style={{
          fontFamily: '"Lato", sans-serif',
          fontSize:   '0.68rem',
          color:      'rgba(255,255,255,0.2)',
          letterSpacing: '0.06em',
        }}>
          {couple.name} &nbsp;·&nbsp; Made with love
        </p>
      </div>
    </main>
  );
}
