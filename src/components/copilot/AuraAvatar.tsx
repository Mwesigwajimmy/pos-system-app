'use client';

/* ===========================================================================
   AURA AVATAR — shared component
   ===========================================================================
   Single source of truth for the animated Aura face. Previously this exact
   block was duplicated across CopilotPanel.tsx, MissionControlPage.tsx, and
   AiAuditAssistant.tsx (three copies), while GlobalCopilot.tsx used an
   older, simpler 4-state version that looked different from the others.
   Extracting it here means one place to fix bugs or change styling, and
   the trigger button now visually matches the panel.

   USAGE
     <AuraAvatar agent="aura"    className="h-11 w-11" status="online" />
     <AuraAvatar agent="auditor" className="h-14 w-14" state="thinking" />
     <AuraAvatar agent="cfo"     className="h-10 w-10" state="happy" />
     <AuraAvatar agent="analyst" className="h-16 w-16" status="syncing" />
     <AuraAvatar interactive={false} />        // disables hover-to-smile
   =========================================================================== */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type AuraState = 'idle' | 'thinking' | 'down' | 'sleeping' | 'happy' | 'wink' | 'loading';
export type AuraAgent = 'aura' | 'auditor' | 'cfo' | 'analyst';
export type AuraStatus = 'online' | 'syncing' | 'offline';

/* Each agent gets a colour and an outfit, so you can tell them apart
   at a glance the way you would cartoon characters. */
const AURA_AGENTS: Record<AuraAgent, {
    from: string; to: string; accent: string; spark: string;
    suit: 'collar' | 'bowtie' | 'necktie' | 'headset';
    suitColor: string; suitAccent: string;
}> = {
    aura:    { from: '#3b82f6', to: '#1d4ed8', accent: '#0b2a63', spark: '#93c5fd', suit: 'collar',  suitColor: '#1e3a8a', suitAccent: '#93c5fd' },
    auditor: { from: '#10b981', to: '#047857', accent: '#052e26', spark: '#6ee7b7', suit: 'bowtie',  suitColor: '#064e3b', suitAccent: '#6ee7b7' },
    cfo:     { from: '#818cf8', to: '#4338ca', accent: '#1e1b4b', spark: '#c7d2fe', suit: 'necktie', suitColor: '#312e81', suitAccent: '#c7d2fe' },
    analyst: { from: '#fbbf24', to: '#b45309', accent: '#451a03', spark: '#fde68a', suit: 'headset', suitColor: '#78350f', suitAccent: '#fde68a' },
};

const AURA_PUPIL: Record<AuraState, { x: number; y: number }> = {
    idle: { x: 0, y: 0 },
    thinking: { x: 2.5, y: -3.5 },
    down: { x: 0, y: 4 },
    sleeping: { x: 0, y: 0 },
    happy: { x: 0, y: -1 },
    wink: { x: 1.5, y: 0 },
    loading: { x: 0, y: 0 },
};

const AURA_POSE: Record<AuraState, { rotate: number; y: number }> = {
    idle: { rotate: 0, y: 0 },
    thinking: { rotate: -6, y: -2 },
    down: { rotate: 4, y: 2 },
    sleeping: { rotate: -3, y: 1 },
    happy: { rotate: -3, y: -1 },
    wink: { rotate: 4, y: 0 },
    loading: { rotate: 0, y: 0 },
};

/* Mouth paths. `happy` opens into a wide grin, which is what makes the
   hover read as an enthusiastic "yes". */
const AURA_MOUTH: Record<AuraState, string> = {
    idle:     'M 42 56 Q 50 61 58 56',
    thinking: 'M 43 57 Q 50 59 57 57',
    down:     'M 42 58 Q 50 54 58 58',
    sleeping: 'M 44 57 Q 50 59 56 57',
    happy:    'M 40 54 Q 50 66 60 54 Q 50 60 40 54',
    wink:     'M 41 55 Q 50 63 58 55',
    loading:  'M 44 57 Q 50 60 56 57',
};

const AURA_STATUS: Record<AuraStatus, string> = {
    online: '#22c55e',
    syncing: '#f59e0b',
    offline: '#ef4444',
};

