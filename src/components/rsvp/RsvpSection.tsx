'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RsvpGuest, DietaryPreset } from '@/types';

const DIETARY_LABELS: Record<DietaryPreset, string> = {
  none:          'None',
  vegetarian:    'Vegetarian',
  vegan:         'Vegan',
  halal:         'Halal',
  kosher:        'Kosher',
  'gluten-free': 'Gluten-free',
};

interface Props {
  coupleId:               string;
  rsvpEnabled:            boolean;
  rsvpLockedAt:           string | null;
  reminderDaysBefore:     number | null;
  inviteMessageTemplate:  string | null;
  calendarDescription:    string | null;
  siteUrl:                string;
}

// ── Bulk add row type ──────────────────────────────────────────────────────────
type BulkRow = { name: string; email: string; phone: string; plusOne: boolean; error?: string };
const emptyRow = (): BulkRow => ({ name: '', email: '', phone: '', plusOne: false });

// ── Simple CSV parser ──────────────────────────────────────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim();
    });
    return obj;
  }).filter(row => Object.values(row).some(v => v));
}

function StatusPill({ status }: { status: string }) {
  const bg    = status === 'attending' ? 'rgba(45,138,78,0.12)'  : status === 'declined' ? 'rgba(123,30,60,0.1)'  : 'rgba(201,150,74,0.12)';
  const color = status === 'attending' ? '#2D8A4E'               : status === 'declined' ? '#7B1E3C'               : '#9a7840';
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: bg, color }}>
      {status}
    </span>
  );
}

const DEFAULT_TEMPLATE =
  'Hi {{guest_name}}, you\'re invited to our wedding!\n\nBrowse our story: {{forever_link}}\n\nSubmit your RSVP: {{rsvp_link}}\n\nDeadline: {{deadline}}';

const TEMPLATE_VARS = [
  { label: '{{guest_name}}',  desc: 'Guest\'s name' },
  { label: '{{rsvp_link}}',   desc: 'Personal RSVP link' },
  { label: '{{forever_link}}',desc: 'Forever page link' },
  { label: '{{wedding_date}}',desc: 'Wedding date' },
  { label: '{{deadline}}',    desc: 'RSVP deadline date' },
];

function buildPreview(
  template: string,
  guestName: string,
  rsvpLink: string,
  foreverLink: string,
  weddingDate: string,
  deadline: string,
) {
  return template
    .replace(/\{\{guest_name\}\}/g,   guestName  || 'Jane Smith')
    .replace(/\{\{rsvp_link\}\}/g,    rsvpLink   || '[rsvp link]')
    .replace(/\{\{forever_link\}\}/g, foreverLink|| '[forever link]')
    .replace(/\{\{wedding_date\}\}/g, weddingDate|| '[wedding date]')
    .replace(/\{\{deadline\}\}/g,     deadline   || '[deadline]');
}

