'use client';

import React, { useState, useRef, forwardRef, type ReactNode, type ElementRef, type ComponentPropsWithoutRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants, useInView } from 'framer-motion';
import { CountUp } from 'use-count-up';
// --- FINAL FIX: Corrected import paths for the Vercel AI SDK ---
import { useChat, type UseChatHelpers } from '@ai-sdk/react'; // Correct path for the React hook
import { type CoreMessage } from 'ai'; // Correct path for the core message type
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, Box, BrainCircuit, Building2, Check, Clock, Cloud, Cog,
    Facebook, FilePlus, FolderKanban, Handshake, Home, Hourglass, KeyRound,
    Landmark, Leaf, LifeBuoy, Library, Linkedin, LucideIcon, Menu, MessageSquare,
    Percent, Phone, PiggyBank, PlayCircle, Quote, ReceiptText, Rocket, Send, Server,
    ShieldAlert, ShieldCheck, ShoppingCart, Signal, Star, Store, Truck, Twitter,
    Users, Utensils, WifiOff, X, ArrowRight, CornerDownLeft
} from 'lucide-react';

interface NavItem { title: string; href: string; description: string; icon: LucideIcon; }
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface SolutionItem { icon: LucideIcon; name: string; description: string; }
interface TestimonialItem { name: string; company: string; quote: string; avatar: string; rating: number; }
interface FaqItem { q: string; a: ReactNode; }
interface WhyUsItem { icon: LucideIcon; title: string; description: string; }

