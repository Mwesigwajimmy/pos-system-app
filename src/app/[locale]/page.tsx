'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
// --- Vercel AI SDK Imports ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
// --- UI Components from shadcn/ui ---
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// --- Utils & Icons ---
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, BrainCircuit, Facebook, Handshake, ShieldCheck, TrendingUp,
    Landmark, Leaf, Linkedin, LucideIcon, Menu, ArrowRight, Utensils, WifiOff,
    Rocket, Send, Signal, Store, Twitter,
    Users, X, Zap, ShieldHalf, LayoutGrid, Lightbulb,
    Wallet, ClipboardList, Package, UserCog, Files,
    Download, Share, Sparkles, Loader2, CheckCircle
} from 'lucide-react';


// --- Type Definitions ---
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface IndustryItem { name: string; icon: LucideIcon; description: string; }
interface TestimonialItem { name: string; title: string; quote: string; image: string; }
interface FaqItem { q: string; a: ReactNode; }
interface WhyUsItem { icon: LucideIcon; title: string; description: string; }

// --- Cookie Consent Types ---
type CookieCategoryKey = 'essential' | 'analytics' | 'marketing';
interface CookieCategoryInfo {
    id: CookieCategoryKey;
    name: string;
    description: string;
    isRequired: boolean;
    defaultChecked: boolean;
}
type CookiePreferences = { [key in CookieCategoryKey]: boolean; };
interface ToastState { visible: boolean; message: string; }


// --- Helper Functions ---
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
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

