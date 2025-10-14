'use client';

import React, { useState, useEffect, useRef, forwardRef, type ReactNode, type ElementRef, type ComponentPropsWithoutRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants, useInView } from 'framer-motion';
import { CountUp } from 'use-count-up';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { cn } from "@/lib/utils";
import {
    Check, ShoppingCart, Box, Users, Landmark, Store, Utensils,
    Handshake, Star, ArrowRight, Phone, Building2, Signal, // Added Signal icon
    Linkedin, Twitter, Facebook, Menu, X, Rocket,
    Clock, Quote, WifiOff, TrendingDown, MessageSquare, LifeBuoy,
    ReceiptText, Leaf, LucideIcon, Home, BrainCircuit,
    Cloud, Percent, PiggyBank, Truck, KeyRound, ShieldCheck
} from 'lucide-react';

// --- TYPE DEFINITIONS (Interfaces for structured content) ---
interface NavItem { title: string; href: string; description: string; icon: LucideIcon; }
interface FeatureItem { icon: LucideIcon; title: string; description: string; }
interface SolutionItem { icon: LucideIcon; name: string; description: string; }
interface TestimonialItem { name: string; company: string; quote: string; avatar: string; }
interface FaqItem { q: string; a: ReactNode; }

// --- REVOLUTIONARY SITE CONFIGURATION: ALIGNED WITH YOUR ENTIRE SYSTEM ---
const siteConfig = {
    name: "BBU1",
    description: "The Global Operating System for Ambitious Enterprise. Unify your POS, Inventory, Cloud Accounting, Telecoms, and AI-driven insights into one powerful, scalable platform for Africa, Uganda, and the world.",
    url: "https://www.bbu1.com/",
    ogImage: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1740&q=80",
    inventorCredit: "Invented by Mwesigwa Jimmy and brought to life by a great team.",
    contactInfo: {
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
        socials: { linkedin: '#', twitter: '#', facebook: '#' }
    },
    navigation: {
        mainFeatures: [
            { title: "AI Co-Pilot", href: "#ai-copilot", description: "Your integrated data analyst for strategic decisions.", icon: BrainCircuit },
            { title: "Offline-First POS", href: "#why-us", description: "Unstoppable sales processing, online or offline.", icon: ShoppingCart },
            { title: "Multi-Location Inventory", href: "#features", description: "Manage stock, composites, and transfers at scale.", icon: Box },
            { title: "Cloud Accounting", href: "#features", description: "Full double-entry bookkeeping and financial intelligence.", icon: ReceiptText },
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
        { icon: ShoppingCart, title: "Unified Commerce (POS)", description: "An intuitive, offline-first POS for retail & hospitality. Process sales, manage returns, track shifts, and connect hardware seamlessly." },
        { icon: Box, title: "Enterprise Inventory", description: "Control stock with variants, composite recipes, purchase orders, stock adjustments, and multi-location transfers." },
        { icon: ReceiptText, title: "Automated Cloud Accounting", description: "Full double-entry bookkeeping with live sheets for team collaboration, real-time financial reports, expense tracking, and automated VAT for URA compliance." },
        { icon: Landmark, title: "SACCO & Lending Suite", description: "A complete toolkit for member accounts, share capital, savings products, loan applications, and group collections." },
        { icon: Home, title: "Property & Rentals", description: "Oversee properties and units, manage lease agreements, and automate the generation and tracking of rental invoices." },
        { icon: Truck, title: "Distribution & Logistics", description: "Define sales routes, manage vehicle loading, and automate route settlements for your entire distribution fleet." },
        { icon: ShieldCheck, title: "Security & Audit", description: "Maintain a complete audit log and control workflows with granular permissions for every employee, ensuring data integrity across your entire business." },
        { icon: KeyRound, title: "API & Integrations", description: "Build custom workflows and connect to third-party systems with a robust, secure API, ready for enterprise integration." },
    ],
    industrySolutions: [
        { icon: Signal, name: "Telecom & Distribution", description: "Manage airtime distribution, agent networks, and commissions for major carriers like MTN and Airtel with full, real-time transparency." },
        { icon: Store, name: "Retail & E-commerce", description: "Barcode scanning, multi-location stock, and robust sales reporting." },
        { icon: Utensils, name: "Restaurant & Hospitality", description: "Kitchen Display System (KDS) integration, service booking, and ingredient tracking." },
        { icon: Landmark, name: "SACCOs & Microfinance", description: "Streamline member management, loan processing, and regulatory reporting at scale." },
        { icon: Home, name: "Real Estate & Rentals", description: "Automate invoicing, track lease agreements, and manage large property portfolios." },
        { icon: Handshake, name: "Professional Services", description: "Manage appointments, client data, and create professional service invoices." },
    ],
    testimonials: [
       { name: 'Sarah Namubiru', company: 'CEO, Sarah\'s Boutique Chain', quote: '"The AI Copilot is a game-changer. It identified a hidden profitable customer segment, allowing us to pivot our marketing and boost sales by 30%. This is true data-driven strategy."', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286de2?auto=format&fit=crop&w=200&h=200&q=80' },
       { name: 'David Kaggwa', company: 'Director, Boda Boda SACCO Ltd.', quote: '"Managing thousands of members was a manual nightmare. BBU1 automated everything from contributions to loan processing. Our reporting is now instant and accurate. It is our most essential enterprise tool."', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80' },
       { name: 'Aisha Mutesi', company: 'Property Manager, K Estates', quote: '"We manage over 150 rental units. Tracking payments was chaotic. With BBU1, invoicing is automated and I have a real-time view of arrears. It has saved us countless hours and improved cash flow."', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80' }
    ],
    faqItems: [
       { q: 'How does the AI Copilot deliver enterprise-level insights?', a: 'The AI Copilot securely analyzes your company-wide transactional data to identify complex patterns. It presents findings as simple, actionable insights like "Consider bundling Product A and B for enterprise clients" or "Cash flow projected to be low in 3 weeks based on recurring expense trends."' },
       { q: 'Is this a multi-tenant system? How is our enterprise data secured?', a: 'Yes. BBU1 is a fully multi-tenant platform built on a secure, scalable architecture. Your business data is completely isolated using PostgreSQL\'s Row-Level Security and is inaccessible to any other tenant. We use bank-level, end-to-end encryption to protect your information.' },
       { q: 'Can the system be customized for our specific industry needs?', a: 'Absolutely. While our industry modules are powerful out-of-the-box, our platform is built for flexibility. For enterprise clients, we offer customization services and API access to tailor the system to your unique operational workflows.' },
       { q: 'What kind of support and SLA do you offer for enterprise clients?', a: 'We provide dedicated onboarding and training for all new clients. Enterprise plans include a dedicated account manager, priority support via WhatsApp or phone, and a Service Level Agreement (SLA) guaranteeing uptime and response times to ensure business continuity.' },
    ],
    termsOfService: ( <div className="space-y-4 text-sm"><p>Welcome to BBU1. These Terms govern your use of our Service. By using our Service, you agree to these terms...</p>{/* (Your full legal text) */}</div> ),
    privacyPolicy: ( <div className="space-y-4 text-sm"><p>We collect Personal, Transactional, and Usage Data to provide and improve our Service. Your data is secured with bank-level encryption and is never sold...</p>{/* (Your full legal text) */}</div> ),
};
// -- Note: Unsplash images are royalty-free. In a production app, use your own licensed or branded images.
const aiSlideshowImages = [
    { src: "https://images.unsplash.com/photo-1620712943543-2703222e3ae7?auto=format&fit=crop&w=1740&q=80", alt: "Abstract visualization of AI neural networks" },
    { src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1740&q=80", alt: "Analyst reviewing complex data charts on a screen" },
    { src: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1674&q=80", alt: "Futuristic dashboard with predictive analytics" },
];

// --- ANIMATION & UTILITY COMPONENTS ---
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", when: "beforeChildren" } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const textVariants: Variants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const heroStagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } };
const featureCardVariants: Variants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } } };

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

const SectionWaveDivider = ({ position = 'bottom' }: { position?: 'top' | 'bottom' }) => (
    <div className={cn("absolute left-0 w-full overflow-hidden leading-none z-10", position === 'top' ? '-top-px rotate-180' : '-bottom-px')}><svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" className="relative block w-full h-[80px] sm:h-[120px] fill-background/80" preserveAspectRatio="none"><path d="M0,64L48,64C96,64,192,64,288,69.3C384,75,480,85,576,80C672,75,768,59,864,58.7C960,59,1056,75,1152,74.7C1248,75,1344,59,1392,50.7L1440,42.7L1440,101L1392,101C1344,101,1248,101,1152,101C1056,101,960,101,864,101C768,101,672,101,576,101C480,101,384,101,288,101C192,101,96,101,48,101L0,101Z"></path></svg></div>
);

const CountdownTimer = () => {
    const getEndDate = () => { const endDate = new Date(); endDate.setDate(endDate.getDate() + 15); return endDate; };
    const [endDate] = useState(getEndDate());
    const calculateTimeLeft = () => { const d = +endDate - +new Date(); let tl: { [k: string]: number } = {}; if (d > 0) { tl = { days: Math.floor(d / 864e5), hours: Math.floor(d / 36e5) % 24, minutes: Math.floor(d / 6e4) % 60, seconds: Math.floor(d / 1e3) % 60 }; } return tl; };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    useEffect(() => { const t = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000); return () => clearInterval(t); }, [endDate]);
    const timerComponents = Object.keys(timeLeft).map(i => <div key={i} className="text-center"><div className="text-2xl sm:text-4xl font-bold">{String(timeLeft[i] || 0).padStart(2, '0')}</div><div className="text-xs uppercase">{i}</div></div>);
    return <div className="flex items-center justify-center gap-4 sm:gap-8">{timerComponents.length ? timerComponents : <span>Offer Expired!</span>}</div>;
};

const ListItem = forwardRef<ElementRef<"a">, ComponentPropsWithoutRef<"a"> & { icon?: LucideIcon }>(({ className, title, children, icon: Icon, ...props }, ref) => (<li><NavigationMenuLink asChild><a ref={ref} className={cn("block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground", className)} {...props}><div className="text-sm font-medium leading-none flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-primary" />} {title}</div><p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p></a></NavigationMenuLink></li>));
ListItem.displayName = "ListItem";

const LegalModal = ({ title, content, trigger }: { title: string; content: ReactNode; trigger: ReactNode }) => (<Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="prose dark:prose-invert max-w-none prose-h2:text-lg prose-h2:font-semibold prose-p:text-sm prose-ul:text-sm">{content}</div></DialogContent></Dialog>);

const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { mainFeatures, resources } = siteConfig.navigation;
    return (<header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm"><div className="container mx-auto h-20 flex items-center justify-between"><Link href="/" className="text-2xl font-bold text-primary flex items-center gap-2" aria-label={`${siteConfig.name} Home`}><Rocket className="h-7 w-7" /> {siteConfig.name}</Link><NavigationMenu className="hidden lg:flex"><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Features</NavigationMenuTrigger><NavigationMenuContent><ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">{mainFeatures.map((c) => (<ListItem key={c.title} title={c.title} href={c.href} icon={c.icon}>{c.description}</ListItem>))}</ul></NavigationMenuContent></NavigationMenuItem><NavigationMenuItem><Link href="#solutions" legacyBehavior passHref><NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium">Solutions</NavigationMenuLink></Link></NavigationMenuItem><NavigationMenuItem><NavigationMenuTrigger>Resources</NavigationMenuTrigger><NavigationMenuContent><ul className="grid w-[400px] gap-3 p-4 md:w-[400px]">{resources.map((c) => (<ListItem key={c.title} title={c.title} href={c.href} icon={c.icon}>{c.description}</ListItem>))}</ul></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu><div className="hidden lg:flex items-center gap-2"><Button variant="ghost" asChild><Link href="/login">Log In</Link></Button><Button asChild><Link href="/signup">Get Started Free</Link></Button><ModeToggle /></div><div className="lg:hidden flex items-center gap-2"><ModeToggle /><Button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} variant="ghost" size="icon" aria-label="Toggle mobile menu">{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</Button></div></div><AnimatePresence>{isMobileMenuOpen && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden p-4 border-t bg-background overflow-hidden"><nav className="flex flex-col gap-4"><h3 className="font-bold text-primary">Features</h3>{mainFeatures.map(f => (<Link key={f.title} href={f.href} onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary flex items-center gap-2">{f.icon && <f.icon className="h-5 w-5" />} {f.title}</Link>))} <div className="border-t my-2"></div><h3 className="font-bold text-primary">Resources</h3>{resources.map(f => (<Link key={f.title} href={f.href} onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary flex items-center gap-2">{f.icon && <f.icon className="h-5 w-5" />} {f.title}</Link>))} <div className="border-t my-4"></div><Button variant="ghost" asChild className="w-full"><Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link></Button><Button asChild className="w-full"><Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Get Started Free</Link></Button></nav></motion.div>)}</AnimatePresence></header>);
};

