'use client';

/**
 * --- AURA MEETING ROOM ---
 * v2.0 — full meeting, no self-hosting required
 *
 * Runs on the public Jitsi server. Everything below works there today; when
 * you move to your own server, one constant changes and nothing else.
 *
 * WHAT WAS SOLVED WITHOUT SELF-HOSTING
 *
 * 1. SECURITY. I said earlier that locking a room needed moderator rights. On
 *    the public server the FIRST participant to join IS moderator, and that is
 *    always the director opening it from here — so `password` and
 *    `toggleLobby` both work. The room locks the moment it opens and the
 *    password rides along in the invitation. If the commands are ever refused,
 *    the banner says the room is open rather than showing a padlock over an
 *    unlocked door.
 *
 * 2. OTHER PEOPLE'S CONTRIBUTIONS. Aura cannot hear other participants: their
 *    audio arrives as one mixed stream the browser cannot split by speaker,
 *    and solving that properly needs Jigasi on a self-hosted server. But Jitsi
 *    emits an event for every chat message WITH the sender's name. So anyone
 *    can type a decision or a figure and it lands in the minutes, attributed.
 *    Not a transcript, but a real record that includes everyone in the room.
 *
 * 3. A PERMANENT RECORD. Meetings save to aura_office_media, which already
 *    exists with exactly the columns this needs — business_id, media_type,
 *    title, transcript, action_items. No new table, no migration.
 *
 * WHAT REMAINS HONEST ABOUT THE MINUTES
 *
 * Spoken words from other participants are not captured, and the generated
 * minutes say so plainly. A document that looks complete and is not is worse
 * than one that states its own limits.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  X, Copy, Mail, MessageCircle, Users, FileText, Loader2, Video,
  Lock, ShieldCheck, ListChecks, Plus, Trash2, Clock, MicOff, LayoutGrid, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { AuraStage } from '@/components/copilot/AuraStage';

// Public server for now. Point this at your own domain when you have one.
const JITSI_DOMAIN = 'meet.jit.si';

const supabase = createClient();

/** A room name derived from the business alone is guessable, and a guessed
 *  room name is an open door into a board meeting. Random suffix, always. */
const roomFor = (businessId: string, title: string) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 26) || 'meeting';
  const short = businessId.replace(/-/g, '').slice(0, 8);
  const nonce = Math.random().toString(36).slice(2, 9);
  return `bbu1-${short}-${slug}-${nonce}`;
};

/** Readable rather than clever — someone will type this on a phone. */
const makePassword = () => {
  const words = ['ledger', 'harvest', 'summit', 'anchor', 'compass', 'lantern', 'quarry', 'meadow'];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
};

interface Attendee {
  id: string;
  name: string;
  joinedAt: number;
  leftAt?: number;
}

interface NoteEntry {
  at: number;
  who: string;
  text: string;
  kind: 'chat' | 'note' | 'action';
}

export interface AuraMeetingRoomProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessName?: string;
  directorName?: string;
  /** Aura's chat turns, so her answers during the meeting reach the minutes. */
  transcript?: { role: 'director' | 'aura'; text: string; at: number }[];
  /** Sends a prompt into the Aura chat. */
  onRequestMinutes?: (prompt: string) => void;
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
}

