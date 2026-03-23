# Plan: Polaroid-Themed RSVP Card Redesign

## Goal
Make the RSVP page, form, and all 3 email templates visually consistent with the website's
overarching Polaroid theme. The couple's chosen `invitation_theme` drives the exact look.

---

## 1 · RSVP Page — `/src/app/rsvp/[token]/page.tsx`

### 1a. Fetch `invitation_theme`
Add `invitation_theme` to the Supabase select:
```ts
.select('*, couples(name, ..., invitation_theme)')
```
Read the field and type-cast to `InvitationTheme | null`.

### 1b. Replace glass card with Polaroid frame
The current card is a plain `rounded-2xl` glass rectangle.
Replace it with a two-section polaroid structure:

```
┌─────────────────────────────────┐  ← outer frame (theme.frameBg, drop shadow)
│  ░░░░ PHOTO SECTION ░░░░░░░░░░  │  ← dark panel that holds the RsvpForm
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│─────────────────────────────────│  ← hairline separator (ruleColor)
│  Couple Name (nameFont, large)  │  ← polaroid caption footer (footerBg)
│  14 June 2025 · The Grand Hall  │  ← small detail line
└─────────────────────────────────┘
```

CSS details:
- Outer frame: `background: theme.frameBg`, `boxShadow: theme.frameShadow`
- Border proportions: `padding: 12px 12px 0` (equal top/sides, 0 bottom — footer handles bottom padding)
- Slight tilt: `transform: rotate(-1.2deg)` for physicality (same as PolaroidHighlights cards)
- Inner photo section: dark contrasting background, `padding: 28px 24px`
- Caption footer: `padding: 16px 16px 24px`, couple name in `theme.nameFont` at ~1.8rem, in `theme.nameStyle`

### 1c. Conditional decorative effects
Mirror what PolaroidHighlights does per theme:
- `hasGarden` (garden_bloom) → render botanical SVG overlay on the photo section background
- `hasStars` (midnight_indigo) → render the same twinkling star canvas
- `hasNoise` (sage_linen) → apply the linen noise texture overlay

---

## 2 · RSVP Form — `/src/app/rsvp/[token]/RsvpForm.tsx`

### 2a. Accept theme config as a prop
```ts
interface Props {
  guest: RsvpGuest;
  theme: CardThemeConfig;   // ← new
}
```
Import `CARD_THEMES` (already exported from PolaroidHighlights) and resolve the config in `page.tsx`.

### 2b. Attendance selector → mini-polaroid buttons
Replace the two flat pill buttons with a polaroid-style pair.
Each button:
- White/frameBg border, equal padding top/sides, extra bottom padding
- Small icon or label inside (✓ Attending / ✗ Declining)
- When selected: `transform: rotate(0deg) scale(1.04)`, stronger shadow
- When unselected: slight rotation (`rotate(2deg)` / `rotate(-2deg)`) and reduced opacity
- This mirrors the "pile" stacking feel from PolaroidHighlights

### 2c. Label typography
- Field labels: switch from `var(--font-mono)` to `theme.labelColor` + keep small/uppercase
- The "Hi {guest.name} — will you be joining us?" headline: use `theme.nameFont`, `theme.nameStyle`, `theme.nameColor` at ~1.4rem — this is the "handwritten" feel inside the photo area

### 2d. Success screen
The current success screen is a plain emoji + text.
Redesign as a mini polaroid moment:
- Small polaroid card shape with the status text as the caption
- `🎉 / 💌` in the photo area, success message in the caption footer
- Uses the same frame/footer colours from the theme

### 2e. Input & button colours
- `inputStyle` border: use `theme.ruleColor`
- `inputStyle` text: use `theme.valueColor`
- Submit button: use `theme.btnBg`, `theme.btnBorder`, `theme.btnColor`, `theme.btnFont`, `theme.btnStyle`

---

## 3 · Email Templates — all 3 files

**User chose: light cream polaroid feel.**

The emails currently use a dark glass container. Redesign all three to look like
a physical polaroid card dropped into the inbox.

### Shared polaroid email structure (apply to all 3):

```
Body background: #f5f0e8  (warm cream — like a table the photo sits on)

┌─────────────────────────────────┐  ← white outer frame
│                                 │    boxShadow: 0 8px 32px rgba(0,0,0,0.20)
│  ┌───────────────────────────┐  │  ← inner dark "photo" section (#1a1510)
│  │  eyebrow + headline        │  │    padding: 32px 28px
│  │  body content              │  │
│  │  CTA button                │  │
│  └───────────────────────────┘  │
│                                 │
│  Couple Name (Georgia italic)   │  ← caption footer (white, padding-bottom: 40px)
│  Small detail line              │
└─────────────────────────────────┘
```

CSS for email (all inline):
- Body: `background: '#f5f0e8'`
- Outer `<Container>`: `background: '#ffffff'`, `maxWidth: 480`, `margin: '0 auto'`, `padding: '14px 14px 0'`
  - (14px top/sides, 0 bottom — the footer section provides the bottom white space)
- Inner "photo" `<Section>`: `background: '#1a1510'`, `borderRadius: 4`, `padding: '32px 28px 36px'`
- Caption `<Section>` (below photo): `background: '#ffffff'`, `padding: '20px 16px 44px'`
  - Couple name: `Georgia, serif`, `fontSize: 26`, `fontStyle: 'italic'`, `color: '#1a0f08'`
  - Small detail: `fontSize: 11`, `color: 'rgba(0,0,0,0.38)'`, `letterSpacing: '0.15em'`

### 3a. InviteEmail.tsx
- Move eyebrow ("You're invited"), headline (coupleName), body text, and RSVP button inside the dark photo section
- Keep existing gold colour palette inside the dark section
- Caption footer: couple name + wedding date/venue in small text

### 3b. ConfirmationEmail.tsx
- Move eyebrow ("RSVP Confirmed"), status text, summary table, calendar buttons inside the dark photo section
- Caption footer: couple name + status emoji (🎉 attending / 💌 declined)

### 3c. ReminderEmail.tsx
- Move eyebrow ("Friendly reminder"), body text, deadline highlight, RSVP button inside the dark photo section
- Caption footer: couple name + deadline in small text

---

## Files to modify

| File | Changes |
|---|---|
| `src/app/rsvp/[token]/page.tsx` | Fetch invitation_theme; polaroid frame wrapper; pass theme to RsvpForm |
| `src/app/rsvp/[token]/RsvpForm.tsx` | Accept theme prop; polaroid attendance buttons; theme-aware typography/colours |
| `src/emails/InviteEmail.tsx` | Cream background; polaroid photo+caption structure |
| `src/emails/ConfirmationEmail.tsx` | Cream background; polaroid photo+caption structure |
| `src/emails/ReminderEmail.tsx` | Cream background; polaroid photo+caption structure |

## No new files needed
All theme tokens already exist in `CARD_THEMES` (exported from `PolaroidHighlights.tsx`).
No new dependencies required.
