'use client';

import Image from 'next/image';

export default function CoverHero() {
  const coupleName = process.env.NEXT_PUBLIC_COUPLE_NAME ?? 'Our Story';
  const startDateRaw = process.env.NEXT_PUBLIC_RELATIONSHIP_START_DATE;
  const coverPhoto = process.env.NEXT_PUBLIC_COVER_PHOTO_URL;

  const formattedDate = startDateRaw
    ? new Date(startDateRaw).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <header className="relative h-screen flex items-center justify-center text-center overflow-hidden">
      {/* Background — cover photo or warm gradient fallback */}
      {coverPhoto ? (
        <Image
          src={coverPhoto}
          alt="Cover"
          fill
          className="object-cover brightness-50"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-rose-deep via-[#5A1530] to-ink" />
      )}

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Content */}
      <div className="relative z-10 px-6 text-white animate-fade-in">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-gold-light mb-6 opacity-80">
          Forever
        </p>
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold mb-4 drop-shadow-lg">
          {coupleName}
        </h1>
        {formattedDate && (
          <p className="font-sans text-base md:text-lg text-white/70 mb-10">
            Together since {formattedDate}
          </p>
        )}
        <a
          href="#timeline"
          className="inline-block px-8 py-3 border border-white/40 rounded-full
                     text-white/80 hover:text-white hover:border-white/70 hover:bg-white/10
                     transition-all duration-300 font-sans text-sm tracking-widest uppercase"
        >
          Explore Our Story ↓
        </a>
      </div>
    </header>
  );
}
