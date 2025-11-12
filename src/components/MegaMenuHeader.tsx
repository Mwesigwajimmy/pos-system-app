'use client';

import React, { useState, type ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import {
    Banknote, BrainCircuit, Facebook, Handshake,
    Landmark, Linkedin, LucideIcon, Menu,
    Rocket, Signal, Store, Twitter,
    Utensils, X, Wallet, Package, ClipboardList,
    UserCog, Files, Lightbulb, Download
} from 'lucide-react';

// NOTE: All site configuration is moved directly inside this component
// to make it self-contained for you.

const siteConfig = {
    name: "BBU1",
    featureItems: [
        { icon: Wallet, title: "Autonomous Bookkeeping", description: "A complete, GAAP-compliant, double-entry accounting system that runs itself." },
        { icon: Package, title: "Unified POS & Inventory", description: "An unstoppable, offline-first POS integrated with multi-location inventory." },
        { icon: ClipboardList, title: "CRM & Project Hub", description: "Go from lead to paid project without leaving the platform." },
        { icon: UserCog, title: "HCM & Payroll", description: "Hire, manage, and pay your team from a single system." },
        { icon: Files, title: "Secure Document Fortress", description: "A revolutionary, multi-tenant file explorer for your most sensitive data." },
        { icon: Lightbulb, title: "AI Business Copilot", description: "Get proactive, data-driven insights on cash flow, client trends, and fraud detection."}
    ],
    industrySolutions: [
        {
            category: "Common",
            items: [
                { name: "Retail / Wholesale", icon: Store, description: "Full-scale inventory management and robust sales reporting." },
                { name: "Restaurant / Cafe", icon: Utensils, description: "Complete restaurant management with KDS integration." },
                { name: "Trades & Services", icon: Handshake, description: "Manage appointments, dispatch jobs, and create service invoices." }
            ]
        },
        {
            category: "Specialized Industries",
            items: [
                { name: "Professional Services", icon: Landmark, description: "Time tracking, case management, and secure document handling." },
                { name: "Lending / Microfinance", icon: Banknote, description: "Streamline member management and automate loan processing." },
                { name: "Telecom Services", icon: Signal, description: "Tools for airtime distribution and agent management." }
            ]
        }
    ]
};

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

export default function MegaMenuHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                 setShowInstallButton(true);
            }
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowInstallButton(false);
            }
            setDeferredPrompt(null);
        }
    };

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
                                            title={feature.title} icon={feature.icon} description={feature.description}
                                            trigger={
                                                <li className="cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 focus:bg-accent/10 group">
                                                    <div className="text-sm font-medium leading-none flex items-center gap-2">
                                                        <feature.icon className="h-4 w-4 text-primary" /> {feature.title}
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
                                                        title={solution.name} icon={solution.icon} description={solution.description}
                                                        trigger={
                                                            <li className="cursor-pointer block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 focus:bg-accent/10 group">
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
                    {showInstallButton && (
                        <Button variant="outline" className="flex items-center gap-2" onClick={handleInstallClick}>
                            <Download className="h-4 w-4" /> Install App
                        </Button>
                    )}
                    <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                    <ModeToggle />
                </div>
                <div className="lg:hidden flex items-center gap-2">
                    {showInstallButton && (
                         <Button variant="ghost" size="icon" onClick={handleInstallClick} aria-label="Install App">
                            <Download className="h-6 w-6" />
                        </Button>
                    )}
                    <ModeToggle />
                    <Button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} variant="ghost" size="icon" aria-label="Toggle mobile menu">{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</Button>
                </div>
            </div>
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden p-4 border-t bg-background overflow-hidden">
                         <nav className="flex flex-col gap-4 text-lg">
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="features">
                                    <AccordionTrigger className="text-lg">Features</AccordionTrigger>
                                    <AccordionContent className="flex flex-col gap-2 pl-4">
                                        {siteConfig.featureItems.map(feature => <Button variant="ghost" className="justify-start gap-2 w-full" key={feature.title}><feature.icon className="h-4 w-4 text-primary" />{feature.title}</Button>)}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="industries">
                                    <AccordionTrigger className="text-lg">Industries</AccordionTrigger>
                                    <AccordionContent className="flex flex-col gap-2 pl-4">
                                         {siteConfig.industrySolutions.flatMap(c => c.items).map(s => <Button variant="ghost" className="justify-start gap-2 w-full" key={s.name}><s.icon className="h-4 w-4 text-primary" />{s.name}</Button>)}
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