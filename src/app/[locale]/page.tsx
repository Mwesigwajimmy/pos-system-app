'use client';

import React, { useState, useRef, type ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import MegaMenuHeader from '@/components/MegaMenuHeader'; // Using the new header
import {
    BrainCircuit, Facebook, Leaf, Linkedin, LucideIcon,
    Rocket, Twitter, ArrowRight,
    TrendingUp, LayoutGrid, WifiOff, Zap, ShieldHalf, Bot, Send, Users, X
} from 'lucide-react';

// Centralized Site Configuration for Landing Page Content
const siteConfig = {
    name: "BBU1",
    contactInfo: {
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo.")}`,
        socials: { linkedin: '#', twitter: '#', facebook: '#' }
    },
    standoutItems: [
        { icon: TrendingUp, title: "Built to Scale With You", description: "BBU1 is architected for growth. Whether you're a solo entrepreneur or a global enterprise, our platform scales seamlessly to meet your demands." },
        { icon: LayoutGrid, title: "A Single Source of Truth", description: "Eliminate data silos forever. By unifying every department, you get a real-time, 360-degree view of your entire operation." },
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Internet down? No problem. BBU1's core functions work perfectly offline, ensuring business continuity. Everything syncs the moment you're back online." },
        { icon: Zap, title: "End Subscription Chaos", description: "Replace 5+ expensive, disconnected apps with one intelligent, cost-effective platform. Simplify your workflow and reduce costs." },
        { icon: BrainCircuit, title: "True AI Partnership", description: "Our integrated AI analyzes your data to find growth opportunities, predict cash flow, and identify risks before they become problems." },
        { icon: ShieldHalf, title: "Bank-Level Security", description: "We protect your data with a multi-tenant architecture and end-to-end encryption, ensuring your information is completely isolated and secure." }
    ],
    faqItems: [
       { q: 'How does the AI Copilot deliver insights?', a: 'The AI Copilot securely analyzes your company-wide data to find patterns. It provides simple, actionable insights like "Consider bundling Product A and B" or "Cash flow projected to be low in 3 weeks."' },
       { q: 'Is my enterprise data secure?', a: 'Yes. BBU1 uses a multi-tenant architecture with PostgreSQL\'s Row-Level Security. Your data is completely isolated and protected by bank-level encryption.' },
       { q: 'Can the system be customized?', a: 'Absolutely. We offer customization services and API access for enterprise clients to tailor the system to your unique workflows.' },
    ],
    termsOfService: ( <div className="space-y-4 text-sm"><p>Welcome to BBU1...</p></div> ),
    privacyPolicy: ( <div className="space-y-4 text-sm"><p>We collect data to provide our Service...</p></div> ),
};

// Animation Variants
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const textVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } }
};
const slideTextVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.5, ease: "easeIn" } }
};
const backgroundVariants: Variants = {
    animate: (index: number) => ({
        scale: [1, 1.05, 1],
        x: [`${index % 2 * -2}%`, '0%', `${index % 3 * 2}%`],
        y: [`${index % 2 * 2}%`, '0%', `${index % 3 * -2}%`],
        transition: { duration: 25, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
    })
};

// Reusable Components
const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-16 sm:py-20 overflow-hidden", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <div className="container mx-auto px-4 relative z-10">{children}</div>
    </motion.section>
);

const LandingFooter = () => (
    <footer className="relative border-t bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 pt-12 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2"><h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-6 w-6" /> {siteConfig.name}</h3></div>
                <div><h4 className="font-semibold mb-3">Product</h4><ul className="space-y-2 text-sm"><li><a href="#standout" className="text-muted-foreground hover:text-primary">Features</a></li></ul></div>
                <div><h4 className="font-semibold mb-3">Company</h4><ul className="space-y-2 text-sm"><li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">Contact Sales</a></li><li><Link href="#faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li></ul></div>
                <div><h4 className="font-semibold mb-3">Legal</h4><ul className="space-y-2 text-sm"><li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary">Terms of Service</button></DialogTrigger><DialogContent>{siteConfig.termsOfService}</DialogContent></Dialog></li><li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary">Privacy Policy</button></DialogTrigger><DialogContent>{siteConfig.privacyPolicy}</DialogContent></Dialog></li></ul></div>
            </div>
            <div className="border-t mt-6 pt-4 flex justify-between items-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
                <p>Made with <Leaf className="inline h-3 w-3 text-green-500" /> in Kampala, Uganda.</p>
            </div>
        </div>
    </footer>
);

