'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
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
    Check, ChevronDown, LucideIcon, Menu, ArrowRight, X, Users, ShieldCheck,
    WifiOff, Globe, Settings, BrainCircuit, Megaphone, GitBranch, MessageSquareText,
    DownloadCloud, Layers, BookOpen, HelpCircle, Home, LayoutGrid, Sparkles,
    Warehouse, Handshake, Landmark, Briefcase, Stethoscope, ShoppingCart, Building2,
    Receipt, Package, BarChart3, Search, Plus, Minus, Printer, FileText,
    ArrowDown, Wallet, Boxes, Network, Lock, Server, FileCheck2, Building
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
        {
            q: 'Is this for a small shop or a large company?',
            a: 'Both, on the same platform. A market stall runs the till and nothing else. A group with fourteen branches runs the same ledger across every site with head office consolidation, approval chains and an audit trail. You are not asked to migrate to a different product when you grow.'
        },
        {
            q: 'What happens when the internet goes down?',
            a: 'You keep selling. Sales and stock movements are saved on the device and upload on their own once the connection returns. Nobody has to remember to do anything.'
        },
        {
            q: 'Do I need an accountant to use it?',
            a: 'No. You record what you sold and what you spent. The double entry happens underneath, so your profit and loss, balance sheet and cash flow are always current. Your accountant can log in and take what they need.'
        },
        {
            q: 'Can I move my data out later?',
            a: 'Yes. Export any list to CSV or PDF from the screen you are looking at, and there is an API if you want to connect BBU1 to something else. The data is yours.'
        },
        {
            q: 'Is my data separate from other businesses?',
            a: 'Yes. Every table is protected at the database level, so a query from one business cannot return another business rows. Connections are encrypted and data is backed up daily.'
        },
        {
            q: 'Can it handle several companies under one group?',
            a: 'Yes. Each entity keeps its own books and its own chart of accounts, and head office sees a consolidated view across all of them. Inter company transactions are recorded on both sides.'
        },
        {
            q: 'How long does setup take?',
            a: 'A single shop is usually trading the same day. A multi site rollout is scoped with you, and we handle the data migration and staff training as part of it.'
        },
        {
            q: 'What support do I get?',
            a: 'WhatsApp, phone and email during working hours, Monday to Saturday. Enterprise accounts get a named contact, an onboarding programme and a response time agreed in writing.'
        },
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

