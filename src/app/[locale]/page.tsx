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
    Banknote, Bot, Box, BrainCircuit, Cloud,
    Facebook, Handshake, Home, ShieldCheck, TrendingUp,
    Landmark, Leaf, LifeBuoy, Library, Linkedin, LucideIcon, Menu,
    Quote, ReceiptText, Rocket, Send,
    Signal, Star, Store, Twitter, Database,
    Users, Utensils, WifiOff, X, ArrowRight,
    BriefcaseBusiness, Layers3, Zap, ShieldHalf, LayoutGrid, Globe,
    Wallet, ClipboardList, Package, UserCog, Files, Lightbulb
} from 'lucide-react'; // Added more descriptive icons

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
        { icon: Wallet, title: "Autonomous Bookkeeping", description: "A complete, GAAP-compliant, double-entry accounting system that runs itself. From automated journal entries to one-click financial statements." }, // Changed icon
        { icon: Package, title: "Unified POS & Inventory", description: "An unstoppable, offline-first POS integrated with multi-location inventory. Manage stock, variants, purchase orders, and sales from a single command center." }, // Changed icon
        { icon: ClipboardList, title: "CRM & Project Hub", description: "Go from lead to paid project without leaving the platform. Manage clients, track project status on a visual Kanban board, and link every document to its source." }, // Changed icon
        { icon: UserCog, title: "HCM & Payroll", description: "Hire, manage, and pay your team from a single system. Handle payroll, leave, performance, and provide a dedicated portal for your employees." }, // Changed icon
        { icon: Files, title: "Secure Document Fortress", description: "A revolutionary, multi-tenant file explorer for your most sensitive data. Bank-level security and row-level policies make it architecturally impossible for data to cross between tenants." }, // Changed icon
        { icon: Lightbulb, title: "AI Business Copilot", description: "Get proactive, data-driven insights on cash flow, client trends, and fraud detection, helping you make smarter decisions, faster."} // Changed icon
    ] as FeatureItem[],
    standoutItems: [
        { icon: TrendingUp, title: "Built to Scale With You", description: "BBU1 is architected for growth. Whether you're a solo entrepreneur or a global enterprise, our platform scales seamlessly to meet your demands without compromising performance." },
        { icon: LayoutGrid, title: "A Single Source of Truth", description: "Eliminate data silos forever. By unifying every department—from sales and accounting to inventory and HR—you get a real-time, 360-degree view of your entire operation." }, // Changed icon
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Internet down? Power outage? No problem. BBU1's core functions work perfectly offline, ensuring business continuity and revenue protection. Everything syncs the moment you're back online." },
        { icon: Zap, title: "End Subscription Chaos", description: "Replace 5+ expensive, disconnected apps with one intelligent, cost-effective platform. Simplify your workflow, reduce costs, and remove the headache of integration." }, // Changed icon
        { icon: BrainCircuit, title: "True AI Partnership", description: "Our integrated AI is not just a feature; it's a strategic partner. It analyzes your data to find growth opportunities, predict cash flow, and identify risks before they become problems." },
        { icon: ShieldHalf, title: "Bank-Level Security", description: "Your data is your most valuable asset. We protect it with a multi-tenant architecture and end-to-end encryption, ensuring your information is completely isolated and secure." } // Changed icon
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
                { name: "Contractor (General, Remodeling)", icon: Home, description: "Project management, job costing, and client invoicing tailored for the construction and remodeling industry." },
                { name: "Field Service (Trades, HVAC, Plumbing)", icon: Users, description: "Efficiently manage your mobile workforce with scheduling, dispatching, and on-the-go invoicing and payments." },
                { name: "Professional Services (Accounting, Legal)", icon: Landmark, description: "Time tracking, case management, and secure document handling for firms that demand precision and confidentiality." },
                { name: "Distribution", icon: Signal, description: "Manage complex supply chains, agent networks, and commissions for major carriers and distributors with real-time transparency." },
                { name: "Lending / Microfinance", icon: Banknote, description: "A robust solution to streamline member management, automate loan processing, and ensure regulatory reporting at scale." },
                { name: "Rentals / Real Estate", icon: Home, description: "Automate invoicing, track lease agreements, manage maintenance requests, and oversee large property portfolios effortlessly." },
                { name: "SACCO / Co-operative", icon: Landmark, description: "Simplify member contributions, automate loan cycles, and generate instant reports for SACCOs and Co-operatives of any size." },
                { name: "Telecom Services", icon: Signal, description: "Specialized tools for airtime distribution, agent management, and commission tracking for carriers like MTN and Airtel." },
                { name: "Nonprofit", icon: Handshake, description: "Manage donor relationships, track funding, and handle program expenses with full transparency and compliance features." }
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
const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
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
        <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur-md"> {/* Increased blur for depth */}
            <div className="container mx-auto h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2" aria-label={`${siteConfig.name} Home`}>
                    <Rocket className="h-6 w-6 animate-spin-slow" /> {siteConfig.name} {/* Subtle animation for logo */}
                </Link>
                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className="text-foreground hover:text-primary">Features</NavigationMenuTrigger> {/* Improved contrast */}
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-1 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                    {siteConfig.featureItems.map((feature) => (
                                        <DetailModal
                                            key={feature.title}
                                            title={feature.title}
                                            icon={feature.icon}
                                            description={feature.description}
                                            trigger={
                                                <li className="cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent-foreground focus:bg-accent/10 focus:text-accent-foreground group"> {/* Accent hover */}
                                                    <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                        <feature.icon className="h-4 w-4 text-primary group-hover:text-accent transition-colors" /> {feature.title} {/* Icon color change on hover */}
                                                    </div>
                                                </li>
                                            }
                                        />
                                    ))}
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className="text-foreground hover:text-primary">Industries</NavigationMenuTrigger> {/* Improved contrast */}
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
                                                            <li className="cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent-foreground focus:bg-accent/10 focus:text-accent-foreground group"> {/* Accent hover */}
                                                                <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                                    <solution.icon className="h-4 w-4 text-primary group-hover:text-accent transition-colors" /> {solution.name} {/* Icon color change on hover */}
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
                            {/* Improved mobile menu with clickable triggers */}
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
                                                trigger={
                                                    <Button variant="ghost" className="justify-start gap-2 w-full"><feature.icon className="h-4 w-4 text-primary" /> {feature.title}</Button>
                                                }
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
                                                        trigger={
                                                            <Button variant="ghost" className="justify-start gap-2 w-full"><solution.icon className="h-4 w-4 text-primary" /> {solution.name}</Button>
                                                        }
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
    <footer className="relative border-t bg-gradient-to-t from-background/50 via-background to-background/90 backdrop-blur-sm z-10 dark:from-background/50 dark:via-background dark:to-background/90"> {/* Subtle gradient for footer */}
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
            chat.setMessages([
                { id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' } as any
            ]);
        }
    }, [chat.messages.length, chat.setMessages]);
    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = chatInput.trim();
        if (!trimmedInput) return;
        chat.sendMessage({
            content: trimmedInput,
            body: {
                businessId: userContext.businessId,
                userId: userContext.userId,
            }
        });
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

