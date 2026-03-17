/** Build a Google Calendar "add event" URL for a wedding. */
export function googleCalendarLink({
  title,
  date,
  venue,
  city,
}: {
  title:   string;
  date:    string;        // ISO date string e.g. "2026-04-01"
  venue?:  string | null;
  city?:   string | null;
}): string {
  // All-day event: dates in YYYYMMDD format
  const d      = date.replace(/-/g, '');
  const nextDay = new Date(date + 'T00:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const dEnd   = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
  const location = [venue, city].filter(Boolean).join(', ');
  const params   = new URLSearchParams({
    action:   'TEMPLATE',
    text:     title,
    dates:    `${d}/${dEnd}`,
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
