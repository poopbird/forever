'use client';

import { useEffect, useState } from 'react';

interface Props {
  years: string[];
}

export default function TimelineJumpNav({ years }: Props) {
  const [activeYear, setActiveYear] = useState(years[0] ?? '');

  useEffect(() => {
    function onScroll() {
      // Walk years in reverse to find the last one whose marker is above the viewport midpoint
      for (const year of [...years].reverse()) {
        const el = document.getElementById(`year-${year}`);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveYear(year);
          return;
        }
      }
      setActiveYear(years[0] ?? '');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [years]);

  function jumpTo(year: string) {
    document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveYear(year);
  }

  // Only show when there are multiple years worth of memories
  if (years.length <= 1) return null;

  return (
    <nav
      aria-label="Jump to year"
      className="flex gap-2 justify-center flex-wrap mb-10"
    >
      {years.map((year) => (
        <button
          key={year}
          onClick={() => jumpTo(year)}
          className={`font-sans text-sm px-4 py-1.5 rounded-full border transition-colors duration-200 ${
            activeYear === year
              ? 'bg-rose-deep text-white border-rose-deep shadow-sm'
              : 'border-rose-100 text-ink-light hover:border-rose-medium hover:text-ink bg-white/60'
          }`}
        >
          {year}
        </button>
      ))}
    </nav>
  );
}