// --- Centralized Site Configuration ---
const siteConfig = {
    name: "BBU1",
    shortDescription: "Your all-in-one OS for global business. Unify accounting, CRM, inventory, and AI insights. Built in Africa, for the world.",
    url: "https://www.bbu1.com/",
    contactInfo: {
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
        socials: { linkedin: '#', twitter: '#', facebook: '#' }
    },
    featureItems: [
        { icon: Wallet, title: "Autonomous Bookkeeping", description: "A complete, GAAP-compliant, double-entry accounting system that runs itself. From automated journal entries to one-click financial statements." },
        { icon: LayoutGrid, title: "Integrated Business OS", description: "Unify every department: accounting, CRM, inventory, HR, and project management, all in one platform." },
        { icon: BrainCircuit, title: "AI-Powered Insights", description: "Aura, your AI copilot, analyzes data, predicts trends, and offers strategic recommendations to drive growth." },
        { icon: ClipboardList, title: "Intelligent Inventory", description: "Automated stock management, real-time tracking, and predictive reordering across multiple warehouses and stores." },
        { icon: Users, title: "Customer Relationship Management", description: "Manage leads, track customer interactions, automate sales processes, and improve customer satisfaction." },
        { icon: Package, title: "Supply Chain Optimization", description: "From procurement to delivery, streamline your supply chain with intelligent forecasting and vendor management." },
    ] as FeatureItem[],
    standoutItems: [
        { icon: TrendingUp, title: "Built to Scale With You", description: "BBU1 is architected for growth. Whether you're a solo entrepreneur or a global enterprise, our platform scales seamlessly to meet your demands without compromising performance." },
        { icon: LayoutGrid, title: "A Single Source of Truth", description: "Eliminate data silos forever. By unifying every department—from sales and accounting to inventory and HR—you get a real-time, 360-degree view of your entire operation." },
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Internet down? Power outage? No problem. BBU1's core functions work perfectly offline, ensuring business continuity and revenue protection. Everything syncs the moment you're back online." },
        { icon: Zap, title: "End Subscription Chaos", description: "Replace 5+ expensive, disconnected apps with one intelligent, cost-effective platform. Simplify your workflow, reduce costs, and remove the headache of integration." },
        { icon: ShieldHalf, title: "Bank-Level Security", description: "Your data is your most valuable asset. We protect it with a multi-tenant architecture and end-to-end encryption, ensuring your information is completely isolated and secure." }
    ] as WhyUsItem[],
    industryItems: [
        { name: "Retail & E-commerce", icon: Store, description: "Streamline sales, inventory, and customer loyalty across all channels." },
        { name: "Manufacturing", icon: Landmark, description: "Optimize production, manage raw materials, and track finished goods with precision." },
        { name: "Restaurant / Cafe", icon: Utensils, description: "Complete restaurant management with Kitchen Display System (KDS) integration, table management, and ingredient-level tracking." },
        { name: "Professional Services", icon: Handshake, description: "Automate billing, project tracking, and client management for consulting firms, agencies, and more." },
        { name: "Financial Services", icon: Banknote, description: "Securely manage client accounts, transactions, and compliance with robust financial tools." },
        { name: "Telecom & Utilities", icon: Signal, description: "Handle billing, customer support, and asset management for essential services." },
    ] as IndustryItem[],
    testimonials: [
        { name: "Alice Mutesi", title: "CEO, Agri-Innovate Uganda", quote: "BBU1 has transformed our agricultural supply chain. We now have real-time visibility from farm to market, boosting our efficiency by 40%.", image: "/images/testimonials/alice-mutesi.jpg" },
        { name: "David Ochieng", title: "Head of Operations, SwiftLogistics Kenya", quote: "Managing our fleet and inventory across East Africa used to be a nightmare. BBU1 brought everything into one intelligent system, saving us significant operational costs.", image: "/images/testimonials/david-ochieng.jpg" },
        { name: "Zainab Ali", title: "Founder, Nile Retail Egypt", quote: "The AI Copilot is a game-changer! Aura helps us predict market trends and personalize customer experiences, giving us a competitive edge.", image: "/images/testimonials/zainab-ali.jpg" },
    ] as TestimonialItem[],
    faqItems: [
        { q: 'What is BBU1?', a: 'BBU1 (Big Business Unified) is an all-in-one operating system for businesses, unifying accounting, CRM, inventory, HR, project management, and AI-powered insights into a single, intelligent platform.' },
        { q: 'How does the AI Copilot deliver insights?', a: 'The AI Copilot securely analyzes your company-wide data to find patterns. It provides simple, actionable insights like "Consider bundling Product A and B" or "Cash flow projected to be low in 3 weeks."' },
        { q: 'Is my enterprise data secure?', a: 'Yes. BBU1 uses a-tenant architecture with PostgreSQL\'s Row-Level Security. Your data is completely isolated and protected by bank-level, end-to-end encryption.' },
        { q: 'Can the system be customized?', a: 'Absolutely. While powerful out-of-the-box, we offer customization services and API access for enterprise clients to tailor the system to your unique workflows.' },
        { q: 'What kind of support is offered?', a: 'Enterprise plans include dedicated onboarding, an account manager, priority support via WhatsApp or phone, and a Service Level Agreement (SLA) guaranteeing uptime.' },
    ] as FaqItem[],
    termsOfService: (<div className="space-y-4 text-sm"><p>Welcome to BBU1...</p></div>),
    privacyPolicy: (<div className="space-y-4 text-sm"><p>This Privacy Policy describes how BBU1 collects and uses your information...</p></div>),
    cookieCategories: [
        { id: 'essential', name: 'Essential Cookies', description: 'These cookies are crucial for the website to function properly and cannot be switched off.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics Cookies', description: 'These cookies allow us to count visits and traffic sources to improve the performance of our site.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing Cookies', description: 'These cookies may be set by advertising partners to show you relevant adverts on other sites.', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

// --- Animation Variants ---
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.2 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const textVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } } };


// --- Reusable UI Components ---
const ListItem = forwardRef<ElementRef<"a">, ComponentPropsWithoutRef<"a">>(({ className, title, children, ...props }, ref) => (
    <li>
        <NavigationMenuLink asChild>
            <a ref={ref} className={cn("block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground", className)} {...props}>
                <div className="text-sm font-medium leading-none">{title}</div>
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
            </a>
        </NavigationMenuLink>
    </li>
));
ListItem.displayName = "ListItem";

const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-16 sm:py-20 overflow-hidden", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <div className="container mx-auto px-4 relative z-10">{children}</div>
    </motion.section>
);

const Toast = ({ message, isVisible }: { message: string, isVisible: boolean }) => (
    <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
                className="fixed bottom-6 left-6 z-[150] flex items-center gap-3 rounded-lg bg-foreground text-background p-4 shadow-2xl"
            >
                <CheckCircle className="h-6 w-6 text-green-400" />
                <p className="font-medium">{message}</p>
            </motion.div>
        )}
    </AnimatePresence>
);

