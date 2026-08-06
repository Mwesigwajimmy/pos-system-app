'use client';

/**
 * --- AURA MEETING ROOM ---
 * v2.0 — full meeting, no self-hosting required
 *
 * Runs on the public Jitsi server. Everything below works there today; when
 * you move to your own server, one constant changes and nothing else.
 *
 * v3.3 — the avatar's mouth now moves with the actual words. AuraStage has
 * always accepted a `word` prop fed by useSpeechBoundary, and nothing had ever
 * supplied it, so it fell back to a fixed 165ms chew regardless of what she was
 * saying. Every utterance in this file is now tracked, which is the difference
 * between speech and a screensaver.
 *
 * v3.2 — Aura is IN the meeting rather than beside it.
 *
 * Until now she was decoration here: the room received a `thinking` flag and
 * nothing else, so the avatar drew a state it was never given and there was no
 * way to say anything to her. She sat there saying "Ready" while the director
 * talked to a picture.
 *
 * Now there is an Aura rail — ask her a question without leaving the call, and
 * her answer is spoken aloud AND pinned into the meeting record, so anything
 * she contributes reaches the minutes like any other remark. She also opens
 * the meeting with a spoken welcome once the room goes live.
 *
 * Her voice goes out through the speakers, so an unmuted microphone will carry
 * it to the other participants. That is usually what you want in a meeting —
 * they should hear her too — but it is worth knowing rather than discovering.
 *
 * v3.1 — Aura greets each person as they join, by name, aloud and in the
 * meeting chat. Both, deliberately: the spoken welcome is lost on anyone who
 * joined muted or cannot hear, and the written line is what tells participants
 * their typed points reach the minutes — which is the only route their
 * contributions have until transcription is switched on.
 *
 * v3.0 — JaaS. Every participant is authenticated with a short-lived JWT
 * signed by aura-meeting-token, and the RSA key never reaches the browser.
 *
 * Guests need no account. JaaS requires a token from everyone, so an invitee
 * without one would hit a sign-in wall — the invite link therefore carries a
 * guest token in ?jwt=, scoped to this one room and valid for twelve hours.
 * That is what makes "just click the link" true.
 *
 * If JaaS is not configured the room falls back to the public server so the
 * feature still works for a five-minute demo, and a banner says plainly that
 * the call will be cut short. Silently degrading would be worse: the director
 * would blame the product when the call dropped.
 *
 * v2.4 — the meeting is opened by CopilotContext, which closes the Sheet
 * first. Every workaround below was an attempt to survive inside an open
 * Radix dialog; none of them could, because react-remove-scroll blocks the
 * wheel in the capture phase on document, before anything here can run. The
 * pointer-events-auto class stays as a safety net for any future caller.
 *
 * v2.3 FIX — the real reason the meeting looked frozen.
 *
 *   POINTER EVENTS. Radix's Dialog (which Sheet is built on) sets
 *   `pointer-events: none` on <body> while it is open, and re-enables it only
 *   on its own content. This panel portals to body, so it inherited `none`:
 *   perfectly visible, completely dead. No clicking, no scrolling, no typing.
 *   Every symptom came from that one line of inherited CSS. Fixed with
 *   `pointer-events-auto` on the root — and it is why the previous fix
 *   appeared to change nothing.
 *
 *   NATIVE LISTENERS. The stopPropagation handlers were React synthetic
 *   events. React delivers those through the React tree, but a portal outside
 *   the React root container does not reliably receive them, while the NATIVE
 *   event still bubbles to document where Radix is listening. The dismissal
 *   guard is now attached with addEventListener on the node itself, which is
 *   what actually stops the drawer closing.
 *
 * v2.2 FIXES — the portal solved one problem and created two.
 *
 *   DISMISSAL. Portalling to document.body puts this outside the Radix Sheet's
 *   DOM subtree, so Radix's dismissable layer treated every click in the
 *   meeting as a click OUTSIDE the drawer and closed it — taking CopilotPanel,
 *   and therefore this component, down with it. Its focus trap was separately
 *   pulling focus back into the drawer, which is why typing did nothing. Both
 *   listen on `document`, so the root below stops pointer, focus and key
 *   events from bubbling that far.
 *
 *   SCROLLING. `items-center` and `overflow-y-auto` on the same element clips
 *   content taller than the viewport and refuses to scroll to it — the top of
 *   the form was simply unreachable. Split into a scrolling parent and a
 *   centring child with min-h-full.
 *
 * v2.1 FIXES — both were mine, and both had the same symptom: a meeting that
 * appeared to do nothing.
 *
 *   PORTAL. This panel renders inside a Radix Sheet, which animates using a
 *   CSS transform. A transform on an ancestor makes `position: fixed` resolve
 *   against that ancestor instead of the viewport, so the "full screen"
 *   meeting was being drawn inside a 440px drawer. It now portals to
 *   document.body, which is outside the transformed subtree.
 *
 *   JOIN DEADLOCK. The video container was hidden until `started` turned true,
 *   but `started` only turned true when Jitsi reported it had joined — and
 *   Jitsi cannot finish joining into a display:none element. Camera on,
 *   nothing on screen, header stuck on "Not started", and the invite rail
 *   never appeared because it was gated on the same flag. The container is now
 *   mounted and visible from the moment Connect is pressed, with the setup
 *   screen layered over it and removed once the room is live.
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
 *
 * v3.4 FIX — TDZ crash on every render: "Cannot access 'addNote' before
 * initialization" (minified as 'eJ').
 *
 *   `addNote` was declared with useCallback near the bottom of the component,
 *   but two useEffect calls higher up referenced it inside their dependency
 *   arrays. Dependency arrays are evaluated synchronously as the component
 *   function runs — they don't wait for the effect to fire — so by the time
 *   execution reached those useEffect(...) calls, `addNote` was still in the
 *   temporal dead zone. Every render threw before the component could mount.
 *   `addNote` is now declared immediately after `notes` state, before
 *   anything that depends on it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  X, Copy, Mail, MessageCircle, Users, FileText, Loader2, Video,
  Lock, ShieldCheck, ListChecks, Plus, Trash2, Clock, MicOff, LayoutGrid, Save,
  Minus, Maximize2, Send, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { AuraStage, useSpeechBoundary } from '@/components/copilot/AuraStage';

// --- WHERE THE MEETING RUNS ---
// JaaS is the supported way to embed. meet.jit.si withdrew embedding: calls
// placed through it end after five minutes and force the host to sign in.
// The fallback is kept only so the feature still demonstrates before JaaS is
// configured — it is not a production path, and the banner says so.
const JAAS_DOMAIN = '8x8.vc';
const FALLBACK_DOMAIN = 'meet.jit.si';

const TOKEN_ENDPOINT =
  'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-meeting-token';

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
  /** ✅ v3.2: the live conversation, so Aura can be spoken to in the meeting. */
  messages?: { id: string; role: string; content: string }[];
  /** Sends a question to Aura without leaving the room. */
  onAsk?: (text: string) => void;
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
}

