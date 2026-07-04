'use client';

export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
// CoreMessage type removed (not exported by installed ai version)
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
    Banknote, Bot, BrainCircuit, Handshake, ShieldCheck, TrendingUp, Landmark, Leaf, LucideIcon, Menu, ArrowRight, ChevronDown, Utensils, WifiOff, Rocket, Send, Signal, Store, Users, X, Zap, ShieldHalf, LayoutGrid, Lightbulb, Wallet, ClipboardList, Package, UserCog, Files, Download, Share, Sparkles, Loader2, CheckCircle, CheckCircle2, Briefcase, Globe, BarChart3, Clock, Scale, Phone, Building, Wrench, HeartHandshake, Car, PawPrint, Megaphone, Palette, FileText, Settings, KeyRound, Cloud, GitBranch, BadgeCheck, Coins, PiggyBank, ReceiptText, Barcode, Warehouse, ShoppingCart, CalendarDays, LineChart, MessageSquareText, HelpCircle, Book, CircleDollarSign, DownloadCloud, Truck, Mail, Globe2, Link2, Target, Layers, Microscope, Cpu, Award, BookOpen, Quote, Heart, Smartphone, User, Home
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import FooterNewsletter from '@/components/FooterNewsletter';
import NewsletterPopup from '@/components/NewsletterPopup';
// --- Constants ---
const COOKIE_CONSENT_NAME = 'bbu1_cookie_consent';
const COOKIE_EXPIRY_DAYS = 365;
const TOAST_DURATION = 4000;
const TEXT_ROTATION_INTERVAL = 4000;
const SLIDESHOW_INTERVAL = 8000;
const PILLAR_INTERVAL = 8000;

// --- Interfaces ---
interface FeatureDetail {
    icon: LucideIcon;
    title: string;
    description: string;
    details: { name: string; detail: string; }[];
    backgroundImage: string;
}

interface IndustryItem { 
    name: string; 
    icon: LucideIcon; 
    description: string; 
    fullDescription: string; 
    keyFeatures: string[]; 
    category: 'Common' | 'Trades & Services' | 'Specialized' | 'Creative & Digital'; 
    backgroundImage: string; 
}

interface FaqItem { q: string; a: ReactNode; }

interface PlatformPillar { 
    icon: LucideIcon; 
    title: string; 
    description: string; 
    fullDescription: string; 
    technicalSpecs: string[]; 
    backgroundImage: string; 
}

type CookieCategoryKey = 'essential' | 'analytics' | 'marketing';
interface CookieCategoryInfo { id: CookieCategoryKey; name: string; description: string; isRequired: boolean; defaultChecked: boolean; }
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

