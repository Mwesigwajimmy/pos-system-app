'use client';

/**
 * --- AURA COPILOT PANEL ---
 * The chat surface itself (header + thread + composer). Mounted inside
 * CopilotDock, which handles the responsive slide-in (desktop) / full
 * popup (mobile) shell and backdrop around it.
 *
 * v2 CHANGE: `boardroomData` is no longer local useState — it now comes
 * from CopilotContext (`boardroomData`, `closeBoardroom`), shared across
 * every component using useCopilot(). A boardroom triggered from
 * MissionControlPage or AuraForensicGuard will now correctly show here
 * too, and vice versa. Local setBoardroomData call removed from the
 * streamData effect — CopilotContext sets it directly now.
 *
 * v9 CHANGE: accessibility. Everything Aura says can be shown as large live
 * captions, and the whole panel scales up on request.
 *
 * This exists because a deaf or hard-of-hearing director should not be a
 * second-class user of a system that talks. Captions are not a nicety here —
 * they are the difference between the voice features being usable and being
 * decoration. The same bar also serves anyone in a noisy shop, or working
 * with the sound off.
 *
 * What is NOT here, deliberately: sign language. Generating accurate signing
 * needs a rigged 3D avatar and a text-to-gloss model trained on the specific
 * language — Ugandan Sign Language is not ASL — and both are research
 * problems. An avatar making handshapes that look like signing but mean
 * nothing would be worse than useless in front of financial figures: someone
 * would act on it. Captions and text are honest accessibility; a signing
 * mannequin would not be.
 *
 * v8 CHANGE: meetings. The camera icon opens AuraMeetingRoom — a Jitsi call
 * with attendance, invitations by WhatsApp or email, a written record, and
 * minutes written by Aura at the end. The transcript handed to it is this
 * conversation's own turns, so anything Aura answered during the meeting is
 * part of the record.
 *
 * v5 CHANGE: voice. The director can speak to Aura and hear her reply.
 * Both directions run in the browser — SpeechRecognition for listening,
 * SpeechSynthesis for speaking — so there is no audio API cost and no extra
 * backend. Two things worth knowing, both handled below:
 *
 *   1. In Chrome, SpeechRecognition streams audio to Google's servers for
 *      transcription. It is not local. A director dictating "what is our
 *      outstanding balance" is sending that sentence to a third party. The
 *      composer says so, quietly, the first time the microphone is used.
 *   2. Transcription is never sent automatically. It lands in the input box
 *      for the director to read and send. "Show me profit" and "show me
 *      profits for June" are one mis-heard word apart, and a wrong question
 *      quietly answered is worse than one the user has to retype.
 *
 * v4 CHANGE: documents can be attached. The paperclip uploads a receipt,
 * supplier invoice or bank statement to the private `receipts` bucket, then
 * calls aura-document-intake, which extracts the figures, recomputes every
 * total in code and returns a proposal. Nothing is written to the accounting
 * tables — the card shows what WOULD be recorded and the director enters it
 * through the normal screen. See the note in that edge function for why.
 *
 * v3 CHANGE: generated reports render as a download card (ReportFileCard)
 * inside the assistant bubble, fed by `m.reportFile` from CopilotContext
 * v29.3. Previously Aura streamed the signed URL as plain text, which put
 * roughly 400 characters of JWT in front of the director where they
 * expected a button. The card sits inside the message rather than in the
 * transient streamData strip below, so it persists for the rest of the
 * conversation instead of disappearing when the stream closes.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Send, User, Loader2, Cpu,
  FileDown, Compass, X, ShieldCheck,
  Presentation, Paperclip, FileText, AlertTriangle, CheckCircle2,
  Mic, Square, Volume2, VolumeX, Phone, PhoneOff, Settings2, Video,
  Accessibility, Captions,
} from 'lucide-react';

import { AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

import { createClient } from '@/lib/supabase/client';
import { useLocalWhisper } from '@/hooks/useLocalWhisper';
import { useCopilot } from '@/context/CopilotContext';
import { AuraAvatar } from './AuraAvatar';
import AuraBoardroom from './AuraBoardroom';
import AuraMeetingRoom from './AuraMeetingRoom';

const supabase = createClient();

const INTAKE_ENDPOINT =
  'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-document-intake';

// Private bucket. Receipts and statements are financial records and should
// never sit in a public bucket.
const INTAKE_BUCKET = 'receipts';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp';

// Voice settings. autoSend stays false for typed-then-sent dictation, but
// conversation mode sends automatically — that is the whole point of it.
const VOICE = { autoSend: false, maxSpokenChars: 1400 };

// Chosen voice, speed and pitch persist per browser. Real voice cloning needs
// a hosted model and cannot run here; this picks from the voices already
// installed on the device, which costs nothing and sends no audio anywhere.
const VOICE_KEYS = { uri: 'aura.voice.uri', rate: 'aura.voice.rate', pitch: 'aura.voice.pitch', private: 'aura.voice.private' };
const A11Y_KEYS = { captions: 'aura.a11y.captions', large: 'aura.a11y.large' };

const readStored = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
};

const writeStored = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
};

/**
 * Aura writes markdown and, at times, signed URLs several hundred characters
 * long. Reading either aloud verbatim is unusable, so speech gets a cleaned
 * version of the same text.
 */
