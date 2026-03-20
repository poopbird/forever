import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import ReminderEmail from '@/emails/ReminderEmail';

/**
 * GET /api/cron/rsvp-reminder
 * Called daily by Vercel Cron (vercel.json: "0 8 * * *").
 * Finds all couples whose reminder is due today and emails pending guests.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  const secret = request.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend  = new Resend(process.env.RESEND_API_KEY);
  const admin   = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const today   = new Date();

  // Fetch couples with a deadline + reminder days set
  const { data: couples } = await admin
    .from('couples')
    .select('id, name, rsvp_locked_at, reminder_days_before')
    .not('rsvp_locked_at', 'is', null)
    .not('reminder_days_before', 'is', null);

  if (!couples?.length) return NextResponse.json({ sent: 0 });

  let totalSent = 0;

  await Promise.allSettled(couples.map(async couple => {
    const deadline     = new Date(couple.rsvp_locked_at + 'T00:00:00');
    const reminderDate = new Date(deadline);
    reminderDate.setDate(reminderDate.getDate() - couple.reminder_days_before);

    // Only fire if today matches the reminder date
    if (
      reminderDate.getFullYear() !== today.getFullYear() ||
      reminderDate.getMonth()    !== today.getMonth()    ||
      reminderDate.getDate()     !== today.getDate()
    ) return;

    const deadlineStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Fetch pending guests with an email who haven't been reminded yet
    const { data: guests } = await admin
      .from('rsvp_guests')
      .select('id, name, email, token')
      .eq('couple_id', couple.id)
      .eq('rsvp_status', 'pending')
      .not('email', 'is', null)
      .is('reminder_sent_at', null);

    if (!guests?.length) return;

    await Promise.allSettled(guests.map(async g => {
      const html = await render(
        <ReminderEmail
          coupleName={couple.name}
          guestName={g.name}
          rsvpLink={`${siteUrl}/rsvp/${g.token}`}
          deadline={deadlineStr}
        /> as React.ReactElement,
      );

      const { error } = await resend.emails.send({
        from:    `${couple.name} <noreply@foowengs.com>`,
        to:      g.email!,
        subject: `Reminder: RSVP by ${deadlineStr} — ${couple.name}`,
        html,
      });

      if (!error) {
        await admin
          .from('rsvp_guests')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', g.id);
        totalSent++;
      }
    }));
  }));

  return NextResponse.json({ sent: totalSent });
}
