'use client';

import React, { useState, useRef, forwardRef, type ReactNode, type ElementRef, type ComponentPropsWithoutRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
// --- Vercel AI SDK Imports ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
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
// --- Utils & Icons ---
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, BrainCircuit, Facebook, Handshake, Home, ShieldCheck, TrendingUp,
    Landmark, Leaf, Linkedin, LucideIcon, Menu,
    Rocket, Send, Signal, Store, Twitter,
    Users, Utensils, WifiOff, X, ArrowRight,
    Zap, ShieldHalf, LayoutGrid, Lightbulb,
    Wallet, ClipboardList, Package, UserCog, Files,
    Download, Share
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
            <p>This Privacy Policy describes how BBU1 ("we", "us", or "our") collects, uses, and discloses your information, including Personal Data and data collected through cookies and similar technologies, when you use our website and services.</p>

            <h4 className="font-semibold mt-4">1. Information We Collect</h4>
            <p>We collect several types of information:</p>
            <ul className="list-disc list-inside ml-4">
                <li><strong>Personal Data:</strong> Information that can be used to identify you (e.g., name, email address, phone number, business ID).</li>
                <li><strong>Transactional Data:</strong> Details about your use of our services (e.g., purchases, project data, inventory movements).</li>
                <li><strong>Usage Data:</strong> Information on how the Service is accessed and used, which may include your computer's IP address, browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</li>
            </ul>

            <h4 className="font-semibold mt-4">2. Cookies and Tracking Technologies</h4>
            <p>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from a website and stored on your device.</p>
            <p>We use the following types of cookies:</p>
            <ul className="list-disc list-inside ml-4">
                <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as accessing secure areas. Without these cookies, services like secure login cannot be provided.</li>
                <li><strong>Analytics Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our website is being used or how effective our marketing campaigns are, or to help us customize our website for you. We use tools like Google Analytics for this purpose. <span className="text-muted-foreground">(These are only activated with your consent.)</span></li>
                <li><strong>Marketing Cookies:</strong> These cookies are used to make advertising messages more relevant to you and your interests. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed for advertisers, and in some cases, selecting advertisements that are based on your interests. <span className="text-muted-foreground">(These are only activated with your consent.)</span></li>
            </ul>
            <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the "Customize" button in our cookie consent banner or by using the "Manage Cookie Preferences" link in the footer. Most web browsers allow you to manage cookies through their settings. Please note that if you disable essential cookies, some parts of our website may not function properly.</p>

            <h4 className="font-semibold mt-4">3. How We Use Your Data</h4>
            <p>We use the collected data for various purposes:</p>
            <ul className="list-disc list-inside ml-4">
                <li>To provide and maintain our Service.</li>
                <li>To notify you about changes to our Service.</li>
                <li>To allow you to participate in interactive features of our Service when you choose to do so.</li>
                <li>To provide customer support.</li>
                <li>To monitor the usage of our Service.</li>
                <li>To detect, prevent and address technical issues.</li>
                <li>To provide you with news, special offers and general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless you have opted not to receive such information.</li>
            </ul>

            <h4 className="font-semibold mt-4">4. Security of Data</h4>
            <p>Your data is secured with bank-level encryption and stored in a multi-tenant architecture with PostgreSQL's Row-Level Security, ensuring complete isolation and protection. We strive to use commercially acceptable means to protect your Personal Data, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.</p>

            <p className="mt-6">By continuing to use our service, you acknowledge you have read and understood this Privacy Policy.</p>
        </div>
    ),
    cookieCategories: [
        {
            id: 'essential',
            name: 'Essential Cookies',
            description: 'These cookies are crucial for the website to function properly and cannot be switched off in our systems. They are usually set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in or filling in forms.',
            isRequired: true,
            defaultChecked: true,
        },
        {
            id: 'analytics',
            name: 'Analytics Cookies',
            description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site. All information these cookies collect is aggregated and therefore anonymous.',
            isRequired: false,
            defaultChecked: false,
        },
        {
            id: 'marketing',
            name: 'Marketing Cookies',
            description: 'These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites. They do not store directly personal information, but are based on uniquely identifying your browser and internet device.',
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

// --- Header with Interactive Dropdowns (AND "SMART" INSTALL BUTTON LOGIC) ---
const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // --- State and logic for the PWA Install Button ---
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 1. Check if the app is already installed and running in standalone mode
        if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
        }

        // 2. Detect if the user is on an iOS device
        const isIosDevice = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIos(isIosDevice);

        // 3. Listen for the browser's install prompt event (for non-iOS devices)
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

    const handleInstallClick = async () => {
        if (!deferredPrompt) return; // Guard clause
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            // User accepted the prompt, no need to show the button anymore
            setDeferredPrompt(null);
        }
    };
    
    // Determine if any install button should be shown at all
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
                                                        <feature.icon className="h-4 w-4 text-primary group-hover:text-accent transition-colors" /> {feature.title}
                                                    </div>
                                                </li>
                                            }
                                        />
                                    ))}
                                </ul>
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
                                                                    <solution.icon className="h-4 w-4 text-primary group-hover:text-accent transition-colors" /> {solution.name}
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
                    {/* --- START: SMART INSTALL BUTTON LOGIC (DESKTOP) --- */}
                    {showAnyInstallButton && (
                        <>
                            {isIos ? (
                                // --- iOS Install Button (shows instructions) ---
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="flex items-center gap-2">
                                            <Download className="h-4 w-4" /> Install App
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Install BBU1 on your iOS Device</DialogTitle>
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
                                // --- Standard PWA Install Button (Chrome/Edge) ---
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2"
                                    onClick={handleInstallClick}
                                    disabled={!deferredPrompt} // Button is disabled until it's ready to fire
                                    title={!deferredPrompt ? "Installation not available yet" : "Install App"}
                                >
                                    <Download className="h-4 w-4" /> Install App
                                </Button>
                            )}
                        </>
                    )}
                    {/* --- END: SMART INSTALL BUTTON LOGIC (DESKTOP) --- */}

                    <Button variant="ghost" asChild className="hover:text-primary"><Link href="/login">Log In</Link></Button>
                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                    <ModeToggle />
                </div>
                <div className="lg:hidden flex items-center gap-2">
                     {/* --- START: SMART INSTALL BUTTON LOGIC (MOBILE) --- */}
                     {showAnyInstallButton && !isIos && ( // Only show for non-iOS mobile
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleInstallClick}
                            disabled={!deferredPrompt}
                            aria-label="Install App"
                         >
                            <Download className="h-6 w-6" />
                        </Button>
                     )}
                    {/* --- END: SMART INSTALL BUTTON LOGIC (MOBILE) --- */}
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
                                            <DetailModal
                                                key={feature.title}
                                                title={feature.title}
                                                icon={feature.icon}
                                                description={feature.description}
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
                                                    <DetailModal
                                                        key={solution.name}
                                                        title={solution.name}
                                                        icon={solution.icon}
                                                        description={solution.description}
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
                        {/* New link to open cookie preferences */}
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
// Re-using the getCookie from above. No change needed for this specific function within the chat widget.
const renderMessageContent = (content: CoreMessage['content']): ReactNode => { if (typeof content === 'string') return content; return content.map((part, index) => { if ((part as any).type === 'text') { return <React.Fragment key={index}>{(part as any).text}</React.Fragment>; } return null; }).filter(Boolean); };
const AdvancedChatWidget = () => { const [isOpen, setIsOpen] = useState(false); const [userContext, setUserContext] = useState({ businessId: '', userId: '' }); const [chatInput, setChatInput] = useState(''); useEffect(() => { const businessId = getCookie('business_id'); const userId = getCookie('user_id'); if (businessId && userId) setUserContext({ businessId, userId }); }, []); const chat: any = useChat({} as any); useEffect(() => { if (chat.messages.length === 0 && chat.setMessages) { chat.setMessages([{ id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' } as any]); } }, [chat.messages.length, chat.setMessages]); const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const trimmedInput = chatInput.trim(); if (!trimmedInput) return; chat.sendMessage({ content: trimmedInput, body: { businessId: userContext.businessId, userId: userContext.userId }}); setChatInput(''); }; const scrollRef = useRef<HTMLDivElement>(null); useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [chat.messages]); return ( <> <AnimatePresence> {isOpen && ( <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-50"> <Card className="h-full w-full flex flex-col shadow-2xl"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle><CardDescription>Your AI Business Analyst</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button></CardHeader><CardContent className="flex-1 flex flex-col p-0"><ScrollArea className="flex-1 p-4" ref={scrollRef}><div className="space-y-4">{chat.messages.map((m: CoreMessage, i: number) => (<div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>{m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Bot className="h-4 w-4" /></div>}<div className={cn('rounded-lg p-3 max-w-[85%] break-words', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border')}>{renderMessageContent(m.content)}</div>{m.role === 'user' && <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0 border"><Users className="h-4 w-4" /></div>}</div>))}{chat.isLoading && <div className="text-sm text-muted-foreground animate-pulse">Aura is thinking...</div>}</div></ScrollArea><div className="p-4 border-t"><form onSubmit={handleChatSubmit} className="flex items-center gap-2"><Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask Aura anything..." disabled={chat.isLoading || !userContext.userId} /><Button type="submit" size="icon" disabled={chat.isLoading || !userContext.userId || !chatInput.trim()}><Send className="h-4 w-4" /></Button></form></div></CardContent></Card> </motion.div> )} </AnimatePresence> <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95" aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>{isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}</Button> </> ); };

// --- MAIN PAGE COMPONENT ---
export default function HomePage() {
    // --- State for the rotating text in the hero section ---
    const rotatingTexts = ["From startup to enterprise.", "For every ambition.", "Your complete business OS.", "Unified and intelligent."];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    useEffect(() => {
        const textInterval = setInterval(() => {
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
        }, 3000);
        return () => clearInterval(textInterval);
    }, [rotatingTexts.length]);


    // --- Configuration for the Integrated "BBU1 in Action" Slideshow ---
    const slideshowContent = [
        { src: "/images/showcase/construction-site.jpg", title: "Construction & Project Management", description: "Oversee complex projects on-site with real-time data. Manage resources, track progress, and ensure deadlines are met with BBU1's rugged, reliable interface.", alt: "Construction managers using BBU1 on a tablet at a construction site." },
        { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom & Mobile Money", description: "Empower agents with a fast and secure system for handling transactions. BBU1 streamlines telecom services, from airtime distribution to commission tracking.", alt: "A mobile money agent serving customers using the BBU1 system." },
        { src: "/images/showcase/local-shop-owner.jpg", title: "Local & Retail Commerce", description: "From bustling city shops to local community stores, BBU1 provides a simple yet powerful POS and inventory system to manage sales and stock effortlessly.", alt: "A local shop owner using BBU1 to manage his store." },
        { src: "/images/showcase/healthcare-team.jpg", title: "Healthcare & Clinic Management", description: "Digitize patient records, manage appointments, and track inventory for medical supplies. BBU1 offers a secure and efficient solution for modern clinics.", alt: "Medical professionals using BBU1 on tablets to manage patient records." },
        { src: "/images/showcase/farmers-learning.jpg", title: "Agriculture & Agribusiness", description: "Bring modern management to the field. Track crop cycles, manage inventory, and connect with markets, empowering farmers and co-ops with data-driven insights.", alt: "A group of farmers learning and collaborating with BBU1 on mobile devices." },
        { src: "/images/showcase/modern-office-team.jpg", title: "Corporate & Business Intelligence", description: "Unify your entire operation. Empower teams with real-time analytics dashboards to monitor growth, identify trends, and make smarter, data-backed decisions.", alt: "A diverse team collaborating in a modern office using BBU1 dashboards." },
        { src: "/images/showcase/sacco-meeting.jpg", title: "Financial Inclusion & SACCOs", description: "Provide accessible financial tools for communities. Manage member data, process loans, and ensure regulatory compliance for SACCOs and microfinance institutions.", alt: "A community SACCO meeting with members using BBU1 on their phones." },
        { src: "/images/showcase/restaurant-kitchen-orders.jpg", title: "Restaurant & Hospitality", description: "From front-of-house POS to back-of-house kitchen display systems (KDS), manage orders, tables, and ingredient-level inventory for a seamless dining experience.", alt: "Chefs in a professional kitchen using BBU1 on tablets to manage orders." },
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

    // Function to apply cookie preferences (e.g., load/unload scripts)
    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => {
        if (typeof window === 'undefined') return; // Ensure client-side

        // --- Google Analytics 4 (GA4) with Consent Mode v2 ---
        // Initialize gtag if it's not already there
        if (!window.dataLayer) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() { window.dataLayer.push(arguments); };
        }

        // Set default consent state *before* loading GA script
        window.gtag('consent', 'default', {
            'analytics_storage': prefs.analytics ? 'granted' : 'denied',
            'ad_storage': prefs.marketing ? 'granted' : 'denied',
            'ad_user_data': prefs.marketing ? 'granted' : 'denied',
            'ad_personalization': prefs.marketing ? 'granted' : 'denied',
            'wait_for_update': 500 // Wait up to 500ms for consent update
        });

        // Load GA script if not already loaded (only once)
        if (!document.querySelector('#google-analytics-script')) {
            const gaScript = document.createElement('script');
            gaScript.id = 'google-analytics-script';
            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=G-YOUR_GA_MEASUREMENT_ID`; // !!! REPLACE WITH YOUR ACTUAL GA4 MEASUREMENT ID !!!
            gaScript.async = true;
            document.head.appendChild(gaScript);

            const gaConfigScript = document.createElement('script');
            gaConfigScript.id = 'google-analytics-config';
            gaConfigScript.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-YOUR_GA_MEASUREMENT_ID', { // !!! REPLACE WITH YOUR ACTUAL GA4 MEASUREMENT ID !!!
                  'anonymize_ip': true // Good practice for privacy
                });
            `;
            document.head.appendChild(gaConfigScript);
            console.log("Google Analytics scripts initialized.");
        } else {
            // If scripts are already loaded, just update consent
            window.gtag('consent', 'update', {
                'analytics_storage': prefs.analytics ? 'granted' : 'denied',
                'ad_storage': prefs.marketing ? 'granted' : 'denied',
                'ad_user_data': prefs.marketing ? 'granted' : 'denied',
                'ad_personalization': prefs.marketing ? 'granted' : 'denied'
            });
            console.log("Google Analytics consent updated.");
        }


        // --- Facebook Pixel ---
        const fbPixelId = 'YOUR_FACEBOOK_PIXEL_ID'; // !!! REPLACE WITH YOUR ACTUAL FACEBOOK PIXEL ID !!!
        if (prefs.marketing) {
            // Load Facebook Pixel script if not already loaded
            if (!document.querySelector('#facebook-pixel-script')) {
                const fbScript = document.createElement('script');
                fbScript.id = 'facebook-pixel-script';
                fbScript.innerHTML = `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${fbPixelId}');
                  fbq('track', 'PageView');
                `;
                document.head.appendChild(fbScript);
                console.log("Facebook Pixel script loaded.");
            } else {
                // If script is already there, ensure it's active for tracking
                window.fbq('track', 'PageView');
                console.log("Facebook Pixel tracking activated.");
            }
        } else {
            // Remove Facebook Pixel script and disable tracking if consent is denied
            const fbScript = document.querySelector('#facebook-pixel-script');
            if (fbScript) {
                fbScript.remove();
                // Clear any existing fbq functions to prevent further tracking
                if (window.fbq) {
                    window.fbq = function() {};
                    window._fbq = undefined;
                }
                console.log("Facebook Pixel script removed and tracking disabled.");
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    // Function to initialize cookie preferences from storage
    const initializeCookiePreferences = useCallback(() => {
        if (typeof window === 'undefined') return; // Ensure client-side

        const consentCookie = getCookie('bbu1_cookie_consent');
        if (!consentCookie) {
            setShowCookieBanner(true); // No consent found, show banner
            setCookiePreferences(initialCookiePreferences); // Reset to defaults
            // Apply default preferences (essential) or wait for user interaction
            applyCookiePreferences(initialCookiePreferences);
        } else {
            try {
                const storedPrefs: CookiePreferences = JSON.parse(consentCookie);
                setCookiePreferences(storedPrefs);
                setShowCookieBanner(false); // Consent found, hide banner
                applyCookiePreferences(storedPrefs); // Apply effects of consent
            } catch (e) {
                console.error("Failed to parse cookie consent cookie:", e);
                setShowCookieBanner(true); // Corrupted cookie, show banner
                setCookiePreferences(initialCookiePreferences);
                applyCookiePreferences(initialCookiePreferences);
            }
        }
    }, [initialCookiePreferences, applyCookiePreferences]);


    // Effect to run on initial load to check for consent
    useEffect(() => {
        initializeCookiePreferences();
    }, [initializeCookiePreferences]);

    const handleAcceptAllCookies = () => {
        const allTruePrefs: CookiePreferences = siteConfig.cookieCategories.reduce((acc, cat) => ({
            ...acc,
            [cat.id]: true,
        }), {} as CookiePreferences);
        setCookiePreferences(allTruePrefs);
        setCookie('bbu1_cookie_consent', JSON.stringify(allTruePrefs), 365);
        setShowCookieBanner(false);
        applyCookiePreferences(allTruePrefs);
    };

    const handleSaveCookiePreferences = () => {
        setCookie('bbu1_cookie_consent', JSON.stringify(cookiePreferences), 365);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(cookiePreferences);
    };

    const toggleCookiePreference = (id: CookieCategoryKey) => {
        setCookiePreferences(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const openCookiePreferences = () => {
        // When opening preferences, load current saved state or defaults
        const consentCookie = getCookie('bbu1_cookie_consent');
        if (consentCookie) {
            try {
                setCookiePreferences(JSON.parse(consentCookie));
            } catch (e) {
                console.error("Failed to parse cookie consent for customization:", e);
                setCookiePreferences(initialCookiePreferences);
            }
        } else {
            setCookiePreferences(initialCookiePreferences);
        }
        setShowCookieBanner(true);
        setIsCustomizingCookies(true);
    };
    // --- END COOKIE CONSENT LOGIC AND STATE ---


    return (
        <>
            <MegaMenuHeader />
            <main className="flex-grow z-10">
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden text-white">
                    <div className="absolute inset-0 z-0">
                        <Image src="/images/showcase/modern-office-analytics.jpg" alt="A background image showing a modern office team analyzing data with BBU1." fill style={{ objectFit: 'cover' }} className="opacity-90 dark:opacity-70 hero-background-image" priority />
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/70"></div>
                    </div>
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                            <motion.div variants={itemVariants} className="group">
                                <span className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white border border-white/20 shadow-sm group-hover:bg-white/20 transition-all duration-300">
                                    <BrainCircuit className="mr-2 h-4 w-4" /> The Intelligent Business OS
                                </span>
                            </motion.div>
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
                                Stop juggling multiple apps. BBU1 is the single, unified operating system for your entire business—from accounting and inventory to team and project management. Built for every business, ready for the world.
                            </motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}>
                                <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-blue-500 hover:bg-blue-600 text-white"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 transition-colors"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
                
                <AnimatedSection id="in-action" className="pt-0 -mt-16 pb-16 bg-background">
                    <div className="relative bg-secondary/20 rounded-lg shadow-2xl shadow-primary/10 border border-primary/10 overflow-hidden p-8 md:p-12">
                        <motion.div
                            className="absolute inset-0 z-0"
                            variants={backgroundVariants}
                            custom={currentSlideIndex}
                            animate="animate"
                        >
                            <Image src="/images/showcase/modern-office-team.jpg" alt="A background image of a modern office team." fill style={{ objectFit: 'cover' }} className="opacity-50" />
                        </motion.div>
                        <div className="absolute inset-0 z-10 bg-background/80 dark:bg-background/90"></div>
                        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div className="flex flex-col justify-center text-center lg:text-left h-full">
                                <h2 className="text-3xl font-bold tracking-tight mb-4">BBU1 in Action: Powering Diverse Industries Globally</h2>
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
                                    <motion.div key={currentSlideIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} className="absolute inset-0">
                                        <Image src={slideshowContent[currentSlideIndex].src} alt={slideshowContent[currentSlideIndex].alt} fill style={{ objectFit: 'cover' }} priority={currentSlideIndex === 0} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="standout" className="bg-background relative">
                    <div className="absolute inset-0 z-0 opacity-50"><Image src="/images/showcase/ai-warehouse-logistics.jpg" alt="ai warehouse" fill style={{ objectFit: 'cover' }}/></div>
                    <div className="absolute inset-0 z-0 bg-background/80"></div>
                    <div className="px-4 relative z-10">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold tracking-tight">What Makes BBU1 Stand Out</h2>
                            <p className="text-muted-foreground mt-2">BBU1 is engineered from the ground up to not just manage your business, but to accelerate its growth and simplify complexity.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {siteConfig.standoutItems.map(item => (
                                <motion.div key={item.title} variants={itemVariants}>
                                    <Card className="text-left h-full hover:shadow-primary/20 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/80 backdrop-blur-sm border-primary/10">
                                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                            <div className="p-3 bg-primary/10 rounded-md"><item.icon className="h-6 w-6 text-primary" /></div>
                                            <CardTitle className="text-lg">{item.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground text-sm">{item.description}</p></CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>

                <AnimatedSection id="faq" className="bg-gradient-to-br from-background via-accent/5 to-background dark:from-background dark:via-accent/10 dark:to-background">
                    <div className="max-w-3xl mx-auto relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-8">Your Questions, Answered</h2>
                        <Accordion type="single" collapsible className="w-full mt-8 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm shadow-lg">
                            {siteConfig.faqItems.map(i => (
                                <AccordionItem key={i.q} value={i.q} className="px-6 data-[state=closed]:border-b">
                                    <AccordionTrigger className="text-base text-left hover:no-underline font-semibold py-4 hover:text-primary transition-colors">{i.q}</AccordionTrigger>
                                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{i.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection className="text-center container mx-auto px-4">
                    <div className="relative py-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 -z-1"></div>
                        <h2 className="text-3xl font-bold tracking-tight drop-shadow-md">Ready to Revolutionize Your Enterprise?</h2>
                        <p className="mt-4 max-w-xl mx-auto text-lg text-primary-foreground/80">Join leaders who trust {siteConfig.name} to drive growth and unlock their true potential.</p>
                        <div className="mt-8">
                            <Button asChild size="lg" variant="secondary" className="text-primary hover:bg-white/90 scale-105 transition-transform hover:scale-110 shadow-lg hover:shadow-xl">
                                <Link href="/signup">Start Your Free Trial Today <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                        </div>
                    </div>
                </AnimatedSection>

            </main>
            <AdvancedChatWidget />
            <LandingFooter onManageCookies={openCookiePreferences} /> {/* Pass handler to Footer */}

            {/* --- COOKIE CONSENT BANNER (EMBEDDED) --- */}
            <AnimatePresence>
                {showCookieBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                        className="fixed bottom-0 left-0 right-0 z-[100] p-4"
                    >
                        <Card className="max-w-xl mx-auto shadow-2xl border-2 border-primary/20 bg-background/90 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-primary" /> We value your privacy
                                </CardTitle>
                                {!isCustomizingCookies && (
                                    <CardDescription>
                                        We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                                        You can manage your preferences below or learn more in our <DialogTrigger asChild><button className="text-primary hover:underline font-semibold">Privacy Policy</button></DialogTrigger>.
                                    </CardDescription>
                                )}
                            </CardHeader>
                            {!isCustomizingCookies ? (
                                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={() => setIsCustomizingCookies(true)}>
                                        Customize
                                    </Button>
                                    <Button onClick={handleAcceptAllCookies}>
                                        Accept All <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
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
                                                <label
                                                    htmlFor={category.id}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {category.name} {category.isRequired && <span className="text-muted-foreground text-xs">(Always Active)</span>}
                                                </label>
                                                <p className="text-sm text-muted-foreground">
                                                    {category.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                        <Button variant="outline" onClick={() => setIsCustomizingCookies(false)}>
                                            Back
                                        </Button>
                                        <Button onClick={handleSaveCookiePreferences}>
                                            Save Preferences
                                        </Button>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- END COOKIE CONSENT BANNER --- */}
        </>
    );
}