export const AuraAvatar = ({
    state,
    agent = 'aura',
    status,
    className,
    interactive = true,
    animate = true,
}: {
    state?: AuraState;
    agent?: AuraAgent;
    status?: AuraStatus;
    className?: string;
    interactive?: boolean;
    animate?: boolean;
}) => {
    const [isBlinking, setIsBlinking] = React.useState(false);
    const [isWinking, setIsWinking] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);

    const skin = AURA_AGENTS[agent];

    // Hover beats the passed-in state, unless it is mid-thought.
    const base = state ?? 'idle';
    const busy = base === 'thinking' || base === 'loading';
    const active: AuraState = isWinking ? 'wink' : (isHovered && interactive && !busy) ? 'happy' : base;

    // Randomised blink so it never looks mechanical.
    React.useEffect(() => {
        if (!animate || active === 'sleeping') return;
        let t: ReturnType<typeof setTimeout>;
        const loop = () => {
            t = setTimeout(() => {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 130);
                loop();
            }, 2600 + Math.random() * 3200);
        };
        loop();
        return () => clearTimeout(t);
    }, [animate, active]);

    // Every so often it winks instead of blinking. Small touch, big
    // difference in how alive it feels.
    React.useEffect(() => {
        if (!animate || base === 'sleeping' || busy) return;
        let t: ReturnType<typeof setTimeout>;
        const loop = () => {
            t = setTimeout(() => {
                setIsWinking(true);
                setTimeout(() => setIsWinking(false), 480);
                loop();
            }, 9000 + Math.random() * 9000);
        };
        loop();
        return () => clearTimeout(t);
    }, [animate, base, busy]);

    const pupil = AURA_PUPIL[active];
    const pose = AURA_POSE[active];
    const bothClosed = active === 'sleeping' || isBlinking;
    const rightClosed = bothClosed || active === 'wink';
    const uid = React.useId().replace(/:/g, '');
    const drift = active === 'sleeping' ? 3.6 : active === 'happy' ? 1.6 : 2.8;

    const Eye = ({ cx, closed }: { cx: number; closed: boolean }) =>
        closed ? (
            <path d={`M ${cx - 10} 38 Q ${cx} 46 ${cx + 10} 38`} stroke={skin.accent} strokeWidth="4" strokeLinecap="round" fill="none" />
        ) : (
            <>
                <ellipse cx={cx} cy="38" rx="10" ry="11" fill="#fff" fillOpacity="0.96" />
                <motion.g animate={{ x: pupil.x, y: pupil.y }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                    <circle cx={cx} cy="38" r="5" fill={skin.accent} />
                    <circle cx={cx + 2} cy="35.8" r="1.6" fill="#fff" fillOpacity="0.92" />
                </motion.g>
            </>
        );

    return (
        <span
            className={cn('inline-flex shrink-0 items-center justify-center', className)}
            onMouseEnter={() => interactive && setIsHovered(true)}
            onMouseLeave={() => interactive && setIsHovered(false)}
        >
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-full w-full overflow-visible">
                <defs>
                    <linearGradient id={`af-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={skin.from} />
                        <stop offset="100%" stopColor={skin.to} />
                    </linearGradient>
                    <radialGradient id={`as-${uid}`} cx="0.35" cy="0.25" r="0.7">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id={`ash-${uid}`} cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0%" stopColor={skin.accent} stopOpacity="0.5" />
                        <stop offset="60%" stopColor={skin.accent} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={skin.accent} stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* ground shadow — outside the floating group, so it stays put */}
                <motion.ellipse
                    cx="50" cy="96" rx="25" ry="4.5" fill={`url(#ash-${uid})`}
                    animate={animate ? { rx: [25, 20, 25], opacity: [0.9, 0.55, 0.9] } : undefined}
                    transition={{ duration: drift, repeat: Infinity, ease: 'easeInOut' }}
                />

                <motion.g
                    style={{ transformOrigin: '50px 45px' }}
                    animate={animate
                        ? { rotate: pose.rotate, y: active === 'sleeping' ? [pose.y, pose.y + 1.5, pose.y] : [pose.y, pose.y - 3.5, pose.y] }
                        : { rotate: pose.rotate, y: pose.y }}
                    transition={{
                        rotate: { type: 'spring', stiffness: 200, damping: 18 },
                        y: { duration: drift, repeat: Infinity, ease: 'easeInOut' },
                    }}
                >
                    {/* ---- OUTFIT (drawn first so the head overlaps it) ---- */}
                    {skin.suit === 'headset' ? (
                        <>
                            <path d="M 20 34 Q 20 2 50 2 Q 80 2 80 34" stroke={skin.suitColor} strokeWidth="5" fill="none" strokeLinecap="round" />
                            <rect x="12" y="30" width="11" height="18" rx="5" fill={skin.suitColor} />
                            <rect x="77" y="30" width="11" height="18" rx="5" fill={skin.suitColor} />
                            <path d="M 23 44 Q 34 52 38 58" stroke={skin.suitColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                            <circle cx="38" cy="58" r="3" fill={skin.suitAccent} />
                        </>
                    ) : (
                        <>
                            {/* shoulders */}
                            <path d="M 26 92 Q 26 74 50 74 Q 74 74 74 92 Z" fill={skin.suitColor} />
                            {/* collar */}
                            <path d="M 40 74 L 50 84 L 60 74 Z" fill="#fff" fillOpacity="0.92" />
                            {skin.suit === 'necktie' && (
                                <path d="M 50 82 L 54 87 L 50 95 L 46 87 Z" fill={skin.suitAccent} />
                            )}
                            {skin.suit === 'bowtie' && (
                                <>
                                    <path d="M 50 84 L 41 79 L 41 89 Z" fill={skin.suitAccent} />
                                    <path d="M 50 84 L 59 79 L 59 89 Z" fill={skin.suitAccent} />
                                    <circle cx="50" cy="84" r="2.4" fill="#fff" fillOpacity="0.9" />
                                </>
                            )}
                        </>
                    )}

                    {/* ---- ANTENNA ---- */}
                    <line x1="50" y1="6" x2="50" y2="-1" stroke={skin.spark} strokeOpacity="0.8" strokeWidth="2.5" strokeLinecap="round" />
                    <motion.circle
                        cx="50" cy="-2" r="3.2" fill={skin.spark}
                        animate={animate ? { opacity: [0.45, 1, 0.45], r: [3, 3.8, 3] } : undefined}
                        transition={{ duration: busy ? 0.8 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* ---- HEAD ---- */}
                    <rect x="14" y="6" width="72" height="68" rx="26" fill={`url(#af-${uid})`} />
                    <rect x="14" y="6" width="72" height="68" rx="26" fill={`url(#as-${uid})`} />
                    <rect x="14" y="6" width="72" height="68" rx="26" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" />

                    {/* ---- EYES ---- */}
                    <Eye cx={36} closed={bothClosed} />
                    <Eye cx={64} closed={rightClosed} />

                    {/* ---- MOUTH ---- */}
                    <motion.path
                        animate={{ d: AURA_MOUTH[active] }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                        stroke="#fff" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        fill={active === 'happy' ? '#fff' : 'none'}
                        fillOpacity={active === 'happy' ? 0.28 : 0}
                    />

                    {/* ---- STATUS DOT, pinned to the head's corner ---- */}
                    {status && (
                        <g>
                            <circle cx="78" cy="66" r="9" fill="#fff" />
                            <circle cx="78" cy="66" r="6.2" fill={AURA_STATUS[status]} />
                            {status !== 'online' && (
                                <motion.circle
                                    cx="78" cy="66" r="6.2" fill={AURA_STATUS[status]}
                                    animate={{ r: [6.2, 11, 6.2], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                                />
                            )}
                        </g>
                    )}

                    {/* ---- THINKING DOTS ---- */}
                    <AnimatePresence>
                        {active === 'thinking' && (
                            <motion.g key="dots" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                                {[0, 1, 2].map(i => (
                                    <motion.circle
                                        key={i} cx={84 + i * 7} cy={16 - i * 5} r={2 + i * 0.5} fill={skin.spark}
                                        animate={animate ? { opacity: [0.25, 1, 0.25] } : undefined}
                                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                                    />
                                ))}
                            </motion.g>
                        )}
                    </AnimatePresence>

                    {/* ---- LOADING: a ring orbiting the antenna ---- */}
                    <AnimatePresence>
                        {active === 'loading' && (
                            <motion.g key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <motion.circle
                                    cx="50" cy="-2" r="8"
                                    fill="none" stroke={skin.spark} strokeWidth="2.5"
                                    strokeLinecap="round" strokeDasharray="14 36"
                                    animate={animate ? { rotate: 360 } : undefined}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    style={{ transformOrigin: '50px -2px' }}
                                />
                            </motion.g>
                        )}
                    </AnimatePresence>

                    {/* ---- SLEEPING Z ---- */}
                    <AnimatePresence>
                        {active === 'sleeping' && (
                            <motion.text
                                key="z" x="84" y="18" fill={skin.spark} fillOpacity="0.85"
                                fontSize="17" fontWeight="800" fontFamily="inherit"
                                initial={{ opacity: 0, y: 22 }}
                                animate={animate ? { opacity: [0, 1, 0], y: [22, 6, -2] } : { opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
                            >z</motion.text>
                        )}
                    </AnimatePresence>
                </motion.g>
            </svg>
        </span>
    );
};

export default AuraAvatar;