'use client';

import React, { useState, useRef, forwardRef, type ReactNode, type ElementRef, type ComponentPropsWithoutRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
// --- Vercel AI SDK Imports ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage, type ImagePart } from 'ai'; // Explicitly import ImagePart from 'ai'
// --- UI Components from shadcn/ui ---
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Import Avatar and AvatarFallback for chat UI
// --- Utils & Icons ---
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, BrainCircuit, Facebook, Handshake, Home, ShieldCheck, TrendingUp,
    Landmark, Leaf, Linkedin, LucideIcon, Menu,
    Rocket, Send, Signal, Store, Twitter,
    Users, Utensils, WifiOff, X, ArrowRight,
    Zap, ShieldHalf, LayoutGrid, Lightbulb,
    Wallet, ClipboardList, Package, UserCog, Files,
    Download, Share, Sparkles, Loader2 // Added Sparkles and Loader2 for chat UI
} from 'lucide-react';

// --- Global Type Declarations for external scripts (for TypeScript) ---
declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
        fbq: (...args: any[]) => void;
        _fbq: any;
    }
}

// Ensure gtag and dataLayer are initialized early to prevent errors if scripts haven't loaded yet
if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
    window.fbq = window.fbq || function() { /* no-op */ }; // Initialize as no-op to prevent errors
}

// --- Type Definitions ---
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface IndustryItem { name: string; icon: LucideIcon; description: string; }
interface IndustryCategory { category: string; items: IndustryItem[]; }
interface FaqItem { q: string; a: ReactNode; }
interface WhyUsItem { icon: LucideIcon; title: string; description: string; }

// --- Cookie Consent Types ---
type CookieCategoryKey = 'essential' | 'analytics' | 'marketing';
interface CookieCategoryInfo {
    id: CookieCategoryKey;
    name: string;
    description: string;
    isRequired: boolean; // Cannot be unchecked
    defaultChecked: boolean;
}
type CookiePreferences = {
    [key in CookieCategoryKey]: boolean;
};

// Helper to set a cookie
const setCookie = (name: string, value: string, days: number) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

// Helper to get a cookie
const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};

