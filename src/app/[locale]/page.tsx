'use client';

import React, { useState, useRef, forwardRef, type ReactNode, type ElementRef, type ComponentPropsWithoutRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
// --- Vercel AI SDK Imports ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
// --- UI Components from shadcn/ui ---
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
// --- Utils & Icons ---
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, BrainCircuit, Facebook, Handshake, Home, ShieldCheck, TrendingUp,
    Landmark, Leaf, Linkedin, LucideIcon, Menu,
    Rocket, Send, Signal, Store, Twitter,
    Users, Utensils, WifiOff, X, ArrowRight,
    Zap, ShieldHalf, LayoutGrid, Lightbulb,
    Wallet, ClipboardList, Package, UserCog, Files
} from 'lucide-react';

// --- Type Definitions ---
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface IndustryItem { name: string; icon: LucideIcon; description: string; }
interface IndustryCategory { category: string; items: IndustryItem[]; }
interface FaqItem { q: string; a: ReactNode; }
interface WhyUsItem { icon: LucideIcon; title: string; description: string; }

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
       { q: 'Is my enterprise data secure?', a: 'Yes. BBU1 uses a multi-tenant architecture with PostgreSQL\'s Row-Level Security. Your data is completely isolated and protected by bank-level, end-to-end encryption.' },
       { q: 'Can the system be customized?', a: 'Absolutely. While powerful out-of-the-box, we offer customization services and API access for enterprise clients to tailor the system to your unique workflows.' },
       { q: 'What kind of support is offered?', a: 'Enterprise plans include dedicated onboarding, an account manager, priority support via WhatsApp or phone, and a Service Level Agreement (SLA) guaranteeing uptime.' },
    ] as FaqItem[],
    termsOfService: ( <div className="space-y-4 text-sm"><p>Welcome to BBU1. These Terms govern your use of our Service. By using our Service, you agree to these terms...</p></div> ),
    privacyPolicy: ( <div className="space-y-4 text-sm"><p>We collect Personal, Transactional, and Usage Data to provide and improve our Service. Your data is secured with bank-level encryption and is never sold...</p></div> ),
};

// --- Animation Variants ---
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const textVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } }
};

// --- Reusable Modal Component ---
interface DetailModalProps {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  icon?: LucideIcon;
}
const DetailModal = ({ trigger, title, description, icon: Icon }: DetailModalProps) => (
  <Dialog>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="bg-primary/10 p-3 rounded-md w-fit">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
        </div>
      </DialogHeader>
      <div className="py-4 text-muted-foreground">{description}</div>
    </DialogContent>
  </Dialog>
);

// --- Header with Interactive Dropdowns ---
const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
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
                    <Button variant="ghost" asChild className="hover:text-primary"><Link href="/login">Log In</Link></Button>
                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                    <ModeToggle />
                </div>
                <div className="lg:hidden flex items-center gap-2">
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
const LandingFooter = () => (
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
const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-16 sm:py-20 overflow-hidden", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <div className="container mx-auto px-4 relative z-10">{children}</div>
    </motion.section>
);