export default function AuraMeetingRoom({
  open, onClose, businessId, businessName = 'the business', directorName = 'Director',
  transcript = [], onRequestMinutes,
  messages = [], onAsk,
  speaking: speakingProp = false, listening = false, thinking = false,
}: AuraMeetingRoomProps) {
  const [title, setTitle] = useState('Management meeting');
  const [agenda, setAgenda] = useState('');
  const [room, setRoom] = useState('');
  const [password] = useState(makePassword);
  const [locked, setLocked] = useState(false);
  // 'setup' -> 'connecting' -> 'live'. Split from a single boolean because the
  // container must be visible during 'connecting' for Jitsi to join at all.
  const [phase, setPhase] = useState<'setup' | 'connecting' | 'live'>('setup');
  const [loadingApi, setLoadingApi] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [jaas, setJaas] = useState<{ appId: string; guestUrl: string } | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const joinTimeoutRef = useRef<any>(null);

  const started = phase !== 'setup';
  const live = phase === 'live';
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);

  // ✅ v3.4: moved up from further down in the file. Two useEffects below
  // reference `addNote` in their dependency arrays, and those arrays are
  // evaluated synchronously during render — not deferred until the effect
  // runs — so `addNote` has to exist before those useEffect(...) calls are
  // reached, or it throws "Cannot access before initialization" every render.
  const addNote = useCallback((entry: NoteEntry) => setNotes((p) => [...p, entry]), []);

  const [noteDraft, setNoteDraft] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rail, setRail] = useState<'people' | 'notes' | 'aura' | null>('people');
  const [auraInput, setAuraInput] = useState('');
  const [auraSpeaking, setAuraSpeaking] = useState(false);
  const spokenIdRef = useRef<string | null>(null);
  const greetedRef = useRef(false);

  // ✅ v3.3: drives the mouth from `onboundary`, the one real signal
  // SpeechSynthesis emits — it fires as each word begins. Without this the
  // avatar chews at a fixed 165ms whatever she is saying, which reads as a
  // screensaver rather than speech.
  const { word: spokenWord, attach: trackSpeech } = useSpeechBoundary();
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const meetingTitleRef = useRef(title);

  // Guests open the JaaS URL with their own token embedded. Without it JaaS
  // would show them a sign-in wall, and "no account needed" would be a lie.
  const meetingUrl = jaas?.guestUrl
    ? jaas.guestUrl
    : room ? `https://${FALLBACK_DOMAIN}/${room}` : '';
  const present = attendees.filter((a) => !a.leftAt);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { meetingTitleRef.current = title; }, [title]);

  /**
   * Speaks Aura's replies in the room, and pins them into the record.
   *
   * Waits for `thinking` to clear first: speaking mid-stream would stutter
   * through half-formed sentences as tokens arrive. Anything she says here is
   * also written into the notes, because a spoken answer that never reaches
   * the minutes may as well not have been given.
   */
  useEffect(() => {
    if (!open || thinking) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.content) return;
    if (spokenIdRef.current === last.id) return;
    spokenIdRef.current = last.id;

    addNote({ at: Date.now(), who: 'Aura', text: last.content.slice(0, 600), kind: 'note' });

    try {
      const clean = last.content
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/\S+/g, ' a link ')
        .replace(/[*_#>`|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 900);
      if (!clean || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.02;
      trackSpeech(u);
      u.onstart = () => setAuraSpeaking(true);
      u.onend = () => setAuraSpeaking(false);
      u.onerror = () => setAuraSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch (e) {
      setAuraSpeaking(false);
    }
  }, [messages, thinking, open, addNote]);

  /** One spoken welcome when the room goes live — not on every re-render. */
  useEffect(() => {
    if (phase !== 'live' || greetedRef.current) return;
    greetedRef.current = true;
    try {
      const opening = `Good day. ${title} is now open for ${businessName}. I am listening, and anything typed in the chat goes into the minutes. Ask me for figures at any point.`;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(opening);
        u.rate = 1.02;
        trackSpeech(u);
        u.onstart = () => setAuraSpeaking(true);
        u.onend = () => setAuraSpeaking(false);
        window.speechSynthesis.speak(u);
      }
      addNote({ at: Date.now(), who: 'Aura', text: 'Meeting opened.', kind: 'note' });
    } catch (e) { /* a greeting is a courtesy, never a failure path */ }
  }, [phase, title, businessName, addNote]);

  const askAura = () => {
    const q = auraInput.trim();
    if (!q || !onAsk) return;
    addNote({ at: Date.now(), who: directorName, text: q, kind: 'note' });
    onAsk(q);
    setAuraInput('');
    setRail('aura');
  };

  /**
   * REMOVED in v2.4: a native listener that stopped pointerdown, mousedown,
   * touchstart, click and focusin from reaching document.
   *
   * It was meant to keep the Radix Sheet from dismissing itself. What it
   * actually did was break the panel: React 18 dispatches every event from a
   * single listener at the root container, so stopping click and mousedown
   * before they got there meant onClick and onChange never fired at all.
   * Buttons did nothing, inputs would not accept text, and the cursor still
   * changed shape because that is pure CSS with nothing behind it.
   *
   * The Sheet is now closed before this opens (see CopilotContext v29.4), so
   * there is nothing to guard against.
   */

  useEffect(() => {
    if (!started || !startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [started, startedAt]);

  const clock = useMemo(() => {
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsed]);

  /** JaaS serves its own build of the API script, per app id. */
  const loadJitsi = useCallback((src: string): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).JitsiMeetExternalAPI) return resolve((window as any).JitsiMeetExternalAPI);
    const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).JitsiMeetExternalAPI));
      existing.addEventListener('error', () => reject(new Error('The meeting script failed to load.')));
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.dataset.jitsi = 'true';
    el.onload = () => resolve((window as any).JitsiMeetExternalAPI);
    el.onerror = () => reject(new Error(`Could not reach ${src}.`));
    document.body.appendChild(el);
  }), []);

  const endMeeting = useCallback(() => {
    clearTimeout(joinTimeoutRef.current);
    try { apiRef.current?.dispose(); } catch (err) { /* already disposed */ }
    apiRef.current = null;
    setPhase('setup');
  }, []);

  const startMeeting = async () => {
    if (!businessId) { toast.error('Still connecting to your business.'); return; }
    setLoadingApi(true);
    try {
      const name = roomFor(businessId, title);
      setRoom(name);

      // --- Ask the server for tokens. The signing key stays there. ---
      let token: string | null = null;
      let domain = FALLBACK_DOMAIN;
      let roomName = name;
      let scriptSrc = `https://${FALLBACK_DOMAIN}/external_api.js`;
      let fellBack = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ businessId, userId: session?.user?.id, room: name, displayName: directorName, email: session?.user?.email }),
        });
        const t = await res.json();

        if (t?.success && t.moderatorToken) {
          token = t.moderatorToken;
          domain = t.domain || JAAS_DOMAIN;
          roomName = t.fullRoomName;                     // JaaS rooms are appId/room
          scriptSrc = `https://${domain}/${t.appId}/external_api.js`;
          setJaas({ appId: t.appId, guestUrl: t.guestUrl });
          fellBack = false;
        } else if (t && t.configured === false) {
          toast.warning('JaaS is not set up yet, so this call will end after five minutes.', { duration: 7000 });
        } else if (t?.error) {
          toast.warning(`Falling back to the public server: ${t.error}`, { duration: 7000 });
        }
      } catch (e) {
        toast.warning('Could not reach the token service. Falling back to the public server.');
      }

      setUsingFallback(fellBack);

      const Jitsi = await loadJitsi(scriptSrc);

      // Container must be on screen BEFORE the API is constructed. Jitsi
      // measures its parent and will not complete a join into a hidden node.
      setPhase('connecting');
      setStartedAt(Date.now());
      await new Promise((r) => setTimeout(r, 60));   // let React paint it

      const api = new Jitsi(domain, {
        roomName,
        ...(token ? { jwt: token } : {}),
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

      // Some browsers and slow links never deliver videoConferenceJoined even
      // though the call is up. Without this the controls and the invite rail
      // would stay hidden behind an event that is not coming.
      joinTimeoutRef.current = setTimeout(() => {
        setPhase((p) => (p === 'connecting' ? 'live' : p));
      }, 9000);

      api.addEventListener('videoConferenceJoined', (e: any) => {
        clearTimeout(joinTimeoutRef.current);
        setPhase('live');
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
        const who = e.displayName || 'Guest';
        setAttendees((p) => [...p, { id: e.id, name: who, joinedAt: Date.now() }]);
        addNote({ at: Date.now(), who: 'Room', text: `${who} joined`, kind: 'note' });
        toast.info(`${who} joined`);

        // ✅ v3.1: Aura greets people in, by name, and tells them how to get
        // into the record. Said aloud AND written into the chat, because a
        // spoken welcome is lost on anyone who joined muted or deaf — and the
        // written line is what makes participants aware their typed points
        // reach the minutes at all.
        try {
          const greeting = `Welcome ${who}. This is ${meetingTitleRef.current} for ${businessName}. Anything you type in the meeting chat goes into the minutes.`;
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(greeting);
            u.rate = 1.02;
            trackSpeech(u);
            u.onstart = () => setAuraSpeaking(true);
            u.onend = () => setAuraSpeaking(false);
            window.speechSynthesis.speak(u);
          }
          api.executeCommand('sendChatMessage', greeting);
        } catch (err) { /* greeting is a courtesy, never a failure path */ }
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
    (locked ? `\nYou will wait briefly in the lobby until the host admits you.` : '') +
    (jaas ? `\nThis link works for 12 hours.` : '');

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

  if (!open || !mounted) return null;

  // Portalled to body. Inside the Radix Sheet this panel is a child of a
  // transformed element, and a transform makes `fixed` resolve against that
  // ancestor rather than the viewport — which drew the whole meeting inside a
  // 440px drawer.
  // Minimised: a small bar so the meeting keeps running while the director
  // works. Disposing the Jitsi instance to "minimise" would drop the call and
  // everyone in it, so the full view is hidden rather than unmounted.
  if (minimised) {
    return createPortal(
      <div
        ref={rootRef}
        // pointer-events-auto is not optional: Radix sets pointer-events:none
        // on body while the Sheet is open, and this is a child of body.
        className="pointer-events-auto fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 shadow-2xl"
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-white">{title}</p>
          <p className="text-[10px] text-slate-400">{live ? `${clock} · ${present.length} present` : 'Connecting...'}</p>
        </div>
        <button type="button" onClick={() => setMinimised(false)} title="Back to the meeting"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => { endMeeting(); setMinimised(false); onClose(); }} title="Leave"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={rootRef}
      // pointer-events-auto is the whole fix for "I can see it but nothing
      // works": Radix sets pointer-events:none on body while the Sheet is
      // open, and this panel is a child of body. Dismissal is handled by the
      // native listeners in the effect above.
      className="pointer-events-auto fixed inset-0 z-[9999] flex flex-col bg-slate-950"
      onKeyDownCapture={(e) => { if (e.key === 'Escape') e.stopPropagation(); }}
    >
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
            <button type="button" onClick={() => setRail(rail === 'aura' ? null : 'aura')}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium',
                rail === 'aura' ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/15 text-slate-200 hover:bg-white/10')}>
              <Sparkles className="h-3.5 w-3.5" /> Ask Aura
            </button>
            <button type="button" onClick={requestMinutes}
              className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700">
              <FileText className="h-3.5 w-3.5" /> Minutes
            </button>
          </>
        )}

        {started && (
          <button type="button" onClick={() => setMinimised(true)} aria-label="Minimise" title="Minimise — the meeting keeps running"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
            <Minus size={18} />
          </button>
        )}

        <button type="button" onClick={() => { endMeeting(); onClose(); }} aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </header>

      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0">
          {/* Mounted and sized from 'connecting' onward. Never display:none
              while Jitsi is joining — that is what stalled it. */}
          <div ref={containerRef} className={cn('h-full w-full', phase === 'setup' && 'invisible')} />

          {started && usingFallback && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
              <div className="max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-[11px] leading-relaxed text-amber-200">
                Running on the public test server, so this call ends after five minutes.
                Configure JaaS to remove the limit — see JAAS_SETUP.md.
              </div>
            </div>
          )}

          {phase === 'connecting' && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-[12px] font-medium text-slate-200 shadow-lg">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting to the room...
              </div>
            </div>
          )}

          {started && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-slate-900/80 p-3 backdrop-blur">
              <AuraStage speaking={auraSpeaking || speakingProp} word={spokenWord} listening={listening} thinking={thinking} size="sm" />
            </div>
          )}

          {phase === 'setup' && (
            <div className="absolute inset-0 z-10 overflow-y-auto bg-slate-950">
              <div className="flex min-h-full items-center justify-center px-6 py-10">
                <div className="w-full max-w-md space-y-5">
                <AuraStage speaking={auraSpeaking || speakingProp} word={spokenWord} listening={listening} thinking={thinking} size="md" caption="Ready to join" />

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

                  {usingFallback && room && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5">
                      <p className="text-[11px] leading-relaxed text-amber-200/80">
                        JaaS is not configured, so this will run on the public test server and
                        the call will end after five minutes.
                      </p>
                    </div>
                  )}

                  <p className="text-center text-[11px] leading-relaxed text-slate-500">
                    If Aura is listening or in a spoken conversation, end that first —
                    two things cannot hold the microphone at once, and the meeting will
                    report no audio.
                  </p>

                  <p className="text-center text-[11px] leading-relaxed text-slate-500">
                    Aura hears only this device. Ask participants to type key points into the meeting chat —
                    those are captured with their names and reach the minutes.
                  </p>
                  </div>
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

            {rail === 'aura' && (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <div className="flex items-center gap-2">
                    <AuraStage speaking={auraSpeaking} word={spokenWord} thinking={thinking} size="sm" caption="" />
                  </div>

                  {messages.length === 0 && (
                    <p className="text-[12px] leading-relaxed text-slate-500">
                      Ask her anything about the business while the meeting runs — figures, overdue accounts,
                      stock. Her answers are spoken aloud and written into the record.
                    </p>
                  )}

                  {messages.slice(-8).map((m) => (
                    <div key={m.id} className={cn('rounded-lg px-2.5 py-2',
                      m.role === 'assistant' ? 'border border-white/10 bg-white/5' : 'bg-blue-500/10')}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {m.role === 'assistant' ? 'Aura' : directorName}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-200">
                        {m.content.slice(0, 700)}
                      </p>
                    </div>
                  ))}

                  {thinking && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> Working it out...
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-white/10 p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={auraInput}
                      onChange={(e) => setAuraInput(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter sends; Shift+Enter is a new line. In a meeting
                        // the common case is a short question, not a paragraph.
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAura(); }
                      }}
                      rows={2}
                      placeholder="Ask Aura..."
                      className="flex-1 resize-none rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-blue-400"
                    />
                    <button type="button" onClick={askAura} disabled={!auraInput.trim() || thinking}
                      aria-label="Ask Aura"
                      className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
                        auraInput.trim() && !thinking ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/10 text-slate-500')}>
                      {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  {auraSpeaking && (
                    <button type="button"
                      onClick={() => { try { window.speechSynthesis.cancel(); } catch (e) { /* stopped */ } setAuraSpeaking(false); }}
                      className="mt-2 w-full rounded-lg border border-white/15 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/5">
                      Stop speaking
                    </button>
                  )}
                </div>
              </>
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
    </div>,
    document.body,
  );
}