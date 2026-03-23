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

      {/* Warm cream body */}
      <Body style={{ background: '#f5f0e8', fontFamily: 'Georgia, serif', margin: 0, padding: '40px 0' }}>

        {/* ── Polaroid outer frame ── */}
        <Container style={{
          maxWidth:  480,
          margin:    '0 auto',
          background:'#ffffff',
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
              margin:        '0 0 20px',
            }}>
              ✦ &nbsp; Friendly reminder &nbsp; ✦
            </Text>

            <Hr style={{ borderColor: 'rgba(201,150,74,0.15)', margin: '0 0 22px' }} />

            <Text style={{
              fontFamily: 'monospace',
              fontSize:   13,
              color:      'rgba(201,150,74,0.7)',
              lineHeight: 1.8,
              margin:     '0 0 8px',
            }}>
              Hi {guestName},
            </Text>
            <Text style={{
              fontFamily: 'monospace',
              fontSize:   13,
              color:      'rgba(201,150,74,0.7)',
              lineHeight: 1.8,
              margin:     '0 0 26px',
            }}>
              Just a gentle reminder — your RSVP for the wedding of {coupleName} is due by{' '}
              <strong style={{ color: 'rgba(232,213,176,0.9)' }}>{deadline}</strong>.
              We&apos;d love to know if you can make it!
            </Text>

            <Section style={{ marginBottom: 26 }}>
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

            <Hr style={{ borderColor: 'rgba(201,150,74,0.1)', margin: '0 0 14px' }} />
            <Text style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(201,150,74,0.3)', margin: 0 }}>
              This reminder was sent to {guestName}. If you&apos;ve already responded, please ignore this email.
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
            <Text style={{
              fontFamily:    'Georgia, serif',
              fontSize:      11,
              color:         'rgba(0,0,0,0.35)',
              margin:        0,
              letterSpacing: '0.12em',
            }}>
              Please respond by {deadline}
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
