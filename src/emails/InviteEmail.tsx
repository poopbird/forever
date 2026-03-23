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

  const body = customBody ?? [
    `Hi ${guestName},`,
    '',
    `You're warmly invited to the wedding of ${coupleName}!`,
    weddingDate ? `📅 ${weddingDate}${venueStr ? `  ·  📍 ${venueStr}` : ''}` : '',
    '',
    'Browse our story and submit your RSVP using the links below.',
    deadline ? `Please respond by ${deadline}.` : '',
  ].filter(l => l !== null).join('\n');

  // Caption footer detail line
  const detailParts = [weddingDate, venueStr].filter(Boolean);
  const detailLine  = detailParts.join(' · ');

  return (
    <Html lang="en">
      <Head />
      <Preview>You&apos;re invited — {coupleName}</Preview>

      {/* Warm cream body — like the table a polaroid photo sits on */}
      <Body style={{ background: '#f5f0e8', fontFamily: 'Georgia, serif', margin: 0, padding: '40px 0' }}>

        {/* ── Polaroid outer frame ── */}
        <Container style={{
          maxWidth:  480,
          margin:    '0 auto',
          background:'#ffffff',
          // Polaroid proportions: equal border top/sides, 0 bottom — footer handles it
          padding:   '14px 14px 0',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
        }}>

          {/* ── Dark "photo" section ── */}
          <Section style={{
            background:   '#1a1510',
            borderRadius: '3px',
            padding:      '32px 28px 36px',
          }}>
            <Text style={{
              fontFamily:    'monospace',
              fontSize:      10,
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              color:         'rgba(201,150,74,0.55)',
              margin:        '0 0 6px',
            }}>
              ✦ &nbsp; You&apos;re invited &nbsp; ✦
            </Text>

            <Hr style={{ borderColor: 'rgba(201,150,74,0.15)', margin: '0 0 22px' }} />

            <Text style={{
              fontFamily: 'monospace',
              fontSize:   13,
              color:      'rgba(201,150,74,0.7)',
              whiteSpace: 'pre-line',
              lineHeight: 1.8,
              margin:     '0 0 28px',
            }}>
              {body}
            </Text>

            <Section style={{ marginBottom: 16 }}>
              <Link
                href={rsvpLink}
                style={{
                  display:        'inline-block',
                  background:     '#7B1E3C',
                  color:          '#fff',
                  fontFamily:     'monospace',
                  fontSize:       13,
                  padding:        '12px 28px',
                  borderRadius:   '3px',
                  textDecoration: 'none',
                  letterSpacing:  '0.05em',
                }}
              >
                Submit your RSVP →
              </Link>
            </Section>

            <Section style={{ marginBottom: 20 }}>
              <Link
                href={foreverLink}
                style={{
                  fontFamily:     'monospace',
                  fontSize:       12,
                  color:          'rgba(201,150,74,0.6)',
                  textDecoration: 'underline',
                }}
              >
                View our story →
              </Link>
            </Section>

            <Hr style={{ borderColor: 'rgba(201,150,74,0.1)', margin: '0 0 14px' }} />
            <Text style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(201,150,74,0.3)', margin: 0 }}>
              This invitation was sent to {guestName}. If you received this by mistake, please ignore it.
            </Text>
          </Section>

          {/* ── Caption footer ── */}
          <Section style={{
            background: '#ffffff',
            padding:    '22px 20px 44px',
            textAlign:  'center',
          }}>
            <Text style={{
              fontFamily:    'Georgia, serif',
              fontSize:      24,
              fontStyle:     'italic',
              color:         '#1a0f08',
              margin:        '0 0 6px',
              letterSpacing: '-0.01em',
            }}>
              {coupleName}
            </Text>
            {detailLine && (
              <Text style={{
                fontFamily:    'Georgia, serif',
                fontSize:      11,
                color:         'rgba(0,0,0,0.35)',
                margin:        0,
                letterSpacing: '0.12em',
              }}>
                {detailLine}
              </Text>
            )}
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