const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (<><AnimatePresence>{isOpen && (<motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="fixed bottom-24 right-6 w-80 bg-background rounded-xl shadow-2xl border z-50 p-6 flex flex-col gap-4"><div className="flex justify-between items-center"><h3 className="font-bold text-lg">Speak with an expert</h3><Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close chat"><X className="h-5 w-5" /></Button></div><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full"><Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-white"><MessageSquare className="mr-2 h-5 w-5" /> Start a live chat</Button></a><p className="text-center text-xs text-muted-foreground">Via WhatsApp, 9AM - 5PM EAT</p><div className="border-t my-2"></div><p className="font-semibold text-center text-sm">Need product support?</p><Link href="#faq" passHref><Button variant="outline" className="w-full h-12" onClick={() => setIsOpen(false)}><LifeBuoy className="mr-2 h-5 w-5" /> Visit our FAQ</Button></Link></motion.div>)}</AnimatePresence><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 bg-primary text-primary-foreground p-4 rounded-full shadow-lg z-50" aria-label={isOpen ? "Close chat" : "Open chat"}>{isOpen ? <X className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}</motion.button></>);
};

const LandingFooter = () => (
    <footer className="relative border-t bg-background/80 backdrop-blur-sm z-10"><div className="container mx-auto px-4 pt-16 pb-8"><div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12"><div className="col-span-2"><h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-7 w-7" /> {siteConfig.name}</h3><p className="text-sm text-muted-foreground mt-4 max-w-xs">{siteConfig.description}</p><p className="text-xs text-muted-foreground mt-4">{siteConfig.inventorCredit}</p><div className="flex items-center gap-5 mt-8"><a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary"><Linkedin size={22} /></a><a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary"><Twitter size={22} /></a><a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook size={22} /></a></div></div><div><h4 className="font-semibold text-lg mb-4">Product</h4><ul className="space-y-3 text-sm"><li><Link href="#features" className="text-muted-foreground hover:text-primary">Features</Link></li><li><Link href="#ai-copilot" className="text-muted-foreground hover:text-primary">AI Copilot</Link></li><li><Link href="#solutions" className="text-muted-foreground hover:text-primary">Industries</Link></li></ul></div><div><h4 className="font-semibold text-lg mb-4">Company</h4><ul className="space-y-3 text-sm"><li><Link href="#testimonials" className="text-muted-foreground hover:text-primary">Testimonials</Link></li><li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Contact Sales</a></li><li><Link href="#faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li></ul></div><div><h4 className="font-semibold text-lg mb-4">Legal</h4><ul className="space-y-3 text-sm"><li><LegalModal title="Terms of Service" content={siteConfig.termsOfService} trigger={<button className="text-muted-foreground hover:text-primary text-left">Terms of Service</button>} /></li><li><LegalModal title="Privacy Policy" content={siteConfig.privacyPolicy} trigger={<button className="text-muted-foreground hover:text-primary text-left">Privacy Policy</button>} /></li></ul></div></div><div className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground"><p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p><p className="mt-4 sm:mt-0">Made with <Leaf className="inline h-4 w-4 text-green-500" /> in Kampala, Uganda.</p></div></div></footer>
);

// --- REVOLUTIONARY UPGRADE 1: GLOBE BACKGROUND ---
const GlobeBackground = () => (
    <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        <motion.div 
            initial={{ backgroundPosition: "0% 50%" }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute w-[200%] h-[200%] sm:w-[150%] sm:h-[150%] lg:w-full lg:h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundImage: 'url(/globe-texture.png)', backgroundSize: 'cover', opacity: 0.5 }}
        />
    </div>
);

// --- REVOLUTIONARY UPGRADE 2: ANIMATED DASHBOARD MOCKUP ---
const DashboardMockup = () => (
    <motion.div 
        variants={itemVariants}
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, delay: 0.5, ease: 'easeOut' } }}
        className="relative mt-16 max-w-5xl mx-auto"
    >
        <div className="relative w-full aspect-[16/10] rounded-xl bg-background/50 backdrop-blur-sm border shadow-2xl shadow-primary/10 p-2">
            <div className="w-full h-full rounded-md bg-muted/50 p-2 flex gap-2">
                <div className="w-1/4 h-full bg-background rounded-sm p-2 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded"></div>
                    <div className="h-4 w-1/2 bg-muted rounded"></div>
                    <div className="h-4 w-2/3 bg-muted rounded mt-4"></div>
                    <div className="h-4 w-full bg-primary/20 rounded"></div>
                    <div className="h-4 w-full bg-muted rounded"></div>
                </div>
                <div className="flex-1 h-full bg-background rounded-sm p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-20 bg-muted rounded"></div>
                        <div className="h-20 bg-muted rounded"></div>
                        <div className="h-20 bg-muted rounded"></div>
                    </div>
                    <div className="h-40 w-full bg-primary/20 rounded"></div>
                </div>
            </div>
        </div>
    </motion.div>
);


