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
    Facebook, Handshake, Home,
    Landmark, Leaf, LifeBuoy, Library, Linkedin, LucideIcon, Menu,
    Quote, ReceiptText, Rocket, Send,
    Signal, Star, Store, Twitter,
    Users, Utensils, WifiOff, X, ArrowRight
} from 'lucide-react';

// --- Type Definitions ---
interface NavItem { title: string; href: string; description: string; icon: LucideIcon; }
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface SolutionItem { icon: LucideIcon; name: string; description: string; }
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
        socials: { linkedin: '#', twitter: '#', facebook: '#' } // Remember to update these links
    },
    featureItems: [
        { icon: ReceiptText, title: "Autonomous Bookkeeping", description: "A complete, GAAP-compliant, double-entry accounting system that runs itself. From automated journal entries to one-click financial statements, master your finances with zero effort." },
        { icon: Box, title: "Unified POS & Inventory", description: "An unstoppable, offline-first POS integrated with multi-location inventory. Manage stock, variants, purchase orders, and sales from a single command center." },
        { icon: Users, title: "CRM & Project Hub", description: "Go from lead to paid project without ever leaving the platform. Manage clients, track project status on a visual Kanban board, and link every document to its source." },
        { icon: Banknote, title: "HCM & Payroll", description: "Hire, manage, and pay your team from a single system. Handle payroll, leave, performance, and provide a dedicated portal for your employees." },
        { icon: Library, title: "Secure Document Fortress", description: "A revolutionary, multi-tenant file explorer for your most sensitive data. Bank-level security and row-level policies make it architecturally impossible for data to cross between tenants." },
    ] as FeatureItem[],
    whyUsItems: [
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Power out, internet down? Business keeps running. Core functions are fully operational, syncing instantly when back online." },
        { icon: BrainCircuit, title: "A True AI Business Partner", description: "Secure, data-aware AI integrated across all modules. Proactive insights on cash flow, client trends, and fraud detection." },
        { icon: Cloud, title: "End Subscription Chaos", description: "Replace 5+ apps with one seamless, intelligent platform at a fraction of the cost. No more data silos or integration fees." }
    ] as WhyUsItem[],
    industrySolutions: [
        { icon: Signal, name: "Telecom & Distribution", description: "Manage airtime distribution, agent networks, and commissions for major carriers like MTN and Airtel with full, real-time transparency." },
        { icon: Store, name: "Retail & E-commerce", description: "Barcode scanning, multi-location stock, and robust sales reporting." },
        { icon: Utensils, name: "Restaurant & Hospitality", description: "Kitchen Display System (KDS) integration, service booking, and ingredient tracking." },
        { icon: Landmark, name: "SACCOs & Microfinance", description: "Streamline member management, loan processing, and regulatory reporting at scale." },
        { icon: Home, name: "Real Estate & Rentals", description: "Automate invoicing, track lease agreements, and manage large property portfolios." },
        { icon: Handshake, name: "Professional Services", description: "Manage appointments, client data, and create professional service invoices." },
    ] as SolutionItem[],
    // TESTIMONIALS (SUCCESS STORIES) HAVE BEEN REMOVED
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
  avatar?: string;
  company?: string;
}
const DetailModal = ({ trigger, title, description, icon: Icon, avatar, company }: DetailModalProps) => (
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
          {avatar && (
            <Image src={avatar} alt={`Avatar of ${title}`} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
          )}
          <div className="flex-1">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            {company && <DialogDescription>{company}</DialogDescription>}
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
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2" aria-label={`${siteConfig.name} Home`}>
                    <Rocket className="h-6 w-6" /> {siteConfig.name}
                </Link>
                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        {/* Features (Tools) Dropdown */}
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
                                                <li className="cursor-pointer">
                                                    <div className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                            <feature.icon className="h-4 w-4 text-primary" /> {feature.title}
                                                        </div>
                                                    </div>
                                                </li>
                                            }
                                        />
                                    ))}
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        {/* Industries Dropdown */}
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Industries</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-1 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                    {siteConfig.industrySolutions.map((solution) => (
                                        <DetailModal
                                            key={solution.name}
                                            title={solution.name}
                                            icon={solution.icon}
                                            description={solution.description}
                                            trigger={
                                                <li className="cursor-pointer">
                                                     <div className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                            <solution.icon className="h-4 w-4 text-primary" /> {solution.name}
                                                        </div>
                                                    </div>
                                                </li>
                                            }
                                        />
                                    ))}
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        {/* STORIES DROPDOWN REMOVED */}
                    </NavigationMenuList>
                </NavigationMenu>
                <div className="hidden lg:flex items-center gap-2">
                    <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
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
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden p-4 border-t bg-background overflow-hidden">
                         <nav className="flex flex-col gap-4 text-lg">
                            <p className="font-bold text-primary mt-2">Features</p>
                            <p className="font-bold text-primary mt-2">Industries</p>
                            {/* STORIES LINK REMOVED FROM MOBILE MENU */}
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
    <footer className="relative border-t bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 pt-12 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-6 w-6" /> {siteConfig.name}</h3>
                    <p className="text-sm text-muted-foreground mt-4 max-w-xs">{siteConfig.shortDescription}</p>
                    <div className="flex items-center gap-5 mt-6">
                        <a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary"><Linkedin size={20} /></a>
                        <a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary"><Twitter size={20} /></a>
                        <a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook size={20} /></a>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-3">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><span className="text-muted-foreground">Features</span></li>
                        <li><span className="text-muted-foreground">Industries</span></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-3">Company</h4>
                    <ul className="space-y-2 text-sm">
                        {/* STORIES LINK REMOVED FROM FOOTER */}
                        <li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Contact Sales</a></li>
                        <li><Link href="#faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold text-base mb-3">Legal</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left">Terms of Service</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Terms of Service</DialogTitle></DialogHeader>{siteConfig.termsOfService}</DialogContent></Dialog></li>
                        <li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left">Privacy Policy</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader>{siteConfig.privacyPolicy}</DialogContent></Dialog></li>
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
    <motion.section id={id} className={cn("relative py-16 sm:py-20", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
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
                <section id="hero" className="relative pt-20 pb-28 overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                            <motion.div variants={itemVariants}>
                                <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary border"><BrainCircuit className="mr-2 h-4 w-4" /> The Intelligent Business OS</span>
                            </motion.div>
                            <motion.h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mt-6" variants={itemVariants}>
                                The One Platform <br />
                                <div className="inline-block h-[1.2em] overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={currentTextIndex}
                                            variants={textVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="block text-primary"
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
                                <Button asChild size="lg"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
                
                 {/* Why Us Section */}
                <AnimatedSection id="why-us">
                    <div className="px-4">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold tracking-tight">Your Unfair Advantage</h2>
                            <p className="text-muted-foreground mt-2">These are not just features; they are your new competitive weapons.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {siteConfig.whyUsItems.map(item => (
                                <motion.div key={item.title} variants={itemVariants}>
                                    <Card className="text-center h-full p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/50">
                                        <item.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                                        <h3 className="text-xl font-bold">{item.title}</h3>
                                        <p className="text-muted-foreground mt-2 text-sm">{item.description}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                {/* FAQ */}
                <AnimatedSection id="faq" className="bg-background/80 backdrop-blur-sm">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center">Your Questions, Answered</h2>
                        <Accordion type="single" collapsible className="w-full mt-8">
                            {siteConfig.faqItems.map(i => (
                                <AccordionItem key={i.q} value={i.q}>
                                    <AccordionTrigger className="text-base text-left hover:no-underline">{i.q}</AccordionTrigger>
                                    <AccordionContent className="text-sm text-muted-foreground pb-4">{i.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </AnimatedSection>

                {/* Final CTA */}
                <AnimatedSection className="text-center container mx-auto px-4">
                    <div className="relative py-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.1] -z-1"></div>
                        <h2 className="text-3xl font-bold tracking-tight">Ready to Revolutionize Your Enterprise?</h2>
                        <p className="mt-4 max-w-xl mx-auto text-lg text-primary-foreground/80">Join leaders who trust {siteConfig.name} to drive growth and unlock their true potential.</p>
                        <div className="mt-8">
                            <Button asChild size="lg" variant="secondary" className="text-primary hover:bg-white/90 scale-105 transition-transform hover:scale-110">
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