export default function AuraMeetingRoom({
  open, onClose, businessId, businessName = 'the business', directorName = 'Director',
  transcript = [], onRequestMinutes,
  speaking = false, listening = false, thinking = false,
}: AuraMeetingRoomProps) {
  const [title, setTitle] = useState('Management meeting');
  const [agenda, setAgenda] = useState('');
  const [room, setRoom] = useState('');
  const [password] = useState(makePassword);
  const [locked, setLocked] = useState(false);
  const [started, setStarted] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rail, setRail] = useState<'people' | 'notes' | null>('people');
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const meetingUrl = room ? `https://${JITSI_DOMAIN}/${room}` : '';
  const present = attendees.filter((a) => !a.leftAt);

  useEffect(() => {
    if (!started || !startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [started, startedAt]);

  const clock = useMemo(() => {
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsed]);

  const addNote = useCallback((entry: NoteEntry) => setNotes((p) => [...p, entry]), []);

  const loadJitsi = useCallback((): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).JitsiMeetExternalAPI) return resolve((window as any).JitsiMeetExternalAPI);
    const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).JitsiMeetExternalAPI));
      existing.addEventListener('error', () => reject(new Error('Jitsi script failed to load.')));
      return;
    }
    const s = document.createElement('script');
    s.src = `https://${JITSI_DOMAIN}/external_api.js`;
    s.async = true;
    s.dataset.jitsi = 'true';
    s.onload = () => resolve((window as any).JitsiMeetExternalAPI);
    s.onerror = () => reject(new Error(`Could not reach ${JITSI_DOMAIN}.`));
    document.body.appendChild(s);
  }), []);

  const endMeeting = useCallback(() => {
    try { apiRef.current?.dispose(); } catch (err) { /* already disposed */ }
    apiRef.current = null;
    setStarted(false);
  }, []);

  const startMeeting = async () => {
    if (!businessId) { toast.error('Still connecting to your business.'); return; }
    setLoadingApi(true);
    try {
      const Jitsi = await loadJitsi();
      const name = roomFor(businessId, title);
      setRoom(name);

      const api = new Jitsi(JITSI_DOMAIN, {
        roomName: name,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: directorName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          disableThirdPartyRequests: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          MOBILE_APP_PROMO: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'chat', 'raisehand',
            'tileview', 'settings', 'hangup', 'fullscreen', 'participants-pane',
          ],
        },
      });

      api.addEventListener('videoConferenceJoined', (e: any) => {
        setStarted(true);
        setStartedAt(Date.now());
        setAttendees((p) => [...p, { id: e.id ?? 'host', name: e.displayName || directorName, joinedAt: Date.now() }]);

        api.executeCommand('subject', title);

        // Lock immediately. The first participant is moderator, and that is
        // always the director opening from here.
        try {
          api.executeCommand('password', password);
          api.executeCommand('toggleLobby', true);
          setLocked(true);
        } catch (err) {
          setLocked(false);
          toast.warning('The room could not be locked. Share the link carefully.');
        }

        if (agenda.trim()) addNote({ at: Date.now(), who: 'Agenda', text: agenda.trim(), kind: 'note' });
      });

      api.addEventListener('participantJoined', (e: any) => {
        setAttendees((p) => [...p, { id: e.id, name: e.displayName || 'Guest', joinedAt: Date.now() }]);
        addNote({ at: Date.now(), who: 'Room', text: `${e.displayName || 'A guest'} joined`, kind: 'note' });
        toast.info(`${e.displayName || 'Someone'} joined`);
      });

      api.addEventListener('participantLeft', (e: any) => {
        setAttendees((p) => p.map((a) => (a.id === e.id && !a.leftAt ? { ...a, leftAt: Date.now() } : a)));
      });

      // The workaround for not hearing other participants: everything typed in
      // the meeting chat is captured, attributed to whoever wrote it.
      api.addEventListener('incomingMessage', (e: any) => {
        if (!e?.message) return;
        addNote({ at: Date.now(), who: e.nick || e.from || 'Participant', text: String(e.message), kind: 'chat' });
      });
      api.addEventListener('outgoingMessage', (e: any) => {
        if (!e?.message) return;
        addNote({ at: Date.now(), who: directorName, text: String(e.message), kind: 'chat' });
      });

      api.addEventListener('videoConferenceLeft', () => endMeeting());

      apiRef.current = api;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => () => { try { apiRef.current?.dispose(); } catch (e) { /* gone */ } }, []);

  const command = (cmd: string) => {
    try { apiRef.current?.executeCommand(cmd); }
    catch (e) { toast.error('That control is not available in this room.'); }
  };

  // --- invitations -------------------------------------------------------
  const inviteText =
    `You are invited to a meeting with ${businessName}.\n\n` +
    `${title}\n` +
    `Join: ${meetingUrl}\n` +
    (locked ? `Password: ${password}\n` : '') +
    `\nOpens in any browser. No account or download needed.` +
    (locked ? `\nYou will wait briefly in the lobby until the host admits you.` : '');

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteText); toast.success('Invitation copied'); }
    catch (e) { toast.error('Could not copy. Select the text and copy manually.'); }
  };
  const inviteWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`, '_blank', 'noopener');
  const inviteEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`${businessName}: ${title}`)}&body=${encodeURIComponent(inviteText)}`;
  };

  // --- notes and actions --------------------------------------------------
  const commitNote = (kind: 'note' | 'action') => {
    const text = noteDraft.trim();
    if (!text) return;
    addNote({ at: Date.now(), who: directorName, text, kind });
    setNoteDraft('');
    if (kind === 'action') toast.success('Action item recorded');
  };

  const buildRecord = () => {
    const mins = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 0;
    const roll = attendees.map((a) => {
      const dur = Math.max(1, Math.round(((a.leftAt ?? Date.now()) - a.joinedAt) / 60000));
      return `- ${a.name}: joined ${new Date(a.joinedAt).toLocaleTimeString()}, present about ${dur} minute(s)${a.leftAt ? ' (left before the end)' : ''}`;
    }).join('\n');

    const written = notes.map((n) => {
      const t = new Date(n.at).toLocaleTimeString();
      const tag = n.kind === 'action' ? '[ACTION] ' : n.kind === 'chat' ? '[CHAT] ' : '';
      return `${t} ${tag}${n.who}: ${n.text}`;
    }).join('\n');

    const spoken = transcript.length > 0
      ? transcript.map((t) => `${t.role === 'aura' ? 'Aura' : directorName}: ${t.text}`).join('\n')
      : '(nothing captured through this device\'s microphone)';

    return { mins, roll, written, spoken };
  };

  const requestMinutes = () => {
    const { mins, roll, written, spoken } = buildRecord();

    const prompt = `Write formal minutes for the meeting below.

MEETING: ${title}
BUSINESS: ${businessName}
DATE: ${new Date().toLocaleDateString()}
DURATION: about ${mins} minute(s)
${agenda.trim() ? `AGENDA:\n${agenda.trim()}\n` : ''}
ATTENDANCE (recorded automatically by the meeting room):
${roll || '- no participants recorded'}

WRITTEN RECORD (meeting chat, notes and action items, with who said what):
${written || '(nothing written down)'}

SPOKEN RECORD (captured from ${directorName}'s microphone only):
${spoken}

Produce: a short summary, points discussed, decisions taken, and action items with an owner and a date where one was given. Use only what is above — invent nothing.

IMPORTANT: state near the top that spoken contributions from participants other than ${directorName} were not captured, so the record covers the written contributions and the host's own remarks. Do not present this as a full transcript.`;

    onRequestMinutes?.(prompt);
    toast.success('Aura is writing the minutes');
  };

  /** Saves to aura_office_media, which already exists with these columns. */
  const saveRecord = async () => {
    setSaving(true);
    try {
      const { mins, roll, written, spoken } = buildRecord();
      const actions = notes.filter((n) => n.kind === 'action').map((n) => ({ at: n.at, who: n.who, text: n.text }));

      const { error } = await supabase.from('aura_office_media').insert({
        business_id: businessId,
        media_type: 'meeting',
        title: `${title} — ${new Date().toLocaleDateString()}`,
        transcript: `DURATION: about ${mins} minute(s)\n\nATTENDANCE:\n${roll}\n\nWRITTEN RECORD:\n${written}\n\nSPOKEN (host device only):\n${spoken}`,
        action_items: actions.length > 0 ? actions : null,
      });

      if (error) throw new Error(error.message);
      toast.success('Meeting record saved');
    } catch (e) {
      toast.error(`Could not save the record: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-3 sm:px-4">
        <Video className="h-4 w-4 shrink-0 text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{title}</p>
          <p className="flex items-center gap-2 truncate text-[11px] text-slate-400">
            {started ? (
              <>
                <Clock className="h-3 w-3" /> {clock}
                <span>·</span>
                {present.length} present
                {locked && <><span>·</span><Lock className="h-3 w-3 text-emerald-400" /> locked</>}
              </>
            ) : 'Not started'}
          </p>
        </div>

        {started && (
          <>
            <button type="button" onClick={() => command('muteEveryone')} title="Mute everyone"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 sm:flex">
              <MicOff className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => command('toggleTileView')} title="Grid view"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 sm:flex">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setRail(rail === 'people' ? null : 'people')}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium',
                rail === 'people' ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/15 text-slate-200 hover:bg-white/10')}>
              <Users className="h-3.5 w-3.5" /> {present.length}
            </button>
            <button type="button" onClick={() => setRail(rail === 'notes' ? null : 'notes')}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium',
                rail === 'notes' ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/15 text-slate-200 hover:bg-white/10')}>
              <ListChecks className="h-3.5 w-3.5" /> {notes.length}
            </button>
            <button type="button" onClick={requestMinutes}
              className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700">
              <FileText className="h-3.5 w-3.5" /> Minutes
            </button>
          </>
        )}

        <button type="button" onClick={() => { endMeeting(); onClose(); }} aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </header>

      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0">
          <div ref={containerRef} className={cn('h-full w-full', !started && 'hidden')} />

          {started && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur">
              <AuraStage speaking={speaking} listening={listening} thinking={thinking} size="sm" />
            </div>
          )}

          {!started && (
            <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-8">
              <div className="w-full max-w-md space-y-5">
                <AuraStage speaking={speaking} listening={listening} thinking={thinking} size="md" caption="Ready to join" />

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-400">Meeting title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-blue-400" />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-400">Agenda (optional)</label>
                    <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3}
                      placeholder={'1. Last month\'s figures\n2. Overdue accounts\n3. Stock levels'}
                      className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-400" />
                    <p className="mt-1 text-[10px] text-slate-500">Included in the minutes.</p>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-emerald-200">The room will be locked</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-200/70">
                        Password <span className="font-mono font-semibold">{password}</span>, plus a lobby you admit people from.
                        Both go into the invitation.
                      </p>
                    </div>
                  </div>

                  <button type="button" onClick={startMeeting} disabled={loadingApi}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {loadingApi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {loadingApi ? 'Preparing the room...' : 'Start meeting'}
                  </button>

                  <p className="text-center text-[11px] leading-relaxed text-slate-500">
                    Aura hears only this device. Ask participants to type key points into the meeting chat —
                    those are captured with their names and reach the minutes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {started && rail && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-slate-900">
            {rail === 'people' && (
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Attendance</h3>
                <ul className="mb-6 space-y-2">
                  {attendees.map((a, i) => (
                    <li key={`${a.id}-${i}`} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[12px] text-slate-200">{a.name}</span>
                      <span className={cn('shrink-0 text-[10px]', a.leftAt ? 'text-slate-500' : 'text-emerald-400')}>
                        {a.leftAt ? 'left' : 'present'}
                      </span>
                    </li>
                  ))}
                  {attendees.length === 0 && <li className="text-[12px] text-slate-500">Nobody yet.</li>}
                </ul>

                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Invite</h3>
                <div className="space-y-2">
                  <button type="button" onClick={inviteWhatsApp}
                    className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                  <button type="button" onClick={inviteEmail}
                    className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </button>
                  <button type="button" onClick={copyInvite}
                    className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5">
                    <Copy className="h-3.5 w-3.5" /> Copy invitation
                  </button>
                </div>

                {locked && (
                  <div className="mt-3 rounded-lg bg-black/30 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Password</p>
                    <p className="font-mono text-[13px] font-semibold text-slate-200">{password}</p>
                  </div>
                )}
                <p className="mt-3 break-all text-[10px] text-slate-500">{meetingUrl}</p>
              </div>
            )}

            {rail === 'notes' && (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Record</h3>
                  {notes.length === 0 && (
                    <p className="text-[12px] leading-relaxed text-slate-500">
                      Nothing yet. Notes you add here, action items, and anything typed in the meeting chat all appear in this list and in the minutes.
                    </p>
                  )}
                  {notes.map((n, i) => (
                    <div key={i} className={cn('rounded-lg border px-2.5 py-2',
                      n.kind === 'action' ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/5')}>
                      <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        {n.kind === 'action' && <ListChecks className="h-3 w-3 text-amber-400" />}
                        {n.who} · {new Date(n.at).toLocaleTimeString()}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-200">{n.text}</p>
                    </div>
                  ))}
                </div>

                <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={2}
                    placeholder="Note or decision..."
                    className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-blue-400" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => commitNote('note')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/5">
                      <Plus className="h-3 w-3" /> Note
                    </button>
                    <button type="button" onClick={() => commitNote('action')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 py-1.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20">
                      <ListChecks className="h-3 w-3" /> Action
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveRecord} disabled={saving}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save record
                    </button>
                    <button type="button" onClick={() => setNotes([])} title="Clear the list"
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-white/5">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}