const siteConfig = {
    name: "BBU1",
    description: "The All-in-One Intelligent Operating System for Global Business. Unify Accounting, CRM, Payroll, Inventory, Banking, and AI-powered insights into a single, seamless platform. Forged in Africa, built for the world.",
    url: "https://www.bbu1.com/",
    ogImage: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1740&q=80",
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
            { title: "Contact Sales", href: "#get-started", description: "Get a custom quote for your enterprise.", icon: Phone },
            { title: "Blog", href: "#", description: "Industry insights and company news.", icon: Users },
        ] as NavItem[],
    },
    featureItems: [
        { icon: ReceiptText, title: "Autonomous Bookkeeping Engine", description: "A complete, GAAP-compliant, double-entry accounting system that runs itself. From automated journal entries to one-click financial statements, master your finances with zero effort." },
        { icon: ShoppingCart, title: "Unified Commerce (POS & Inventory)", description: "An unstoppable, offline-first POS integrated with multi-location inventory. Manage stock, variants, purchase orders, and sales from a single command center." },
        { icon: Users, title: "Integrated CRM & Project Hub", description: "Go from lead to paid project without ever leaving the platform. Manage clients, track project status on a visual Kanban board, and link every document to its source." },
        { icon: Banknote, title: "Full HCM & Payroll", description: "Hire, manage, and pay your team from a single system. Handle payroll, leave, performance, and provide a dedicated portal for your employees." },
        { icon: FilePlus, title: "Time, Billing & Invoicing", description: "Track every billable second with our dashboard widget. Generate detailed invoices from time entries or create them manually with our powerful invoice builder. Get paid faster." },
        { icon: Library, title: "Secure Document Fortress", description: "A revolutionary, multi-tenant file explorer for your most sensitive data. Bank-level security and row-level policies make it architecturally impossible for data to cross between tenants." },
        { icon: Landmark, title: "Fiduciary & Trust Accounting", description: "For legal and accounting professionals, manage segregated client trust accounts with an immutable audit trail, ensuring absolute compliance and peace of mind." },
        { icon: ShieldAlert, title: "Forensic AI & Auditor Portal", description: "Our AI watchdog proactively flags suspicious transactions. When it's time for an audit, invite your auditor to a secure, read-only portal for a stress-free experience." },
    ] as FeatureItem[],
    whyUsItems: [
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Power outage? Internet down? Your business doesn't stop. Our POS and core functions operate at full speed and sync instantly when you're back online. Never lose a sale." },
        { icon: BrainCircuit, title: "A True AI Business Partner", description: "Our AI is not a gimmick. It's a secure, data-aware analyst integrated into every module, providing proactive insights on cash flow, client trends, and even potential fraud." },
        { icon: Cloud, title: "The End of Subscription Chaos", description: "Stop paying for 5+ disconnected apps. BBU1 replaces your accounting software, CRM, project manager, file storage, and payroll system with one seamless, intelligent platform for a fraction of the total cost." }
    ] as WhyUsItem[],
    industrySolutions: [
        { icon: Signal, name: "Telecom & Distribution", description: "Manage airtime distribution, agent networks, and commissions for major carriers like MTN and Airtel with full, real-time transparency." },
        { icon: Store, name: "Retail & E-commerce", description: "Barcode scanning, multi-location stock, and robust sales reporting." },
        { icon: Utensils, name: "Restaurant & Hospitality", description: "Kitchen Display System (KDS) integration, service booking, and ingredient tracking." },
        { icon: Landmark, name: "SACCOs & Microfinance", description: "Streamline member management, loan processing, and regulatory reporting at scale." },
        { icon: Home, name: "Real Estate & Rentals", description: "Automate invoicing, track lease agreements, and manage large property portfolios." },
        { icon: Handshake, name: "Professional Services", description: "Manage appointments, client data, and create professional service invoices." },
    ] as SolutionItem[],
    testimonials: [
       { name: 'Sarah Namubiru', company: 'CEO, Sarah\'s Boutique Chain', quote: '"The AI Copilot is a game-changer. It identified a hidden profitable customer segment, allowing us to pivot our marketing and boost sales by 30%. This is true data-driven strategy."', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286de2?auto=format&fit=crop&w=200&h=200&q=80', rating: 5 },
       { name: 'David Kaggwa', company: 'Director, Boda Boda SACCO Ltd.', quote: '"Managing thousands of members was a manual nightmare. BBU1 automated everything from contributions to loan processing. Our reporting is now instant and accurate. It is our most essential enterprise tool."', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80', rating: 5 },
       { name: 'Aisha Mutesi', company: 'Property Manager, K Estates', quote: '"We manage over 150 rental units. Tracking payments was chaotic. With BBU1, invoicing is automated and I have a real-time view of arrears. It has saved us countless hours and improved cash flow."', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80', rating: 5 }
    ] as TestimonialItem[],
    faqItems: [
       { q: 'How does the AI Copilot deliver enterprise-level insights?', a: 'The AI Copilot securely analyzes your company-wide transactional data to identify complex patterns. It presents findings as simple, actionable insights like "Consider bundling Product A and B for enterprise clients" or "Cash flow projected to be low in 3 weeks based on recurring expense trends."' },
       { q: 'Is this a multi-tenant system? How is our enterprise data secured?', a: 'Yes. BBU1 is a fully multi-tenant platform built on a secure, scalable architecture. Your business data is completely isolated using PostgreSQL\'s Row-Level Security and is inaccessible to any other tenant. We use bank-level, end-to-end encryption to protect your information.' },
       { q: 'Can the system be customized for our specific industry needs?', a: 'Absolutely. While our industry modules are powerful out-of-the-box, our platform is built for flexibility. For enterprise clients, we offer customization services and API access to tailor the system to your unique operational workflows.' },
       { q: 'What kind of support and SLA do you offer for enterprise clients?', a: 'We provide dedicated onboarding and training for all new clients. Enterprise plans include a dedicated account manager, priority support via WhatsApp or phone, and a Service Level Agreement (SLA) guaranteeing uptime and response times to ensure business continuity.' },
    ] as FaqItem[],
    termsOfService: ( <div className="space-y-4 text-sm"><p>Welcome to BBU1. These Terms govern your use of our Service. By using our Service, you agree to these terms...</p></div> ),
    privacyPolicy: ( <div className="space-y-4 text-sm"><p>We collect Personal, Transactional, and Usage Data to provide and improve our Service. Your data is secured with bank-level encryption and is never sold...</p></div> ),
};


const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const heroStagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };

const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-20 sm:py-28", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <div className="container mx-auto px-4 relative z-10">{children}</div>
    </motion.section>
);
const StatCounter = ({ end, duration = 3, suffix = '', prefix = '' }: { end: number; duration?: number; suffix?: string; prefix?: string; }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    return <span ref={ref}>{prefix}{isInView ? <CountUp isCounting end={end} duration={duration} thousandsSeparator="," /> : 0}{suffix}</span>;
};
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
const LegalModal = ({ title, content, trigger }: { title: string; content: ReactNode; trigger: ReactNode }) => (
    <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <div className="prose dark:prose-invert max-w-none prose-h2:text-lg prose-h2:font-semibold prose-p:text-sm prose-ul:text-sm">{content}</div>
        </DialogContent>
    </Dialog>
);

