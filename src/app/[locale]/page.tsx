'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";
import {
    Banknote, Bot, BrainCircuit, Facebook, Handshake, ShieldCheck, TrendingUp, Landmark, Leaf, Linkedin, LucideIcon, Menu, ArrowRight, Utensils, WifiOff, Rocket, Send, Signal, Store, Twitter, Users, X, Zap, ShieldHalf, LayoutGrid, Lightbulb, Wallet, ClipboardList, Package, UserCog, Files, Download, Share, Sparkles, Loader2, CheckCircle, Briefcase, Globe, BarChart3, Clock, Scale, Phone, Building, Wrench, HeartHandshake, Car, PawPrint, Megaphone, Palette, FileText, Settings, KeyRound, Cloud, GitBranch, BadgeCheck, Coins, PiggyBank, ReceiptText, Barcode, Warehouse, ShoppingCart, CalendarDays, LineChart, MessageSquareText, HelpCircle, Book, CircleDollarSign
} from 'lucide-react';

interface FeatureDetail {
    icon: LucideIcon;
    title: string;
    description: string;
    details: { name: string; detail: string; }[];
    backgroundImage: string;
}
interface IndustryItem { name: string; icon: LucideIcon; description: string; category: 'Common' | 'Trades & Services' | 'Specialized' | 'Creative & Digital'; backgroundImage: string; }
interface FaqItem { q: string; a: ReactNode; }
interface PlatformPillar { icon: LucideIcon; title: string; description: string; backgroundImage: string; }

type CookieCategoryKey = 'essential' | 'analytics' | 'marketing';
interface CookieCategoryInfo { id: CookieCategoryKey; name: string; description: string; isRequired: boolean; defaultChecked: boolean; }
type CookiePreferences = { [key in CookieCategoryKey]: boolean; };
interface ToastState { visible: boolean; message: string; }

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

