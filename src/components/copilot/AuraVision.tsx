'use client';

/**
 * --- AURA VISION ---
 * The camera. Three things a business owner can actually use it for.
 *
 *   SCAN     A receipt or invoice, straight into the document pipeline. Better
 *            than uploading, because the slip gets captured at the till rather
 *            than photographed, found again, and attached later.
 *
 *   READ     Any text in front of the camera — a meter, a delivery note, a
 *            handwritten total — transcribed and read back.
 *
 *   DESCRIBE What is in front of the camera, spoken aloud. For a director who
 *            cannot see, this is the difference between using the app and
 *            being read to by somebody else.
 *
 * SCAN goes through aura-document-intake, so the capture is stored and every
 * figure is re-checked by the same arithmetic as an upload — an expense record
 * should be auditable. READ and DESCRIBE go to aura-vision, which keeps
 * nothing: a photograph taken so somebody can be told where their keys are has
 * no business being retained.
 *
 * The rear camera is requested by default. Nobody photographs a receipt with
 * the selfie lens.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  X, Camera, ScanLine, Eye, Type, Loader2, RefreshCw, Volume2, VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const VISION_ENDPOINT = 'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-vision';
const INTAKE_ENDPOINT = 'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-document-intake';
const INTAKE_BUCKET = 'receipts';

// 1280px wide is plenty for OCR and keeps the upload small enough to work on a
// weak connection. Full sensor resolution triples the payload for no gain.
const CAPTURE_WIDTH = 1280;
const JPEG_QUALITY = 0.82;

type Mode = 'scan' | 'read' | 'describe';

export interface AuraVisionProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  userId?: string;
  /** Receives an intake result so the chat can show the usual document card. */
  onScanned?: (result: any, fileName: string) => void;
}

export default function AuraVision({ open, onClose, businessId, userId, onScanned }: AuraVisionProps) {
  const [mode, setMode] = useState<Mode>('scan');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>('');
  const [speak, setSpeak] = useState(true);
  const [mounted, setMounted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const stopCamera = useCallback(() => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) { /* already released */ }
    streamRef.current = null;
    setReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* autoplay policy; the user will tap */ });
      }
      setReady(true);
    } catch (e) {
      const err = e as Error;
      toast.error(
        err.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow it in the address bar and try again.'
          : err.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : `The camera could not be started: ${err.message}`,
      );
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (open) startCamera();
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const say = useCallback((text: string) => {
    if (!speak || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.slice(0, 1200));
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech is a convenience here, not the feature */ }
  }, [speak]);

  /** Grabs the current frame, scaled down, as a JPEG. */
  const capture = useCallback((): { blob: Promise<Blob | null>; dataUrl: string } | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const scale = Math.min(1, CAPTURE_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
      blob: new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)),
    };
  }, []);

  const runVision = async (visionMode: 'read' | 'describe') => {
    const shot = capture();
    if (!shot) { toast.error('The camera is not ready yet.'); return; }

    setBusy(true);
    setResult('');
    try {
      const res = await fetch(VISION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          mode: visionMode,
          imageBase64: shot.dataUrl,
          mimeType: 'image/jpeg',
        }),
      });
      const out = await res.json();
      if (!out?.success) throw new Error(out?.error || 'Nothing could be made out.');
      setResult(out.text);
      say(out.text);
    } catch (e) {
      const msg = (e as Error).message;
      setResult(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const runScan = async () => {
    const shot = capture();
    if (!shot) { toast.error('The camera is not ready yet.'); return; }

    setBusy(true);
    setResult('');
    try {
      const blob = await shot.blob;
      if (!blob) throw new Error('The frame could not be captured.');

      const fileName = `camera_${Date.now()}.jpg`;
      const path = `${businessId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from(INTAKE_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error(`Upload was refused: ${upErr.message}`);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(INTAKE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ action: 'extract', businessId, userId, bucket: INTAKE_BUCKET, path, documentType: 'auto' }),
      });
      const out = await res.json();

      if (!out?.success) throw new Error(out?.error || 'The document could not be read.');

      onScanned?.(out, fileName);
      const total = out?.validation?.computed?.statedTotal;
      const line = total != null
        ? `Read a ${String(out.documentType ?? 'document').replace(/_/g, ' ')} totalling ${out.validation.computed.currency} ${Number(total).toLocaleString('en-US')}.`
        : 'Document read, but no total could be made out.';
      setResult(line);
      say(line);
      toast.success('Captured');
    } catch (e) {
      const msg = (e as Error).message;
      setResult(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const go = () => (mode === 'scan' ? runScan() : runVision(mode));

  if (!open || !mounted) return null;

  const MODES: { id: Mode; label: string; icon: any; hint: string }[] = [
    { id: 'scan', label: 'Scan', icon: ScanLine, hint: 'Capture a receipt or invoice into your records' },
    { id: 'read', label: 'Read', icon: Type, hint: 'Transcribe any text in view' },
    { id: 'describe', label: 'Describe', icon: Eye, hint: 'Say what is in front of the camera, aloud' },
  ];

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[9997] flex flex-col bg-black">
      <header className="flex h-14 shrink-0 items-center gap-3 px-4">
        <Camera className="h-4 w-4 shrink-0 text-blue-400" />
        <p className="flex-1 truncate text-[13px] font-semibold text-white">Aura Vision</p>

        <button type="button" onClick={() => setSpeak((v) => !v)} title={speak ? 'Reading aloud' : 'Silent'}
          className={cn('flex h-9 w-9 items-center justify-center rounded-full transition',
            speak ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:bg-white/10')}>
          {speak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <button type="button" onClick={() => { stopCamera(); onClose(); }} aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </header>

      <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        )}

        {/* Framing guide, for scanning only — it tells the user where to put
            the document rather than decorating the screen. */}
        {ready && mode === 'scan' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="h-[62%] w-full max-w-md rounded-2xl border-2 border-dashed border-white/40" />
          </div>
        )}

        {result && (
          <div className="absolute inset-x-0 bottom-0 max-h-[45%] overflow-y-auto bg-black/85 p-4 backdrop-blur">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white">{result}</p>
          </div>
        )}
      </div>

      <footer className="shrink-0 space-y-3 bg-black px-4 py-4">
        <div className="flex justify-center gap-2">
          {MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => { setMode(m.id); setResult(''); }}
              className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition',
                mode === m.id ? 'bg-white text-slate-900' : 'bg-white/10 text-slate-300 hover:bg-white/20')}>
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-500">{MODES.find((m) => m.id === mode)?.hint}</p>

        <div className="flex items-center justify-center gap-6">
          <button type="button" onClick={() => { setResult(''); }} disabled={busy} aria-label="Clear"
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 disabled:opacity-40">
            <RefreshCw className="h-4 w-4" />
          </button>

          <button type="button" onClick={go} disabled={!ready || busy} aria-label="Capture"
            className={cn('flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/30 transition active:scale-95',
              busy ? 'bg-slate-700' : 'bg-white hover:border-white/60')}>
            {busy ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <span className="h-12 w-12 rounded-full bg-white" />}
          </button>

          <span className="h-11 w-11" />
        </div>

        {mode !== 'scan' && (
          <p className="text-center text-[10px] leading-relaxed text-slate-600">
            Nothing captured in this mode is saved.
          </p>
        )}
      </footer>
    </div>,
    document.body,
  );
}