// --- THE FINAL, REVOLUTIONARY HOMEPAGE COMPONENT ---
const HomePage = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    useEffect(() => { const i = setInterval(() => setCurrentSlide(p => (p === aiSlideshowImages.length - 1 ? 0 : p + 1)), 5000); return () => clearInterval(i); }, []);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Head>
                <title>{`${siteConfig.name} - The Global Operating System for Ambitious Enterprise`}</title>
                <meta name="description" content={siteConfig.description} />
                <meta property="og:title" content={siteConfig.name} />
                <meta property="og:description" content={siteConfig.description} />
                <meta property="og:image" content={siteConfig.ogImage} />
                <meta property="og:url" content={siteConfig.url} />
                <meta name="twitter:card" content="summary_large_image" />
            </Head>

            <MegaMenuHeader />

            <main className="flex-grow z-10">

                {/* ==================================================================== */}
                {/* ============               FIRST PAGE CONTENT               ============ */}
                {/* ==================================================================== */}

                <section id="hero" className="relative pt-24 pb-32 overflow-hidden">
                    <GlobeBackground />
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={heroStagger} initial="hidden" animate="visible">
                            <motion.div variants={textVariants}>
                                <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary border">
                                    <BrainCircuit className="mr-2 h-4 w-4" /> Your Business, Supercharged by AI
                                </span>
                            </motion.div>
                            <motion.h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mt-6" variants={textVariants}>
                                The Global OS for Ambitious<br /> Enterprise, Forged in Africa
                            </motion.h1>
                            <motion.p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto" variants={textVariants}>
                                {siteConfig.description}
                            </motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-6" variants={itemVariants}>
                                <Button asChild size="lg" className="animate-breathing"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book an Enterprise Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                            <DashboardMockup />
                        </motion.div>
                    </div>
                </section>
                
                <AnimatedSection id="global-reach" className="bg-background/80 backdrop-blur-sm">
                    <SectionWaveDivider position="top" />
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">A Global Standard in Enterprise Management</h2>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">BBU1 is the proven, scalable platform for businesses with local roots and global aspirations.</p>
                        <motion.div variants={staggerContainer} className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <motion.div variants={itemVariants}><h3 className="text-4xl font-bold text-primary"><StatCounter end={50000} suffix="+" /></h3><p className="text-muted-foreground mt-2">Active Users Worldwide</p></motion.div>
                            <motion.div variants={itemVariants}><h3 className="text-4xl font-bold text-primary"><StatCounter end={25} prefix="UGX " suffix="B+" /></h3><p className="text-muted-foreground mt-2">Transactions Processed Securely</p></motion.div>
                            <motion.div variants={itemVariants}><h3 className="text-4xl font-bold text-primary"><StatCounter end={99.9} suffix="%"/></h3><p className="text-muted-foreground mt-2">Guaranteed Uptime SLA</p></motion.div>
                        </motion.div>
                    </div>
                    <SectionWaveDivider position="bottom" />
                </AnimatedSection>


                {/* ==================================================================== */}
                {/* ============              SECOND PAGE (SCROLL)              ============ */}
                {/* ==================================================================== */}

                <AnimatedSection id="why-us">
                    <div className="px-4">
                        <div className="text-center mb-16 max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold tracking-tight">Built for Dynamic Markets, Anywhere</h2>
                            <p className="text-muted-foreground mt-2">We understand the unique challenges of demanding markets. Our features give you a decisive competitive edge.</p>
                        </div>
                        <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <motion.div variants={itemVariants}><Card className="text-center h-full p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/50 backdrop-blur-md"><WifiOff className="h-12 w-12 text-primary mx-auto mb-4" /><h3 className="text-xl font-bold">Flawless Offline Mode</h3><p className="text-muted-foreground mt-2">Power outage? No problem. Our POS operates at full speed and syncs automatically the moment you're back online. Never lose a sale.</p></Card></motion.div>
                            <motion.div variants={itemVariants}><Card className="text-center h-full p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/50 backdrop-blur-md"><Phone className="h-12 w-12 text-primary mx-auto mb-4" /><h3 className="text-xl font-bold">Deep Mobile Money Integration</h3><p className="text-muted-foreground mt-2">Accept payments seamlessly from MTN and Airtel. We simplify reconciliation, reduce errors, and accelerate cash flow for you and your customers.</p></Card></motion.div>
                            <motion.div variants={itemVariants}><Card className="text-center h-full p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 bg-background/50 backdrop-blur-md"><TrendingDown className="h-12 w-12 text-primary mx-auto mb-4" /><h3 className="text-xl font-bold">Affordable, Localized Pricing</h3><p className="text-muted-foreground mt-2">No dollar-based pricing that fluctuates with exchange rates. Our simple, shilling-based plans have no hidden fees, designed for the Ugandan economy.</p></Card></motion.div>
                        </motion.div>
                    </div>
                </AnimatedSection>
                
                <AnimatedSection id="features" className="bg-background/80 backdrop-blur-sm">
                    <SectionWaveDivider position="top" />
                    <div className="text-center">
                         <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">One Platform to Run Your Entire Enterprise</h2>
                         <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">Every module is purpose-built and deeply integrated to provide a seamless, enterprise-grade experience that eliminates data silos.</p>
                    </div>
                    <motion.div className="mt-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6" variants={staggerContainer}>
                        {siteConfig.featureItems.map((feature) => (
                            <motion.div key={feature.title} className="col-span-1 md:col-span-1" variants={featureCardVariants}>
                                <Card className="h-full text-left hover:shadow-lg hover:-translate-y-1 transition-all">
                                    <CardHeader>
                                        <div className="bg-primary/10 p-3 rounded-md w-fit mb-4"><feature.icon className="h-6 w-6 text-primary" /></div>
                                        <CardTitle className="text-base">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent><p className="text-muted-foreground text-sm">{feature.description}</p></CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                    <SectionWaveDivider position="bottom" />
                </AnimatedSection>

                <AnimatedSection id="ai-copilot"><div className="grid lg:grid-cols-2 gap-12 items-center"><motion.div variants={itemVariants}><span className="text-primary font-semibold">BBU1 COPILOT</span><h2 className="text-3xl font-bold tracking-tight sm:text-5xl mt-2">From Data to Decisions, Instantly.</h2><p className="mt-6 text-lg leading-8 text-muted-foreground">Our revolutionary AI Copilot is your built-in business analyst. It silently processes enterprise-wide data to deliver actionable intelligence that drives strategy.</p><ul className="mt-8 space-y-4"><li className="flex items-start gap-3"><Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" /><div><strong className="font-semibold">Identify Growth Opportunities:</strong> Discover your most profitable product lines, top-performing staff, and hidden upselling chances.</div></li><li className="flex items-start gap-3"><Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" /><div><strong className="font-semibold">Predictive Forecasting:</strong> Get AI-powered sales and cash flow forecasts to make smarter inventory and budget decisions.</div></li><li className="flex items-start gap-3"><Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" /><div><strong className="font-semibold">Risk & Compliance Alerts:</strong> The AI flags unusual transactions and potential compliance issues, helping you stay secure and audit-ready.</div></li></ul></motion.div><motion.div variants={itemVariants} className="mt-10 lg:mt-0"><div className="relative w-full aspect-video rounded-lg shadow-2xl overflow-hidden"><AnimatePresence><motion.div key={currentSlide} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.8, ease: "easeInOut" }} className="absolute inset-0"><Image src={aiSlideshowImages[currentSlide].src} alt={aiSlideshowImages[currentSlide].alt} layout="fill" objectFit="cover" className="rounded-lg"/></motion.div></AnimatePresence></div></motion.div></div></AnimatedSection>
                
                <AnimatedSection id="solutions" className="bg-background/80 backdrop-blur-sm"><SectionWaveDivider position="top" /><div className="text-center"><h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Tailored for Your Industry's Demands</h2><p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">{siteConfig.name} is engineered for flexibility, providing specialized, enterprise-ready toolkits for your unique business.</p><motion.div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={staggerContainer}>{siteConfig.industrySolutions.map(s => (<motion.div key={s.name} variants={itemVariants}><Card className="h-full text-center hover:bg-muted/50 transition-colors hover:shadow-xl hover:-translate-y-1.5"><CardHeader className="items-center"><div className="bg-primary/10 p-4 rounded-full mb-4"><s.icon className="h-8 w-8 text-primary" /></div><CardTitle>{s.name}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{s.description}</p></CardContent></Card></motion.div>))}</motion.div></div><SectionWaveDivider position="bottom" /></AnimatedSection>
                
                <AnimatedSection id="get-started"><div className="text-center"><h2 className="text-3xl font-bold tracking-tight sm:text-5xl">A Solution That Scales With You</h2><p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">From startup to enterprise, we provide a tailored solution that matches your exact needs, ensuring you have the right tools to grow without paying for features you don't use.</p><motion.div variants={itemVariants} className="max-w-3xl mx-auto bg-background/80 backdrop-blur-sm border-2 border-primary/20 rounded-xl p-6 text-center my-12"><div className="flex items-center justify-center gap-2 text-primary font-bold"><Clock className="h-5 w-5" /><span>Limited Time Launch Offer</span></div><p className="mt-2 text-lg">Sign up now and get <span className="font-bold">20% OFF</span> your first 3 months on any custom plan!</p><div className="mt-4"><CountdownTimer /></div></motion.div><motion.div variants={itemVariants} className="mt-10"><Button asChild size="lg" className="scale-110"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Get a Free Enterprise Quote<ArrowRight className="ml-2 h-5 w-5" /></a></Button><p className="text-muted-foreground text-sm mt-4">Speak with our experts to build your perfect plan.</p></motion.div></div></AnimatedSection>
                
                <AnimatedSection id="testimonials" className="bg-background/80 backdrop-blur-sm"><SectionWaveDivider position="top" /><div className="px-4"><div className="text-center mb-16"><h2 className="text-3xl font-bold tracking-tight">The Engine Behind Leading Businesses Worldwide</h2><p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Real stories from enterprises thriving with {siteConfig.name}.</p></div><motion.div variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-3 gap-8">{siteConfig.testimonials.map((t) => (<motion.div key={t.name} variants={itemVariants}><Card className="h-full flex flex-col p-6"><CardHeader className="p-0 flex-row items-center gap-4"><Image src={t.avatar} alt={`Avatar of ${t.name}`} width={56} height={56} className="h-14 w-14 rounded-full object-cover" /><div className="flex-1"><CardTitle className="text-base">{t.name}</CardTitle><CardDescription>{t.company}</CardDescription></div></CardHeader><CardContent className="p-0 flex-grow pt-4"><div className="flex items-center gap-0.5 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}</div><Quote className="h-8 w-8 text-primary/30 mb-4" /><p className="text-muted-foreground italic">"{t.quote}"</p></CardContent></Card></motion.div>))}</motion.div></div><SectionWaveDivider position="bottom" /></AnimatedSection>
                
                <AnimatedSection id="faq"><div className="max-w-4xl mx-auto"><h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-center">Your Questions, Answered</h2><Accordion type="single" collapsible className="w-full mt-12">{siteConfig.faqItems.map(i => (<AccordionItem key={i.q} value={i.q}><AccordionTrigger className="text-lg text-left hover:no-underline">{i.q}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground pb-4">{i.a}</AccordionContent></AccordionItem>))}</Accordion></div></AnimatedSection>

                <AnimatedSection className="text-center container mx-auto px-4"><div className="relative py-20 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden"><div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.1] -z-1"></div><h2 className="text-3xl font-bold tracking-tight">Ready to Revolutionize Your Enterprise?</h2><p className="mt-4 max-w-xl mx-auto text-lg text-primary-foreground/80">Join the leaders who trust {siteConfig.name} to drive growth, streamline operations, and unlock their true potential.</p><div className="mt-8"><Button asChild size="lg" variant="secondary" className="text-primary hover:bg-white/90 scale-110 transition-transform hover:scale-115"><Link href="/signup">Start Your Free Trial Today <ArrowRight className="ml-2 h-5 w-5" /></Link></Button></div></div></AnimatedSection>
            </main>
            
            <AdvancedChatWidget />
            <LandingFooter />
        </div>
    );
};

export default HomePage;