/**
 * True when a transcript is really Aura's own voice picked up through the
 * speakers. Headphones remove the problem entirely, but most directors will
 * not be wearing any.
 */
const isEchoOfAura = (heard: string, spoken: string): boolean => {
  if (!heard || !spoken) return false;
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const h = norm(heard);
  const sp = norm(spoken);
  if (h.length < 8) return false;
  return sp.includes(h) || h.includes(sp.slice(0, Math.min(60, sp.length)));
};

const forSpeech = (raw: string): string => {
  let t = String(raw ?? '');
  t = t.replace(/```[\s\S]*?```/g, ' code block ');
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');      // keep the label, drop the URL
  t = t.replace(/https?:\/\/\S+/g, ' a link ');
  t = t.replace(/[*_#>`|]/g, ' ');
  t = t.replace(/^\s*[-–]\s*/gm, ', ');
  t = t.replace(/\s+/g, ' ').trim();
  return t.slice(0, VOICE.maxSpokenChars);
};

interface DocIntake {
  id: string;
  fileName: string;
  status: 'uploading' | 'reading' | 'done' | 'failed';
  error?: string;
  result?: any;
}

const downloadFileFromBase64 = (fileName: string, mimeType: string, content: string): void => {
  try {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${content}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${fileName}`);
  } catch (error) {
    toast.error("Couldn't finish that download.");
  }
};

/**
 * ✅ v3: the generated report, rendered as a download control rather than a URL.
 * Signed Supabase links embed a JWT and run to several hundred characters,
 * which is unreadable in a chat bubble. The link expires after an hour.
 */
const ReportFileCard = ({ file }: { file: any }): React.ReactNode => {
  if (!file?.downloadUrl) return null;

  const ext = String(file.format || 'file').toUpperCase().slice(0, 4);
  const warnings: string[] = Array.isArray(file.warnings) ? file.warnings : [];

  return (
    <a
      href={file.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 no-underline shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
        {ext}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-slate-900">
          {file.title || 'Report'}
        </span>
        <span className="block truncate text-[11px] text-slate-400">
          {file.scope}
          {typeof file.rowCount === 'number' ? ` · ${file.rowCount.toLocaleString()} rows` : ''}
        </span>
        {warnings.length > 0 && (
          <span className="mt-0.5 block truncate text-[11px] text-amber-600">
            {warnings.length} section{warnings.length > 1 ? 's' : ''} incomplete
          </span>
        )}
      </span>
      <FileDown className="h-4 w-4 shrink-0 text-slate-400" />
    </a>
  );
};

/**
 * ✅ v4: what Aura read out of an uploaded document, and what she proposes
 * recording. The checks come from the edge function, where every total is
 * recomputed rather than taken from the model.
 */
const DocumentIntakeCard = ({ item }: { item: DocIntake }): React.ReactNode => {
  if (item.status === 'uploading' || item.status === 'reading') {
    return (
      <div className="ml-[46px] my-2 flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-slate-900">{item.fileName}</p>
          <p className="text-[11px] text-slate-400">
            {item.status === 'uploading' ? 'Uploading...' : 'Reading the document...'}
          </p>
        </div>
      </div>
    );
  }

  if (item.status === 'failed') {
    return (
      <div className="ml-[46px] my-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-amber-900">{item.fileName}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">{item.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const r = item.result ?? {};
  const d = r.extracted ?? {};
  const checks: any[] = r.validation?.checks ?? [];
  const computed = r.validation?.computed ?? {};
  const proposal = r.proposal ?? {};
  const lines: any[] = Array.isArray(d.lines) ? d.lines : [];
  const txns: any[] = Array.isArray(proposal.lines) ? proposal.lines : [];
  const cur = computed.currency ?? '';
  const money = (v: any) => `${cur} ${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="ml-[46px] my-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-slate-900">{item.fileName}</p>
          <p className="truncate text-[11px] text-slate-400">
            {String(d.documentType ?? 'document').replace(/_/g, ' ')}
            {d.vendor ? ` · ${d.vendor}` : ''}
            {computed.documentDate ? ` · ${computed.documentDate}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-1 px-3 py-2.5 text-[12px]">
        {computed.statedTotal !== null && computed.statedTotal !== undefined && (
          <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold text-slate-900">{money(computed.statedTotal)}</span></div>
        )}
        {computed.subtotal !== null && computed.subtotal !== undefined && (
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-700">{money(computed.subtotal)}</span></div>
        )}
        {computed.taxAmount !== null && computed.taxAmount !== undefined && (
          <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="text-slate-700">{money(computed.taxAmount)}</span></div>
        )}
        {lines.length > 0 && (
          <div className="flex justify-between"><span className="text-slate-500">Line items</span><span className="text-slate-700">{lines.length}</span></div>
        )}
        {txns.length > 0 && (
          <div className="flex justify-between"><span className="text-slate-500">Statement lines</span><span className="text-slate-700">{txns.length}</span></div>
        )}
      </div>

      {checks.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 px-3 py-2.5">
          {checks.map((c: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              {c.level === 'ok'
                ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                : <AlertTriangle className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', c.level === 'fail' ? 'text-red-500' : 'text-amber-500')} />}
              <p className={cn('text-[11px] leading-relaxed', c.level === 'ok' ? 'text-slate-500' : 'text-slate-700')}>{c.message}</p>
            </div>
          ))}
        </div>
      )}

      {proposal.targetTable && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-600">Would be recorded as an expense</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {proposal.row?.description} &mdash; {money(proposal.row?.amount)}
            {proposal.row?.date ? ` on ${proposal.row.date}` : ''}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
            Nothing has been saved. Enter these figures on the expenses screen, choosing the category yourself.
          </p>
        </div>
      )}

      {!proposal.targetTable && proposal.note && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-slate-500">{proposal.note}</p>
        </div>
      )}
    </div>
  );
};

const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  if (!data) return null;

  try {
    const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};

    const actionConfigs: Record<string, { icon: any, color: string, label: string }> = {
      navigate: { icon: Compass, color: "text-sky-600 bg-sky-50 border-sky-100", label: "Navigating" },
      download_file: { icon: FileDown, color: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "File ready" },
      prepare_boardroom_presentation: { icon: Presentation, color: "text-blue-600 bg-blue-50 border-blue-100", label: "Preparing boardroom" },
      request_confirmation: { icon: ShieldCheck, color: "text-amber-600 bg-amber-50 border-amber-100", label: "Needs your confirmation" }
    };

    const config = actionConfigs[outputData.action];

    if (config) {
      const Icon = config.icon;
      return (
        <div className={cn("text-xs ml-[46px] my-2 p-3 border rounded-2xl animate-in fade-in slide-in-from-left-2 shadow-sm", config.color)}>
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-[11px]">{config.label}</p>
              <p className="font-mono text-[9px] opacity-70 truncate max-w-[240px]">
                {outputData.payload?.url || outputData.payload?.fileName || "Working on it..."}
              </p>
            </div>
          </div>
        </div>
      );
    }
  } catch (e) { }

  if (data.tool || data.event === 'on_agent_action') {
    const toolName = data.tool || data.data?.tool;
    return (
      <div className="text-[10px] text-muted-foreground ml-[46px] my-1.5 p-2.5 border rounded-xl bg-slate-50 border-dashed border-slate-200">
        <div className="flex items-center gap-2">
          <Cpu className="h-3 w-3 text-emerald-500 animate-pulse" />
          <p className="font-medium text-slate-500 text-[10px]">
             Using: {toolName?.replace(/_/g, ' ') || "a tool"}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const SUGGESTIONS = [
  'Summarize this week\'s sales',
  'Any anomalies in the ledger?',
  'Draft a report for the board',
];

/** Keeps the transcript handler stable without re-creating the worker hook. */
function useCallbackTranscript(fn: (text: string) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  return React.useCallback((text: string) => ref.current(text), []);
}

export default function CopilotPanel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [intakes, setIntakes] = useState<DocIntake[]>([]);   // ✅ v4

  // ✅ v5 voice
  const [listening, setListening] = useState(false);
  const [speakBack, setSpeakBack] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState({ listen: false, speak: false });
  const [micNoticeShown, setMicNoticeShown] = useState(false);
  const recognitionRef = useRef<any>(null);
  const spokenIdRef = useRef<string | null>(null);
  const lastSpokenRef = useRef('');

  // ✅ v8 meeting room
  const [meetingOpen, setMeetingOpen] = useState(false);

  // ✅ v9 accessibility
  const [captionsOn, setCaptionsOn] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [caption, setCaption] = useState('');

  // ✅ v6 conversation mode + voice choice
  const [callActive, setCallActive] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState('');
  const [rate, setRate] = useState(1.02);
  const [pitch, setPitch] = useState(1);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const callRef = useRef(false);          // callbacks need the live value, not a stale closure
  const listeningRef = useRef(false);

  // ✅ v7: on-device transcription. Chrome's own recogniser sends audio to
  // Google; this keeps it on the machine at the cost of a one-time download.
  const [privateVoice, setPrivateVoice] = useState(false);

  const handleTranscript = useCallbackTranscript(
    (text: string) => {
      if (isEchoOfAura(text, lastSpokenRef.current)) {
        if (callRef.current) setTimeout(() => { if (callRef.current) whisper.start(); }, 500);
        return;
      }
      if (callRef.current) {
        setInput?.('');
        handleSubmit(text);
      } else {
        setInput?.(text);
      }
    },
  );

  const whisper = useLocalWhisper({
    enabled: privateVoice,
    onFinal: handleTranscript,
    onError: (m) => toast.error(m),
  });

  const {
    messages = [],
    input = '',
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading = false,
    data: streamData = [],
    isReady = false,
    closeCopilot,
    boardroomData,    // ✅ from CopilotContext, not local useState
    closeBoardroom,   // ✅ from CopilotContext
    businessId,       // ✅ v4: needed to scope the upload path
    userId,           // ✅ v4
    tenantData,       // ✅ v8: business and director names for the minutes
  } = useCopilot();

  /**
   * ✅ v4: upload, then extract. The file goes to a private bucket under the
   * business id, so one tenant's receipts can never sit in another's folder.
   */
  const handleFile = async (file: File) => {
    const id = crypto.randomUUID();

    if (file.size > MAX_UPLOAD_BYTES) {
      setIntakes((p) => [...p, { id, fileName: file.name, status: 'failed', error: 'That file is over 10 MB. Try a smaller scan or a single page.' }]);
      return;
    }
    if (!businessId) {
      setIntakes((p) => [...p, { id, fileName: file.name, status: 'failed', error: 'Still connecting to your business. Try again in a moment.' }]);
      return;
    }

    setIntakes((p) => [...p, { id, fileName: file.name, status: 'uploading' }]);

    try {
      const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(-80);
      const path = `${businessId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(INTAKE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });

      if (upErr) {
        throw new Error(
          /policy|permission|unauthor/i.test(upErr.message)
            ? `Upload was refused by storage. The '${INTAKE_BUCKET}' bucket needs a policy allowing signed-in users to upload.`
            : upErr.message,
        );
      }

      setIntakes((p) => p.map((x) => (x.id === id ? { ...x, status: 'reading' } : x)));

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(INTAKE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ action: 'extract', businessId, userId, bucket: INTAKE_BUCKET, path, documentType: 'auto' }),
      });

      const result = await res.json();

      if (!result?.success) {
        throw new Error(result?.error || 'The document could not be read.');
      }

      setIntakes((p) => p.map((x) => (x.id === id ? { ...x, status: 'done', result } : x)));
      toast.success(`Read ${file.name}`);

    } catch (e) {
      const msg = (e as Error).message || 'Something went wrong reading that file.';
      console.error('[Aura document intake]', msg);
      setIntakes((p) => p.map((x) => (x.id === id ? { ...x, status: 'failed', error: msg } : x)));
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ✅ v5: feature detection. Firefox has no SpeechRecognition and iOS Safari
  // is unreliable, so the microphone is hidden rather than shown broken.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported({ listen: !!SR || typeof Worker !== 'undefined', speak: 'speechSynthesis' in window });
    return () => {
      try {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
      } catch (e) { /* nothing to stop */ }
    };
  }, []);

  // ✅ v6: the device's installed voices. Chrome populates this list
  // asynchronously, so the event listener matters — without it the picker is
  // empty on first open and mysteriously fills later.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    setVoiceUri(readStored(VOICE_KEYS.uri, ''));
    setPrivateVoice(readStored(VOICE_KEYS.private, 'false') === 'true');
    setCaptionsOn(readStored(A11Y_KEYS.captions, 'false') === 'true');
    setLargeText(readStored(A11Y_KEYS.large, 'false') === 'true');
    setRate(Number(readStored(VOICE_KEYS.rate, '1.02')) || 1.02);
    setPitch(Number(readStored(VOICE_KEYS.pitch, '1')) || 1);
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => { listeningRef.current = listening; }, [listening]);

  // ✅ v5: speak Aura's reply once it has finished streaming. Speaking mid-
  // stream would stutter through half sentences as tokens arrive.
  useEffect(() => {
    if (!speakBack || isChatLoading || !voiceSupported.speak) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.content) return;
    if (spokenIdRef.current === last.id) return;

    spokenIdRef.current = last.id;
    try {
      window.speechSynthesis.cancel();
      const spokenText = forSpeech(last.content);
      lastSpokenRef.current = spokenText;
      const utter = new SpeechSynthesisUtterance(spokenText);
      const chosen = voices.find((v) => v.voiceURI === voiceUri);
      if (chosen) utter.voice = chosen;
      utter.lang = chosen?.lang || navigator.language || 'en-US';
      utter.rate = rate;
      utter.pitch = pitch;
      utter.onstart = () => { setSpeaking(true); setCaption(spokenText); };
      utter.onend = () => {
        setSpeaking(false);
        setCaption('');
        // ✅ v6: in conversation mode, hand the floor back to the director.
        if (callRef.current) setTimeout(() => startListening(true), 350);
      };
      utter.onerror = () => {
        setSpeaking(false);
        setCaption('');
        if (callRef.current) setTimeout(() => startListening(true), 350);
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      setSpeaking(false);
    }
  }, [messages, isChatLoading, speakBack, voiceSupported.speak, voices, voiceUri, rate, pitch]);

  // ✅ v6: if a reply produced nothing to speak, the utterance callbacks never
  // fire and a call would sit silent forever. Resume listening anyway.
  useEffect(() => {
    if (!callActive || isChatLoading || speaking || listening) return;
    const t = setTimeout(() => {
      // The `speaking` state is set by utter.onstart, which fires a beat AFTER
      // speak() is called. Between those two moments the state says silent
      // while the utterance is queued — and reopening the microphone there
      // cancels Aura mid-sentence, then transcribes her own voice back as the
      // next question. Ask the synthesiser directly rather than trusting React
      // state that has not caught up yet.
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      if (synth && (synth.speaking || synth.pending)) return;
      if (callRef.current && !listeningRef.current) startListening(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [callActive, isChatLoading, speaking, listening]);

  const stopSpeaking = () => {
    try { window.speechSynthesis.cancel(); } catch (e) { /* already stopped */ }
    setSpeaking(false);
    setCaption('');
  };

  const stopListening = () => {
    if (privateVoice) { whisper.stop(); return; }
    try { recognitionRef.current?.stop(); } catch (e) { /* already stopped */ }
    setListening(false);
  };

  /**
   * Listening. In conversation mode a finished sentence is sent immediately
   * and the microphone closes, because leaving it open while Aura replies
   * means she transcribes her own voice and answers herself.
   */
  const startListening = (inCall = false) => {
    // ✅ v7: private mode routes through the on-device model instead.
    if (privateVoice) {
      if (!whisper.supported) { toast.error('This browser cannot run on-device speech.'); return; }
      stopSpeaking();
      whisper.start();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('This browser cannot listen. Chrome or Edge works best.');
      return;
    }
    if (listeningRef.current) return;

    if (!micNoticeShown) {
      toast.info('Your voice is transcribed by the browser, which sends the audio to its speech service.', { duration: 6000 });
      setMicNoticeShown(true);
    }

    stopSpeaking();

    try {
      const rec = new SR();
      rec.lang = navigator.language || 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      let finalText = '';

      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += chunk;
          else interim += chunk;
        }
        setInput?.((finalText + interim).trim());
      };

      rec.onerror = (event: any) => {
        setListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access was blocked. Allow it in the address bar and try again.');
          endCall();
        } else if (event.error === 'no-speech') {
          if (!callRef.current) toast.info('I did not catch anything. Try again.');
        } else if (event.error !== 'aborted') {
          toast.error('Listening stopped unexpectedly.');
        }
      };

      rec.onend = () => {
        setListening(false);
        let text = finalText.trim();

        // Speakers feed the microphone. If what came back is a chunk of what
        // Aura just said, it is her own voice, not the director's.
        if (text && isEchoOfAura(text, lastSpokenRef.current)) {
          if (callRef.current) setTimeout(() => { if (callRef.current) startListening(true); }, 500);
          return;
        }

        if (text && (inCall || VOICE.autoSend)) {
          setInput?.('');
          handleSubmit(text);
        } else if (!text && callRef.current) {
          // Silence. Keep the line open rather than ending the call on a pause.
          setTimeout(() => { if (callRef.current) startListening(true); }, 600);
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening(false);
  };

  // ✅ v6: hands-free conversation. Aura speaks, then listens, then speaks.
  const startCall = () => {
    if (!voiceSupported.listen || !voiceSupported.speak) {
      toast.error('This browser cannot hold a spoken conversation. Chrome or Edge on desktop works best.');
      return;
    }
    callRef.current = true;
    setCallActive(true);
    setSpeakBack(true);
    spokenIdRef.current = messages[messages.length - 1]?.id ?? null;
    toast.success('Conversation started. Speak normally — pause when you are finished.');
    startListening(true);
  };

  const endCall = () => {
    callRef.current = false;
    setCallActive(false);
    stopListening();
    stopSpeaking();
  };

  useEffect(() => {
    if (streamData && streamData.length > 0) {
      const lastChunk = streamData[streamData.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;

        if (parsed.event === 'on_error' || parsed.error) {
            toast.error(parsed.data?.error || parsed.error || "Something went wrong.");
        }

        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          if (output.action === "navigate") router.push(output.payload.url);
          if (output.action === "download_file") downloadFileFromBase64(output.payload.fileName, output.payload.mimeType, output.payload.content);
          // prepare_boardroom_presentation handled by CopilotContext now
        }
      } catch (e) { }
    }
  }, [streamData, router]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const box = scrollRef.current.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!box) return;
    const distanceFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
    if (distanceFromBottom < 160) {
        box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isChatLoading, streamData]);

  useEffect(() => {
    if (isReady && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
    }
  }, [isReady]);

  // ✅ v8: this conversation, shaped for the minutes.
  const meetingTranscript = useMemo(
    () => (messages || [])
      .filter((m: any) => m.content)
      .map((m: any) => ({
        role: (m.role === 'assistant' ? 'aura' : 'director') as 'aura' | 'director',
        text: String(m.content),
        at: Date.now(),
      })),
    [messages],
  );

  if (!hasMounted) return null;

  const safeInput = (input || '').toString();
  const hasText = safeInput.trim().length > 0;
  const isButtonDisabled = isChatLoading || !hasText;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden relative font-sans">

      {/* ✅ v8 */}
      <AuraMeetingRoom
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        businessId={businessId}
        businessName={tenantData?.business_name || tenantData?.name || 'the business'}
        directorName={tenantData?.full_name || 'Director'}
        transcript={meetingTranscript}
        onRequestMinutes={(prompt) => { setMeetingOpen(false); handleSubmit(prompt); }}
        speaking={speaking}
        listening={listening || whisper.listening}
        thinking={isChatLoading}
      />

      <AnimatePresence mode="wait">
        {boardroomData && (
          <AuraBoardroom
            presenter={boardroomData.presenter_role}
            title={boardroomData.meeting_title}
            slides={boardroomData.slides}
            onClose={closeBoardroom}
          />
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="h-14 px-3 sm:px-4 border-b border-slate-100 bg-white flex items-center gap-2.5 shrink-0">
        <AuraAvatar
          agent="aura"
          state={isChatLoading ? 'thinking' : !isReady ? 'loading' : 'idle'}
          status={isReady ? 'online' : 'syncing'}
          className="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-bold text-slate-900 truncate leading-tight">Aura</h2>
          <p className="text-[11px] text-slate-400 truncate leading-tight">
            {(listening || whisper.listening) ? 'Listening...'
              : whisper.thinking ? 'Transcribing...'
              : speaking ? 'Speaking...'
              : isReady ? 'Online' : 'Connecting...'}
          </p>
        </div>
        {/* ✅ v8: start a meeting */}
        <button
          type="button"
          onClick={() => {
            // Release the microphone. Speech recognition and Jitsi cannot both
            // hold it, and the meeting reports "no audio signal" if Aura is
            // still listening when it opens.
            endCall();
            stopListening();
            stopSpeaking();
            setMeetingOpen(true);
          }}
          disabled={!isReady}
          aria-label="Start a meeting"
          title="Start a meeting"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-40"
        >
          <Video size={17} />
        </button>

        {/* ✅ v6: choose the voice */}
        {voiceSupported.speak && (
          <button
            type="button"
            onClick={() => setShowVoiceSettings((v) => !v)}
            aria-label="Voice settings"
            title="Voice settings"
            className={cn(
              'h-9 w-9 shrink-0 flex items-center justify-center rounded-full transition-colors',
              showVoiceSettings ? 'text-slate-900 bg-slate-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <Settings2 size={16} />
          </button>
        )}

        {/* ✅ v5: speak replies aloud */}
        {voiceSupported.speak && (
          <button
            type="button"
            onClick={() => {
              if (speakBack) { stopSpeaking(); setSpeakBack(false); }
              else {
                // Do not read out whatever happens to be on screen already.
                spokenIdRef.current = messages[messages.length - 1]?.id ?? null;
                setSpeakBack(true);
              }
            }}
            aria-label={speakBack ? 'Turn off spoken replies' : 'Read replies aloud'}
            title={speakBack ? 'Spoken replies on' : 'Read replies aloud'}
            className={cn(
              'h-9 w-9 shrink-0 flex items-center justify-center rounded-full transition-colors',
              speakBack ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            {speakBack ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => { endCall(); closeCopilot?.(); }}
          aria-label="Close chat"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>
      </header>

      {/* ✅ v6: VOICE SETTINGS */}
      {showVoiceSettings && voiceSupported.speak && (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-3 space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Voice</label>
            <select
              value={voiceUri}
              onChange={(e) => { setVoiceUri(e.target.value); writeStored(VOICE_KEYS.uri, e.target.value); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 outline-none focus:border-blue-400"
            >
              <option value="">Browser default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} — {v.lang}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Speed {rate.toFixed(2)}</label>
              <input
                type="range" min="0.6" max="1.6" step="0.02" value={rate}
                onChange={(e) => { const v = Number(e.target.value); setRate(v); writeStored(VOICE_KEYS.rate, String(v)); }}
                className="w-full accent-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pitch {pitch.toFixed(2)}</label>
              <input
                type="range" min="0.5" max="1.6" step="0.02" value={pitch}
                onChange={(e) => { const v = Number(e.target.value); setPitch(v); writeStored(VOICE_KEYS.pitch, String(v)); }}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={privateVoice}
              onChange={(e) => { setPrivateVoice(e.target.checked); writeStored(VOICE_KEYS.private, String(e.target.checked)); }}
              className="mt-0.5 accent-blue-600"
            />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-slate-800">Transcribe on this device</span>
              <span className="block text-[11px] leading-relaxed text-slate-500">
                Keeps your voice off Google's servers. Downloads about 40 MB the first time.
                {whisper.modelLoading ? ` Loading ${whisper.loadingPercent}%...` : whisper.ready ? ' Ready.' : ''}
              </span>
            </span>
          </label>

          {/* ✅ v9 */}
          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <Accessibility className="h-3.5 w-3.5" /> Accessibility
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={captionsOn}
                onChange={(e) => { setCaptionsOn(e.target.checked); writeStored(A11Y_KEYS.captions, String(e.target.checked)); }}
                className="mt-0.5 accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-slate-800">Live captions</span>
                <span className="block text-[11px] leading-relaxed text-slate-500">
                  Shows what Aura is saying, and what she hears you say, in a bar above the composer.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={largeText}
                onChange={(e) => { setLargeText(e.target.checked); writeStored(A11Y_KEYS.large, String(e.target.checked)); }}
                className="mt-0.5 accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-slate-800">Larger text</span>
                <span className="block text-[11px] leading-relaxed text-slate-500">
                  Increases the size of messages and captions.
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                try {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance('Good morning. Your figures are ready whenever you are.');
                  const chosen = voices.find((v) => v.voiceURI === voiceUri);
                  if (chosen) u.voice = chosen;
                  u.rate = rate; u.pitch = pitch;
                  window.speechSynthesis.speak(u);
                } catch (e) { /* nothing to preview */ }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:border-slate-300"
            >
              Preview
            </button>
            <p className="text-[10px] text-slate-400">Saved on this device</p>
          </div>
        </div>
      )}

      {/* ✅ v6: CALL BAR */}
      {callActive && (
        <div className="shrink-0 flex items-center gap-2.5 border-b border-blue-100 bg-blue-50 px-4 py-2.5">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', (listening || whisper.listening) ? 'bg-red-500 animate-pulse' : speaking ? 'bg-blue-500 animate-pulse' : 'bg-slate-300')} />
          <p className="flex-1 text-[12px] font-medium text-slate-700">
            {(listening || whisper.listening) ? 'Listening — pause when you finish'
              : whisper.thinking ? 'Transcribing what you said...'
              : speaking ? 'Aura is speaking'
              : 'Thinking...'}
          </p>
          <button
            type="button"
            onClick={endCall}
            className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600"
          >
            <PhoneOff className="h-3 w-3" /> End
          </button>
        </div>
      )}

      {/* CONTENT AREA */}
      {/* min-h-0 is load-bearing here: a flex item's default min-height is
          "auto", so without it this ScrollArea would grow to fit all the
          chat content instead of scrolling, pushing the composer footer
          below the visible viewport (only reachable by zooming out). */}
      <ScrollArea className="flex-1 min-h-0 bg-slate-50/60">
        <div className={cn('space-y-4 w-full p-3 sm:p-5', largeText && 'text-[15px] [&_p]:leading-relaxed')}>

            {isReady && messages.length === 0 && (
                <div className="py-10 sm:py-14 text-center">
                    <AuraAvatar agent="aura" className="h-24 w-24 mb-4" />
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">How can I help?</h3>
                    <p className="text-[13px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Ask about your sales, ledger, inventory, or anything else across your business.
                    </p>

                    <div className="flex flex-col gap-2 mt-7 max-w-xs mx-auto">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setInput?.(s)}
                                className="w-full text-left px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-all shadow-sm"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-end gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-2 duration-300')}>
                {m.role === 'assistant' && (
                  <AuraAvatar agent="aura" className="h-9 w-9" interactive={false} />
                )}
                <div className={cn(
                    'rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%] shadow-sm leading-relaxed break-words',
                    largeText ? 'text-[16px] sm:text-[17px]' : 'text-[13px] sm:text-[14px]',
                    m.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:m-0 prose-strong:text-blue-600 prose-code:bg-slate-100 prose-code:p-1 prose-code:rounded prose-table:border prose-table:rounded-xl prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3"
                  >
                    {m.content}
                  </ReactMarkdown>

                  {/* ✅ v3: download card for a generated report, if this
                      message carried one. Lives inside the bubble so it
                      persists with the message. */}
                  {m.reportFile && <ReportFileCard file={m.reportFile} />}
                </div>

                {m.role === 'user' && (
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {/* ✅ v4: uploaded documents and what Aura read from them */}
            {intakes.length > 0 && (
                <div className="space-y-1">
                    {intakes.map((item) => (
                        <DocumentIntakeCard key={item.id} item={item} />
                    ))}
                </div>
            )}

            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-1">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`step-${i}`} data={chunk.data || chunk} />
                    ))}
                </div>
            )}

            {isChatLoading && (
                <div className="flex items-center gap-2.5 ml-[46px]">
                    <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-full px-3.5 py-2.5 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                    </div>
                </div>
            )}

            {/* ✅ v5 */}
            {speaking && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={stopSpeaking}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                        <Square className="h-3 w-3 fill-current" />
                        Stop speaking
                    </button>
                </div>
            )}

            <div ref={scrollRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* ✅ v9: LIVE CAPTIONS
          Shown whenever captions are switched on, and always during a call —
          in a spoken conversation there is otherwise no visual record of what
          was just said, which makes the feature unusable without hearing. */}
      {(captionsOn || callActive) && (caption || listening || whisper.listening || whisper.thinking) && (
        <div className="shrink-0 border-t border-slate-200 bg-slate-900 px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <Captions className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {caption ? 'Aura' : whisper.thinking ? 'Transcribing' : 'Listening'}
            </span>
          </div>
          <p className={cn(
            'leading-relaxed text-white',
            largeText ? 'text-[18px]' : 'text-[14px]',
          )}>
            {caption
              || (safeInput && (listening || whisper.listening) ? safeInput : '')
              || (whisper.thinking ? 'Working out what you said...' : 'Speak now...')}
          </p>
        </div>
      )}

      {/* COMPOSER */}
      <footer className="p-3 sm:p-4 border-t border-slate-100 bg-white shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-blue-50/60 border border-blue-200 rounded-full p-1.5 pl-2 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all"
        >
          {/* ✅ v4: attach a receipt, supplier invoice or bank statement */}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isChatLoading || !isReady}
            aria-label="Attach a receipt or document"
            title="Attach a receipt, invoice or bank statement"
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-white/70 transition-colors disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* ✅ v6: hands-free conversation */}
          {voiceSupported.listen && voiceSupported.speak && (
            <button
              type="button"
              onClick={callActive ? endCall : startCall}
              disabled={!isReady}
              aria-label={callActive ? 'End conversation' : 'Start a spoken conversation'}
              title={callActive ? 'End conversation' : 'Talk with Aura'}
              className={cn(
                'h-9 w-9 shrink-0 flex items-center justify-center rounded-full transition-colors disabled:opacity-40',
                callActive ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-900 hover:bg-white/70',
              )}
            >
              {callActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            </button>
          )}

          {/* ✅ v5: hold a conversation instead of typing one */}
          {voiceSupported.listen && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isChatLoading || !isReady}
              aria-label={listening ? 'Stop listening' : 'Speak to Aura'}
              title={listening ? 'Stop listening' : 'Speak to Aura'}
              className={cn(
                'h-9 w-9 shrink-0 flex items-center justify-center rounded-full transition-colors disabled:opacity-40',
                (listening || whisper.listening)
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/70',
              )}
            >
              {(listening || whisper.listening) ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          <input
            ref={inputRef}
            value={safeInput}
            onChange={handleInputChange}
            placeholder={listening ? 'Listening...' : !isReady ? 'Connecting...' : 'Ask Aura anything...'}
            disabled={isChatLoading}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] sm:text-sm text-slate-900 placeholder:text-slate-400 h-9"
          />
          <button
            type="submit"
            disabled={isButtonDisabled}
            aria-label="Send message"
            className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90",
                !isButtonDisabled ? "bg-slate-900 hover:bg-black text-white shadow-md" : "bg-slate-200 text-slate-400"
            )}
          >
            {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </footer>
    </div>
  );
}