// Helper to clear a cookie (set expiry to past)
const clearCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; Max-Age=-99999999; path=/;SameSite=Lax`;
};

// --- Centralized Site Configuration ---
const siteConfig = {
    name: "BBU1",
    shortDescription: "Your all-in-one OS for global business. Unify accounting, CRM, inventory, and AI insights. Built in Africa, for the world.",
    url: "https://www.bbu1.com/",
    inventorCredit: "Invented by Mwesigwa Jimmy in Uganda. Built for the world.",
    analytics: {
        gaMeasurementId: 'G-YOUR_GA_MEASUREMENT_ID',
        fbPixelId: 'YOUR_FACEBOOK_PIXEL_ID',
    },
    contactInfo: {
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
        socials: { linkedin: '#', twitter: '#', facebook: '#' }
    },
    featureItems: [
        { icon: Wallet, title: "Autonomous Bookkeeping", description: "A complete, GAAP-compliant, double-entry accounting system that runs itself. From automated journal entries to one-click financial statements." },
        { icon: Package, title: "Unified POS & Inventory", description: "An unstoppable, offline-first POS integrated with multi-location inventory. Manage stock, variants, purchase orders, and sales from a single command center." },
        { icon: ClipboardList, title: "CRM & Project Hub", description: "Go from lead to paid project without leaving the platform. Manage clients, track project status on a visual Kanban board, and link every document to its source." },
        { icon: UserCog, title: "HCM & Payroll", description: "Hire, manage, and pay your team from a single system. Handle payroll, leave, performance, and provide a dedicated portal for your employees." },
        { icon: Files, title: "Secure Document Fortress", description: "A revolutionary, multi-tenant file explorer for your most sensitive data. Bank-level security and row-level policies make it architecturally impossible for data to cross between tenants." },
        { icon: Lightbulb, title: "AI Business Copilot", description: "Get proactive, data-driven insights on cash flow, client trends, and fraud detection, helping you make smarter decisions, faster."}
    ] as FeatureItem[],
    standoutItems: [
        { icon: TrendingUp, title: "Built to Scale With You", description: "BBU1 is architected for growth. Whether you're a solo entrepreneur or a global enterprise, our platform scales seamlessly to meet your demands without compromising performance." },
        { icon: LayoutGrid, title: "A Single Source of Truth", description: "Eliminate data silos forever. By unifying every department—from sales and accounting to inventory and HR—you get a real-time, 360-degree view of your entire operation." },
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Internet down? Power outage? No problem. BBU1's core functions work perfectly offline, ensuring business continuity and revenue protection. Everything syncs the moment you're back online." },
        { icon: Zap, title: "End Subscription Chaos", description: "Replace 5+ expensive, disconnected apps with one intelligent, cost-effective platform. Simplify your workflow, reduce costs, and remove the headache of integration." },
        { icon: BrainCircuit, title: "True AI Partnership", description: "Our integrated AI is not just a feature; it's a strategic partner. It analyzes your data to find growth opportunities, predict cash flow, and identify risks before they become problems." },
        { icon: ShieldHalf, title: "Bank-Level Security", description: "Your data is your most valuable asset. We protect it with a multi-tenant architecture and end-to-end encryption, ensuring your information is completely isolated and secure." }
    ] as WhyUsItem[],
    industrySolutions: [
        {
            category: "Common",
            items: [
                { name: "Retail / Wholesale", icon: Store, description: "Full-scale inventory management, barcode scanning, multi-location stock, and robust sales reporting for any retail environment." },
                { name: "Restaurant / Cafe", icon: Utensils, description: "Complete restaurant management with Kitchen Display System (KDS) integration, table management, and ingredient-level tracking." },
                { name: "Trades & Services", icon: Handshake, description: "Manage appointments, dispatch jobs, handle client data, and create professional service invoices with ease." }
            ]
        },
        {
            category: "Specialized Industries",
            items: [
                { name: "Professional Services (Accounting, Legal)", icon: Landmark, description: "Time tracking, case management, and secure document handling for firms that demand precision and confidentiality." },
                { name: "Lending / Microfinance", icon: Banknote, description: "A robust solution to streamline member management, automate loan processing, and ensure regulatory reporting at scale." },
                { name: "Telecom Services", icon: Signal, description: "Specialized tools for airtime distribution, agent management, and commission tracking for carriers like MTN and Airtel." }
            ]
        }
    ] as IndustryCategory[],
    faqItems: [
       { q: 'How does the AI Copilot deliver insights?', a: 'The AI Copilot securely analyzes your company-wide data to find patterns. It provides simple, actionable insights like "Consider bundling Product A and B" or "Cash flow projected to be low in 3 weeks."' },
       { q: 'Is my enterprise data secure?', a: 'Yes. BBU1 uses a-tenant architecture with PostgreSQL\'s Row-Level Security. Your data is completely isolated and protected by bank-level, end-to-end encryption.' },
       { q: 'Can the system be customized?', a: 'Absolutely. While powerful out-of-the-box, we offer customization services and API access for enterprise clients to tailor the system to your unique workflows.' },
       { q: 'What kind of support is offered?', a: 'Enterprise plans include dedicated onboarding, an account manager, priority support via WhatsApp or phone, and a Service Level Agreement (SLA) guaranteeing uptime.' },
    ] as FaqItem[],
    termsOfService: ( <div className="space-y-4 text-sm"><p>Welcome to BBU1. These Terms govern your use of our Service. By using our Service, you agree to these terms...</p></div> ),
    privacyPolicy: (
        <div className="space-y-4 text-sm">
            <h3 className="text-lg font-bold">Privacy Policy</h3>
            <p>This Privacy Policy describes how BBU1 ("we", "us", or "our") collects, uses, and discloses your information when you use our website and services.</p>
        </div>
    ),
    cookieCategories: [
        {
            id: 'essential',
            name: 'Essential Cookies',
            description: 'These cookies are crucial for the website to function properly and cannot be switched off in our systems.',
            isRequired: true,
            defaultChecked: true,
        },
        {
            id: 'analytics',
            name: 'Analytics Cookies',
            description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.',
            isRequired: false,
            defaultChecked: false,
        },
        {
            id: 'marketing',
            name: 'Marketing Cookies',
            description: 'These cookies may be set through our site by our advertising partners to show you relevant adverts on other sites.',
            isRequired: false,
            defaultChecked: false,
        }
    ] as CookieCategoryInfo[],
};

// --- Animation Variants ---
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const textVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } } };
const slideTextVariants: Variants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } }, exit: { opacity: 0, x: 20, transition: { duration: 0.5, ease: "easeIn" } } };
const backgroundVariants: Variants = { animate: (index: number) => ({ scale: [1, 1.05, 1], x: [`${index % 2 * -2}%`, '0%', `${index % 3 * 2}%`], y: [`${index % 2 * -2}%`, '0%', `${index % 3 * 2}%`], transition: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" } }) };

// --- Reusable Modal Component ---
interface DetailModalProps { trigger: ReactNode; title: string; description: ReactNode; icon?: LucideIcon; }
const DetailModal = ({ trigger, title, description, icon: Icon }: DetailModalProps) => ( <Dialog> <DialogTrigger asChild>{trigger}</DialogTrigger> <DialogContent className="sm:max-w-lg"> <DialogHeader> <div className="flex items-center gap-4"> {Icon && ( <div className="bg-primary/10 p-3 rounded-md w-fit"> <Icon className="h-6 w-6 text-primary" /> </div> )} <div className="flex-1"> <DialogTitle className="text-xl">{title}</DialogTitle> </div> </div> </DialogHeader> <div className="py-4 text-muted-foreground">{description}</div> </DialogContent> </Dialog> );

// --- Header ---
const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
        }
        const isIosDevice = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIos(isIosDevice);
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            }
        };
    }, []);

    const handleInstallClick = useCallback(async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
    }, [deferredPrompt]);

    const showAnyInstallButton = !isStandalone;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur-md">
            <div className="container mx-auto h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2" aria-label={`${siteConfig.name} Home`}>
                    <Rocket className="h-6 w-6" /> {siteConfig.name}
                </Link>
                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-1 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                    {siteConfig.featureItems.map((feature) => (
                                        <DetailModal
                                            key={feature.title}
                                            title={feature.title}
                                            icon={feature.icon}
                                            description={feature.description}
                                            trigger={
                                                <li className="cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent-foreground focus:bg-accent/10 focus:text-accent-foreground group">
                                                    <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                        <feature.icon className="h-4 w-4 text-primary" /> {feature.title}
                                                    </div>
                                                </li>
                                            }
                                        />
                                    ))}
                                </ul >
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Industries</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ScrollArea className="h-[400px] w-[350px] p-2">
                                    <ul className="grid grid-cols-1 gap-1 p-2">
                                        {siteConfig.industrySolutions.map((category) => (
                                            <React.Fragment key={category.category}>
                                                <p className="font-bold text-xs text-muted-foreground uppercase p-2 pt-4">{category.category}</p>
                                                {category.items.map((solution) => (
                                                    <DetailModal
                                                        key={solution.name}
                                                        title={solution.name}
                                                        icon={solution.icon}
                                                        description={solution.description}
                                                        trigger={
                                                            <li className="cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent-foreground focus:bg-accent/10 focus:text-accent-foreground group">
                                                                <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                                    <solution.icon className="h-4 w-4 text-primary" /> {solution.name}
                                                                </div>
                                                            </li>
                                                        }
                                                    />
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
                <div className="hidden lg:flex items-center gap-2">
                    {showAnyInstallButton && (
                        <>
                            {isIos ? (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="flex items-center gap-2"><Download className="h-4 w-4" /> Install App</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Install BBU1 on your iOS Device</DialogTitle>
                                            <DialogDescription className="pt-4 space-y-2 text-left">
                                                <p>To install the app, please follow these simple steps:</p>
                                                <ol className="list-decimal list-inside space-y-3">
                                                    <li>Tap the <Share className="h-5 w-5 inline-block mx-1" /> icon in the Safari menu bar.</li>
                                                    <li>Scroll down and tap on <strong>'Add to Home Screen'</strong>.</li>
                                                    <li>Confirm by tapping <strong>'Add'</strong> in the top right.</li>
                                                </ol>
                                            </DialogDescription>
                                        </DialogHeader>
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Button variant="outline" className="flex items-center gap-2" onClick={handleInstallClick} disabled={!deferredPrompt} title={!deferredPrompt ? "Installation not available yet" : "Install App"}>
                                    <Download className="h-4 w-4" /> Install App
                                </Button>
                            )}
                        </>
                    )}
                    <Button variant="ghost" asChild className="hover:text-primary"><Link href="/login">Log In</Link></Button>
                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                    <ModeToggle />
                </div>
                <div className="lg:hidden flex items-center gap-2">
                     {showAnyInstallButton && !isIos && (
                         <Button variant="ghost" size="icon" onClick={handleInstallClick} disabled={!deferredPrompt} aria-label="Install App">
                            <Download className="h-6 w-6" />
                        </Button>
                     )}
                    <ModeToggle />
                    <Button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} variant="ghost" size="icon" aria-label="Toggle mobile menu">{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</Button>
                </div>
            </div>
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="lg:hidden p-4 border-t bg-background overflow-hidden">
                         <nav className="flex flex-col gap-4 text-lg">
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="features">
                                    <AccordionTrigger className="text-lg hover:no-underline">Features</AccordionTrigger>
                                    <AccordionContent className="flex flex-col gap-2 pl-4">
                                        {siteConfig.featureItems.map(feature => (
                                            <DetailModal key={feature.title} title={feature.title} icon={feature.icon} description={feature.description}
                                                trigger={<Button variant="ghost" className="justify-start gap-2 w-full"><feature.icon className="h-4 w-4 text-primary" /> {feature.title}</Button>}
                                            />
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="industries">
                                    <AccordionTrigger className="text-lg hover:no-underline">Industries</AccordionTrigger>
                                    <AccordionContent className="flex flex-col gap-2 pl-4">
                                         {siteConfig.industrySolutions.map((category) => (
                                            <React.Fragment key={category.category}>
                                                <p className="font-bold text-xs text-muted-foreground uppercase p-2 pt-0">{category.category}</p>
                                                {category.items.map((solution) => (
                                                    <DetailModal key={solution.name} title={solution.name} icon={solution.icon} description={solution.description}
                                                        trigger={<Button variant="ghost" className="justify-start gap-2 w-full"><solution.icon className="h-4 w-4 text-primary" /> {solution.name}</Button>}
                                                    />
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            <div className="border-t my-4"></div>
                            <Button variant="ghost" asChild className="w-full"><Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link></Button>
                            <Button asChild className="w-full"><Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link></Button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

// --- Footer Component ---
const LandingFooter = ({ onManageCookies }: { onManageCookies: () => void }) => (
    <footer className="relative border-t bg-gradient-to-t from-background/50 via-background to-background/90 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 pt-12 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-6 w-6" /> {siteConfig.name}</h3>
                    <p className="text-sm text-muted-foreground mt-4 max-w-xs">{siteConfig.shortDescription}</p>
                    <div className="flex items-center gap-5 mt-6">
                        <a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={20} /></a>
                        <a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20} /></a>
                        <a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></a>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-3">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">Features</span></li>
                        <li><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">Industries</span></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-3">Company</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">Contact Sales</a></li>
                        <li><Link href="#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-3">Legal</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left transition-colors">Terms of Service</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Terms of Service</DialogTitle></DialogHeader>{siteConfig.termsOfService}</DialogContent></Dialog></li>
                        <li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left transition-colors">Privacy Policy</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader>{siteConfig.privacyPolicy}</DialogContent></Dialog></li>
                        <li><button onClick={onManageCookies} className="text-muted-foreground hover:text-primary text-left transition-colors">Manage Cookie Preferences</button></li>
                    </ul>
                </div>
            </div>
            <div className="border-t mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
                <p className="mt-3 sm:mt-0">Made with <Leaf className="inline h-3 w-3 text-green-500" /> in Kampala, Uganda.</p>
            </div>
        </div>
    </footer>
);

// --- Reusable Animated Section Component ---
const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => ( <motion.section id={id} className={cn("relative py-16 sm:py-20 overflow-hidden", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}> <div className="container mx-auto px-4 relative z-10">{children}</div> </motion.section> );

// --- AI Chat Widget ---
const renderMessageContent = (content: CoreMessage['content']): ReactNode => {
    if (typeof content === 'string') {
        return content;
    }
    return content.map((part, index) => {
        if (part.type === 'text') {
            return <React.Fragment key={index}>{part.text}</React.Fragment>;
        }
        if (part.type === 'image') {
            const imagePart = part as ImagePart;
            let imageUrl: string | undefined;

            if (typeof imagePart.image === 'string') {
                imageUrl = imagePart.image;
            } else if (imagePart.image instanceof URL) {
                imageUrl = imagePart.image.toString();
            }

            if (imageUrl) {
                return <img key={index} src={imageUrl} alt="AI generated image" className="max-w-full h-auto rounded-md my-2" />;
            }
        }
        return null;
    }).filter(Boolean);
};

const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userContext, setUserContext] = useState({ businessId: '', userId: '' });
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        const businessId = getCookie('business_id');
        const userId = getCookie('user_id'); 
        if (businessId && userId) setUserContext({ businessId, userId });
    }, []);

    const { 
        messages, 
        setMessages, 
        sendMessage, 
        isLoading 
    }: any = useChat({
        api: '/api/chat', 
        body: { businessId: userContext.businessId, userId: userContext.userId },
        onError: (error: Error) => console.error("Chat error:", error),
    } as any);

    useEffect(() => {
        if (messages.length === 0 && setMessages) {
            setMessages([{ id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' }]);
        }
    }, [messages.length, setMessages]);

    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = chatInput.trim();
        if (!trimmedInput || !userContext.userId || !userContext.businessId) return;

        sendMessage({ content: trimmedInput, role: 'user' });
        setChatInput('');
    };

    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const canSend = !isLoading && chatInput.trim() && userContext.userId && userContext.businessId;
    const isDisabled = isLoading || !userContext.userId || !userContext.businessId;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-50">
                        <Card className="h-full w-full flex flex-col shadow-2xl">
                            <CardHeader className="flex-row items-center justify-between">
                                <div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle><CardDescription>Your AI Business Analyst</CardDescription></div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0">
                                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                    <div className="space-y-4">
                                        {messages.map((m: CoreMessage, i: number) => (
                                            <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                                {m.role === 'assistant' && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback><Sparkles className="h-4 w-4 text-primary"/></AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className={cn('rounded-lg p-3 max-w-[85%] break-words prose dark:prose-invert', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border')}>
                                                    {renderMessageContent(m.content)}
                                                </div>
                                                {m.role === 'user' && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>U</AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex items-start gap-3 text-sm justify-start">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback><Sparkles className="h-4 w-4 text-primary"/></AvatarFallback>
                                                </Avatar>
                                                <div className="rounded-lg p-3 max-w-[85%] break-words bg-background border">
                                                    Aura is thinking... <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" />
                                                </div>
                                            </div>
                                        )}
                                        {!userContext.businessId && !userContext.userId && !isLoading && (
                                            <div className="text-center text-red-500 text-sm p-4 border rounded-lg bg-red-50">
                                                <p>Cannot connect to the AI Assistant. Your business context (Business ID/User ID cookies) is missing or still loading.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t">
                                    <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder={isDisabled ? "Loading business context..." : "Ask Aura anything..."}
                                            disabled={isDisabled}
                                            className="flex-1"
                                        />
                                        <Button type="submit" size="icon" disabled={!canSend}>
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95" aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>
                {isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}
            </Button>
        </>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function HomePage() {
    const rotatingTexts = ["From startup to enterprise.", "For every ambition.", "Your complete business OS.", "Unified and intelligent."];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    useEffect(() => {
        const textInterval = setInterval(() => {
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
        }, 3000);
        return () => clearInterval(textInterval);
    }, [rotatingTexts.length]);

    const slideshowContent = [
        { src: "/images/showcase/construction-site.jpg", title: "Construction & Project Management", description: "Oversee complex projects on-site with real-time data. Manage resources, track progress, and ensure deadlines are met with BBU1's rugged, reliable interface.", alt: "Construction managers using BBU1 on a tablet at a construction site." },
        { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom & Mobile Money", description: "Empower agents with a fast and secure system for handling transactions. BBU1 streamlines telecom services, from airtime distribution to commission tracking.", alt: "A mobile money agent serving customers using the BBU1 system." },
    ];
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    useEffect(() => {
        const imageInterval = setInterval(() => {
            setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slideshowContent.length);
        }, 15000);
        return () => clearInterval(imageInterval);
    }, [slideshowContent.length]);

    // --- COOKIE CONSENT LOGIC AND STATE ---
    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce((acc, cat) => ({
        ...acc,
        [cat.id]: cat.defaultChecked,
    }), {} as CookiePreferences);

    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);
    const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(initialCookiePreferences);

    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => {
        if (typeof window === 'undefined') return;

        const { gaMeasurementId, fbPixelId } = siteConfig.analytics;
        const hasGaId = gaMeasurementId && gaMeasurementId !== 'G-YOUR_GA_MEASUREMENT_ID';
        const hasFbId = fbPixelId && fbPixelId !== 'YOUR_FACEBOOK_PIXEL_ID';

        if (hasGaId) {
            window.gtag('consent', 'default', {
                'analytics_storage': prefs.analytics ? 'granted' : 'denied',
                'ad_storage': prefs.marketing ? 'granted' : 'denied',
            });

            if (!document.querySelector('#google-analytics-script')) {
                const gaScript = document.createElement('script');
                gaScript.id = 'google-analytics-script';
                gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
                gaScript.async = true;
                document.head.appendChild(gaScript);

                const gaConfigScript = document.createElement('script');
                gaConfigScript.id = 'google-analytics-config';
                gaConfigScript.innerHTML = `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gaMeasurementId}', { 'anonymize_ip': true });
                `;
                document.head.appendChild(gaConfigScript);
            }
        }
        
        const fbScript = document.querySelector('#facebook-pixel-script');
        if (prefs.marketing && hasFbId) {
            if (!fbScript) {
                const newFbScript = document.createElement('script');
                newFbScript.id = 'facebook-pixel-script';
                newFbScript.innerHTML = `
                  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${fbPixelId}');
                  fbq('track', 'PageView');
                `;
                document.head.appendChild(newFbScript);
            }
        } else if (fbScript) {
            fbScript.remove();
        }
    }, []);

    const initializeCookiePreferences = useCallback(() => {
        if (typeof window === 'undefined') return;
        const consentCookie = getCookie('bbu1_cookie_consent');
        if (!consentCookie) {
            setShowCookieBanner(true);
            applyCookiePreferences(initialCookiePreferences);
        } else {
            try {
                const storedPrefs: CookiePreferences = JSON.parse(consentCookie);
                setCookiePreferences(storedPrefs);
                setShowCookieBanner(false);
                applyCookiePreferences(storedPrefs);
            } catch (e) {
                clearCookie('bbu1_cookie_consent');
                setShowCookieBanner(true);
                applyCookiePreferences(initialCookiePreferences);
            }
        }
    }, [initialCookiePreferences, applyCookiePreferences]);

    useEffect(() => {
        initializeCookiePreferences();
    }, [initializeCookiePreferences]);

    const handleAcceptAllCookies = useCallback(() => {
        const allTruePrefs: CookiePreferences = { essential: true, analytics: true, marketing: true };
        setCookiePreferences(allTruePrefs);
        setCookie('bbu1_cookie_consent', JSON.stringify(allTruePrefs), 365);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(allTruePrefs);
    }, [applyCookiePreferences]);

    const handleSaveCookiePreferences = useCallback(() => {
        setCookie('bbu1_cookie_consent', JSON.stringify(cookiePreferences), 365);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(cookiePreferences);
    }, [cookiePreferences, applyCookiePreferences]);

    const toggleCookiePreference = useCallback((id: CookieCategoryKey) => {
        setCookiePreferences(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const openCookiePreferences = useCallback(() => {
        const consentCookie = getCookie('bbu1_cookie_consent');
        if (consentCookie) {
            try {
                setCookiePreferences(JSON.parse(consentCookie));
            } catch (e) { setCookiePreferences(initialCookiePreferences); }
        } else {
            setCookiePreferences(initialCookiePreferences);
        }
        setShowCookieBanner(true);
        setIsCustomizingCookies(true);
    }, [initialCookiePreferences]);

    return (
        <>
            <MegaMenuHeader />
            <main className="flex-grow z-10">
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden text-white">
                    <div className="absolute inset-0 z-0">
                        <Image src="/images/showcase/modern-office-analytics.jpg" alt="A background image showing a modern office team analyzing data with BBU1." fill style={{ objectFit: 'cover' }} className="opacity-90 dark:opacity-70" priority />
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/70"></div>
                    </div>
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                            <motion.h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mt-6 leading-tight" variants={itemVariants}>
                                The One Platform <br />
                                <div className="inline-block h-[1.2em] overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.span key={currentTextIndex} variants={textVariants} initial="hidden" animate="visible" exit="exit" className="block text-blue-300 drop-shadow-md">
                                            {rotatingTexts[currentTextIndex]}
                                        </motion.span >
                                    </AnimatePresence>
                                </div>
                            </motion.h1>
                            <motion.p className="mt-6 text-lg leading-8 text-gray-200 max-w-2xl mx-auto" variants={itemVariants}>
                                Stop juggling multiple apps. BBU1 is the single, unified operating system for your entire business—from accounting and inventory to team and project management.
                            </motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}>
                                <Button asChild size="lg" className="shadow-lg bg-blue-500 hover:bg-blue-600 text-white"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
                
                <AnimatedSection id="in-action" className="pt-0 -mt-16 pb-16 bg-background">
                    <div className="relative bg-secondary/20 rounded-lg shadow-2xl overflow-hidden p-8 md:p-12">
                        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div className="flex flex-col justify-center text-center lg:text-left h-full">
                                <h2 className="text-3xl font-bold tracking-tight mb-4">BBU1 in Action</h2>
                                <div className="relative h-24 sm:h-20">
                                    <AnimatePresence mode="wait">
                                        <motion.div key={currentSlideIndex} variants={slideTextVariants} initial="hidden" animate="visible" exit="exit" className="absolute w-full">
                                            <h3 className="text-lg font-semibold text-primary">{slideshowContent[currentSlideIndex].title}</h3>
                                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{slideshowContent[currentSlideIndex].description}</p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-background">
                                <AnimatePresence>
                                    <motion.div key={currentSlideIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0">
                                        <Image src={slideshowContent[currentSlideIndex].src} alt={slideshowContent[currentSlideIndex].alt} fill style={{ objectFit: 'cover' }} priority={currentSlideIndex === 0} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="standout" className="bg-background">
                    <div className="text-center mb-12 max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold tracking-tight">What Makes BBU1 Stand Out</h2>
                        <p className="text-muted-foreground mt-2">BBU1 is engineered to accelerate your growth and simplify complexity.</p>
                    </div>
                    <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {siteConfig.standoutItems.map(item => (
                            <motion.div key={item.title} variants={itemVariants}>
                                <Card className="text-left h-full hover:shadow-xl hover:-translate-y-1.5 transition-all">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                        <div className="p-3 bg-primary/10 rounded-md"><item.icon className="h-6 w-6 text-primary" /></div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent><p className="text-muted-foreground text-sm">{item.description}</p></CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>

                <AnimatedSection id="faq" className="bg-gradient-to-br from-background via-accent/5 to-background">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold tracking-tight text-center mb-8">Your Questions, Answered</h2>
                        <Accordion type="single" collapsible className="w-full mt-8 rounded-lg border bg-background shadow-lg">
                            {siteConfig.faqItems.map(i => (
                                <AccordionItem key={i.q} value={i.q} className="px-6">
                                    <AccordionTrigger className="text-base text-left hover:no-underline font-semibold py-4">{i.q}</AccordionTrigger>
                                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{i.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </AnimatedSection>
            </main>
            <AdvancedChatWidget />
            <LandingFooter onManageCookies={openCookiePreferences} />

            {/* --- COOKIE CONSENT BANNER --- */}
            <AnimatePresence>
                {showCookieBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 z-[100] p-4"
                    >
                        <Card className="max-w-xl mx-auto shadow-2xl bg-background/90 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-primary" /> We value your privacy
                                </CardTitle>
                                {!isCustomizingCookies && (
                                    <CardDescription>
                                        We use cookies to enhance your browsing experience, analyze our traffic, and for marketing. By clicking "Accept All", you consent to our use of cookies. Learn more in our{' '}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="text-primary hover:underline font-semibold">Privacy Policy</button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader>
                                                {siteConfig.privacyPolicy}
                                            </DialogContent>
                                        </Dialog>.
                                    </CardDescription>
                                )}
                            </CardHeader> {/* Added missing closing tag for CardHeader */}
                            {!isCustomizingCookies ? (
                                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={() => setIsCustomizingCookies(true)}>Customize</Button>
                                    <Button onClick={handleAcceptAllCookies}>Accept All</Button>
                                </CardFooter>
                            ) : (
                                <CardContent className="space-y-4 pt-0">
                                    {siteConfig.cookieCategories.map(category => (
                                        <div key={category.id} className="flex items-start space-x-3 py-2 border-t first:border-t-0">
                                            <Checkbox
                                                id={category.id}
                                                checked={cookiePreferences[category.id]}
                                                onCheckedChange={() => toggleCookiePreference(category.id as CookieCategoryKey)}
                                                disabled={category.isRequired}
                                                className="mt-1"
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <label htmlFor={category.id} className="text-sm font-medium">
                                                    {category.name} {category.isRequired && <span className="text-muted-foreground text-xs">(Always Active)</span>}
                                                </label>
                                                <p className="text-sm text-muted-foreground">{category.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                        <Button variant="outline" onClick={() => setIsCustomizingCookies(false)}>Back</Button>
                                        <Button onClick={handleSaveCookiePreferences}>Save Preferences</Button>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}