// --- Site Configuration ---
const siteConfig = {
    name: "BBU1",
    shortDescription: "Your all-in-one OS for your business. Unify cloud accounting, cloud Auditing, Advanced reports, invoicing, cloud finance, CRM, advanced inventory, Enterprise intergrations, HR, Aura AI insights. Built for the world.",
    url: "https://www.bbu1.com/",
   contactInfo: {
        email: "info@bbu1.com",
        whatsappLink: `https://wa.me/256703572503?text=${encodeURIComponent("Hello BBU1, I'm interested in a demo for my enterprise.")}`,
        socials: { 
            linkedin: "https://www.linkedin.com/in/mwesigwa-jimmy-8248a1243", 
            twitter: "https://x.com/MwesigwaJimmy5", 
            facebook: "https://facebook.com/bbu1official" // 
        }
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
                { name: "E-commerce Integration", detail: "Seamlessly connect with popular e-commerce platforms to sync products, orders, autoate sales and boost growth, and customer data in real-time." },
                { name: "Order Management", detail: "Process sales orders efficiently, from creation to fulfillment, smart delivery fully automated, with status tracking and automated workflows." },
                { name: "Pricing & Discounts", detail: "Manage complex pricing strategies, promotional discounts, and customer-specific pricing rules." },
                { name: "Sales Analytics", detail: "Gain insights into sales performance, popular products, BI Analytics, and customer buying patterns with powerful dashboards fully automated." },
            ]
        },
        {
            icon: Briefcase, title: "Project Management", description: "Plan, execute, and track projects with collaborative tools.",
            backgroundImage: "/images/showcase/creative-agency-pm.jpg",
            details: [
                { name: "Task & Workflow Management", detail: "Organize projects into tasks, assign responsibilities, set deadlines, and track project progress, monitor expenses and insights." },
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
                { name: "Audit Trails & Logs", detail: "Maintain a complete, tamper-proof audit trail of every action being done in the system for ultimate security and compliance." },
                { name: "Role-Based Access Control", detail: "Granular control over user permissions and access rights, ensuring data security and adherence to internal policies." },
                { name: "Document Management", detail: "Securely store, organize, and manage all business documents with version control and access permissions." },
                { name: "Multi-Currency & Tax Localization", detail: "Handle transactions in multiple currencies and comply with local tax regulations across different regions, set custom tax calculations automatically and the rest of the work is automated." },
                { name: "Data Privacy & GDPR Compliance", detail: "Tools and features to help your business comply with data protection regulations like GDPR and other local privacy laws and this is completly compliant." },
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
    
    // --- PLATFORM PILLARS ---
    platformPillars: [
        { 
            icon: TrendingUp, 
            title: "Built for Growth", 
            description: "We don't pass through your business; We are part of it. BBU1 scales from a single user, business startup, to a global enterprise where growth is Automated .", 
            fullDescription: "BBU1 is engineered on a cloud-native, microservices architecture designed to handle hyper-growth. Whether you are processing 10 transactions a day or 10 million, our infrastructure auto-scales to meet demand without performance degradation. We utilize sharded databases and global CDNs to ensure that as you expand into new regions or open new branches, your system remains lightning-fast.",
            technicalSpecs: [
                "Elastic Scalability: Auto-scaling server clusters handle peak loads instantly.",
                "Multi-Branch Architecture: Add unlimited locations with centralized HQ control.",
                "High Availability: 99.99% uptime guarantee with redundant failover systems.",
                "Performance Benchmarks: Sub-100ms response times even with large datasets."
            ],
            backgroundImage: "/images/showcase/future-of-business-tech.jpg" 
        },
        { 
            icon: BrainCircuit, 
            title: "Aura Does The Work", 
            description: "Our AI, Aura, automates bookkeeping, automates tax returns, automates reports, executive reports, invoices, detects anomalies, and provides strategic insights to reduce manual work and drive smart decisions.", 
            fullDescription: "Aura isn't just a chatbot; Aura is a customly built Ai that fully grows with your business, it's an integrated intelligence layer running across your entire operation. Aura continuously scans your general ledger for errors, predicts cash flow gaps before they happen, and automates mundane tasks like invoice matching and expense categorization. It turns your historical data into a roadmap for future profitability.",
            technicalSpecs: [
                "Automated Bookkeeping: AI categorizes 90% of transactions automatically.",
                "Anomaly Detection: Flags duplicate payments or unusual spending in real-time.",
                "Predictive Forecasting: Projects revenue and inventory needs using machine learning.",
                "Natural Language Queries: Ask 'What were my best selling items last Tuesday?' and get instant answers."
            ],
            backgroundImage: "/images/showcase/ai-warehouse-logistics.jpg" 
        },
        { 
            icon: WifiOff, 
            title: "Unbreakable Offline Mode", 
            description: "Your business is always ahead of time. Core functions work perfectly offline, syncing instantly when you're back online, ensuring continuous operation.", 
            fullDescription: "In many regions, internet connectivity can be unpredictable. BBU1 utilizes a 'Local-First' database architecture. This means your Point of Sale, Inventory scanners, and Field Service apps run primarily on the device's local storage. You can continue to sell, receive stock, and manage operations for days without internet. The second a connection is detected, data synchronizes securely to the cloud in the background.",
            technicalSpecs: [
                "Local-First DB: PouchDB/CouchDB protocol for robust local data storage.",
                "Conflict Resolution: Intelligent merging algorithms handle data changes from multiple offline devices.",
                "Background Sync: Data uploads automatically without interrupting user workflows.",
                "Zero Data Loss: Transactions are encrypted and stored locally until confirmed by the server."
            ],
            backgroundImage: "/images/showcase/education-dashboard.jpg" 
        },
        { 
            icon: Globe, 
            title: "Truly Global & Localized", 
            description: "Full multi-currency support, adaptable tax systems, dynamic tax setings, and localized compliance for any country in Africa and across the world.", 
            fullDescription: "Going global requires more than just translating text. BBU1 handles the complexities of international business natively and localy. We support multi-currency transactions with real-time exchange rate updates, distinct tax rules for different regions (e.g., VAT, GST, Sales Tax), and compliance with local statutory reporting requirements across Africa, Asia, and the Americas worldwide.",
            technicalSpecs: [
                "Multi-Currency Core: Transact, report, and consolidate in over 160 currencies.",
                "Tax Engine: Configurable tax layers for complex regional requirements.",
                "Language Support: Interface available in English, French, Swahili, and Arabic.",
                "Regulatory Compliance: GAAP, IFRS compliant reporting standards, among others automaticaly, And your country, state is fully covered."
            ],
            backgroundImage: "/images/showcase/community-group-meeting.jpg" 
        },
        { 
            icon: ShieldHalf, 
            title: "Bank-Level Security", 
            description: "Your data is protected with end-to-end encryption, multi-factor authentication, and a multi-tenant architecture.", 
            fullDescription: "Security is the bedrock of BBU1. We employ defense-in-depth strategies to protect your proprietary data. Every enterprise tenant is logically isolated using Row-Level Security (RLS), ensuring your data is never accessible to others. We utilize AES-256 encryption for data at rest and TLS 1.3 for data in transit, matching the security standards of leading financial institutions.",
            technicalSpecs: [
                "End-to-End Encryption: Data is encrypted from your device to our servers.",
                "Role-Based Access Control (RBAC): Granular permissions down to the specific field level.",
                "Audit Logs: Immutable records of every action taken by every user.",
                "Compliance: GDPR and POPIA compliant data handling processes."
            ],
            backgroundImage: "/images/showcase/cattle-market-records.jpg" 
        },
        { 
            icon: Settings, 
            title: "Deep Customization & Integration", 
            description: "With bbu1 every business has the privilage to Tailor the system with custom fields, workflows, and robust custom API integrations to match your unique business processes.", 
            fullDescription: "No two businesses are exactly alike. BBU1 provides a low-code environment allowing you to add custom fields to any form, design custom approval workflows, and build unique reports. For developers, our REST and GraphQL APIs provide full programmatic access to the platform, enabling deep integration with your legacy systems or third-party tools.",
            technicalSpecs: [
                "Custom Fields & Forms: Add data points specific to your industry without coding.",
                "Workflow Engine: Automate approvals based on value, department, or custom logic.",
                "API First: Comprehensive documentation for connecting external apps.",
                "Webhooks: Real-time notifications to trigger actions in other systems."
            ],
            backgroundImage: "/images/showcase/creative-agency-pm.jpg" 
        },
    ] as PlatformPillar[],

    // --- INDUSTRY ITEMS ---
    industryItems: [
        // --- Common ---
        { 
            name: "Retail / Wholesale", 
            icon: Store, 
            description: "Unified POS, inventory, and CRM for retail operations.", 
            fullDescription: "Transform your retail business with a unified commerce platform that connects your physical stores, e-commerce, and warehouse in real-time. Say goodbye to stock discrepancies and disconnected customer data.",
            keyFeatures: ["Integrated POS with offline capability", "Real-time inventory synchronization", "Customer loyalty & gift card management", "Matrix inventory for size/color variants"],
            category: 'Common', 
            backgroundImage: "/images/showcase/grocery-store-bbu1.jpg" 
        },
        { 
            name: "Restaurant / Cafe", 
            icon: Utensils, 
            description: "Complete management with KDS, tables, and recipes.", 
            fullDescription: "Run a tighter kitchen and a happier front-of-house. From table reservations to ingredient-level inventory tracking, BBU1 gives you the control to minimize food waste and maximize table turnover.",
            keyFeatures: ["Kitchen Display System (KDS) integration", "Recipe costing & margin analysis", "Table management & split billing", "Ingredient-level stock deduction"],
            category: 'Common', 
            backgroundImage: "/images/showcase/restaurant-kitchen-orders.jpg" 
        },
        { 
            name: "Professional Services", 
            icon: Briefcase, 
            description: "Project tracking and time billing for agencies.", 
            fullDescription: "For consultancies, law firms, and agencies, time is money. BBU1 integrates project management with billing, ensuring every billable hour is captured and invoiced accurately.",
            keyFeatures: ["Automated time tracking & timesheets", "Project profitability analysis", "Retainer management & recurring billing", "Client portal for approvals"],
            category: 'Common', 
            backgroundImage: "/images/showcase/modern-office-team.jpg" 
        },

        // --- Specialized ---
        { 
            name: "Manufacturing", 
            icon: Wrench, 
            description: "BOM, production planning, and work orders.", 
            fullDescription: "Streamline your production line with comprehensive manufacturing resource planning. Manage complex Bills of Materials (BOM), track work-in-progress, and calculate the exact cost of finished goods.",
            keyFeatures: ["Multi-level Bill of Materials (BOM)", "Production scheduling & Work Orders", "Raw material demand forecasting", "Waste & scrap tracking"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/produce-inspection.jpg" 
        },
        { 
            name: "Construction & Engineering", 
            icon: Building, 
            description: "Job costing and project management.", 
            fullDescription: "Build with confidence. BBU1 offers specialized tools for contractors to manage job costing, track equipment on site, and handle progress billing, ensuring projects stay on budget.",
            keyFeatures: ["Project job costing", "AIA style progress billing", "Subcontractor management", "Equipment & tool tracking"],
            category: 'Trades & Services', 
            backgroundImage: "/images/showcase/construction-site.jpg" 
        },
        { 
            name: "Field Service Management", 
            icon: Car, 
            description: "Scheduling and technician tracking.", 
            fullDescription: "Optimize your mobile workforce. Dispatch jobs to technicians, track their location, and allow them to invoice and collect payment on-site via the mobile app.",
            keyFeatures: ["Visual dispatch board", "Mobile app for field technicians", "On-site invoicing & signature capture", "Maintenance contracts"],
            category: 'Trades & Services', 
            backgroundImage: "/images/showcase/logistics-handheld-scanner.jpg" 
        },
        { 
            name: "Distribution & Logistics", 
            icon: Package, 
            description: "Warehouse management and fleet optimization.", 
            fullDescription: "Master your supply chain with advanced warehouse management tools. Optimize pick-and-pack routes, track fleet maintenance, and ensure on-time delivery with integrated logistics features.",
            keyFeatures: ["Bin location & warehouse mapping", "Barcode/QR scanning mobile app", "Fleet maintenance tracking", "Delivery route optimization"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/ai-warehouse-logistics.jpg" 
        },
        { 
            name: "Lending / Microfinance", 
            icon: Banknote, 
            description: "Loan accounts,disbursments,client management, KYC,among others and portfolio management.", 
            fullDescription: "A specialized core banking module designed for Microfinance Institutions and lenders. Manage the entire loan lifecycle from application and credit scoring to disbursement and repayment tracking.",
            keyFeatures: ["Loan origination & credit scoring", "Automated penalty & interest calculation", "Portfolio at Risk (PAR) reporting", "SMS repayment reminders"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/mobile-money-agent.jpg" 
        },
        { 
            name: "Real Estate & Property Management", 
            icon: KeyRound, 
            description: "Property management and tenant billing.", 
            fullDescription: "Centralize your property portfolio. Manage residential or commercial leases, automate rent invoicing, track maintenance requests, and view occupancy reports in one dashboard.",
            keyFeatures: ["Lease contract management", "Automated rent invoicing & collection", "Maintenance ticket tracking", "Landlord & owner statements"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/office-admin-bbU1.jpg" 
        },
        { 
            name: "SACCO / Co-operative", 
            icon: Users, 
            description: "Member management and dividend calculation, smart sacco and co-oparative initiative.", 
            fullDescription: "Empower your cooperative with transparency and efficiency. Manage member shares, savings accounts, and loan products while automating dividend calculations and regulatory reporting.",
            keyFeatures: ["Member registry & KYC", "Share capital management", "Savings & deposit tracking", "Dividend calculation engine"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/community-group-meeting.jpg" 
        },
        { 
            name: "Telecom Services", 
            icon: Signal, 
            description: "Mobile money, airtime, and agent networks.", 
            fullDescription: "The backbone for telecom dealers and aggregators. Manage vast networks of agents, reconcile float in real-time, and handle high-volume airtime and data bundle transactions securely.",
            keyFeatures: ["Agent hierarchy & commission structures", "Real-time float monitoring", "Bulk airtime/data distribution", "Fraud detection algorithms"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/mobile-money-agent.jpg" 
        },
        { 
            name: "Nonprofit & NGOs", 
            icon: HeartHandshake, 
            description: "Donor management and fund accounting, pojectfunds managemnt, grants and donors automation, campaigns.", 
            fullDescription: "Drive impact with transparency. BBU1 helps NGOs manage donor relationships, track restricted funds, and report on program outcomes, ensuring compliance with international grant standards.",
            keyFeatures: ["Grant & fund accounting", "Donor CRM & pledge tracking", "Program budget vs. actuals", "Impact reporting metrics"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/community-group-meeting.jpg" 
        },
        { 
            name: "Healthcare & Clinics", 
            icon: ClipboardList, 
            description: "Patient management and medical inventory.", 
            fullDescription: "Modernize your clinic with an integrated practice management system. Handle patient registration, appointments, electronic medical records, and pharmacy inventory seamlessly.",
            keyFeatures: ["Patient EMR/EHR", "Appointment scheduling & reminders", "Pharmacy inventory & expiry tracking", "Insurance billing integration"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/healthcare-team.jpg" 
        },
        { 
            name: "Education & Institutions", 
            icon: Book, 
            description: "Student systems and fee management.", 
            fullDescription: "Run your educational institution efficiently. Manage student admissions, academic records, and automate fee billing and collection, giving administrators and parents peace of mind.",
            keyFeatures: ["Student Information System (SIS)", "Fee structure management & billing", "Academic grading & reports", "Parent & Teacher portals"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/education-dashboard.jpg" 
        },
        { 
            name: "Agriculture & Agribusiness", 
            icon: Leaf, 
            description: "Farm management and crop tracking.", 
            fullDescription: "Bring digital precision to agribusiness. Track inputs (fertilizer, seeds), manage livestock records, monitor crop cycles, and analyze harvest yields to maximize farm profitability.",
            keyFeatures: ["Crop cycle & harvest tracking", "Livestock genealogy & health records", "Farm input inventory control", "Field mapping & labor tracking"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/agriculture-tech.jpg" 
        },
        { 
            name: "Creative Agencies", 
            icon: Palette, 
            description: "Portfolio tracking and client billing.", 
            fullDescription: "Manage the business side of creativity. Track time against creative briefs, manage freelancer costs, and ensure client billing accurately reflects the value you deliver.",
            keyFeatures: ["Digital asset management", "Retainer & milestone billing", "Freelancer portal", "Project collaboration tools"],
            category: 'Creative & Digital', 
            backgroundImage: "/images/showcase/creative-agency-pm.jpg" 
        },
        { 
            name: "Tech & Software", 
            icon: Cloud, 
            description: "Subscription billing and issue tracking.", 
            fullDescription: "Scale your SaaS or IT business. Manage recurring subscription revenue (MRR), track customer churn, and handle support tickets in one integrated platform.",
            keyFeatures: ["Subscription & recurring billing", "Churn & MRR analytics", "Helpdesk & issue tracking", "SLA management"],
            category: 'Creative & Digital', 
            backgroundImage: "/images/showcase/future-of-business-tech.jpg" 
        },
    ] as IndustryItem[],
    faqItems: [
        { q: 'What is BBU1?', a: 'BBU1 (Business Base Universe) is an all-in-one operating system for businesses, unifying accounting, CRM, inventory, HR, project management, and AI-powered insights into a single, intelligent platform, designed for growth.' },
        { q: 'How does the AI Copilot Aura work?', a: 'Aura, our AI Copilot, securely analyzes your company-wide data in real-time to find patterns, automate routine tasks, and provide simple, actionable insights. For example, it can suggest "Consider bundling Product A and B" or alert you to a "Cash flow projected to be low in 3 weeks," helping you make proactive, data-driven decisions.' },
        { q: 'Is my enterprise data secure with BBU1?', a: 'Absolutely. BBU1 employs a robust multi-tenant architecture with PostgreSQL\'s Row-Level Security, ensuring your data is completely isolated from other clients. We use bank-level, end-to-end encryption for all data in transit and at rest, along with multi-factor authentication and continuous security monitoring to protect your information.' },
        { q: 'Can BBU1 be customized to fit my specific business workflows?', a: 'Yes, BBU1 is designed for extensive customization. While powerful out-of-the-box, we offer comprehensive customization services including custom fields, tailored workflows, and robust API access for enterprise clients. This allows you to integrate BBU1 seamlessly with your existing tools and adapt it precisely to your unique operational processes.' },
        { q: 'What kind of customer support is included with BBU1?', a: 'Enterprise plans include dedicated onboarding specialists, an assigned account manager, and priority technical support available via WhatsApp, phone, and email. We also provide a Service Level Agreement (SLA) guaranteeing uptime and rapid response times, ensuring you always have the support you need.' },
        { q: 'Does BBU1 support multiple currencies and international operations?', a: 'Yes, BBU1 offers comprehensive multi-currency support, allowing you to manage transactions, invoicing, and reporting in various currencies. It also includes adaptable tax systems and localized compliance features to operate effectively across different countries, particularly throughout Africa and globally.' },
        { q: 'What happens if my internet connection is lost?', a: 'BBU1 features an unbreakable offline mode. Key business functions, such as POS transactions, inventory updates, and HR processes, continue to work perfectly even without an internet connection. All data is securely stored locally and automatically syncs with the cloud the moment you\'re back online, ensuring uninterrupted business operations.' },
    ] as FaqItem[],
    termsOfService: (<div className="space-y-4 text-sm"><p>Welcome to BBU1. These Terms of Service ("Terms") govern your access to and use of the BBU1 website, products, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.</p><h3 className="text-base font-semibold mt-6">1. Acceptance of Terms</h3><p>By creating an account, accessing, or using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, and by our Privacy Policy and Cookie Policy. If you do not agree to these Terms, you may not access or use the Services.</p><h3 className="text-base font-semibold mt-6">2. Changes to Terms</h3><p>We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on the BBU1 website and updating the "Last Updated" date. Your continued use of the Services after such modifications will constitute your acknowledgment of the modified Terms and agreement to abide and be bound by them.</p><h3 className="text-base font-semibold mt-6">3. User Accounts</h3><p>To access certain features of the Services, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify BBU1 immediately of any unauthorized use of your account.</p><h3 className="text-base font-semibold mt-6">4. Intellectual Property</h3><p>All content, trademarks, service marks, trade names, logos, and intellectual property rights displayed on the Services are the property of BBU1 or its licensors. You may not use, copy, reproduce, modify, translate, publish, broadcast, transmit, distribute, perform, display, or sell any of BBU1's intellectual property without our prior written consent.</p><h3 className="text-base font-semibold mt-6">5. User Conduct</h3><p>You agree not to use the Services for any unlawful purpose or in any way that might harm, abuse, or interfere with any other user. Prohibited activities include, but are not limited to, unauthorized access, distribution of malware, spamming, and harassment.</p><h3 className="text-base font-semibold mt-6">6. Payments and Billing</h3><p>If you subscribe to any paid Services, you agree to pay all applicable fees and taxes. All payments are non-refundable unless otherwise stated. BBU1 reserves the right to change its pricing at any time, with reasonable notice to existing subscribers.</p><h3 className="text-base font-semibold mt-6">7. Termination</h3><p>We may terminate or suspend your access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Services will immediately cease.</p><h3 className="text-base font-semibold mt-6">8. Disclaimer of Warranties</h3><p>The Services are provided on an "AS IS" and "AS AVAILABLE" basis. BBU1 makes no warranties, expressed or implied, regarding the Services, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p><h3 className="text-base font-semibold mt-6">9. Limitation of Liability</h3><p>In no event shall BBU1, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Services; (ii) any conduct or content of any third party on the Services; (iii) any content obtained from the Services; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.</p><h3 className="text-base font-semibold mt-6">10. Governing Law</h3><p>These Terms shall be governed and construed in accordance with the laws of Uganda, without regard to its conflict of law provisions.</p><h3 className="text-base font-semibold mt-6">11. Contact Information</h3><p>If you have any questions about these Terms, please contact us at support@bbu1.com.</p></div>),
    privacyPolicy: (
    <div className="space-y-4 text-sm">
        <p><strong>Legal Entity:</strong> LITONU BUSINESS BASE UNIVERSE LTD (“the Company,” “we,” “us”)<br />
        <strong>Platform:</strong> BBU1 ERP Ecosystem<br />
        <strong>Effective Date:</strong> April 28, 2026</p>

        <p>This Privacy Policy describes how BBU1 collects, uses, and protects your information across our global multi-tenant ERP ecosystem. We operate in strict accordance with the <strong>Uganda Data Protection and Privacy Act (2019)</strong> and the <strong>General Data Protection Regulation (GDPR)</strong>. By using our Services, you agree to the collection and use of information in accordance with this policy.</p>

        <h3 className="text-base font-semibold mt-6">1. Information We Collect (Global & Sector-Specific)</h3>
        <p>Because BBU1 is a multi-sector ERP, we collect broad and sensitive categories of data required for international business operations:</p>
        <ul>
            <li><strong>Personal Identifiers:</strong> Full names, National Identification Numbers (NIN), Tax Identification Numbers (TIN), NSSF numbers, passport/ID copies, and professional certifications relevant to your jurisdiction.</li>
            <li><strong>Financial & Fiduciary Data:</strong> Bank account details, SACCO/Credit Union membership records, loan history, transaction audit logs, and SME procurement records.</li>
            <li><strong>Specialized Sensitive Data:</strong> This includes Healthcare Electronic Health Records (EHR), clinical diagnoses, and Human Resource data such as performance evaluations and statutory reporting data.</li>
            <li><strong>Usage & Technical Data:</strong> IP addresses, browser diagnostic data, and geolocation data specifically for field service and logistics tracking.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6">2. Legal Basis & Purpose of Processing</h3>
        <p>BBU1 processes data under the following legal foundations:</p>
        <ul>
            <li><strong>Contractual Necessity:</strong> To provide the unified ERP services, multi-currency accounting, and CRM functions.</li>
            <li><strong>Legal Obligation:</strong> To comply with international tax laws, employment acts, and public health reporting requirements.</li>
            <li><strong>Legitimate Interest:</strong> To maintain an <strong>"Immutable Audit Trail"</strong> via our Sovereign Kernel to ensure business transparency and prevent fraud.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6">3. Data Residency & International Transfers</h3>
        <p>To ensure bank-grade security and 24/7 high availability for our global users, LITONU BUSINESS BASE UNIVERSE LTD transfers and stores data outside of the user's home country where necessary:</p>
        <ul>
            <li><strong>Primary Hosting:</strong> Data is securely hosted on Supabase/AWS infrastructure located in <strong>Sweden (EU Region: eu-north-1)</strong>.</li>
            <li><strong>Encryption Standards:</strong> This region is selected for its strict adherence to GDPR, utilizing AES-256 encryption at rest and TLS 1.3 for all data in transit.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6">4. Multi-Tenant Security & Disclosure</h3>
        <p>We implement a <strong>"Zero-Trust" framework</strong>. Every data table is protected by PostgreSQL <strong>Row-Level Security (RLS)</strong>, ensuring a "Tenant Wall" exists so that no business can ever access another's data. We may disclose information to:</p>
        <ul>
            <li><strong>Statutory Bodies:</strong> Such as the Uganda Revenue Authority (URA) or equivalent international tax authorities for automated compliance.</li>
            <li><strong>Service Providers:</strong> Secure infrastructure partners like Supabase Inc and global payment gateways (Stripe, PayPal, Pesapal).</li>
            <li><strong>Authorized Auditors:</strong> To facilitate internal and external auditing requested by the Client (Data Controller).</li>
        </ul>

        <h3 className="text-base font-semibold mt-6">5. Data Retention Policy (15-Year Mandate)</h3>
        <p>In line with global fiduciary, legal, and medical audit requirements, <strong>LITONU retains personal and business data for a period of 15 years</strong>. After this period, data is securely purged or anonymized, unless continued storage is mandated by specific local or international law. This ensures that your business maintains a long-term auditable history for growth and compliance.</p>

        <h3 className="text-base font-semibold mt-6">6. Your Global Data Protection Rights</h3>
        <p>Regardless of your location, BBU1 grants all users rights aligned with the highest international standards (GDPR & Data Protection Act 2019):</p>
        <ul>
            <li><strong>Right to Access & Portability:</strong> You may download your data in machine-readable formats at any time.</li>
            <li><strong>Right to Rectification:</strong> You may correct inaccurate data via your system dashboard.</li>
            <li><strong>Right to Objection/Erasure:</strong> You may request data deletion, subject to the 15-year statutory retention requirements mentioned above.</li>
            <li><strong>Right to Complain:</strong> You have the right to lodge a complaint with the Uganda Data Protection Affairs Office (NITA-U) or your local Data Protection Authority.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6">7. Children's Privacy</h3>
        <p>Our Services process data relating to persons under 18 years ("Children") <strong>only</strong> when provided by a parent or legal guardian for specific professional purposes, such as pediatric medical care, school management modules, or as dependents within HR and Insurance modules.</p>

        <h3 className="text-base font-semibold mt-6">8. Data Protection Officer (DPO) Contact</h3>
        <p>For any privacy concerns or to exercise your data rights, please contact our designated DPO:</p>
        <p className="pl-4 border-l-2 border-blue-600">
            <strong>Name:</strong> MWESIGWA JIMMY<br />
            <strong>Email:</strong> info@bbu1.com / mwesigwajimmy123@gmail.com<br />
            <strong>Address:</strong> NTINDA PLOT 10 VILLAGE X1, KAMPALA, UGANDA.
        </p>

        <h3 className="text-base font-semibold mt-6">9. Changes to This Privacy Policy</h3>
        <p>We may update our Privacy Policy from time to time to reflect changes in global law. We will notify you of any changes by posting the new Privacy Policy on this page. Changes are effective when they are posted.</p>
    </div>
),
    cookieCategories: [
        { id: 'essential', name: 'Essential Cookies', description: 'These cookies are crucial for the website to function properly and enable core functionalities like security, network management, and accessibility. They cannot be switched off.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics Cookies', description: 'These cookies allow us to count visits and traffic sources, understand how visitors interact with our website, and measure the performance of our site. This helps us to improve the way our website works.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing Cookies', description: 'These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites. They do not directly store personal information but are based on uniquely identifying your browser and internet device.', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

// --- Framer Motion Variants ---
const EASE_SPRING = [0.16, 1, 0.3, 1] as const;

const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 55, filter: 'blur(3px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.85, ease: EASE_SPRING, staggerChildren: 0.13 } }
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: EASE_SPRING } }
};
const textVariants: Variants = {
    hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_SPRING } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } }
};
const heroImageVariants: Variants = {
    initial: { scale: 1 }, animate: { scale: [1, 1.05, 1], transition: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" } }
};
const pillarCardContentVariants: Variants = {
    hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_SPRING } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: "easeIn" } }
};
const slideLeft: Variants = {
    hidden: { opacity: 0, x: -55, filter: 'blur(3px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: EASE_SPRING } }
};
const slideRight: Variants = {
    hidden: { opacity: 0, x: 55, filter: 'blur(3px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: EASE_SPRING } }
};
const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.88, filter: 'blur(4px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.6, ease: EASE_SPRING } }
};
const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};
const staggerItem: Variants = {
    hidden: { opacity: 0, y: 38, filter: 'blur(3px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.58, ease: EASE_SPRING } }
};

// --- CORRECTED ListItem Component ---
const ListItem = forwardRef<ElementRef<"div">, ComponentPropsWithoutRef<"div"> & { icon: LucideIcon }>(({ className, title, children, icon: Icon, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex items-start select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-blue-100 hover:text-blue-900 focus:bg-blue-100 focus:text-blue-900 dark:hover:bg-blue-900/30 dark:hover:text-blue-100 dark:focus:bg-blue-900/30 dark:focus:text-blue-100 cursor-pointer",
            className
        )}
        {...props}
    >
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md mr-4 mt-1">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                {children}
            </p>
        </div>
    </div>
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
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }} className="fixed bottom-6 left-6 z-[150] flex items-center gap-3 rounded-lg bg-blue-600 text-white p-4 shadow-2xl">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <p className="font-medium">{message}</p>
            </motion.div>
        )}
    </AnimatePresence>
);

// --- FullScreenDialog Component ---
interface FullScreenDialogProps {
    children: ReactNode;
    title: string;
    description?: string;
    backgroundImage?: string;
    icon?: LucideIcon;
    onClose?: () => void;
}

const FullScreenDialog = ({ children, title, description, backgroundImage, icon: Icon, onClose }: FullScreenDialogProps) => {
    return (
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !z-[200] !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !border-none p-0 flex flex-col animate-in slide-in-from-bottom-full duration-500 ease-out-expo data-[state=closed]:slide-out-to-bottom-full data-[state=closed]:duration-500 data-[state=closed]:ease-in-expo">
            {backgroundImage && (
                <Image
                    src={backgroundImage}
                    alt={`${title} background`}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="absolute inset-0 z-0 opacity-20 dark:opacity-10 filter brightness-[0.6]"
                    priority
                    sizes="100vw"
                />
            )}
            <div className="relative z-10 flex flex-col h-full w-full bg-background/90 dark:bg-background/95 backdrop-blur-lg">
                <DialogHeader className="p-6 md:p-8 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                            {Icon && <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />} {title}
                        </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" onClick={onClose}>
                                <X className="h-6 w-6" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </DialogClose>
                    </div>
                    {description && <DialogDescription className="mt-2 text-lg">{description}</DialogDescription>}
                </DialogHeader>
                <ScrollArea className="flex-grow p-6 md:p-8">
                    {children}
                </ScrollArea>
                <div className="p-6 md:p-8 border-t flex-shrink-0">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full hover:border-blue-600 hover:text-blue-600" onClick={onClose}>Back to Main Page</Button>
                    </DialogClose>
                </div>
            </div>
        </DialogContent>
    );
};

const FEATURE_SLUGS: Record<string, string> = {
    'Human Resources': 'human-resources',
    'CRM': 'crm',
    'Finance & Accounting': 'finance-accounting',
    'Inventory & Supply Chain': 'inventory-supply-chain',
    'Sales & E-commerce': 'sales-ecommerce',
    'Project Management': 'project-management',
    'Compliance & Governance': 'compliance-governance',
    'Telecom Services': 'telecom-services',
    'Business Intelligence & AI': 'business-intelligence-ai',
};

const INDUSTRY_SLUGS: Record<string, string> = {
    'Retail / Wholesale': 'retail-wholesale',
    'Restaurant / Cafe': 'restaurant-cafe',
    'Professional Services': 'professional-services',
    'Manufacturing': 'manufacturing',
    'Construction & Engineering': 'construction-engineering',
    'Field Service Management': 'field-service',
    'Distribution & Logistics': 'distribution-logistics',
    'Lending / Microfinance': 'lending-microfinance',
    'Real Estate & Property Management': 'real-estate',
    'SACCO / Co-operative': 'sacco-cooperative',
    'Telecom Services': 'telecom',
    'Nonprofit & NGOs': 'nonprofit-ngo',
    'Healthcare & Clinics': 'healthcare',
    'Education & Institutions': 'education',
    'Agriculture & Agribusiness': 'agriculture',
    'Creative Agencies': 'creative-agencies',
    'Tech & Software': 'tech-software',
};

const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState<'features' | 'industries' | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); }
    };

    const openHover = (key: 'features' | 'industries', e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setOpenMenu(key);
    };
    const closeHover = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        hoverTimeout.current = setTimeout(() => setOpenMenu(null), 120);
    };

    const navLinkClass = cn(
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
        scrolled
            ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            : "text-slate-200 hover:text-white hover:bg-white/10"
    );

    return (
        <>
        <header className={cn(
            "fixed top-0 z-40 w-full transition-all duration-300",
            scrolled
                ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 shadow-sm"
                : "bg-transparent border-b border-transparent"
        )}>
            <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-2">

                {/* Logo — visible on all screens, animates on mount */}
                <motion.div
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="shrink-0"
                >
                    <Link href="/" className="group flex items-center gap-2 font-bold text-lg">
                        <motion.span
                            animate={{ rotate: [0, -14, 0], scale: [1, 1.15, 1] }}
                            transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
                            className="inline-flex"
                        >
                            <Rocket className={cn("h-5 w-5 transition-colors duration-300", scrolled ? "text-blue-600" : "text-blue-400")} />
                        </motion.span>
                        <span className={cn("font-extrabold tracking-tight transition-colors duration-300", scrolled ? "text-blue-600" : "text-white")}>
                            {siteConfig.name}
                        </span>
                    </Link>
                </motion.div>

                {/* Desktop Nav */}
                <nav ref={navRef} className="hidden lg:flex items-center gap-0.5 relative">

                    {/* Home */}
                    <Link href="/" className={navLinkClass}>
                        <Home className="h-3.5 w-3.5" />
                    </Link>

                    {/* Features dropdown */}
                    <div className="relative">
                        <button
                            onPointerEnter={(e) => openHover('features', e)} onPointerLeave={closeHover}
                            className={cn(navLinkClass, openMenu === 'features' && 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white')}
                        >
                            Features <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", openMenu === 'features' && 'rotate-180')} />
                        </button>
                        {openMenu === 'features' && (
                            <div onPointerEnter={(e) => openHover('features', e)} onPointerLeave={closeHover} className="absolute left-0 top-full mt-2 w-[760px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Platform Capabilities</span>
                                    <Link href="/features" onClick={() => setOpenMenu(null)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1.5">
                                        All Features <ArrowRight size={11} />
                                    </Link>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto">
                                    <ul className="grid grid-cols-2 gap-1 p-4">
                                        {siteConfig.featureSets.map((feature) => (
                                            <li key={feature.title} className="list-none">
                                                <Link href={`/features/${FEATURE_SLUGS[feature.title] || ''}`} onClick={() => setOpenMenu(null)}>
                                                    <ListItem title={feature.title} icon={feature.icon}>{feature.description}</ListItem>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Industries dropdown */}
                    <div className="relative">
                        <button
                            onPointerEnter={(e) => openHover('industries', e)} onPointerLeave={closeHover}
                            className={cn(navLinkClass, openMenu === 'industries' && 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white')}
                        >
                            Industries <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", openMenu === 'industries' && 'rotate-180')} />
                        </button>
                        {openMenu === 'industries' && (
                            <div onPointerEnter={(e) => openHover('industries', e)} onPointerLeave={closeHover} className="absolute left-0 top-full mt-2 w-[820px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Industry Solutions</span>
                                    <Link href="/industries" onClick={() => setOpenMenu(null)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1.5">
                                        All Sectors <ArrowRight size={11} />
                                    </Link>
                                </div>
                                <div className="max-h-[65vh] overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-6 p-5">
                                        {(['Common', 'Trades & Services', 'Specialized', 'Creative & Digital'] as const).map(category => (
                                            <div key={category} className="space-y-0.5">
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-1 px-3">{category}</h3>
                                                {siteConfig.industryItems.filter(i => i.category === category).map((item) => (
                                                    <Link key={item.name} href={`/industries/${INDUSTRY_SLUGS[item.name] || ''}`} onClick={() => setOpenMenu(null)}>
                                                        <ListItem title={item.name} icon={item.icon}>{item.description}</ListItem>
                                                    </Link>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Plain links */}
                    <Link href="/aura-ai" className={cn(navLinkClass, scrolled ? "text-blue-500 dark:text-blue-400" : "text-blue-300", "font-bold")}>
                        <Sparkles className="h-3.5 w-3.5" /> Aura AI
                    </Link>
                    <Link href="/courses" className={cn(navLinkClass, scrolled ? "text-slate-600 dark:text-slate-300" : "text-slate-200", "font-semibold")}>
                        Academy
                    </Link>
                    <Link href="/help-centre" className={navLinkClass}>
                        Help
                    </Link>
                    <Link href="/blog" className={navLinkClass}>
                        Journal
                    </Link>
                </nav>

                {/* Desktop right-side actions */}
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                    {deferredPrompt && (
                        <Button variant="outline" size="sm" onClick={handleInstallClick} className={cn("font-bold", scrolled ? "border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-600" : "bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white")}>
                            <DownloadCloud className="h-4 w-4 mr-1.5" /> Install
                        </Button>
                    )}
                    <Link href="/download" className={cn("p-2 rounded-lg transition-colors", scrolled ? "text-blue-600 hover:bg-blue-50" : "text-blue-300 hover:bg-white/10")} title="Download App">
                        <DownloadCloud className="h-4 w-4" />
                    </Link>
                    <Button variant="outline" size="sm" asChild className={cn("font-semibold transition-colors", scrolled ? "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" : "bg-transparent border-white/25 text-white hover:bg-white/10 hover:text-white")}>
                        <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a Demo</a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className={cn("font-semibold", scrolled ? "text-slate-500 dark:text-slate-400" : "text-slate-200 hover:text-white hover:bg-white/10")}>
                        <Link href="/login">Log In</Link>
                    </Button>
                    <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-600/30">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                    <ModeToggle />
                </div>

                {/* Mobile controls */}
                <div className="lg:hidden flex items-center gap-1.5 shrink-0">
                    <ModeToggle />
                    <button
                        onClick={() => setIsMobileMenuOpen(v => !v)}
                        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </header>

        {/* Mobile full-screen menu — outside <header> so backdrop-filter doesn't trap it */}
        <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        className="fixed inset-x-0 bottom-0 z-[200] overflow-y-auto"
                        style={{ top: '64px', background: 'linear-gradient(135deg, #0f172a 0%, #0d1a3a 50%, #0f172a 100%)' }}
                    >
                        <div className="w-full max-w-lg mx-auto py-5 px-4 space-y-3">
                            <nav className="flex flex-col">
                                <Link href="/" className="flex items-center gap-3 py-3.5 border-b border-white/10 text-base font-bold text-white hover:text-blue-400 transition-colors group" onClick={() => setIsMobileMenuOpen(false)}>
                                    <span className="p-2 rounded-xl bg-white/10 group-hover:bg-blue-600/40 transition-colors"><Home size={17} className="text-blue-400" /></span>
                                    Home
                                </Link>

                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="features" className="border-b border-white/10">
                                        <AccordionTrigger className="text-base font-bold py-3.5 hover:no-underline text-white [&>svg]:text-slate-400">
                                            Features
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4 space-y-1.5">
                                            {siteConfig.featureSets.map((feature) => (
                                                <Link key={feature.title} href="/features"
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 transition-colors"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <span className="p-1.5 bg-blue-600/30 rounded-lg shrink-0"><feature.icon className="h-4 w-4 text-blue-400" /></span>
                                                    <span className="font-semibold text-slate-200 text-sm">{feature.title}</span>
                                                </Link>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="industries" className="border-b border-white/10">
                                        <AccordionTrigger className="text-base font-bold py-3.5 hover:no-underline text-white [&>svg]:text-slate-400">
                                            Industries
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4 grid grid-cols-1 gap-1">
                                            {siteConfig.industryItems.map((item) => (
                                                <Link key={item.name} href="/industries"
                                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.08] transition-colors"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <item.icon size={16} className="text-blue-400 shrink-0" />
                                                    <span className="font-semibold text-slate-300 text-sm">{item.name}</span>
                                                </Link>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                                {[
                                    { href: '/download', label: 'Download Application', icon: DownloadCloud, color: 'text-blue-400' },
                                    { href: '/aura-ai', label: 'Aura Intelligence', icon: Sparkles, color: 'text-blue-400' },
                                    { href: '/courses', label: 'Academy', icon: BookOpen, color: 'text-blue-400' },
                                    { href: '/blog', label: 'Engineering Journal', icon: BookOpen, color: 'text-slate-300' },
                                    { href: '/help-centre', label: 'Help Center', icon: HelpCircle, color: 'text-slate-300' },
                                ].map(({ href, label, icon: Icon, color }) => (
                                    <Link key={href} href={href}
                                        className="flex items-center gap-3 py-3.5 border-b border-white/10 text-base font-bold text-white hover:text-blue-400 transition-colors group"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <span className="p-2 rounded-xl bg-white/10 group-hover:bg-blue-600/40 transition-colors"><Icon size={17} className={color} /></span>
                                        {label}
                                    </Link>
                                ))}
                            </nav>

                            <div className="flex flex-col gap-2.5 pt-3 pb-20">
                                <Button asChild className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/50 border border-blue-500/30 text-sm">
                                    <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Create Free Account</Link>
                                </Button>
                                <Button variant="outline" asChild className="h-12 border-white/20 bg-white/[0.08] text-white font-bold rounded-2xl hover:bg-white/[0.14] hover:text-white text-sm">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Request Private Demo</a>
                                </Button>
                                <Button variant="ghost" asChild className="h-12 font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl text-sm">
                                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// --- LandingFooter Component - DEFINITIVE EXECUTIVE CORPORATE EDITION ---
const LandingFooter = ({ onManageCookies }: { onManageCookies: () => void }) => (
    <footer className="relative bg-gradient-to-b from-blue-400 via-blue-600 via-60% to-blue-950 text-white pt-24 pb-12 border-t-0 z-10 selection:bg-white/30">
        {/* Smooth blend from the section above */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
                
                {/* 1. CORPORATE BRANDING & PRIMARY CONTACTS (4 Columns) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl shadow-lg shadow-blue-900/30">
                            <Rocket className="h-7 w-7 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {siteConfig.name} <span className="text-blue-100 font-light text-base ml-1 uppercase tracking-widest">Global</span>
                        </h3>
                    </div>

                    <p className="text-sm text-blue-100 max-w-sm leading-relaxed font-medium">
                        {siteConfig.shortDescription}
                    </p>

                    <div className="space-y-5 pt-4">
                        {/* CEO / FOUNDER DIRECT LINE */}
                        <a 
                            href="mailto:ceo@bbu1.com" 
                            className="flex items-center gap-4 text-sm text-blue-100 hover:text-white transition-all group"
                        >
                            <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center group-hover:bg-red-50 transition-colors shadow-sm">
                                <User size={20} className="text-blue-600 group-hover:text-red-500 transition-colors" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Founder & CEO</span>
                                <span className="text-white font-semibold">ceo@bbu1.com</span>
                            </div>
                        </a>

                        {/* WHATSAPP OFFICIAL BUSINESS LINE */}
                        <a 
                            href="https://wa.me/256703572503" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 text-sm text-blue-100 hover:text-white transition-all group"
                        >
                            <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-sm">
                                <Smartphone size={20} className="text-emerald-600 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Official WhatsApp</span>
                                <span className="text-white font-semibold">+256 703 572 503</span>
                            </div>
                        </a>
                        
                        {/* SOCIAL ARCHIVE */}
                        <div className="flex items-center gap-4 pt-4">
                            <a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-700 hover:bg-blue-700 hover:text-white transition-all shadow-sm">
                                <Link2 size={18} />
                            </a>
                            <a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-800 hover:bg-black hover:text-white transition-all shadow-sm">
                                <X size={18} />
                            </a>
                            <a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <Globe2 size={18} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* 2. PLATFORM & DOWNLOAD (2 Columns) */}
                <div className="lg:col-span-2">
                    <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] mb-10">Platform</h4>
                    <ul className="space-y-5 text-sm font-medium">
                        <li><Link href="/features" className="text-blue-100 hover:text-white transition-colors">OS Capabilities</Link></li>
                        <li><Link href="/industries" className="text-blue-100 hover:text-white transition-colors">Sector Solutions</Link></li>
                        <li>
                            <Link href="/download" className="text-white font-bold flex items-center gap-2.5 hover:text-blue-100 transition-all group">
                                <DownloadCloud size={16} className="group-hover:scale-110 transition-transform" />
                                Download App
                            </Link>
                        </li>
                        <li>
                            <Link href="/aura-ai" className="text-white font-bold flex items-center gap-2.5 hover:text-blue-100 transition-all">
                                <Sparkles size={16} /> Aura AI Core
                            </Link>
                        </li>
                        <li><Link href="/pricing" className="text-blue-100 hover:text-white transition-colors">Pricing Plans</Link></li>
                        <li><Link href="/blog" className="text-blue-100 hover:text-white transition-colors">Engineering Journal</Link></li>
                    </ul>
                </div>

                {/* 3. ORGANIZATION & EXECUTIVE (3 Columns) */}
                <div className="lg:col-span-3">
                    <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] mb-10">Organization</h4>
                    <ul className="space-y-5 text-sm font-medium">
                        <li>
                            <a href="https://wa.me/256703572503" target="_blank" rel="noopener noreferrer" className="text-blue-100 hover:text-white transition-colors">
                                Book a Strategic Demo
                            </a>
                        </li>
                        <li><Link href="/help-centre" className="text-blue-100 hover:text-white transition-colors">Documentation</Link></li>
                        <li><Link href="/courses" className="text-blue-100 hover:text-white transition-colors">BBU1 Academy</Link></li>
                        <li>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="text-blue-100 hover:text-white text-left transition-colors font-semibold">
                                        Executive Profile
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="!fixed !inset-0 !z-[200] !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !border-none p-0 bg-white overflow-hidden">
                                    <ScrollArea className="h-screen w-full">
                                        <div className="relative flex flex-col">
                                            <div className="sticky top-0 z-[210] flex justify-end p-6 bg-white/95 backdrop-blur-md border-b">
                                                <DialogClose asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                                        <X className="h-6 w-6 text-slate-900" />
                                                    </Button>
                                                </DialogClose>
                                            </div>
                                            <div className="flex-grow">
                                                <AboutCompanyExecutiveSection />
                                            </div>
                                            <div className="max-w-4xl mx-auto w-full px-8 text-center py-24 border-t border-slate-100">
                                                <DialogClose asChild>
                                                    <Button variant="outline" className="px-14 h-12 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl font-bold uppercase tracking-widest shadow-sm">
                                                        Close & Return to Main
                                                    </Button>
                                                </DialogClose>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </DialogContent>
                            </Dialog>
                        </li>
                        <li><Link href="/careers" className="text-blue-100 hover:text-white transition-colors">Careers</Link></li>
                    </ul>
                </div>

                {/* 4. SUPPORT & ADMINISTRATION DIRECTORY (3 Columns) */}
                <div className="lg:col-span-3">
                    <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] mb-10">Support & Admin</h4>
                    <ul className="space-y-5 text-sm font-medium">
                        <li>
                            <a href="mailto:support@bbu1.com" className="text-blue-100 hover:text-white transition-all flex items-center gap-3 group">
                                <div className="p-1.5 bg-white rounded-md shadow-sm group-hover:bg-red-50 transition-colors"><MessageSquareText size={14} className="text-blue-600 group-hover:text-red-500 transition-colors" /></div>
                                Technical Support
                            </a>
                        </li>
                        <li>
                            <a href="mailto:admin@bbu1.com" className="text-blue-100 hover:text-white transition-all flex items-center gap-3 group">
                                <div className="p-1.5 bg-white rounded-md shadow-sm group-hover:bg-emerald-50 transition-colors"><ShieldCheck size={14} className="text-blue-600 group-hover:text-emerald-600 transition-colors" /></div>
                                Account & Admin
                            </a>
                        </li>
                        <li>
                            <Dialog>
                                <DialogTrigger asChild><button className="text-blue-100 hover:text-white text-left transition-colors font-semibold">Terms of Service</button></DialogTrigger>
                                <FullScreenDialog title="Terms of Service" icon={FileText} backgroundImage="/images/showcase/office-admin-bbU1.jpg">
                                    <ScrollArea className="h-[60vh] pr-4">{siteConfig.termsOfService}</ScrollArea>
                                </FullScreenDialog>
                            </Dialog>
                        </li>
                        <li>
                            <Dialog>
                                <DialogTrigger asChild><button className="text-blue-100 hover:text-white text-left transition-colors font-semibold">Privacy Policy</button></DialogTrigger>
                                <FullScreenDialog title="Privacy Policy" icon={ShieldCheck} backgroundImage="/images/showcase/office-presentation-dashboard.jpg">
                                    <ScrollArea className="h-[60vh] pr-4">{siteConfig.privacyPolicy}</ScrollArea>
                                </FullScreenDialog>
                            </Dialog>
                        </li>
                        <li><button onClick={onManageCookies} className="text-blue-100 hover:text-white text-left transition-colors font-semibold">Cookie Preferences</button></li>
                        <li><Link href="/donate" className="flex items-center gap-2.5 text-white font-bold hover:text-blue-100 transition-colors"><Heart size={16} /> Philanthropy</Link></li>
                    </ul>
                </div>
            </div>

            {/* NEWSLETTER SUBSCRIPTION */}
            <FooterNewsletter />

            {/* BOTTOM LEGAL ARCHITECTURE */}
            <div className="border-t border-blue-500/50 pt-12 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="space-y-2 text-center md:text-left">
                    <p className="text-blue-100 font-semibold text-base tracking-tight">
                        BBU1 is a professional product of{' '}
                        <span className="text-white font-extrabold uppercase tracking-wide">Litonu Business Base Universe Ltd.</span>
                    </p>
                    <p className="text-[11px] text-blue-200 font-medium uppercase tracking-[0.1em]">
                        © {new Date().getFullYear()} All rights reserved. • Registered in Uganda: No. 80034302367494
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-2.5 px-5 py-2 bg-blue-700 border border-blue-500 rounded-xl">
                        <ShieldCheck className="h-5 w-5 text-blue-200" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-100">Verified Legal Entity</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
                            Engineered with <Leaf className="h-3.5 w-3.5 text-green-300 inline mx-0.5" /> for the Global Economy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </footer>
);

// --- AdvancedChatWidget Component ---
const AdvancedChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userContext, setUserContext] = useState<{ businessId: string | null; userId: string | null }>({ businessId: null, userId: null });
    const [chatInput, setChatInput] = useState('');
    
    const { messages, setMessages, append, isLoading }: any = useChat({ api: '/api/chat', body: { businessId: userContext.businessId, userId: userContext.userId } } as any);

    useEffect(() => {
        setUserContext({ businessId: getCookie('business_id'), userId: getCookie('user_id') });
    }, []);

    useEffect(() => {
        if (messages.length === 0 && setMessages) {
            setMessages([{ id: 'initial', role: 'assistant', content: 'Hello! I am Aura, your business copilot. How can I assist you today?' }]);
        }
    }, [messages.length, setMessages]);

    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] z-50"
                    >
                        <Card className="h-full w-full flex flex-col shadow-2xl">
                            <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Aura Copilot</CardTitle>
                                    <CardDescription>Your AI Business Analyst</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-0">
                                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                    <div className="space-y-4">
                                        {messages.map((m: any, i: number) => (
                                            <div key={i} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                                                {m.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" /></AvatarFallback></Avatar>}
                                                <div className={cn('rounded-lg p-3 max-w-[85%] break-words prose dark:prose-invert', m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-background border')}>
                                                    {m.content as string}
                                                </div>
                                                {m.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar>}
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex items-start gap-3 text-sm">
                                                <Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" /></AvatarFallback></Avatar>
                                                <div className="rounded-lg p-3 max-w-[85%] bg-background border">
                                                    Aura is thinking... <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" />
                                                </div>
                                            </div>
                                        )}
                                        {(!userContext.businessId || !userContext.userId) && !isLoading && (
                                            <div className="text-center text-red-500 text-sm p-4 border rounded-lg bg-red-50/50">
                                                <p>Your business context is missing. Please log in to use the AI Assistant.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t">
                                    <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder={isDisabled ? "Please log in..." : "Ask Aura anything..."}
                                            disabled={isDisabled}
                                        />
                                        <Button type="submit" size="icon" disabled={isDisabled || !chatInput.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95" aria-label={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>
                {isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}
            </Button>
        </>
    );
};

// --- REAL-TIME PRICING CONFIGURATION (UPDATED FOR EUROPE, CHINA, WORLD) ---

// Real-time currency rates (Approximate to base USD)
const GEO_CURRENCIES: Record<string, { code: string; symbol: string; rate: number }> = {
    'UG': { code: 'UGX', symbol: 'USh', rate: 3750 },  // Uganda
    'KE': { code: 'KES', symbol: 'KSh', rate: 130 },   // Kenya
    'TZ': { code: 'TZS', symbol: 'TSh', rate: 2600 },  // Tanzania
    'RW': { code: 'RWF', symbol: 'RF', rate: 1350 },   // Rwanda
    'NG': { code: 'NGN', symbol: '₦', rate: 1650 },    // Nigeria
    'ZA': { code: 'ZAR', symbol: 'R', rate: 18 },      // South Africa
    'GH': { code: 'GHS', symbol: 'GH₵', rate: 16 },    // Ghana
    'ZM': { code: 'ZMW', symbol: 'ZK', rate: 27 },     // Zambia
    'GB': { code: 'GBP', symbol: '£', rate: 0.79 },    // UK
    'EU': { code: 'EUR', symbol: '€', rate: 0.92 },    // Europe (Base)
    'CN': { code: 'CNY', symbol: '¥', rate: 7.25 },    // China
    'AE': { code: 'AED', symbol: 'Dh', rate: 3.67 },   // UAE/Dubai
    'US': { code: 'USD', symbol: '$', rate: 1 },       // USA
    'DEFAULT': { code: 'USD', symbol: '$', rate: 1 }   // Rest of World
};

// Major Eurozone countries to map to 'EU' currency
const EUROZONE_COUNTRIES = ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];

// Full System Capabilities
const ALL_INCLUDED_MODULES = [
    {
        title: "Finance & Accounting",
        features: ["General Ledger & Journal", "Banking & Reconciliation", "Tax Returns & Fiscal Positions", "Accounts Payable/Receivable", "Asset Management & Depreciation", "Budgeting & Cost Centers", "Multi-Currency Support", "lock dates", "chart of accounts"]
    },
    {
        title: "Human Resources (HRM)",
        features: ["Payroll & Benefits Admin", "Recruitment & Onboarding", "Employee Directory & Org Chart", "Time, Attendance & Shifts", "Performance Reviews", "Leave Management", "Offboarding Workflows"]
    },
    {
        title: "Inventory & Supply Chain",
        features: ["Multi-Warehouse Mgmt", "Manufacturing Orders (BOM)", "composites", "purchase orders", "cycle counts", "asset maintenance", "Serial & Lot Tracking", "Landed Cost Valuation", "Stock Adjustments & Transfers", "Barcode Scanning", "Reorder Points & Replenishment"]
    },
    {
        title: "Sales & CRM",
        features: ["Leads & Opportunity Pipeline", "Marketing Campaigns", "Helpdesk & Support Tickets", "Customer 360 View", "Price Lists & Discount Rules", "Sales Forecasting", "Return Management (RMA)"]
    },
    {
        title: "Specialized Industries",
        features: ["SACCO: Savings, Shares & Dividends", "Lending: Loan Origination & Credit Risk", "Telecom: Agent Float & Sim Inventory", "Real Estate: Leases & Property Units", "Distribution: Fleet, Routes & Cold Chain", "Field Service: Dispatch & Work Orders", "Non-Profit: Grants & Donor Mgmt"]
    }
];

// --- PRICING & TRUST COMPONENTS ---

const TrustedBySection = () => (
    <section className="border-y bg-muted/20 py-12">
        <div className="container mx-auto px-4">
            <p className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground mb-8">
                TRUSTED BY HIGH-GROWTH ENTERPRISES ACROSS AFRICA
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center opacity-70 grayscale transition-all duration-500 hover:grayscale-0 hover:opacity-100">
                <div className="flex items-center gap-2 group cursor-default">
                    <Building className="h-8 w-8 text-blue-600" />
                    <span className="text-xl font-bold">Apex<span className="font-light">Construct</span></span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                    <Leaf className="h-8 w-8 text-green-600" />
                    <span className="text-xl font-bold">Agri<span className="font-light">Flow</span></span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                    <Signal className="h-8 w-8 text-red-600" />
                    <span className="text-xl font-bold">Swift<span className="font-light">Telco</span></span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                    <Landmark className="h-8 w-8 text-indigo-600" />
                    <span className="text-xl font-bold">Unity<span className="font-light">Bank</span></span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                    <Truck className="h-8 w-8 text-orange-600" />
                    <span className="text-xl font-bold">Afro<span className="font-light">Logistics</span></span>
                </div>
            </div>
        </div>
    </section>
);

const DynamicPricingSection = () => {
    const [currency, setCurrency] = useState(GEO_CURRENCIES['DEFAULT']);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    // --- Slideshow Logic for the "No-Addons" section ---
    const [activeModuleIndex, setActiveModuleIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveModuleIndex((prev) => (prev + 1) % ALL_INCLUDED_MODULES.length);
        }, 5000); 
        return () => clearInterval(interval);
    }, []);

    const PLANS = [
        {
            name: "BUSINESS STARTER",
            basePrice: 14,
            userLimit: "1 User",
            idealFor: "Kiosks & Micro-Shops",
            highlight: false,
            btnText: "Start Free Trial",
            features: ["Cloud POS", "Inventory Tracking", "Daily Sales Reports", "Invoicing", "Mobile App Access"]
        },
        {
            name: "GROWTH ",
            basePrice: 42,
            userLimit: "2 Users",
            idealFor: "Small Shops & Solo Founders",
            highlight: false,
            btnText: "Start Free Trial",
            features: ["Full ERP Core", "Mobile App", "Enterprise Reports", "invoicing system", "cloud accounting", "cloud auditing", "complete tax filling system"]
        },
        {
            name: "SCALE SME ",
            basePrice: 69,
            userLimit: "10 Users",
            idealFor: "Growing SMEs & Teams",
            highlight: true,
            btnText: "Start Free Trial",
            features: ["All Industry Modules", "custom branding", "HR & Payroll", "Inventory Tracking", "Mobile App", "Enterprise Reports", "invoicing system", "cloud accounting", "cloud auditing", "complete tax filling system"]
        },
        {
            name: "ENTERPRISE ERP ",
            basePrice: 122,
            userLimit: "Unlimited Users",
            idealFor: "Large Enterprises",
            highlight: false,
            btnText: "Contact Sales",
            features: ["API Access", "Dedicated Support", "On-Premise Option", "Mobile App", "custom branding", "Enterprise Reports", "invoicing system", "cloud accounting", "cloud auditing", "complete tax filling system"]
        }
    ];

    useEffect(() => {
        const detectLocation = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                let data = null;
                const endpoints = ['https://api.country.is', 'https://ipapi.co/json/', 'https://ip-api.com/json'];
                for (const url of endpoints) {
                    try {
                        const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
                        if (response.ok) { data = await response.json(); break; }
                    } catch (e) { continue; }
                }
                clearTimeout(timeoutId);
                if (!data) throw new Error("Nodes unreachable");
                const countryCode = (data.country_code || data.country || data.ip_country || '').toUpperCase();
                let detectedCurrency;
                if (!countryCode || countryCode === 'RESERVED' || countryCode === 'LOCALHOST') {
                    detectedCurrency = GEO_CURRENCIES['DEFAULT'];
                } else if (EUROZONE_COUNTRIES.includes(countryCode)) {
                    detectedCurrency = GEO_CURRENCIES['EU'];
                } else if (GEO_CURRENCIES[countryCode]) {
                    detectedCurrency = GEO_CURRENCIES[countryCode];
                } else {
                    detectedCurrency = GEO_CURRENCIES['DEFAULT'];
                }
                setCurrency(detectedCurrency);
                const languageMap = { 'CN': 'zh-CN', 'FR': 'fr', 'AE': 'ar', 'DE': 'de', 'NL': 'nl', 'BR': 'pt' };
                const targetLang = languageMap[countryCode];
                if (targetLang) {
                    const checkEngine = setInterval(() => {
                        const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                        if (select) { select.value = targetLang; select.dispatchEvent(new Event('change')); clearInterval(checkEngine); }
                    }, 500); 
                    setTimeout(() => clearInterval(checkEngine), 10000);
                }
            } catch (error) { setCurrency(GEO_CURRENCIES['DEFAULT']); } finally { setLoading(false); }
        };
        detectLocation();
    }, []); 

    const formatPrice = (base: number) => {
        let price = base * currency.rate;
        if (billingCycle === 'yearly') price = price * 0.8;
        if (['UGX', 'TZS', 'RWF'].includes(currency.code)) price = Math.floor(price / 1000) * 1000; 
        else if (['NGN', 'KES'].includes(currency.code)) price = Math.floor(price / 100) * 100; 
        else price = Math.floor(price); 
        return new Intl.NumberFormat('en').format(price);
    };

    return (
        <section id="pricing" className="py-24 bg-background relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />
            
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl mb-6">Fair Pricing for Every Business</h2>
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <span className={cn("text-sm font-bold transition-colors", billingCycle === 'monthly' ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className={cn("relative w-14 h-7 rounded-full p-1 transition-colors", billingCycle === 'yearly' ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700")}
                        >
                            <motion.div
                                className={cn("h-5 w-5 rounded-full shadow-sm", billingCycle === 'yearly' ? "bg-white" : "bg-blue-600")}
                                animate={{ x: billingCycle === 'yearly' ? 28 : 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            />
                        </button>
                        <span className={cn("text-sm font-bold transition-colors flex items-center gap-1.5", billingCycle === 'yearly' ? "text-foreground" : "text-muted-foreground")}>
                            Annual <span className="text-[10px] font-bold bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20">SAVE 20%</span>
                        </span>
                    </div>
                    {loading && <p className="text-xs text-muted-foreground animate-pulse">Detecting your local currency...</p>}
                </div>

                {/* --- PRICING GRID --- */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
                    initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }}
                    variants={staggerContainer}
                >
                    {/* Row 1: First 3 Plans */}
                    {PLANS.slice(0, 3).map((plan, index) => (
                        <motion.div key={index} variants={staggerItem} whileHover={{ y: plan.highlight ? 0 : -8, transition: { duration: 0.25 } }}>
                        <Card className={cn("flex flex-col relative transition-all duration-300 hover:shadow-xl h-full", plan.highlight ? "border-blue-600 shadow-2xl md:scale-105 z-10" : "border-border")}>
                            <CardHeader>
                                {plan.highlight && <div className="mb-2"><span className="text-xs font-bold text-blue-600 bg-blue-600/10 px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span></div>}
                                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                <CardDescription className="text-sm font-medium mt-1">{plan.idealFor}</CardDescription>
                                <div className="mt-6">
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-extrabold tracking-tight">{currency.symbol} {formatPrice(plan.basePrice)}</span>
                                        <span className="text-muted-foreground ml-2">/mo</span>
                                    </div>
                                    {billingCycle === 'yearly' && (
                                        <p className="text-xs text-green-600 font-semibold mt-1">Billed annually · 20% off</p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <div className="p-4 bg-muted/50 rounded-lg border text-sm font-bold flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /> {plan.userLimit}</div>
                                <ul className="space-y-3">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm">
                                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                            <span className="font-semibold">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter><Button className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700 text-white" asChild><Link href="/signup">{plan.btnText}</Link></Button></CardFooter>
                        </Card>
                        </motion.div>
                    ))}

                    {/* Row 2: Enterprise Card (Left) */}
                    <motion.div variants={staggerItem} whileHover={{ y: -8, transition: { duration: 0.25 } }}>
                    <Card className="flex flex-col relative transition-all duration-300 hover:shadow-xl border-border h-full">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">{PLANS[3].name}</CardTitle>
                            <CardDescription className="text-sm font-medium mt-1">{PLANS[3].idealFor}</CardDescription>
                            <div className="mt-6">
                                <div className="flex items-baseline">
                                    <span className="text-4xl font-extrabold tracking-tight">{currency.symbol} {formatPrice(PLANS[3].basePrice)}</span>
                                    <span className="text-muted-foreground ml-2">/mo</span>
                                </div>
                                {billingCycle === 'yearly' && (
                                    <p className="text-xs text-green-600 font-semibold mt-1">Billed annually · 20% off</p>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-6">
                            <div className="p-4 bg-muted/50 rounded-lg border text-sm font-bold flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /> {PLANS[3].userLimit}</div>
                            <ul className="space-y-3">
                                {PLANS[3].features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm">
                                        <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
                                        <span className="font-semibold">{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter><Button className="w-full h-11 font-semibold border-blue-600 text-blue-600 hover:bg-blue-50" variant="outline" asChild><Link href="/signup">{PLANS[3].btnText}</Link></Button></CardFooter>
                    </Card>
                    </motion.div>

                    {/* Row 2: Slideshow Box (Right - Fills two columns) */}
                    <div className="md:col-span-2 relative rounded-xl bg-slate-950 overflow-hidden border border-slate-800 shadow-2xl flex flex-col min-h-[450px]">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles className="h-32 w-32 text-blue-500" /></div>
                        
                        <div className="p-8 z-20">
                            <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
                                <Sparkles className="h-4 w-4" /> The "No-Addons" Promise
                            </div>
                            <h3 className="text-2xl font-bold text-white tracking-tight">Complete Ecosystem Unlocked</h3>
                            <p className="text-slate-400 text-sm mt-1">Every enterprise engine is included in your subscription.</p>
                        </div>

                        <div className="flex-grow p-6 relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeModuleIndex}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    className="h-full"
                                >
                                    {/* --- THE WHITE MODULE CARD --- */}
                                    <div className="bg-white rounded-2xl p-6 h-full shadow-inner flex flex-col justify-center">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                                                {(() => {
                                                    const title = ALL_INCLUDED_MODULES[activeModuleIndex].title;
                                                    if (title.includes("Finance")) return <Landmark size={28} />;
                                                    if (title.includes("Human")) return <Users size={28} />;
                                                    if (title.includes("Inventory")) return <Warehouse size={28} />;
                                                    if (title.includes("Sales")) return <Handshake size={28} />;
                                                    return <Briefcase size={28} />;
                                                })()}
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                                {ALL_INCLUDED_MODULES[activeModuleIndex].title}
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {ALL_INCLUDED_MODULES[activeModuleIndex].features.map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                                    <span className="text-[14px] font-bold text-slate-700 truncate">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Progress Indicators */}
                        <div className="px-8 py-6 flex items-center justify-between border-t border-slate-900">
                            <div className="flex gap-2">
                                {ALL_INCLUDED_MODULES.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={cn("h-1.5 rounded-full transition-all duration-500", activeModuleIndex === i ? "bg-blue-500 w-10" : "bg-slate-800 w-2")}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Module {activeModuleIndex + 1} of {ALL_INCLUDED_MODULES.length}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* The Trust Banner is now removed to let the Partner Section sit closer */}
                <div className="mt-12 text-center text-xs text-muted-foreground">
                    PLEASE NOTE: Prices exclude local VAT/GST where applicable. 
                    Need On-Premise hosting or White-Label solutions? <a href={siteConfig.contactInfo.whatsappLink} className="text-blue-600 hover:underline font-medium">Contact Enterprise Sales</a>.
                </div>
            </div>
        </section>
    );
};

// --- PARTNER WITH US SECTION (Fixed: Direct Action Buttons) ---
const PartnerWithUsSection = () => {
    const [activeTab, setActiveTab] = useState<'affiliate' | 'investor' | 'solution'>('affiliate');
    
    // Form States
    const [formData, setFormData] = useState({ name: '', org: '', email: '', phone: '', details: '' });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handler for Email Partners (Investor & Solution)
    const handleEmailTrigger = (type: string) => {
        // 1. Validate - simple check to ensure they typed something
        if (!formData.name || !formData.email) {
            alert("Please fill in your Name and Email.");
            return;
        }

        // 2. Prepare Data
        const subject = `BBU1 ${type} Partnership Inquiry: ${formData.name}`;
        
        const body = 
            `Dear BBU1 Team,\n\n` +
            `I am submitting a partnership inquiry with the following details:\n\n` +
            `--- CONTACT DETAILS ---\n` +
            `Name: ${formData.name}\n` +
            `Organization: ${formData.org}\n` +
            `Email: ${formData.email}\n` +
            `Phone: ${formData.phone}\n\n` +
            `--- PROPOSAL / MESSAGE ---\n` +
            `${formData.details}\n\n` +
            `Looking forward to your response.`;
        
        // 3. Force Open Email Client
        // We use window.open for better compatibility in Modals, 
        // targeting '_self' acts just like a standard link click.
        window.open(`mailto:contact@bbu1.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    };

    // Handler for WhatsApp Affiliate
    const handleWhatsAppSubmit = () => {
        const text = `Hello BBU1 Team, I am interested in becoming an Affiliate Partner. I would like to discuss commission structures and promoting the OS.`;
        window.open(`https://wa.me/256703572503?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <AnimatedSection id="partner" className="bg-slate-50 dark:bg-slate-900/50 border-y relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-10 right-10 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-2 block">Ecosystem Growth</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">Partner with BBU1</h2>
                    <p className="text-lg text-muted-foreground">
                        We are building the operating system for the future of your smart business commerce. 
                        Whether you want to earn, invest, or build—there is a place for you in our ecosystem.
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
                    initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
                    variants={staggerContainer}
                >
                    {/* 1. Affiliate Card */}
                    <motion.div variants={staggerItem} whileHover={{ y: -8, transition: { duration: 0.25 } }}>
                    <Card className="hover:border-blue-600/50 transition-all hover:shadow-xl group relative overflow-hidden border-t-4 border-t-blue-600 bg-card h-full">
                        <CardHeader>
                            <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <Megaphone className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-2xl">Affiliate Partner</CardTitle>
                            <CardDescription>For Marketers & Influencers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Monetize your network. Refer businesses to BBU1 and earn recurring commissions for the lifetime of the customer.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> <span>Up to 20% Recurring Commission</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> <span>Marketing Assets Provided</span></li>
                            </ul>
                            
                            {/* Dialog Trigger */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="w-full mt-4 hover:border-blue-600 hover:text-blue-600" variant="outline" onClick={() => setActiveTab('affiliate')}>
                                        Start Earning <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                                    <div className="bg-blue-600 p-6 text-white text-center">
                                        <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-90" />
                                        <DialogTitle className="text-2xl font-bold text-white">Affiliate Program</DialogTitle>
                                        <DialogDescription className="text-blue-100">Join the fastest growing B2B affiliate network.</DialogDescription>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                                            <h4 className="font-semibold flex items-center gap-2"><Banknote className="h-4 w-4 text-green-600"/> How it works:</h4>
                                            <p className="text-sm text-muted-foreground">1. You get a unique referral code.</p>
                                            <p className="text-sm text-muted-foreground">2. A business signs up using your code.</p>
                                            <p className="text-sm text-muted-foreground">3. You receive a commission payout every month they remain a subscriber.</p>
                                        </div>
                                        <div className="text-center space-y-4">
                                            <p className="text-sm text-muted-foreground">Click below to chat with our Affiliate Manager on WhatsApp to get your code immediately.</p>
                                            <Button size="lg" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold" onClick={handleWhatsAppSubmit}>
                                                <MessageSquareText className="mr-2 h-5 w-5" /> Chat on WhatsApp (+256 703 572 503)
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    </motion.div>

                    {/* 2. Investor Card */}
                    <motion.div variants={staggerItem} whileHover={{ y: -8, transition: { duration: 0.25 } }}>
                    <Card className="hover:border-blue-600/50 transition-all hover:shadow-xl group relative overflow-hidden border-t-4 border-t-green-500 bg-card h-full">
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                            OPEN ROUND
                        </div>
                        <CardHeader>
                            <div className="h-14 w-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-2xl">Strategic Investor</CardTitle>
                            <CardDescription>For VCs & Angel Investors</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Own a piece of the infrastructure powering global commerce. Access our data room and view our growth metrics.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> <span>High-Growth SaaS Metrics</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> <span>Scalable Tech Stack</span></li>
                            </ul>

                            {/* Dialog Trigger */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="w-full mt-4 hover:border-blue-600 hover:text-blue-600" variant="outline" onClick={() => { setActiveTab('investor'); setFormData({ name: '', org: '', email: '', phone: '', details: '' }); }}>
                                        Investor Relations <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                                    <div className="bg-green-600 p-6 text-white text-center">
                                        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-90" />
                                        <DialogTitle className="text-2xl font-bold text-white">Investor Inquiry</DialogTitle>
                                        <DialogDescription className="text-green-100">Connect with our founders directly.</DialogDescription>
                                    </div>
                                    {/* CHANGED: Removed form tag to prevent submit blocking, using simple div container */}
                                    <div className="p-6 space-y-4 bg-background">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Full Name</label>
                                                <Input name="name" value={formData.name} placeholder="John Doe" onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Firm / Entity</label>
                                                <Input name="org" value={formData.org} placeholder="Capital Partners Ltd" onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Email Address</label>
                                                <Input type="email" value={formData.email} name="email" placeholder="john@example.com" onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Phone / WhatsApp</label>
                                                <Input name="phone" value={formData.phone} placeholder="+256..." onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Investment Interest / Details</label>
                                            <textarea 
                                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                                name="details"
                                                value={formData.details}
                                                placeholder="We are interested in Series A opportunities..." 
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        {/* CHANGED: Button type="button" and onClick={handleEmailTrigger} */}
                                        <Button 
                                            type="button" 
                                            onClick={() => handleEmailTrigger('Investor')} 
                                            className="w-full h-11 text-lg bg-green-600 hover:bg-green-700 font-semibold shadow-md active:scale-[0.98] transition-all"
                                        >
                                            Send Inquiry via Email
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    </motion.div>

                    {/* 3. Solution Partner Card */}
                    <motion.div variants={staggerItem} whileHover={{ y: -8, transition: { duration: 0.25 } }}>
                    <Card className="hover:border-blue-600/50 transition-all hover:shadow-xl group relative overflow-hidden border-t-4 border-t-purple-500 bg-card h-full">
                        <CardHeader>
                            <div className="h-14 w-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <GitBranch className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-2xl">Solution Partner</CardTitle>
                            <CardDescription>For Developers & Agencies</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Build on top of BBU1. Implement our OS for your clients, build custom integrations, or white-label our technology.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> <span>Developer API Access</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/> <span>Implementation Revenue Share</span></li>
                            </ul>

                            {/* Dialog Trigger */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="w-full mt-4 hover:border-blue-600 hover:text-blue-600" variant="outline" onClick={() => { setActiveTab('solution'); setFormData({ name: '', org: '', email: '', phone: '', details: '' }); }}>
                                        Build With Us <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                                    <div className="bg-purple-600 p-6 text-white text-center">
                                        <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-90" />
                                        <DialogTitle className="text-2xl font-bold text-white">Solution Partnership</DialogTitle>
                                        <DialogDescription className="text-purple-100">Integrate, Resell, or Build.</DialogDescription>
                                    </div>
                                    {/* CHANGED: Removed form tag to prevent submit blocking, using simple div container */}
                                    <div className="p-6 space-y-4 bg-background">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Contact Name</label>
                                                <Input name="name" value={formData.name} placeholder="Jane Smith" onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Agency / Company</label>
                                                <Input name="org" value={formData.org} placeholder="Tech Solutions Ltd" onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Email Address</label>
                                                <Input type="email" value={formData.email} name="email" placeholder="jane@techsolutions.com" onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Phone</label>
                                                <Input name="phone" value={formData.phone} placeholder="+256..." onChange={handleInputChange} className="bg-background border-input" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Technical Capabilities / Proposal</label>
                                            <textarea 
                                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                                name="details" 
                                                value={formData.details}
                                                placeholder="We want to integrate BBU1 for our retail clients..." 
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        {/* CHANGED: Button type="button" and onClick={handleEmailTrigger} */}
                                        <Button 
                                            type="button" 
                                            onClick={() => handleEmailTrigger('Solution Partner')} 
                                            className="w-full h-11 text-lg bg-purple-600 hover:bg-purple-700 font-semibold shadow-md active:scale-[0.98] transition-all"
                                        >
                                            Submit Proposal via Email
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                    </motion.div>

                </motion.div>
            </div>
        </AnimatedSection>
    );
};

const AboutCompanyExecutiveSection = () => {
    // High-End Animation Variants
    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-100px" },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    return (
        <section className="relative w-full bg-white font-sans text-slate-600 overflow-hidden">
            
            {/* --- 1. CORPORATE IDENTITY --- */}
            <div className="relative min-h-[80vh] flex items-center bg-slate-50 border-b border-slate-200 py-24">
                <div className="container mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center">
                    
                    {/* Left: Text Content */}
                    <div className="lg:col-span-7 space-y-8">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-lg"
                        >
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700 text-[10px] font-bold uppercase tracking-wider">Company Profile</span>
                        </motion.div>

                        <motion.h1 
                            {...fadeInUp}
                            className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight"
                        >
                            Defining the <br /> <span className="text-blue-600">Standard for Business.</span>
                        </motion.h1>

                        <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="max-w-xl space-y-6">
                            <p className="text-xl md:text-2xl font-medium text-slate-500 leading-relaxed border-l-4 border-blue-600 pl-6">
                                BBU1 is the architect of the Business Operating System (BOS)—a unified digital environment where commerce is empowered by a central operating core.
                            </p>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                we bridge the gap between advanced technology and global business utility. Our purpose is to provide a secure foundation for the next generation of digital commerce.
                            </p>
                        </motion.div>
                    </div>

                    {/* Right: Picture Box */}
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="lg:col-span-5 relative aspect-[4/5] rounded-2xl overflow-hidden border border-slate-200 shadow-2xl"
                    >
                        <Image 
                            src="/images/showcase/Greeting (22).jpeg" 
                            alt="Corporate Innovation"
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                    </motion.div>
                </div>
            </div>

            {/* --- SECTION 2: MISSION & VISION --- */}
            <div className="py-32 bg-white border-b border-slate-100">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-24">
                    
                    {/* Mission */}
                    <motion.div {...fadeInUp} className="space-y-6">
                        <div className="flex items-center gap-3 text-blue-600 uppercase tracking-widest text-xs font-bold">
                            <Target className="h-5 w-5" />
                            <span>Our Mission</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Engineering Operational Certainty</h2>
                        <p className="text-slate-500 text-lg leading-relaxed font-medium">
                            To engineer a unified business infrastructure that eliminates friction and enables enterprises to scale with absolute data integrity.
                        </p>
                        <p className="text-slate-500 leading-relaxed">
                            We help businesses remove the hidden costs of disconnected tools, allowing leadership to focus on strategic growth rather than managing technical silos.
                        </p>
                    </motion.div>

                    {/* Vision */}
                    <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 uppercase tracking-widest text-xs font-bold">
                            <Globe2 className="h-5 w-5" />
                            <span>Our Vision</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">The Global Business Language</h2>
                        <p className="text-slate-500 text-lg leading-relaxed font-medium">
                            To become the standard operating system for modern business globally.
                        </p>
                        <p className="text-slate-500 leading-relaxed">
                            We envision an interconnected world of commerce where even the smallest local enterprise operates with the same digital power as a global conglomerate.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* --- SECTION 3: CORE VALUES --- */}
            <div className="container mx-auto px-6 py-32 bg-slate-50/30">
                <div className="mb-16 text-center max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-3 text-emerald-600 mb-4">
                        <ShieldCheck className="h-6 w-6" />
                        <span className="text-xs font-bold uppercase tracking-widest">Company Ethics</span>
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 tracking-tight">The Principles of BBU1</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: "Technical Integrity", desc: "We build software like structural engineering. Every line of code must be mathematically sound." },
                        { title: "Data Sovereignty", desc: "Absolute privacy. We believe your business intelligence belongs to you and you alone." },
                        { title: "Strategic Purpose", desc: "We reject novelty. Every feature we build is designed to solve a specific business problem." },
                        { title: "Global Accessibility", desc: "High-end enterprise power should be accessible to every ambitious entrepreneur on earth." }
                    ].map((v, i) => (
                        <div key={i} className="group p-8 bg-white border border-slate-200 rounded-xl hover:border-blue-600 hover:shadow-xl transition-all duration-300">
                            <h4 className="text-slate-900 text-lg font-bold mb-4 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{v.title}</h4>
                            <div className="h-1 w-8 bg-blue-600/20 mb-4 group-hover:w-full transition-all duration-500" />
                            <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- SECTION 4: FOUNDER'S MESSAGE --- */}
            <div className="py-32 container mx-auto px-6">
                <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
                    
                    {/* Left: Founder's Image */}
                    <div className="lg:w-1/3 relative h-[400px] lg:h-auto bg-slate-800">
                        <Image 
                            src="/images/showcase/Photo Background Edi (4).jpeg" 
                            alt="Founder Mwesigwa Jimmy"
                            fill
                            className="object-cover object-top grayscale hover:grayscale-0 transition-all duration-1000"
                        />
                    </div>

                    {/* Right: Message */}
                    <div className="lg:w-2/3 p-8 lg:p-16 space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-bold text-white tracking-tight">A Message from the Architect</h3>
                            <p className="text-blue-400 font-bold text-sm uppercase tracking-widest">Mwesigwa Jimmy • Founder & Lead Architect</p>
                        </div>

                        <div className="space-y-6 text-slate-300 text-lg leading-relaxed font-light">
                            <p>
                                "My journey began with a focus on foundations. Supported by the pillars of my family and my community in Uganda, I realized that growth is only possible when your base is unbreakable."
                            </p>
                            <p>
                                "With a background in Computer Science, I initiated BBU1 to pay that support forward. My mission is to ensure that businesses everywhere—from local markets to high-rise offices—can operate with identical digital power."
                            </p>
                        </div>

                        <div className="pt-8 border-t border-white/10">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-10 rounded-xl shadow-lg transition-transform hover:scale-105" asChild>
                                <a href="mailto:ceo@bbu1.com">
                                    Strategic Inquiry <ArrowRight className="ml-3 h-5 w-5" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER VERIFICATION */}
            <div className="py-12 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                    <ShieldCheck size={14} className="text-emerald-500" /> Operational Integrity Verified • System v10.2
                </p>
            </div>
        </section>
    );
};
// --- HomePage Component ---
export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
    const supabase = createClient();
    const [isSSR, setIsSSR] = useState(true);
    useEffect(() => {
        setIsSSR(false);
    }, []);
    
    // 1. STATE DECLARATIONS
    const [mounted, setMounted] = useState(false);
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [activePillarIndex, setActivePillarIndex] = useState(0);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);
    const [toastState, setToastState] = useState<ToastState>({ visible: false, message: '' });

   // 2. DATA ARRAYS
    const rotatingTexts = [
        "fully automated.",
        "always in control.",
        "built to scale.",
        "running on one OS.",
        "ahead of the game.",
    ];
    const slideshowContent = [
        { 
            is_video: true, 
            src: "/videos/BBU1 inventory management.mp4", 
            title: "Advanced Inventory Architecture", 
            description: "Experience the power of real-time SKU tracking and automated stock auditing across your enterprise.", 
            alt: "BBU1 Inventory Demo" 
        },
        { src: "/images/showcase/construction-site.jpg", title: "Construction & Project Management", description: "Oversee complex projects on-site with real-time data.", alt: "Construction managers" },
        { src: "/images/showcase/mobile-money-agent.jpg", title: "Telecom & Mobile Money", description: "Empower agents with a fast, secure system for transactions.", alt: "Mobile money agent" },
        { src: "/images/showcase/local-shop-owner.jpg", title: "Local & Retail Commerce", description: "A complete enterprise powerful POS and inventory system to manage sales and stock.", alt: "Shop owner" },
        { src: "/images/showcase/healthcare-team.jpg", title: "Healthcare & Clinic Management", description: "Digitize patient records, manage appointments, and track medical supplies.", alt: "Medical professionals" },
        { src: "/images/showcase/farmers-learning.jpg", title: "Agriculture & Agribusiness", description: "Bring modern management to the field to track crops.", alt: "Farmers" },
    ];
    const initialCookiePreferences: CookiePreferences = siteConfig.cookieCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.defaultChecked }), {} as CookiePreferences);
    const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(initialCookiePreferences);

    // 3. ACTION HANDLERS
    const showToast = useCallback((message: string) => {
        setToastState({ visible: true, message });
        setTimeout(() => setToastState({ visible: false, message: '' }), TOAST_DURATION);
    }, []);

    const handleLeadCapture = async (email: string) => {
        if (!email || !email.includes('@')) {
            toast.error("Please enter a valid business email.");
            return;
        }
        try {
            const { error: dbError } = await supabase.from('system_marketing_leads').insert({
                email: email.toLowerCase().trim(),
                ip_address: navigator.userAgent,
                metadata: { path: window.location.pathname, captured_at: new Date().toISOString(), source: 'Landing Page Lead Magnet' }
            });
            if (dbError && dbError.code !== '23505') throw dbError;
            const { error: fnError } = await supabase.functions.invoke('sovereign-broadcaster', {
                body: { action: 'send_bulk_comms', payload: { recipients: [{ email }], channel: 'EMAIL', subject: 'Welcome to the BBU1 Ecosystem', content: `<h1>Welcome to the Future of Business</h1><p>Our Architects have been notified of your visit.</p>` } }
            });
            if (fnError) console.warn("Comms delay:", fnError);
            showToast("Welcome packet dispatched to your email!");
        } catch (err) {
            console.error("Lead Capture Logic Gap:", err);
            showToast("Connection established, but packet delayed.");
        }
    };

    // 4. COOKIE LOGIC (Unchanged)
    const applyCookiePreferences = useCallback((prefs: CookiePreferences) => {
        console.log("Applying cookie preferences:", prefs);
    }, []);

    const handleAcceptAllCookies = useCallback(() => {
        const allTruePrefs: CookiePreferences = { essential: true, analytics: true, marketing: true };
        setCookiePreferences(allTruePrefs);
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(allTruePrefs), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        applyCookiePreferences(allTruePrefs);
        showToast("All cookies have been accepted.");
    }, [applyCookiePreferences, showToast]);

    const handleSaveCookiePreferences = useCallback(() => {
        setCookie(COOKIE_CONSENT_NAME, JSON.stringify(cookiePreferences), COOKIE_EXPIRY_DAYS);
        setShowCookieBanner(false);
        setIsCustomizingCookies(false);
        applyCookiePreferences(cookiePreferences);
        showToast("Your privacy preferences have been saved.");
    }, [cookiePreferences, applyCookiePreferences, showToast]);

    const openCookiePreferences = useCallback(() => {
        const consentCookie = getCookie(COOKIE_CONSENT_NAME);
        try {
            const storedPrefs = consentCookie ? JSON.parse(consentCookie) : initialCookiePreferences;
            setCookiePreferences(storedPrefs);
        } catch (error) {
            setCookiePreferences(initialCookiePreferences);
        }
        setShowCookieBanner(true);
        setIsCustomizingCookies(true);
    }, [initialCookiePreferences]);

    // 5. PERFORMANCE OPTIMIZATION
    const memoizedRotatingTexts = React.useMemo(() => rotatingTexts, []);
    const memoizedSlideshowContent = React.useMemo(() => slideshowContent, []);
    const memoizedPlatformPillars = React.useMemo(() => siteConfig.platformPillars, []);

    // 6. MASTER LIFECYCLE EFFECT (Telemetry + Animations)
    useEffect(() => {
        if (isSSR) return; // Prevent Server-side crash
        setMounted(true);

        const trackVisitor = async () => {
            if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') return;
            try {
                await supabase.from('system_global_telemetry').insert({
                    event_category: 'VISIT',
                    event_name: 'Landing Page Access',
                    metadata: {
                        path: window.location.pathname,
                        referrer: document.referrer || 'direct',
                        userAgent: navigator.userAgent,
                        screenResolution: `${window.screen.width}x${window.screen.height}`,
                        language: navigator.language,
                        session_id: getCookie('bbu1_session_id') || 'new_visitor'
                    }
                });
            } catch (err) { console.error("Telemetry failure", err); }
        };

        trackVisitor();

        const textInt = setInterval(() => setCurrentTextIndex(p => (p + 1) % memoizedRotatingTexts.length), TEXT_ROTATION_INTERVAL);
        const imageInt = setInterval(() => setCurrentSlideIndex(p => (p + 1) % memoizedSlideshowContent.length), SLIDESHOW_INTERVAL);
        const pillarInt = setInterval(() => setActivePillarIndex(p => (p + 1) % memoizedPlatformPillars.length), PILLAR_INTERVAL);
        
        return () => { clearInterval(textInt); clearInterval(imageInt); clearInterval(pillarInt); };
    }, [supabase, isSSR, memoizedRotatingTexts.length, memoizedSlideshowContent.length, memoizedPlatformPillars.length]);

    // 7. COOKIE INITIALIZATION
    useEffect(() => {
        const consentCookie = getCookie(COOKIE_CONSENT_NAME);
        if (!consentCookie) {
            setShowCookieBanner(true);
        } else {
            try {
                applyCookiePreferences(JSON.parse(consentCookie));
            } catch (error) {
                setShowCookieBanner(true);
            }
        }
    }, [applyCookiePreferences]);

    return (
        <div className="flex flex-col min-h-screen">
            <NewsletterPopup />
            <MegaMenuHeader />
            <main className="flex-grow">

               {/* HERO SECTION — Paradigm-inspired dark tech design */}
<section id="hero" className="relative overflow-hidden text-center flex items-center justify-center" style={{ minHeight: '100svh' }}>

    {/* ── Background layers ── */}
    <div className="absolute inset-0 bg-[#020617]" />

    {/* Ambient blue glows */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(37,99,235,0.35)_0%,transparent_70%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(29,78,216,0.18)_0%,transparent_60%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_70%,rgba(37,99,235,0.12)_0%,transparent_60%)]" />

    {/* Fine grid */}
    <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%234f8ef7' fill-opacity='1'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px' }}
    />

    {/* Bottom fade to next section */}
    <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#020617] to-transparent" />

    {/* Top edge line */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

    {/* Large background "BBU1" watermark */}
    <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
        <span className="text-[28vw] sm:text-[22vw] font-black text-white/[0.025] tracking-tighter leading-none">BBU1</span>
    </div>

    {/* Central spotlight card — the Paradigm signature element */}
    <div className="absolute inset-x-4 sm:inset-x-12 lg:inset-x-24 top-16 bottom-0 rounded-t-3xl border border-white/[0.06] bg-white/[0.015] pointer-events-none" />

    {/* ── Content ── */}
    <div className="relative z-10 text-white px-5 sm:px-8 max-w-5xl mx-auto w-full pt-28 pb-24 sm:pt-36 sm:pb-32">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>

            {/* Chip */}
            <motion.div variants={itemVariants} className="flex justify-center mb-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm font-bold text-blue-300 tracking-wide">
                    <Sparkles className="h-3.5 w-3.5" /> The Intelligent Business Operating System
                </span>
            </motion.div>

            {/* Main headline — 2 lines, very large */}
            <motion.h1 variants={itemVariants}
                className="text-[2.6rem] leading-[1.1] sm:text-6xl lg:text-8xl font-black tracking-tight text-white mb-4 sm:mb-6">
                Your business,
            </motion.h1>

            {/* Rotating second line */}
            <div className="relative h-[5rem] sm:h-[5.5rem] lg:h-[7rem] mb-8 sm:mb-10 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={currentTextIndex}
                        initial={{ opacity: 0, y: 40, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -40, filter: 'blur(4px)' }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex items-center justify-center text-[1.9rem] leading-tight sm:text-6xl lg:text-8xl font-black tracking-tight text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)] text-center"
                    >
                        {memoizedRotatingTexts[currentTextIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Subtitle */}
            <motion.p variants={itemVariants}
                className="text-sm sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium mb-10 sm:mb-12 px-2 sm:px-0">
                From Accounting to HR. From CRM to Inventory. BBU1 is the single platform that runs every corner of your business — from a single kiosk to a global enterprise.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
                <Button asChild size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 h-13 sm:h-14 text-base sm:text-lg font-bold rounded-2xl shadow-lg shadow-blue-900/30 transition-all hover:scale-105 hover:shadow-blue-600/40 hover:shadow-xl">
                    <Link href="/signup">Start Free Trial</Link>
                </Button>
                {/* Glass / iOS water-effect button */}
                <Button asChild size="lg" variant="outline"
                    className="w-full sm:w-auto border-white/25 text-white bg-white/10 hover:bg-white/20 hover:text-white backdrop-blur-xl px-8 h-13 sm:h-14 text-base sm:text-lg font-bold rounded-2xl transition-all hover:scale-105 hover:border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_24px_rgba(0,0,0,0.25)]">
                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2">
                        Let&apos;s talk <ArrowRight className="h-4 w-4" />
                    </a>
                </Button>
            </motion.div>

            {/* Trust line */}
            <motion.p variants={itemVariants} className="mt-8 text-xs text-slate-500 font-medium tracking-wide leading-relaxed">
                No credit card required<br />Trusted by enterprises across Africa
            </motion.p>
        </motion.div>
    </div>

    {/* Scroll indicator */}
    <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-500"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }}
    >
        <span className="text-[10px] uppercase tracking-widest font-semibold">Scroll</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-4 w-4" />
        </motion.div>
    </motion.div>
</section>

{/* PLATFORM SECTION - THE 6 CORE PILLARS */}
<section id="platform" className="relative py-16 sm:py-20 overflow-hidden bg-background">
    <div className="absolute inset-0 z-0 opacity-5 dark:[&_path]:fill-white/10" style={{ backgroundImage: 'url("/images/tech-pattern.svg")', backgroundSize: '300px 300px' }}></div>
    <div className="container mx-auto px-4 relative z-10">
        <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
            className="text-center mb-12 md:mb-16"
        >
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">An Operating System <br /> Engineered for Growth</motion.h2>
            <motion.p variants={staggerItem} className="text-lg text-muted-foreground max-w-2xl mx-auto">BBU1 is more than software. It's a complete platform designed to simplify complexity and accelerate your business.</motion.p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
            <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                variants={slideLeft}
                className="space-y-4 md:space-y-6"
            >
                <AnimatePresence mode="wait">
                    <motion.div key={activePillarIndex}
                        initial={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -14, scale: 0.97, filter: 'blur(6px)' }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-card border border-border rounded-2xl p-8 shadow-sm overflow-hidden relative"
                    >
                        <div className="flex items-center gap-5 mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl shrink-0">
                                {React.createElement(memoizedPlatformPillars[activePillarIndex].icon, { className: "h-7 w-7 text-blue-500" })}
                            </div>
                            <h3 className="text-2xl font-bold">{memoizedPlatformPillars[activePillarIndex].title}</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{memoizedPlatformPillars[activePillarIndex].description}</p>
                        {/* Auto-cycle progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-100 dark:bg-blue-900/40">
                            <motion.div
                                key={activePillarIndex}
                                className="h-full bg-blue-500"
                                initial={{ scaleX: 0, originX: 0 }}
                                animate={{ scaleX: 1, originX: 0 }}
                                transition={{ duration: PILLAR_INTERVAL / 1000, ease: 'linear' }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>
                <motion.div
                    initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
                    variants={staggerContainer}
                    className="flex flex-wrap gap-2 md:gap-3"
                >
                    {memoizedPlatformPillars.map((pillar, index) => (
                        <motion.button
                            key={pillar.title}
                            variants={staggerItem}
                            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                            onClick={() => setActivePillarIndex(index)}
                            className={cn("flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300", activePillarIndex === index ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105" : "bg-card/80 backdrop-blur-md border border-border hover:border-blue-300 text-muted-foreground hover:text-foreground hover:bg-blue-50/50 dark:hover:bg-blue-900/20")}
                        >
                            {pillar.title}
                        </motion.button>
                    ))}
                </motion.div>
            </motion.div>
            <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                variants={slideRight}
                className="relative h-[300px] md:h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-border"
            >
                <AnimatePresence mode="wait">
                    <motion.div key={activePillarIndex}
                        initial={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0"
                    >
                        <Image src={memoizedPlatformPillars[activePillarIndex].backgroundImage} alt="Platform Capability" fill style={{ objectFit: 'cover' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    </div>
</section>

{/* IN-ACTION SECTION - REFACTORED: MEDIA LEFT | CONTENT RIGHT | BROWSER SHELL FIX */}
<AnimatedSection id="in-action" className="bg-white text-slate-900 py-24 border-t border-slate-100">
    <div className="container mx-auto px-4">
        
        {/* 1. MAIN SECTION HEADER */}
        <div className="relative z-10 text-center mb-16 max-w-4xl mx-auto">
            <motion.h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                The Engine For Every business from strartup to Enterprise.
            </motion.h2>
            <motion.p className="mt-6 text-lg md:text-xl text-slate-500 font-medium">
                From bustling city markets to the digital frontier, BBU1 is built for ambition.
            </motion.p>
        </div>

        {/* 2. SPLIT GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-7xl mx-auto">
            
            {/* LEFT SIDE: THE MEDIA BOX (Containment Fix) */}
            <div className="lg:col-span-7 relative">
                <motion.div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] h-[350px] md:h-[550px] bg-white border border-slate-200">
                    
                    {/* BROWSER TOP BAR (Professional Detail) */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-1.5 z-30">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <div className="ml-4 h-3 w-1/3 bg-slate-200/50 rounded-sm" />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentSlideIndex} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: 20 }} 
                            transition={{ duration: 0.6, ease: "easeOut" }} 
                            className="absolute inset-0 pt-8 bg-white flex items-center justify-center"
                        >
                            {memoizedSlideshowContent[currentSlideIndex].is_video ? (
                                <video
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="w-full h-full object-contain" 
                                >
                                    <source src={memoizedSlideshowContent[currentSlideIndex].src} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <Image 
                                    src={memoizedSlideshowContent[currentSlideIndex].src} 
                                    alt={memoizedSlideshowContent[currentSlideIndex].alt} 
                                    fill
                                    style={{ objectFit: 'contain' }}
                                    className="p-4" 
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* RIGHT SIDE: DYNAMIC SUB-CONTENT */}
            <div className="lg:col-span-5 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlideIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        <div className="inline-block px-3 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest mb-2">
                            Platform Module
                        </div>

                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                            {memoizedSlideshowContent[currentSlideIndex].title}
                        </h3>

                        <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
                            {memoizedSlideshowContent[currentSlideIndex].description}
                        </p>

                        <div className="pt-4">
                            <button className="group flex items-center gap-2 text-blue-600 font-bold hover:gap-4 transition-all">
                                Explore this module <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* SLIDE INDICATORS (DOTS) */}
                <div className="mt-12 flex gap-3">
                    {memoizedSlideshowContent.map((_, idx) => (
                        <button 
                            key={idx} 
                            className={cn(
                                "h-1.5 transition-all duration-500 rounded-full", 
                                currentSlideIndex === idx ? "bg-blue-600 w-10" : "bg-slate-200 w-3 hover:bg-slate-300"
                            )} 
                            onClick={() => setCurrentSlideIndex(idx)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
</AnimatedSection>

                <DynamicPricingSection />

                <PartnerWithUsSection />

            </main>

            {mounted && <AdvancedChatWidget />}
            <LandingFooter onManageCookies={openCookiePreferences} />
            <Toast message={toastState.message} isVisible={toastState.visible} />

            {/* COOKIE CONSENT BANNER */}
            {mounted && (
                <AnimatePresence>
                    {showCookieBanner && (
                        <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 z-[100] p-4">
                            <Card className="max-w-xl mx-auto shadow-2xl bg-background/90 backdrop-blur-md max-h-[80vh] overflow-y-auto">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" /> Privacy Choice
                                    </CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground mt-1">
                                        We use cookies to improve your experience, analyze site traffic, and personalize content. You can accept all cookies or customize your preferences. Essential cookies are always active as they are required for the site to function.
                                    </CardDescription>
                                </CardHeader>
                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                                        <Button variant="outline" onClick={() => setIsCustomizingCookies(true)}>Customize</Button>
                                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAcceptAllCookies}>Accept All</Button>
                                    </CardFooter>
                                ) : (
                                    <CardContent className="space-y-4 pt-0">
                                        {siteConfig.cookieCategories.map(category => (
                                            <div key={category.id} className="flex items-start space-x-3 py-2 border-t first:border-t-0">
                                                <Checkbox id={category.id} checked={cookiePreferences[category.id as CookieCategoryKey]} onCheckedChange={() => setCookiePreferences(prev => ({...prev, [category.id]: !prev[category.id as CookieCategoryKey]}))} disabled={category.isRequired} />
                                                <div className="grid gap-1.5 leading-none"><label htmlFor={category.id} className="text-sm font-medium">{category.name}</label><p className="text-sm text-muted-foreground">{category.description}</p></div>
                                            </div>
                                        ))}
                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            <Button variant="outline" onClick={() => setIsCustomizingCookies(false)}>Back</Button>
                                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveCookiePreferences}>Save Preferences</Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}