// --- Header Component ---
const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIos(isIosDevice);
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
        }
    };

    const showAnyInstallButton = mounted && !isStandalone && (deferredPrompt || isIos);

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2 font-bold text-lg text-primary"><Rocket className="h-6 w-6" /> <span>{siteConfig.name}</span></Link>
                {/* Desktop Navigation */}
                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                                    <li className="row-span-3"><NavigationMenuLink asChild><a className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="/"><Rocket className="h-6 w-6 text-primary" /><div className="mb-2 mt-4 text-lg font-medium">{siteConfig.name}</div><p className="text-sm leading-tight text-muted-foreground">{siteConfig.shortDescription}</p></a></NavigationMenuLink></li>
                                    <ListItem href="#features" title="Features">All the tools you need, unified.</ListItem>
                                    <ListItem href="#industries" title="Industries">Solutions for every sector.</ListItem>
                                    <ListItem href="#standout" title="Why BBU1">Discover our unique advantages.</ListItem>
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem><Link href="#testimonials" legacyBehavior passHref><NavigationMenuLink className={navigationMenuTriggerStyle()}>Testimonials</NavigationMenuLink></Link></NavigationMenuItem>
                        <NavigationMenuItem><Link href="#faq" legacyBehavior passHref><NavigationMenuLink className={navigationMenuTriggerStyle()}>FAQ</NavigationMenuLink></Link></NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
                <div className="hidden lg:flex items-center gap-2">
                    {showAnyInstallButton && (isIos ? (
                        <Dialog>
                            <DialogTrigger asChild><Button variant="outline"><Download className="h-4 w-4 mr-2" /> Install App</Button></DialogTrigger>
                            <DialogContent><DialogHeader><DialogTitle>Install App on iOS</DialogTitle><DialogDescription><ol className="list-decimal list-inside mt-2 space-y-1"><li>Tap the <Share className="inline h-4 w-4" /> (Share) button in Safari.</li><li>Select "Add to Home Screen".</li><li>Tap "Add" in the top right corner.</li></ol></DialogDescription></DialogHeader></DialogContent>
                        </Dialog>
                    ) : (
                        <Button onClick={handleInstallClick} variant="outline" disabled={!deferredPrompt}><Download className="h-4 w-4 mr-2" /> Install App</Button>
                    ))}
                    <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                    <ModeToggle />
                </div>
                {/* Mobile Menu Toggle */}
                <div className="lg:hidden flex items-center gap-2">
                    {showAnyInstallButton && !isIos && <Button variant="ghost" size="icon" onClick={handleInstallClick} disabled={!deferredPrompt} aria-label="Install App"><Download className="h-6 w-6" /></Button>}
                    <ModeToggle />
                    <Button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} variant="ghost" size="icon" aria-label="Toggle mobile menu">{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</Button>
                </div>
            </div>
            {/* Mobile Menu Panel */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="lg:hidden bg-background border-t absolute w-full top-16 shadow-lg z-30">
                        <div className="container mx-auto py-4 px-4 space-y-4">
                            <Link href="#features" className="block text-lg font-medium hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
                            <Link href="#industries" className="block text-lg font-medium hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Industries</Link>
                            <Link href="#testimonials" className="block text-lg font-medium hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Testimonials</Link>
                            <Link href="#faq" className="block text-lg font-medium hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>FAQ</Link>
                            <div className="flex flex-col gap-2 pt-4 border-t">
                                <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
                                <Button asChild><Link href="/signup">Get Started</Link></Button>
                                {showAnyInstallButton && isIos && (
                                    <Dialog>
                                        <DialogTrigger asChild><Button variant="outline"><Download className="h-4 w-4 mr-2" /> Install App (iOS)</Button></DialogTrigger>
                                        <DialogContent><DialogHeader><DialogTitle>Install App on iOS</DialogTitle><DialogDescription>To install this app on your iOS device: <ol className="list-decimal list-inside mt-2 space-y-1"><li>Tap the <Share className="inline h-4 w-4" /> (Share) button in Safari.</li><li>Select "Add to Home Screen".</li><li>Tap "Add" in the top right corner.</li></ol></DialogDescription></DialogHeader></DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

// --- Footer Component ---
const LandingFooter = ({ onManageCookies }: { onManageCookies: () => void }) => (
    <footer className="relative border-t bg-background/90 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 pt-12 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2"><h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-6 w-6" /> {siteConfig.name}</h3><p className="text-sm text-muted-foreground mt-4 max-w-xs">{siteConfig.shortDescription}</p><div className="flex items-center gap-5 mt-6"><a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={20} /></a><a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20} /></a><a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></a></div></div>
                <div><h4 className="font-semibold text-base mb-3">Product</h4><ul className="space-y-2 text-sm"><li><Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link></li><li><Link href="#industries" className="text-muted-foreground hover:text-primary transition-colors">Industries</Link></li></ul></div>
                <div><h4 className="font-semibold text-base mb-3">Company</h4><ul className="space-y-2 text-sm"><li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">Contact Sales</a></li><li><Link href="#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li></ul></div>
                <div><h4 className="font-semibold text-base mb-3">Legal</h4><ul className="space-y-2 text-sm"><li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left transition-colors">Terms of Service</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Terms of Service</DialogTitle></DialogHeader>{siteConfig.termsOfService}</DialogContent></Dialog></li><li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left transition-colors">Privacy Policy</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader>{siteConfig.privacyPolicy}</DialogContent></Dialog></li><li><button onClick={onManageCookies} className="text-muted-foreground hover:text-primary text-left transition-colors">Manage Cookies</button></li></ul></div>
            </div>
            <div className="border-t mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground"><p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p><p className="mt-3 sm:mt-0">Made with <Leaf className="inline h-3 w-3 text-green-500" /> in Kampala, Uganda.</p></div>
        </div>
    </footer>
);

// --- AI Chat Widget ---
const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userContext, setUserContext] = useState<{ businessId: string | null; userId: string | null }>({ businessId: null, userId: null });
    const [chatInput, setChatInput] = useState('');
    const { messages, setMessages, sendMessage, isLoading }: any = useChat({ api: '/api/chat', body: { businessId: userContext.businessId, userId: userContext.userId } } as any);

    useEffect(() => { setUserContext({ businessId: getCookie('business_id'), userId: getCookie('user_id') }); }, []);
    useEffect(() => { if (messages.length === 0 && setMessages) { setMessages([{ id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' }]); } }, [messages.length, setMessages]);
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [messages]);

    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = chatInput.trim();
        if (!trimmedInput || isLoading) return;
        sendMessage({ content: trimmedInput, role: 'user' });
        setChatInput('');
    };

    const isDisabled = isLoading || !userContext.userId || !userContext.businessId;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-50">
                        <Card className="h-full w-full flex flex-col shadow-2xl">
                            <CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle><CardDescription>Your AI Business Analyst</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button></CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0"><ScrollArea className="flex-1 p-4" ref={scrollRef}><div className="space-y-4">
                                {messages.map((m: CoreMessage, i: number) => (
                                    <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                        {m.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-primary" /></AvatarFallback></Avatar>}
                                        <div className={cn('rounded-lg p-3 max-w-[85%] break-words prose dark:prose-invert', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border')}>{m.content as string}</div>
                                        {m.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar>}
                                    </div>))}
                                {isLoading && <div className="flex items-start gap-3 text-sm"><Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-primary" /></AvatarFallback></Avatar><div className="rounded-lg p-3 max-w-[85%] bg-background border">Aura is thinking... <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" /></div></div>}
                                {(!userContext.businessId || !userContext.userId) && !isLoading && <div className="text-center text-red-500 text-sm p-4 border rounded-lg bg-red-50/50"><p>Your business context is missing. Please log in to use the AI Assistant.</p></div>}
                            </div></ScrollArea><div className="p-4 border-t"><form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={isDisabled ? "Please log in..." : "Ask Aura anything..."} disabled={isDisabled} />
                                <Button type="submit" size="icon" disabled={isDisabled || !chatInput.trim()}><Send className="h-4 w-4" /></Button></form></div></CardContent>
                        </Card>
                    </motion.div>)}
            </AnimatePresence>
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95" aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>{isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}</Button>
        </>
    );
};


// --- MAIN PAGE COMPONENT ---
export default function HomePage() {
    const rotatingTexts = ["From startup to enterprise.", "For every ambition.", "Your complete business OS."];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const slideshowContent = [
        { src: "/images/showcase/construction-site.jpg", title: "Construction & Project Management", description: "Oversee complex projects on-site with real-time data.", alt: "Construction managers using BBU1 on a tablet." },
        { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom & Mobile Money", description: "Empower agents with a fast, secure system for transactions.", alt: "A mobile money agent serving customers." },
        { src: "/images/showcase/local-shop-owner.jpg", title: "Local & Retail Commerce", description: "A simple yet powerful POS and inventory system to manage sales and stock.", alt: "A local shop owner managing his store." },
        { src: "/images/showcase/healthcare-team.jpg", title: "Healthcare & Clinic Management", description: "Digitize patient records, manage appointments, and track medical supplies.", alt: "Medical professionals using BBU1 on tablets." },
        { src: "/images/showcase/farmers-learning.jpg", title: "Agriculture & Agribusiness", description: "Bring modern management to the field to track crops and connect with markets.", alt: "Farmers collaborating with BBU1 on mobile devices." },
    ];
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    useEffect(() => {
        const textInterval = setInterval(() => { setCurrentTextIndex(prev => (prev + 1) % rotatingTexts.length); }, 3000);
        const imageInterval = setInterval(() => { setCurrentSlideIndex(prev => (prev + 1) % slideshowContent.length); }, 8000);
        return () => { clearInterval(textInterval); clearInterval(imageInterval); };
    }, [rotatingTexts.length, slideshowContent.length]);

    // --- COOKIE CONSENT AND TOAST NOTIFICATION LOGIC ---
    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.defaultChecked }), {} as CookiePreferences);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);
    const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(initialCookiePreferences);
    const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
    const [mounted, setMounted] = useState(false);

    // This function now ONLY handles the cookie setting and UI feedback.
    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => {
        console.log("Applying cookie preferences:", prefs);
        // Tracking script logic has been removed.
        // This is where you WOULD add Google Analytics, FB Pixel, etc.
    }, []);
    
    const showToast = (message: string) => {
        setToast({ visible: true, message });
        setTimeout(() => setToast({ visible: false, message: '' }), 4000);
    };

    const handleAcceptAllCookies = useCallback(() => {
        const allTruePrefs: CookiePreferences = { essential: true, analytics: true, marketing: true };
        setCookiePreferences(allTruePrefs);
        setCookie('bbu1_cookie_consent', JSON.stringify(allTruePrefs), 365);
        setShowCookieBanner(false);
        applyCookiePreferences(allTruePrefs);
        showToast("All cookies have been accepted.");
    }, [applyCookiePreferences]);

    const handleSaveCookiePreferences = useCallback(() => {
        setCookie('bbu1_cookie_consent', JSON.stringify(cookiePreferences), 365);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(cookiePreferences);
        showToast("Your privacy preferences have been saved.");
    }, [cookiePreferences, applyCookiePreferences]);
    
    const openCookiePreferences = useCallback(() => {
        const consentCookie = getCookie('bbu1_cookie_consent');
        try {
            const storedPrefs = consentCookie ? JSON.parse(consentCookie) : initialCookiePreferences;
            setCookiePreferences(storedPrefs);
        } catch {
            setCookiePreferences(initialCookiePreferences);
        }
        setShowCookieBanner(true);
        setIsCustomizingCookies(true);
    }, [initialCookiePreferences]);
    
    useEffect(() => {
        setMounted(true);
        const consentCookie = getCookie('bbu1_cookie_consent');
        if (!consentCookie) {
            setShowCookieBanner(true);
        } else {
            try {
                applyCookiePreferences(JSON.parse(consentCookie));
            } catch {
                setShowCookieBanner(true); // Show if cookie is corrupted
            }
        }
    }, [applyCookiePreferences]);

    return (
        <>
            <MegaMenuHeader />
            <main>
                {/* Hero Section */}
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden text-center">
                    <div className="absolute inset-0 z-0">
                        <Image src="/images/showcase/modern-office-analytics.jpg" alt="Modern office analyzing data" fill style={{ objectFit: 'cover' }} className="opacity-90 dark:opacity-70" priority />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
                    </div>
                    <div className="container mx-auto relative z-10 text-white">
                        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.2 } } }}>
                            <motion.span variants={itemVariants} className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium border border-white/20"><Sparkles className="mr-2 h-4 w-4" /> The Intelligent Business OS</motion.span>
                            <motion.h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mt-6 leading-tight" variants={itemVariants}>
                                The One Platform <br />
                                <div className="inline-block h-[1.2em] overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.span key={currentTextIndex} variants={textVariants} initial="hidden" animate="visible" exit="exit" className="block text-blue-300 drop-shadow-md">{rotatingTexts[currentTextIndex]}</motion.span>
                                    </AnimatePresence>
                                </div>
                            </motion.h1>
                            <motion.p className="mt-6 text-lg leading-8 text-gray-200 max-w-2xl mx-auto" variants={itemVariants}>Stop juggling multiple apps. BBU1 is the single, unified operating system for your entire business—from accounting and inventory to team and project management.</motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}><Button asChild size="lg"><Link href="/signup">Start Free Trial</Link></Button><Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Request a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button></motion.div>
                        </motion.div>
                    </div>
                </section>
                
                {/* Sections from Both Files Merged */}
                <AnimatedSection id="features" className="bg-gradient-to-b from-background to-accent/20">
                    <div className="text-center mb-12"><motion.h2 className="text-3xl sm:text-4xl font-bold" variants={itemVariants}>Core Capabilities</motion.h2><motion.p className="mt-4 text-lg text-muted-foreground" variants={itemVariants}>Discover how BBU1 unifies and supercharges your business operations.</motion.p></div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{siteConfig.featureItems.map((feature, index) => (<motion.div key={index} className="flex flex-col items-center text-center p-6 border rounded-lg shadow-sm bg-background/70" variants={itemVariants}><div className="p-3 rounded-full bg-primary/10 text-primary mb-4"><feature.icon className="h-6 w-6" /></div><h3 className="text-xl font-semibold mb-2">{feature.title}</h3><p className="text-muted-foreground text-sm">{feature.description}</p></motion.div>))}</div>
                </AnimatedSection>

                <AnimatedSection id="in-action" className="bg-gradient-to-b from-accent/20 to-background">
                    <div className="text-center mb-12"><motion.h2 className="text-3xl sm:text-4xl font-bold" variants={itemVariants}>BBU1 In Action</motion.h2><motion.p className="mt-4 text-lg text-muted-foreground" variants={itemVariants}>See how BBU1 empowers diverse industries across the continent.</motion.p></div>
                    <motion.div className="relative rounded-xl overflow-hidden shadow-xl border h-[400px] md:h-[550px] lg:h-[700px] bg-gray-800" variants={itemVariants}>
                        <AnimatePresence mode="wait"><motion.div key={currentSlideIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeInOut" }} className="absolute inset-0"><Image src={slideshowContent[currentSlideIndex].src} alt={slideshowContent[currentSlideIndex].alt} layout="fill" objectFit="cover" className="filter brightness-[0.7]" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white max-w-3xl"><h3 className="text-2xl md:text-4xl font-bold mb-2">{slideshowContent[currentSlideIndex].title}</h3><p className="text-base md:text-lg">{slideshowContent[currentSlideIndex].description}</p></div></motion.div></AnimatePresence>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">{slideshowContent.map((_, idx) => (<button key={idx} className={cn("h-2 w-2 rounded-full bg-white/50 transition-all", { "bg-white w-4": currentSlideIndex === idx })} onClick={() => setCurrentSlideIndex(idx)} aria-label={`Go to slide ${idx + 1}`} />))}</div>
                    </motion.div>
                </AnimatedSection>
                
                <AnimatedSection id="standout" className="bg-background relative">
                    <div className="absolute inset-0 z-0 opacity-10"><Image src="/images/showcase/ai-warehouse-logistics.jpg" alt="ai warehouse" fill style={{ objectFit: 'cover' }}/></div><div className="absolute inset-0 z-0 bg-background/80 backdrop-blur-sm"></div>
                    <div className="relative z-10 text-center mb-12 max-w-3xl mx-auto"><h2 className="text-3xl font-bold tracking-tight">What Makes BBU1 Stand Out</h2><p className="text-muted-foreground mt-2">BBU1 is engineered to not just manage your business, but to accelerate its growth and simplify complexity.</p></div>
                    <motion.div variants={{ visible: { transition: { staggerChildren: 0.1 } } }} initial="hidden" whileInView="visible" className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{siteConfig.standoutItems.map(item => (<motion.div key={item.title} variants={itemVariants}><Card className="text-left h-full hover:shadow-primary/20 hover:shadow-xl hover:-translate-y-1.5 transition-all bg-background/80 border-primary/10"><CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2"><div className="p-3 bg-primary/10 rounded-md"><item.icon className="h-6 w-6 text-primary" /></div><CardTitle className="text-lg">{item.title}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">{item.description}</p></CardContent></Card></motion.div>))} </motion.div>
                </AnimatedSection>
                
                <AnimatedSection id="industries" className="bg-gradient-to-b from-accent/20 to-background">
                    <div className="text-center mb-12"><motion.h2 className="text-3xl sm:text-4xl font-bold" variants={itemVariants}>Industries We Serve</motion.h2><motion.p className="mt-4 text-lg text-muted-foreground" variants={itemVariants}>Tailored solutions designed to meet the unique demands of your sector.</motion.p></div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{siteConfig.industryItems.map((industry, index) => (<motion.div key={index} className="flex items-start p-5 border rounded-lg bg-background/70 shadow-sm" variants={itemVariants}><div className="p-3 rounded-full bg-accent text-accent-foreground mr-4 flex-shrink-0"><industry.icon className="h-6 w-6" /></div><div><h3 className="text-xl font-semibold mb-1">{industry.name}</h3><p className="text-muted-foreground text-sm">{industry.description}</p></div></motion.div>))}</div>
                </AnimatedSection>

                

                <AnimatedSection id="faq" className="bg-gradient-to-b from-accent/20 to-background">
                    <div className="text-center mb-12"><motion.h2 className="text-3xl sm:text-4xl font-bold" variants={itemVariants}>Frequently Asked Questions</motion.h2></div>
                    <motion.div className="max-w-3xl mx-auto" variants={itemVariants}><Accordion type="single" collapsible className="w-full">{siteConfig.faqItems.map((faq, index) => (<AccordionItem key={index} value={`item-${index}`}><AccordionTrigger className="text-lg text-left">{faq.q}</AccordionTrigger><AccordionContent className="text-muted-foreground text-base">{faq.a}</AccordionContent></AccordionItem>))}</Accordion></motion.div>
                </AnimatedSection>
                
                <AnimatedSection className="text-center">
                    <div className="relative py-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden"><h2 className="text-3xl font-bold tracking-tight">Ready to Revolutionize Your Enterprise?</h2><p className="mt-4 max-w-xl mx-auto text-lg text-primary-foreground/80">Join leaders who trust {siteConfig.name} to drive growth and unlock their true potential.</p><div className="mt-8"><Button asChild size="lg" variant="secondary" className="text-primary hover:bg-white/90 scale-105 transition-transform hover:scale-110"><Link href="/signup">Start Your Free Trial Today <ArrowRight className="ml-2 h-5 w-5" /></Link></Button></div></div>
                </AnimatedSection>
            </main>
            {mounted && <AdvancedChatWidget />}
            <LandingFooter onManageCookies={openCookiePreferences} />
            
            {/* --- Cookie Banner and Toast Notification System --- */}
            <Toast message={toast.message} isVisible={toast.visible} />
            {mounted && (
                <AnimatePresence>
                    {showCookieBanner && (
                        <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 z-[100] p-4">
                            <Card className="max-w-xl mx-auto shadow-2xl bg-background/90 backdrop-blur-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> We value your privacy</CardTitle>
                                    {!isCustomizingCookies && <CardDescription>We use cookies to enhance your browsing experience. By clicking "Accept All", you consent to our use of cookies.</CardDescription>}
                                </CardHeader>
                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                                        <Button variant="outline" onClick={() => setIsCustomizingCookies(true)}>Customize</Button>
                                        <Button onClick={handleAcceptAllCookies}>Accept All</Button>
                                    </CardFooter>
                                ) : (
                                    <CardContent className="space-y-4 pt-0">
                                        {siteConfig.cookieCategories.map(category => (
                                            <div key={category.id} className="flex items-start space-x-3 py-2 border-t first:border-t-0">
                                                <Checkbox id={category.id} checked={cookiePreferences[category.id as CookieCategoryKey]} onCheckedChange={() => setCookiePreferences(prev => ({...prev, [category.id]: !prev[category.id as CookieCategoryKey]}))} disabled={category.isRequired} className="mt-1" />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label htmlFor={category.id} className="text-sm font-medium">{category.name} {category.isRequired && <span className="text-muted-foreground text-xs">(Always Active)</span>}</label>
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
            )}
        </>
    );
}