// --- AI Chat Widget ---
const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};
const renderMessageContent = (content: CoreMessage['content']): ReactNode => {
    if (typeof content === 'string') return content;
    return content.map((part, index) => {
        if ((part as any).type === 'text') {
            return <React.Fragment key={index}>{(part as any).text}</React.Fragment>;
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
    const chat: any = useChat({} as any);
    useEffect(() => {
        if (chat.messages.length === 0 && chat.setMessages) {
            chat.setMessages([{ id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' } as any]);
        }
    }, [chat.messages.length, chat.setMessages]);
    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = chatInput.trim();
        if (!trimmedInput) return;
        chat.sendMessage({ content: trimmedInput, body: { businessId: userContext.businessId, userId: userContext.userId }});
        setChatInput('');
    };
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chat.messages]);
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-50">
                        <Card className="h-full w-full flex flex-col shadow-2xl"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle><CardDescription>Your AI Business Analyst</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button></CardHeader><CardContent className="flex-1 flex flex-col p-0"><ScrollArea className="flex-1 p-4" ref={scrollRef}><div className="space-y-4">{chat.messages.map((m: CoreMessage, i: number) => (<div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>{m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Bot className="h-4 w-4" /></div>}<div className={cn('rounded-lg p-3 max-w-[85%] break-words', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border')}>{renderMessageContent(m.content)}</div>{m.role === 'user' && <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0 border"><Users className="h-4 w-4" /></div>}</div>))}{chat.isLoading && <div className="text-sm text-muted-foreground animate-pulse">Aura is thinking...</div>}</div></ScrollArea><div className="p-4 border-t"><form onSubmit={handleChatSubmit} className="flex items-center gap-2"><Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask Aura anything..." disabled={chat.isLoading || !userContext.userId} /><Button type="submit" size="icon" disabled={chat.isLoading || !userContext.userId || !chatInput.trim()}><Send className="h-4 w-4" /></Button></form></div></CardContent></Card>
                    </motion.div>
                )}
            </AnimatePresence>
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95" aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>{isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}</Button>
        </>
    );
};

// --- Professional SVG Logos for Social Proof section ---
const Logo1 = () => <svg height="48" viewBox="0 0 120 48" fill="currentColor"><path d="M60 0C26.86 0 0 26.86 0 60V0h60z"/><path d="M60 48c33.14 0 60-26.86 60-60V48H60z" opacity=".5"/></svg>;
const Logo2 = () => <svg height="48" viewBox="0 0 120 48" fill="currentColor"><path d="M0 24c0 13.25 10.75 24 24 24h72c13.25 0 24-10.75 24-24S109.25 0 96 0H24C10.75 0 0 10.75 0 24z"/><circle cx="24" cy="24" r="12" fill="#fff" opacity=".5"/></svg>;
const Logo3 = () => <svg height="48" viewBox="0 0 120 48" fill="currentColor"><path d="M24 0h72l24 24-24 24H24L0 24 24 0z"/><path d="M24 0l12 12-12 12L12 12 24 0z" opacity=".5"/></svg>;
const Logo4 = () => <svg height="48" viewBox="0 0 120 48" fill="currentColor"><circle cx="24" cy="24" r="24"/><circle cx="96" cy="24" r="24" opacity=".5"/></svg>;
const Logo5 = () => <svg height="48" viewBox="0 0 120 48" fill="currentColor"><path d="M0 0h120v48H0V0zm24 12h72v24H24V12z" opacity=".5"/><path d="M0 0l60 48L120 0H0z"/></svg>;
const Logo6 = () => <svg height="48" viewBox="0 0 120 48" fill="currentColor"><path d="M60 0L0 48h120L60 0zm0 12l24 18H36l24-18z" opacity=".5"/><path d="M60 12l-12 9h24l-12-9z"/></svg>;

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


    // --- Configuration for the Hero Image Slideshow ---
    const heroImages = [
        { src: "/images/showcase/modern-office-team.jpg", alt: "Diverse team collaborating in a modern office with BBU1's analytics dashboards showing revenue growth." },
        { src: "/images/showcase/crm-team-meeting.jpg", alt: "A corporate team discussing a project on a large screen displaying the BBU1 CRM." },
        { src: "/images/showcase/healthcare-team.jpg", alt: "Medical professionals using BBU1 on tablets to manage patient records in a clinic." },
        { src: "/images/showcase/warehouse-logistics.jpg", alt: "Logistics team managing inventory with BBU1 on handheld scanners in a large warehouse." },
        { src: "/images/showcase/market-qr-payment.jpg", alt: "A smiling vendor at a vibrant fruit market uses a modern POS system powered by BBU1." },
        { src: "/images/showcase/construction-site.jpg", alt: "Construction managers reviewing project blueprints on ruggedized tablets running BBU1 software on site." }
    ];
    const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);

    useEffect(() => {
        const imageInterval = setInterval(() => {
            setCurrentHeroImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
        }, 5000); // Change image every 5 seconds
        return () => clearInterval(imageInterval);
    }, [heroImages.length]);

    // --- NEW: Configuration for the "In Action" Gallery Section ---
    // THIS LIST NOW CONTAINS ALL YOUR IMAGES FROM THE SHOWCASE FOLDER
    const galleryImages = [
        { src: "/images/showcase/farmers-learning.jpg", title: "Agricultural Cooperatives", alt: "A group of farmers in a rural setting learning and collaborating using BBU1 on mobile devices." },
        { src: "/images/showcase/healthcare-team.jpg", title: "Healthcare Management", alt: "A team of doctors and nurses consulting with a patient, using BBU1 on tablets to access medical records." },
        { src: "/images/showcase/market-vendor-payfast.jpg", title: "Marketplace Payments", alt: "A female vendor at a bustling market receives a payment from a customer using a mobile payment system." },
        { src: "/images/showcase/agriculture-tech.jpg", title: "Modern Farming", alt: "Farmers in a field harvesting crops with a BBU1 business support dashboard displayed on a tablet." },
        { src: "/images/showcase/local-shop-owner.jpg", title: "Local Commerce", alt: "A friendly shopkeeper in a local store serves customers using a BBU1 point-of-sale system." },
        { src: "/images/showcase/produce-inspection.jpg", title: "Supply Chain & QC", alt: "Workers in safety vests inspecting a harvest of fresh produce, using a mobile app for quality control." },
        { src: "/images/showcase/market-boy-bbu1.jpg", title: "Offline POS", alt: "A young boy at a muddy market stall uses a durable BBU1 POS terminal to manage sales." },
        { src: "/images/showcase/sacco-meeting.jpg", title: "Financial Inclusion", alt: "Members of a community SACCO having a meeting under a tree, using BBU1 on their smartphones." },
        { src: "/images/showcase/market-qr-payment.jpg", title: "Digital Payments", alt: "A vendor at a vegetable stall accepts a QR code payment from a customer via a smartphone." },
        { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom Services", alt: "An MTN mobile money agent assists customers with transactions using the BBU1 system on a tablet." },
        { src: "/images/showcase/office-admin-bbu1.jpg", title: "Business Administration", alt: "A professional woman works in a sunlit office, managing documents with the BBU1 business system on her laptop." },
        { src: "/images/showcase/cattle-market-records.jpg", title: "Livestock Management", alt: "A man at a cattle market digitizes handwritten records into the BBU1 system on his phone." },
        { src: "/images/showcase/shop-owner-mobile.jpg", title: "Small Business Tech", alt: "A young woman in her shop uses her smartphone and a BBU1 device to manage inventory and sales." },
        { src: "/images/showcase/community-group-meeting.jpg", title: "Community Groups", alt: "A group of women sit together, laughing and learning, with notebooks and smartphones for their meeting." },
        { src: "/images/showcase/literacy-and-tech.jpg", title: "Bridging the Digital Divide", alt: "An elderly man in a rustic home uses a smartphone to cross-reference his handwritten notes." },
        { src: "/images/showcase/roadside-fruit-stand.jpg", title: "Roadside Commerce", alt: "A vendor at a roadside fruit and goods stall uses his phone to manage his business." },
        { src: "/images/showcase/bakery-pos-system.jpg", title: "Bakery & Cafe POS", alt: "Bakers in a professional kitchen use a tablet-based BBU1 POS system to manage orders." },
        { src: "/images/showcase/ai-warehouse-logistics.jpg", title: "AI-Powered Logistics", alt: "Workers in a futuristic warehouse use tablets to manage inventory with AI-driven data visualizations on screens." },
        { src: "/images/showcase/mobile-clinic-pharmacy.jpg", title: "Mobile Healthcare", alt: "Medical staff stock a mobile pharmacy van, using tablets to manage medical inventory on the go." },
        { src: "/images/showcase/artisan-cooperative-tech.jpg", title: "Artisan Cooperatives", alt: "A group of artisans making colorful crafts use their smartphones to manage orders and sales." },
        { src: "/images/showcase/warehouse-scanning.jpg", title: "Warehouse Management", alt: "Warehouse employees use handheld scanners and phones to scan barcodes and manage stock." },
        { src: "/images/showcase/retail-fashion.jpg", title: "Fashion Retail", alt: "Two women in a vibrant fabric shop use a BBU1 tablet to browse inventory and complete a sale." },
        { src: "/images/showcase/street-food-vendor-payment.jpg", title: "Food Stall POS", alt: "A street food vendor shows a customer an AI-powered business dashboard on his phone while accepting a payment." },
        { src: "/images/showcase/classroom-tablets.jpg", title: "Educational Tech", alt: "Students in a classroom engage with a lesson using tablets connected to the BBU1 system." },
        { src: "/images/showcase/cafe-pos-system.jpg", title: "Restaurant POS", alt: "A barista at a modern cafe takes an order on a sleek BBU1 point-of-sale system." },
        { src: "/images/showcase/retail-ai-integration.jpg", title: "AI in Retail", alt: "A shop assistant uses her phone to interact with an AI interface overlaid on the store's POS system." },
        { src: "/images/showcase/crm-team-meeting.jpg", title: "Corporate CRM", alt: "A diverse corporate team in a boardroom discusses strategy around a large screen displaying the BBU1 CRM." },
        { src: "/images/showcase/office-team-collaboration.jpg", title: "Team Collaboration", alt: "A happy and diverse team collaborates in a bright office, using BBU1 on multiple devices." },
        { src: "/images/showcase/fishery-management.jpg", title: "Fisheries & Supply Chain", alt: "Fishermen use rugged tablets with the BBU1 system to log their catch and manage distribution." },
        { src: "/images/showcase/call-center-crm.jpg", title: "Customer Support", alt: "Customer service agents in a call center use the BBU1 CRM with holographic displays to assist clients." },
        { src: "/images/showcase/clinic-patient-management.jpg", title: "Clinic Management", alt: "Nurses in a clean, modern African clinic use tablets to manage patient data and schedules." },
        { src: "/images/showcase/delivery-logistics-app.jpg", title: "Delivery & Logistics", alt: "A delivery team in uniform coordinates their routes using the BBU1 logistics app on their phones." },
        { src: "/images/showcase/grocery-store-bbu1.jpg", title: "Grocery & General Store", alt: "A family running a rustic grocery store interacts with a customer using BBU1 on tablets." },
        { src: "/images/showcase/office-presentation-dashboard.jpg", title: "Business Intelligence", alt: "A young professional presents a BBU1 dashboard to his team on a large interactive whiteboard." },
        { src: "/images/showcase/restaurant-kitchen-orders.jpg", title: "Kitchen Display System", alt: "Chefs in a busy restaurant kitchen use tablets running BBU1's KDS to manage incoming orders." },
        { src: "/images/showcase/future-of-business-tech.jpg", title: "Future of Business", alt: "A group of professionals in a city interacts with holographic BBU1 dashboards on their phones." },
        { src: "/images/showcase/creative-agency-pm.jpg", title: "Project Management", alt: "A creative team in a colorful studio uses BBU1 for project management on their computers and tablets." },
        { src: "/images/showcase/workflow-collaboration.jpg", title: "Workflow Design", alt: "Team members collaborate by drawing a workflow diagram on a glass wall, supplemented by their tablets." },
        { src: "/images/showcase/modern-office-analytics.jpg", title: "Data Analytics", alt: "An office team analyzes performance data on dual-monitor setups running BBU1 analytics dashboards." },
        { src: "/images/showcase/hotel-reception-pos.jpg", title: "Hospitality", alt: "Hotel receptionists smile as they assist guests, using BBU1 on tablets for check-ins and management." },
        { src: "/images/showcase/construction-site-blueprints.jpg", title: "Construction Management", alt: "Two construction workers on a dusty site review digital blueprints on rugged BBU1 tablets." },
        { src: "/images/showcase/education-dashboard.jpg", title: "EdTech Dashboards", alt: "A teacher in a rural classroom uses a laptop to present BBU1 educational dashboards to engaged students." },
        { src: "/images/showcase/logistics-handheld-scanner.jpg", title: "Logistics & Warehousing", alt: "A worker in a warehouse uses a rugged BBU1 handheld device to scan a package barcode." },
        { src: "/images/showcase/retail-system-customer-service.jpg", title: "In-Store Assistance", alt: "A retail employee uses a BBU1 tablet to provide information to a couple in a modern clothing store." },
        { src: "/images/showcase/construction-site.jpg", title: "Heavy Industry", alt: "A construction worker on a mining site uses a rugged tablet with heavy machinery in the background." },
        { src: "/images/showcase/modern-office-team.jpg", title: "Enterprise Ready", alt: "A diverse team in a modern office, collaborating effectively with BBU1's powerful business tools." },
    ];


    return (
        <>
            <MegaMenuHeader />
            <main className="flex-grow z-10">

                {/* === NEW HERO SECTION WITH BACKGROUND IMAGE === */}
                <section id="hero" className="relative pt-20 pb-28 overflow-hidden text-white">
                    {/* Background Image & Overlay */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="/images/showcase/agriculture-tech.jpg"
                            alt="A background image showing a modern farm with technology integration."
                            fill
                            style={{ objectFit: 'cover' }}
                            className="opacity-90"
                            priority // Load this image first
                        />
                        {/* Dark Overlay for Text Readability */}
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/70"></div>
                    </div>

                    {/* Main Content */}
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                            <motion.div variants={itemVariants} className="group">
                                {/* Badge is now lighter to stand out on the dark background */}
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
                                {/* Buttons are updated to stand out */}
                                <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-blue-500 hover:bg-blue-600 text-white"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 transition-colors"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                            
                            {/* Slideshow (preserved below the text) */}
                            <motion.div variants={itemVariants} className="mt-16 w-full max-w-6xl mx-auto px-4">
                                <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl shadow-black/30 border border-white/10 bg-black/20">
                                    <div className="absolute -inset-8 bg-blue-500/20 rounded-full blur-3xl opacity-50 dark:opacity-30 animate-[pulse_8s_ease-in-out_infinite] z-0"></div>
                                    <AnimatePresence>
                                        <motion.div
                                            key={currentHeroImageIndex}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                            className="absolute inset-0 z-10"
                                        >
                                            <Image
                                                src={heroImages[currentHeroImageIndex].src}
                                                alt={heroImages[currentHeroImageIndex].alt}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                                className="relative"
                                                priority={currentHeroImageIndex === 0}
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </motion.div>

                        </motion.div>
                    </div>
                </section>
                {/* === END OF NEW HERO SECTION === */}

                {/* Social Proof Section */}
                <AnimatedSection id="trusted-by" className="py-12 bg-secondary/50">
                    <div className="text-center">
                        <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">Trusted by innovative companies in Africa & beyond</h3>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6 items-center">
                            <motion.div variants={itemVariants} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex justify-center text-muted-foreground"><Logo1 /></motion.div>
                            <motion.div variants={itemVariants} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex justify-center text-muted-foreground"><Logo2 /></motion.div>
                            <motion.div variants={itemVariants} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex justify-center text-muted-foreground"><Logo3 /></motion.div>
                            <motion.div variants={itemVariants} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex justify-center text-muted-foreground"><Logo4 /></motion.div>
                            <motion.div variants={itemVariants} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex justify-center text-muted-foreground"><Logo5 /></motion.div>
                            <motion.div variants={itemVariants} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300 flex justify-center text-muted-foreground"><Logo6 /></motion.div>
                        </motion.div>
                    </div>
                </AnimatedSection>

                {/* What Makes BBU1 Stand Out Section */}
                <AnimatedSection id="standout" className="bg-background relative">
                    <div className="absolute inset-0 z-0 bg-features-pattern"></div>
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

                {/* === BBU1 IN ACTION GALLERY - NOW SHOWING ALL IMAGES === */}
                <AnimatedSection id="in-action" className="bg-secondary/20">
                    <div className="text-center mb-12 max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold tracking-tight">BBU1 in Action: Powering Diverse Industries</h2>
                        <p className="text-muted-foreground mt-2">See how BBU1 adapts to and empowers businesses across various sectors, from local markets to global enterprises.</p>
                    </div>
                    <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {galleryImages.map((image, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Card className="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group">
                                    <div className="aspect-w-4 aspect-h-3 overflow-hidden">
                                        <Image
                                            src={image.src}
                                            alt={image.alt}
                                            width={600}
                                            height={450}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base">{image.title}</CardTitle>
                                    </CardHeader>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
                {/* === END OF GALLERY SECTION === */}

                {/* FAQ Section */}
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

                {/* Final CTA Section */}
                <AnimatedSection className="text-center container mx-auto px-4">
                    <div className="relative py-16 bg-cta-gradient text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
                        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern-dark opacity-10 -z-1"></div>
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
            <LandingFooter />
        </>
    );
}