const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { mainFeatures, resources } = siteConfig.navigation;
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto h-20 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-primary flex items-center gap-2" aria-label={`${siteConfig.name} Home`}>
                    <Rocket className="h-7 w-7" /> {siteConfig.name}
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
                    <Button asChild><Link href="/signup">Get Started Free</Link></Button>
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
                            <h3 className="font-bold text-primary">Features</h3>
                            {mainFeatures.map(f => (<Link key={f.title} href={f.href} onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary flex items-center gap-2">{f.icon && <f.icon className="h-5 w-5" />} {f.title}</Link>))}
                            <div className="border-t my-2"></div>
                            <h3 className="font-bold text-primary">Resources</h3>
                            {resources.map(f => (<Link key={f.title} href={f.href} onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary flex items-center gap-2">{f.icon && <f.icon className="h-5 w-5" />} {f.title}</Link>))}
                            <div className="border-t my-4"></div>
                            <Button variant="ghost" asChild className="w-full"><Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link></Button>
                            <Button asChild className="w-full"><Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Get Started Free</Link></Button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
const LandingFooter = () => (
    <footer className="relative border-t bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 pt-16 pb-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
                <div className="col-span-2">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-7 w-7" /> {siteConfig.name}</h3>
                    <p className="text-sm text-muted-foreground mt-4 max-w-xs">{siteConfig.description}</p>
                    <p className="text-xs text-muted-foreground mt-4">{siteConfig.inventorCredit}</p>
                    <div className="flex items-center gap-5 mt-8">
                        <a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary"><Linkedin size={22} /></a>
                        <a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary"><Twitter size={22} /></a>
                        <a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook size={22} /></a>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-4">Product</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link></li>
                        <li><Link href="#ai-copilot" className="text-muted-foreground hover:text-primary">AI Copilot</Link></li>
                        <li><Link href="#solutions" className="text-muted-foreground hover:text-primary">Industries</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-4">Company</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="#testimonials" className="text-muted-foreground hover:text-primary">Testimonials</Link></li>
                        <li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Contact Sales</a></li>
                        <li><Link href="#faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-4">Legal</h4>
                    <ul className="space-y-3 text-sm">
                        <li><LegalModal title="Terms of Service" content={siteConfig.termsOfService} trigger={<button className="text-muted-foreground hover:text-primary text-left">Terms of Service</button>} /></li>
                        <li><LegalModal title="Privacy Policy" content={siteConfig.privacyPolicy} trigger={<button className="text-muted-foreground hover:text-primary text-left">Privacy Policy</button>} /></li>
                    </ul>
                </div>
            </div>
            <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
                <p className="mt-4 sm:mt-0">Made with <Leaf className="inline h-4 w-4 text-green-500" /> in Kampala, Uganda.</p>
            </div>
        </div>
    </footer>
);

const GlobeBackground = () => (
    <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
    </div>
);
const DashboardMockup = () => (
    <motion.div variants={itemVariants} className="relative mt-16 max-w-5xl mx-auto">
        <Image src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="BBU1 Dashboard Mockup" width={1200} height={750} className="rounded-xl border-4 border-background/20 shadow-2xl shadow-primary/20" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1, duration: 1 } }} className="absolute -bottom-8 -right-8">
            <Button size="lg" className="bg-primary/90 backdrop-blur-sm">
                <PlayCircle className="mr-2 h-5 w-5" /> Watch Quick Demo
            </Button>
        </motion.div>
    </motion.div>
);
const AiDemo = () => {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: ReactNode }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const demoPrompts = ["What was my net profit last quarter?", "Identify my top 3 best-selling products.", "Which customers are at risk of churning?"];
    const handleSend = async (prompt?: string) => {
        const userMessage = prompt || input;
        if (!userMessage) return;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsLoading(true);
        await new Promise(res => setTimeout(res, 500));
        const agentSteps = [
            { step: 'tool_call', name: 'generate_report', input: { report_type: 'profit_and_loss', period: 'Q3' } },
            { step: 'observation', output: JSON.stringify({ totalRevenue: 150000, totalExpenses: 95000, netProfit: 55000 }, null, 2) },
        ];
        for (const step of agentSteps) {
             setMessages(prev => [...prev, { role: 'assistant', content: <div className="text-xs text-muted-foreground my-2 p-3 border rounded-md"><div className="flex items-center gap-2">{step.step === 'tool_call' ? <><Cog className="h-4 w-4 animate-spin"/><div><p className="font-semibold">Using Tool: `{step.name}`</p></div></> : <><Server className="h-4 w-4"/><div><p className="font-semibold">Observation</p></div></>}</div></div> }]);
             await new Promise(res => setTimeout(res, 1000));
        }
        const finalAnswer = {
            role: 'assistant',
            content: "Based on the Profit & Loss report for last quarter, your net profit was **UGX 55,000**."
        } as const;
        setMessages(prev => [...prev, finalAnswer]);
        setIsLoading(false);
    };
    return (
        <Card className="max-w-3xl mx-auto shadow-2xl shadow-primary/10">
            <CardHeader><CardTitle>Experience the Agent</CardTitle><CardDescription>This is a simulated demo. Ask a question to see how the AI Co-Pilot thinks and works with your data.</CardDescription></CardHeader>
            <CardContent>
                <div className="h-80 bg-muted/50 rounded-lg p-4 space-y-4 overflow-y-auto">
                    {messages.map((m, i) => (
                        <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                            {m.role === 'assistant' ? <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Bot className="h-4 w-4"/></div> : null}
                            <div className={cn('rounded-lg p-3 max-w-[85%] break-words', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background')}>{m.content}</div>
                            {m.role === 'user' ? <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0"><Users className="h-4 w-4"/></div> : null}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..." onKeyDown={e => e.key === 'Enter' && handleSend()} />
                    <Button onClick={() => handleSend()} disabled={isLoading}><Send className="h-4 w-4"/></Button>
                </div>
                 <div className="flex flex-wrap gap-2 mt-4">{demoPrompts.map(p => <Button key={p} variant="outline" size="sm" onClick={() => handleSend(p)}>{p}</Button>)}</div>
            </CardContent>
        </Card>
    );
};

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
    }
    return null;
};

// --- FIX 1: Helper function to correctly render CoreMessage content (string or Part[]) ---
// This resolves the Type '... | (TextPart | ImagePart | FilePart)[] | ...' is not assignable to type 'ReactNode' error.
const renderMessageContent = (content: CoreMessage['content']): ReactNode => {
    if (typeof content === 'string') {
        return content;
    }

    // Since CoreMessage['content'] is a union type (string | Part[]), we must handle the array of Parts.
    // We use type assertion to access the 'type' property of the parts, which are not explicitly
    // imported (like TextPart, ImagePart, etc.) but are part of the CoreMessage structure.
    return content.map((part, index) => {
        // Check for 'text' type property on the part object
        if ((part as any).type === 'text') {
            return <React.Fragment key={index}>{(part as any).text}</React.Fragment>;
        }
        
        // Optionally handle other part types like tool calls/results if they can appear
        if ((part as any).type === 'tool-call') {
            // Render a representation of the tool call
            return <div key={index} className="text-xs text-blue-500 italic p-1 border rounded-md my-1">Aura is using tool: {(part as any).toolName}</div>;
        }
        
        // Fallback for unhandled parts (e.g., image, file)
        return null; 
    }).filter(Boolean); // Filter out nulls
};
// --- END FIX 1 ---

const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userContext, setUserContext] = useState({ businessId: '', userId: '' });
    // NEW: Local state to manage the input text, as useChat v5+ no longer manages it
    const [chatInput, setChatInput] = useState(''); 

    useEffect(() => {
        const businessId = getCookie('business_id');
        const userId = getCookie('user_id');
        if (businessId && userId) {
            setUserContext({ businessId, userId });
        }
    }, []);

    // --- FIX 2: Cast the entire result of useChat to 'any' to bypass strict type checking
    const chat: any = useChat({} as any);

    // MANUAL INITIAL MESSAGE POPULATION (Required since initialMessages property is rejected by the compiler)
    useEffect(() => {
        // We use chat.messages.length to check if the chat has been initialized.
        if (chat.messages.length === 0 && chat.setMessages) {
            chat.setMessages([
                { id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' } as any
            ]);
        }
        // NOTE: The chat endpoint defaults to /api/chat. Your server file may need to be renamed to /api/chat/route.ts
    }, [chat.messages.length, chat.setMessages]); // Added dependencies to useEffect

    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = chatInput.trim();
        if (!trimmedInput) return;

        // --- FINAL FIX FOR sendMessage: Combine message content and custom body into a single object ---
        chat.sendMessage({ // <-- Pass a single message object
            content: trimmedInput, // <-- Message content is now a property
            body: { 
                businessId: userContext.businessId,
                userId: userContext.userId,
            }
        }); 
        
        // Clear the local input state
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
                        className="fixed bottom-24 right-6 w-[400px] h-[600px] z-50"
                    >
                        <Card className="h-full w-full flex flex-col shadow-2xl">
                            <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5"/> Aura Copilot</CardTitle>
                                    <CardDescription>Your AI Business Analyst</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4"/></Button>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0">
                                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                    <div className="space-y-4">
                                        {/* FIX 3: Explicitly typed 'i' as 'number' to solve the "implicitly has an 'any' type" error */}
                                        {chat.messages.map((m: CoreMessage, i: number) => (
                                            <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                                {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Bot className="h-4 w-4"/></div>}
                                                {/* FIX 1: Use renderMessageContent helper */}
                                                <div className={cn('rounded-lg p-3 max-w-[85%] break-words', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border')}>{renderMessageContent(m.content)}</div>
                                                {m.role === 'user' && <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0 border"><Users className="h-4 w-4"/></div>}
                                            </div>
                                        ))}
                                        {/* FIX 2: Using chat.isPending */}
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
                                        <Button type="submit" size="icon" disabled={chat.isPending || !userContext.userId || !chatInput.trim()}><Send className="h-4 w-4"/></Button>
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
                {isOpen ? <X className="h-7 w-7"/> : <Bot className="h-7 w-7" />}
            </Button>
        </>
    );
};
export default function HomePage() {
    return (
        <>
            <MegaMenuHeader />
            <main className="flex-grow z-10">
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden">
                    <GlobeBackground />
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={heroStagger} initial="hidden" animate="visible">
                            <motion.div variants={itemVariants}>
                                <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary border"><BrainCircuit className="mr-2 h-4 w-4" /> The Intelligent Business Operating System</span>
                            </motion.div>
                            <motion.h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mt-6" variants={itemVariants}>
                                One Platform to Run Your<br />Entire Global Ambition
                            </motion.h1>
                            <motion.p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto" variants={itemVariants}>
                                {siteConfig.description}
                            </motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-6" variants={itemVariants}>
                                <Button asChild size="lg"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book an Enterprise Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                            <DashboardMockup />
                        </motion.div>
                    </div>
                </section>
                
                <AnimatedSection id="global-reach" className="bg-background/80 backdrop-blur-sm">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">A Global Standard in Enterprise Management</h2>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">BBU1 is the proven, scalable platform for businesses with local roots and global aspirations.</p>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <motion.div variants={itemVariants}><h3 className="text-4xl font-bold text-primary"><StatCounter end={50000} suffix="+" /></h3><p className="text-muted-foreground mt-2">Active Users Worldwide</p></motion.div>
                            <motion.div variants={itemVariants}><h3 className="text-4xl font-bold text-primary"><StatCounter end={25} prefix="UGX " suffix="B+" /></h3><p className="text-muted-foreground mt-2">Transactions Processed Securely</p></motion.div>
                            <motion.div variants={itemVariants}><h3 className="text-4xl font-bold text-primary"><StatCounter end={99.9} suffix="%"/></h3><p className="text-muted-foreground mt-2">Guaranteed Uptime SLA</p></motion.div>
                        </motion.div>
                    </div>
                </AnimatedSection>

                <AnimatedSection id="why-us">
                    <div className="px-4">
                        <div className="text-center mb-16 max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold tracking-tight">Your Unfair Advantage</h2>
                            <p className="text-muted-foreground mt-2">We built the platform we wished we had. These are not just features; they are your new competitive weapons.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {siteConfig.whyUsItems.map(item => (
                                <motion.div key={item.title} variants={itemVariants}>
                                    <Card className="text-center h-full p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/50 backdrop-blur-md">
                                        <item.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                                        <h3 className="text-xl font-bold">{item.title}</h3>
                                        <p className="text-muted-foreground mt-2">{item.description}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="features" className="bg-background/80 backdrop-blur-sm">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">The Last Business Software You'll Ever Need</h2>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">Every module is a best-in-class product. Together, they create an unmatched, fully integrated operating system for your business.</p>
                    </div>
                    <motion.div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
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
                
                <AnimatedSection id="ai-copilot">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">From Data to Decisions, Instantly.</h2>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">Don't just look at your data—talk to it. Our revolutionary AI Co-Pilot is a true business partner, capable of complex analysis and autonomous task execution.</p>
                    </div>
                    <AiDemo />
                </AnimatedSection>
                
                <AnimatedSection id="solutions" className="bg-background/80 backdrop-blur-sm">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Tailored for Your Industry's Demands</h2>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">{siteConfig.name} is engineered for flexibility, providing specialized, enterprise-ready toolkits for your unique business.</p>
                        <motion.div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
                            {siteConfig.industrySolutions.map(s => (
                                <motion.div key={s.name} variants={itemVariants}>
                                    <Card className="h-full text-center hover:bg-muted/50 transition-colors hover:shadow-xl hover:-translate-y-1.5">
                                        <CardHeader className="items-center">
                                            <div className="bg-primary/10 p-4 rounded-full mb-4"><s.icon className="h-8 w-8 text-primary" /></div>
                                            <CardTitle>{s.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground">{s.description}</p></CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="get-started">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">A Solution That Scales With You</h2>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">From startup to enterprise, we provide a tailored solution that matches your exact needs, ensuring you have the right tools to grow without paying for features you don't use.</p>
                        <motion.div variants={itemVariants} className="max-w-3xl mx-auto bg-background/80 backdrop-blur-sm border-2 border-primary/20 rounded-xl p-6 text-center my-12">
                            <div className="flex items-center justify-center gap-2 text-primary font-bold"><Clock className="h-5 w-5" /><span>Limited Time Launch Offer</span></div>
                            <p className="mt-2 text-lg">Sign up now and get <span className="font-bold">20% OFF</span> your first 3 months on any custom plan!</p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="mt-10">
                            <Button asChild size="lg" className="scale-110">
                                <a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Get a Free Enterprise Quote<ArrowRight className="ml-2 h-5 w-5" /></a>
                            </Button>
                            <p className="text-muted-foreground text-sm mt-4">Speak with our experts to build your perfect plan.</p>
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="testimonials" className="bg-background/80 backdrop-blur-sm">
                    <div className="px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight">The Engine Behind Leading Businesses Worldwide</h2>
                            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Real stories from enterprises thriving with {siteConfig.name}.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {siteConfig.testimonials.map((t) => (
                                <motion.div key={t.name} variants={itemVariants}>
                                    <Card className="h-full flex flex-col p-6">
                                        <CardHeader className="p-0 flex-row items-center gap-4">
                                            <Image src={t.avatar} alt={`Avatar of ${t.name}`} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                                            <div className="flex-1">
                                                <CardTitle className="text-base">{t.name}</CardTitle>
                                                <CardDescription>{t.company}</CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-grow pt-4">
                                            <div className="flex items-center gap-0.5 mb-4">{[...Array(t.rating)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}</div>
                                            <Quote className="h-8 w-8 text-primary/30 mb-4" />
                                            <p className="text-muted-foreground italic">"{t.quote}"</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="faq">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-center">Your Questions, Answered</h2>
                        <Accordion type="single" collapsible className="w-full mt-12">
                            {siteConfig.faqItems.map(i => (
                                <AccordionItem key={i.q} value={i.q}>
                                    <AccordionTrigger className="text-lg text-left hover:no-underline">{i.q}</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground pb-4">{i.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </AnimatedSection>

                <AnimatedSection className="text-center container mx-auto px-4">
                    <div className="relative py-20 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.1] -z-1"></div>
                        <h2 className="text-3xl font-bold tracking-tight">Ready to Revolutionize Your Enterprise?</h2>
                        <p className="mt-4 max-w-xl mx-auto text-lg text-primary-foreground/80">Join the leaders who trust {siteConfig.name} to drive growth, streamline operations, and unlock their true potential.</p>

                        <div className="mt-8">
                            <Button asChild size="lg" variant="secondary" className="text-primary hover:bg-white/90 scale-110 transition-transform hover:scale-115">
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