// --- Main Page Component ---
export default function HomePage() {
    const rotatingTexts = [
        "From startup to enterprise.",
        "For every ambition.",
        "Your complete business OS.",
        "Unified and intelligent.",
    ];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [rotatingTexts.length]);

    return (
        <>
            <MegaMenuHeader />
            <main className="flex-grow z-10">
                
                {/* Hero Section */}
                <section id="hero" className="relative pt-20 pb-28 overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background dark:from-background dark:via-primary/10 dark:to-background"> {/* Dynamic gradient background */}
                    {/* Visual system portrayal: subtle animated tech pattern */}
                    <div className="absolute inset-0 z-0 bg-subtle-pattern animate-pulse-subtle"></div> {/* Subtle dots pattern for overall background */}
                    <div className="absolute inset-0 z-0 hero-visual-background"></div> {/* Custom CSS for hero background */}

                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                            <motion.div variants={itemVariants} className="group"> {/* Added group for icon hover */}
                                <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary border border-primary/20 shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                    <BrainCircuit className="mr-2 h-4 w-4 group-hover:animate-spin-slow" /> {/* subtle spin on hover */}
                                    The Intelligent Business OS
                                </span>
                            </motion.div>
                            <motion.h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mt-6 leading-tight" variants={itemVariants}> {/* Adjusted line height */}
                                The One Platform <br />
                                <div className="inline-block h-[1.2em] overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={currentTextIndex}
                                            variants={textVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="block text-primary drop-shadow-md" // Added subtle shadow
                                        >
                                            {rotatingTexts[currentTextIndex]}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </motion.h1>
                            <motion.p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto" variants={itemVariants}>
                                Stop juggling multiple apps. BBU1 is the single, unified operating system for your entire business—from accounting and inventory to team and project management. Built for every business, ready for the world.
                            </motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}>
                                <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow duration-300"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 transition-colors"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                            <motion.div variants={itemVariants} className="mt-16 w-full max-w-4xl mx-auto">
                                
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
                
                 {/* What Makes BBU1 Stand Out Section */}
                <AnimatedSection id="standout" className="bg-background relative">
                    <div className="absolute inset-0 z-0 bg-features-pattern animate-pulse-subtle"></div> {/* Pattern for this section */}
                    <div className="px-4 relative z-10">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold tracking-tight">What Makes BBU1 Stand Out</h2>
                            <p className="text-muted-foreground mt-2">BBU1 is engineered from the ground up to not just manage your business, but to accelerate its growth and simplify complexity.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {siteConfig.standoutItems.map(item => (
                                <motion.div key={item.title} variants={itemVariants}>
                                    <Card className="text-left h-full hover:shadow-primary/20 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/70 backdrop-blur-sm border-primary/10"> {/* Enhanced card styles */}
                                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                            <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary transition-colors">
                                                <item.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                                            </div>
                                            <CardTitle className="text-lg">{item.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-sm">{item.description}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                    <motion.div variants={itemVariants} className="mt-16 w-full max-w-4xl mx-auto">
                        
                    </motion.div>
                </AnimatedSection>
                
                {/* FAQ */}
                <AnimatedSection id="faq" className="bg-gradient-to-br from-background via-accent/5 to-background dark:from-background dark:via-accent/10 dark:to-background"> {/* New gradient background for FAQ */}
                    <div className="max-w-3xl mx-auto relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-8">Your Questions, Answered</h2>
                        <Accordion type="single" collapsible className="w-full mt-8 rounded-lg border border-border/50 bg-background/70 backdrop-blur-sm shadow-lg"> {/* Card-like accordion */}
                            {siteConfig.faqItems.map(i => (
                                <AccordionItem key={i.q} value={i.q} className="px-4">
                                    <AccordionTrigger className="text-base text-left hover:no-underline font-semibold py-4 hover:text-primary transition-colors">{i.q}</AccordionTrigger>
                                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{i.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </AnimatedSection>

                {/* Final CTA */}
                <AnimatedSection className="text-center container mx-auto px-4">
                    <div className="relative py-16 bg-cta-gradient text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden transform hover:scale-[1.01] transition-transform duration-300"> {/* Gradient CTA and subtle scale on hover */}
                        <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.1] dark:bg-grid-black/[0.1] -z-1"></div>
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