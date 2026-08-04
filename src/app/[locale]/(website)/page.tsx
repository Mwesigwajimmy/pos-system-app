'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    Check, ChevronDown, ChevronLeft, ChevronRight, LucideIcon, Menu, ArrowRight, X,
    Users, ShieldCheck, WifiOff, Globe, Settings, BrainCircuit, Megaphone, GitBranch,
    MessageSquareText, DownloadCloud, Layers, BookOpen, HelpCircle, Home, LayoutGrid,
    Sparkles, Warehouse, Handshake, Landmark, Briefcase, Stethoscope, ShoppingCart,
    Building2, Receipt, Package, BarChart3, Search, Plus, Minus, Printer, FileText,
    ArrowDown, Wallet, Boxes, Network, Lock, Server, FileCheck2, Building,
    Smartphone, KeyRound, LifeBuoy, Pause, Play
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NewsletterPopup from '@/components/NewsletterPopup';
import { featureSets } from '@/lib/data/features';

const COOKIE_CONSENT_NAME = 'bbu1_cookie_consent';
const COOKIE_CURRENCY_NAME = 'bbu1_currency';
const COOKIE_EXPIRY_DAYS = 365;

interface FaqItem { q: string; a: string; }
type CookieCategoryKey = 'essential' | 'analytics' | 'marketing';
interface CookieCategoryInfo { id: CookieCategoryKey; name: string; description: string; isRequired: boolean; defaultChecked: boolean; }
type CookiePreferences = { [key in CookieCategoryKey]: boolean; };

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};

const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
};

const siteConfig = {
    name: 'BBU1',
    contactInfo: {
        email: 'info@bbu1.com',
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent('Hello BBU1, I would like to see a demo for my business.')}`,
        enterpriseLink: `https://wa.me/256703572503?text=${encodeURIComponent('Hello BBU1, I would like to talk about an enterprise rollout.')}`,
    },
    faqItems: [
        { q: 'Is this for a small shop or a large company?', a: 'Both, on the same platform. A market stall runs the till and nothing else. A group with fourteen branches runs the same ledger across every site with head office consolidation, approval chains and an audit trail. You are not asked to migrate to a different product when you grow.' },
        { q: 'What happens when the internet goes down?', a: 'You keep selling. Sales and stock movements are saved on the device and upload on their own once the connection returns. Nobody has to remember to do anything.' },
        { q: 'Do I need an accountant to use it?', a: 'No. You record what you sold and what you spent. The double entry happens underneath, so your profit and loss, balance sheet and cash flow are always current. Your accountant can log in and take what they need.' },
        { q: 'Can I move my data out later?', a: 'Yes. Export any list to CSV or PDF from the screen you are looking at, and there is an API if you want to connect BBU1 to something else. The data is yours.' },
        { q: 'Is my data separate from other businesses?', a: 'Yes. Every table is protected at the database level, so a query from one business cannot return another business rows. Connections are encrypted and data is backed up daily.' },
        { q: 'Can it handle several companies under one group?', a: 'Yes. Each entity keeps its own books and its own chart of accounts, and head office sees a consolidated view across all of them. Inter company transactions are recorded on both sides.' },
        { q: 'How long does setup take?', a: 'A single shop is usually trading the same day. A multi site rollout is scoped with you, and we handle the data migration and staff training as part of it.' },
        { q: 'What support do I get?', a: 'WhatsApp, phone and email during working hours, Monday to Saturday. Enterprise accounts get a named contact, an onboarding programme and a response time agreed in writing.' },
    ] as FaqItem[],
    cookieCategories: [
        { id: 'essential', name: 'Essential', description: 'Needed for the site to work, including security and your sign in session. These cannot be switched off.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics', description: 'Tells us which pages people visit so we know what to improve. No personal information.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing', description: 'Lets us show you relevant adverts elsewhere. Off unless you turn it on.', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }
};

const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } }
};

const rowStagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const rowItem: Variants = {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } }
};

