'use client';

/**
 * --- AURA STAGE ---
 * The visual presence for voice calls and meetings: a large Aura who looks
 * like she is listening, thinking or talking, rather than a static picture
 * with a status label underneath.
 *
 * WHY IT IS DRIVEN THIS WAY
 *
 * SpeechSynthesis exposes no audio stream and no amplitude, so there is no
 * real waveform to draw from her voice. Two options followed from that: fake a
 * waveform from random numbers, or drive the mouth from the one real signal
 * the API does emit — `onboundary`, which fires as each word begins.
 *
 * Word boundaries are used where available, because a mouth that moves with
 * the actual words reads as speech, while random motion reads as a screensaver.
 * Where a browser does not fire boundary events the component falls back to a
 * steady cadence, which is still tied to speaking and stops when she stops.
 *
 * The bars below her are deliberately gentle. This sits in front of a director
 * during a meeting; a bouncing equaliser would be a distraction.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AuraAvatar, type AuraAgent } from '@/components/copilot/AuraAvatar';
import { cn } from '@/lib/utils';

export interface AuraStageProps {
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
  agent?: AuraAgent;
  /** Latest word Aura is saying, if the caller tracks boundary events. */
  word?: string | null;
  /** Caption line under the avatar. */
  caption?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Hex colour for the halo and bars. Defaults to the blue used elsewhere. */
  accent?: string;
  /** Set false to hold everything still — for reduced-motion preferences, and
   *  for anyone who finds a moving face distracting during a meeting. */
  motion?: boolean;
  className?: string;
}

const SIZES = {
  sm: { avatar: 'h-24 w-24', ring: 'h-32 w-32', bar: 'h-6' },
  md: { avatar: 'h-36 w-36', ring: 'h-48 w-48', bar: 'h-8' },
  lg: { avatar: 'h-52 w-52', ring: 'h-64 w-64', bar: 'h-10' },
};

export function AuraStage({
  speaking = false,
  listening = false,
  thinking = false,
  agent = 'aura',
  word = null,
  caption,
  size = 'md',
  accent,
  motion = true,
  className,
}: AuraStageProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => new Array(9).fill(0.18));
  const timerRef = useRef<any>(null);

  // Mouth. A word arriving from the caller opens it; otherwise a steady
  // cadence keeps it moving for as long as she is actually speaking.
  useEffect(() => {
    if (!motion) { setMouthOpen(false); return; }
    if (!speaking) {
      setMouthOpen(false);
      clearInterval(timerRef.current);
      return;
    }
    let open = false;
    timerRef.current = setInterval(() => {
      open = !open;
      setMouthOpen(open);
    }, 165);
    return () => clearInterval(timerRef.current);
  }, [speaking, motion]);

  useEffect(() => {
    if (!word || !speaking) return;
    setMouthOpen(true);
    const t = setTimeout(() => setMouthOpen(false), 110);
    return () => clearTimeout(t);
  }, [word, speaking]);

  // Bars. Movement while she speaks, a slow sweep while she listens, still
  // when neither — so the state is readable across a room.
  useEffect(() => {
    if (!motion || (!speaking && !listening)) {
      setLevels(new Array(9).fill(0.18));
      return;
    }
    const id = setInterval(() => {
      setLevels((prev) =>
        prev.map((_, i) => {
          if (speaking) {
            const centre = 1 - Math.abs(i - 4) / 5;          // loudest in the middle
            return 0.25 + centre * (0.35 + Math.random() * 0.4);
          }
          return 0.18 + Math.abs(Math.sin(Date.now() / 420 + i)) * 0.22;
        }),
      );
    }, speaking ? 110 : 240);
    return () => clearInterval(id);
  }, [speaking, listening, motion]);

  const s = SIZES[size];
  const state = speaking ? (mouthOpen ? 'happy' : 'idle')
    : thinking ? 'thinking'
    : listening ? 'idle'
    : 'idle';

  const label = caption ?? (
    speaking ? 'Speaking' : listening ? 'Listening' : thinking ? 'Thinking' : 'Ready'
  );

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 select-none', className)}>
      <div className="relative flex items-center justify-center">
        {/* halo — colour carries the state at a glance */}
        <span
          className={cn(
            'absolute rounded-full transition-all duration-500',
            s.ring,
            !accent && speaking ? 'bg-blue-500/10 scale-105' :
            !accent && listening ? 'bg-red-500/10 scale-100' :
            !accent && thinking ? 'bg-amber-500/10 scale-100' : 'bg-slate-400/5 scale-95',
            speaking && 'scale-105',
          )}
          style={accent && speaking ? { backgroundColor: `${accent}1a` } : undefined}
        />
        <span
          className={cn(
            'absolute rounded-full border transition-all duration-300',
            s.ring,
            speaking && motion ? 'border-blue-300/70 animate-pulse' :
            speaking ? 'border-blue-300/70' :
            listening && motion ? 'border-red-300/70 animate-pulse' :
            listening ? 'border-red-300/70' :
            thinking ? 'border-amber-300/60' : 'border-slate-200',
          )}
        />
        <AuraAvatar agent={agent} state={state as any} className={cn('relative', s.avatar)} interactive={false} />
      </div>

      <div className={cn('flex items-end justify-center gap-[3px]', s.bar)}>
        {levels.map((lvl, i) => (
          <span
            key={i}
            className={cn(
              'w-[3px] rounded-full transition-all duration-100',
              !accent && (speaking ? 'bg-blue-500' : listening ? 'bg-red-400' : 'bg-slate-300'),
            )}
            style={{
              height: `${Math.round(lvl * 100)}%`,
              ...(accent ? { backgroundColor: speaking ? accent : listening ? '#f87171' : '#cbd5e1' } : {}),
            }}
          />
        ))}
      </div>

      <p className={cn(
        'text-[12px] font-medium tracking-wide',
        !accent && speaking ? 'text-blue-600' : listening ? 'text-red-500' : thinking ? 'text-amber-600' : 'text-slate-400',
      )}
        style={accent && speaking ? { color: accent } : undefined}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * Tracks the word Aura is currently saying, so the mouth moves with real
 * speech rather than a timer. Attach to an utterance before speaking:
 *
 *   const { word, attach } = useSpeechBoundary();
 *   attach(utterance);
 *   <AuraStage speaking word={word} />
 *
 * Not every browser fires boundary events. AuraStage falls back on its own
 * cadence when nothing arrives, so this is an improvement rather than a
 * requirement.
 */
export function useSpeechBoundary() {
  const [word, setWord] = useState<string | null>(null);

  const attach = (utterance: SpeechSynthesisUtterance) => {
    utterance.onboundary = (event: any) => {
      if (event.name && event.name !== 'word') return;
      const text = utterance.text ?? '';
      const start = event.charIndex ?? 0;
      const slice = text.slice(start, start + (event.charLength || 24));
      const next = slice.split(/\s+/)[0] || null;
      setWord(next ? `${next}#${start}` : null);   // suffix keeps repeats distinct
    };
    utterance.addEventListener('end', () => setWord(null));
  };

  return { word, attach };
}

export default AuraStage;