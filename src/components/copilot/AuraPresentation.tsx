'use client';

/**
 * --- AURA PRESENTATION ---
 * v1.0 — replaces AuraBoardroom as the surface Aura presents on.
 *
 * REBUILT RATHER THAN PATCHED
 *
 * The previous boardroom centred its content in a fixed viewport with no
 * scroll container, so a slide with six stat cards or a long narration simply
 * ran off the bottom of the screen with no way to reach it. That is not a
 * styling detail — a director cannot read half a figure. Layout here starts
 * from a scrolling body, so a slide can be any length.
 *
 * WHAT IT DOES THAT THE OLD ONE DID NOT
 *
 *   SCROLLS. Header and controls are fixed; the slide body scrolls.
 *   POINTER. A laser dot follows the cursor over the slide, and clicking
 *     leaves a marker — so a presenter can point at a number while talking,
 *     which is most of what pointing in a meeting is for.
 *   ASKS. Every slide carries a question box. A briefing where the director
 *     has to leave to ask "why is that number so high" is a slideshow, not a
 *     conversation.
 *   SPEAKS with the words. Narration is tracked with onboundary so the avatar
 *     moves in time with what is actually being said.
 *
 * Charts are drawn with plain SVG and CSS. No chart library is imported
 * because I cannot verify which ones this project has, and a missing import
 * would take the whole presentation down mid-meeting.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight, Volume2, VolumeX, Send, Loader2,
  MousePointer2, Maximize2, Minus, Sun, Moon, Mic, Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuraStage, useSpeechBoundary } from '@/components/copilot/AuraStage';

export interface PresentationSlide {
  title: string;
  content: string;
  visual_type?: 'stats_grid' | 'bar_chart' | 'pie_chart' | 'area_chart' | 'ledger_comparison';
  data_payload?: { name: string; value: number | string; trend?: string }[];
}

export interface AuraPresentationProps {
  open: boolean;
  onClose: () => void;
  title: string;
  presenter?: string;
  slides: PresentationSlide[];
  /** Sends a question to Aura without leaving the presentation. */
  onAsk?: (text: string) => void;
  /** The live conversation, so her answer appears here. */
  messages?: { id: string; role: string; content: string }[];
  thinking?: boolean;
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const asNumber = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Narration for the speech synthesiser: markdown and URLs are noise aloud. */
const forSpeech = (raw: string): string =>
  String(raw ?? '')
    .replace(/https?:\/\/\S+/g, ' a link ')
    .replace(/[*_#>`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);

export default function AuraPresentation({
  open, onClose, title, presenter = 'Aura', slides = [],
  onAsk, messages = [], thinking = false,
}: AuraPresentationProps) {
  const [index, setIndex] = useState(0);
  const [narrate, setNarrate] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [pointerOn, setPointerOn] = useState(false);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const [marks, setMarks] = useState<{ x: number; y: number; id: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [minimised, setMinimised] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ✅ v1.1
  const [light, setLight] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const handsFreeRef = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef<string>('');
  const { word, attach } = useSpeechBoundary();

  const slide = slides[index];
  const lastReply = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant'),
    [messages],
  );

  useEffect(() => { setMounted(true); }, []);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ }
    setSpeaking(false);
  }, []);

  // Narrate on arrival at a slide. Keyed on the text rather than the index so
  // re-renders do not restart the same sentence mid-word.
  useEffect(() => {
    if (!open || !narrate || !slide) return;
    const text = forSpeech(`${slide.title}. ${slide.content}`);
    if (!text || spokenRef.current === text) return;
    spokenRef.current = text;

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      attach(u);
      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        setSpeaking(false);
        // Hand the floor back. A briefing where the director has to reach for
        // the keyboard to ask a question is a slideshow, not a conversation.
        if (handsFreeRef.current) setTimeout(() => startListening(), 400);
      };
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch (e) { setSpeaking(false); }
  }, [open, narrate, slide, attach]);

  /**
   * Listens for a spoken question, sends it, and reopens the microphone once
   * she has answered. The microphone closes while she speaks — leaving it open
   * means she transcribes her own voice through the speakers and answers
   * herself.
   */
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || listening) return;

    try {
      const rec = new SR();
      rec.lang = navigator.language || 'en-US';
      rec.interimResults = false;
      rec.continuous = false;

      let heard = '';
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) heard += e.results[i][0].transcript;
        }
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        const q = heard.trim();
        if (q && onAsk) {
          onAsk(`While presenting the slide "${slides[index]?.title ?? ''}": ${q}`);
        } else if (handsFreeRef.current) {
          // Silence is a pause, not the end of the conversation.
          setTimeout(() => { if (handsFreeRef.current) startListening(); }, 700);
        }
      };

      recogRef.current = rec;
      rec.start();
      setListening(true);
    } catch (e) { setListening(false); }
  }, [listening, onAsk, slides, index]);

  const toggleHandsFree = () => {
    if (handsFreeRef.current) {
      handsFreeRef.current = false;
      try { recogRef.current?.stop(); } catch (e) { /* stopped */ }
      setListening(false);
      return;
    }
    handsFreeRef.current = true;
    if (!speaking) startListening();
  };

  // Her answer arriving is the cue to listen again.
  useEffect(() => {
    if (!handsFreeRef.current || thinking || speaking || listening) return;
    const t = setTimeout(() => {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      if (synth && (synth.speaking || synth.pending)) return;
      if (handsFreeRef.current) startListening();
    }, 1200);
    return () => clearTimeout(t);
  }, [thinking, speaking, listening, messages, startListening]);

  useEffect(() => () => {
    handsFreeRef.current = false;
    try { recogRef.current?.stop(); } catch (e) { /* gone */ }
  }, []);

  useEffect(() => { if (!narrate) stopSpeaking(); }, [narrate, stopSpeaking]);
  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  const go = useCallback((next: number) => {
    if (next < 0 || next >= slides.length) return;
    stopSpeaking();
    setMarks([]);                      // pointer marks belong to the slide they were made on
    setIndex(next);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [slides.length, stopSpeaking]);

  // Arrow keys, space and Escape — how people actually drive a presentation.
  useEffect(() => {
    if (!open || minimised) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT';
      if (typing) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, minimised, index, go, onClose]);

  const ask = () => {
    const q = question.trim();
    if (!q || !onAsk) return;
    // The slide is named so the answer lands in context rather than arriving
    // detached from whatever is on screen.
    onAsk(`While presenting the slide "${slide?.title ?? ''}": ${q}`);
    setQuestion('');
  };

  const trackPointer = (e: React.MouseEvent) => {
    if (!pointerOn || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    setDot({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const placeMark = (e: React.MouseEvent) => {
    if (!pointerOn || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    setMarks((p) => [...p.slice(-4), { x: e.clientX - r.left, y: e.clientY - r.top, id: crypto.randomUUID() }]);
  };

  if (!open || !mounted || slides.length === 0) return null;

  if (minimised) {
    return createPortal(
      <div className="pointer-events-auto fixed bottom-4 left-4 z-[9998] flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 shadow-2xl">
        <span className={cn('h-2 w-2 rounded-full', speaking ? 'bg-blue-400 animate-pulse' : 'bg-slate-500')} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-white">{title}</p>
          <p className="text-[10px] text-slate-400">Slide {index + 1} of {slides.length}</p>
        </div>
        <button type="button" onClick={() => setMinimised(false)} title="Back to the presentation"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => { stopSpeaking(); onClose(); }} title="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>,
      document.body,
    );
  }

  // Light mode exists because a projector in a bright room washes out dark
  // slides entirely, and most meeting rooms are bright.
  const T = light
    ? { shell: 'bg-white', head: 'border-slate-200', title: 'text-slate-900', sub: 'text-slate-500',
        body: 'text-slate-700', card: 'border-slate-200 bg-slate-50', label: 'text-slate-500',
        value: 'text-slate-900', track: 'bg-slate-200', icon: 'text-slate-500 hover:bg-slate-100',
        input: 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400', dot: 'bg-slate-300' }
    : { shell: 'bg-slate-950', head: 'border-white/10', title: 'text-white', sub: 'text-slate-400',
        body: 'text-slate-300', card: 'border-white/10 bg-white/5', label: 'text-slate-400',
        value: 'text-white', track: 'bg-white/10', icon: 'text-slate-400 hover:bg-white/10',
        input: 'border-white/15 bg-white/5 text-white placeholder:text-slate-600', dot: 'bg-white/20' };

  const payload = slide?.data_payload ?? [];
  const numeric = payload.map((d) => asNumber(d.value));
  const peak = Math.max(...numeric, 1);
  const total = numeric.reduce((s, n) => s + n, 0) || 1;

  return createPortal(
    <div
      ref={rootRef}
      className={cn('pointer-events-auto fixed inset-0 z-[9998] flex flex-col', T.shell)}
    >
      {/* header — fixed, never scrolls away */}
      <header className={cn('flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6', T.head)}>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[15px] font-bold', T.title)}>{title}</p>
          <p className={cn('truncate text-[11px]', T.sub)}>
            {presenter} · Slide {index + 1} of {slides.length}
          </p>
        </div>

        <button type="button" onClick={toggleHandsFree}
          title={handsFreeRef.current ? 'Stop the spoken conversation' : 'Talk to Aura while she presents'}
          className={cn('flex h-9 w-9 items-center justify-center rounded-full transition',
            listening ? 'bg-red-500 text-white animate-pulse'
              : handsFreeRef.current ? 'bg-blue-500/20 text-blue-400' : T.icon)}>
          {listening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
        </button>

        <button type="button" onClick={() => setLight((v) => !v)} title={light ? 'Dark' : 'Light'}
          className={cn('flex h-9 w-9 items-center justify-center rounded-full transition', T.icon)}>
          {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <button type="button" onClick={() => setPointerOn((p) => !p)} title="Laser pointer"
          className={cn('flex h-9 w-9 items-center justify-center rounded-full transition',
            pointerOn ? 'bg-red-500/20 text-red-300' : T.icon)}>
          <MousePointer2 className="h-4 w-4" />
        </button>

        <button type="button" onClick={() => setNarrate((n) => !n)} title={narrate ? 'Stop narrating' : 'Narrate'}
          className={cn('flex h-9 w-9 items-center justify-center rounded-full transition',
            narrate ? 'bg-blue-500/20 text-blue-300' : T.icon)}>
          {narrate ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <button type="button" onClick={() => setMinimised(true)} title="Minimise"
          className={cn('flex h-9 w-9 items-center justify-center rounded-full', T.icon)}>
          <Minus className="h-4 w-4" />
        </button>

        <button type="button" onClick={() => { handsFreeRef.current = false; stopSpeaking(); onClose(); }} title="Close"
          className={cn('flex h-9 w-9 items-center justify-center rounded-full', T.icon)}>
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* body — this is the part that scrolls */}
      <div
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-y-auto"
        onMouseMove={trackPointer}
        onClick={placeMark}
      >
        <div ref={stageRef} className="relative mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">

          {pointerOn && dot && (
            <span className="pointer-events-none absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/80 shadow-[0_0_18px_6px_rgba(239,68,68,0.45)]"
              style={{ left: dot.x, top: dot.y }} />
          )}
          {marks.map((m) => (
            <span key={m.id}
              className="pointer-events-none absolute z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-red-400"
              style={{ left: m.x, top: m.y }} />
          ))}

          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            {/* narration side */}
            <div>
              <h2 className={cn('text-3xl font-bold leading-tight sm:text-4xl', T.title)}>{slide.title}</h2>
              <p className={cn('mt-5 whitespace-pre-wrap text-[15px] leading-relaxed sm:text-[16px]', T.body)}>
                {slide.content}
              </p>

              <div className="mt-8">
                <AuraStage speaking={speaking} word={word} thinking={thinking} size="sm" caption={speaking ? 'Presenting' : 'Ready'} />
              </div>
            </div>

            {/* visual side */}
            <div className="space-y-4">
              {slide.visual_type === 'stats_grid' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {payload.map((d, i) => (
                    <div key={i} className={cn('rounded-2xl border p-5', T.card)}>
                      <p className={cn('text-[10px] font-semibold uppercase tracking-widest', T.label)}>{d.name}</p>
                      <p className={cn('mt-2 break-words text-[22px] font-bold leading-tight', T.value)}>{String(d.value)}</p>
                      {d.trend && <p className={cn('mt-1 text-[11px]', T.label)}>{d.trend}</p>}
                    </div>
                  ))}
                </div>
              )}

              {(slide.visual_type === 'bar_chart' || slide.visual_type === 'area_chart' || slide.visual_type === 'ledger_comparison') && (
                <div className={cn('space-y-3 rounded-2xl border p-5', T.card)}>
                  {payload.map((d, i) => {
                    const v = asNumber(d.value);
                    return (
                      <div key={i}>
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                          <span className={cn('min-w-0 truncate text-[12px]', T.body)}>{d.name}</span>
                          <span className={cn('shrink-0 text-[13px] font-semibold', T.value)}>{v.toLocaleString('en-US')}</span>
                        </div>
                        <div className={cn('h-2.5 overflow-hidden rounded-full', T.track)}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(2, (Math.abs(v) / Math.abs(peak)) * 100)}%`,
                              backgroundColor: v < 0 ? '#ef4444' : PALETTE[i % PALETTE.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {slide.visual_type === 'pie_chart' && (
                <div className={cn('flex flex-col items-center gap-5 rounded-2xl border p-5 sm:flex-row', T.card)}>
                  <svg viewBox="0 0 42 42" className="h-40 w-40 shrink-0 -rotate-90">
                    {(() => {
                      let offset = 0;
                      return payload.map((d, i) => {
                        const pct = (asNumber(d.value) / total) * 100;
                        const el = (
                          <circle
                            key={i}
                            cx="21" cy="21" r="15.9155"
                            fill="transparent"
                            stroke={PALETTE[i % PALETTE.length]}
                            strokeWidth="7"
                            strokeDasharray={`${pct} ${100 - pct}`}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += pct;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="min-w-0 flex-1 space-y-2">
                    {payload.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        <span className={cn('min-w-0 flex-1 truncate text-[12px]', T.body)}>{d.name}</span>
                        <span className={cn('shrink-0 text-[12px] font-semibold', T.value)}>
                          {((asNumber(d.value) / total) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* her answer, in place — leaving the presentation to read it would
              break the thread of the briefing */}
          {(thinking || lastReply) && (
            <div className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">Aura</p>
              {thinking ? (
                <p className="mt-2 flex items-center gap-2 text-[13px] text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working it out...
                </p>
              ) : (
                <p className={cn('mt-2 whitespace-pre-wrap text-[14px] leading-relaxed', T.body)}>
                  {lastReply?.content.slice(0, 1500)}
                </p>
              )}
            </div>
          )}

          <div className="h-24" />
        </div>
      </div>

      {/* controls — fixed */}
      <footer className={cn('shrink-0 border-t px-4 py-3 sm:px-6', T.head, light ? 'bg-white/95' : 'bg-slate-950/95')}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-end gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              rows={1}
              placeholder={listening ? 'Listening...' : 'Ask about this slide...'}
              className={cn('flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-[13px] outline-none focus:border-blue-400', T.input)}
            />
            <button type="button" onClick={ask} disabled={!question.trim() || thinking} aria-label="Ask"
              className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition',
                question.trim() && !thinking ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/10 text-slate-500')}>
              {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0}
              className={cn('flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[12px] font-medium transition disabled:opacity-35', T.head, T.body, light ? 'hover:bg-slate-50' : 'hover:bg-white/5')}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-1.5 px-1">
              {slides.map((_, i) => (
                <button key={i} type="button" onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
                  className={cn('h-1.5 rounded-full transition-all',
                    i === index ? 'w-6 bg-blue-500' : cn('w-1.5', T.dot))} />
              ))}
            </div>

            {index < slides.length - 1 ? (
              <button type="button" onClick={() => go(index + 1)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-blue-700">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => { stopSpeaking(); onClose(); }}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-emerald-700">
                Finish
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>,
    document.body,
  );
}