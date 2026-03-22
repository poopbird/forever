'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import RosePetals from './RosePetals';
import CoverVideoUpload from './CoverVideoUpload';

interface Props {
  videoUrl?: string | null;
  /** DB value overrides NEXT_PUBLIC_COUPLE_NAME */
  coupleName?: string;
  /** DB value overrides NEXT_PUBLIC_RELATIONSHIP_START_DATE */
  startDate?: string;
  /** DB value overrides NEXT_PUBLIC_LOVE_STORY */
  loveStory?: string;
  /** When true, hides upload/management controls. Used on public /view page. */
  readOnly?: boolean;
}

export default function CoverHero({
  videoUrl,
  coupleName: coupleNameProp,
  startDate: startDateProp,
  loveStory: loveStoryProp,
  readOnly = false,
}: Props) {
  const coupleName   = coupleNameProp ?? process.env.NEXT_PUBLIC_COUPLE_NAME ?? 'Our Story';
  const startDateRaw = startDateProp  ?? process.env.NEXT_PUBLIC_RELATIONSHIP_START_DATE;
  const coverPhoto   = process.env.NEXT_PUBLIC_COVER_PHOTO_URL;
  const loveStory    = loveStoryProp  ?? process.env.NEXT_PUBLIC_LOVE_STORY
                       ?? 'A beautiful journey, told one memory at a time.';

  // DB value takes priority; fall back to env var
  const coverVideo   = videoUrl ?? process.env.NEXT_PUBLIC_COVER_VIDEO_URL ?? null;

  const formattedDate = startDateRaw
    ? new Date(startDateRaw).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  // ── Scroll-driven parallax ────────────────────────────────────────────────
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // Content drifts up 110px as user scrolls through the hero
  const contentY = useTransform(scrollYProgress, [0, 1], ['0px', '-110px']);
  // Subtle fade out as well
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // ── Letter-by-letter name split ───────────────────────────────────────────
  // Keep spaces as non-breaking so layout is preserved
  const nameChars = coupleName.split('').map((ch, i) => ({
    ch: ch === ' ' ? '\u00A0' : ch,
    key: i,
  }));

  const charVariants = {
    hidden: { opacity: 0, y: 40, rotateX: -55, filter: 'blur(6px)' },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.7,
        delay: 0.45 + i * 0.045,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  return (
    <header
      ref={heroRef}
      className="relative h-screen flex items-center justify-center text-center overflow-hidden"
      style={{ height: '100dvh' }}
    >

      {/* ── Background layer ── */}
      {coverVideo ? (
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.42)' }}
        >
          <source src={coverVideo} type="video/mp4" />
        </video>
      ) : coverPhoto ? (
        <Image
          src={coverPhoto}
          alt="Cover"
          fill
          className="object-cover"
          style={{ filter: 'brightness(0.42)' }}
          priority
        />
      ) : (
        /* Deep romantic gradient when no media is set */
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #1A0A12 0%, #3D1228 40%, #2D1C2C 70%, #1A1020 100%)',
          }}
        />
      )}

      {/* Rose petals + light particles — always rendered on top of background */}
      <RosePetals />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.35) 100%), ' +
            'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/* ── Centred content (parallax wrapper) ── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 px-6 text-white flex flex-col items-center"
      >

        {/* "Forever" eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-sans text-[11px] tracking-[0.45em] uppercase mb-7"
          style={{ color: 'rgba(232,201,123,0.85)' }}
        >
          ✦ &nbsp; Forever &nbsp; ✦
        </motion.p>

        {/* Couple names — large serif, letter-by-letter reveal + gold gradient */}
        <h1
          className="font-serif font-bold drop-shadow-2xl mb-4 flex flex-wrap justify-center"
          style={{
            fontSize: 'clamp(2.8rem, 9vw, 7.5rem)',
            lineHeight: 1.15,
            perspective: '600px',
          }}
        >
          {nameChars.map(({ ch, key }) => (
            <motion.span
              key={key}
              custom={key}
              variants={charVariants}
              initial="hidden"
              animate="visible"
              style={{
                display: 'inline-block',
                // Extra padding so descenders (g, y, p…) aren't clipped by the background-clip box
                paddingBottom: '0.12em',
                background:
                  'linear-gradient(135deg, #C9964A 0%, #E8C97B 28%, #FDE8A0 50%, #E8C97B 72%, #C9964A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        {/* Together since date */}
        {formattedDate && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="font-sans text-sm tracking-widest mb-3"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            Together since {formattedDate}
          </motion.p>
        )}

        {/* Love story tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="font-serif italic text-lg md:text-xl max-w-sm md:max-w-lg mx-auto mb-10 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {loveStory}
        </motion.p>

        {/* CTA button */}
        <motion.a
          href="#highlights"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.15 }}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.12)' }}
          whileTap={{ scale: 0.97 }}
          className="inline-block px-10 py-3.5 rounded-full font-sans text-sm tracking-[0.22em] uppercase
                     border backdrop-blur-sm cursor-pointer"
          style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.85)' }}
        >
          Explore Our Story ↓
        </motion.a>
      </motion.div>

      {/* ── Cover video upload button — hidden for guests ── */}
      {!readOnly && <CoverVideoUpload currentVideoUrl={coverVideo} />}

      {/* Animated scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <motion.div
          className="w-px bg-gradient-to-b from-transparent via-white/50 to-transparent"
          style={{ height: 48 }}
          animate={{ scaleY: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </header>
  );
}
