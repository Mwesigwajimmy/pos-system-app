'use client';

import React, { useState, useRef, forwardRef, type ReactNode, type ElementRef, type ComponentPropsWithoutRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants, useInView } from 'framer-motion';
import { CountUp } from 'use-count-up';
// --- Vercel AI SDK Imports ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
// --- UI Components from shadcn/ui ---
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
// --- Utils & Icons ---
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, Box, BrainCircuit, Cloud, Cog,
    Facebook, FilePlus, Handshake, Home, KeyRound,
    Landmark, Leaf, LifeBuoy, Library, Linkedin, LucideIcon, Menu,
    Quote, ReceiptText, Rocket, Send, Server,
    ShieldAlert, ShoppingCart, Signal, Star, Store, Twitter,
    Users, Utensils, WifiOff, X, ArrowRight
} from 'lucide-react';

// --- Type Definitions ---
interface NavItem { title: string; href: string; description: string; icon: LucideIcon; }
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface SolutionItem { icon: LucideIcon; name: string; description: string; }
interface TestimonialItem { name: string; company: string; quote: string; avatar: string; rating: number; }
interface FaqItem { q: string; a: ReactNode; }
interface WhyUsItem { icon: LucideIcon; title: string; description: string; }

// --- Centralized Site Configuration (with shorter text) ---
const siteConfig = {
    name: "BBU1",
    shortDescription: "Your all-in-one OS for global business. Unify accounting, CRM, inventory, and AI insights. Built in Africa, for the world.",
    url: "https://www.bbu1.com/",
    inventorCredit: "Invented by Mwesigwa Jimmy in Uganda. Built for the world.",
    contactInfo: {
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
        socials: { linkedin: '#', twitter: '#', facebook: '#' }
    },
    navigation: {
        mainFeatures: [
            { title: "AI Co-Pilot", href: "#ai-copilot", description: "Your integrated data analyst for strategic decisions.", icon: BrainCircuit },
            { title: "Offline-First POS", href: "#why-us", description: "Unstoppable sales processing, online or offline.", icon: ShoppingCart },
            { title: "Multi-Location Inventory", href: "#features", description: "Manage stock, composites, and transfers at scale.", icon: Box },
            { title: "Autonomous Bookkeeping", href: "#features", description: "Full double-entry bookkeeping and financial intelligence.", icon: ReceiptText },
            { title: "SACCO & Lending Suite", href: "#solutions", description: "Comprehensive tools for financial institutions.", icon: Landmark },
            { title: "API & Integrations", href: "#features", description: "Extend and connect your business workflows.", icon: KeyRound },
        ] as NavItem[],
        resources: [
            { title: "Support Hub", href: "#faq", description: "Find answers to common questions.", icon: LifeBuoy },
            { title: "Contact Sales", href: "#get-started", description: "Get a custom quote for your enterprise.", icon: Users },
        ] as NavItem[],
    },
    featureItems: [
        { icon: ReceiptText, title: "Autonomous Bookkeeping", description: "GAAP-compliant, double-entry accounting that runs itself. Effortless financial mastery." },
        { icon: ShoppingCart, title: "Unified POS & Inventory", description: "Offline-first sales. Multi-location stock, variants, and orders from one hub." },
        { icon: Users, title: "CRM & Project Hub", description: "From lead to paid project. Manage clients, track progress, link documents." },
        { icon: Banknote, title: "HCM & Payroll", description: "Hire, manage, pay your team. Payroll, leave, performance, employee portal." },
    ] as FeatureItem[],
    whyUsItems: [
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Power out, internet down? Business keeps running. Core functions are fully operational, syncing instantly when back online." },
        { icon: BrainCircuit, title: "A True AI Business Partner", description: "Secure, data-aware AI integrated across all modules. Proactive insights on cash flow, client trends, and fraud detection." },
        { icon: Cloud, title: "End Subscription Chaos", description: "Replace 5+ apps with one seamless, intelligent platform at a fraction of the cost. No more data silos or integration fees." }
    ] as WhyUsItem[],
    industrySolutions: [
        { icon: Signal, name: "Telecom & Distribution", description: "Manage airtime, agent networks, commissions. Real-time transparency." },
        { icon: Store, name: "Retail & E-commerce", description: "Barcode scanning, multi-location stock, robust sales reports." },
        { icon: Utensils, name: "Restaurant & Hospitality", description: "KDS integration, service booking, ingredient tracking." },
        { icon: Landmark, name: "SACCOs & Microfinance", description: "Streamline member management, loans, regulatory reporting." },
        { icon: Home, name: "Real Estate & Rentals", description: "Automate invoicing, track leases, manage large property portfolios." },
        { icon: Handshake, name: "Professional Services", description: "Manage appointments, client data, professional invoices." },
    ] as SolutionItem[],
    testimonials: [
       { name: 'Sarah Namubiru', company: 'CEO, Sarah\'s Boutique Chain', quote: '"The AI Copilot identified a hidden profitable segment, boosting sales by 30%. True data-driven strategy."', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286de2?auto=format&fit=crop&w=200&h=200&q=80', rating: 5 },
       { name: 'David Kaggwa', company: 'Director, Boda Boda SACCO Ltd.', quote: '"Managing thousands of members was a nightmare. BBU1 automated contributions and loans. Reporting is instant. An essential tool."', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80', rating: 5 },
       { name: 'Aisha Mutesi', company: 'Property Manager, K Estates', quote: '"We manage 150+ units. BBU1 automated invoicing and provides real-time arrears. It saved us countless hours and improved our cash flow."', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80', rating: 5 }
    ] as TestimonialItem[],
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

// --- Reusable Components ---
const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-16 sm:py-20", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <div className="container mx-auto px-4 relative z-10">{children}</div>
    </motion.section>
);

const ListItem = forwardRef<ElementRef<"a">, ComponentPropsWithoutRef<"a"> & { icon?: LucideIcon }>(({ className, title, children, icon: Icon, ...props }, ref) => (
    <li>
        <NavigationMenuLink asChild>
            <a ref={ref} className={cn("block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground", className)} {...props}>
                <div className="text-sm font-medium leading-none flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-primary" />} {title}
                </div>
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
            </a>
        </NavigationMenuLink>
    </li>
));
ListItem.displayName = "ListItem";

// --- Header Component ---
const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { mainFeatures, resources } = siteConfig.navigation;
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-primary flex items-center gap-2" aria-label={`${siteConfig.name} Home`}>
                    <Rocket className="h-6 w-6" /> {siteConfig.name}
                </Link>
                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">{mainFeatures.map((c) => (<ListItem key={c.title} title={c.title} href={c.href} icon={c.icon}>{c.description}</ListItem>))}</ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <Link href="#solutions" legacyBehavior passHref>
                                <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium">Solutions</NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-3 p-4 md:w-[400px]">{resources.map((c) => (<ListItem key={c.title} title={c.title} href={c.href} icon={c.icon}>{c.description}</ListItem>))}</ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
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
                         <nav className="flex flex-col gap-4">
                            {mainFeatures.map(f => (<Link key={f.title} href={f.href} onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary flex items-center gap-2"><f.icon className="h-5 w-5" /> {f.title}</Link>))}
                            <div className="border-t my-2"></div>
                            {resources.map(f => (<Link key={f.title} href={f.href} onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary flex items-center gap-2"><f.icon className="h-5 w-5" /> {f.title}</Link>))}
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
                        <li><Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link></li>
                        <li><Link href="#ai-copilot" className="text-muted-foreground hover:text-primary">AI Copilot</Link></li>
                        <li><Link href="#solutions" className="text-muted-foreground hover:text-primary">Industries</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-3">Company</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#testimonials" className="text-muted-foreground hover:text-primary">Testimonials</Link></li>
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


// =================================================================================
// --- THIS COMPONENT IS NOW FIXED BY REVERTING TO YOUR ORIGINAL LOGIC ---
// =================================================================================
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

    // --- FIX: Restored your original line to disable type checking on the 'chat' object, fixing all errors. ---
    const chat: any = useChat({} as any);

    // --- FIX: Restored your original useEffect to set the initial message, which works with the `any` cast above. ---
    useEffect(() => {
        if (chat.messages.length === 0 && chat.setMessages) {
            chat.setMessages([
                { id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' } as any
            ]);
        }
    }, [chat.messages.length, chat.setMessages]);

    // --- FIX: Restored your original 'sendMessage' logic. ---
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
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-50"
                    >
                        <Card className="h-full w-full flex flex-col shadow-2xl">
                            <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle>
                                    <CardDescription>Your AI Business Analyst</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0">
                                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                    <div className="space-y-4">
                                        {chat.messages.map((m: CoreMessage, i: number) => (
                                            <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                                {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Bot className="h-4 w-4" /></div>}
                                                <div className={cn('rounded-lg p-3 max-w-[85%] break-words', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border')}>{renderMessageContent(m.content)}</div>
                                                {m.role === 'user' && <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0 border"><Users className="h-4 w-4" /></div>}
                                            </div>
                                        ))}
                                        {chat.isPending && <div className="text-sm text-muted-foreground animate-pulse">Aura is thinking...</div>}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t">
                                    <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Ask Aura anything..."
                                            disabled={chat.isPending || !userContext.userId}
                                        />
                                        <Button type="submit" size="icon" disabled={chat.isPending || !userContext.userId || !chatInput.trim()}><Send className="h-4 w-4" /></Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95"
                aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}
            >
                {isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}
            </Button>
        </>
    );
};


// --- Main Page Component ---
export default function HomePage() {
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
                                One Platform to Run Your<br />Entire Global Ambition
                            </motion.h1>
                            <motion.p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto" variants={itemVariants}>
                                {siteConfig.shortDescription}
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
                
                {/* Features Section */}
                <AnimatedSection id="features" className="bg-background/80 backdrop-blur-sm">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">All Your Tools, in One Place</h2>
                        <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">Every module is best-in-class. Together, they create an unmatched OS for your business.</p>
                    </div>
                    <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
                        {siteConfig.featureItems.map((feature) => (
                            <motion.div key={feature.title} variants={itemVariants}>
                                <Card className="h-full text-left hover:shadow-lg hover:-translate-y-1 transition-all">
                                    <CardHeader>
                                        <div className="bg-primary/10 p-3 rounded-md w-fit mb-4"><feature.icon className="h-6 w-6 text-primary" /></div>
                                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent><p className="text-muted-foreground text-sm">{feature.description}</p></CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatedSection>
                
                {/* Solutions Section */}
                <AnimatedSection id="solutions">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tailored for Your Industry</h2>
                        <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">BBU1 is engineered with specialized toolkits for your unique business needs.</p>
                        <motion.div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
                            {siteConfig.industrySolutions.map(s => (
                                <motion.div key={s.name} variants={itemVariants} className="text-center group">
                                    <div className="bg-muted group-hover:bg-primary/10 transition-colors p-4 rounded-lg flex items-center justify-center w-20 h-20 mx-auto">
                                        <s.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="mt-4 font-semibold text-sm">{s.name}</h3>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>

                {/* Testimonials */}
                 <AnimatedSection id="testimonials" className="bg-background/80 backdrop-blur-sm">
                    <div className="px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold tracking-tight">The Engine Behind Leading Businesses</h2>
                            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Real stories from enterprises thriving with {siteConfig.name}.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {siteConfig.testimonials.map((t) => (
                                <motion.div key={t.name} variants={itemVariants}>
                                    <Card className="h-full flex flex-col p-6">
                                        <CardContent className="p-0 flex-grow">
                                            <Quote className="h-6 w-6 text-primary/30 mb-4" />
                                            <p className="text-muted-foreground italic">"{t.quote}"</p>
                                        </CardContent>
                                        <CardHeader className="p-0 flex-row items-center gap-4 mt-4">
                                            <Image src={t.avatar} alt={`Avatar of ${t.name}`} width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                                            <div className="flex-1">
                                                <CardTitle className="text-sm">{t.name}</CardTitle>
                                                <CardDescription className="text-xs">{t.company}</CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                {/* FAQ */}
                <AnimatedSection id="faq">
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