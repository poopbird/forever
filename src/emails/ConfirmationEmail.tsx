import {
  Html, Head, Body, Container, Section,
  Text, Link, Hr, Preview, Row, Column,
} from '@react-email/components';

const DIETARY_LABELS: Record<string, string> = {
  none: 'None', vegetarian: 'Vegetarian', vegan: 'Vegan',
  halal: 'Halal', kosher: 'Kosher', 'gluten-free': 'Gluten-free',
};

interface Props {
  coupleName:      string;
  guestName:       string;
  rsvpStatus:      'attending' | 'declined';
  dietaryPreset?:  string | null;
  dietaryNotes?:   string | null;
  plusOneAttending?: boolean | null;
  plusOneName?:    string | null;
  plusOneDietary?: string | null;
  changeLink:      string;
  calendarLink?:   string | null;
  icsLink?:        string | null;
  weddingDate?:    string | null;
  weddingVenue?:   string | null;
  weddingCity?:    string | null;
}

export default function ConfirmationEmail({
  coupleName, guestName, rsvpStatus, dietaryPreset, dietaryNotes,
  plusOneAttending, plusOneName, plusOneDietary,
  changeLink, calendarLink, icsLink, weddingDate, weddingVenue, weddingCity,
}: Props) {
  const attending  = rsvpStatus === 'attending';
  const statusText = attending ? '🎉 You\'re attending!' : 'You\'ve declined';
  const venueStr   = [weddingVenue, weddingCity].filter(Boolean).join(', ');
  const dietLabel  = dietaryPreset && dietaryPreset !== 'none' ? DIETARY_LABELS[dietaryPreset] : null;

  return (
    <Html lang="en">
      <Head />
      <Preview>RSVP confirmed — {coupleName}</Preview>
      <Body style={{ background: '#0d0b08', fontFamily: 'Georgia, serif', margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,150,74,0.2)', borderRadius: 16, padding: '40px 36px' }}>

          <Text style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(201,150,74,0.5)', margin: '0 0 8px' }}>
            RSVP Confirmed
          </Text>
          <Text style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: 'rgba(232,213,176,0.92)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {coupleName}
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 13, color: attending ? '#2D8A4E' : 'rgba(201,150,74,0.6)', margin: '0 0 24px' }}>
            {statusText}
          </Text>

          <Hr style={{ borderColor: 'rgba(201,150,74,0.15)', margin: '0 0 24px' }} />

          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(201,150,74,0.5)', margin: '0 0 16px' }}>
            Hi {guestName}, here&apos;s a summary of your response:
          </Text>

          {/* Summary table */}
          <Section style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(201,150,74,0.1)', padding: '16px 20px', marginBottom: 24 }}>
            <Row style={{ marginBottom: 8 }}>
              <Column style={{ width: '40%' }}>
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(201,150,74,0.4)', margin: 0 }}>Status</Text>
              </Column>
              <Column>
                <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(232,213,176,0.8)', margin: 0 }}>{attending ? 'Attending' : 'Declined'}</Text>
              </Column>
            </Row>
            {attending && (dietLabel || dietaryNotes) && (
              <Row style={{ marginBottom: 8 }}>
                <Column style={{ width: '40%' }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(201,150,74,0.4)', margin: 0 }}>Dietary</Text>
                </Column>
                <Column>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(232,213,176,0.8)', margin: 0 }}>
                    {[dietLabel, dietaryNotes].filter(Boolean).join(' — ')}
                  </Text>
                </Column>
              </Row>
            )}
            {attending && plusOneAttending && (
              <Row style={{ marginBottom: 8 }}>
                <Column style={{ width: '40%' }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(201,150,74,0.4)', margin: 0 }}>+1</Text>
                </Column>
                <Column>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(232,213,176,0.8)', margin: 0 }}>
                    {plusOneName || 'Attending'}
                    {plusOneDietary && plusOneDietary !== 'none' ? ` · ${DIETARY_LABELS[plusOneDietary] ?? plusOneDietary}` : ''}
                  </Text>
                </Column>
              </Row>
            )}
            {attending && weddingDate && (
              <Row>
                <Column style={{ width: '40%' }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(201,150,74,0.4)', margin: 0 }}>Date</Text>
                </Column>
                <Column>
                  <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(232,213,176,0.8)', margin: 0 }}>
                    {weddingDate}{venueStr ? `  ·  ${venueStr}` : ''}
                  </Text>
                </Column>
              </Row>
            )}
          </Section>

          {/* Add to calendar — attending only */}
          {attending && (calendarLink || icsLink) && (
            <Section style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(201,150,74,0.4)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Save the date
              </Text>
              <Row>
                {calendarLink && (
                  <Column style={{ paddingRight: 8 }}>
                    <Link href={calendarLink}
                      style={{ display: 'inline-block', background: 'rgba(201,150,74,0.12)', color: '#C9964A', fontFamily: 'monospace', fontSize: 12, padding: '10px 20px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(201,150,74,0.3)' }}>
                      📅 Google Calendar
                    </Link>
                  </Column>
                )}
                {icsLink && (
                  <Column>
                    <Link href={icsLink}
                      style={{ display: 'inline-block', background: 'rgba(201,150,74,0.12)', color: '#C9964A', fontFamily: 'monospace', fontSize: 12, padding: '10px 20px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(201,150,74,0.3)' }}>
                      🍎 Apple / Outlook
                    </Link>
                  </Column>
                )}
              </Row>
            </Section>
          )}

          {/* Change answers */}
          <Section style={{ marginBottom: 28 }}>
            <Link href={changeLink}
              style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(201,150,74,0.5)', textDecoration: 'underline' }}>
              Need to change your answers? Click here →
            </Link>
          </Section>

          <Hr style={{ borderColor: 'rgba(201,150,74,0.1)', margin: '0 0 16px' }} />
          <Text style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(201,150,74,0.3)', margin: 0 }}>
            This confirmation was sent to {guestName}. If you received this by mistake, please ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
