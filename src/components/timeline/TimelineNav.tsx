'use client';

interface TimelineNavProps {
  /** All month keys in order e.g. ["2023-06", "2023-07", "2024-01"] */
  monthKeys: string[];
  activeMonth: string;
}

export default function TimelineNav({ monthKeys, activeMonth }: TimelineNavProps) {
  // Group month keys by year
  const byYear = monthKeys.reduce<Record<string, string[]>>((acc, key) => {
    const year = key.slice(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(key);
    return acc;
  }, {});

  function scrollTo(monthKey: string) {
    document.getElementById(`month-${monthKey}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <>
      {/* ── Desktop: sticky left sidebar ── */}
      <div className="hidden md:block sticky top-8 space-y-5 pr-4 border-r border-rose-100">
        {Object.entries(byYear).map(([year, keys]) => (
          <div key={year}>
            <p className="font-serif text-sm text-rose-deep font-semibold mb-1.5">{year}</p>
            <ul className="space-y-1">
              {keys.map((key) => {
                const isActive = key === activeMonth;
                const monthName = new Date(`${key}-02`).toLocaleDateString('en-GB', {
                  month: 'short',
                });
                return (
                  <li key={key}>
                    <button
                      onClick={() => scrollTo(key)}
                      className={`text-left text-xs font-sans w-full transition-colors duration-150
                        ${isActive
                          ? 'text-rose-deep font-bold'
                          : 'text-ink-light hover:text-ink'
                        }`}
                    >
                      {isActive && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-deep mr-1.5 mb-0.5" />
                      )}
                      {monthName}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Mobile: horizontal scroll strip ── */}
      <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {monthKeys.map((key) => {
          const isActive = key === activeMonth;
          const label = new Date(`${key}-02`).toLocaleDateString('en-GB', {
            month: 'short',
            year: '2-digit',
          });
          return (
            <button
              key={key}
              onClick={() => scrollTo(key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-sans transition-colors duration-150
                ${isActive
                  ? 'bg-rose-deep text-white font-bold'
                  : 'bg-cream-dark text-ink-light hover:text-ink'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}
