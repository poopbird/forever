/** Format date+time into Google Calendar / iCal local datetime string (YYYYMMDDTHHMMSS) */
function formatDateTime(date: string, time: string): string {
  const parts = time.split(':');
  const h = parts[0].padStart(2, '0');
  const m = (parts[1] ?? '00').padStart(2, '0');
  return `${date.replace(/-/g, '')}T${h}${m}00`;
}

/** Add N hours to an HH:MM time string, capped at 23:59 */
function addHours(time: string, hours: number): string {
  const parts = time.split(':');
  const h = Math.min(parseInt(parts[0], 10) + hours, 23);
  return `${String(h).padStart(2, '0')}:${parts[1] ?? '00'}`;
}

/** Build a Google Calendar "add event" URL for a wedding. */
export function googleCalendarLink({
  title,
  date,
  timeStart,
  timeEnd,
  venue,
  city,
  description,
}: {
  title:        string;
  date:         string;        // ISO date string e.g. "2026-04-01"
  timeStart?:   string | null; // "HH:MM" 24-hr
  timeEnd?:     string | null;
  venue?:       string | null;
  city?:        string | null;
  description?: string | null;
}): string {
  const location = [venue, city].filter(Boolean).join(', ');

  let dates: string;
  if (timeStart) {
    const start = formatDateTime(date, timeStart);
    const end   = formatDateTime(date, timeEnd ?? addHours(timeStart, 2));
    dates = `${start}/${end}`;
  } else {
    const d = date.replace(/-/g, '');
    const nextDay = new Date(date + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const dEnd = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
    dates = `${d}/${dEnd}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text:   title,
    dates,
    ctz:    'Asia/Singapore',
    ...(location    ? { location }         : {}),
    ...(description ? { details: description } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Generate .ics file content (iCalendar format) for a wedding event. */
export function icsContent({
  title,
  date,
  timeStart,
  timeEnd,
  venue,
  city,
  description,
  uid,
}: {
  title:        string;
  date:         string;
  timeStart?:   string | null;
  timeEnd?:     string | null;
  venue?:       string | null;
  city?:        string | null;
  description?: string | null;
  uid:          string;
}): string {
  const location    = [venue, city].filter(Boolean).join(', ');
  const now         = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const descEscaped = (description ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,');

  let dtStart: string;
  let dtEnd:   string;

  if (timeStart) {
    dtStart = `DTSTART;TZID=Asia/Singapore:${formatDateTime(date, timeStart)}`;
    dtEnd   = `DTEND;TZID=Asia/Singapore:${formatDateTime(date, timeEnd ?? addHours(timeStart, 2))}`;
  } else {
    const d = date.replace(/-/g, '');
    const nextDay = new Date(date + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const dEnd = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
    dtStart = `DTSTART;VALUE=DATE:${d}`;
    dtEnd   = `DTEND;VALUE=DATE:${dEnd}`;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Forever Wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@forever-wedding`,
    `DTSTAMP:${now}`,
    dtStart,
    dtEnd,
    `SUMMARY:${title}`,
    location    ? `LOCATION:${location}`       : null,
    descEscaped ? `DESCRIPTION:${descEscaped}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[];

  return lines.join('\r\n');
}

/** Format a DB time string ("HH:MM:SS" or "HH:MM") for display as "HH:MM" */
export function formatTimeDisplay(t: string): string {
  return t.slice(0, 5);
}
