import {
  Html, Head, Body, Container, Section,
  Text, Link, Hr, Preview,
} from '@react-email/components';

interface Props {
  coupleName:   string;
  guestName:    string;
  rsvpLink:     string;
  foreverLink:  string;
  weddingDate?: string | null;
  weddingVenue?: string | null;
  weddingCity?: string | null;
  deadline?:    string | null;
  customBody?:  string | null;
}

export default function InviteEmail({
  coupleName, guestName, rsvpLink, foreverLink,
  weddingDate, weddingVenue, weddingCity, deadline, customBody,
}: Props) {
  const venueStr = [weddingVenue, weddingCity].filter(Boolean).join(', ');

  // If a custom template was set, use it (variables already substituted by caller)
  const body = customBody ?? [
    `Hi ${guestName},`,
    '',
    `You're warmly invited to the wedding of ${coupleName}!`,
    weddingDate ? `📅 ${weddingDate}${venueStr ? `  ·  📍 ${venueStr}` : ''}` : '',
    '',
    'Browse our story and submit your RSVP using the links below.',
    deadline ? `Please respond by ${deadline}.` : '',
  ].filter(l => l !== null).join('\n');

  return (
    <Html lang="en">
      <Head />
      <Preview>You&apos;re invited — {coupleName}</Preview>
      <Body style={{ background: '#0d0b08', fontFamily: 'Georgia, serif', margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,150,74,0.2)', borderRadius: 16, padding: '40px 36px' }}>

          <Text style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,150,74,0.5)', margin: '0 0 8px' }}>
            You&apos;re invited
          </Text>
          <Text style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'rgba(232,213,176,0.92)', margin: '0 0 28px', letterSpacing: '-0.01em' }}>
            {coupleName}
          </Text>

          <Hr style={{ borderColor: 'rgba(201,150,74,0.15)', margin: '0 0 24px' }} />

          <Text style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(201,150,74,0.7)', whiteSpace: 'pre-line', lineHeight: 1.8, margin: '0 0 28px' }}>
            {body}
          </Text>

          <Section style={{ marginBottom: 16 }}>
            <Link href={rsvpLink}
              style={{ display: 'inline-block', background: '#7B1E3C', color: '#fff', fontFamily: 'monospace', fontSize: 13, padding: '12px 28px', borderRadius: 8, textDecoration: 'none', letterSpacing: '0.05em' }}>
              Submit your RSVP →
            </Link>
          </Section>

          <Section style={{ marginBottom: 28 }}>
            <Link href={foreverLink}
              style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(201,150,74,0.6)', textDecoration: 'underline' }}>
              View our story →
            </Link>
          </Section>

          <Hr style={{ borderColor: 'rgba(201,150,74,0.1)', margin: '0 0 16px' }} />
          <Text style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(201,150,74,0.3)', margin: 0 }}>
            This invitation was sent to {guestName}. If you received this by mistake, please ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