const siteConfig = {
    name: "BBU1",
    shortDescription: "Your all-in-one OS for global business. Unify accounting, CRM, inventory, and AI insights. Built in Africa, for the world.",
    url: "https://www.bbu1.com/",
    contactInfo: {
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
        socials: { linkedin: '#', twitter: '#', facebook: '#' }
    },
    featureSets: [
        {
            icon: Users, title: "Human Resources", description: "Manage your most valuable asset—your people—from recruitment to retirement.",
            backgroundImage: "/images/showcase/modern-office-bbU1.jpg",
            details: [
                { name: "Leave Management", detail: "Automate leave requests, approvals, and balance tracking with configurable policies for any country." },
                { name: "Recruitment", detail: "Streamline your hiring process from job posting to onboarding with a collaborative recruitment pipeline." },
                { name: "Performance Management", detail: "Set goals, conduct reviews, and foster growth with integrated performance management tools." },
                { name: "Onboarding & Offboarding", detail: "Create structured onboarding plans to ensure new hires are productive from day one, and manage offboarding seamlessly." },
                { name: "Payroll Automation", detail: "Automate salary calculations, tax deductions, and payslip generation, fully compliant with local regulations and multi-currency support." },
                { name: "Employee Self-Service", detail: "Empower employees to manage their profiles, request leave, and access payslips, reducing HR administrative burden." },
            ]
        },
        {
            icon: Handshake, title: "CRM", description: "Build lasting customer relationships and accelerate your sales cycle.",
            backgroundImage: "/images/showcase/call-center-crm.jpg",
            details: [
                { name: "Sales Pipeline & Lead Management", detail: "Visualize and manage your entire sales process, from lead generation and qualification to close, with a customizable drag-and-drop pipeline." },
                { name: "Customer Support & Ticketing", detail: "Provide exceptional customer service with a built-in helpdesk to track, prioritize, and resolve customer issues efficiently, enhancing satisfaction." },
                { name: "Marketing Automation & Campaigns", detail: "Run targeted email campaigns, manage customer segments, and track marketing ROI all within your business OS to optimize engagement." },
                { name: "Customer Segmentation", detail: "Segment your customer base by various criteria for personalized communication and targeted offers." },
                { name: "Activity Tracking", detail: "Log all customer interactions, calls, emails, and meetings for a complete history and better relationship management." },
            ]
        },
        {
            icon: Landmark, title: "Finance & Accounting", description: "Gain complete financial control with AI-powered, GAAP-compliant accounting.",
            backgroundImage: "/images/showcase/office-admin-bbU1.jpg",
            details: [
                { name: "Financial Reporting & Analytics", detail: "Generate real-time Profit & Loss, Balance Sheets, Cash Flow statements, and custom reports with a single click for insightful decision-making." },
                { name: "Expense Management", detail: "Capture, approve, and reimburse employee expenses seamlessly, eliminating manual paperwork and ensuring compliance." },
                { name: "General Ledger & Chart of Accounts", detail: "Maintain a complete, auditable record of every transaction with an automated double-entry accounting core, fully configurable for your business." },
                { name: "Advanced Invoicing & Billing", detail: "Create and send professional, customized invoices with automated reminders to get paid faster. Supports recurring billing, multi-currency, and credit notes." },
                { name: "Bank Reconciliation", detail: "Automate bank reconciliations, matching transactions to your ledger to ensure accuracy and save time." },
                { name: "Accounts Payable & Receivable", detail: "Efficiently manage bills, vendor payments, and track customer invoices, ensuring timely payments and collections." },
                { name: "Budgeting & Forecasting", detail: "Create detailed budgets, track performance against them in real-time, and leverage AI for accurate financial forecasting." },
            ]
        },
        {
            icon: Warehouse, title: "Inventory & Supply Chain", description: "Optimize your stock, manage warehouses, and streamline your supply chain.",
            backgroundImage: "/images/showcase/logistics-handheld-scanner.jpg",
            details: [
                { name: "Multi-Warehouse Management", detail: "Track inventory across multiple locations, warehouses, or stores in real-time with comprehensive visibility." },
                { name: "Purchase Order Management", detail: "Create, send, and track purchase orders, managing supplier relationships and optimizing procurement." },
                { name: "Stock Level Optimization", detail: "Automate reorder points, receive alerts for low stock, and reduce carrying costs with intelligent inventory planning." },
                { name: "Batch & Serial Number Tracking", detail: "Maintain full traceability of products with batch and serial number tracking, essential for quality control and recalls." },
                { name: "Barcode Scanning Integration", detail: "Speed up inventory operations with integrated barcode scanning for receiving, picking, and dispatch." },
                { name: "Landed Cost Calculation", detail: "Accurately calculate the total cost of imported goods, including duties, freight, and insurance." },
            ]
        },
        {
            icon: ShoppingCart, title: "Sales & E-commerce", description: "Manage your sales channels, from retail POS to online stores.",
            backgroundImage: "/images/showcase/bakery-pos-system.jpg",
            details: [
                { name: "Point of Sale (POS)", detail: "Intuitive and fast POS system for retail operations, supporting multiple payment methods and integrated with inventory." },
                { name: "E-commerce Integration", detail: "Seamlessly connect with popular e-commerce platforms to sync products, orders, and customer data in real-time." },
                { name: "Order Management", detail: "Process sales orders efficiently, from creation to fulfillment, with status tracking and automated workflows." },
                { name: "Pricing & Discounts", detail: "Manage complex pricing strategies, promotional discounts, and customer-specific pricing rules." },
                { name: "Sales Analytics", detail: "Gain insights into sales performance, popular products, and customer buying patterns with powerful dashboards." },
            ]
        },
        {
            icon: Briefcase, title: "Project Management", description: "Plan, execute, and track projects with collaborative tools.",
            backgroundImage: "/images/showcase/creative-agency-pm.jpg",
            details: [
                { name: "Task & Workflow Management", detail: "Organize projects into tasks, assign responsibilities, set deadlines, and track progress with Kanban boards or Gantt charts." },
                { name: "Time Tracking", detail: "Accurately track time spent on tasks and projects for precise billing and resource allocation." },
                { name: "Resource Management", detail: "Allocate team members and resources effectively across projects, avoiding overloads and ensuring optimal utilization." },
                { name: "Budgeting & Cost Tracking", detail: "Set project budgets, track actual expenses against them, and monitor profitability in real-time." },
                { name: "Client Collaboration Portal", detail: "Provide clients with secure access to project updates, documents, and communication threads, enhancing transparency." },
            ]
        },
        {
            icon: Scale, title: "Compliance & Governance", description: "Ensure regulatory adherence and maintain strong internal controls.",
            backgroundImage: "/images/showcase/office-presentation-dashboard.jpg",
            details: [
                { name: "Audit Trails & Logs", detail: "Maintain a complete, tamper-proof audit trail of every action taken in the system for ultimate security and compliance." },
                { name: "Role-Based Access Control", detail: "Granular control over user permissions and access rights, ensuring data security and adherence to internal policies." },
                { name: "Document Management", detail: "Securely store, organize, and manage all business documents with version control and access permissions." },
                { name: "Multi-Currency & Tax Localization", detail: "Handle transactions in multiple currencies and comply with local tax regulations across different regions." },
                { name: "Data Privacy & GDPR Compliance", detail: "Tools and features to help your business comply with data protection regulations like GDPR and other local privacy laws." },
            ]
        },
        {
            icon: Phone, title: "Telecom Services", description: "A specialized, end-to-end solution for managing telecom and agent-based businesses.",
            backgroundImage: "/images/showcase/mobile-money-agent.jpg",
            details: [
                { name: "Admin Dashboard & Real-time Monitoring", detail: "Get a high-level overview of your entire telecom operation, from agent performance to financial health, with real-time analytics." },
                { name: "Agent Management & Hierarchy", detail: "Onboard, manage, and track thousands of agents in real-time with powerful hierarchical controls and commission structures." },
                { name: "Reconciliation & Settlement Center", detail: "Automate complex reconciliations between your systems, MNOs, and partners, ensuring financial accuracy and timely settlements." },
                { name: "Financial Controls & Risk Management", detail: "Set precise financial limits, commissions, and controls for your entire agent network to manage risk and prevent fraud." },
                { name: "Product & Service Configuration", detail: "Easily configure and manage airtime, data bundles, mobile money services, and other telecom products." },
                { name: "Customer & Subscriber Management", detail: "Manage subscriber accounts, service activations, and customer support for all your telecom offerings." },
            ]
        },
        {
            icon: BarChart3, title: "Business Intelligence & AI", description: "Transform raw data into actionable insights with AI-powered analytics.",
            backgroundImage: "/images/showcase/ai-warehouse-logistics.jpg",
            details: [
                { name: "AI Copilot & Smart Insights", detail: "Aura, our AI copilot, automates bookkeeping, detects anomalies, and provides strategic insights like 'Cash flow projected to be low in 3 weeks.'" },
                { name: "Custom Dashboards & Reporting", detail: "Create personalized dashboards and reports with drag-and-drop functionality to visualize key performance indicators (KPIs)." },
                { name: "Predictive Analytics", detail: "Leverage AI to forecast sales, demand, and financial trends, helping you make proactive business decisions." },
                { name: "Data Integration Hub", detail: "Consolidate data from various modules within BBU1 and external sources for a holistic view of your business." },
                { name: "Anomaly Detection", detail: "Automatically detect unusual patterns or outliers in your data, alerting you to potential issues or opportunities." },
            ]
        },
    ] as FeatureDetail[],
    platformPillars: [
        { icon: TrendingUp, title: "Built for Growth", description: "Growth is not an option; it's guaranteed. BBU1 scales from a single user to a global enterprise without compromise.", backgroundImage: "/images/showcase/future-of-business-tech.jpg" },
        { icon: BrainCircuit, title: "AI Does The Work", description: "Our AI, Aura, automates bookkeeping, detects anomalies, and provides strategic insights to reduce manual work and drive smart decisions.", backgroundImage: "/images/showcase/ai-warehouse-logistics.jpg" },
        { icon: WifiOff, title: "Unbreakable Offline Mode", description: "Your business never stops. Core functions work perfectly offline, syncing instantly when you're back online, ensuring continuous operation.", backgroundImage: "/images/showcase/education-dashboard.jpg" },
        { icon: Globe, title: "Truly Global & Localized", description: "Full multi-currency support, adaptable tax systems, and localized compliance for any country in Africa and across the world, making global expansion seamless.", backgroundImage: "/images/showcase/community-group-meeting.jpg" },
        { icon: ShieldHalf, title: "Bank-Level Security", description: "Your data is protected with end-to-end encryption, multi-factor authentication, and a multi-tenant architecture, ensuring complete isolation and security.", backgroundImage: "/images/showcase/cattle-market-records.jpg" },
        { icon: Settings, title: "Deep Customization & Integration", description: "Tailor the system with custom fields, workflows, and robust API integrations to match your unique business processes and connect with existing tools.", backgroundImage: "/images/showcase/creative-agency-pm.jpg" },
    ] as PlatformPillar[],
    industryItems: [
        { name: "Retail / Wholesale", icon: Store, description: "Unified POS, inventory, and CRM for single or multi-location retail operations and wholesale distribution.", category: 'Common', backgroundImage: "/images/showcase/grocery-store-bbu1.jpg" },
        { name: "Restaurant / Cafe", icon: Utensils, description: "Complete management with KDS, table management, recipe costing, and ingredient-level inventory control.", category: 'Common', backgroundImage: "/images/showcase/restaurant-kitchen-orders.jpg" },
        { name: "Professional Services", icon: Briefcase, description: "Project tracking, time billing, client management, and expense tracking for agencies, consultants, and legal firms.", category: 'Common', backgroundImage: "/images/showcase/modern-office-team.jpg" },
        { name: "Manufacturing", icon: Wrench, description: "Bill of materials, production planning, work orders, and raw material inventory management.", category: 'Specialized', backgroundImage: "/images/showcase/produce-inspection.jpg" },
        { name: "Construction & Engineering", icon: Building, description: "Job costing, project management, progress billing, and equipment tracking for contractors and construction companies.", category: 'Trades & Services', backgroundImage: "/images/showcase/construction-site.jpg" },
        { name: "Field Service Management", icon: Car, description: "Scheduling, dispatch, mobile invoicing, and technician tracking for HVAC, plumbing, and other field service businesses.", category: 'Trades & Services', backgroundImage: "/images/showcase/logistics-handheld-scanner.jpg" },
        { name: "Distribution & Logistics", icon: Package, description: "End-to-end warehouse management, logistics planning, fleet management, and supply chain optimization.", category: 'Specialized', backgroundImage: "/images/showcase/ai-warehouse-logistics.jpg" },
        { name: "Lending / Microfinance", icon: Banknote, description: "Loan origination, portfolio management, automated collections, and compliance for microfinance institutions.", category: 'Specialized', backgroundImage: "/images/showcase/mobile-money-agent.jpg" },
        { name: "Real Estate & Property Management", icon: KeyRound, description: "Property management, tenant billing, lease tracking, maintenance requests, and facilities management.", category: 'Specialized', backgroundImage: "/images/showcase/office-admin-bbu1.jpg" },
        { name: "SACCO / Co-operative", icon: Users, description: "Member management, savings, loans, dividend calculation, and governance tools for cooperative societies.", category: 'Specialized', backgroundImage: "/images/showcase/community-group-meeting.jpg" },
        { name: "Telecom Services", icon: Signal, description: "The premier solution for managing mobile money, airtime, and extensive agent networks, including commission management.", category: 'Specialized', backgroundImage: "/images/showcase/mobile-money-agent.jpg" },
        { name: "Nonprofit & NGOs", icon: HeartHandshake, description: "Donor management, grant tracking, fund accounting, project impact reporting, and volunteer management for NGOs.", category: 'Specialized', backgroundImage: "/images/showcase/community-group-meeting.jpg" },
        { name: "Healthcare & Clinics", icon: ClipboardList, description: "Patient management, appointment scheduling, electronic health records (EHR), and medical inventory control.", category: 'Specialized', backgroundImage: "/images/showcase/healthcare-team.jpg" },
        { name: "Education & Institutions", icon: Book, description: "Student information systems, fee management, academic scheduling, and faculty portal for schools and colleges.", category: 'Specialized', backgroundImage: "/images/showcase/education-dashboard.jpg" },
        { name: "Agriculture & Agribusiness", icon: Leaf, description: "Farm management, crop tracking, livestock management, harvest planning, and supply chain for agribusinesses.", category: 'Specialized', backgroundImage: "/images/showcase/agriculture-tech.jpg" },
        { name: "Creative Agencies", icon: Palette, description: "Project management, client billing, resource allocation, and portfolio tracking for marketing and design agencies.", category: 'Creative & Digital', backgroundImage: "/images/showcase/creative-agency-pm.jpg" },
        { name: "Tech & Software", icon: Cloud, description: "Subscription billing, project management, issue tracking, and client support for SaaS companies and IT service providers.", category: 'Creative & Digital', backgroundImage: "/images/showcase/future-of-business-tech.jpg" },
    ] as IndustryItem[],
    faqItems: [
        { q: 'What is BBU1?', a: 'BBU1 (Big Business Unified) is an all-in-one operating system for businesses, unifying accounting, CRM, inventory, HR, project management, and AI-powered insights into a single, intelligent platform, designed for growth.' },
        { q: 'How does the AI Copilot Aura work?', a: 'Aura, our AI Copilot, securely analyzes your company-wide data in real-time to find patterns, automate routine tasks, and provide simple, actionable insights. For example, it can suggest "Consider bundling Product A and B" or alert you to a "Cash flow projected to be low in 3 weeks," helping you make proactive, data-driven decisions.' },
        { q: 'Is my enterprise data secure with BBU1?', a: 'Absolutely. BBU1 employs a robust multi-tenant architecture with PostgreSQL\'s Row-Level Security, ensuring your data is completely isolated from other clients. We use bank-level, end-to-end encryption for all data in transit and at rest, along with multi-factor authentication and continuous security monitoring to protect your information.' },
        { q: 'Can BBU1 be customized to fit my specific business workflows?', a: 'Yes, BBU1 is designed for extensive customization. While powerful out-of-the-box, we offer comprehensive customization services including custom fields, tailored workflows, and robust API access for enterprise clients. This allows you to integrate BBU1 seamlessly with your existing tools and adapt it precisely to your unique operational processes.' },
        { q: 'What kind of customer support is included with BBU1?', a: 'Enterprise plans include dedicated onboarding specialists, an assigned account manager, and priority technical support available via WhatsApp, phone, and email. We also provide a Service Level Agreement (SLA) guaranteeing uptime and rapid response times, ensuring you always have the support you need.' },
        { q: 'Does BBU1 support multiple currencies and international operations?', a: 'Yes, BBU1 offers comprehensive multi-currency support, allowing you to manage transactions, invoicing, and reporting in various currencies. It also includes adaptable tax systems and localized compliance features to operate effectively across different countries, particularly throughout Africa and globally.' },
        { q: 'What happens if my internet connection is lost?', a: 'BBU1 features an unbreakable offline mode. Key business functions, such as POS transactions, inventory updates, and HR processes, continue to work perfectly even without an internet connection. All data is securely stored locally and automatically syncs with the cloud the moment you\'re back online, ensuring uninterrupted business operations.' },
    ] as FaqItem[],
    termsOfService: (<div className="space-y-4 text-sm"><p>Welcome to BBU1...</p></div>), // Content hidden for brevity
    privacyPolicy: (<div className="space-y-4 text-sm"><p>This Privacy Policy describes how BBU1 collects...</p></div>), // Content hidden for brevity
    cookieCategories: [
        { id: 'essential', name: 'Essential Cookies', description: 'These cookies are crucial for the website to function properly...', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics Cookies', description: 'These cookies allow us to count visits and traffic sources...', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing Cookies', description: 'These cookies may be set through our site by our advertising partners...', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.2 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const textVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } } };
const heroImageVariants: Variants = { initial: { scale: 1 }, animate: { scale: [1, 1.05, 1], transition: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" } } };
const pillarCardContentVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" }, }, exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: "easeIn" } } };

const ListItem = forwardRef<ElementRef<"a">, ComponentPropsWithoutRef<"a"> & { icon: LucideIcon; }>(({ className, title, children, icon: Icon, ...props }, ref) => (
    <li>
        <NavigationMenuLink asChild>
            <a
                ref={ref}
                className={cn(
                    "flex items-start select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    className
                )}
                {...props}
            >
                <div className="p-2 bg-primary/10 rounded-md mr-4 mt-1"><Icon className="h-6 w-6 text-primary" /></div>
                <div>
                    <div className="text-sm font-medium leading-none">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">{children}</p>
                </div>
            </a>
        </NavigationMenuLink>
    </li>
));
ListItem.displayName = "ListItem";

// REFACTORED FullScreenDialog Component for reusability
const FullScreenDialog = ({ trigger, children, title, description, backgroundImage, icon: Icon }: { trigger: ReactNode; children: ReactNode; title: string; description?: string; backgroundImage?: string; icon?: LucideIcon; }) => (
    <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="fixed inset-0 w-full h-full max-w-none p-0 flex flex-col z-[200] border-none rounded-none animate-in slide-in-from-bottom-full duration-500 ease-out-expo data-[state=closed]:slide-out-to-bottom-full data-[state=closed]:duration-500 data-[state=closed]:ease-in-expo">
            {backgroundImage && (
                <Image
                    src={backgroundImage}
                    alt={`${title} background`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="absolute inset-0 z-0 opacity-20 dark:opacity-10 filter brightness-[0.6]"
                    priority
                />
            )}
            <div className="relative z-10 flex flex-col h-full w-full bg-background/90 dark:bg-background/95 backdrop-blur-lg">
                <DialogHeader className="p-6 md:p-8 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            {Icon && <Icon className="h-7 w-7 md:h-8 md:w-8 text-primary" />} {title}
                        </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                                <X className="h-6 w-6" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </DialogClose>
                    </div>
                    {description && <DialogDescription className="mt-2 text-base md:text-lg">{description}</DialogDescription>}
                </DialogHeader>
                <ScrollArea className="flex-grow">
                    <div className="p-6 md:p-8">{children}</div>
                </ScrollArea>
                <div className="p-6 md:p-8 border-t flex-shrink-0 bg-background/80">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full">Back to Main Page</Button>
                    </DialogClose>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);

const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2 font-bold text-lg text-primary"><Rocket className="h-6 w-6" /> <span>{siteConfig.name}</span></Link>

                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[600px] gap-3 p-4 md:w-[700px] md:grid-cols-2 lg:w-[800px]">
                                    {siteConfig.featureSets.map((feature) => (
                                        <FullScreenDialog
                                            key={feature.title}
                                            trigger={
                                                <li className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                    <ListItem title={feature.title} icon={feature.icon} href="#">{feature.description}</ListItem>
                                                </li>
                                            }
                                            title={feature.title}
                                            description={feature.description}
                                            backgroundImage={feature.backgroundImage}
                                            icon={feature.icon}
                                        >
                                            <div className="py-4 space-y-6">
                                                {feature.details.map(detail => (
                                                    <div key={detail.name} className="flex items-start">
                                                        <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <h4 className="font-semibold text-xl">{detail.name}</h4>
                                                            <p className="text-base text-muted-foreground mt-1">{detail.detail}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </FullScreenDialog>
                                    ))}
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Industries</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ScrollArea className="h-[60vh] w-[800px]">
                                    <div className="grid grid-cols-4 gap-4 p-4">
                                        {['Common', 'Trades & Services', 'Specialized', 'Creative & Digital'].map(category => (
                                            <div key={category} className="col-span-1">
                                                <h3 className="font-semibold text-sm px-3 mb-2">{category}</h3>
                                                {siteConfig.industryItems.filter(i => i.category === category).map((item) => (
                                                    <FullScreenDialog
                                                        key={item.name}
                                                        trigger={
                                                            <li className="cursor-pointer list-none" onClick={(e) => e.stopPropagation()}>
                                                                <ListItem title={item.name} icon={item.icon} href="#">{item.description}</ListItem>
                                                            </li>
                                                        }
                                                        title={item.name}
                                                        description={item.description}
                                                        backgroundImage={item.backgroundImage}
                                                        icon={item.icon}
                                                    >
                                                        <div className="text-lg text-muted-foreground p-4">
                                                            <p>More detailed information about {item.name} solutions will be displayed here.</p>
                                                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                                                <li>Tailored modules for {item.name.toLowerCase()} operations.</li>
                                                                <li>Industry-specific reporting and analytics.</li>
                                                                <li>Compliance with relevant {item.name.toLowerCase()} regulations.</li>
                                                            </ul>
                                                        </div>
                                                    </FullScreenDialog>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem>
                            <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
                            <NavigationMenuContent>
                                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                                    {siteConfig.platformPillars.map((pillar) => (
                                        <FullScreenDialog
                                            key={pillar.title}
                                            trigger={
                                                <li className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                    <ListItem title={pillar.title} href="#" icon={pillar.icon}>{pillar.description}</ListItem>
                                                </li>
                                            }
                                            title={pillar.title}
                                            description={pillar.description}
                                            backgroundImage={pillar.backgroundImage}
                                            icon={pillar.icon}
                                        >
                                            <div className="text-lg text-muted-foreground p-4">
                                                <p>Detailed explanation of the "{pillar.title}" pillar and its technical underpinnings.</p>
                                                <ul className="list-disc pl-5 mt-4 space-y-2">
                                                    <li>Key architectural components.</li>
                                                    <li>Performance and scalability benchmarks.</li>
                                                    <li>Integration capabilities and standards.</li>
                                                </ul>
                                            </div>
                                        </FullScreenDialog>
                                    ))}
                                </ul>
                            </NavigationMenuContent>
                        </NavigationMenuItem>
                        <NavigationMenuItem><Link href="/support" legacyBehavior passHref><NavigationMenuLink className={navigationMenuTriggerStyle()}>Support</NavigationMenuLink></Link></NavigationMenuItem>
                        <NavigationMenuItem>
                            <Dialog>
                                <DialogTrigger asChild><Button variant="ghost" className={navigationMenuTriggerStyle()}>FAQ</Button></DialogTrigger>
                                <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle className="text-2xl">Frequently Asked Questions</DialogTitle></DialogHeader><ScrollArea className="h-[60vh] pr-4"><Accordion type="single" collapsible className="w-full py-4">{siteConfig.faqItems.map((faq, index) => (<AccordionItem key={index} value={`item-${index}`}><AccordionTrigger className="text-lg text-left">{faq.q}</AccordionTrigger><AccordionContent className="text-muted-foreground text-base">{faq.a}</AccordionContent></AccordionItem>))}</Accordion></ScrollArea></DialogContent>
                            </Dialog>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>

                <div className="hidden lg:flex items-center gap-2">
                    <Button variant="outline" asChild><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a Demo</a></Button>
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
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="lg:hidden bg-background border-t absolute w-full top-16 shadow-lg z-40">
                        <div className="container mx-auto py-4 px-4 space-y-2">
                            {/* Mobile Menu Sections */}
                            <Dialog><DialogTrigger asChild><button className="w-full text-left py-2 text-lg font-medium hover:text-primary">Features</button></DialogTrigger><DialogContent className="fixed inset-0 w-full h-full max-w-none p-0 flex flex-col z-[200] border-none rounded-none"><ScrollArea className="flex-grow"><div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{siteConfig.featureSets.map(feature => (<FullScreenDialog key={feature.title} trigger={<div className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent cursor-pointer"><feature.icon className="h-7 w-7 text-primary flex-shrink-0 mt-1" /><div><h4 className="font-semibold text-lg">{feature.title}</h4><p className="text-sm text-muted-foreground">{feature.description}</p></div></div>} title={feature.title} description={feature.description} backgroundImage={feature.backgroundImage} icon={feature.icon}><div className="py-4 space-y-6">{feature.details.map(detail => (<div key={detail.name} className="flex items-start"><CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0" /><div><h4 className="font-semibold text-xl">{detail.name}</h4><p className="text-base text-muted-foreground mt-1">{detail.detail}</p></div></div>))}</div></FullScreenDialog>))}</div></ScrollArea></DialogContent></Dialog>
                            <Dialog><DialogTrigger asChild><button className="w-full text-left py-2 text-lg font-medium hover:text-primary">Industries</button></DialogTrigger><DialogContent className="fixed inset-0 w-full h-full max-w-none p-0 flex flex-col z-[200] border-none rounded-none"><ScrollArea className="flex-grow"><div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{siteConfig.industryItems.map(item => (<FullScreenDialog key={item.name} trigger={<div className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent cursor-pointer"><item.icon className="h-7 w-7 text-primary flex-shrink-0 mt-1" /><div><h4 className="font-semibold text-lg">{item.name}</h4><p className="text-sm text-muted-foreground">{item.description}</p></div></div>} title={item.name} description={item.description} backgroundImage={item.backgroundImage} icon={item.icon}><div className="text-lg text-muted-foreground p-4"><p>More detailed information about {item.name} solutions will be displayed here.</p></div></FullScreenDialog>))}</div></ScrollArea></DialogContent></Dialog>
                            <Dialog><DialogTrigger asChild><button className="w-full text-left py-2 text-lg font-medium hover:text-primary">Platform</button></DialogTrigger><DialogContent className="fixed inset-0 w-full h-full max-w-none p-0 flex flex-col z-[200] border-none rounded-none"><ScrollArea className="flex-grow"><div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{siteConfig.platformPillars.map(pillar => (<FullScreenDialog key={pillar.title} trigger={<div className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent cursor-pointer"><pillar.icon className="h-7 w-7 text-primary flex-shrink-0 mt-1" /><div><h4 className="font-semibold text-lg">{pillar.title}</h4><p className="text-sm text-muted-foreground">{pillar.description}</p></div></div>} title={pillar.title} description={pillar.description} backgroundImage={pillar.backgroundImage} icon={pillar.icon}><div className="text-lg text-muted-foreground p-4"><p>Detailed explanation of the "{pillar.title}" pillar.</p></div></FullScreenDialog>))}</div></ScrollArea></DialogContent></Dialog>

                            <Link href="/support" className="block text-lg font-medium hover:text-primary py-2" onClick={() => setIsMobileMenuOpen(false)}>Support</Link>
                            <Dialog><DialogTrigger asChild><button className="w-full text-left py-2 text-lg font-medium hover:text-primary">FAQ</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle className="text-2xl">Frequently Asked Questions</DialogTitle></DialogHeader><ScrollArea className="h-[60vh] pr-4"><Accordion type="single" collapsible className="w-full py-4">{siteConfig.faqItems.map((faq, index) => (<AccordionItem key={index} value={`item-${index}`}><AccordionTrigger className="text-lg text-left">{faq.q}</AccordionTrigger><AccordionContent className="text-muted-foreground text-base">{faq.a}</AccordionContent></AccordionItem>))}</Accordion></ScrollArea></DialogContent></Dialog>

                            <div className="flex flex-col gap-2 pt-4 border-t">
                                <Button asChild><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a Demo</a></Button>
                                <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
                                <Button asChild><Link href="/signup">Get Started</Link></Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};


const LandingFooter = ({ onManageCookies }: { onManageCookies: () => void }) => (
    <footer className="relative border-t bg-background/90 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 pt-12 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                <div className="col-span-2"><h3 className="text-xl font-bold text-primary flex items-center gap-2"><Rocket className="h-6 w-6" /> {siteConfig.name}</h3><p className="text-sm text-muted-foreground mt-4 max-w-xs">{siteConfig.shortDescription}</p><div className="flex items-center gap-5 mt-6"><a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={20} /></a><a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20} /></a><a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></a></div></div>
                <div><h4 className="font-semibold text-base mb-3">Product</h4><ul className="space-y-2 text-sm"><li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Features</Link></li><li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Industries</Link></li><li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Platform</Link></li></ul></div>
                <div><h4 className="font-semibold text-base mb-3">Company</h4><ul className="space-y-2 text-sm"><li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">Contact Sales</a></li><li><Link href="/support" className="text-muted-foreground hover:text-primary transition-colors">Support</Link></li></ul></div>
                <div><h4 className="font-semibold text-base mb-3">Legal</h4><ul className="space-y-2 text-sm"><li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left transition-colors">Terms of Service</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Terms of Service</DialogTitle></DialogHeader><ScrollArea className="h-[60vh] pr-4">{siteConfig.termsOfService}</ScrollArea></DialogContent></Dialog></li><li><Dialog><DialogTrigger asChild><button className="text-muted-foreground hover:text-primary text-left transition-colors">Privacy Policy</button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Privacy Policy</DialogTitle></DialogHeader><ScrollArea className="h-[60vh] pr-4">{siteConfig.privacyPolicy}</ScrollArea></DialogContent></Dialog></li><li><button onClick={onManageCookies} className="text-muted-foreground hover:text-primary text-left transition-colors">Manage Cookies</button></li></ul></div>
            </div>
            <div className="border-t mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground"><p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p><p className="mt-3 sm:mt-0">Made with <Leaf className="inline h-3 w-3 text-green-500" /> in Kampala, Uganda.</p></div>
        </div>
    </footer>
);

const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-16 sm:py-20 overflow-hidden", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <div className="container mx-auto px-4 relative z-10">{children}</div>
    </motion.section>
);

const Toast = ({ message, isVisible }: { message: string, isVisible: boolean }) => (
    <AnimatePresence>
        {isVisible && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }} className="fixed bottom-6 left-6 z-[250] flex items-center gap-3 rounded-lg bg-foreground text-background p-4 shadow-2xl">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <p className="font-medium">{message}</p>
            </motion.div>
        )}
    </AnimatePresence>
);

const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userContext, setUserContext] = useState<{ businessId: string | null; userId: string | null }>({ businessId: null, userId: null });
    const [chatInput, setChatInput] = useState('');
    const { messages, setMessages, append, isLoading }: any = useChat({ api: '/api/chat', body: { businessId: userContext.businessId, userId: userContext.userId } } as any);

    useEffect(() => { setUserContext({ businessId: getCookie('business_id'), userId: getCookie('user_id') }); }, []);
    useEffect(() => { if (messages.length === 0 && setMessages) { setMessages([{ id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' }]); } }, [messages.length, setMessages]);
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [messages]);

    const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = chatInput.trim();
        if (!trimmedInput || isLoading) return;
        append({ content: trimmedInput, role: 'user' });
        setChatInput('');
    };

    const isDisabled = isLoading || !userContext.userId || !userContext.businessId;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-[200]">
                        <Card className="h-full w-full flex flex-col shadow-2xl">
                            <CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle><CardDescription>Your AI Business Analyst</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button></CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0"><ScrollArea className="flex-1 p-4" ref={scrollRef}><div className="space-y-4">
                                {messages.map((m: CoreMessage, i: number) => (
                                    <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                        {m.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-primary" /></AvatarFallback></Avatar>}
                                        <div className="rounded-lg p-3 max-w-[85%] break-words prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: m.content as string }} />
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
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-[200] transition-transform hover:scale-110 active:scale-95" aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>{isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}</Button>
        </>
    );
};

export default function HomePage() {
    const rotatingTexts = ["Automation where it counts. Human when it matters.", "From startup to enterprise.", "For every ambition."];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const slideshowContent = [
        { src: "/images/showcase/construction-site.jpg", title: "Construction & Project Management", description: "Oversee complex projects on-site with real-time data.", alt: "Construction managers using BBU1 on a tablet." },
        { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom & Mobile Money", description: "Empower agents with a fast, secure system for transactions.", alt: "A mobile money agent serving customers." },
        { src: "/images/showcase/local-shop-owner.jpg", title: "Local & Retail Commerce", description: "A simple yet powerful POS and inventory system to manage sales and stock.", alt: "A local shop owner managing his store." },
        { src: "/images/showcase/healthcare-team.jpg", title: "Healthcare & Clinic Management", description: "Digitize patient records, manage appointments, and track medical supplies.", alt: "Medical professionals using BBU1 on tablets." },
        { src: "/images/showcase/farmers-learning.jpg", title: "Agriculture & Agribusiness", description: "Bring modern management to the field to track crops and connect with markets.", alt: "Farmers collaborating with BBU1 on mobile devices." },
    ];
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const [activePillarIndex, setActivePillarIndex] = useState(0);

    useEffect(() => {
        const textInterval = setInterval(() => { setCurrentTextIndex(prev => (prev + 1) % rotatingTexts.length); }, 4000);
        const imageInterval = setInterval(() => { setCurrentSlideIndex(prev => (prev + 1) % slideshowContent.length); }, 8000);
        const pillarInterval = setInterval(() => { setActivePillarIndex(prev => (prev + 1) % siteConfig.platformPillars.length); }, 8000);
        return () => { clearInterval(textInterval); clearInterval(imageInterval); clearInterval(pillarInterval); };
    }, [rotatingTexts.length, slideshowContent.length, siteConfig.platformPillars.length]);

    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.defaultChecked }), {} as CookiePreferences);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);
    const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(initialCookiePreferences);
    const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
    const [mounted, setMounted] = useState(false);

    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => { console.log("Applying cookie preferences:", prefs); }, []);
    const showToast = (message: string) => { setToast({ visible: true, message }); setTimeout(() => setToast({ visible: false, message: '' }), 4000); };
    const handleAcceptAllCookies = useCallback(() => { const allTruePrefs: CookiePreferences = { essential: true, analytics: true, marketing: true }; setCookiePreferences(allTruePrefs); setCookie('bbu1_cookie_consent', JSON.stringify(allTruePrefs), 365); setShowCookieBanner(false); applyCookiePreferences(allTruePrefs); showToast("All cookies have been accepted."); }, [applyCookiePreferences]);
    const handleSaveCookiePreferences = useCallback(() => { setCookie('bbu1_cookie_consent', JSON.stringify(cookiePreferences), 365); setShowCookieBanner(false); setIsCustomizingCookies(false); applyCookiePreferences(cookiePreferences); showToast("Your privacy preferences have been saved."); }, [cookiePreferences, applyCookiePreferences]);
    const openCookiePreferences = useCallback(() => { const consentCookie = getCookie('bbu1_cookie_consent'); try { const storedPrefs = consentCookie ? JSON.parse(consentCookie) : initialCookiePreferences; setCookiePreferences(storedPrefs); } catch { setCookiePreferences(initialCookiePreferences); } setShowCookieBanner(true); setIsCustomizingCookies(true); }, [initialCookiePreferences]);
    
    useEffect(() => {
        setMounted(true);
        const consentCookie = getCookie('bbu1_cookie_consent');
        if (!consentCookie) { setShowCookieBanner(true); } 
        else { try { applyCookiePreferences(JSON.parse(consentCookie)); } catch { setShowCookieBanner(true); } }
    }, [applyCookiePreferences]);

    return (
        <>
            <MegaMenuHeader />
            <main>
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden text-center min-h-[600px] flex items-center justify-center">
                    <motion.div 
                        className="absolute inset-0 z-0"
                        variants={heroImageVariants}
                        initial="initial"
                        animate="animate"
                    >
                        <Image src="/images/showcase/modern-office-analytics.jpg" alt="Modern office analyzing data" fill style={{ objectFit: 'cover' }} className="opacity-90 dark:opacity-70" priority />
                        <div className="absolute inset-0 bg-black/70"></div> 
                    </motion.div>
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
                            <motion.p className="mt-6 text-xl leading-8 text-gray-200 max-w-2xl mx-auto" variants={itemVariants}>Stop juggling multiple apps. BBU1 is the single, unified operating system where growth is not an option—it's guaranteed.</motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}><Button asChild size="lg"><Link href="/signup">Start Free Trial</Link></Button><Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10"><a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Request a Demo <ArrowRight className="ml-2 h-4 w-4" /></a></Button></motion.div>
                        </motion.div>
                    </div>
                </section>
                
                <section id="platform" className="relative py-16 sm:py-20 overflow-hidden bg-background">
                     <div className="absolute inset-0 z-0 opacity-5 dark:[&_path]:fill-white/10" style={{ backgroundImage: 'url("/images/tech-pattern.svg")', backgroundSize: '300px 300px' }}></div>
                    <div className="container mx-auto px-4 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <h2 className="text-4xl font-extrabold tracking-tight mb-6">
                                An Operating System <br /> Engineered for Growth
                            </h2>
                            <p className="text-lg text-muted-foreground mt-2 mb-8">
                                BBU1 is more than software. It's a complete platform designed to simplify complexity and accelerate your business.
                            </p>
                            <ul className="space-y-6">
                                {siteConfig.platformPillars.map((pillar, index) => (
                                    <motion.li
                                        key={pillar.title}
                                        className={cn(
                                            "flex items-center gap-4 cursor-pointer p-3 rounded-lg transition-all",
                                            activePillarIndex === index ? "bg-primary/10 text-primary font-bold shadow-lg" : "text-muted-foreground hover:bg-accent hover:text-primary"
                                        )}
                                        onClick={() => setActivePillarIndex(index)}
                                        variants={itemVariants}
                                    >
                                        <pillar.icon className="h-7 w-7 flex-shrink-0" />
                                        <span className="text-xl">{pillar.title}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>

                        <div className="relative h-[450px] flex items-center justify-center">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={activePillarIndex}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={pillarCardContentVariants}
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <Card className="text-left h-full w-full overflow-hidden relative">
                                        {siteConfig.platformPillars[activePillarIndex].title === "Built for Growth" ? (
                                            <div className="relative z-10 p-8 flex flex-col justify-center h-full bg-primary/5">
                                                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                                    <div className="p-4 bg-primary/10 rounded-full flex-shrink-0">
                                                        <TrendingUp className="h-8 w-8 text-primary" />
                                                    </div>
                                                    <CardTitle className="text-3xl font-bold">Built for Growth</CardTitle>
                                                </CardHeader>
                                                <CardContent className="mt-4 flex-grow space-y-4">
                                                    <p className="text-lg leading-relaxed text-muted-foreground">{siteConfig.platformPillars[activePillarIndex].description}</p>
                                                    <div className="border-t pt-4 space-y-2">
                                                        <p className="flex items-center gap-2 font-medium"><CheckCircle className="h-5 w-5 text-green-500" /> Scales infinitely from 1 to 100,000+ users.</p>
                                                        <p className="flex items-center gap-2 font-medium"><CheckCircle className="h-5 w-5 text-green-500" /> Multi-branch & multi-country architecture.</p>
                                                        <p className="flex items-center gap-2 font-medium"><CheckCircle className="h-5 w-5 text-green-500" /> Robust APIs for enterprise integration.</p>
                                                    </div>
                                                </CardContent>
                                            </div>
                                        ) : (
                                            <>
                                                <Image
                                                    src={siteConfig.platformPillars[activePillarIndex].backgroundImage}
                                                    alt={siteConfig.platformPillars[activePillarIndex].title}
                                                    fill
                                                    style={{ objectFit: 'cover' }}
                                                    className="absolute inset-0 z-0 filter brightness-[0.3]"
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                />
                                                <div className="relative z-10 p-8 text-white flex flex-col justify-center h-full">
                                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                                                        <div className="p-4 bg-primary/10 rounded-full flex-shrink-0">
                                                            {React.createElement(siteConfig.platformPillars[activePillarIndex].icon, { className: "h-8 w-8 text-primary" })}
                                                        </div>
                                                        <CardTitle className="text-3xl font-bold">{siteConfig.platformPillars[activePillarIndex].title}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="mt-4 flex-grow">
                                                        <p className="text-lg leading-relaxed">{siteConfig.platformPillars[activePillarIndex].description}</p>
                                                    </CardContent>
                                                </div>
                                            </>
                                        )}
                                    </Card>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </section>

                <AnimatedSection id="in-action" className="bg-gray-900 text-white">
                    <div className="absolute inset-0 z-0">
                         <Image src="/images/showcase/future-of-business-tech.jpg" alt="Global Business Technology Network" layout="fill" objectFit="cover" className="opacity-20" />
                    </div>
                    <div className="relative z-10 text-center mb-12">
                        <motion.h2 className="text-3xl sm:text-4xl font-bold text-white" variants={itemVariants}>
                            The Engine For Every African Enterprise
                        </motion.h2>
                        <motion.p className="mt-4 text-lg text-gray-300" variants={itemVariants}>
                            From bustling city markets to the digital frontier, BBU1 is built for the continent's ambition.
                        </motion.p>
                    </div>
                    <motion.div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10 h-[400px] md:h-[550px] lg:h-[700px] bg-black/50" variants={itemVariants}>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div 
                                key={currentSlideIndex} 
                                initial={{ opacity: 0, scale: 1.05 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.95 }} 
                                transition={{ duration: 1.2, ease: "easeInOut" }} 
                                className="absolute inset-0"
                            >
                                <Image 
                                    src={slideshowContent[currentSlideIndex].src} 
                                    alt={slideshowContent[currentSlideIndex].alt} 
                                    layout="fill" 
                                    objectFit="cover" 
                                    className="filter brightness-[0.7]"
                                    priority={currentSlideIndex === 0}
                                    sizes="(max-width: 768px) 100vw, 70vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white max-w-3xl">
                                    <h3 className="text-2xl md:text-4xl font-bold mb-2">{slideshowContent[currentSlideIndex].title}</h3>
                                    <p className="text-base md:text-lg">{slideshowContent[currentSlideIndex].description}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                            {slideshowContent.map((_, idx) => (
                                <button key={idx} className={cn("h-2 w-2 rounded-full bg-white/50 transition-all", { "bg-white w-4": currentSlideIndex === idx })} onClick={() => setCurrentSlideIndex(idx)} aria-label={`Go to slide ${idx + 1}`} />
                            ))}
                        </div>
                    </motion.div>
                </AnimatedSection>
                
                <AnimatedSection id="partnership-promise" className="bg-background">
                     <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        viewport={{ once: true, amount: 0.5 }}
                        className="text-center max-w-4xl mx-auto p-8 border rounded-2xl relative overflow-hidden"
                     >
                        <div className="absolute top-4 right-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 border border-green-500 bg-green-500/10 rounded-full px-3 py-1.5">
                                <BadgeCheck className="h-5 w-5" />
                                <span>VALUED PARTNER PROMISE</span>
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold tracking-tight text-primary mt-8">Your Success is Our Onboarding Mission</h3>
                        <p className="mt-4 text-lg text-muted-foreground">
                            We don't just sell software; we forge partnerships. From your very first day, you receive <strong className="text-foreground">complimentary, dedicated human support</strong> to ensure BBU1 is perfectly tailored to your vision. We succeed only.
                        </p>
                     </motion.div>
                </AnimatedSection>
                                
                <AnimatedSection className="text-center">
                    <div className="relative py-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden">
                        <h2 className="text-3xl font-bold tracking-tight">Build an Enterprise That Lasts Generations</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">
                            The tools, insights, and platform to not only revolutionize your business today, but to build a durable legacy for tomorrow. Your journey to generational wealth starts here.
                        </p>
                        <div className="mt-8">
                            <Button asChild size="lg" variant="secondary" className="text-primary hover:bg-white/90 scale-105 transition-transform hover:scale-110">
                                <Link href="/signup">Start Your Free Trial & Build Your Legacy <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                        </div>
                    </div>
                </AnimatedSection>
            </main>

            {mounted && <AdvancedChatWidget />}
            <LandingFooter onManageCookies={openCookiePreferences} />
            
            <Toast message={toast.message} isVisible={toast.visible} />
            {mounted && (
                <AnimatePresence>
                    {showCookieBanner && (
                        <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 z-[200] p-4">
                            <Card className="max-w-xl mx-auto shadow-2xl bg-background/90 backdrop-blur-md">
                                <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> We value your privacy</CardTitle>{!isCustomizingCookies && <CardDescription>We use cookies to enhance your browsing experience. By clicking "Accept All", you consent to our use of cookies.</CardDescription>}</CardHeader>
                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setIsCustomizingCookies(true)}>Customize</Button><Button onClick={handleAcceptAllCookies}>Accept All</Button></CardFooter>
                                ) : (
                                    <CardContent className="space-y-4 pt-0">
                                        {siteConfig.cookieCategories.map(category => (
                                            <div key={category.id} className="flex items-start space-x-3 py-2 border-t first:border-t-0">
                                                <Checkbox id={category.id} checked={cookiePreferences[category.id as CookieCategoryKey]} onCheckedChange={() => setCookiePreferences(prev => ({...prev, [category.id]: !prev[category.id as CookieCategoryKey]}))} disabled={category.isRequired} className="mt-1" />
                                                <div className="grid gap-1.5 leading-none"><label htmlFor={category.id} className="text-sm font-medium">{category.name} {category.isRequired && <span className="text-muted-foreground text-xs">(Always Active)</span>}</label><p className="text-sm text-muted-foreground">{category.description}</p></div>
                                            </div>
                                        ))}
                                        <div className="flex justify-end gap-2 pt-4 border-t"><Button variant="outline" onClick={() => setIsCustomizingCookies(false)}>Back</Button><Button onClick={handleSaveCookiePreferences}>Save Preferences</Button></div>
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