export default function HomePage() {
    const rotatingTexts = ["From startup to enterprise.", "For every ambition.", "Your complete business OS."];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const slideshowContent = [
        { src: "/images/showcase/telecom-agent.jpg", title: "Telecom & Mobile Money", description: "Empower agents with a fast, secure system for handling transactions, from airtime distribution to commission tracking.", alt: "A mobile money agent serving customers." },
        { src: "/images/showcase/retail-store.jpg", title: "Retail & Commerce", description: "From city shops to local stores, BBU1 provides a powerful POS and inventory system to manage sales and stock effortlessly.", alt: "A local shop owner managing his store." },
        { src: "/images/showcase/modern-office.jpg", title: "Corporate Intelligence", description: "Unify your entire operation. Empower teams with real-time analytics to monitor growth, identify trends, and make data-backed decisions.", alt: "A team collaborating in a modern office." },
    ];
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    useEffect(() => {
        const textInterval = setInterval(() => setCurrentTextIndex(prev => (prev + 1) % rotatingTexts.length), 3000);
        const imageInterval = setInterval(() => setCurrentSlideIndex(prev => (prev + 1) % slideshowContent.length), 10000);
        return () => { clearInterval(textInterval); clearInterval(imageInterval); };
    }, [rotatingTexts.length, slideshowContent.length]);

    return (
        <>
            <MegaMenuHeader />
            <main className="flex-grow z-10">
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden text-white">
                    <div className="absolute inset-0 z-0">
                        <Image src="/images/showcase/modern-office-analytics.jpg" alt="Modern office team analyzing data" fill style={{ objectFit: 'cover' }} className="opacity-80" priority />
                        <div className="absolute inset-0 bg-black/70"></div>
                    </div>
                    <div className="container mx-auto text-center relative z-10">
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                            <motion.h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl mt-6" variants={itemVariants}>
                                The One Platform <br />
                                <div className="inline-block h-[1.2em] overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.span key={currentTextIndex} variants={textVariants} initial="hidden" animate="visible" exit="exit" className="block text-blue-300">
                                            {rotatingTexts[currentTextIndex]}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </motion.h1>
                            <motion.p className="mt-6 text-lg text-gray-200 max-w-2xl mx-auto" variants={itemVariants}>
                                Stop juggling apps. BBU1 is the single OS for your entire business—from accounting and inventory to team and project management.
                            </motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}>
                                <Button asChild size="lg"><Link href="/signup">Start Free Trial</Link></Button>
                                <Button asChild size="lg" variant="outline" className="text-white"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Book a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                <AnimatedSection id="in-action" className="pt-0 -mt-16 pb-16">
                    <div className="relative bg-secondary/20 rounded-lg shadow-2xl border border-primary/10 overflow-hidden p-8 md:p-12">
                        <motion.div className="absolute inset-0 z-0" variants={backgroundVariants} custom={currentSlideIndex} animate="animate">
                            <Image src="/images/showcase/global-network.jpg" alt="Abstract global network" fill style={{ objectFit: 'cover' }} className="opacity-50" />
                        </motion.div>
                        <div className="absolute inset-0 z-10 bg-background/80 dark:bg-background/90"></div>
                        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            <div className="text-center lg:text-left">
                                <h2 className="text-3xl font-bold mb-4">BBU1 in Action: Powering Industries</h2>
                                <div className="relative h-24 sm:h-20">
                                    <AnimatePresence mode="wait">
                                        <motion.div key={currentSlideIndex} variants={slideTextVariants} initial="hidden" animate="visible" exit="exit" className="absolute w-full">
                                            <h3 className="text-lg font-semibold text-primary">{slideshowContent[currentSlideIndex].title}</h3>
                                            <p className="text-muted-foreground mt-2 text-sm">{slideshowContent[currentSlideIndex].description}</p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="relative aspect-video rounded-lg overflow-hidden">
                                <AnimatePresence>
                                    <motion.div key={currentSlideIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0">
                                        <Image src={slideshowContent[currentSlideIndex].src} alt={slideshowContent[currentSlideIndex].alt} fill style={{ objectFit: 'cover' }} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                <AnimatedSection id="standout">
                     <div className="absolute inset-0 z-0 opacity-50">
                        <Image src="/images/showcase/ai-warehouse-logistics.jpg" alt="AI in logistics" fill style={{ objectFit: 'cover' }} />
                        <div className="absolute inset-0 bg-background/50"></div>
                    </div>
                    <div className="px-4 relative z-10">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold">What Makes BBU1 Stand Out</h2>
                            <p className="text-muted-foreground mt-2">BBU1 is engineered to accelerate your growth and simplify complexity.</p>
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {siteConfig.standoutItems.map(item => (
                                <motion.div key={item.title} variants={itemVariants}>
                                    <Card className="text-left h-full bg-background/80 backdrop-blur-sm border-primary/10">
                                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
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

                <AnimatedSection id="faq" className="bg-secondary/20">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-8">Your Questions, Answered</h2>
                        <Accordion type="single" collapsible className="w-full mt-8 rounded-lg border bg-background/80 backdrop-blur-sm shadow-lg">
                            {siteConfig.faqItems.map(i => (
                                <AccordionItem key={i.q} value={i.q} className="px-6">
                                    <AccordionTrigger className="text-base text-left font-semibold">{i.q}</AccordionTrigger>
                                    <AccordionContent className="text-sm text-muted-foreground">{i.a}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </AnimatedSection>
            </main>
            <LandingFooter />
        </>
    );
}