export default function RsvpSection({
  coupleId,
  rsvpEnabled: initialEnabled,
  rsvpLockedAt: initialLocked,
  reminderDaysBefore: initialReminderDays,
  inviteMessageTemplate: initialTemplate,
  calendarDescription: initialCalendarDesc,
  siteUrl,
}: Props) {
  const [enabled,          setEnabled]          = useState(initialEnabled);
  const [lockedAt,         setLockedAt]         = useState(initialLocked ?? '');
  const [reminderDays,     setReminderDays]     = useState<string>(initialReminderDays?.toString() ?? '');
  const [msgTemplate,      setMsgTemplate]      = useState(initialTemplate ?? DEFAULT_TEMPLATE);
  const [showPreview,      setShowPreview]      = useState(false);
  const [calendarDesc,     setCalendarDesc]     = useState(initialCalendarDesc ?? '');
  const msgTemplateRef = useRef<HTMLTextAreaElement>(null);
  const [guests,    setGuests]    = useState<RsvpGuest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');
  const [copied,    setCopied]    = useState<string | null>(null);

  // Selection + send invite
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [sendModal,    setSendModal]    = useState(false);
  const [sendChannel,  setSendChannel]  = useState<'email' | 'whatsapp' | 'both' | null>(null);
  const [sendMsg,      setSendMsg]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [editTemplate, setEditTemplate] = useState('');
  const [showSendPreview, setShowSendPreview] = useState(false);

  // Add mode: 'single' | 'bulk' | 'csv' | null
  const [addMode,   setAddMode]   = useState<'single' | 'bulk' | 'csv' | null>(null);

  // Single add
  const [newName,  setNewName]  = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [plusOne,  setPlusOne]  = useState(false);
  const [addError, setAddError] = useState('');

  // Bulk add
  const [bulkRows,    setBulkRows]    = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [bulkSaving,  setBulkSaving]  = useState(false);
  const [bulkMsg,     setBulkMsg]     = useState('');

  // CSV upload
  const csvInputRef              = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<BulkRow[] | null>(null);
  const [csvError,   setCsvError]   = useState('');
  const [csvSaving,  setCsvSaving]  = useState(false);

  // Inline delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Inline cell edit: { id, field, value }
  type EditCell = { id: string; field: 'email' | 'phone'; value: string };
  const [editCell, setEditCell] = useState<EditCell | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/rsvp/guests');
    if (res.ok) setGuests(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const attending = guests.filter(g => g.rsvp_status === 'attending');
  const declined  = guests.filter(g => g.rsvp_status === 'declined');
  const pending   = guests.filter(g => g.rsvp_status === 'pending');
  const totalAttending = attending.reduce(
    (n, g) => n + 1 + (g.plus_one_invited && g.plus_one_attending ? 1 : 0), 0,
  );

  // ── Save RSVP settings ─────────────────────────────────────────────────────
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg('');
    const res = await fetch('/api/couples', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rsvp_enabled:             enabled,
        rsvp_locked_at:           lockedAt || null,
        reminder_days_before:     reminderDays ? parseInt(reminderDays, 10) : null,
        invite_message_template:  msgTemplate.trim() || null,
        calendar_description:     calendarDesc.trim() || null,
      }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? '✓ Saved' : '✗ Save failed');
  }

  // ── Single add ─────────────────────────────────────────────────────────────
  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!newName.trim()) { setAddError('Name is required'); return; }
    const res = await fetch('/api/rsvp/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(), email: newEmail.trim() || null,
        phone: newPhone.trim() || null, plus_one_invited: plusOne,
      }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Failed' }));
      setAddError(error ?? 'Failed to add guest');
      return;
    }
    const guest: RsvpGuest = await res.json();
    setGuests(prev => [...prev, guest]);
    setNewName(''); setNewEmail(''); setNewPhone(''); setPlusOne(false);
    setAddMode(null);
  }

  // ── Bulk add ───────────────────────────────────────────────────────────────
  function updateBulkRow(i: number, field: keyof BulkRow, value: string | boolean) {
    setBulkRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value, error: undefined } : r));
  }

  function handleBulkTab(e: React.KeyboardEvent, rowIdx: number, isLastField: boolean) {
    if (e.key === 'Tab' && !e.shiftKey && isLastField && rowIdx === bulkRows.length - 1) {
      e.preventDefault();
      setBulkRows(rows => [...rows, emptyRow()]);
      // Focus new row name cell after render
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-bulk-name]');
        inputs[inputs.length - 1]?.focus();
      }, 0);
    }
  }

  async function handleBulkSave() {
    const valid = bulkRows.filter(r => r.name.trim());
    if (!valid.length) { setBulkMsg('Add at least one guest name.'); return; }
    setBulkSaving(true); setBulkMsg('');

    const results = await Promise.all(valid.map(r =>
      fetch('/api/rsvp/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: r.name.trim(), email: r.email.trim() || null,
          phone: r.phone.trim() || null, plus_one_invited: r.plusOne,
        }),
      }).then(res => res.ok ? res.json() : null)
    ));

    const added = results.filter(Boolean) as RsvpGuest[];
    setGuests(prev => [...prev, ...added]);
    setBulkSaving(false);
    setBulkMsg(`✓ Added ${added.length} of ${valid.length} guests`);
    setBulkRows([emptyRow(), emptyRow(), emptyRow()]);
    if (added.length === valid.length) setTimeout(() => setAddMode(null), 1200);
  }

  // ── CSV upload ─────────────────────────────────────────────────────────────
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(''); setCsvPreview(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (!rows.length) { setCsvError('No valid rows found. Check your CSV format.'); return; }
      const preview: BulkRow[] = rows.map(r => ({
        name:    r['name'] ?? '',
        email:   r['email'] ?? '',
        phone:   r['phone'] ?? '',
        plusOne: /^(true|yes|1)$/i.test(r['plus_one_invited'] ?? ''),
        error:   !r['name']?.trim() ? 'Name required' : undefined,
      }));
      setCsvPreview(preview);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleCsvImport() {
    if (!csvPreview) return;
    const valid = csvPreview.filter(r => r.name.trim() && !r.error);
    if (!valid.length) { setCsvError('No valid rows to import.'); return; }
    setCsvSaving(true); setCsvError('');

    const results = await Promise.all(valid.map(r =>
      fetch('/api/rsvp/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: r.name.trim(), email: r.email.trim() || null,
          phone: r.phone.trim() || null, plus_one_invited: r.plusOne,
        }),
      }).then(res => res.ok ? res.json() : null)
    ));

    const added = results.filter(Boolean) as RsvpGuest[];
    setGuests(prev => [...prev, ...added]);
    setCsvSaving(false);
    setCsvPreview(null);
    setCsvError(`✓ Imported ${added.length} of ${valid.length} guests`);
    setTimeout(() => { setCsvError(''); setAddMode(null); }, 1500);
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = [
      'Name', 'Email', 'Phone', 'RSVP Status', 'Dietary', 'Dietary Notes',
      '+1 Invited', '+1 Attending', '+1 Name', '+1 Dietary', '+1 Dietary Notes', 'Responded At',
    ];
    const rows = guests.map(g => [
      g.name,
      g.email ?? '',
      g.phone ?? '',
      g.rsvp_status,
      g.dietary_preset ? DIETARY_LABELS[g.dietary_preset] : '',
      g.dietary_notes ?? '',
      g.plus_one_invited ? 'Yes' : 'No',
      g.plus_one_attending === true ? 'Yes' : g.plus_one_attending === false ? 'No' : '',
      g.plus_one_name ?? '',
      g.plus_one_dietary_preset ? DIETARY_LABELS[g.plus_one_dietary_preset] : '',
      g.plus_one_dietary_notes ?? '',
      g.responded_at ? new Date(g.responded_at).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'guest-list.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function confirmDelete(id: string) {
    const res = await fetch(`/api/rsvp/guests/${id}`, { method: 'DELETE' });
    if (res.ok) setGuests(prev => prev.filter(g => g.id !== id));
    setDeleteId(null);
  }

  // ── Save inline cell edit ─────────────────────────────────────────────────
  async function saveEditCell() {
    if (!editCell) return;
    const { id, field, value } = editCell;
    setEditCell(null);
    const res = await fetch(`/api/rsvp/guests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value.trim() || null }),
    });
    if (res.ok) {
      const updated: RsvpGuest = await res.json();
      setGuests(prev => prev.map(g => g.id === id ? updated : g));
    }
  }

  // ── Patch a single guest field (optimistic) ───────────────────────────────
  async function patchGuest(id: string, fields: Record<string, unknown>) {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...fields } : g));
    const res = await fetch(`/api/rsvp/guests/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    if (res.ok) {
      const updated: RsvpGuest = await res.json();
      setGuests(prev => prev.map(g => g.id === id ? updated : g));
    }
  }

  // ── Bulk mark selected guests as attending ────────────────────────────────
  async function markSelectedAttending() {
    const ids = Array.from(selected);
    setGuests(prev => prev.map(g => ids.includes(g.id) ? { ...g, rsvp_status: 'attending' as const } : g));
    await Promise.all(ids.map(id =>
      fetch(`/api/rsvp/guests/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rsvp_status: 'attending' }),
      })
    ));
    setSelected(new Set());
  }

  // ── Copy link ──────────────────────────────────────────────────────────────
  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${siteUrl}/rsvp/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected(prev => prev.size === guests.length ? new Set() : new Set(guests.map(g => g.id)));
  }

  // ── Open send invite modal ─────────────────────────────────────────────────
  function openSendModal() {
    setEditTemplate(msgTemplate);
    setSendChannel(null);
    setSendMsg('');
    setShowSendPreview(false);
    setSendModal(true);
  }

  // ── Send invite ────────────────────────────────────────────────────────────
  async function handleSendInvite() {
    if (!sendChannel) { setSendMsg('Please choose a channel.'); return; }
    setSending(true); setSendMsg('');

    const selectedIds = Array.from(selected);
    const selectedGuests = guests.filter(g => selectedIds.includes(g.id));

    // Check for already-invited guests
    const alreadySent = selectedGuests.filter(g => g.invite_sent_at);
    if (alreadySent.length > 0 && !sendMsg.startsWith('Resend')) {
      setSendMsg(`Resend? ${alreadySent.length} guest(s) already received an invite. Click Send again to confirm.`);
      setSending(false);
      return;
    }

    let sent = 0, skipped = 0;

    if (sendChannel === 'email' || sendChannel === 'both') {
      const res = await fetch('/api/email/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ guestIds: selectedIds }),
      });
      if (res.ok) {
        const d = await res.json();
        sent    += d.sent ?? 0;
        skipped += d.skipped ?? 0;
      }
    }

    // WhatsApp channel — placeholder until Meta API built
    if (sendChannel === 'whatsapp' || sendChannel === 'both') {
      setSendMsg('WhatsApp sending coming in Phase 3.');
      setSending(false);
      return;
    }

    // Update local state for invite_sent_at
    const now = new Date().toISOString();
    setGuests(prev => prev.map(g =>
      selectedIds.includes(g.id) ? { ...g, invite_sent_at: now } : g
    ));

    setSending(false);
    setSendMsg(`✓ Sent to ${sent} guest(s)${skipped ? ` · ${skipped} skipped (no email)` : ''}.`);
    setSelected(new Set());
    setTimeout(() => { setSendModal(false); setSendMsg(''); }, 2000);
  }

  function insertVar(v: string) {
    const ta = msgTemplateRef.current;
    if (!ta) { setMsgTemplate(t => t + v); return; }
    const start = ta.selectionStart ?? msgTemplate.length;
    const end   = ta.selectionEnd   ?? msgTemplate.length;
    const next  = msgTemplate.slice(0, start) + v + msgTemplate.slice(end);
    setMsgTemplate(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length); }, 0);
  }

  const foreverLink   = `${siteUrl}/view/${coupleId}`;
  const previewRsvp   = `${siteUrl}/rsvp/[token]`;
  const previewDeadline = lockedAt
    ? new Date(lockedAt + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '[no deadline set]';
  const previewText = buildPreview(msgTemplate, 'Jane Smith', previewRsvp, foreverLink, '[wedding date]', previewDeadline);

  const lookupUrl = `${siteUrl}/rsvp/lookup?couple_id=${coupleId}`;
  const inputCls  = 'form-input';
  const labelCls  = 'form-label block mb-1.5';

  // ── CSV template download ──────────────────────────────────────────────────
  function downloadTemplate() {
    const csv = 'name,email,phone,plus_one_invited\nJane Smith,jane@example.com,+1 234 567 8900,false\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'guest-list-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total guests', value: guests.length },
          { label: 'Attending',    value: attending.length, note: `(${totalAttending} seats)` },
          { label: 'Declined',     value: declined.length },
          { label: 'Pending',      value: pending.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center"
            style={{ background: '#faf8f5', border: '1px solid #e8e0d0' }}>
            <p className="font-serif text-2xl text-ink">{s.value}</p>
            <p className="font-sans text-xs text-ink-light mt-0.5">{s.label}</p>
            {s.note && <p className="font-sans text-xs text-ink-light">{s.note}</p>}
          </div>
        ))}
      </div>

      {/* ── RSVP settings ── */}
      <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-serif text-base text-ink">RSVP open</label>
            <p className="font-sans text-xs text-ink-light mt-0.5">
              When enabled, guests can submit responses via their link.
            </p>
          </div>
          <button type="button" onClick={() => setEnabled(v => !v)}
            className="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200"
            style={{ borderColor: enabled ? '#C9964A' : '#d4cfc8', background: enabled ? '#C9964A' : '#e8e0d0' }}>
            <span className="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
              style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0px)' }} />
          </button>
        </div>

        <div>
          <label className={labelCls}>RSVP deadline (optional)</label>
          <input type="date" className={inputCls} value={lockedAt}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setLockedAt(e.target.value)} />
          <p className="font-sans text-xs text-ink-light mt-1">
            Guests cannot update their response after this date.
          </p>
        </div>

        <div>
          <label className={labelCls}>Reminder (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max="90" className={inputCls + ' w-24'}
              placeholder="7"
              value={reminderDays}
              onChange={e => setReminderDays(e.target.value)}
            />
            <span className="font-sans text-sm text-ink-light">days before deadline</span>
          </div>
          <p className="font-sans text-xs text-ink-light mt-1">
            Pending guests with an email or phone will be reminded automatically.
          </p>
        </div>

        {/* ── Calendar event description ── */}
        <div>
          <label className={labelCls}>Calendar event description</label>
          <p className="font-sans text-xs text-ink-light -mt-1 mb-2">
            Shown inside the calendar event guests save from the confirmation email. Leave blank to use a default message with your Forever page link.
          </p>
          <textarea
            className={inputCls + ' font-sans text-sm resize-none'}
            rows={4}
            value={calendarDesc}
            onChange={e => setCalendarDesc(e.target.value)}
            placeholder={`You're attending [Couple Name]'s wedding!\n\nBrowse our story: [your Forever link]`}
          />
        </div>

        {/* ── Invite message template ── */}
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Invite message</label>
          <p className="font-sans text-xs text-ink-light -mt-1">
            Used when sending invites via email or WhatsApp. Click a variable to insert it.
          </p>

          {/* Variable chips */}
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARS.map(v => (
              <button key={v.label} type="button"
                title={v.desc}
                onClick={() => insertVar(v.label)}
                className="font-mono text-xs px-2 py-0.5 rounded-full border transition-colors"
                style={{ borderColor: 'rgba(201,150,74,0.4)', color: '#9a7840', background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,150,74,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {v.label}
              </button>
            ))}
          </div>

          <textarea
            ref={msgTemplateRef}
            className={inputCls + ' font-mono text-xs resize-none'}
            rows={6}
            value={msgTemplate}
            onChange={e => setMsgTemplate(e.target.value)}
            placeholder={DEFAULT_TEMPLATE}
          />

          {/* Preview toggle */}
          <div>
            <button type="button"
              className="font-sans text-xs underline text-ink-light hover:text-ink transition-colors"
              onClick={() => setShowPreview(v => !v)}>
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>
          </div>

          {showPreview && (
            <div className="rounded-xl p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed"
              style={{ background: '#faf8f5', border: '1px solid #e8e0d0', color: '#4A3728' }}>
              <p className="font-sans text-xs text-ink-light mb-2 uppercase tracking-wider">Preview — Jane Smith</p>
              {previewText}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saveMsg && (
            <span className="font-sans text-sm"
              style={{ color: saveMsg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
              {saveMsg}
            </span>
          )}
        </div>
      </form>

      {/* ── Lookup link ── */}
      <div>
        <label className={labelCls}>Guest lookup page</label>
        <p className="font-sans text-xs text-ink-light mb-2">
          Share this link so guests who lost their personal link can find it by name or email.
        </p>
        <div className="flex gap-2">
          <input readOnly className="form-input flex-1 text-xs font-mono" value={lookupUrl} />
          <button className="btn-primary shrink-0" onClick={async () => {
            await navigator.clipboard.writeText(lookupUrl);
            setCopied('lookup'); setTimeout(() => setCopied(null), 2000);
          }}>
            {copied === 'lookup' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Guest list ── */}
      <div>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-base text-ink">Guest list</h3>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <button onClick={markSelectedAttending} className="btn-ghost text-sm">
                  ✓ Mark attending ({selected.size})
                </button>
                <button onClick={openSendModal} className="btn-primary text-sm">
                  ✉ Send invite ({selected.size})
                </button>
              </>
            )}
            {guests.length > 0 && (
              <button onClick={exportCsv} className="btn-ghost text-sm">
                ↓ Export CSV
              </button>
            )}
            {addMode === null ? (
              <>
                <button onClick={() => setAddMode('bulk')}   className="btn-ghost text-sm">+ Add guests</button>
                <button onClick={() => setAddMode('csv')}    className="btn-ghost text-sm">↑ Upload CSV</button>
              </>
            ) : (
              <button onClick={() => { setAddMode(null); setCsvPreview(null); setBulkRows([emptyRow(), emptyRow(), emptyRow()]); }}
                className="btn-ghost text-sm">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* ── Single add (kept as fallback, not shown in toolbar — accessible via bulk row of 1) ── */}

        {/* ── Bulk add ── */}
        {addMode === 'bulk' && (
          <div className="rounded-xl p-4 mb-4 flex flex-col gap-3"
            style={{ background: '#faf8f5', border: '1px solid #e8e0d0' }}>
            <div className="flex flex-col gap-2">
              {/* Header row */}
              <div className="grid gap-2 font-sans text-xs text-ink-light px-1"
                style={{ gridTemplateColumns: '2fr 2fr 2fr 72px 28px' }}>
                <span>Name *</span>
                <span>Email</span>
                <span>Phone</span>
                <span className="text-center">+1 Invited</span>
                <span />
              </div>
              {/* Data rows */}
              {bulkRows.map((row, i) => (
                <div key={i} className="grid gap-2 items-center"
                  style={{ gridTemplateColumns: '2fr 2fr 2fr 72px 28px' }}>
                  <div>
                    <input
                      data-bulk-name
                      type="text"
                      className={inputCls + (row.error ? ' border-rose-300' : '')}
                      placeholder="Jane Smith"
                      value={row.name}
                      onChange={e => updateBulkRow(i, 'name', e.target.value)}
                    />
                    {row.error && <span className="text-xs" style={{ color: '#7B1E3C' }}>{row.error}</span>}
                  </div>
                  <input type="email" className={inputCls} placeholder="jane@example.com"
                    value={row.email} onChange={e => updateBulkRow(i, 'email', e.target.value)} />
                  <input type="tel" className={inputCls} placeholder="+1 234 567 8900"
                    value={row.phone} onChange={e => updateBulkRow(i, 'phone', e.target.value)} />
                  <div className="flex justify-center">
                    <input type="checkbox" className="rounded" checked={row.plusOne}
                      onChange={e => updateBulkRow(i, 'plusOne', e.target.checked)}
                      onKeyDown={e => handleBulkTab(e, i, true)} />
                  </div>
                  <button type="button" className="text-ink-light hover:text-ink text-xs text-center"
                    onClick={() => setBulkRows(rows => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows)}
                    title="Remove row">✕</button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-ghost text-sm"
                onClick={() => setBulkRows(rows => [...rows, emptyRow()])}>
                + Add row
              </button>
              <button type="button" className="btn-primary" disabled={bulkSaving} onClick={handleBulkSave}>
                {bulkSaving ? 'Saving…' : `Save ${bulkRows.filter(r => r.name.trim()).length || ''} guests`}
              </button>
              {bulkMsg && (
                <span className="font-sans text-xs"
                  style={{ color: bulkMsg.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
                  {bulkMsg}
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-ink-light">
              Tip: press <kbd className="px-1 py-0.5 rounded bg-stone-100 border text-xs">Tab</kbd> on the last field of the last row to add a new row.
            </p>
          </div>
        )}

        {/* ── CSV upload ── */}
        {addMode === 'csv' && (
          <div className="rounded-xl p-4 mb-4 flex flex-col gap-3"
            style={{ background: '#faf8f5', border: '1px solid #e8e0d0' }}>
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
            {!csvPreview ? (
              <div className="flex flex-col gap-3">
                <p className="font-sans text-sm text-ink">
                  Upload a <code className="text-xs bg-stone-100 px-1 rounded">.csv</code> file with columns:{' '}
                  <code className="text-xs">name, email, phone, plus_one_invited</code>
                </p>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary"
                    onClick={() => csvInputRef.current?.click()}>
                    Choose file
                  </button>
                  <button type="button" className="btn-ghost text-sm" onClick={downloadTemplate}>
                    ↓ Download template
                  </button>
                </div>
                {csvError && (
                  <p className="font-sans text-xs" style={{ color: '#7B1E3C' }}>{csvError}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-sans text-sm text-ink font-medium">
                  Preview — {csvPreview.filter(r => !r.error).length} valid rows
                  {csvPreview.some(r => r.error) && ` (${csvPreview.filter(r => r.error).length} skipped)`}
                </p>
                <div className="overflow-x-auto rounded-lg border border-stone-200">
                  <table className="w-full text-xs font-sans">
                    <thead style={{ background: '#f5f1eb' }}>
                      <tr>
                        {['Name', 'Email', 'Phone', '+1'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-ink-light uppercase tracking-wider">{h}</th>
                        ))}
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((r, i) => (
                        <tr key={i} style={{
                          borderTop: '1px solid #f0ebe3',
                          background: r.error ? 'rgba(123,30,60,0.04)' : undefined,
                        }}>
                          <td className="px-3 py-2 text-ink">{r.name || <em className="text-ink-light">—</em>}</td>
                          <td className="px-3 py-2 text-ink-light">{r.email || '—'}</td>
                          <td className="px-3 py-2 text-ink-light">{r.phone || '—'}</td>
                          <td className="px-3 py-2 text-ink-light">{r.plusOne ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2">
                            {r.error && <span style={{ color: '#7B1E3C' }} className="text-xs">{r.error}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 items-center">
                  <button type="button" className="btn-primary" disabled={csvSaving} onClick={handleCsvImport}>
                    {csvSaving ? 'Importing…' : `Import ${csvPreview.filter(r => !r.error).length} guests`}
                  </button>
                  <button type="button" className="btn-ghost text-sm"
                    onClick={() => { setCsvPreview(null); csvInputRef.current && (csvInputRef.current.value = ''); }}>
                    Choose different file
                  </button>
                  {csvError && (
                    <span className="font-sans text-xs"
                      style={{ color: csvError.startsWith('✓') ? '#2D8A4E' : '#7B1E3C' }}>
                      {csvError}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <p className="font-sans text-sm text-ink-light">Loading…</p>
        ) : guests.length === 0 ? (
          <p className="font-sans text-sm text-ink-light">
            No guests yet. Add them above and share their personal RSVP links.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #e8e0d0' }}>
            <table className="w-full text-sm font-sans">
              <thead style={{ background: '#faf8f5', borderBottom: '1px solid #e8e0d0' }}>
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox" className="rounded"
                      checked={selected.size === guests.length && guests.length > 0}
                      onChange={toggleSelectAll} />
                  </th>
                  {['Name', 'Email', 'Phone', 'Invite', 'RSVP', 'Diet', '+1 Status', '+1 Name', '+1 Diet', 'Link', ''].map(h => (
                    <th key={h}
                      className="text-left px-3 py-3 font-sans text-xs text-ink-light uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.map((g, i) => {
                  const isDeleting = deleteId === g.id;
                  return (
                    <tr key={g.id} style={{ borderTop: i === 0 ? undefined : '1px solid #f0ebe3' }}>
                      <td className="px-3 py-2 w-8">
                        <input type="checkbox" className="rounded"
                          checked={selected.has(g.id)}
                          onChange={() => toggleSelect(g.id)} />
                      </td>
                      <td className="px-3 py-2 text-ink font-medium whitespace-nowrap text-xs">{g.name}</td>

                      {/* Email + Phone — inline editable */}
                      {(['email', 'phone'] as const).map(field => {
                        const isEditing = editCell?.id === g.id && editCell.field === field;
                        const val = g[field] ?? '';
                        return (
                          <td key={field} className="px-3 py-2 text-xs min-w-[100px]">
                            {isEditing ? (
                              <input
                                type={field === 'email' ? 'email' : 'tel'}
                                autoFocus
                                className="form-input text-xs py-1 w-full"
                                value={editCell.value}
                                onChange={e => setEditCell(c => c ? { ...c, value: e.target.value } : c)}
                                onBlur={saveEditCell}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); saveEditCell(); }
                                  if (e.key === 'Escape') setEditCell(null);
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                className="text-left w-full rounded px-1 py-0.5 hover:bg-stone-100 transition-colors"
                                style={{ color: val ? '#4A3728' : 'rgba(74,55,40,0.3)' }}
                                onClick={() => setEditCell({ id: g.id, field, value: val })}
                                title={`Click to edit ${field}`}
                              >
                                {val || <span className="italic">—</span>}
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Invite sent status */}
                      <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'rgba(74,55,40,0.45)' }}>
                        {g.reminder_sent_at
                          ? <>Reminded · {new Date(g.reminder_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                          : g.invite_sent_at
                          ? <>Sent · {new Date(g.invite_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                          : <span style={{ color: 'rgba(74,55,40,0.25)' }}>—</span>
                        }
                      </td>

                      {/* RSVP status — inline editable */}
                      <td className="px-3 py-2">
                        {(() => {
                          const s = g.rsvp_status;
                          const bg    = s === 'attending' ? 'rgba(45,138,78,0.12)'  : s === 'declined' ? 'rgba(123,30,60,0.1)'  : 'rgba(201,150,74,0.12)';
                          const color = s === 'attending' ? '#2D8A4E'               : s === 'declined' ? '#7B1E3C'               : '#9a7840';
                          return (
                            <select
                              value={s}
                              onChange={e => patchGuest(g.id, { rsvp_status: e.target.value })}
                              className="font-mono text-xs rounded-full px-2 py-0.5 cursor-pointer outline-none border-0"
                              style={{ background: bg, color, appearance: 'none', WebkitAppearance: 'none' }}
                            >
                              <option value="pending">pending</option>
                              <option value="attending">attending</option>
                              <option value="declined">declined</option>
                            </select>
                          );
                        })()}
                      </td>

                      {/* Guest dietary */}
                      <td className="px-3 py-2 text-ink-light text-xs">
                        {(() => {
                          const preset = g.dietary_preset && g.dietary_preset !== 'none' ? DIETARY_LABELS[g.dietary_preset] : null;
                          const notes  = g.dietary_notes || null;
                          if (!preset && !notes) return '—';
                          return <>{preset}{notes && <span className={preset ? 'block' : ''}>{notes}</span>}</>;
                        })()}
                      </td>

                      {/* +1 Status — inline editable */}
                      <td className="px-3 py-2 text-xs">
                        {!g.plus_one_invited ? (
                          <span className="text-ink-light">N/A</span>
                        ) : (() => {
                          const val = g.plus_one_attending === true ? 'attending' : g.plus_one_attending === false ? 'declined' : 'pending';
                          const bg    = val === 'attending' ? 'rgba(45,138,78,0.12)'  : val === 'declined' ? 'rgba(123,30,60,0.1)'  : 'rgba(201,150,74,0.12)';
                          const color = val === 'attending' ? '#2D8A4E'               : val === 'declined' ? '#7B1E3C'               : '#9a7840';
                          return (
                            <select
                              value={val}
                              onChange={e => {
                                const v = e.target.value;
                                patchGuest(g.id, { plus_one_attending: v === 'attending' ? true : v === 'declined' ? false : null });
                              }}
                              className="font-mono text-xs rounded-full px-2 py-0.5 cursor-pointer outline-none border-0"
                              style={{ background: bg, color, appearance: 'none', WebkitAppearance: 'none' }}
                            >
                              <option value="pending">—</option>
                              <option value="attending">attending</option>
                              <option value="declined">declined</option>
                            </select>
                          );
                        })()}
                      </td>

                      {/* +1 Name */}
                      <td className="px-3 py-2 text-ink-light text-xs">
                        {!g.plus_one_invited ? 'N/A' : g.plus_one_name || '—'}
                      </td>

                      {/* +1 Diet */}
                      <td className="px-3 py-2 text-ink-light text-xs">
                        {!g.plus_one_invited ? 'N/A' : (() => {
                          const preset = g.plus_one_dietary_preset && g.plus_one_dietary_preset !== 'none' ? DIETARY_LABELS[g.plus_one_dietary_preset] : null;
                          const notes  = g.plus_one_dietary_notes || null;
                          if (!preset && !notes) return '—';
                          return <>{preset}{notes && <span className={preset ? 'block' : ''}>{notes}</span>}</>;
                        })()}
                      </td>

                      {/* Link */}
                      <td className="px-3 py-2">
                        <button onClick={() => copyLink(g.token)}
                          className="font-mono text-xs px-2 py-1 rounded-full transition-all whitespace-nowrap"
                          style={{
                            border: '1px solid rgba(201,150,74,0.4)', color: '#9a7840',
                            background: copied === g.token ? 'rgba(201,150,74,0.12)' : 'transparent',
                          }}>
                          {copied === g.token ? '✓' : 'Copy'}
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="px-3 py-2 text-xs">
                        {isDeleting ? (
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <button onClick={() => confirmDelete(g.id)}
                              className="font-sans text-xs px-2 py-0.5 rounded"
                              style={{ background: 'rgba(123,30,60,0.1)', color: '#7B1E3C' }}>
                              Yes
                            </button>
                            <button onClick={() => setDeleteId(null)}
                              className="text-ink-light hover:text-ink">No</button>
                          </span>
                        ) : (
                          <button onClick={() => setDeleteId(g.id)}
                            className="text-ink-light hover:text-ink transition-colors"
                            title="Remove guest">
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Send invite modal ── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(13,11,8,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setSendModal(false); }}>
          <div className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: '#fff', border: '1px solid #e8e0d0' }}>

            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-ink">Send invite</h3>
              <button onClick={() => setSendModal(false)}
                className="text-ink-light hover:text-ink text-xl leading-none">×</button>
            </div>

            <p className="font-sans text-sm text-ink-light">
              Sending to <strong className="text-ink">{selected.size} guest(s)</strong>.
              Choose your channel:
            </p>

            {/* Channel picker */}
            <div className="flex gap-2">
              {([
                { id: 'email',    label: '✉ Email' },
                { id: 'whatsapp', label: '💬 WhatsApp' },
                { id: 'both',     label: '✉ + 💬 Both' },
              ] as const).map(c => (
                <button key={c.id} type="button"
                  onClick={() => setSendChannel(c.id)}
                  className="flex-1 rounded-xl py-2.5 font-sans text-sm transition-all"
                  style={{
                    border:     sendChannel === c.id ? '1px solid #C9964A' : '1px solid #e8e0d0',
                    background: sendChannel === c.id ? 'rgba(201,150,74,0.1)' : 'transparent',
                    color:      sendChannel === c.id ? '#9a7840' : '#4A3728',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Message editor */}
            <div className="flex flex-col gap-2">
              <label className="font-sans text-xs text-ink-light uppercase tracking-wider">Message</label>
              <textarea
                className="form-input font-mono text-xs resize-none"
                rows={5}
                value={editTemplate}
                onChange={e => setEditTemplate(e.target.value)}
              />
              <button type="button"
                className="font-sans text-xs underline text-ink-light hover:text-ink self-start"
                onClick={() => setShowSendPreview(v => !v)}>
                {showSendPreview ? 'Hide preview' : 'Show preview'}
              </button>
              {showSendPreview && (() => {
                const firstGuest = guests.find(g => selected.has(g.id));
                const previewRsvp = firstGuest ? `${siteUrl}/rsvp/${firstGuest.token}` : '[rsvp link]';
                const dl = lockedAt
                  ? new Date(lockedAt + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '[no deadline]';
                const preview = buildPreview(editTemplate, firstGuest?.name ?? 'Jane', previewRsvp, foreverLink, '[wedding date]', dl);
                return (
                  <div className="rounded-xl p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed"
                    style={{ background: '#faf8f5', border: '1px solid #e8e0d0', color: '#4A3728' }}>
                    <p className="font-sans text-xs text-ink-light mb-2 uppercase tracking-wider">Preview</p>
                    {preview}
                  </div>
                );
              })()}
            </div>

            {sendMsg && (
              <p className="font-sans text-sm"
                style={{ color: sendMsg.startsWith('✓') ? '#2D8A4E' : sendMsg.startsWith('Resend') ? '#9a7840' : '#7B1E3C' }}>
                {sendMsg}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setSendModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSendInvite} disabled={sending} className="btn-primary">
                {sending ? 'Sending…' : `Send to ${selected.size} guest(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