const ListItem = forwardRef<ElementRef<'div'>, ComponentPropsWithoutRef<'div'> & { icon?: LucideIcon }>(
    ({ className, title, children, icon: Icon, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                'flex cursor-pointer select-none items-start rounded-lg p-3 leading-none outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800',
                className
            )}
            {...props}
        >
            <div className="mr-3 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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

/* ------------------------------------------------------------------ */
/*  Section shell. Each section gets a surface, a number and a rule,   */
/*  so the eye can tell one apart from the next.                       */
/* ------------------------------------------------------------------ */

type Surface = 'light' | 'tint' | 'dark';

const SURFACE_CLASS: Record<Surface, string> = {
    light: 'bg-white dark:bg-slate-950',
    tint: 'bg-slate-50 dark:bg-slate-900/40',
    dark: 'bg-[#070C18] text-white',
};

function Section({
    children,
    surface = 'light',
    id,
    className,
}: {
    children: ReactNode;
    surface?: Surface;
    id?: string;
    className?: string;
}) {
    return (
        <motion.section
            id={id}
            className={cn(
                'border-t py-16 sm:py-24',
                surface === 'dark' ? 'border-white/10' : 'border-slate-200 dark:border-slate-800',
                SURFACE_CLASS[surface],
                className
            )}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
        >
            <div className="container mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
        </motion.section>
    );
}

function SectionHeading({
    index,
    eyebrow,
    title,
    sub,
    dark = false,
    center = false,
}: {
    index?: string;
    eyebrow: string;
    title: string;
    sub?: string;
    dark?: boolean;
    center?: boolean;
}) {
    return (
        <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
            <div className={cn('flex items-center gap-3', center && 'justify-center')}>
                {index ? (
                    <span className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums',
                        dark ? 'bg-white/10 text-slate-300' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    )}>
                        {index}
                    </span>
                ) : null}
                <span className={cn(
                    'text-xs font-medium uppercase tracking-[0.16em]',
                    dark ? 'text-slate-400' : 'text-slate-400'
                )}>
                    {eyebrow}
                </span>
            </div>

            <h2 className={cn(
                'mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-[2.1rem]',
                dark ? 'text-white' : 'text-slate-900 dark:text-slate-50'
            )}>
                {title}
            </h2>

            {sub ? (
                <p className={cn(
                    'mt-4 text-base leading-relaxed md:text-lg',
                    dark ? 'text-slate-400' : 'text-muted-foreground'
                )}>
                    {sub}
                </p>
            ) : null}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Product interface mock, built in code so it stays sharp.           */
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-900">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <div className="mx-auto hidden h-4 w-40 rounded bg-white text-center text-[9px] leading-4 text-slate-400 dark:bg-slate-800 sm:block">
                    bbu1.com
                </div>
            </div>

            <div className="flex">
                <div className="hidden w-40 shrink-0 border-r border-slate-200 bg-slate-50/60 py-3 dark:border-slate-800 dark:bg-slate-900/60 sm:block">
                    {APP_NAV.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.label === active;
                        return (
                            <div
                                key={item.label}
                                className={cn(
                                    'mx-2 mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs',
                                    isActive ? 'bg-slate-900 text-white dark:bg-blue-600' : 'text-slate-500 dark:text-slate-400'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </div>
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
                                <Search className="h-3 w-3" />
                                Search
                            </div>
                            <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800" />
                        </div>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

function Money({ value, currency = 'UGX' }: { value: string; currency?: string }) {
    return (
        <span className="tabular-nums">
            <span className="text-[0.75em] text-slate-400">{currency} </span>
            {value}
        </span>
    );
}

const SALE_LINES = [
    { name: 'Sugar 1kg', qty: 2, price: '7,000', total: '14,000' },
    { name: 'Cooking oil 3L', qty: 1, price: '22,500', total: '22,500' },
    { name: 'Rice 5kg', qty: 1, price: '18,000', total: '18,000' },
];

function PosScreen() {
    return (
        <AppChrome active="Sell" title="Counter" subtitle="Till 1, Nakawa branch">
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                            <span>Item</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Amount</span>
                        </div>
                        {SALE_LINES.map((line, i) => (
                            <div key={i} className={cn('grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                                <div className="min-w-0">
                                    <p className="truncate text-slate-900 dark:text-slate-100">{line.name}</p>
                                    <p className="text-[10px] text-slate-400">{line.price} each</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-slate-400 dark:border-slate-700">
                                        <Minus className="h-2.5 w-2.5" />
                                    </span>
                                    <span className="w-4 text-center text-slate-700 dark:text-slate-200">{line.qty}</span>
                                    <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-slate-400 dark:border-slate-700">
                                        <Plus className="h-2.5 w-2.5" />
                                    </span>
                                </div>
                                <span className="text-right tabular-nums text-slate-900 dark:text-slate-100">{line.total}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {['Bread', 'Milk 500ml', 'Soap', 'Salt', 'Matches'].map((item) => (
                            <span key={item} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Subtotal</span><span className="tabular-nums">54,500</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                            <span>VAT 18%</span><span className="tabular-nums">9,810</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">Total</span>
                            <span className="text-base font-semibold text-slate-900 dark:text-slate-50"><Money value="64,310" /></span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                            {['Cash', 'MoMo', 'Card'].map((method, i) => (
                                <span key={method} className={cn('rounded-lg border py-2 text-center text-[11px]', i === 0 ? 'border-slate-900 bg-slate-900 text-white dark:border-blue-600 dark:bg-blue-600' : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400')}>
                                    {method}
                                </span>
                            ))}
                        </div>

                        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-xs font-medium text-white dark:bg-blue-600">
                            <Printer className="h-3.5 w-3.5" />
                            Complete sale
                        </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                        <WifiOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p className="text-[11px] leading-tight text-slate-500">Offline. 12 sales held, will upload on their own.</p>
                    </div>
                </div>
            </div>
        </AppChrome>
    );
}

const LEDGER_ROWS = [
    { account: '1000 Cash', debit: '64,310', credit: '' },
    { account: '4000 Sales revenue', debit: '', credit: '54,500' },
    { account: '2200 VAT payable', debit: '', credit: '9,810' },
    { account: '5000 Cost of sales', debit: '38,200', credit: '' },
    { account: '1300 Stock', debit: '', credit: '38,200' },
];

function LedgerScreen() {
    return (
        <AppChrome active="Accounts" title="Journal entry" subtitle="Posted automatically from sale INV-2841">
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <span>Account</span>
                    <span className="w-20 text-right">Debit</span>
                    <span className="w-20 text-right">Credit</span>
                </div>
                {LEDGER_ROWS.map((row, i) => (
                    <div key={i} className={cn('grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                        <span className="truncate text-slate-700 dark:text-slate-200">{row.account}</span>
                        <span className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-100">{row.debit || '\u2013'}</span>
                        <span className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-100">{row.credit || '\u2013'}</span>
                    </div>
                ))}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-t-2 border-slate-900 px-3 py-2.5 text-xs font-semibold dark:border-slate-600">
                    <span className="text-slate-900 dark:text-slate-50">Balanced</span>
                    <span className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-50">102,510</span>
                    <span className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-50">102,510</span>
                </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                    { label: 'Revenue today', value: '1,284,000' },
                    { label: 'Cost of sales', value: '812,400' },
                    { label: 'Gross profit', value: '471,600' },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50"><Money value={item.value} /></p>
                    </div>
                ))}
            </div>
        </AppChrome>
    );
}

const STOCK_ROWS = [
    { name: 'Sugar 1kg', sku: 'SUG-1K', a: 48, b: 12, status: 'ok' },
    { name: 'Cooking oil 3L', sku: 'OIL-3L', a: 6, b: 3, status: 'low' },
    { name: 'Rice 5kg', sku: 'RIC-5K', a: 74, b: 40, status: 'ok' },
    { name: 'Soap bar', sku: 'SOP-01', a: 0, b: 9, status: 'out' },
];

function StockScreen() {
    return (
        <AppChrome active="Stock" title="Stock on hand" subtitle="2 branches, live">
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <span>Item</span>
                    <span className="w-14 text-right">Nakawa</span>
                    <span className="w-14 text-right">Ntinda</span>
                    <span className="w-16 text-right">Status</span>
                </div>
                {STOCK_ROWS.map((row, i) => (
                    <div key={i} className={cn('grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                        <div className="min-w-0">
                            <p className="truncate text-slate-900 dark:text-slate-100">{row.name}</p>
                            <p className="font-mono text-[10px] text-slate-400">{row.sku}</p>
                        </div>
                        <span className="w-14 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.a}</span>
                        <span className="w-14 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.b}</span>
                        <span className="w-16 text-right">
                            <span className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                row.status === 'ok' && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                                row.status === 'low' && 'bg-amber-100 text-amber-800',
                                row.status === 'out' && 'bg-red-100 text-red-700'
                            )}>
                                {row.status === 'ok' ? 'In stock' : row.status === 'low' ? 'Low' : 'Out'}
                            </span>
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-[11px] leading-relaxed text-slate-500">
                    2 items are at or below their reorder point. A draft purchase order is ready for your supplier.
                </p>
            </div>
        </AppChrome>
    );
}

const REPORT_BARS = [30, 52, 41, 68, 74, 59, 86];

function ReportScreen() {
    return (
        <AppChrome active="Reports" title="Income statement" subtitle="1 to 31 March, all branches">
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        {[
                            { label: 'Revenue', value: '38,420,000', strong: false },
                            { label: 'Cost of sales', value: '(24,180,000)', strong: false },
                            { label: 'Gross profit', value: '14,240,000', strong: true },
                            { label: 'Operating expenses', value: '(6,910,000)', strong: false },
                            { label: 'Net profit', value: '7,330,000', strong: true },
                        ].map((row, i) => (
                            <div key={i} className={cn('flex items-center justify-between px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800', row.strong && 'font-semibold')}>
                                <span className={row.strong ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}>{row.label}</span>
                                <span className="tabular-nums text-slate-900 dark:text-slate-50">{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                        <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800">
                            <FileText className="h-3 w-3" /> PDF
                        </span>
                        <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 dark:border-slate-800">
                            <FileText className="h-3 w-3" /> Excel
                        </span>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Sales this week</p>
                        <div className="mt-3 flex h-24 items-end gap-1.5">
                            {REPORT_BARS.map((h, i) => (
                                <div key={i} className={cn('flex-1 rounded-sm', i === REPORT_BARS.length - 1 ? 'bg-slate-900 dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-800')} style={{ height: `${h}%` }} />
                            ))}
                        </div>
                        <div className="mt-2 flex justify-between text-[9px] text-slate-400"><span>Mon</span><span>Sun</span></div>
                    </div>

                    <div className="mt-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-slate-400" />
                            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Aura</p>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                            Cooking oil sold 3 times faster this week than last. At current pace you run out on Thursday.
                        </p>
                    </div>
                </div>
            </div>
        </AppChrome>
    );
}

function ClinicScreen() {
    return (
        <AppChrome active="Sell" title="Dispensing" subtitle="Pharmacy counter">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">Allergies</p>
                <p className="text-xs font-medium text-red-900">Penicillin, sulphur</p>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                {[
                    { drug: 'Artemether 20mg', dose: '1 tablet twice daily for 3 days', qty: 6, stock: 240 },
                    { drug: 'Paracetamol 500mg', dose: '2 tablets three times daily', qty: 18, stock: 12 },
                ].map((row, i) => (
                    <div key={i} className={cn('px-3 py-2.5', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{row.drug}</p>
                                <p className="mt-0.5 text-[11px] text-slate-500">{row.dose}</p>
                            </div>
                            <span className="shrink-0 text-xs tabular-nums text-slate-700 dark:text-slate-200">x{row.qty}</span>
                        </div>
                        <p className={cn('mt-1 text-[10px]', row.stock < row.qty ? 'text-amber-700' : 'text-slate-400')}>
                            {row.stock} in stock{row.stock < row.qty ? ', not enough to dispense' : ''}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-[11px] leading-relaxed text-slate-500">
                    Dispensing is blocked until the pharmacist confirms identity and checks the allergy list.
                </p>
            </div>
        </AppChrome>
    );
}

function GroupScreen() {
    return (
        <AppChrome active="Dashboard" title="Group consolidation" subtitle="4 entities, 14 branches">
            <div className="grid gap-2 sm:grid-cols-4">
                {[
                    { label: 'Group revenue', value: '412.8M' },
                    { label: 'Gross margin', value: '31.4%' },
                    { label: 'Cash position', value: '88.2M' },
                    { label: 'Entities', value: '4' },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <span>Entity</span>
                    <span className="w-20 text-right">Revenue</span>
                    <span className="w-20 text-right">Net</span>
                    <span className="w-16 text-right">Books</span>
                </div>
                {[
                    { name: 'Retail Ltd', rev: '184.2M', net: '31.0M', closed: true },
                    { name: 'Distribution Ltd', rev: '142.7M', net: '18.4M', closed: true },
                    { name: 'Medical Centre Ltd', rev: '61.4M', net: '9.8M', closed: false },
                    { name: 'Properties Ltd', rev: '24.5M', net: '7.1M', closed: true },
                ].map((row, i) => (
                    <div key={i} className={cn('grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-xs', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                        <span className="truncate text-slate-900 dark:text-slate-100">{row.name}</span>
                        <span className="w-20 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.rev}</span>
                        <span className="w-20 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.net}</span>
                        <span className="w-16 text-right">
                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', row.closed ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-amber-100 text-amber-800')}>
                                {row.closed ? 'Closed' : 'Open'}
                            </span>
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-[11px] leading-relaxed text-slate-500">
                    Inter company transfers are matched on both sides and removed from the group total.
                </p>
            </div>
        </AppChrome>
    );
}

const PRODUCT_SCREENS = [
    {
        id: 'sell', label: 'Sell',
        title: 'Ring up a sale, the rest follows',
        body: 'The counter is the front door of the whole system. Scan or tap an item, take cash or mobile money, print a receipt. Everything behind it happens on its own.',
        points: ['Barcode scanners and receipt printers', 'Cash, mobile money, card and credit', 'Keeps working with no connection'],
        render: () => <PosScreen />,
    },
    {
        id: 'accounts', label: 'Accounts',
        title: 'Real double entry, no accountant needed',
        body: 'That one sale writes five ledger lines. Cash up, revenue up, VAT set aside, stock down, cost of sales recorded. Your statements are correct before the next customer is served.',
        points: ['Profit and loss, balance sheet, cash flow', 'VAT and tax set aside as you sell', 'Every figure traces back to its entry'],
        render: () => <LedgerScreen />,
    },
    {
        id: 'stock', label: 'Stock',
        title: 'One stock list across every branch',
        body: 'Sell in Nakawa and the count changes everywhere immediately. Set a reorder point per item and the system prepares the purchase order before you notice the gap.',
        points: ['Multiple branches and warehouses', 'Reorder alerts and draft purchase orders', 'Batch and expiry tracking'],
        render: () => <StockScreen />,
    },
    {
        id: 'reports', label: 'Reports',
        title: 'Open it and the numbers are already there',
        body: 'No month end scramble. Statements build from the ledger as the day runs, and Aura points at what changed before you go looking for it.',
        points: ['Statements ready at any moment', 'Export to PDF or Excel', 'Aura answers questions about your own figures'],
        render: () => <ReportScreen />,
    },
    {
        id: 'group', label: 'Group',
        title: 'Several companies, one set of books',
        body: 'Each entity keeps its own ledger and its own chart of accounts. Head office sees the consolidated position, with inter company transfers matched and removed.',
        points: ['Multi entity consolidation', 'Period close per entity', 'Approval chains and audit trail'],
        render: () => <GroupScreen />,
    },
    {
        id: 'clinic', label: 'Clinic',
        title: 'The same core, shaped for a clinic',
        body: 'Patients, consultations, lab requests and dispensing run on the same ledger as a shop. The screen changes. What is underneath does not.',
        points: ['Patient records with allergy warnings', 'Lab requests and results', 'Dispensing that checks stock and identity'],
        render: () => <ClinicScreen />,
    },
];

const SALE_FLOW = [
    { icon: ShoppingCart, title: 'You sell one bottle of cooking oil', desc: 'Cashier scans it and takes 22,500 in cash.' },
    { icon: Boxes, title: 'Stock drops by one', desc: 'In that branch and at head office, at the same moment.' },
    { icon: Receipt, title: 'Five ledger lines are written', desc: 'Cash, revenue, VAT payable, cost of sales, stock.' },
    { icon: BarChart3, title: 'Your statements move', desc: 'Profit and loss, balance sheet and cash flow all reflect it.' },
];

const REPLACES = [
    { before: 'A point of sale that does not talk to your books', after: 'Sales post straight to the ledger' },
    { before: 'A stock spreadsheet out of date by lunchtime', after: 'One live stock list across branches' },
    { before: 'Paying someone to rebuild your year from a box of receipts', after: 'Statements ready whenever you open them' },
    { before: 'Orders arriving on WhatsApp with no record', after: 'An online store tied to the same stock' },
    { before: 'Four branch managers sending four different spreadsheets', after: 'One consolidated view at head office' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Create an account', desc: 'Email and phone number. No card needed to start.', meta: 'Takes 2 minutes' },
    { step: '02', title: 'Bring in what you have', desc: 'Import your stock list and opening balances from a spreadsheet. Our team does this with you.', meta: 'Same day' },
    { step: '03', title: 'Add your team', desc: 'Invite staff and set what each of them can see and do, down to the individual screen.', meta: 'Roles and permissions' },
    { step: '04', title: 'Start selling', desc: 'Most shops are trading on the system the same day. Larger rollouts run branch by branch.', meta: 'Go live' },
];

const BUILT_FOR = [
    { icon: ShoppingCart, title: 'Shops and supermarkets', desc: 'Counter sales, stock, suppliers, daily cash up.' },
    { icon: Stethoscope, title: 'Clinics and pharmacies', desc: 'Patients, lab requests, dispensing, billing.' },
    { icon: Warehouse, title: 'Wholesale and distribution', desc: 'Multi branch stock, delivery routes, credit customers.' },
    { icon: Building2, title: 'Property and rentals', desc: 'Units, tenants, rent collection, arrears.' },
    { icon: Landmark, title: 'SACCOs and lenders', desc: 'Savings, shares, dividends, loan books.' },
    { icon: Briefcase, title: 'Services and agencies', desc: 'Jobs, quotes, invoicing, staff time.' },
];

const ENTERPRISE_POINTS = [
    { icon: Network, title: 'Multi entity and multi branch', desc: 'Each company keeps its own books. Head office gets the consolidated position with inter company entries matched.' },
    { icon: Lock, title: 'Control who does what', desc: 'Roles down to the individual screen, approval chains for spend, and period lock dates so a closed month stays closed.' },
    { icon: FileCheck2, title: 'A record that stands up', desc: 'Every posting keeps who made it and when. Nothing is edited in place, so an auditor can follow any figure back to its source.' },
    { icon: Server, title: 'Your infrastructure or ours', desc: 'Hosted by us, or deployed inside your own environment where regulation or policy requires it.' },
    { icon: Settings, title: 'Connects to what you run', desc: 'A documented API, webhooks and scheduled exports so BBU1 sits alongside your existing banking, payroll or reporting tools.' },
    { icon: Users, title: 'Rollout as a project', desc: 'Data migration, branch by branch go live, staff training, and a named contact through the whole thing.' },
];

const PLATFORM_POINTS = [
    { icon: WifiOff, title: 'Works offline', desc: 'Sales and stock keep working with no connection and sync on their own when it returns.' },
    { icon: ShieldCheck, title: 'Separated data', desc: 'Every business is isolated at the database level. Encrypted connections, daily backups.' },
    { icon: Globe, title: 'More than one country', desc: 'Multiple currencies and tax rules you set per region.' },
    { icon: BrainCircuit, title: 'Aura', desc: 'Ask about your own figures in plain language and get an answer drawn from your data.' },
    { icon: Settings, title: 'Fits how you work', desc: 'Custom fields, your own approval steps, and an API when you need to connect something.' },
    { icon: Users, title: 'Grows with you', desc: 'One till or fifty, on the same account, without changing product.' },
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
    { title: 'Finance and accounting', icon: Landmark, features: ['General ledger and journals', 'Bank reconciliation', 'Tax returns', 'Payables and receivables', 'Assets and depreciation', 'Budgets and cost centres', 'Multiple currencies', 'Period lock dates', 'Chart of accounts'] },
    { title: 'Staff and payroll', icon: Users, features: ['Payroll and benefits', 'Hiring and onboarding', 'Staff directory', 'Attendance and shifts', 'Performance reviews', 'Leave', 'Exit process'] },
    { title: 'Stock and supply', icon: Warehouse, features: ['Multiple warehouses', 'Manufacturing orders', 'Bundled products', 'Purchase orders', 'Stock counts', 'Batch and serial tracking', 'Landed costs', 'Transfers and adjustments', 'Barcode scanning', 'Reorder points'] },
    { title: 'Sales and customers', icon: Handshake, features: ['Leads and pipeline', 'Campaigns', 'Support tickets', 'Full customer history', 'Price lists and discounts', 'Sales forecasting', 'Returns'] },
    { title: 'Industry modules', icon: Briefcase, features: ['SACCO savings and shares', 'Loans and credit risk', 'Agent float and SIM stock', 'Leases and property units', 'Fleet and delivery routes', 'Field jobs and dispatch', 'Grants and donors'] },
    { title: 'Clinic and pharmacy', icon: Stethoscope, features: ['Patient records', 'Consultations and triage', 'Lab requests and results', 'Prescriptions', 'Dispensing with stock control', 'Patient billing'] }
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
            <span className="invisible" aria-hidden="true">
                {words.reduce((a, b) => (a.length > b.length ? a : b))}
            </span>
            <AnimatePresence mode="wait">
                <motion.span
                    key={words[index]}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="absolute inset-0 whitespace-nowrap text-blue-400"
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
        scrolled
            ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'
    );

    return (
        <>
            <header className={cn(
                'fixed top-0 z-40 h-16 w-full transition-colors duration-300',
                scrolled
                    ? 'border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95'
                    : 'border-b border-transparent bg-transparent'
            )}>
                <div className="mx-auto flex h-full max-w-7xl flex-nowrap items-center gap-2 px-4 sm:px-6">
                    <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
                        <span className={cn('transition-colors', scrolled ? 'text-slate-900 dark:text-white' : 'text-white')}>
                            {siteConfig.name}
                        </span>
                    </Link>

                    <nav ref={navRef} className="relative hidden flex-1 items-center gap-0.5 lg:flex">
                        <Link href="/" className={navLinkClass} aria-label="Home"><Home className="h-4 w-4" /></Link>

                        <div className="relative">
                            <button
                                onPointerEnter={(e) => openHover('features', e)}
                                onPointerLeave={closeHover}
                                onClick={() => setOpenMenu(openMenu === 'features' ? null : 'features')}
                                className={cn(navLinkClass, openMenu === 'features' && (scrolled ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'bg-white/10 text-white'))}
                            >
                                Features
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openMenu === 'features' && 'rotate-180')} />
                            </button>

                            {openMenu === 'features' ? (
                                <div
                                    onPointerEnter={(e) => openHover('features', e)}
                                    onPointerLeave={closeHover}
                                    className="absolute left-0 top-full z-50 mt-2 w-[720px] max-w-[92vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                                        <span className="text-xs font-medium text-slate-500">What is inside</span>
                                        <Link href="/features" onClick={() => setOpenMenu(null)} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
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
                                </div>
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
                        <Button size="sm" asChild className="bg-blue-600 font-medium text-white hover:bg-blue-700">
                            <Link href="/signup">Get started</Link>
                        </Button>
                        <ModeToggle />
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:hidden">
                        <Button size="sm" asChild className="h-9 bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">
                            <Link href="/signup">Get started</Link>
                        </Button>
                        <button
                            onClick={() => setIsMobileMenuOpen(v => !v)}
                            className={cn('rounded-lg p-2 transition-colors', isMobileMenuOpen ? 'bg-slate-900 text-white' : scrolled ? 'text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800' : 'text-white hover:bg-white/10')}
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {isMobileMenuOpen ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-x-0 bottom-0 z-[200] overflow-y-auto bg-slate-950"
                        style={{ top: '64px' }}
                    >
                        <div className="mx-auto w-full max-w-lg px-4 py-5">
                            <nav className="flex flex-col">
                                {[
                                    { href: '/', label: 'Home', icon: Home },
                                    { href: '/features', label: 'Features', icon: Layers },
                                    { href: '/industries', label: 'Industries', icon: LayoutGrid },
                                    { href: '/aura-ai', label: 'Aura AI', icon: Sparkles },
                                    { href: '/download', label: 'Install the app', icon: DownloadCloud },
                                    { href: '/courses', label: 'Academy', icon: BookOpen },
                                    { href: '/blog', label: 'Journal', icon: BookOpen },
                                    { href: '/help-centre', label: 'Help', icon: HelpCircle },
                                ].map(({ href, label, icon: Icon }) => (
                                    <Link key={href} href={href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 border-b border-white/10 py-4 text-base font-medium text-white">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                                            <Icon size={16} className="text-slate-300" />
                                        </span>
                                        {label}
                                    </Link>
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
            } catch (error) {
                // keep the default
            }
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

    return (
        <section id="pricing" className="border-t border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-24">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <SectionHeading
                        index="06"
                        eyebrow="Pricing"
                        title="One price, every module"
                        sub="You are not charged per module. What changes between plans is how many people can use it and how deep the features go."
                    />

                    <div className="shrink-0">
                        <label className="mb-2 block text-xs font-medium text-slate-500">Show prices in</label>
                        <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                            <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900 lg:w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72 rounded-lg">
                                {Object.values(CURRENCIES).map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.code}
                                        <span className="ml-2 text-xs text-slate-400">{c.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                    <span className={cn('text-sm transition-colors', billingCycle === 'monthly' ? 'font-medium text-foreground' : 'text-muted-foreground')}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(prev => (prev === 'monthly' ? 'yearly' : 'monthly'))}
                        className={cn('relative h-6 w-11 rounded-full p-0.5 transition-colors', billingCycle === 'yearly' ? 'bg-slate-900 dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')}
                        aria-label="Toggle billing period"
                    >
                        <span className={cn('block h-5 w-5 rounded-full bg-white transition-transform', billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0')} />
                    </button>
                    <span className={cn('flex items-center gap-2 text-sm transition-colors', billingCycle === 'yearly' ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        Yearly
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Save 20%</span>
                    </span>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {PLANS.map((plan, index) => (
                        <Card key={index} className={cn('flex h-full flex-col rounded-2xl shadow-none transition-colors', plan.highlight ? 'border-2 border-slate-900 dark:border-blue-600' : 'border border-slate-200 hover:border-slate-300 dark:border-slate-800')}>
                            <CardHeader className="pb-4">
                                {plan.highlight ? (
                                    <span className="mb-2 w-fit rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-blue-600">Most popular</span>
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
                                    <Users className="h-4 w-4 text-slate-400" />
                                    {plan.userLimit}
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
                                <Button className={cn('h-11 w-full rounded-xl text-sm font-medium', plan.highlight ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800')} asChild>
                                    <Link href={plan.btnText === 'Talk to sales' ? '/contact' : '/signup'}>{plan.btnText}</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">What is included on every plan</h3>
                    <p className="mt-2 text-sm text-muted-foreground">No add on fees. If a module applies to your business, it is already there.</p>

                    <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {ALL_INCLUDED_MODULES.map((module) => {
                            const Icon = module.icon;
                            return (
                                <div key={module.title}>
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                                        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
                                        <h4 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">{module.title}</h4>
                                    </div>
                                    <ul className="mt-3 space-y-1.5">
                                        {module.features.map((feature, idx) => (
                                            <li key={idx} className="text-sm text-muted-foreground">{feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <p className="mt-8 text-sm text-muted-foreground">
                    Prices exclude local VAT or GST where it applies. Converted from USD at an indicative rate and
                    charged in {currency.code}. Need on premise hosting, white labelling or a group rollout?{' '}
                    <Link href="/contact" className="font-medium text-slate-900 underline underline-offset-4 dark:text-white">Talk to sales</Link>.
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
        if (formErrors[e.target.name as 'name' | 'email']) {
            setFormErrors(prev => ({ ...prev, [e.target.name]: undefined }));
        }
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
            <SectionHeading index="08" eyebrow="Partners" title="Work with us" sub="Two ways to earn from BBU1 without being on the payroll." />

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Megaphone className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">Refer businesses</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        For anyone with a network of business owners. You get a code, they sign up with it, and you are paid every month they stay.
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />Recurring payment, not one off</li>
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />Materials provided</li>
                    </ul>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-6 h-11 w-full rounded-xl border-slate-200 text-sm font-medium dark:border-slate-700">
                                Join the programme <ArrowRight className="ml-2 h-4 w-4 text-slate-400" />
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
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{i + 1}</span>
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
                </div>

                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <GitBranch className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">Build on it</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        For developers and agencies. Set BBU1 up for your clients, connect it to their other systems, or run it under your own brand.
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />API access and documentation</li>
                        <li className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />Share of implementation revenue</li>
                    </ul>
                    <Dialog onOpenChange={(open) => { if (open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-6 h-11 w-full rounded-xl border-slate-200 text-sm font-medium dark:border-slate-700">
                                Get in touch <ArrowRight className="ml-2 h-4 w-4 text-slate-400" />
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
                                    <textarea
                                        name="details"
                                        value={formData.details}
                                        placeholder="We work with retail clients and want to..."
                                        onChange={handleInputChange}
                                        className="flex min-h-[110px] w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                                <Button type="button" onClick={() => handleEmailTrigger('Solution partner')} className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">
                                    Send enquiry
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </Section>
    );
};

export default function HomePage() {
    const supabase = createClient();

    const [mounted, setMounted] = useState(false);
    const [activeScreen, setActiveScreen] = useState(0);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);

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
            } catch (err) {
                // telemetry is best effort
            }
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
            <NewsletterPopup />
            <MegaMenuHeader />

            <main className="flex-grow">

                {/* HERO */}
                <section id="hero" className="relative overflow-hidden bg-[#070C18] pt-16">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-5%,rgba(37,99,235,0.13)_0%,transparent_65%)]" />
                    <div
                        className="absolute inset-0 opacity-[0.35]"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.05) 1px, transparent 1px)',
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
                                <Button asChild size="lg" className="h-12 w-full rounded-xl bg-blue-600 px-8 text-base font-medium text-white hover:bg-blue-500 sm:w-auto">
                                    <Link href="/signup">Start free trial</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/20 bg-white/[0.06] px-8 text-base font-medium text-white hover:bg-white/[0.12] hover:text-white sm:w-auto">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a demo</a>
                                </Button>
                            </motion.div>

                            <motion.p variants={fadeUp} className="mt-6 text-sm text-slate-500">
                                No card needed. Set up in a day.
                            </motion.p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
                            className="relative mx-auto mt-14 max-w-5xl"
                        >
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:p-3">
                                <PosScreen />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {[
                                    { icon: Wallet, label: 'Cash and mobile money', value: 'Taken at the till' },
                                    { icon: Boxes, label: 'Stock', value: 'Drops in every branch' },
                                    { icon: Receipt, label: 'Ledger', value: '5 lines posted, balanced' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                                                <p className="truncate text-sm text-slate-200">{item.value}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* 01 SALE FLOW, dark so it reads as a distinct panel */}
                <Section id="flow" surface="dark">
                    <SectionHeading
                        index="01"
                        eyebrow="How it fits together"
                        title="What happens when you sell one bottle of oil"
                        sub="This is the whole idea. Four things move at once, and nobody types anything twice."
                        dark
                    />

                    <div className="mt-12 grid gap-4 lg:grid-cols-4">
                        {SALE_FLOW.map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <div key={i} className="relative">
                                    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20">
                                        <div className="mb-5 flex items-center justify-between">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-slate-200">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="text-2xl font-semibold tabular-nums text-white/10">{i + 1}</span>
                                        </div>
                                        <h3 className="text-sm font-semibold leading-snug tracking-tight text-white">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                                    </div>

                                    {i < SALE_FLOW.length - 1 ? (
                                        <div className="flex justify-center py-2 lg:absolute lg:-right-3 lg:top-1/2 lg:z-10 lg:-translate-y-1/2 lg:py-0">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#070C18] text-slate-500">
                                                <ArrowDown className="h-3 w-3 lg:hidden" />
                                                <ArrowRight className="hidden h-3 w-3 lg:block" />
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5">
                        <p className="text-sm leading-relaxed text-slate-400">
                            In most businesses those four things live in four places, and somebody spends their evening
                            making them agree. That evening is what BBU1 gives you back.
                        </p>
                    </div>
                </Section>

                {/* 02 PRODUCT */}
                <Section id="product" surface="light">
                    <SectionHeading
                        index="02"
                        eyebrow="Inside the system"
                        title="Six screens, one set of numbers"
                        sub="Pick a part of the business and see what your team would actually be looking at."
                    />

                    <div className="mt-8 flex flex-wrap gap-2">
                        {PRODUCT_SCREENS.map((item, i) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveScreen(i)}
                                className={cn(
                                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                                    activeScreen === i
                                        ? 'border-slate-900 bg-slate-900 text-white dark:border-blue-600 dark:bg-blue-600'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-transparent dark:text-slate-300'
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="lg:col-span-7">
                            <AnimatePresence mode="wait">
                                <motion.div key={screen.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE }}>
                                    {screen.render()}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="lg:col-span-5 lg:pt-6">
                            <AnimatePresence mode="wait">
                                <motion.div key={screen.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE }}>
                                    <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{screen.title}</h3>
                                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{screen.body}</p>
                                    <ul className="mt-6 space-y-3">
                                        {screen.points.map((point, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{point}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            </AnimatePresence>

                            <Link href="/features" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                See all features <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>
                        </div>
                    </div>
                </Section>

                {/* 03 REPLACES */}
                <Section surface="tint">
                    <SectionHeading
                        index="03"
                        eyebrow="Why bother"
                        title="What BBU1 replaces"
                        sub="Most businesses we meet are running four systems that do not know about each other."
                    />

                    <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        {REPLACES.map((row, i) => (
                            <div key={i} className={cn('grid gap-3 px-5 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 sm:grid-cols-2 sm:gap-8 sm:px-7', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                                <p className="text-sm text-muted-foreground line-through decoration-slate-300">{row.before}</p>
                                <p className="flex items-start gap-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{row.after}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 04 HOW IT WORKS, given its own strong treatment */}
                <Section surface="light">
                    <SectionHeading index="04" eyebrow="Getting started" title="How it works" sub="Four steps. A single shop is usually trading the same day, and a group rollout runs branch by branch." />

                    <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
                        {HOW_IT_WORKS.map((item) => (
                            <div key={item.step} className="group bg-white p-7 transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-200 transition-colors group-hover:text-slate-900 dark:text-slate-800 dark:group-hover:text-slate-100">
                                        {item.step}
                                    </span>
                                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-800">
                                        {item.meta}
                                    </span>
                                </div>
                                <h3 className="mt-6 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{item.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 05 ENTERPRISE, dark panel */}
                <Section id="enterprise" surface="dark">
                    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                        <div className="lg:col-span-5">
                            <SectionHeading
                                index="05"
                                eyebrow="For larger organisations"
                                title="Small enough for a stall. Built for a group."
                                sub="The same platform runs a single till and a holding company with several subsidiaries. You do not change product when you grow."
                                dark
                            />

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button asChild className="h-12 rounded-xl bg-white px-7 text-sm font-medium text-slate-900 hover:bg-slate-100">
                                    <a href={siteConfig.contactInfo.enterpriseLink} target="_blank" rel="noopener noreferrer">Talk to our enterprise team</a>
                                </Button>
                                <Button asChild variant="outline" className="h-12 rounded-xl border-white/20 bg-white/[0.06] px-7 text-sm font-medium text-white hover:bg-white/[0.12] hover:text-white">
                                    <Link href="/contact">Request a scoping call</Link>
                                </Button>
                            </div>

                            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                                <GroupScreen />
                            </div>
                        </div>

                        <div className="lg:col-span-7">
                            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
                                {ENTERPRISE_POINTS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.title} className="bg-[#070C18] p-6 transition-colors hover:bg-white/[0.04]">
                                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-slate-200">
                                                {Icon ? <Icon className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                                            </div>
                                            <h3 className="text-sm font-semibold tracking-tight text-white">{item.title}</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* WHO USES IT */}
                <Section surface="tint">
                    <SectionHeading eyebrow="Who uses it" title="Built around how your trade works" sub="The core is the same. What sits on top changes with the business." />

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {BUILT_FOR.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950">
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
                                        {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                                    </div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    <Link href="/industries" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                        See all industries <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                </Section>

                {/* PLATFORM */}
                <Section surface="light">
                    <SectionHeading eyebrow="The platform" title="What holds it together" />

                    <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                        {PLATFORM_POINTS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="bg-white p-7 transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900">
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                                    </div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                <DynamicPricingSection />

                {/* FAQ */}
                <Section surface="light">
                    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                        <div className="lg:col-span-4">
                            <SectionHeading index="07" eyebrow="Questions" title="Things people ask" />
                            <p className="mt-6 text-sm text-muted-foreground">
                                Not answered here?{' '}
                                <Link href="/contact" className="font-medium text-slate-900 underline underline-offset-4 dark:text-white">Ask us directly</Link>.
                            </p>
                        </div>

                        <div className="lg:col-span-8">
                            <Accordion type="single" collapsible className="w-full">
                                {siteConfig.faqItems.map((faq, i) => (
                                    <AccordionItem key={i} value={`faq-${i}`} className="border-slate-200 dark:border-slate-800">
                                        <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{faq.q}</AccordionTrigger>
                                        <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                </Section>

                <PartnerWithUsSection />

                {/* FINAL CTA */}
                <section className="border-t border-white/10 bg-[#070C18] py-20 sm:py-28">
                    <div className="absolute-none container mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                                Try it with your own numbers
                            </h2>
                            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400">
                                Start a free trial and set it up yourself, or book a call and we will load your stock
                                list and opening balances while you watch.
                            </p>

                            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                <Button asChild size="lg" className="h-12 rounded-xl bg-blue-600 px-8 text-base font-medium text-white hover:bg-blue-500">
                                    <Link href="/signup">Start free trial</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/20 bg-white/[0.06] px-8 text-base font-medium text-white hover:bg-white/[0.12] hover:text-white">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a demo</a>
                                </Button>
                            </div>

                            <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pt-8 sm:flex-row sm:justify-center sm:gap-8">
                                <p className="text-sm text-slate-500">Running several branches or companies?</p>
                                <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-white">
                                    Talk to the enterprise team <ArrowRight className="h-4 w-4 text-slate-400" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {mounted ? (
                <AnimatePresence>
                    {showCookieBanner ? (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-x-0 bottom-0 z-[100] p-4"
                        >
                            <Card className="mx-auto max-h-[80vh] max-w-xl overflow-y-auto rounded-2xl border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base font-semibold">Cookies</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed">
                                        We use essential cookies to keep the site working. Analytics and marketing
                                        cookies are off unless you turn them on.{' '}
                                        <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-4 dark:text-white">Privacy policy</Link>
                                    </CardDescription>
                                </CardHeader>

                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col gap-2 pt-0 sm:flex-row sm:justify-end">
                                        <Button variant="ghost" className="h-10 w-full rounded-lg text-sm font-medium text-muted-foreground sm:w-auto" onClick={() => setIsCustomizingCookies(true)}>Choose</Button>
                                        <Button variant="outline" className="h-10 w-full rounded-lg border-slate-200 text-sm font-medium dark:border-slate-700 sm:w-auto" onClick={handleRejectNonEssential}>Essential only</Button>
                                        <Button className="h-10 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 sm:w-auto" onClick={handleAcceptAllCookies}>Accept all</Button>
                                    </CardFooter>
                                ) : (
                                    <CardContent className="space-y-4 pt-0">
                                        {siteConfig.cookieCategories.map(category => (
                                            <div key={category.id} className="flex items-start gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800">
                                                <Checkbox
                                                    id={category.id}
                                                    checked={cookiePreferences[category.id]}
                                                    onCheckedChange={(v) => setCookiePreferences(prev => ({ ...prev, [category.id]: v === true }))}
                                                    disabled={category.isRequired}
                                                    className="mt-0.5"
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label htmlFor={category.id} className="text-sm font-medium">{category.name}</label>
                                                    <p className="text-sm leading-relaxed text-muted-foreground">{category.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                                            <Button variant="ghost" className="h-10 rounded-lg text-sm font-medium text-muted-foreground" onClick={() => setIsCustomizingCookies(false)}>Back</Button>
                                            <Button className="h-10 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700" onClick={handleSaveCookiePreferences}>Save</Button>
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