const ACCENTS: Record<string, { tile: string; text: string; ring: string; glow: string; bar: string }> = {
    blue: { tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', text: 'text-blue-600', ring: 'group-hover:border-blue-300 dark:group-hover:border-blue-500/40', glow: 'bg-blue-500', bar: 'bg-blue-600' },
    emerald: { tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', text: 'text-emerald-600', ring: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-500/40', glow: 'bg-emerald-500', bar: 'bg-emerald-600' },
    violet: { tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', text: 'text-violet-600', ring: 'group-hover:border-violet-300 dark:group-hover:border-violet-500/40', glow: 'bg-violet-500', bar: 'bg-violet-600' },
    amber: { tile: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', text: 'text-amber-600', ring: 'group-hover:border-amber-300 dark:group-hover:border-amber-500/40', glow: 'bg-amber-500', bar: 'bg-amber-500' },
    rose: { tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400', text: 'text-rose-600', ring: 'group-hover:border-rose-300 dark:group-hover:border-rose-500/40', glow: 'bg-rose-500', bar: 'bg-rose-600' },
    sky: { tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400', text: 'text-sky-600', ring: 'group-hover:border-sky-300 dark:group-hover:border-sky-500/40', glow: 'bg-sky-500', bar: 'bg-sky-600' },
    teal: { tile: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400', text: 'text-teal-600', ring: 'group-hover:border-teal-300 dark:group-hover:border-teal-500/40', glow: 'bg-teal-500', bar: 'bg-teal-600' },
    indigo: { tile: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400', text: 'text-indigo-600', ring: 'group-hover:border-indigo-300 dark:group-hover:border-indigo-500/40', glow: 'bg-indigo-500', bar: 'bg-indigo-600' },
};

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                     */
/* ------------------------------------------------------------------ */

function useLoopKey(intervalMs: number, ref: React.RefObject<HTMLElement>) {
    const inView = useInView(ref, { amount: 0.25 });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const timer = setInterval(() => setTick(t => t + 1), intervalMs);
        return () => clearInterval(timer);
    }, [inView, intervalMs]);

    return { tick, inView };
}

function useAutoAdvance(count: number, delayMs: number, ref: React.RefObject<HTMLElement>) {
    const inView = useInView(ref, { amount: 0.3 });
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const wasOut = useRef(false);

    useEffect(() => {
        if (!inView) { wasOut.current = true; return; }
        if (wasOut.current) { setPaused(false); wasOut.current = false; }
    }, [inView]);

    useEffect(() => {
        if (!inView || paused || count < 2) return;
        const timer = setInterval(() => setIndex(i => (i + 1) % count), delayMs);
        return () => clearInterval(timer);
    }, [inView, paused, count, delayMs]);

    const select = useCallback((i: number) => { setIndex(i); setPaused(true); }, []);
    const running = inView && !paused;

    return { index, setIndex, paused, setPaused, select, running };
}

function ProgressBar({ running, duration, accent = 'blue' }: { running: boolean; duration: number; accent?: string }) {
    return (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
                key={running ? 'run' : 'stop'}
                initial={{ width: '0%' }}
                animate={{ width: running ? '100%' : '0%' }}
                transition={{ duration: running ? duration / 1000 : 0, ease: 'linear', repeat: running ? Infinity : 0 }}
                className={cn('h-full rounded-full', ACCENTS[accent].bar)}
            />
        </div>
    );
}

function CountUp({ to, duration = 1.4, className, replayKey }: { to: number; duration?: number; className?: string; replayKey?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { amount: 0.5 });
    const count = useMotionValue(0);
    const rounded = useTransform(count, latest => new Intl.NumberFormat('en').format(Math.round(latest)));

    useEffect(() => {
        if (!inView) return;
        count.set(0);
        const controls = animate(count, to, { duration, ease: 'easeOut' });
        return controls.stop;
    }, [inView, to, duration, count, replayKey]);

    return <motion.span ref={ref} className={className}>{rounded}</motion.span>;
}

function AutoRail({
    items, delay = 5200, accent = 'blue', cardWidth = 320, renderItem, label,
}: {
    items: any[]; delay?: number; accent?: string; cardWidth?: number;
    renderItem: (item: any, index: number, isActive: boolean) => ReactNode; label?: string;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { index, select, paused, setPaused, running } = useAutoAdvance(items.length, delay, wrapRef);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const child = el.children[index] as HTMLElement | undefined;
        if (!child) return;
        el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
    }, [index]);

    return (
        <div ref={wrapRef} className="relative">
            <div
                ref={scrollRef}
                className="hide-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onPointerDown={() => setPaused(true)}
            >
                {items.map((item, i) => (
                    <div key={i} onClick={() => select(i)} className="shrink-0 snap-start cursor-pointer" style={{ width: cardWidth }}>
                        {renderItem(item, i, i === index)}
                    </div>
                ))}
            </div>

            <div className="mt-5 flex items-center gap-4">
                <button
                    onClick={() => setPaused(p => !p)}
                    aria-label={paused ? 'Play' : 'Pause'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                    {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </button>

                <div className="flex flex-1 items-center gap-2">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => select(i)}
                            aria-label={`${label || 'Item'} ${i + 1}`}
                            className={cn('h-1.5 rounded-full transition-all', i === index ? cn('w-8', ACCENTS[accent].bar) : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700')}
                        />
                    ))}
                    <div className="ml-2 hidden flex-1 sm:block">
                        <ProgressBar running={running} duration={delay} accent={accent} />
                    </div>
                </div>

                <div className="hidden shrink-0 gap-1.5 lg:flex">
                    <button onClick={() => select((index - 1 + items.length) % items.length)} aria-label="Previous" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => select((index + 1) % items.length)} aria-label="Next" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

const ListItem = forwardRef<ElementRef<'div'>, ComponentPropsWithoutRef<'div'> & { icon?: LucideIcon }>(
    ({ className, title, children, icon: Icon, ...props }, ref) => (
        <div ref={ref} className={cn('flex cursor-pointer select-none items-start rounded-lg p-3 leading-none outline-none transition-colors hover:bg-blue-50/70 dark:hover:bg-slate-800', className)} {...props}>
            <div className="mr-3 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100">{title}</div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
            </div>
        </div>
    )
);
ListItem.displayName = 'ListItem';

type Surface = 'light' | 'tint' | 'bright' | 'dark';

const SURFACE_CLASS: Record<Surface, string> = {
    light: 'bg-white dark:bg-slate-950',
    tint: 'bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950',
    bright: 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950',
    dark: 'bg-[#070C18] text-white',
};

function Section({ children, surface = 'light', id, className }: { children: ReactNode; surface?: Surface; id?: string; className?: string }) {
    return (
        <motion.section
            id={id}
            className={cn('relative overflow-hidden border-t py-16 sm:py-24', surface === 'dark' ? 'border-white/10' : 'border-slate-200 dark:border-slate-800', SURFACE_CLASS[surface], className)}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
        >
            <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
        </motion.section>
    );
}

function SectionHeading({ eyebrow, title, sub, dark = false, accent = 'blue' }: { eyebrow: string; title: string; sub?: string; dark?: boolean; accent?: string }) {
    const a = ACCENTS[accent];
    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-2.5">
                <motion.span animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 2.4, repeat: Infinity }} className={cn('h-1.5 w-1.5 rounded-full', a.glow)} />
                <span className={cn('text-xs font-semibold uppercase tracking-[0.16em]', dark ? 'text-slate-400' : a.text)}>{eyebrow}</span>
            </div>
            <h2 className={cn('mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-[2.1rem]', dark ? 'text-white' : 'text-slate-900 dark:text-slate-50')}>
                {title}
            </h2>
            {sub ? <p className={cn('mt-4 text-base leading-relaxed md:text-lg', dark ? 'text-slate-400' : 'text-muted-foreground')}>{sub}</p> : null}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Mockups, motion loops forever                                      */
/* ------------------------------------------------------------------ */

const APP_NAV = [
    { icon: LayoutGrid, label: 'Dashboard' },
    { icon: ShoppingCart, label: 'Sell' },
    { icon: Boxes, label: 'Stock' },
    { icon: Receipt, label: 'Accounts' },
    { icon: Users, label: 'Staff' },
    { icon: BarChart3, label: 'Reports' },
];

function AppChrome({ active, title, subtitle, children }: { active: string; title: string; subtitle?: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.05] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 px-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <div className="mx-auto hidden h-4 w-40 rounded bg-white text-center text-[9px] leading-4 text-slate-400 dark:bg-slate-800 sm:block">bbu1.com</div>
            </div>

            <div className="flex">
                <div className="hidden w-40 shrink-0 border-r border-slate-200 bg-slate-50/60 py-3 dark:border-slate-800 dark:bg-slate-900/60 sm:block">
                    {APP_NAV.map((item, i) => {
                        const Icon = item.icon;
                        const isActive = item.label === active;
                        return (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                                className={cn('mx-2 mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs', isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-500 dark:text-slate-400')}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
                            {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p> : null}
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                            <div className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] text-slate-400 dark:border-slate-800">
                                <Search className="h-3 w-3" /> Search
                            </div>
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                        </div>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

const LOOP_MS = 6500;

const SALE_LINES = [
    { name: 'Sugar 1kg', qty: 2, price: '7,000', total: '14,000' },
    { name: 'Cooking oil 3L', qty: 1, price: '22,500', total: '22,500' },
    { name: 'Rice 5kg', qty: 1, price: '18,000', total: '18,000' },
];

function PosScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const { tick } = useLoopKey(LOOP_MS, ref);

    return (
        <div ref={ref}>
            <AppChrome active="Sell" title="Counter" subtitle="Till 1, Nakawa branch">
                <div className="grid gap-4 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <motion.div key={tick} variants={rowStagger} initial="hidden" animate="visible" className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                                <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
                            </div>
                            {SALE_LINES.map((line, i) => (
                                <motion.div key={i} variants={rowItem} className={cn('grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                                    <div className="min-w-0">
                                        <p className="truncate text-slate-900 dark:text-slate-100">{line.name}</p>
                                        <p className="text-[10px] text-slate-400">{line.price} each</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-slate-400 dark:border-slate-700"><Minus className="h-2.5 w-2.5" /></span>
                                        <span className="w-4 text-center text-slate-700 dark:text-slate-200">{line.qty}</span>
                                        <span className="flex h-5 w-5 items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10"><Plus className="h-2.5 w-2.5" /></span>
                                    </div>
                                    <span className="text-right tabular-nums text-slate-900 dark:text-slate-100">{line.total}</span>
                                </motion.div>
                            ))}
                        </motion.div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {['Bread', 'Milk 500ml', 'Soap', 'Salt', 'Matches'].map((item, i) => (
                                <motion.span key={`${tick}-${item}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.06 }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                    {item}
                                </motion.span>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                            <div className="flex items-center justify-between text-xs text-slate-500"><span>Subtotal</span><span className="tabular-nums">54,500</span></div>
                            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500"><span>VAT 18%</span><span className="tabular-nums">9,810</span></div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">Total</span>
                                <span className="text-base font-semibold text-slate-900 dark:text-slate-50">
                                    <span className="text-[0.7em] text-slate-400">UGX </span>
                                    <CountUp to={64310} replayKey={tick} className="tabular-nums" />
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                                {['Cash', 'MoMo', 'Card'].map((method, i) => (
                                    <span key={method} className={cn('rounded-lg border py-2 text-center text-[11px] transition-colors', i === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400')}>
                                        {method}
                                    </span>
                                ))}
                            </div>

                            <motion.div
                                animate={{ boxShadow: ['0 0 0 0 rgba(37,99,235,0.4)', '0 0 0 10px rgba(37,99,235,0)', '0 0 0 0 rgba(37,99,235,0)'] }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-xs font-medium text-white dark:bg-blue-600"
                            >
                                <Printer className="h-3.5 w-3.5" /> Complete sale
                            </motion.div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/25 dark:bg-amber-500/10">
                            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                                <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            </motion.span>
                            <p className="text-[11px] leading-tight text-amber-800 dark:text-amber-300">Offline. 12 sales held, will upload on their own.</p>
                        </div>
                    </div>
                </div>
            </AppChrome>
        </div>
    );
}

const LEDGER_ROWS = [
    { account: '1000 Cash', debit: '64,310', credit: '' },
    { account: '4000 Sales revenue', debit: '', credit: '54,500' },
    { account: '2200 VAT payable', debit: '', credit: '9,810' },
    { account: '5000 Cost of sales', debit: '38,200', credit: '' },
    { account: '1300 Stock', debit: '', credit: '38,200' },
];

const LEDGER_TOTALS = [
    { label: 'Revenue today', value: 1284000, accent: 'blue' },
    { label: 'Cost of sales', value: 812400, accent: 'amber' },
    { label: 'Gross profit', value: 471600, accent: 'emerald' },
];

function LedgerScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const { tick } = useLoopKey(LOOP_MS, ref);

    return (
        <div ref={ref}>
            <AppChrome active="Accounts" title="Journal entry" subtitle="Posted automatically from sale INV-2841">
                <motion.div key={tick} variants={rowStagger} initial="hidden" animate="visible" className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        <span>Account</span><span className="w-20 text-right">Debit</span><span className="w-20 text-right">Credit</span>
                    </div>
                    {LEDGER_ROWS.map((row, i) => (
                        <motion.div key={i} variants={rowItem} className={cn('grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                            <span className="truncate text-slate-700 dark:text-slate-200">{row.account}</span>
                            <span className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-100">{row.debit || '\u2013'}</span>
                            <span className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-100">{row.credit || '\u2013'}</span>
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.85 }}
                        className="grid grid-cols-[1fr_auto_auto] gap-4 border-t-2 border-emerald-500 bg-emerald-50/70 px-3 py-2.5 text-xs font-semibold dark:bg-emerald-500/10"
                    >
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><Check className="h-3 w-3" />Balanced</span>
                        <span className="w-20 text-right tabular-nums text-emerald-700 dark:text-emerald-400">102,510</span>
                        <span className="w-20 text-right tabular-nums text-emerald-700 dark:text-emerald-400">102,510</span>
                    </motion.div>
                </motion.div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {LEDGER_TOTALS.map((item, i) => (
                        <motion.div key={`${tick}-${item.label}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 + i * 0.08 }} className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                            <p className={cn('mt-1 text-sm font-semibold', ACCENTS[item.accent].text)}>
                                <span className="text-[0.7em] opacity-60">UGX </span>
                                <CountUp to={item.value} replayKey={tick} className="tabular-nums" />
                            </p>
                        </motion.div>
                    ))}
                </div>
            </AppChrome>
        </div>
    );
}

const STOCK_ROWS = [
    { name: 'Sugar 1kg', sku: 'SUG-1K', a: 48, b: 12, status: 'ok' },
    { name: 'Cooking oil 3L', sku: 'OIL-3L', a: 6, b: 3, status: 'low' },
    { name: 'Rice 5kg', sku: 'RIC-5K', a: 74, b: 40, status: 'ok' },
    { name: 'Soap bar', sku: 'SOP-01', a: 0, b: 9, status: 'out' },
];

function StockScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const { tick } = useLoopKey(LOOP_MS, ref);

    return (
        <div ref={ref}>
            <AppChrome active="Stock" title="Stock on hand" subtitle="2 branches, live">
                <motion.div key={tick} variants={rowStagger} initial="hidden" animate="visible" className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        <span>Item</span><span className="w-14 text-right">Nakawa</span><span className="w-14 text-right">Ntinda</span><span className="w-16 text-right">Status</span>
                    </div>
                    {STOCK_ROWS.map((row, i) => (
                        <motion.div key={i} variants={rowItem} className={cn('grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                            <div className="min-w-0">
                                <p className="truncate text-slate-900 dark:text-slate-100">{row.name}</p>
                                <p className="font-mono text-[10px] text-slate-400">{row.sku}</p>
                            </div>
                            <span className="w-14 text-right tabular-nums text-slate-700 dark:text-slate-200"><CountUp to={row.a} duration={1} replayKey={tick} /></span>
                            <span className="w-14 text-right tabular-nums text-slate-700 dark:text-slate-200"><CountUp to={row.b} duration={1} replayKey={tick} /></span>
                            <span className="w-16 text-right">
                                <motion.span
                                    animate={row.status !== 'ok' ? { opacity: [1, 0.5, 1] } : undefined}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className={cn(
                                        'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                                        row.status === 'ok' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                                        row.status === 'low' && 'bg-amber-100 text-amber-800',
                                        row.status === 'out' && 'bg-rose-100 text-rose-700'
                                    )}
                                >
                                    {row.status === 'ok' ? 'In stock' : row.status === 'low' ? 'Low' : 'Out'}
                                </motion.span>
                            </span>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div key={`${tick}-note`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-3 flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 dark:border-violet-500/25 dark:bg-violet-500/10">
                    <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <p className="text-[11px] leading-relaxed text-violet-900 dark:text-violet-300">
                        2 items are at or below their reorder point. A draft purchase order is ready for your supplier.
                    </p>
                </motion.div>
            </AppChrome>
        </div>
    );
}

const REPORT_BARS = [30, 52, 41, 68, 74, 59, 86];

const PL_ROWS = [
    { label: 'Revenue', value: '38,420,000', strong: false, tone: '' },
    { label: 'Cost of sales', value: '(24,180,000)', strong: false, tone: '' },
    { label: 'Gross profit', value: '14,240,000', strong: true, tone: 'text-blue-600' },
    { label: 'Operating expenses', value: '(6,910,000)', strong: false, tone: '' },
    { label: 'Net profit', value: '7,330,000', strong: true, tone: 'text-emerald-600' },
];

function ReportScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const { tick } = useLoopKey(LOOP_MS, ref);

    return (
        <div ref={ref}>
            <AppChrome active="Reports" title="Income statement" subtitle="1 to 31 March, all branches">
                <div className="grid gap-4 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <motion.div key={tick} variants={rowStagger} initial="hidden" animate="visible" className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                            {PL_ROWS.map((row, i) => (
                                <motion.div key={i} variants={rowItem} className={cn('flex items-center justify-between px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800', row.strong && 'font-semibold')}>
                                    <span className={row.strong ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}>{row.label}</span>
                                    <span className={cn('tabular-nums', row.tone || 'text-slate-900 dark:text-slate-50')}>{row.value}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                        <div className="mt-2 flex gap-1.5">
                            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800"><FileText className="h-3 w-3" /> PDF</span>
                            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800"><FileText className="h-3 w-3" /> Excel</span>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Sales this week</p>
                            <div className="mt-3 flex h-24 items-end gap-1.5">
                                {REPORT_BARS.map((h, i) => (
                                    <motion.div
                                        key={`${tick}-${i}`}
                                        initial={{ height: '4%' }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease: EASE }}
                                        className={cn('flex-1 rounded-sm', i === REPORT_BARS.length - 1 ? 'bg-gradient-to-t from-blue-600 to-sky-400' : 'bg-slate-200 dark:bg-slate-800')}
                                    />
                                ))}
                            </div>
                            <div className="mt-2 flex justify-between text-[9px] text-slate-400"><span>Mon</span><span>Sun</span></div>
                        </div>

                        <motion.div key={`${tick}-aura`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-2 rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3 dark:border-violet-500/25 dark:from-violet-500/10 dark:to-transparent">
                            <div className="flex items-center gap-1.5">
                                <motion.span animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                                    <Sparkles className="h-3 w-3 text-violet-600" />
                                </motion.span>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-600">Aura</p>
                            </div>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                                Cooking oil sold 3 times faster this week than last. At current pace you run out on Thursday.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </AppChrome>
        </div>
    );
}

const RX_ROWS = [
    { drug: 'Artemether 20mg', dose: '1 tablet twice daily for 3 days', qty: 6, stock: 240 },
    { drug: 'Paracetamol 500mg', dose: '2 tablets three times daily', qty: 18, stock: 12 },
];

function ClinicScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const { tick } = useLoopKey(LOOP_MS, ref);

    return (
        <div ref={ref}>
            <AppChrome active="Sell" title="Dispensing" subtitle="Pharmacy counter">
                <motion.div key={`${tick}-alert`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-500/25 dark:bg-rose-500/10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">Allergies</p>
                    <p className="text-xs font-medium text-rose-900 dark:text-rose-300">Penicillin, sulphur</p>
                </motion.div>

                <motion.div key={tick} variants={rowStagger} initial="hidden" animate="visible" className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    {RX_ROWS.map((row, i) => (
                        <motion.div key={i} variants={rowItem} className={cn('px-3 py-2.5', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{row.drug}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">{row.dose}</p>
                                </div>
                                <span className="shrink-0 text-xs tabular-nums text-slate-700 dark:text-slate-200">x{row.qty}</span>
                            </div>
                            <p className={cn('mt-1 text-[10px]', row.stock < row.qty ? 'font-medium text-amber-700' : 'text-slate-400')}>
                                {row.stock} in stock{row.stock < row.qty ? ', not enough to dispense' : ''}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <p className="text-[11px] leading-relaxed text-slate-500">
                        Dispensing is blocked until the pharmacist confirms identity and checks the allergy list.
                    </p>
                </div>
            </AppChrome>
        </div>
    );
}

const GROUP_KPIS = [
    { label: 'Group revenue', value: 412, suffix: '.8M', accent: 'blue' },
    { label: 'Gross margin', value: 31, suffix: '.4%', accent: 'emerald' },
    { label: 'Cash position', value: 88, suffix: '.2M', accent: 'sky' },
    { label: 'Entities', value: 4, suffix: '', accent: 'violet' },
];

const GROUP_ROWS = [
    { name: 'Retail Ltd', rev: '184.2M', net: '31.0M', closed: true },
    { name: 'Distribution Ltd', rev: '142.7M', net: '18.4M', closed: true },
    { name: 'Medical Centre Ltd', rev: '61.4M', net: '9.8M', closed: false },
    { name: 'Properties Ltd', rev: '24.5M', net: '7.1M', closed: true },
];

function GroupScreen() {
    const ref = useRef<HTMLDivElement>(null);
    const { tick } = useLoopKey(LOOP_MS, ref);

    return (
        <div ref={ref}>
            <AppChrome active="Dashboard" title="Group consolidation" subtitle="4 entities, 14 branches">
                <div className="grid gap-2 sm:grid-cols-4">
                    {GROUP_KPIS.map((item, i) => (
                        <motion.div key={`${tick}-${item.label}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                            <p className={cn('mt-1 text-sm font-semibold tabular-nums', ACCENTS[item.accent].text)}>
                                <CountUp to={item.value} duration={1.2} replayKey={tick} />{item.suffix}
                            </p>
                        </motion.div>
                    ))}
                </div>

                <motion.div key={tick} variants={rowStagger} initial="hidden" animate="visible" className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        <span>Entity</span><span className="w-20 text-right">Revenue</span><span className="w-20 text-right">Net</span><span className="w-16 text-right">Books</span>
                    </div>
                    {GROUP_ROWS.map((row, i) => (
                        <motion.div key={i} variants={rowItem} className={cn('grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                            <span className="truncate text-slate-900 dark:text-slate-100">{row.name}</span>
                            <span className="w-20 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.rev}</span>
                            <span className="w-20 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.net}</span>
                            <span className="w-16 text-right">
                                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', row.closed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-amber-100 text-amber-800')}>
                                    {row.closed ? 'Closed' : 'Open'}
                                </span>
                            </span>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                    <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <p className="text-[11px] leading-relaxed text-slate-500">
                        Inter company transfers are matched on both sides and removed from the group total.
                    </p>
                </div>
            </AppChrome>
        </div>
    );
}

const PRODUCT_SCREENS = [
    { id: 'sell', label: 'Sell', accent: 'blue', title: 'Ring up a sale, the rest follows', body: 'The counter is the front door of the whole system. Scan or tap an item, take cash or mobile money, print a receipt. Everything behind it happens on its own.', points: ['Barcode scanners and receipt printers', 'Cash, mobile money, card and credit', 'Keeps working with no connection'], render: () => <PosScreen /> },
    { id: 'accounts', label: 'Accounts', accent: 'emerald', title: 'Real double entry, no accountant needed', body: 'That one sale writes five ledger lines. Cash up, revenue up, VAT set aside, stock down, cost of sales recorded. Your statements are correct before the next customer is served.', points: ['Profit and loss, balance sheet, cash flow', 'VAT and tax set aside as you sell', 'Every figure traces back to its entry'], render: () => <LedgerScreen /> },
    { id: 'stock', label: 'Stock', accent: 'violet', title: 'One stock list across every branch', body: 'Sell in Nakawa and the count changes everywhere immediately. Set a reorder point per item and the system prepares the purchase order before you notice the gap.', points: ['Multiple branches and warehouses', 'Reorder alerts and draft purchase orders', 'Batch and expiry tracking'], render: () => <StockScreen /> },
    { id: 'reports', label: 'Reports', accent: 'sky', title: 'Open it and the numbers are already there', body: 'No month end scramble. Statements build from the ledger as the day runs, and Aura points at what changed before you go looking for it.', points: ['Statements ready at any moment', 'Export to PDF or Excel', 'Aura answers questions about your own figures'], render: () => <ReportScreen /> },
    { id: 'group', label: 'Group', accent: 'indigo', title: 'Several companies, one set of books', body: 'Each entity keeps its own ledger and its own chart of accounts. Head office sees the consolidated position, with inter company transfers matched and removed.', points: ['Multi entity consolidation', 'Period close per entity', 'Approval chains and audit trail'], render: () => <GroupScreen /> },
    { id: 'clinic', label: 'Clinic', accent: 'rose', title: 'The same core, shaped for a clinic', body: 'Patients, consultations, lab requests and dispensing run on the same ledger as a shop. The screen changes. What is underneath does not.', points: ['Patient records with allergy warnings', 'Lab requests and results', 'Dispensing that checks stock and identity'], render: () => <ClinicScreen /> },
];

const SALE_FLOW = [
    { icon: ShoppingCart, accent: 'blue', title: 'You sell one bottle of cooking oil', desc: 'Cashier scans it and takes 22,500 in cash at the till.' },
    { icon: Boxes, accent: 'violet', title: 'Stock drops by one', desc: 'In that branch and at head office, at the same moment.' },
    { icon: Receipt, accent: 'emerald', title: 'Five ledger lines are written', desc: 'Cash, revenue, VAT payable, cost of sales, stock.' },
    { icon: BarChart3, accent: 'sky', title: 'Your statements move', desc: 'Profit and loss, balance sheet and cash flow all reflect it.' },
];

const REPLACES = [
    { before: 'A point of sale that does not talk to your books', after: 'Sales post straight to the ledger' },
    { before: 'A stock spreadsheet out of date by lunchtime', after: 'One live stock list across branches' },
    { before: 'Paying someone to rebuild your year from a box of receipts', after: 'Statements ready whenever you open them' },
    { before: 'Orders arriving on WhatsApp with no record', after: 'An online store tied to the same stock' },
    { before: 'Four branch managers sending four different spreadsheets', after: 'One consolidated view at head office' },
];

const HOW_IT_WORKS = [
    { step: '01', accent: 'blue', title: 'Create an account', desc: 'Email and phone number. No card needed to start.', meta: 'Takes 2 minutes' },
    { step: '02', accent: 'violet', title: 'Bring in what you have', desc: 'Import your stock list and opening balances from a spreadsheet. Our team does this with you.', meta: 'Same day' },
    { step: '03', accent: 'amber', title: 'Add your team', desc: 'Invite staff and set what each of them can see and do, down to the individual screen.', meta: 'Roles and permissions' },
    { step: '04', accent: 'emerald', title: 'Start selling', desc: 'Most shops are trading the same day. Larger rollouts run branch by branch.', meta: 'Go live' },
];

const BUILT_FOR = [
    { icon: ShoppingCart, accent: 'blue', title: 'Shops and supermarkets', desc: 'Counter sales, stock, suppliers, daily cash up.' },
    { icon: Stethoscope, accent: 'rose', title: 'Clinics and pharmacies', desc: 'Patients, lab requests, dispensing, billing.' },
    { icon: Warehouse, accent: 'violet', title: 'Wholesale and distribution', desc: 'Multi branch stock, delivery routes, credit customers.' },
    { icon: Building2, accent: 'amber', title: 'Property and rentals', desc: 'Units, tenants, rent collection, arrears.' },
    { icon: Landmark, accent: 'emerald', title: 'SACCOs and lenders', desc: 'Savings, shares, dividends, loan books.' },
    { icon: Briefcase, accent: 'sky', title: 'Services and agencies', desc: 'Jobs, quotes, invoicing, staff time.' },
];

const ENTERPRISE_POINTS = [
    { icon: Network, title: 'Multi entity and multi branch', desc: 'Each company keeps its own books. Head office gets the consolidated position with inter company entries matched.' },
    { icon: Lock, title: 'Control who does what', desc: 'Roles down to the individual screen, approval chains for spend, and period lock dates so a closed month stays closed.' },
    { icon: FileCheck2, title: 'A record that stands up', desc: 'Every posting keeps who made it and when. Nothing is edited in place, so an auditor can follow any figure back to its source.' },
    { icon: Server, title: 'Your infrastructure or ours', desc: 'Hosted by us, or deployed inside your own environment where regulation or policy requires it.' },
    { icon: Settings, title: 'Connects to what you run', desc: 'A documented API, webhooks and scheduled exports so BBU1 sits alongside your banking, payroll or reporting tools.' },
    { icon: Users, title: 'Rollout as a project', desc: 'Data migration, branch by branch go live, staff training, and a named contact through the whole thing.' },
];

const PLATFORM_POINTS = [
    { icon: WifiOff, accent: 'amber', title: 'Works offline', desc: 'Sales and stock keep working with no connection. Everything queues on the device and uploads on its own when the network returns, in the order it happened.' },
    { icon: ShieldCheck, accent: 'emerald', title: 'Separated data', desc: 'Every business is isolated at the database level, so one account cannot read another. Connections are encrypted and data is backed up daily.' },
    { icon: Globe, accent: 'sky', title: 'More than one country', desc: 'Set currency, tax rules and financial year per region. Sell in one currency, report in another, and keep the exchange difference on the books.' },
    { icon: BrainCircuit, accent: 'violet', title: 'Aura built in', desc: 'Ask about your own figures in plain language. Which branch is slowest, what is about to run out, why margin fell last month, answered from your data.' },
    { icon: Settings, accent: 'blue', title: 'Fits how you work', desc: 'Custom fields on any record, your own approval steps, your own document numbering, and an API when you need to connect something else.' },
    { icon: Users, accent: 'indigo', title: 'Grows with you', desc: 'One till or fifty, on the same account. Add branches, entities and staff without changing product or migrating data.' },
    { icon: Smartphone, accent: 'teal', title: 'Runs on what you own', desc: 'Install it on a phone, a tablet or a desktop. It behaves like an app, updates itself, and needs no app store.' },
    { icon: KeyRound, accent: 'rose', title: 'Access you control', desc: 'Roles per screen, PIN protection on the money screens, and a record of who changed what and when.' },
    { icon: LifeBuoy, accent: 'amber', title: 'Help from real people', desc: 'WhatsApp, phone and email during working hours. Larger accounts get a named contact and an onboarding programme.' },
];

type CurrencyInfo = { code: string; symbol: string; rate: number; label: string };

const CURRENCIES: Record<string, CurrencyInfo> = {
    UGX: { code: 'UGX', symbol: 'USh', rate: 3750, label: 'Uganda' },
    KES: { code: 'KES', symbol: 'KSh', rate: 130, label: 'Kenya' },
    TZS: { code: 'TZS', symbol: 'TSh', rate: 2600, label: 'Tanzania' },
    RWF: { code: 'RWF', symbol: 'RF', rate: 1350, label: 'Rwanda' },
    NGN: { code: 'NGN', symbol: '\u20A6', rate: 1650, label: 'Nigeria' },
    GHS: { code: 'GHS', symbol: 'GH\u20B5', rate: 16, label: 'Ghana' },
    ZAR: { code: 'ZAR', symbol: 'R', rate: 18, label: 'South Africa' },
    ZMW: { code: 'ZMW', symbol: 'ZK', rate: 27, label: 'Zambia' },
    USD: { code: 'USD', symbol: '$', rate: 1, label: 'United States' },
    CAD: { code: 'CAD', symbol: 'CA$', rate: 1.37, label: 'Canada' },
    GBP: { code: 'GBP', symbol: '\u00A3', rate: 0.79, label: 'United Kingdom' },
    EUR: { code: 'EUR', symbol: '\u20AC', rate: 0.92, label: 'Europe' },
    AED: { code: 'AED', symbol: 'Dh', rate: 3.67, label: 'United Arab Emirates' },
    INR: { code: 'INR', symbol: '\u20B9', rate: 83, label: 'India' },
    AUD: { code: 'AUD', symbol: 'A$', rate: 1.52, label: 'Australia' },
    CNY: { code: 'CNY', symbol: '\u00A5', rate: 7.25, label: 'China' },
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
    UG: 'UGX', KE: 'KES', TZ: 'TZS', RW: 'RWF', BI: 'UGX', SS: 'UGX',
    NG: 'NGN', GH: 'GHS', ZA: 'ZAR', ZM: 'ZMW', MW: 'ZMW', BW: 'ZAR', NA: 'ZAR',
    US: 'USD', CA: 'CAD', GB: 'GBP', IE: 'EUR',
    AE: 'AED', SA: 'AED', QA: 'AED', KW: 'AED', OM: 'AED', BH: 'AED',
    IN: 'INR', PK: 'INR', BD: 'INR', LK: 'INR',
    AU: 'AUD', NZ: 'AUD', CN: 'CNY', HK: 'CNY',
    AT: 'EUR', BE: 'EUR', HR: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR',
    DE: 'EUR', GR: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR',
    NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR',
};

const ALL_INCLUDED_MODULES = [
    { title: 'Finance and accounting', icon: Landmark, accent: 'emerald', features: ['General ledger and journals', 'Bank reconciliation', 'Tax returns', 'Payables and receivables', 'Assets and depreciation', 'Budgets and cost centres', 'Multiple currencies', 'Period lock dates', 'Chart of accounts'] },
    { title: 'Staff and payroll', icon: Users, accent: 'blue', features: ['Payroll and benefits', 'Hiring and onboarding', 'Staff directory', 'Attendance and shifts', 'Performance reviews', 'Leave', 'Exit process'] },
    { title: 'Stock and supply', icon: Warehouse, accent: 'violet', features: ['Multiple warehouses', 'Manufacturing orders', 'Bundled products', 'Purchase orders', 'Stock counts', 'Batch and serial tracking', 'Landed costs', 'Transfers and adjustments', 'Barcode scanning', 'Reorder points'] },
    { title: 'Sales and customers', icon: Handshake, accent: 'sky', features: ['Leads and pipeline', 'Campaigns', 'Support tickets', 'Full customer history', 'Price lists and discounts', 'Sales forecasting', 'Returns'] },
    { title: 'Industry modules', icon: Briefcase, accent: 'amber', features: ['SACCO savings and shares', 'Loans and credit risk', 'Agent float and SIM stock', 'Leases and property units', 'Fleet and delivery routes', 'Field jobs and dispatch', 'Grants and donors'] },
    { title: 'Clinic and pharmacy', icon: Stethoscope, accent: 'rose', features: ['Patient records', 'Consultations and triage', 'Lab requests and results', 'Prescriptions', 'Dispensing with stock control', 'Patient billing'] }
];

const PLANS = [
    { name: 'Starter', basePrice: 14, userLimit: '1 user', idealFor: 'Kiosks and market stalls', highlight: false, btnText: 'Start free trial', features: ['Point of sale', 'Stock tracking', 'Daily sales reports', 'Invoicing', 'Mobile app'] },
    { name: 'Growth', basePrice: 42, userLimit: '2 users', idealFor: 'Small shops and sole traders', highlight: false, btnText: 'Start free trial', features: ['Everything in Starter', 'Full accounting', 'Bank reconciliation', 'Tax returns', 'Enterprise reports'] },
    { name: 'Scale', basePrice: 69, userLimit: '10 users', idealFor: 'Growing businesses with staff', highlight: true, btnText: 'Start free trial', features: ['Everything in Growth', 'All industry modules', 'Staff and payroll', 'Multiple branches', 'Your own branding'] },
    { name: 'Enterprise', basePrice: 122, userLimit: 'Unlimited users', idealFor: 'Groups and multi site organisations', highlight: false, btnText: 'Talk to sales', features: ['Everything in Scale', 'Multi entity consolidation', 'API and webhooks', 'On premise option', 'Named support contact'] }
];

/* ------------------------------------------------------------------ */

function RotatingWord({ words }: { words: string[] }) {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setIndex(i => (i + 1) % words.length), 2600);
        return () => clearInterval(timer);
    }, [words.length]);

    return (
        <span className="relative inline-block align-bottom">
            <span className="invisible" aria-hidden="true">{words.reduce((a, b) => (a.length > b.length ? a : b))}</span>
            <AnimatePresence mode="wait">
                <motion.span
                    key={words[index]}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="absolute inset-0 whitespace-nowrap bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent"
                >
                    {words[index]}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState<'features' | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
    };

    const openHover = (key: 'features', e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setOpenMenu(key);
    };
    const closeHover = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        hoverTimeout.current = setTimeout(() => setOpenMenu(null), 200);
    };

    const navLinkClass = cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        scrolled ? 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
    );

    return (
        <>
            <header className={cn('fixed top-0 z-40 h-16 w-full transition-colors duration-300', scrolled ? 'border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90' : 'border-b border-transparent bg-transparent')}>
                <div className="mx-auto flex h-full max-w-7xl flex-nowrap items-center gap-2 px-4 sm:px-6">
                    <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
                        <span className={cn('transition-colors', scrolled ? 'text-slate-900 dark:text-white' : 'text-white')}>{siteConfig.name}</span>
                    </Link>

                    <nav ref={navRef} className="relative hidden flex-1 items-center gap-0.5 lg:flex">
                        <Link href="/" className={navLinkClass} aria-label="Home"><Home className="h-4 w-4" /></Link>

                        <div className="relative">
                            <button
                                onPointerEnter={(e) => openHover('features', e)}
                                onPointerLeave={closeHover}
                                onClick={() => setOpenMenu(openMenu === 'features' ? null : 'features')}
                                className={cn(navLinkClass, openMenu === 'features' && (scrolled ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-white' : 'bg-white/10 text-white'))}
                            >
                                Features
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openMenu === 'features' && 'rotate-180')} />
                            </button>

                            {openMenu === 'features' ? (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onPointerEnter={(e) => openHover('features', e)}
                                    onPointerLeave={closeHover}
                                    className="absolute left-0 top-full z-50 mt-2 w-[720px] max-w-[92vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-3 dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">What is inside</span>
                                        <Link href="/features" onClick={() => setOpenMenu(null)} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-white">
                                            All features <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto">
                                        <ul className="grid grid-cols-2 gap-1 p-3">
                                            {featureSets.map((feature: any) => (
                                                <li key={feature.slug} className="list-none">
                                                    <Link href={`/features/${feature.slug}`} onClick={() => setOpenMenu(null)}>
                                                        <ListItem title={feature.title} icon={feature.icon}>{feature.description}</ListItem>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            ) : null}
                        </div>

                        <Link href="/industries" className={navLinkClass}>Industries</Link>
                        <Link href="/aura-ai" className={navLinkClass}>Aura AI</Link>
                        <Link href="/courses" className={navLinkClass}>Academy</Link>
                        <Link href="/help-centre" className={navLinkClass}>Help</Link>
                        <Link href="/blog" className={navLinkClass}>Journal</Link>
                    </nav>

                    <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
                        {deferredPrompt ? (
                            <Button variant="outline" size="sm" onClick={handleInstallClick} className={cn('font-medium', scrolled ? 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200' : 'border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white')}>
                                <DownloadCloud className="mr-1.5 h-4 w-4" /> Install
                            </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" asChild className={cn('font-medium', scrolled ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 hover:bg-white/10 hover:text-white')}>
                            <Link href="/login">Log in</Link>
                        </Button>
                        <Button size="sm" asChild className="bg-blue-600 font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700">
                            <Link href="/signup">Get started</Link>
                        </Button>
                        <ModeToggle />
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:hidden">
                        <Button size="sm" asChild className="h-9 bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">
                            <Link href="/signup">Get started</Link>
                        </Button>
                        <button onClick={() => setIsMobileMenuOpen(v => !v)} className={cn('rounded-lg p-2 transition-colors', isMobileMenuOpen ? 'bg-slate-900 text-white' : scrolled ? 'text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10')} aria-label="Menu">
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {isMobileMenuOpen ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-x-0 bottom-0 z-[200] overflow-y-auto bg-slate-950" style={{ top: '64px' }}>
                        <div className="mx-auto w-full max-w-lg px-4 py-5">
                            <nav className="flex flex-col">
                                {[
                                    { href: '/', label: 'Home', icon: Home, accent: 'blue' },
                                    { href: '/features', label: 'Features', icon: Layers, accent: 'violet' },
                                    { href: '/industries', label: 'Industries', icon: LayoutGrid, accent: 'emerald' },
                                    { href: '/aura-ai', label: 'Aura AI', icon: Sparkles, accent: 'sky' },
                                    { href: '/download', label: 'Install the app', icon: DownloadCloud, accent: 'amber' },
                                    { href: '/courses', label: 'Academy', icon: BookOpen, accent: 'rose' },
                                    { href: '/blog', label: 'Journal', icon: BookOpen, accent: 'indigo' },
                                    { href: '/help-centre', label: 'Help', icon: HelpCircle, accent: 'teal' },
                                ].map(({ href, label, icon: Icon, accent }, i) => (
                                    <motion.div key={href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                                        <Link href={href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 border-b border-white/10 py-4 text-base font-medium text-white">
                                            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', ACCENTS[accent].tile)}>
                                                <Icon size={16} />
                                            </span>
                                            {label}
                                        </Link>
                                    </motion.div>
                                ))}
                            </nav>

                            <div className="flex flex-col gap-2.5 pb-16 pt-6">
                                <Button asChild className="h-12 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-500">
                                    <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Create an account</Link>
                                </Button>
                                <Button variant="outline" asChild className="h-12 rounded-xl border-white/20 bg-white/[0.06] text-sm font-medium text-white hover:bg-white/[0.12] hover:text-white">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a demo</a>
                                </Button>
                                <Button variant="ghost" asChild className="h-12 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white">
                                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Log in</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>
    );
};

const DynamicPricingSection = () => {
    const [currencyCode, setCurrencyCode] = useState('USD');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const modRef = useRef<HTMLDivElement>(null);
    const { index: activeModule, select: selectModule, paused: modPaused, setPaused: setModPaused, running: modRunning } = useAutoAdvance(ALL_INCLUDED_MODULES.length, 6000, modRef);
    const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;

    useEffect(() => {
        let cancelled = false;
        const saved = getCookie(COOKIE_CURRENCY_NAME);
        if (saved && CURRENCIES[saved]) { setCurrencyCode(saved); return; }

        const detect = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                let data: any = null;
                for (const url of ['https://api.country.is', 'https://ipapi.co/json/']) {
                    try {
                        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
                        if (response.ok) { data = await response.json(); break; }
                    } catch (e) { continue; }
                }
                clearTimeout(timeoutId);
                if (cancelled || !data) return;
                const country = String(data.country_code || data.country || '').toUpperCase();
                const mapped = COUNTRY_TO_CURRENCY[country];
                if (mapped && CURRENCIES[mapped]) setCurrencyCode(mapped);
            } catch (error) { /* keep default */ }
        };
        detect();
        return () => { cancelled = true; };
    }, []);

    const handleCurrencyChange = (code: string) => {
        setCurrencyCode(code);
        setCookie(COOKIE_CURRENCY_NAME, code, COOKIE_EXPIRY_DAYS);
    };

    const formatPrice = (base: number) => {
        let price = base * currency.rate;
        if (billingCycle === 'yearly') price = price * 0.8;
        if (['UGX', 'TZS', 'RWF'].includes(currency.code)) price = Math.round(price / 1000) * 1000;
        else if (['NGN', 'KES', 'INR'].includes(currency.code)) price = Math.round(price / 100) * 100;
        else price = Math.round(price);
        return new Intl.NumberFormat('en').format(price);
    };

    const activeMod = ALL_INCLUDED_MODULES[activeModule];
    const ActiveModIcon = activeMod.icon;

    return (
        <section id="pricing" className="relative overflow-hidden border-t border-slate-200 py-16 dark:border-slate-800 sm:py-24">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950" />
            <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.32, 0.2] }} transition={{ duration: 9, repeat: Infinity }} className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-blue-400 blur-3xl" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.34, 0.2] }} transition={{ duration: 11, repeat: Infinity, delay: 2 }} className="absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-violet-400 blur-3xl" />

            <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <SectionHeading eyebrow="Pricing" title="One price, every module" sub="You are not charged per module. What changes between plans is how many people can use it and how deep the features go." accent="indigo" />

                    <div className="shrink-0">
                        <label className="mb-2 block text-xs font-medium text-slate-500">Show prices in</label>
                        <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                            <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72 rounded-lg">
                                {Object.values(CURRENCIES).map((c) => (
                                    <SelectItem key={c.code} value={c.code}>{c.code}<span className="ml-2 text-xs text-slate-400">{c.label}</span></SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
                    <span className={cn('text-sm transition-colors', billingCycle === 'monthly' ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-500')}>Monthly</span>
                    <button onClick={() => setBillingCycle(prev => (prev === 'monthly' ? 'yearly' : 'monthly'))} className={cn('relative h-6 w-11 rounded-full p-0.5 transition-colors', billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')} aria-label="Toggle billing period">
                        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={cn('block h-5 w-5 rounded-full bg-white shadow', billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0')} />
                    </button>
                    <span className={cn('flex items-center gap-2 text-sm transition-colors', billingCycle === 'yearly' ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-500')}>
                        Yearly<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save 20%</span>
                    </span>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {PLANS.map((plan, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.09, duration: 0.5, ease: EASE }} whileHover={{ y: -8 }}>
                            <Card className={cn('flex h-full flex-col rounded-2xl bg-white transition-shadow dark:bg-slate-950', plan.highlight ? 'border-2 border-slate-900 shadow-2xl dark:border-white' : 'border border-slate-200 shadow-md hover:shadow-xl dark:border-slate-800')}>
                                <CardHeader className="pb-4">
                                    {plan.highlight ? (
                                        <span className="mb-2 w-fit rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">Most popular</span>
                                    ) : null}
                                    <CardTitle className="text-lg font-semibold tracking-tight">{plan.name}</CardTitle>
                                    <CardDescription className="text-sm">{plan.idealFor}</CardDescription>
                                    <div className="mt-5">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-semibold tracking-tight">{currency.symbol} {formatPrice(plan.basePrice)}</span>
                                            <span className="text-sm text-muted-foreground">/mo</span>
                                        </div>
                                        <p className="mt-1 h-4 text-xs text-muted-foreground">{billingCycle === 'yearly' ? 'Billed yearly' : ''}</p>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-grow space-y-5">
                                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                                        <Users className="h-4 w-4 text-slate-400" />{plan.userLimit}
                                    </div>
                                    <ul className="space-y-2.5">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{f}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter>
                                    <Button className={cn('h-11 w-full rounded-xl text-sm font-medium', plan.highlight ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800')} asChild>
                                        <Link href={plan.btnText === 'Talk to sales' ? '/contact' : '/signup'}>{plan.btnText}</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div ref={modRef} className="mt-14 overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">What is included on every plan</h3>
                                <p className="mt-2 text-sm text-muted-foreground">No add on fees. These rotate on their own. Tap one to hold it while you read.</p>
                            </div>
                            <button onClick={() => setModPaused(p => !p)} aria-label={modPaused ? 'Play' : 'Pause'} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700">
                                {modPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                            </button>
                        </div>

                        <div className="hide-scrollbar mt-6 flex snap-x gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                            {ALL_INCLUDED_MODULES.map((module, i) => {
                                const Icon = module.icon;
                                const a = ACCENTS[module.accent];
                                const isActive = activeModule === i;
                                return (
                                    <button
                                        key={module.title}
                                        onClick={() => selectModule(i)}
                                        className={cn(
                                            'group relative flex shrink-0 snap-start items-center gap-2.5 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all',
                                            isActive
                                                ? 'border-slate-900 bg-slate-900 text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-900'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                        )}
                                    >
                                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900' : a.tile)}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="whitespace-nowrap text-sm font-medium">{module.title}</span>
                                        {isActive && modRunning ? (
                                            <motion.span key={`mbar-${i}`} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 6, ease: 'linear' }} className="absolute bottom-0 left-0 h-0.5 bg-white/40 dark:bg-slate-900/30" />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="px-6 py-7 sm:px-8">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeMod.title} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: EASE }}>
                                <div className="flex items-center gap-3">
                                    <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', ACCENTS[activeMod.accent].tile)}>
                                        <ActiveModIcon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{activeMod.title}</p>
                                        <p className="text-xs text-slate-400">{activeMod.features.length} capabilities included</p>
                                    </div>
                                </div>

                                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {activeMod.features.map((feature, idx) => (
                                        <motion.div key={idx} variants={fadeUp} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                                            <Check className={cn('h-4 w-4 shrink-0', ACCENTS[activeMod.accent].text)} />
                                            {feature}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <p className="mt-8 text-sm text-muted-foreground">
                    Prices exclude local VAT or GST where it applies. Converted from USD at an indicative rate and charged in {currency.code}.
                    Need on premise hosting, white labelling or a group rollout?{' '}
                    <Link href="/contact" className="font-medium text-blue-700 underline underline-offset-4 dark:text-blue-400">Talk to sales</Link>.
                </p>
            </div>
        </section>
    );
};

const PartnerWithUsSection = () => {
    const [formData, setFormData] = useState({ name: '', org: '', email: '', phone: '', details: '' });
    const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

    const resetForm = () => { setFormData({ name: '', org: '', email: '', phone: '', details: '' }); setFormErrors({}); };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (formErrors[e.target.name as 'name' | 'email']) setFormErrors(prev => ({ ...prev, [e.target.name]: undefined }));
    };

    const validate = () => {
        const errors: { name?: string; email?: string } = {};
        if (!formData.name.trim()) errors.name = 'Enter your name.';
        if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Enter a valid email address.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEmailTrigger = (type: string) => {
        if (!validate()) return;
        const subject = `${type} enquiry: ${formData.name}`;
        const body = [`Name: ${formData.name}`, `Organisation: ${formData.org}`, `Email: ${formData.email}`, `Phone: ${formData.phone}`, '', 'Message:', formData.details].join('\n');
        window.open(`mailto:${siteConfig.contactInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    };

    const handleWhatsAppSubmit = () => {
        window.open(`https://wa.me/256703572503?text=${encodeURIComponent('Hello BBU1, I would like to join the affiliate programme.')}`, '_blank');
    };

    return (
        <Section id="partner" surface="light">
            <SectionHeading eyebrow="Partners" title="Work with us" sub="Two ways to earn from BBU1 without being on the payroll." accent="amber" />

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
                <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className={cn('mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110', ACCENTS.amber.tile)}>
                        <Megaphone className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">Refer businesses</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        For anyone with a network of business owners. You get a code, they sign up with it, and you are paid every month they stay.
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Recurring payment, not one off</li>
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />Materials provided</li>
                    </ul>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-6 h-11 w-full rounded-xl border-slate-200 text-sm font-medium dark:border-slate-700">
                                Join the programme <ArrowRight className="ml-2 h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[calc(100%-1.5rem)] rounded-2xl p-0 sm:max-w-lg">
                            <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800 sm:px-6">
                                <DialogTitle className="text-base font-semibold">Affiliate programme</DialogTitle>
                                <DialogDescription className="text-sm">Refer businesses to BBU1 and earn a share of what they pay, for as long as they stay.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 px-5 py-6 sm:px-6">
                                <ol className="space-y-3">
                                    {['You get a referral code.', 'A business signs up using it.', 'You are paid each month they remain a customer.'].map((line, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-50 text-xs font-semibold text-amber-700">{i + 1}</span>
                                            <span className="pt-0.5">{line}</span>
                                        </li>
                                    ))}
                                </ol>
                                <Button onClick={handleWhatsAppSubmit} className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">
                                    <MessageSquareText className="mr-2 h-4 w-4" />Message us on WhatsApp
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className={cn('mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110', ACCENTS.violet.tile)}>
                        <GitBranch className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">Build on it</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        For developers and agencies. Set BBU1 up for your clients, connect it to their other systems, or run it under your own brand.
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />API access and documentation</li>
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />Share of implementation revenue</li>
                    </ul>
                    <Dialog onOpenChange={(open) => { if (open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-6 h-11 w-full rounded-xl border-slate-200 text-sm font-medium dark:border-slate-700">
                                Get in touch <ArrowRight className="ml-2 h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
                            <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800 sm:px-6">
                                <DialogTitle className="text-base font-semibold">Build on BBU1</DialogTitle>
                                <DialogDescription className="text-sm">Implement BBU1 for your clients, build integrations, or white label it.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 px-5 py-6 sm:px-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Name <span className="text-red-600">*</span></label>
                                        <Input name="name" value={formData.name} placeholder="Full name" onChange={handleInputChange} className={cn('h-11 rounded-lg text-sm', formErrors.name && 'border-red-500')} />
                                        {formErrors.name ? <p className="text-xs text-red-600">{formErrors.name}</p> : null}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Agency or company</label>
                                        <Input name="org" value={formData.org} placeholder="Agency or company" onChange={handleInputChange} className="h-11 rounded-lg text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Email <span className="text-red-600">*</span></label>
                                        <Input type="email" name="email" value={formData.email} placeholder="you@example.com" onChange={handleInputChange} className={cn('h-11 rounded-lg text-sm', formErrors.email && 'border-red-500')} />
                                        {formErrors.email ? <p className="text-xs text-red-600">{formErrors.email}</p> : null}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Phone</label>
                                        <Input name="phone" value={formData.phone} placeholder="+256..." onChange={handleInputChange} className="h-11 rounded-lg text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-500">What you would build</label>
                                    <textarea name="details" value={formData.details} placeholder="We work with retail clients and want to..." onChange={handleInputChange} className="flex min-h-[110px] w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <Button type="button" onClick={() => handleEmailTrigger('Solution partner')} className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">
                                    Send enquiry
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </motion.div>
            </div>
        </Section>
    );
};

export default function HomePage() {
    const supabase = createClient();

    const [mounted, setMounted] = useState(false);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);

    const productRef = useRef<HTMLDivElement>(null);
    const { index: activeScreen, select: selectScreen, paused: screenPaused, setPaused: setScreenPaused, running: screenRunning } = useAutoAdvance(PRODUCT_SCREENS.length, 8000, productRef);

    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce(
        (acc, cat) => ({ ...acc, [cat.id]: cat.defaultChecked }), {} as CookiePreferences
    );
    const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(initialCookiePreferences);

    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => {
        if (typeof window === 'undefined') return;
        (window as any).__bbu1CookiePrefs = prefs;
    }, []);

    const handleAcceptAllCookies = useCallback(() => {
        const allTrue: CookiePreferences = { essential: true, analytics: true, marketing: true };
        setCookiePreferences(allTrue);
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(allTrue), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        applyCookiePreferences(allTrue);
    }, [applyCookiePreferences]);

    const handleRejectNonEssential = useCallback(() => {
        const essentialOnly: CookiePreferences = { essential: true, analytics: false, marketing: false };
        setCookiePreferences(essentialOnly);
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(essentialOnly), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        applyCookiePreferences(essentialOnly);
    }, [applyCookiePreferences]);

    const handleSaveCookiePreferences = useCallback(() => {
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(cookiePreferences), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(cookiePreferences);
    }, [cookiePreferences, applyCookiePreferences]);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        if (process.env.NODE_ENV === 'development') return;
        const trackVisitor = async () => {
            try {
                await supabase.from('system_global_telemetry').insert({
                    event_category: 'VISIT',
                    event_name: 'Landing Page Access',
                    metadata: {
                        path: window.location.pathname,
                        referrer: document.referrer || 'direct',
                        userAgent: navigator.userAgent,
                        screenResolution: `${window.screen.width}x${window.screen.height}`,
                        language: navigator.language,
                        session_id: getCookie('bbu1_session_id') || 'new_visitor'
                    }
                });
            } catch (err) { /* telemetry is best effort */ }
        };
        trackVisitor();
    }, [mounted, supabase]);

    useEffect(() => {
        const consentCookie = getCookie(COOKIE_CONSENT_NAME);
        if (!consentCookie) { setShowCookieBanner(true); return; }
        try { applyCookiePreferences(JSON.parse(consentCookie)); }
        catch (error) { setShowCookieBanner(true); }
    }, [applyCookiePreferences]);

    const screen = PRODUCT_SCREENS[activeScreen];

    return (
        <div className="flex min-h-screen flex-col">
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <NewsletterPopup />
            <MegaMenuHeader />

            <main className="flex-grow">

                {/* HERO */}
                <section id="hero" className="relative overflow-hidden bg-[#070C18] pt-16">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-5%,rgba(37,99,235,0.20)_0%,transparent_65%)]" />
                    <motion.div animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-violet-600 blur-3xl" />
                    <motion.div animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.12, 1] }} transition={{ duration: 12, repeat: Infinity, delay: 3 }} className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-sky-500 blur-3xl" />
                    <div
                        className="absolute inset-0 opacity-[0.4]"
                        style={{
                            backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)',
                            backgroundSize: '64px 64px',
                            maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 30%, transparent 75%)',
                            WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 30%, transparent 75%)',
                        }}
                    />

                    <div className="container relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20">
                        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="mx-auto max-w-3xl text-center">
                            <motion.h1 variants={fadeUp} className="text-[2rem] font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                                Sell at the counter.
                                <br />
                                Your <RotatingWord words={['books', 'stock', 'reports', 'payroll', 'tax']} /> write themselves.
                            </motion.h1>

                            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                                One system where a sale moves your stock, your ledger and your reports at the same
                                moment. From a single market stall to a group with fourteen branches.
                            </motion.p>

                            <motion.div variants={fadeUp} className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                <Button asChild size="lg" className="h-12 w-full rounded-xl bg-blue-600 px-8 text-base font-medium text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 sm:w-auto">
                                    <Link href="/signup">Start free trial</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/20 bg-white/[0.06] px-8 text-base font-medium text-white hover:bg-white/[0.12] hover:text-white sm:w-auto">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a demo</a>
                                </Button>
                            </motion.div>

                            <motion.p variants={fadeUp} className="mt-6 text-sm text-slate-500">No card needed. Set up in a day.</motion.p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.2 }} className="relative mx-auto mt-14 max-w-5xl">
                            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-2 shadow-2xl sm:p-3">
                                <PosScreen />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {[
                                    { icon: Wallet, label: 'Cash and mobile money', value: 'Taken at the till', accent: 'emerald' },
                                    { icon: Boxes, label: 'Stock', value: 'Drops in every branch', accent: 'violet' },
                                    { icon: Receipt, label: 'Ledger', value: '5 lines posted, balanced', accent: 'sky' },
                                ].map((item, i) => {
                                    const Icon = item.icon;
                                    return (
                                        <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.12 }} whileHover={{ y: -3 }} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-white/25 hover:bg-white/[0.08]">
                                            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ACCENTS[item.accent].tile)}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                                                <p className="truncate text-sm text-slate-200">{item.value}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* SALE FLOW, bright */}
                <Section id="flow" surface="bright">
                    <motion.div animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 8, repeat: Infinity }} className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-300 blur-3xl" />

                    <SectionHeading eyebrow="How it fits together" title="What happens when you sell one bottle of oil" sub="This is the whole idea. Four things move at once, and nobody types anything twice." accent="sky" />

                    <div className="mt-12 grid gap-4 lg:grid-cols-4">
                        {SALE_FLOW.map((item, i) => {
                            const Icon = item.icon;
                            const a = ACCENTS[item.accent];
                            return (
                                <motion.div key={i} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.14, duration: 0.55, ease: EASE }} className="relative">
                                    <motion.div whileHover={{ y: -6 }} className={cn('group h-full rounded-2xl border border-white bg-white p-6 shadow-md transition-all hover:shadow-xl', a.ring)}>
                                        <div className="mb-5 flex items-center justify-between">
                                            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }} className={cn('flex h-12 w-12 items-center justify-center rounded-xl', a.tile)}>
                                                <Icon className="h-5 w-5" />
                                            </motion.span>
                                            <span className={cn('text-3xl font-semibold tabular-nums opacity-20', a.text)}>{i + 1}</span>
                                        </div>
                                        <h3 className="text-sm font-semibold leading-snug tracking-tight text-slate-900">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                                        <div className={cn('mt-5 h-1 w-0 rounded-full transition-all duration-500 group-hover:w-full', a.glow)} />
                                    </motion.div>

                                    {i < SALE_FLOW.length - 1 ? (
                                        <div className="flex justify-center py-2 lg:absolute lg:-right-3 lg:top-1/2 lg:z-10 lg:-translate-y-1/2 lg:py-0">
                                            <motion.span animate={{ x: [0, 4, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm">
                                                <ArrowDown className="h-3.5 w-3.5 lg:hidden" />
                                                <ArrowRight className="hidden h-3.5 w-3.5 lg:block" />
                                            </motion.span>
                                        </div>
                                    ) : null}
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="mt-8 rounded-2xl border border-white bg-white/70 px-6 py-5 shadow-sm backdrop-blur">
                        <p className="text-sm leading-relaxed text-slate-700">
                            In most businesses those four things live in four places, and somebody spends their evening
                            making them agree. That evening is what BBU1 gives you back.
                        </p>
                    </div>
                </Section>

                {/* PRODUCT, auto advancing */}
                <Section id="product" surface="light">
                    <div ref={productRef}>
                        <SectionHeading eyebrow="Inside the system" title="Six screens, one set of numbers" sub="These move on their own. Tap one to hold it while you read." accent="blue" />

                        <div className="mt-8 flex flex-wrap items-center gap-2">
                            {PRODUCT_SCREENS.map((item, i) => {
                                const a = ACCENTS[item.accent];
                                const isActive = activeScreen === i;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => selectScreen(i)}
                                        className={cn(
                                            'relative overflow-hidden rounded-full border px-5 py-2.5 text-sm font-medium transition-all',
                                            isActive
                                                ? 'border-transparent bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                        )}
                                    >
                                        <span className="flex items-center gap-2 whitespace-nowrap">
                                            <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', isActive ? 'bg-current opacity-60' : a.glow)} />
                                            {item.label}
                                        </span>
                                        {isActive && screenRunning ? (
                                            <motion.span key={`bar-${i}-${activeScreen}`} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 8, ease: 'linear' }} className="absolute bottom-0 left-0 h-0.5 bg-white/40 dark:bg-slate-900/30" />
                                        ) : null}
                                    </button>
                                );
                            })}

                            <button onClick={() => setScreenPaused(p => !p)} aria-label={screenPaused ? 'Play' : 'Pause'} className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                                {screenPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                            </button>
                        </div>

                        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
                            <div className="lg:col-span-7">
                                <AnimatePresence mode="wait">
                                    <motion.div key={screen.id} initial={{ opacity: 0, x: 40, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40, scale: 0.98 }} transition={{ duration: 0.4, ease: EASE }}>
                                        {screen.render()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="lg:col-span-5 lg:pt-6">
                                <AnimatePresence mode="wait">
                                    <motion.div key={screen.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }}>
                                        <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', ACCENTS[screen.accent].tile)}>{screen.label}</span>
                                        <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{screen.title}</h3>
                                        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{screen.body}</p>
                                        <ul className="mt-6 space-y-3">
                                            {screen.points.map((point, i) => (
                                                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.09 }} className="flex gap-3 text-sm text-muted-foreground">
                                                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', ACCENTS[screen.accent].text)} />{point}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                </AnimatePresence>

                                <Link href="/features" className="group mt-7 inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                                    See all features <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* REPLACES */}
                <Section surface="tint">
                    <SectionHeading eyebrow="Why bother" title="What BBU1 replaces" sub="Most businesses we meet are running four systems that do not know about each other." accent="rose" />

                    <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950">
                        {REPLACES.map((row, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }} className={cn('group grid gap-3 px-5 py-5 transition-colors hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent dark:hover:from-emerald-500/5 sm:grid-cols-2 sm:gap-8 sm:px-7', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                                <p className="text-sm text-muted-foreground line-through decoration-rose-300">{row.before}</p>
                                <p className="flex items-start gap-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 transition-transform group-hover:scale-125" />{row.after}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </Section>

                {/* HOW IT WORKS */}
                <Section surface="light">
                    <SectionHeading eyebrow="Getting started" title="How it works" sub="Four steps. A single shop is usually trading the same day, and a group rollout runs branch by branch." accent="emerald" />

                    <div className="mt-12">
                        <AutoRail
                            items={HOW_IT_WORKS}
                            delay={4800}
                            accent="emerald"
                            cardWidth={320}
                            label="Step"
                            renderItem={(item, i, isActive) => {
                                const a = ACCENTS[item.accent];
                                return (
                                    <motion.div animate={{ scale: isActive ? 1 : 0.97, opacity: isActive ? 1 : 0.7 }} transition={{ duration: 0.4, ease: EASE }}>
                                        <div className={cn('h-full rounded-2xl border bg-white p-7 shadow-md transition-all dark:bg-slate-900', isActive ? 'border-slate-900 shadow-xl dark:border-white' : 'border-slate-200 dark:border-slate-800')}>
                                            <div className="flex items-center justify-between">
                                                <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold', a.tile)}>{item.step}</span>
                                                <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', a.tile)}>{item.meta}</span>
                                            </div>
                                            <h3 className="mt-6 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{item.title}</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                            <div className={cn('mt-6 h-1 rounded-full transition-all duration-500', isActive ? cn('w-full', a.glow) : 'w-0')} />
                                        </div>
                                    </motion.div>
                                );
                            }}
                        />
                    </div>
                </Section>

                {/* ENTERPRISE */}
                <Section id="enterprise" surface="dark">
                    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                        <div className="lg:col-span-5">
                            <SectionHeading eyebrow="For larger organisations" title="Small enough for a stall. Built for a group." sub="The same platform runs a single till and a holding company with several subsidiaries. You do not change product when you grow." dark />

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button asChild className="h-12 rounded-xl bg-white px-7 text-sm font-medium text-slate-900 shadow-xl hover:bg-slate-100">
                                    <a href={siteConfig.contactInfo.enterpriseLink} target="_blank" rel="noopener noreferrer">Talk to our enterprise team</a>
                                </Button>
                                <Button asChild variant="outline" className="h-12 rounded-xl border-white/20 bg-white/[0.06] px-7 text-sm font-medium text-white hover:bg-white/[0.12] hover:text-white">
                                    <Link href="/contact">Request a scoping call</Link>
                                </Button>
                            </div>

                            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-2 shadow-2xl">
                                <GroupScreen />
                            </motion.div>
                        </div>

                        <div className="lg:col-span-7">
                            <AutoRail
                                items={ENTERPRISE_POINTS}
                                delay={5200}
                                accent="blue"
                                cardWidth={320}
                                label="Capability"
                                renderItem={(item, i, isActive) => {
                                    const Icon = item.icon;
                                    return (
                                        <motion.div animate={{ scale: isActive ? 1 : 0.97, opacity: isActive ? 1 : 0.6 }} transition={{ duration: 0.4, ease: EASE }}>
                                            <div className={cn('h-full rounded-2xl border p-6 transition-colors', isActive ? 'border-blue-400/50 bg-white/[0.08]' : 'border-white/10 bg-white/[0.03]')}>
                                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-blue-300">
                                                    {Icon ? <Icon className="h-5 w-5" /> : <Building className="h-5 w-5" />}
                                                </div>
                                                <h3 className="text-sm font-semibold tracking-tight text-white">{item.title}</h3>
                                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                                            </div>
                                        </motion.div>
                                    );
                                }}
                            />
                        </div>
                    </div>
                </Section>

                {/* WHO USES IT */}
                <Section surface="tint">
                    <SectionHeading eyebrow="Who uses it" title="Built around how your trade works" sub="The core is the same. What sits on top changes with the business." accent="violet" />

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {BUILT_FOR.map((item, i) => {
                            const Icon = item.icon;
                            const a = ACCENTS[item.accent];
                            return (
                                <motion.div key={item.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }} whileHover={{ y: -6 }} className={cn('group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-950', a.ring)}>
                                    <div className={cn('absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-25', a.glow)} />
                                    <div className={cn('relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110', a.tile)}>
                                        {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                                    </div>
                                    <h3 className="relative text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{item.title}</h3>
                                    <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>

                    <Link href="/industries" className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-400">
                        See all industries <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Section>

                {/* PLATFORM */}
                <Section surface="light">
                    <SectionHeading eyebrow="The platform" title="What holds it together" sub="The parts you do not see, and the reason the rest of it can be this simple." accent="sky" />

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {PLATFORM_POINTS.map((item, i) => {
                            const Icon = item.icon;
                            const a = ACCENTS[item.accent];
                            return (
                                <motion.div key={item.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1, duration: 0.45, ease: EASE }} whileHover={{ y: -6 }} className={cn('group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900', a.ring)}>
                                    <div className={cn('absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-25', a.glow)} />
                                    <div className={cn('relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110', a.tile)}>
                                        {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                                    </div>
                                    <h3 className="relative text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{item.title}</h3>
                                    <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </Section>

                <DynamicPricingSection />

                {/* FAQ */}
                <Section surface="light">
                    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                        <div className="lg:col-span-4">
                            <SectionHeading eyebrow="Questions" title="Things people ask" accent="teal" />
                            <p className="mt-6 text-sm text-muted-foreground">
                                Not answered here?{' '}
                                <Link href="/contact" className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-400">Ask us directly</Link>.
                            </p>
                        </div>

                        <div className="lg:col-span-8">
                            <Accordion type="single" collapsible className="w-full">
                                {siteConfig.faqItems.map((faq, i) => (
                                    <AccordionItem key={i} value={`faq-${i}`} className="border-slate-200 dark:border-slate-800">
                                        <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline data-[state=open]:text-teal-700 dark:data-[state=open]:text-teal-400">
                                            {faq.q}
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                </Section>

                <PartnerWithUsSection />

                {/* FINAL CTA */}
                <section className="relative overflow-hidden border-t border-white/10 bg-[#070C18] py-20 sm:py-28">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(37,99,235,0.20)_0%,transparent_70%)]" />
                    <motion.div animate={{ opacity: [0.08, 0.18, 0.08] }} transition={{ duration: 9, repeat: Infinity }} className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-violet-600 blur-3xl" />
                    <motion.div animate={{ opacity: [0.08, 0.18, 0.08] }} transition={{ duration: 11, repeat: Infinity, delay: 2 }} className="absolute -right-32 top-0 h-80 w-80 rounded-full bg-sky-500 blur-3xl" />

                    <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                                Try it with your own numbers
                            </h2>
                            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400">
                                Start a free trial and set it up yourself, or book a call and we will load your stock
                                list and opening balances while you watch.
                            </p>

                            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                <Button asChild size="lg" className="h-12 rounded-xl bg-blue-600 px-8 text-base font-medium text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500">
                                    <Link href="/signup">Start free trial</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/20 bg-white/[0.06] px-8 text-base font-medium text-white hover:bg-white/[0.12] hover:text-white">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a demo</a>
                                </Button>
                            </div>

                            <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pt-8 sm:flex-row sm:justify-center sm:gap-8">
                                <p className="text-sm text-slate-500">Running several branches or companies?</p>
                                <Link href="/contact" className="group inline-flex items-center gap-2 text-sm font-medium text-white">
                                    Talk to the enterprise team <ArrowRight className="h-4 w-4 text-blue-400 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {mounted ? (
                <AnimatePresence>
                    {showCookieBanner ? (
                        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.25 }} className="fixed inset-x-0 bottom-0 z-[100] p-4">
                            <Card className="mx-auto max-h-[80vh] max-w-xl overflow-y-auto rounded-2xl border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base font-semibold">Cookies</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed">
                                        We use essential cookies to keep the site working. Analytics and marketing cookies are off unless you turn them on.{' '}
                                        <Link href="/privacy" className="font-medium text-blue-700 underline underline-offset-4 dark:text-blue-400">Privacy policy</Link>
                                    </CardDescription>
                                </CardHeader>

                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col gap-2 pt-0 sm:flex-row sm:justify-end">
                                        <Button variant="ghost" className="h-10 w-full rounded-lg text-sm font-medium text-muted-foreground sm:w-auto" onClick={() => setIsCustomizingCookies(true)}>Choose</Button>
                                        <Button variant="outline" className="h-10 w-full rounded-lg border-slate-200 text-sm font-medium dark:border-slate-700 sm:w-auto" onClick={handleRejectNonEssential}>Essential only</Button>
                                        <Button className="h-10 w-full rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto" onClick={handleAcceptAllCookies}>Accept all</Button>
                                    </CardFooter>
                                ) : (
                                    <CardContent className="space-y-4 pt-0">
                                        {siteConfig.cookieCategories.map(category => (
                                            <div key={category.id} className="flex items-start gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800">
                                                <Checkbox id={category.id} checked={cookiePreferences[category.id]} onCheckedChange={(v) => setCookiePreferences(prev => ({ ...prev, [category.id]: v === true }))} disabled={category.isRequired} className="mt-0.5" />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label htmlFor={category.id} className="text-sm font-medium">{category.name}</label>
                                                    <p className="text-sm leading-relaxed text-muted-foreground">{category.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                                            <Button variant="ghost" className="h-10 rounded-lg text-sm font-medium text-muted-foreground" onClick={() => setIsCustomizingCookies(false)}>Back</Button>
                                            <Button className="h-10 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700" onClick={handleSaveCookiePreferences}>Save</Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            ) : null}
        </div>
    );
}