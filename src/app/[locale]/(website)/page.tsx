'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useChat } from '@ai-sdk/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";
import {
    Bot, BrainCircuit, Handshake, ShieldCheck, TrendingUp, Landmark, Leaf, LucideIcon,
    Menu, ArrowRight, ChevronDown, WifiOff, Send, Users, X, Check, Globe, Briefcase,
    Megaphone, GitBranch, Warehouse, Loader2, Building, Truck, Signal, Home, Moon, Sun
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import NewsletterPopup from '@/components/NewsletterPopup';
import { featureSets } from '@/lib/data/features';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const COOKIE_CONSENT_NAME = 'bbu1_cookie_consent';
const COOKIE_EXPIRY_DAYS = 365;
const TOAST_DURATION = 4000;

interface PlatformPillar {
    icon: LucideIcon;
    title: string;
    description: string;
    image: string;
}

type CookieCategoryKey = 'essential' | 'analytics' | 'marketing';
interface CookieCategoryInfo { id: CookieCategoryKey; name: string; description: string; isRequired: boolean; defaultChecked: boolean; }
type CookiePreferences = { [key in CookieCategoryKey]: boolean };
interface ToastState { visible: boolean; message: string; }

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
    contactInfo: {
        email: "info@bbu1.com",
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
    },
    platformPillars: [
        {
            icon: TrendingUp,
            title: "Built for growth",
            description: "A cloud-native architecture that holds steady as you add branches, users, and regions — from a single kiosk to a multi-branch operation.",
            image: "/images/showcase/future-of-business-tech.jpg"
        },
        {
            icon: BrainCircuit,
            title: "Aura, your business copilot",
            description: "Aura assists with bookkeeping and reporting, flags anomalies like duplicate payments, and answers plain-language questions about your own data.",
            image: "/images/showcase/ai-warehouse-logistics.jpg"
        },
        {
            icon: WifiOff,
            title: "Works without a connection",
            description: "Point of sale, inventory, and field tools keep running on the device itself. When a connection returns, your data syncs automatically.",
            image: "/images/showcase/education-dashboard.jpg"
        },
        {
            icon: Globe,
            title: "Built for multiple countries",
            description: "Multi-currency transactions, configurable tax rules by region, and reporting suited to different jurisdictions.",
            image: "/images/showcase/community-group-meeting.jpg"
        },
        {
            icon: ShieldCheck,
            title: "Enterprise-grade security",
            description: "Every account is isolated with row-level security. Data is encrypted at rest and in transit, with role-based access down to the field level.",
            image: "/images/showcase/cattle-market-records.jpg"
        },
        {
            icon: Briefcase,
            title: "Customization & integration",
            description: "Custom fields, approval workflows, and a documented REST and GraphQL API for teams who want to build on top of BBU1.",
            image: "/images/showcase/creative-agency-pm.jpg"
        },
    ] as PlatformPillar[],

    cookieCategories: [
        { id: 'essential', name: 'Essential', description: 'Required for the site to function. These cannot be turned off.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics', description: 'Help us understand how the site is used, so we can improve it.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing', description: 'Used by our advertising partners to show relevant ads on other sites.', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

// ─────────────────────────────────────────────────────────────
// Small building blocks
// ─────────────────────────────────────────────────────────────
const Section = ({ children, className, id }: { children: ReactNode; className?: string; id?: string }) => (
    <section id={id} className={cn("py-20 sm:py-24", className)}>
        <div className="container mx-auto px-6 max-w-6xl">{children}</div>
    </section>
);

const Eyebrow = ({ children }: { children: ReactNode }) => (
    <p className="text-sm font-semibold text-slate-500 mb-3">{children}</p>
);

const Toast = ({ message, isVisible }: { message: string; isVisible: boolean }) => {
    if (!isVisible) return null;
    return (
        <div className="fixed bottom-6 left-6 z-[150] flex items-center gap-3 rounded-lg border border-slate-200 bg-white text-slate-900 p-4 shadow-lg">
            <Check className="h-5 w-5 text-slate-900" />
            <p className="font-medium text-sm">{message}</p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
const SiteHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [featuresOpen, setFeaturesOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleDark = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(prev => !prev);
    };

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) setFeaturesOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const navLinkClass = "px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors";

    return (
        <>
            <header className={cn(
                "fixed top-0 z-40 w-full h-16 bg-white/95 backdrop-blur border-b transition-colors",
                scrolled ? "border-slate-200 shadow-sm" : "border-transparent"
            )}>
                <div className="max-w-7xl mx-auto flex h-full items-center px-6 gap-2">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 shrink-0">
                        {siteConfig.name}
                    </Link>

                    <nav ref={navRef} className="hidden lg:flex flex-1 items-center gap-0.5 ml-6 relative">
                        <Link href="/" className={navLinkClass}><Home className="h-4 w-4" /></Link>

                        <div className="relative">
                            <button
                                onClick={() => setFeaturesOpen(v => !v)}
                                className={cn(navLinkClass, "inline-flex items-center gap-1", featuresOpen && "bg-slate-50 text-slate-900")}
                            >
                                Features <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", featuresOpen && "rotate-180")} />
                            </button>
                            {featuresOpen && (
                                <div className="absolute left-0 top-full mt-2 w-[560px] max-w-[90vw] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</span>
                                        <Link href="/features" onClick={() => setFeaturesOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                                            All features
                                        </Link>
                                    </div>
                                    <ul className="grid grid-cols-2 gap-1 p-3 max-h-[50vh] overflow-y-auto">
                                        {featureSets.map((feature) => (
                                            <li key={feature.slug}>
                                                <Link
                                                    href={`/features/${feature.slug}`}
                                                    onClick={() => setFeaturesOpen(false)}
                                                    className="flex items-start gap-3 rounded-md p-3 hover:bg-slate-50 transition-colors"
                                                >
                                                    <feature.icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">{feature.title}</div>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{feature.description}</p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <Link href="/industries" className={navLinkClass}>Industries</Link>
                        <Link href="/aura-ai" className={navLinkClass}>Aura AI</Link>
                        <Link href="/courses" className={navLinkClass}>Academy</Link>
                        <Link href="/help-centre" className={navLinkClass}>Help</Link>
                        <Link href="/blog" className={navLinkClass}>Journal</Link>
                    </nav>

                    <div className="hidden lg:flex items-center gap-2 shrink-0 ml-auto">
                        <Button variant="outline" size="sm" asChild className="font-medium border-slate-300">
                            <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a demo</a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="font-medium text-slate-600">
                            <Link href="/login">Log in</Link>
                        </Button>
                        <Button size="sm" asChild className="bg-slate-900 hover:bg-slate-800 text-white font-medium">
                            <Link href="/signup">Get started</Link>
                        </Button>
                        <ModeToggle />
                    </div>

                    <div className="lg:hidden flex items-center gap-1 ml-auto">
                        <button onClick={toggleDark} className="p-2 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Toggle theme">
                            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(v => !v)} className="p-2 rounded-md text-slate-600 hover:bg-slate-100" aria-label="Toggle menu">
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {isMobileMenuOpen && (
                <div className="fixed inset-x-0 top-16 bottom-0 z-[100] bg-white overflow-y-auto lg:hidden">
                    <div className="px-6 py-4">
                        <nav className="flex flex-col">
                            {[
                                { href: '/', label: 'Home' },
                                { href: '/features', label: 'Features' },
                                { href: '/industries', label: 'Industries' },
                                { href: '/aura-ai', label: 'Aura AI' },
                                { href: '/courses', label: 'Academy' },
                                { href: '/blog', label: 'Journal' },
                                { href: '/help-centre', label: 'Help centre' },
                            ].map(({ href, label }) => (
                                <Link key={href} href={href} className="py-3.5 border-b border-slate-100 text-base font-medium text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>
                                    {label}
                                </Link>
                            ))}
                        </nav>
                        <div className="flex flex-col gap-2.5 pt-5">
                            <Button asChild className="h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium">
                                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Create free account</Link>
                            </Button>
                            <Button variant="outline" asChild className="h-11 border-slate-300 font-medium">
                                <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Request a demo</a>
                            </Button>
                            <Button variant="ghost" asChild className="h-11 font-medium text-slate-600">
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Sign in</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────
const Hero = () => (
    <section className="pt-40 pb-20 sm:pt-48 sm:pb-28 border-b border-slate-100">
        <div className="container mx-auto px-6 max-w-4xl text-center">
            <Eyebrow>The business operating system</Eyebrow>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
                Run your business on one system, not ten
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
                Accounting, HR, CRM, and inventory in a single platform — built for a single kiosk
                today and a multi-branch operation tomorrow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 font-medium rounded-md">
                    <Link href="/signup">Start free trial</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-slate-300 h-12 px-8 font-medium rounded-md">
                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Talk to sales</a>
                </Button>
            </div>
            <p className="mt-6 text-sm text-slate-400">No credit card required · Built for businesses across Africa</p>
        </div>
    </section>
);

const TrustedBySection = () => (
    <section className="border-b border-slate-100 py-10 bg-slate-50/60">
        <div className="container mx-auto px-6 max-w-6xl">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-8">
                Built for businesses across Africa
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center text-slate-400">
                {[
                    { icon: Building, label: "Construction" },
                    { icon: Leaf, label: "Agriculture" },
                    { icon: Signal, label: "Telecom" },
                    { icon: Landmark, label: "Finance" },
                    { icon: Truck, label: "Logistics" },
                ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-2">
                        <Icon className="h-6 w-6" />
                        <span className="text-xs font-medium">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// ─────────────────────────────────────────────────────────────
// Platform pillars
// ─────────────────────────────────────────────────────────────
const PlatformSection = () => {
    const [active, setActive] = useState(0);
    const pillars = siteConfig.platformPillars;

    return (
        <Section id="platform">
            <div className="max-w-2xl mb-14">
                <Eyebrow>Platform</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                    Built to run your whole business
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                    One platform designed to simplify complexity and support growth, wherever you operate.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div className="space-y-3">
                    {pillars.map((pillar, index) => {
                        const isActive = active === index;
                        return (
                            <button
                                key={pillar.title}
                                onClick={() => setActive(index)}
                                className={cn(
                                    "w-full text-left rounded-lg border p-5 transition-colors",
                                    isActive ? "border-slate-900 bg-white shadow-sm" : "border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn("p-2 rounded-md shrink-0", isActive ? "bg-slate-900" : "bg-slate-100")}>
                                        <pillar.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-500")} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 mb-1">{pillar.title}</h3>
                                        {isActive && (
                                            <p className="text-sm text-slate-600 leading-relaxed">{pillar.description}</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="relative h-[320px] md:h-[440px] rounded-lg overflow-hidden border border-slate-200">
                    <Image src={pillars[active].image} alt={pillars[active].title} fill style={{ objectFit: 'cover' }} />
                </div>
            </div>
        </Section>
    );
};

// ─────────────────────────────────────────────────────────────
// In-action / modules showcase
// ─────────────────────────────────────────────────────────────
const slideshowContent = [
    { is_video: true, src: "/videos/BBU1 inventory management.mp4", title: "Inventory management", description: "Real-time stock tracking and automated auditing across every branch.", alt: "Inventory demo" },
    { src: "/images/showcase/construction-site.jpg", title: "Construction & project management", description: "Oversee projects on-site with real-time cost and progress data.", alt: "Construction managers" },
    { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom & mobile money", description: "A fast, secure system for agents to record and reconcile transactions.", alt: "Mobile money agent" },
    { src: "/images/showcase/local-shop-owner.jpg", title: "Retail & local commerce", description: "A complete point of sale and inventory system for daily sales and stock.", alt: "Shop owner" },
    { src: "/images/showcase/healthcare-team.jpg", title: "Healthcare & clinic management", description: "Digitize patient records, manage appointments, and track medical supplies.", alt: "Medical professionals" },
    { src: "/images/showcase/farmers-learning.jpg", title: "Agriculture & agribusiness", description: "Bring structured record-keeping to the field to track crops and yield.", alt: "Farmers" },
];

const InActionSection = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setIndex(p => (p + 1) % slideshowContent.length), 7000);
        return () => clearInterval(interval);
    }, []);

    const current = slideshowContent[index];

    return (
        <Section id="in-action" className="border-t border-slate-100">
            <div className="max-w-2xl mb-14">
                <Eyebrow>In practice</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                    One platform, every stage of business
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 relative rounded-lg overflow-hidden border border-slate-200 h-[300px] md:h-[440px] bg-white">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-1.5 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    </div>
                    <div className="absolute inset-0 pt-8 flex items-center justify-center">
                        {current.is_video ? (
                            <video autoPlay muted loop playsInline className="w-full h-full object-contain">
                                <source src={current.src} type="video/mp4" />
                            </video>
                        ) : (
                            <Image src={current.src} alt={current.alt} fill style={{ objectFit: 'contain' }} className="p-4" />
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wide mb-3">
                        Module
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{current.title}</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">{current.description}</p>
                    <div className="flex gap-2">
                        {slideshowContent.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                className={cn("h-1.5 rounded-full transition-all", index === i ? "bg-slate-900 w-8" : "bg-slate-200 w-2.5 hover:bg-slate-300")}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Section>
    );
};

// ─────────────────────────────────────────────────────────────
// Pricing — matches the standalone pricing page exactly
// ─────────────────────────────────────────────────────────────
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

const PLANS = [
    { name: "Business Starter", basePrice: 14, userLimit: "1 user", idealFor: "Kiosks & micro-shops", highlight: false, btnText: "Start free trial",
      features: ["Cloud POS", "Inventory tracking", "Daily sales reports", "Invoicing", "Mobile app access"] },
    { name: "Growth", basePrice: 42, userLimit: "2 users", idealFor: "Small shops & solo founders", highlight: false, btnText: "Start free trial",
      features: ["Full ERP core", "Mobile app", "Enterprise reports", "Invoicing system", "Cloud accounting", "Cloud auditing", "Complete tax filing"] },
    { name: "Scale SME", basePrice: 69, userLimit: "10 users", idealFor: "Growing SMEs & teams", highlight: true, btnText: "Start free trial",
      features: ["All industry modules", "Custom branding", "HR & payroll", "Inventory tracking", "Mobile app", "Enterprise reports", "Invoicing system", "Cloud accounting & auditing", "Complete tax filing"] },
    { name: "Enterprise ERP", basePrice: 122, userLimit: "Unlimited users", idealFor: "Large enterprises", highlight: false, btnText: "Contact sales",
      features: ["API access & webhooks", "Dedicated support manager", "On-premise option", "Custom branding", "Mobile app", "Enterprise reports", "Invoicing system", "Cloud accounting & auditing", "Complete tax filing"] },
];

const ALL_INCLUDED_MODULES = [
    "General ledger & journal", "Banking & reconciliation", "Multi-currency support", "Payroll & benefits admin",
    "Recruitment & onboarding", "Leave management", "Multi-warehouse management", "Purchase orders",
    "Serial & lot tracking", "Leads & opportunity pipeline", "Helpdesk & support tickets", "Sales forecasting",
];

const DynamicPricingSection = () => {
    const [currency, setCurrency] = useState(GEO_CURRENCIES['DEFAULT']);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        const detectLocation = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                let data: any = null;
                const endpoints = ['https://api.country.is', 'https://ipapi.co/json/', 'https://ip-api.com/json'];
                for (const url of endpoints) {
                    try {
                        const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
                        if (response.ok) { data = await response.json(); break; }
                    } catch { continue; }
                }
                clearTimeout(timeoutId);
                if (!data) throw new Error("no location data");
                const countryCode = (data.country_code || data.country || data.ip_country || '').toUpperCase();
                let detected;
                if (!countryCode) detected = GEO_CURRENCIES['DEFAULT'];
                else if (EUROZONE_COUNTRIES.includes(countryCode)) detected = GEO_CURRENCIES['EU'];
                else detected = GEO_CURRENCIES[countryCode] || GEO_CURRENCIES['DEFAULT'];
                setCurrency(detected);
            } catch {
                setCurrency(GEO_CURRENCIES['DEFAULT']);
            } finally {
                setLoading(false);
            }
        };
        detectLocation();
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
        <Section id="pricing" className="border-t border-slate-100">
            <div className="max-w-2xl mb-4">
                <Eyebrow>Pricing</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-5">
                    Simple pricing that scales with you
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                    Every plan includes the same core engine — AI assistant, offline sync, and
                    multi-currency support. You only pay more as your team grows.
                </p>
            </div>

            <div className="flex items-center gap-4 mb-12">
                <span className={cn("text-sm font-semibold", billingCycle === 'monthly' ? "text-slate-900" : "text-slate-400")}>Monthly</span>
                <button
                    onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                    className={cn("relative w-11 h-6 rounded-full transition-colors", billingCycle === 'yearly' ? "bg-slate-900" : "bg-slate-200")}
                >
                    <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", billingCycle === 'yearly' ? "translate-x-5" : "translate-x-0.5")} />
                </button>
                <span className={cn("text-sm font-semibold flex items-center gap-2", billingCycle === 'yearly' ? "text-slate-900" : "text-slate-400")}>
                    Annual <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">Save 20%</span>
                </span>
                {loading && <span className="text-xs text-slate-400">Detecting your currency…</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-16 items-start">
                {PLANS.map((plan) => (
                    <Card
                        key={plan.name}
                        className={cn(
                            "rounded-lg overflow-hidden transition-shadow",
                            plan.highlight ? "border-2 border-slate-900 shadow-md" : "border border-slate-200 hover:border-slate-300"
                        )}
                    >
                        {plan.highlight && (
                            <div className="bg-slate-900 text-white text-xs font-semibold text-center py-1.5">
                                Most popular
                            </div>
                        )}
                        <CardHeader className="p-6 pb-4">
                            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{plan.idealFor}</p>
                            <div className="mt-5 flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-900">{currency.symbol} {formatPrice(plan.basePrice)}</span>
                                <span className="text-slate-500 text-sm">/mo</span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1">{plan.userLimit}</p>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <Button
                                className={cn(
                                    "w-full h-10 rounded-md font-medium text-sm mb-6",
                                    plan.highlight ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
                                )}
                                asChild
                            >
                                <Link href="/signup">{plan.btnText}</Link>
                            </Button>
                            <ul className="space-y-2.5">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                                        <Check className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="border-t border-slate-200 pt-14">
                <h3 className="text-xl font-bold text-slate-900 mb-8">Included in every plan</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
                    {ALL_INCLUDED_MODULES.map((item) => (
                        <div key={item} className="flex items-start gap-3 text-slate-600 text-sm">
                            <Check className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-14 pt-8 border-t border-slate-200">
                <p className="text-slate-500 text-sm leading-relaxed">
                    Prices exclude local VAT/GST where applicable. Local currency is applied automatically at checkout.
                    Looking for a private server or white-label setup?{' '}
                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-slate-900 font-medium hover:underline">
                        Talk to enterprise sales
                    </a>.
                </p>
            </div>
        </Section>
    );
};

// ─────────────────────────────────────────────────────────────
// Partner with us
// ─────────────────────────────────────────────────────────────
const PartnerWithUsSection = () => {
    const [formData, setFormData] = useState({ name: '', org: '', email: '', phone: '', details: '' });
    const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (formErrors[e.target.name as 'name' | 'email']) {
            setFormErrors(prev => ({ ...prev, [e.target.name]: undefined }));
        }
    };

    const resetForm = () => { setFormData({ name: '', org: '', email: '', phone: '', details: '' }); setFormErrors({}); };

    const validateContactFields = () => {
        const errors: { name?: string; email?: string } = {};
        if (!formData.name.trim()) errors.name = "Enter your full name.";
        if (!formData.email.trim() || !formData.email.includes('@')) errors.email = "Enter a valid email address.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEmailTrigger = (type: string) => {
        if (!validateContactFields()) return;
        const subject = `BBU1 ${type} partnership inquiry: ${formData.name}`;
        const body =
            `Name: ${formData.name}\n` +
            `Organization: ${formData.org}\n` +
            `Email: ${formData.email}\n` +
            `Phone: ${formData.phone}\n\n` +
            `${formData.details}`;
        window.open(`mailto:contact@bbu1.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    };

    const handleWhatsAppSubmit = () => {
        const text = `Hello BBU1 team, I'm interested in becoming an affiliate partner.`;
        window.open(`https://wa.me/256703572503?text=${encodeURIComponent(text)}`, '_blank');
    };

    const affiliateDialogContent = (
        <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
                <DialogTitle>Affiliate program</DialogTitle>
                <DialogDescription>Earn recurring commission by referring businesses to BBU1.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5 text-sm text-slate-600">
                    <p>1. You receive a unique referral code.</p>
                    <p>2. A business signs up using your code.</p>
                    <p>3. You earn a commission each month they stay subscribed.</p>
                </div>
                <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium" onClick={handleWhatsAppSubmit}>
                    Chat on WhatsApp
                </Button>
            </div>
        </DialogContent>
    );

    const contactDialogContent = (title: string, description: string, placeholder: string, onSubmit: () => void, submitLabel: string) => (
        <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Full name *</label>
                        <Input name="name" value={formData.name} onChange={handleInputChange} className={cn(formErrors.name && "border-red-400")} />
                        {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Organization</label>
                        <Input name="org" value={formData.org} onChange={handleInputChange} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Email *</label>
                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} className={cn(formErrors.email && "border-red-400")} />
                        {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Phone</label>
                        <Input name="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Details</label>
                    <textarea
                        name="details"
                        value={formData.details}
                        placeholder={placeholder}
                        onChange={handleInputChange}
                        className="flex min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    />
                </div>
                <Button onClick={onSubmit} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium">
                    {submitLabel}
                </Button>
            </div>
        </DialogContent>
    );

    const partnerOptions = [
        { key: 'affiliate', icon: Megaphone, title: "Affiliate partner", subtitle: "For marketers & influencers",
          copy: "Refer businesses to BBU1 and earn recurring commission for the lifetime of the customer.",
          points: ["Up to 20% recurring commission", "Marketing assets provided"],
          dialog: affiliateDialogContent, cta: "Start earning" },
        { key: 'investor', icon: TrendingUp, title: "Strategic investor", subtitle: "For VCs & angel investors",
          copy: "Invest in the infrastructure powering commerce for growing businesses across the region.",
          points: ["High-growth SaaS metrics", "Scalable technology stack"],
          dialog: contactDialogContent("Investor inquiry", "Connect with our founders directly.", "We're interested in Series A opportunities...", () => handleEmailTrigger('Investor'), "Send inquiry via email"),
          cta: "Investor relations" },
        { key: 'solution', icon: GitBranch, title: "Solution partner", subtitle: "For developers & agencies",
          copy: "Build on top of BBU1. Implement the platform for your clients or build custom integrations.",
          points: ["Developer API access", "Implementation revenue share"],
          dialog: contactDialogContent("Solution partnership", "Integrate, resell, or build on BBU1.", "We want to integrate BBU1 for our retail clients...", () => handleEmailTrigger('Solution Partner'), "Submit proposal via email"),
          cta: "Build with us" },
    ];

    return (
        <Section id="partner" className="bg-slate-50/60 border-t border-slate-100">
            <div className="max-w-2xl mb-14">
                <Eyebrow>Ecosystem</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-5">Partner with BBU1</h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                    We're building the infrastructure for business commerce. Whether you want to earn,
                    invest, or build, there's a place for you in the ecosystem.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
                {partnerOptions.map((opt) => (
                    <Card key={opt.key} className="border border-slate-200 hover:border-slate-300 transition-colors rounded-lg">
                        <CardHeader className="p-6 pb-4">
                            <div className="h-11 w-11 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
                                <opt.icon className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg">{opt.title}</CardTitle>
                            <CardDescription>{opt.subtitle}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <p className="text-sm text-slate-600 leading-relaxed">{opt.copy}</p>
                            <ul className="space-y-2 text-sm text-slate-600">
                                {opt.points.map((p) => (
                                    <li key={p} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-slate-400 shrink-0" /> {p}
                                    </li>
                                ))}
                            </ul>
                            <Dialog onOpenChange={(open) => { if (open && opt.key !== 'affiliate') resetForm(); }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-slate-300">
                                        {opt.cta} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                {opt.dialog}
                            </Dialog>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </Section>
    );
};

// ─────────────────────────────────────────────────────────────
// Company section
// ─────────────────────────────────────────────────────────────
const AboutCompanySection = () => (
    <Section className="border-t border-slate-100">
        <div className="grid lg:grid-cols-12 gap-16 items-center mb-24">
            <div className="lg:col-span-7 space-y-6">
                <Eyebrow>Company</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                    A single operating layer for business
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                    BBU1 is a business operating system: a unified environment where accounting, HR,
                    inventory, and CRM run on one core, instead of a dozen disconnected tools.
                </p>
                <p className="text-slate-600 leading-relaxed max-w-xl">
                    Our goal is for businesses of any size — a single kiosk or a multi-branch company —
                    to operate on the same secure, modern foundation.
                </p>
            </div>
            <div className="lg:col-span-5 relative aspect-[4/5] rounded-lg overflow-hidden border border-slate-200">
                <Image src="/images/showcase/Greeting (22).jpeg" alt="BBU1 team" fill className="object-cover" />
            </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 mb-24">
            <div className="space-y-4">
                <Eyebrow>Mission</Eyebrow>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Remove operational friction</h3>
                <p className="text-slate-600 leading-relaxed">
                    We build unified infrastructure that lets businesses scale without sacrificing data
                    integrity, cutting the hidden cost of disconnected tools.
                </p>
            </div>
            <div className="space-y-4">
                <Eyebrow>Vision</Eyebrow>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">A common operating layer</h3>
                <p className="text-slate-600 leading-relaxed">
                    A world where even the smallest local business runs on the same digital foundation
                    as a global company.
                </p>
            </div>
        </div>

        <div className="mb-24">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">Principles</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { title: "Technical integrity", desc: "Every line of code has to hold up under real use." },
                    { title: "Data sovereignty", desc: "Your business data belongs to you — that's a firm boundary." },
                    { title: "Strategic purpose", desc: "Every feature is meant to solve a real business problem." },
                    { title: "Global accessibility", desc: "Enterprise-grade tools should be within reach for any business." }
                ].map((v) => (
                    <div key={v.title} className="p-6 bg-white border border-slate-200 rounded-lg">
                        <h4 className="text-slate-900 font-semibold mb-2">{v.title}</h4>
                        <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-1/3 relative h-[280px] lg:h-auto bg-slate-100">
                <Image src="/images/showcase/Photo Background Edi (4).jpeg" alt="Founder" fill className="object-cover object-top" />
            </div>
            <div className="lg:w-2/3 p-8 lg:p-12 space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">A note from the founder</h3>
                    <p className="text-slate-500 text-sm font-medium mt-1">Mwesigwa Jimmy · Founder</p>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                    <p>
                        My work started with a focus on foundations, supported by my family and community
                        in Uganda. Growth only holds up when the base underneath it is solid.
                    </p>
                    <p>
                        I started BBU1 to build that foundation for other businesses — from local markets
                        to larger offices, running on the same digital tools.
                    </p>
                </div>
                <Button asChild variant="outline" className="border-slate-300">
                    <a href="mailto:ceo@bbu1.com">Get in touch <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
            </div>
        </div>
    </Section>
);

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────
const SiteFooter = () => (
    <footer className="border-t border-slate-100 py-14">
        <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                <div>
                    <p className="font-bold text-slate-900 mb-3">{siteConfig.name}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">The operating system for your business.</p>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Product</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><Link href="/features" className="hover:text-slate-900">Features</Link></li>
                        <li><Link href="/pricing" className="hover:text-slate-900">Pricing</Link></li>
                        <li><Link href="/industries" className="hover:text-slate-900">Industries</Link></li>
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Company</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><Link href="/blog" className="hover:text-slate-900">Journal</Link></li>
                        <li><Link href="/help-centre" className="hover:text-slate-900">Help centre</Link></li>
                        <li><a href="mailto:info@bbu1.com" className="hover:text-slate-900">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Get started</p>
                    <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                        <Link href="/signup">Start free trial</Link>
                    </Button>
                </div>
            </div>
            <div className="pt-8 border-t border-slate-100 text-xs text-slate-400">
                © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </div>
        </div>
    </footer>
);

// ─────────────────────────────────────────────────────────────
// AI chat widget
// ─────────────────────────────────────────────────────────────
const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userContext, setUserContext] = useState<{ businessId: string | null; userId: string | null }>({ businessId: null, userId: null });
    const [chatInput, setChatInput] = useState('');

    const { messages, setMessages, append, isLoading }: any = useChat({ api: '/api/chat', body: { businessId: userContext.businessId, userId: userContext.userId } } as any);

    useEffect(() => {
        setUserContext({ businessId: getCookie('business_id'), userId: getCookie('user_id') });
    }, []);

    useEffect(() => {
        if (messages.length === 0 && setMessages) {
            setMessages([{ id: 'initial', role: 'assistant', content: 'Hello — I\'m Aura, your business copilot. How can I help?' }]);
        }
    }, [messages.length, setMessages]);

    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = chatInput.trim();
        if (!trimmed || isLoading) return;
        append({ content: trimmed, role: 'user' });
        setChatInput('');
    };

    const isDisabled = isLoading || !userContext.userId || !userContext.businessId;

    return (
        <>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[380px] h-[560px] z-50">
                    <Card className="h-full w-full flex flex-col border border-slate-200 shadow-xl rounded-lg overflow-hidden">
                        <CardHeader className="flex-row items-center justify-between border-b border-slate-100 p-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4" /> Aura copilot</CardTitle>
                                <CardDescription className="text-xs">Your AI business analyst</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-0">
                            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                <div className="space-y-4">
                                    {messages.map((m: any, i: number) => (
                                        <div key={i} className={cn('flex items-start gap-2.5 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                            {m.role === 'assistant' && <Avatar className="h-7 w-7"><AvatarFallback className="bg-slate-100 text-slate-600 text-xs">A</AvatarFallback></Avatar>}
                                            <div className={cn('rounded-lg p-3 max-w-[85%] break-words text-sm', m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-100 text-slate-700')}>
                                                {m.content as string}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-start gap-2.5 text-sm">
                                            <Avatar className="h-7 w-7"><AvatarFallback className="bg-slate-100 text-slate-600 text-xs">A</AvatarFallback></Avatar>
                                            <div className="rounded-lg p-3 bg-slate-50 border border-slate-100 text-slate-500 flex items-center gap-2">
                                                Thinking <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            </div>
                                        </div>
                                    )}
                                    {(!userContext.businessId || !userContext.userId) && !isLoading && (
                                        <div className="text-center text-slate-500 text-sm p-4 border border-slate-100 rounded-lg bg-slate-50">
                                            Log in to use the AI assistant.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="p-3 border-t border-slate-100">
                                <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                                    <Input
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder={isDisabled ? "Please log in…" : "Ask Aura anything…"}
                                        disabled={isDisabled}
                                    />
                                    <Button type="submit" size="icon" disabled={isDisabled || !chatInput.trim()} className="bg-slate-900 hover:bg-slate-800">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg z-50" aria-label={isOpen ? "Close AI copilot" : "Open AI copilot"}>
                {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
            </Button>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
    const supabase = createClient();
    const [mounted, setMounted] = useState(false);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);
    const [toastState, setToastState] = useState<ToastState>({ visible: false, message: '' });

    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce(
        (acc, cat) => ({ ...acc, [cat.id]: cat.defaultChecked }), {} as CookiePreferences
    );
    const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(initialCookiePreferences);

    const showToast = useCallback((message: string) => {
        setToastState({ visible: true, message });
        setTimeout(() => setToastState({ visible: false, message: '' }), TOAST_DURATION);
    }, []);

    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => {
        // Hook up analytics/marketing scripts here based on prefs.
    }, []);

    const handleAcceptAllCookies = useCallback(() => {
        const allTrue: CookiePreferences = { essential: true, analytics: true, marketing: true };
        setCookiePreferences(allTrue);
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(allTrue), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        applyCookiePreferences(allTrue);
        showToast("All cookies accepted.");
    }, [applyCookiePreferences, showToast]);

    const handleSaveCookiePreferences = useCallback(() => {
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(cookiePreferences), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(cookiePreferences);
        showToast("Preferences saved.");
    }, [cookiePreferences, applyCookiePreferences, showToast]);

    useEffect(() => {
        setMounted(true);

        const trackVisitor = async () => {
            if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') return;
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
                console.error("Telemetry failure", err);
            }
        };
        trackVisitor();
    }, [supabase]);

    useEffect(() => {
        const consentCookie = getCookie(COOKIE_CONSENT_NAME);
        if (!consentCookie) {
            setShowCookieBanner(true);
        } else {
            try {
                applyCookiePreferences(JSON.parse(consentCookie));
            } catch {
                setShowCookieBanner(true);
            }
        }
    }, [applyCookiePreferences]);

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
            <NewsletterPopup />
            <SiteHeader />
            <main className="grow">
                <Hero />
                <TrustedBySection />
                <PlatformSection />
                <InActionSection />
                <DynamicPricingSection />
                <PartnerWithUsSection />
                <AboutCompanySection />
            </main>
            <SiteFooter />

            {mounted && <AdvancedChatWidget />}
            <Toast message={toastState.message} isVisible={toastState.visible} />

            {mounted && showCookieBanner && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
                    <Card className="max-w-xl mx-auto border border-slate-200 shadow-xl rounded-lg max-h-[80vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="h-5 w-5 text-slate-600" /> Privacy choice
                            </CardTitle>
                            <CardDescription className="text-sm">
                                We use cookies to run the site, understand traffic, and personalize content.
                                Essential cookies are always active.
                            </CardDescription>
                        </CardHeader>
                        {!isCustomizingCookies ? (
                            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-0">
                                <Button variant="outline" className="border-slate-300" onClick={() => setIsCustomizingCookies(true)}>Customize</Button>
                                <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleAcceptAllCookies}>Accept all</Button>
                            </CardFooter>
                        ) : (
                            <CardContent className="space-y-4 pt-0">
                                {siteConfig.cookieCategories.map(category => (
                                    <div key={category.id} className="flex items-start gap-3 py-2 border-t border-slate-100 first:border-t-0">
                                        <Checkbox
                                            id={category.id}
                                            checked={cookiePreferences[category.id]}
                                            onCheckedChange={() => setCookiePreferences(prev => ({ ...prev, [category.id]: !prev[category.id] }))}
                                            disabled={category.isRequired}
                                        />
                                        <div className="grid gap-1 leading-none">
                                            <label htmlFor={category.id} className="text-sm font-medium text-slate-800">{category.name}</label>
                                            <p className="text-sm text-slate-500">{category.description}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                    <Button variant="outline" className="border-slate-300" onClick={() => setIsCustomizingCookies(false)}>Back</Button>
                                    <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveCookiePreferences}>Save preferences</Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}