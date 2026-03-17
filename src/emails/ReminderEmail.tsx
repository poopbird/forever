import {
  Html, Head, Body, Container, Section,
  Text, Link, Hr, Preview,
} from '@react-email/components';

interface Props {
  coupleName:  string;
  guestName:   string;
  rsvpLink:    string;
  deadline:    string;
}

export default function ReminderEmail({ coupleName, guestName, rsvpLink, deadline }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reminder: RSVP by {deadline} — {coupleName}</Preview>
      <Body style={{ background: '#0d0b08', fontFamily: 'Georgia, serif', margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,150,74,0.2)', borderRadius: 16, padding: '40px 36px' }}>

          <Text style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,150,74,0.5)', margin: '0 0 8px' }}>
            Friendly reminder
          </Text>
          <Text style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'rgba(232,213,176,0.92)', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
            {coupleName}
          </Text>

          <Hr style={{ borderColor: 'rgba(201,150,74,0.15)', margin: '0 0 24px' }} />

          <Text style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(201,150,74,0.7)', lineHeight: 1.8, margin: '0 0 8px' }}>
            Hi {guestName},
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(201,150,74,0.7)', lineHeight: 1.8, margin: '0 0 24px' }}>
            Just a gentle reminder — your RSVP for the wedding of {coupleName} is due by{' '}
            <strong style={{ color: 'rgba(232,213,176,0.9)' }}>{deadline}</strong>.
            We&apos;d love to know if you can make it!
          </Text>

          <Section style={{ marginBottom: 28 }}>
            <Link href={rsvpLink}
              style={{ display: 'inline-block', background: '#7B1E3C', color: '#fff', fontFamily: 'monospace', fontSize: 13, padding: '12px 28px', borderRadius: 8, textDecoration: 'none', letterSpacing: '0.05em' }}>
              Submit your RSVP →
            </Link>
          </Section>

          <Hr style={{ borderColor: 'rgba(201,150,74,0.1)', margin: '0 0 16px' }} />
          <Text style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(201,150,74,0.3)', margin: 0 }}>
            This reminder was sent to {guestName}. If you&apos;ve already responded, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
