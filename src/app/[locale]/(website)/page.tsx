'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from "@/lib/utils";
import {
    Check, ChevronDown, LucideIcon, Menu, ArrowRight, X, Sparkles, Users, ShieldCheck,
    WifiOff, Globe, Settings, BrainCircuit, TrendingUp, Megaphone, GitBranch,
    MessageSquareText, DownloadCloud, Layers, BookOpen, HelpCircle, Home, LayoutGrid,
    Banknote, Warehouse, Handshake, Landmark, Briefcase, Stethoscope, ShoppingCart, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import NewsletterPopup from '@/components/NewsletterPopup';
import { featureSets } from '@/lib/data/features';

const COOKIE_CONSENT_NAME = 'bbu1_cookie_consent';
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
    name: "BBU1",
    url: "https://www.bbu1.com/",
    contactInfo: {
        email: "info@bbu1.com",
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I would like to see a demo for my business.")}`,
        socials: {
            linkedin: "https://www.linkedin.com/in/mwesigwa-jimmy-8248a1243",
            twitter: "https://x.com/MwesigwaJimmy5",
            facebook: "https://facebook.com/bbu1official"
        }
    },

    faqItems: [
        {
            q: 'What is BBU1?',
            a: 'One system for running a business. Sales, stock, accounting, staff and reporting in one place, instead of a point of sale that does not talk to your books and a spreadsheet that does not talk to either.'
        },
        {
            q: 'What happens when the internet goes down?',
            a: 'You keep selling. Sales and stock movements are saved on the device and upload on their own once the connection comes back. You do not have to do anything.'
        },
        {
            q: 'Do I need an accountant to use it?',
            a: 'No. You record what you sold and what you spent. The system does the double entry behind it, so your profit and loss, balance sheet and cash flow are always current. Your accountant can log in and take what they need.'
        },
        {
            q: 'Can I move my data out later?',
            a: 'Yes. Export any list to CSV or PDF from the screen you are on, and there is an API if you want to connect BBU1 to something else. Your data is yours.'
        },
        {
            q: 'Is my data separate from other businesses?',
            a: 'Yes. Every table is protected at the database level so a query from one business cannot return another business\u2019s rows. Connections are encrypted and data is backed up daily.'
        },
        {
            q: 'How long does it take to set up?',
            a: 'Most shops are selling on the same day. Import your stock list and your opening balances, add your staff, and start. We will help you with the import if you want.'
        },
        {
            q: 'What support do I get?',
            a: 'WhatsApp, phone and email. We answer during working hours, Monday to Saturday. Larger accounts get a named contact and an onboarding session.'
        },
    ] as FaqItem[],

    cookieCategories: [
        { id: 'essential', name: 'Essential', description: 'Needed for the site to work, including security and your sign-in session. These cannot be switched off.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics', description: 'Tell us which pages people visit so we know what to improve. No personal information.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing', description: 'Let us show you relevant adverts on other sites. Off unless you turn it on.', isRequired: false, defaultChecked: false }
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

const ListItem = forwardRef<ElementRef<"div">, ComponentPropsWithoutRef<"div"> & { icon?: LucideIcon }>(
    ({ className, title, children, icon: Icon, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "flex cursor-pointer select-none items-start rounded-lg p-3 leading-none outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
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
ListItem.displayName = "ListItem";

const Section = ({ children, className, id }: { children: ReactNode; className?: string; id?: string }) => (
    <motion.section
        id={id}
        className={cn("py-16 sm:py-24", className)}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
    >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </motion.section>
);

const SectionHeading = ({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) => (
    <div className="max-w-2xl">
        {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {title}
        </h2>
        {sub ? (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{sub}</p>
        ) : null}
    </div>
);

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
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        scrolled
            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
    );

    return (
        <>
            <header className={cn(
                "fixed top-0 z-40 h-16 w-full transition-colors duration-300",
                scrolled
                    ? "border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95"
                    : "border-b border-transparent bg-transparent"
            )}>
                <div className="mx-auto flex h-full max-w-7xl flex-nowrap items-center gap-2 px-4 sm:px-6">

                    <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
                        <span className={cn("transition-colors", scrolled ? "text-slate-900 dark:text-white" : "text-white")}>
                            {siteConfig.name}
                        </span>
                    </Link>

                    <nav ref={navRef} className="relative hidden flex-1 items-center gap-0.5 lg:flex">
                        <Link href="/" className={navLinkClass} aria-label="Home">
                            <Home className="h-4 w-4" />
                        </Link>

                        <div className="relative">
                            <button
                                onPointerEnter={(e) => openHover('features', e)}
                                onPointerLeave={closeHover}
                                onClick={() => setOpenMenu(openMenu === 'features' ? null : 'features')}
                                className={cn(navLinkClass, openMenu === 'features' && (scrolled ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'bg-white/10 text-white'))}
                            >
                                Features
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openMenu === 'features' && 'rotate-180')} />
                            </button>

                            {openMenu === 'features' && (
                                <div
                                    onPointerEnter={(e) => openHover('features', e)}
                                    onPointerLeave={closeHover}
                                    className="absolute left-0 top-full z-50 mt-2 w-[720px] max-w-[92vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                                >
                                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                                        <span className="text-xs font-medium text-slate-500">What is inside</span>
                                        <Link
                                            href="/features"
                                            onClick={() => setOpenMenu(null)}
                                            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                        >
                                            All features <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto">
                                        <ul className="grid grid-cols-2 gap-1 p-3">
                                            {featureSets.map((feature: any) => (
                                                <li key={feature.slug} className="list-none">
                                                    <Link href={`/features/${feature.slug}`} onClick={() => setOpenMenu(null)}>
                                                        <ListItem title={feature.title} icon={feature.icon}>
                                                            {feature.description}
                                                        </ListItem>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link href="/industries" className={navLinkClass}>Industries</Link>
                        <Link href="/aura-ai" className={navLinkClass}>Aura AI</Link>
                        <Link href="/courses" className={navLinkClass}>Academy</Link>
                        <Link href="/help-centre" className={navLinkClass}>Help</Link>
                        <Link href="/blog" className={navLinkClass}>Journal</Link>
                    </nav>

                    <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
                        {deferredPrompt ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleInstallClick}
                                className={cn("font-medium", scrolled
                                    ? "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                                    : "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white")}
                            >
                                <DownloadCloud className="mr-1.5 h-4 w-4" /> Install
                            </Button>
                        ) : null}

                        <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className={cn("font-medium", scrolled
                                ? "text-slate-600 dark:text-slate-300"
                                : "text-slate-300 hover:bg-white/10 hover:text-white")}
                        >
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
                            className={cn("rounded-lg p-2 transition-colors",
                                isMobileMenuOpen
                                    ? "bg-slate-900 text-white"
                                    : scrolled
                                        ? "text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                                        : "text-white hover:bg-white/10"
                            )}
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {isMobileMenuOpen && (
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
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 border-b border-white/10 py-4 text-base font-medium text-white"
                                    >
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
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">
                                        Book a demo
                                    </a>
                                </Button>
                                <Button variant="ghost" asChild className="h-12 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white">
                                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Log in</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const PRODUCT_SCREENS = [
    {
        id: 'pos',
        label: 'Selling',
        title: 'Sell, and the books update themselves',
        body: 'Every sale posts to the ledger the moment it happens. Stock comes down, revenue goes up, and the day closes with a cash count you can check note by note.',
        points: ['Works with barcode scanners and receipt printers', 'Counts your drawer at open and close', 'Keeps working when the network drops'],
        media: { type: 'video', src: '/videos/BBU1 inventory management.mp4', alt: 'Inventory management in BBU1' },
    },
    {
        id: 'accounts',
        label: 'Accounts',
        title: 'Real accounting, without an accountant',
        body: 'Double entry runs underneath everything. Your profit and loss, balance sheet and cash flow are always current, and every figure traces back to the entry that made it.',
        points: ['Profit and loss, balance sheet, cash flow', 'Expenses with proper account codes', 'Export to PDF or Excel for your accountant'],
        media: { type: 'image', src: '/images/showcase/future-of-business-tech.jpg', alt: 'Financial reporting in BBU1' },
    },
    {
        id: 'stock',
        label: 'Stock',
        title: 'Know what you have, in every branch',
        body: 'One stock list across all your locations. Set reorder points and the system tells you what to buy before you run out.',
        points: ['Multiple branches and warehouses', 'Reorder alerts and purchase orders', 'Batch and expiry tracking'],
        media: { type: 'image', src: '/images/showcase/local-shop-owner.jpg', alt: 'Stock management' },
    },
    {
        id: 'people',
        label: 'People',
        title: 'Staff, shifts and pay in one place',
        body: 'Add your team, set what each person can see, and run payroll from the hours they actually worked.',
        points: ['Role based access down to the screen', 'Attendance and leave', 'Payroll with statutory deductions'],
        media: { type: 'image', src: '/images/showcase/healthcare-team.jpg', alt: 'Team management' },
    },
];

const REPLACES = [
    { before: 'A point of sale that does not talk to your books', after: 'Sales post straight to the ledger' },
    { before: 'A spreadsheet for stock that is out of date by lunchtime', after: 'One stock list, live, across branches' },
    { before: 'Paying an accountant to rebuild your year from receipts', after: 'Statements ready whenever you open them' },
    { before: 'Orders arriving on WhatsApp with no record', after: 'An online store tied to the same stock' },
];

const HOW_IT_WORKS = [
    { step: '1', title: 'Create an account', desc: 'Sign up with an email and a phone number. No card needed to start.' },
    { step: '2', title: 'Bring in what you have', desc: 'Import your stock list and opening balances from a spreadsheet. We help with this.' },
    { step: '3', title: 'Add your team', desc: 'Invite staff and set what each of them can see and do.' },
    { step: '4', title: 'Start selling', desc: 'Most shops are trading on the system the same day.' },
];

const BUILT_FOR = [
    { icon: ShoppingCart, title: 'Shops and supermarkets', desc: 'Counter sales, stock, suppliers.' },
    { icon: Stethoscope, title: 'Clinics and pharmacies', desc: 'Patients, lab, dispensing, billing.' },
    { icon: Warehouse, title: 'Wholesale and distribution', desc: 'Multi-branch stock and delivery.' },
    { icon: Building2, title: 'Property and rentals', desc: 'Units, tenants, rent collection.' },
    { icon: Landmark, title: 'SACCOs and lenders', desc: 'Savings, shares, loan books.' },
    { icon: Briefcase, title: 'Services and agencies', desc: 'Jobs, invoicing, staff time.' },
];

const PLATFORM_POINTS = [
    { icon: WifiOff, title: 'Works offline', desc: 'Sales and stock keep working without a connection and sync when it returns.' },
    { icon: ShieldCheck, title: 'Separated data', desc: 'Every business is isolated at the database level. Encrypted connections, daily backups.' },
    { icon: Globe, title: 'More than one country', desc: 'Multiple currencies and tax rules you configure per region.' },
    { icon: BrainCircuit, title: 'Aura', desc: 'Ask questions about your own figures in plain language and get an answer from your data.' },
    { icon: Settings, title: 'Fits how you work', desc: 'Custom fields, your own approval steps, and an API when you need to connect something.' },
    { icon: Users, title: 'Grows with you', desc: 'From one till to several branches on the same account, with head office visibility.' },
];

const GEO_CURRENCIES: Record<string, { code: string; symbol: string; rate: number }> = {
    'UG': { code: 'UGX', symbol: 'USh', rate: 3750 },
    'KE': { code: 'KES', symbol: 'KSh', rate: 130 },
    'TZ': { code: 'TZS', symbol: 'TSh', rate: 2600 },
    'RW': { code: 'RWF', symbol: 'RF', rate: 1350 },
    'NG': { code: 'NGN', symbol: '₦', rate: 1650 },
    'ZA': { code: 'ZAR', symbol: 'R', rate: 18 },
    'GH': { code: 'GHS', symbol: 'GH₵', rate: 16 },
    'ZM': { code: 'ZMW', symbol: 'ZK', rate: 27 },
    'GB': { code: 'GBP', symbol: '£', rate: 0.79 },
    'EU': { code: 'EUR', symbol: '€', rate: 0.92 },
    'CN': { code: 'CNY', symbol: '¥', rate: 7.25 },
    'AE': { code: 'AED', symbol: 'Dh', rate: 3.67 },
    'US': { code: 'USD', symbol: '$', rate: 1 },
    'DEFAULT': { code: 'USD', symbol: '$', rate: 1 }
};

const EUROZONE_COUNTRIES = ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];

const ALL_INCLUDED_MODULES = [
    {
        title: "Finance and accounting",
        icon: Landmark,
        features: ["General ledger and journals", "Bank reconciliation", "Tax returns", "Payables and receivables", "Assets and depreciation", "Budgets and cost centres", "Multiple currencies", "Period lock dates", "Chart of accounts"]
    },
    {
        title: "Staff and payroll",
        icon: Users,
        features: ["Payroll and benefits", "Hiring and onboarding", "Staff directory", "Attendance and shifts", "Performance reviews", "Leave", "Exit process"]
    },
    {
        title: "Stock and supply",
        icon: Warehouse,
        features: ["Multiple warehouses", "Manufacturing orders", "Bundled products", "Purchase orders", "Stock counts", "Batch and serial tracking", "Landed costs", "Transfers and adjustments", "Barcode scanning", "Reorder points"]
    },
    {
        title: "Sales and customers",
        icon: Handshake,
        features: ["Leads and pipeline", "Campaigns", "Support tickets", "Full customer history", "Price lists and discounts", "Sales forecasting", "Returns"]
    },
    {
        title: "Industry modules",
        icon: Briefcase,
        features: ["SACCO savings and shares", "Loans and credit risk", "Agent float and SIM stock", "Leases and property units", "Fleet and delivery routes", "Field jobs and dispatch", "Grants and donors"]
    }
];

const PLANS = [
    {
        name: "Starter",
        basePrice: 14,
        userLimit: "1 user",
        idealFor: "Kiosks and market stalls",
        highlight: false,
        btnText: "Start free trial",
        features: ["Point of sale", "Stock tracking", "Daily sales reports", "Invoicing", "Mobile app"]
    },
    {
        name: "Growth",
        basePrice: 42,
        userLimit: "2 users",
        idealFor: "Small shops and sole traders",
        highlight: false,
        btnText: "Start free trial",
        features: ["Everything in Starter", "Full accounting", "Bank reconciliation", "Tax returns", "Enterprise reports"]
    },
    {
        name: "Scale",
        basePrice: 69,
        userLimit: "10 users",
        idealFor: "Growing businesses with staff",
        highlight: true,
        btnText: "Start free trial",
        features: ["Everything in Growth", "All industry modules", "Staff and payroll", "Multiple branches", "Your own branding"]
    },
    {
        name: "Enterprise",
        basePrice: 122,
        userLimit: "Unlimited users",
        idealFor: "Larger and multi-site businesses",
        highlight: false,
        btnText: "Talk to sales",
        features: ["Everything in Scale", "API access", "Named support contact", "On-premise option", "Onboarding session"]
    }
];

const DynamicPricingSection = () => {
    const [currency, setCurrency] = useState(GEO_CURRENCIES['DEFAULT']);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        let cancelled = false;

        const detectLocation = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                let data: any = null;

                const endpoints = ['https://api.country.is', 'https://ipapi.co/json/'];
                for (const url of endpoints) {
                    try {
                        const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
                        if (response.ok) { data = await response.json(); break; }
                    } catch (e) { continue; }
                }
                clearTimeout(timeoutId);
                if (cancelled || !data) return;

                const countryCode = String(data.country_code || data.country || '').toUpperCase();

                if (EUROZONE_COUNTRIES.includes(countryCode)) setCurrency(GEO_CURRENCIES['EU']);
                else if (GEO_CURRENCIES[countryCode]) setCurrency(GEO_CURRENCIES[countryCode]);
                else setCurrency(GEO_CURRENCIES['DEFAULT']);
            } catch (error) {
                if (!cancelled) setCurrency(GEO_CURRENCIES['DEFAULT']);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        detectLocation();
        return () => { cancelled = true; };
    }, []);

    const formatPrice = (base: number) => {
        let price = base * currency.rate;
        if (billingCycle === 'yearly') price = price * 0.8;
        if (['UGX', 'TZS', 'RWF'].includes(currency.code)) price = Math.floor(price / 1000) * 1000;
        else if (['NGN', 'KES'].includes(currency.code)) price = Math.floor(price / 100) * 100;
        else price = Math.floor(price);
        return new Intl.NumberFormat('en').format(price);
    };

    return (
        <section id="pricing" className="border-t border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:py-24">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6">

                <div className="max-w-2xl">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Pricing</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                        One price, every module
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                        You are not charged per module. What changes between plans is how many people can use it
                        and how deep the features go.
                    </p>
                </div>

                <div className="mt-8 flex items-center gap-3">
                    <span className={cn("text-sm transition-colors", billingCycle === 'monthly' ? "font-medium text-foreground" : "text-muted-foreground")}>
                        Monthly
                    </span>
                    <button
                        onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                        className={cn("relative h-6 w-11 rounded-full p-0.5 transition-colors", billingCycle === 'yearly' ? "bg-slate-900 dark:bg-blue-600" : "bg-slate-300 dark:bg-slate-700")}
                        aria-label="Toggle billing period"
                    >
                        <span
                            className={cn("block h-5 w-5 rounded-full bg-white transition-transform", billingCycle === 'yearly' ? "translate-x-5" : "translate-x-0")}
                        />
                    </button>
                    <span className={cn("flex items-center gap-2 text-sm transition-colors", billingCycle === 'yearly' ? "font-medium text-foreground" : "text-muted-foreground")}>
                        Yearly
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Save 20%
                        </span>
                    </span>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {PLANS.map((plan, index) => (
                        <Card
                            key={index}
                            className={cn(
                                "flex h-full flex-col rounded-2xl shadow-none",
                                plan.highlight
                                    ? "border-2 border-slate-900 dark:border-blue-600"
                                    : "border border-slate-200 dark:border-slate-800"
                            )}
                        >
                            <CardHeader className="pb-4">
                                {plan.highlight ? (
                                    <span className="mb-2 w-fit rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-blue-600">
                                        Most popular
                                    </span>
                                ) : null}
                                <CardTitle className="text-lg font-semibold tracking-tight">{plan.name}</CardTitle>
                                <CardDescription className="text-sm">{plan.idealFor}</CardDescription>
                                <div className="mt-5">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-semibold tracking-tight">
                                            {currency.symbol} {formatPrice(plan.basePrice)}
                                        </span>
                                        <span className="text-sm text-muted-foreground">/mo</span>
                                    </div>
                                    <p className="mt-1 h-4 text-xs text-muted-foreground">
                                        {billingCycle === 'yearly' ? 'Billed yearly' : ''}
                                    </p>
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
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className={cn("h-11 w-full rounded-xl text-sm font-medium",
                                        plan.highlight
                                            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                                            : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
                                    )}
                                    asChild
                                >
                                    <Link href={plan.btnText === 'Talk to sales' ? '/contact' : '/signup'}>
                                        {plan.btnText}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        What is included on every plan
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        No add-on fees. If a module applies to your business, it is already there.
                    </p>

                    <div className="mt-7 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {ALL_INCLUDED_MODULES.map((module) => {
                            const Icon = module.icon;
                            return (
                                <div key={module.title}>
                                    <div className="flex items-center gap-2.5">
                                        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
                                        <h4 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                                            {module.title}
                                        </h4>
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
                    Prices exclude local VAT or GST where it applies.
                    {loading ? '' : ` Shown in ${currency.code}.`}
                    {' '}Need on-premise hosting or white labelling?{' '}
                    <Link href="/contact" className="font-medium text-slate-900 underline underline-offset-4 dark:text-white">
                        Talk to sales
                    </Link>.
                </p>
            </div>
        </section>
    );
};

const PartnerWithUsSection = () => {
    const [formData, setFormData] = useState({ name: '', org: '', email: '', phone: '', details: '' });
    const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

    const resetForm = () => {
        setFormData({ name: '', org: '', email: '', phone: '', details: '' });
        setFormErrors({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (formErrors[e.target.name as 'name' | 'email']) {
            setFormErrors(prev => ({ ...prev, [e.target.name]: undefined }));
        }
    };

    const validateContactFields = () => {
        const errors: { name?: string; email?: string } = {};
        if (!formData.name.trim()) errors.name = "Enter your name.";
        if (!formData.email.trim() || !formData.email.includes('@')) errors.email = "Enter a valid email address.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEmailTrigger = (type: string) => {
        if (!validateContactFields()) return;

        const subject = `${type} enquiry: ${formData.name}`;
        const body = [
            `Name: ${formData.name}`,
            `Organisation: ${formData.org}`,
            `Email: ${formData.email}`,
            `Phone: ${formData.phone}`,
            ``,
            `Message:`,
            formData.details,
        ].join('\n');

        window.open(
            `mailto:${siteConfig.contactInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            '_self'
        );
    };

    const handleWhatsAppSubmit = () => {
        const text = `Hello BBU1, I would like to join the affiliate programme.`;
        window.open(`https://wa.me/256703572503?text=${encodeURIComponent(text)}`, '_blank');
    };

    const partnerForm = (type: string, orgLabel: string, detailsLabel: string, detailsPlaceholder: string) => (
        <div className="space-y-4 px-5 py-6 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Name <span className="text-red-600">*</span></label>
                    <Input
                        name="name"
                        value={formData.name}
                        placeholder="Full name"
                        onChange={handleInputChange}
                        className={cn("h-11 rounded-lg text-sm", formErrors.name && "border-red-500")}
                    />
                    {formErrors.name ? <p className="text-xs text-red-600">{formErrors.name}</p> : null}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">{orgLabel}</label>
                    <Input
                        name="org"
                        value={formData.org}
                        placeholder={orgLabel}
                        onChange={handleInputChange}
                        className="h-11 rounded-lg text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Email <span className="text-red-600">*</span></label>
                    <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        placeholder="you@example.com"
                        onChange={handleInputChange}
                        className={cn("h-11 rounded-lg text-sm", formErrors.email && "border-red-500")}
                    />
                    {formErrors.email ? <p className="text-xs text-red-600">{formErrors.email}</p> : null}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Phone</label>
                    <Input
                        name="phone"
                        value={formData.phone}
                        placeholder="+256..."
                        onChange={handleInputChange}
                        className="h-11 rounded-lg text-sm"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">{detailsLabel}</label>
                <textarea
                    name="details"
                    value={formData.details}
                    placeholder={detailsPlaceholder}
                    onChange={handleInputChange}
                    className="flex min-h-[110px] w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            <Button
                type="button"
                onClick={() => handleEmailTrigger(type)}
                className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
                Send enquiry
            </Button>
        </div>
    );

    const affiliateDialogContent = (
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-2xl p-0 sm:max-w-lg">
            <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800 sm:px-6">
                <DialogTitle className="text-base font-semibold">Affiliate programme</DialogTitle>
                <DialogDescription className="text-sm">
                    Refer businesses to BBU1 and earn a share of what they pay, for as long as they stay.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 px-5 py-6 sm:px-6">
                <ol className="space-y-3">
                    {[
                        'You get a referral code.',
                        'A business signs up using it.',
                        'You are paid each month they remain a customer.',
                    ].map((line, i) => (
                        <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {i + 1}
                            </span>
                            <span className="pt-0.5">{line}</span>
                        </li>
                    ))}
                </ol>
                <Button
                    onClick={handleWhatsAppSubmit}
                    className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Message us on WhatsApp
                </Button>
            </div>
        </DialogContent>
    );

    const solutionDialogContent = (
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-lg">
            <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800 sm:px-6">
                <DialogTitle className="text-base font-semibold">Build on BBU1</DialogTitle>
                <DialogDescription className="text-sm">
                    Implement BBU1 for your clients, build integrations, or white label it.
                </DialogDescription>
            </DialogHeader>
            {partnerForm('Solution partner', 'Agency or company', 'What you would build', 'We work with retail clients and want to...')}
        </DialogContent>
    );

    return (
        <Section id="partner" className="border-t border-slate-200 dark:border-slate-800">
            <SectionHeading
                eyebrow="Partners"
                title="Work with us"
                sub="Two ways to earn from BBU1 without being on the payroll."
            />

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Megaphone className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">Refer businesses</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        For anyone with a network of business owners. You get a code, they sign up with it, and you
                        are paid every month they stay.
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                        <li className="flex gap-2.5 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            Recurring payment, not one off
                        </li>
                        <li className="flex gap-2.5 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            Materials provided
                        </li>
                    </ul>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-6 h-11 w-full rounded-xl border-slate-200 text-sm font-medium dark:border-slate-700">
                                Join the programme
                                <ArrowRight className="ml-2 h-4 w-4 text-slate-400" />
                            </Button>
                        </DialogTrigger>
                        {affiliateDialogContent}
                    </Dialog>
                </div>

                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <GitBranch className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">Build on it</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        For developers and agencies. Set BBU1 up for your clients, connect it to their other systems,
                        or run it under your own brand.
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                        <li className="flex gap-2.5 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            API access and documentation
                        </li>
                        <li className="flex gap-2.5 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            Share of implementation revenue
                        </li>
                    </ul>
                    <Dialog onOpenChange={(open) => { if (open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="mt-6 h-11 w-full rounded-xl border-slate-200 text-sm font-medium dark:border-slate-700">
                                Get in touch
                                <ArrowRight className="ml-2 h-4 w-4 text-slate-400" />
                            </Button>
                        </DialogTrigger>
                        {solutionDialogContent}
                    </Dialog>
                </div>
            </div>
        </Section>
    );
};

export default function HomePage({ params }: { params?: { locale?: string } }) {
    const supabase = createClient();

    const [mounted, setMounted] = useState(false);
    const [activeScreen, setActiveScreen] = useState(0);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);

    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce(
        (acc, cat) => ({ ...acc, [cat.id]: cat.defaultChecked }),
        {} as CookiePreferences
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

    useEffect(() => {
        setMounted(true);
    }, []);

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
        if (!consentCookie) {
            setShowCookieBanner(true);
            return;
        }
        try {
            applyCookiePreferences(JSON.parse(consentCookie));
        } catch (error) {
            setShowCookieBanner(true);
        }
    }, [applyCookiePreferences]);

    const screen = PRODUCT_SCREENS[activeScreen];

    return (
        <div className="flex min-h-screen flex-col">
            <NewsletterPopup />
            <MegaMenuHeader />

            <main className="flex-grow">

                <section id="hero" className="relative flex items-center justify-center overflow-hidden bg-[#020617] pt-16">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(37,99,235,0.22)_0%,transparent_70%)]" />

                    <div className="relative z-10 mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
                        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                            <motion.span
                                variants={fadeUp}
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-slate-300"
                            >
                                One system for the whole business
                            </motion.span>

                            <motion.h1
                                variants={fadeUp}
                                className="mt-7 text-3xl font-semibold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl"
                            >
                                Run your whole business
                                <br className="hidden sm:block" />
                                {' '}on one system
                            </motion.h1>

                            <motion.p
                                variants={fadeUp}
                                className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
                            >
                                Sales, stock, accounting, staff and reporting in one place. Sell at the counter and
                                your books update themselves, whether the internet is up or not.
                            </motion.p>

                            <motion.div
                                variants={fadeUp}
                                className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
                            >
                                <Button asChild size="lg" className="h-12 w-full rounded-xl bg-blue-600 px-8 text-base font-medium text-white hover:bg-blue-500 sm:w-auto">
                                    <Link href="/signup">Start free trial</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/20 bg-white/[0.06] px-8 text-base font-medium text-white hover:bg-white/[0.12] hover:text-white sm:w-auto">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">
                                        Book a demo
                                    </a>
                                </Button>
                            </motion.div>

                            <motion.p variants={fadeUp} className="mt-7 text-sm text-slate-500">
                                No card needed. Set up in a day.
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                <Section id="product" className="bg-white dark:bg-slate-950">
                    <SectionHeading
                        eyebrow="The product"
                        title="What it actually does"
                        sub="Four parts of the same system. Nothing needs exporting from one to reach another."
                    />

                    <div className="mt-8 flex flex-wrap gap-2">
                        {PRODUCT_SCREENS.map((item, i) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveScreen(i)}
                                className={cn(
                                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                                    activeScreen === i
                                        ? "border-slate-900 bg-slate-900 text-white dark:border-blue-600 dark:bg-blue-600"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-transparent dark:text-slate-300"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="lg:col-span-7">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                </div>

                                <div className="relative flex h-[240px] items-center justify-center bg-white dark:bg-slate-950 sm:h-[420px]">
                                    {screen.media.type === 'video' ? (
                                        <video
                                            key={screen.id}
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                            className="h-full w-full object-contain"
                                        >
                                            <source src={screen.media.src} type="video/mp4" />
                                        </video>
                                    ) : (
                                        <Image
                                            key={screen.id}
                                            src={screen.media.src}
                                            alt={screen.media.alt}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                                {screen.title}
                            </h3>
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                                {screen.body}
                            </p>
                            <ul className="mt-6 space-y-3">
                                {screen.points.map((point, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                        {point}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/features"
                                className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"
                            >
                                See all features
                                <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>
                        </div>
                    </div>
                </Section>

                <Section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                    <SectionHeading
                        eyebrow="Why bother"
                        title="What BBU1 replaces"
                        sub="Most businesses we meet are running four systems that do not know about each other."
                    />

                    <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        {REPLACES.map((row, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "grid gap-3 px-5 py-5 sm:grid-cols-2 sm:gap-8 sm:px-7",
                                    i > 0 && "border-t border-slate-100 dark:border-slate-800"
                                )}
                            >
                                <p className="text-sm text-muted-foreground line-through decoration-slate-300">
                                    {row.before}
                                </p>
                                <p className="flex items-start gap-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    {row.after}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section className="bg-white dark:bg-slate-950">
                    <SectionHeading
                        eyebrow="Getting started"
                        title="How it works"
                        sub="Four steps. Most businesses are trading on it the same day."
                    />

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {HOW_IT_WORKS.map((item) => (
                            <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {item.step}
                                </span>
                                <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                                    {item.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                    <SectionHeading
                        eyebrow="Who uses it"
                        title="Built around how your trade works"
                        sub="The core is the same. What sits on top changes with the business."
                    />

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {BUILT_FOR.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                                    </div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    <Link
                        href="/industries"
                        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"
                    >
                        See all industries
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                </Section>

                <Section className="bg-white dark:bg-slate-950">
                    <SectionHeading
                        eyebrow="The platform"
                        title="What holds it together"
                    />

                    <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                        {PLATFORM_POINTS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.title}>
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                                    </div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                <DynamicPricingSection />

                <Section className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                        <div className="lg:col-span-4">
                            <SectionHeading eyebrow="Questions" title="Things people ask" />
                            <p className="mt-6 text-sm text-muted-foreground">
                                Not answered here?{' '}
                                <Link href="/contact" className="font-medium text-slate-900 underline underline-offset-4 dark:text-white">
                                    Ask us directly
                                </Link>.
                            </p>
                        </div>

                        <div className="lg:col-span-8">
                            <Accordion type="single" collapsible className="w-full">
                                {siteConfig.faqItems.map((faq, i) => (
                                    <AccordionItem key={i} value={`faq-${i}`} className="border-slate-200 dark:border-slate-800">
                                        <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">
                                            {faq.q}
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                                            {faq.a}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                </Section>

                <PartnerWithUsSection />

                <Section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950 sm:px-12 sm:py-16">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
                            Try it with your own numbers
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                            Start a free trial, or book a call and we will set it up with your stock list and
                            opening balances while you watch.
                        </p>
                        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                            <Button asChild className="h-12 rounded-xl bg-slate-900 px-8 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">
                                <Link href="/signup">Start free trial</Link>
                            </Button>
                            <Button asChild variant="outline" className="h-12 rounded-xl border-slate-200 px-8 text-sm font-medium dark:border-slate-700">
                                <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">
                                    Book a demo
                                </a>
                            </Button>
                        </div>
                    </div>
                </Section>

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
                                        <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-4 dark:text-white">
                                            Privacy policy
                                        </Link>
                                    </CardDescription>
                                </CardHeader>

                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col gap-2 pt-0 sm:flex-row sm:justify-end">
                                        <Button
                                            variant="ghost"
                                            className="h-10 w-full rounded-lg text-sm font-medium text-muted-foreground sm:w-auto"
                                            onClick={() => setIsCustomizingCookies(true)}
                                        >
                                            Choose
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-10 w-full rounded-lg border-slate-200 text-sm font-medium dark:border-slate-700 sm:w-auto"
                                            onClick={handleRejectNonEssential}
                                        >
                                            Essential only
                                        </Button>
                                        <Button
                                            className="h-10 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 sm:w-auto"
                                            onClick={handleAcceptAllCookies}
                                        >
                                            Accept all
                                        </Button>
                                    </CardFooter>
                                ) : (
                                    <CardContent className="space-y-4 pt-0">
                                        {siteConfig.cookieCategories.map(category => (
                                            <div
                                                key={category.id}
                                                className="flex items-start gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800"
                                            >
                                                <Checkbox
                                                    id={category.id}
                                                    checked={cookiePreferences[category.id]}
                                                    onCheckedChange={(v) =>
                                                        setCookiePreferences(prev => ({ ...prev, [category.id]: v === true }))
                                                    }
                                                    disabled={category.isRequired}
                                                    className="mt-0.5"
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label htmlFor={category.id} className="text-sm font-medium">
                                                        {category.name}
                                                    </label>
                                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                                        {category.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                                            <Button
                                                variant="ghost"
                                                className="h-10 rounded-lg text-sm font-medium text-muted-foreground"
                                                onClick={() => setIsCustomizingCookies(false)}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                className="h-10 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                                                onClick={handleSaveCookiePreferences}
                                            >
                                                Save
                                            </Button>
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