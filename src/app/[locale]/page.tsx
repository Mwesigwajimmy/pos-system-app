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
    Banknote, Bot, BrainCircuit, Facebook, Handshake, ShieldCheck, TrendingUp, Landmark, Leaf, Linkedin, LucideIcon, Menu, ArrowRight, Utensils, WifiOff, Rocket, Send, Signal, Store, Twitter, Users, X, Zap, ShieldHalf, LayoutGrid, Lightbulb, Wallet, ClipboardList, Package, UserCog, Files, Download, Share, Sparkles, Loader2, CheckCircle, Briefcase, Globe, BarChart3, Clock, Scale, Phone, Building, Wrench, HeartHandshake, Car, PawPrint, Megaphone, Palette, FileText, Settings, KeyRound, Cloud, GitBranch, BadgeCheck, Coins, PiggyBank, ReceiptText, Barcode, Warehouse, ShoppingCart, CalendarDays, LineChart, MessageSquareText, HelpCircle, Book, CircleDollarSign, DownloadCloud, Truck, Mail, Globe2, Target
} from 'lucide-react';
import { toast } from 'sonner'; 
import { createClient } from '@/lib/supabase/client';
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
    privacyPolicy: (<div className="space-y-4 text-sm"><p>This Privacy Policy describes how BBU1 collects, uses, and discloses your information when you use our website and services ("Services"). By using our Services, you agree to the collection and use of information in accordance with this policy.</p><h3 className="text-base font-semibold mt-6">1. Information We Collect</h3><p><strong>Personal Information:</strong> When you register for an account, we collect personal information such as your name, email address, phone number, company name, and billing address. If you subscribe to paid services, we also collect payment information (e.g., credit card details), which is processed securely by our third-party payment processors.</p><p><strong>Usage Data:</strong> We automatically collect information on how the Services are accessed and used. This Usage Data may include your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers, and other diagnostic data.</p><p><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p><p><strong>BBU1 uses the collected data for various purposes:</strong></p><ul><li>To provide and maintain our Services.</li><li>To notify you about changes to our Services.</li><li>To allow you to participate in interactive features of our Service when you choose to do so.</li><li>To provide customer support.</li><li>To gather analysis or valuable information so that we can improve our Services.</li><li>To monitor the usage of our Services.</li><li>To detect, prevent and address technical issues.</li><li>To provide you with news, special offers and general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless you have opted not to receive such information.</li></ul><h3 className="text-base font-semibold mt-6">3. Disclosure of Information</h3><p>We may share your information with:</p><ul><li><strong>Service Providers:</strong> We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</li><li><strong>Legal Requirements:</strong> BBU1 may disclose your Personal Data in the good faith belief that such action is necessary to: comply with a legal obligation, protect and defend the rights or property of BBU1, prevent or investigate possible wrongdoing in connection with the Service, protect the personal safety of users of the Service or the public, protect against legal liability.</li><li><strong>Business Transfers:</strong> If BBU1 is involved in a merger, acquisition or asset sale, your Personal Data may be transferred. We will provide notice before your Personal Data is transferred and becomes subject to a different Privacy Policy.</li></ul><h3 className="text-base font-semibold mt-6">4. Data Security</h3><p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p><h3 className="text-base font-semibold mt-6">5. Your Data Protection Rights (GDPR)</h3><p>If you are a resident of the European Economic Area (EEA), you have certain data protection rights. BBU1 aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data. If you wish to be informed what Personal Data we hold about you and if you want it to be removed from our systems, please contact us.</p><h3 className="text-base font-semibold mt-6">6. Links to Other Sites</h3><p>Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p><h3 className="text-base font-semibold mt-6">7. Children's Privacy</h3><p>Our Services do not address anyone under the age of 18 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 18. If you are a parent or guardian and you are aware that your Children has provided us with Personal Data, please contact us. If we become aware that we have collected Personal Data from children without verification of parental consent, we take steps to remove that information from our servers.</p><h3 className="text-base font-semibold mt-6">8. Changes to This Privacy Policy</h3><p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p></div>),
    cookieCategories: [
        { id: 'essential', name: 'Essential Cookies', description: 'These cookies are crucial for the website to function properly and enable core functionalities like security, network management, and accessibility. They cannot be switched off.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics Cookies', description: 'These cookies allow us to count visits and traffic sources, understand how visitors interact with our website, and measure the performance of our site. This helps us to improve the way our website works.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing Cookies', description: 'These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites. They do not directly store personal information but are based on uniquely identifying your browser and internet device.', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

// --- Framer Motion Variants ---
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.2 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const textVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } } };
const heroImageVariants: Variants = { initial: { scale: 1 }, animate: { scale: [1, 1.05, 1], transition: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" } } };
const pillarCardContentVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: "easeIn" } } };

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

// --- MegaMenuHeader Component ---
const MegaMenuHeader = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            setDeferredPrompt(null);
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2 font-bold text-lg text-blue-600 hover:text-blue-700 transition-colors">
                    <Rocket className="h-6 w-6" /> <span>{siteConfig.name}</span>
                </Link>

                <NavigationMenu className="hidden lg:flex">
                    <NavigationMenuList>
                        {/* Features Menu Item */}
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className="bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-border transition-all duration-200">
                                Features
                            </NavigationMenuTrigger>
                            <NavigationMenuContent className="bg-background/80 backdrop-blur-md border border-border/50">
                                <ScrollArea className="h-[65vh] w-[90vw] md:w-[600px] lg:w-[800px] max-w-[94vw] rounded-md">
                                    <ul className="grid gap-3 p-4 md:grid-cols-2">
                                        {siteConfig.featureSets.map((feature) => (
                                            <li key={feature.title} className="list-none">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <button className="w-full text-left">
                                                            <ListItem title={feature.title} icon={feature.icon}>{feature.description}</ListItem>
                                                        </button>
                                                    </DialogTrigger>
                                                    <FullScreenDialog
                                                        title={feature.title}
                                                        description={feature.description}
                                                        backgroundImage={feature.backgroundImage}
                                                        icon={feature.icon}
                                                    >
                                                        <div className="py-4 space-y-6">
                                                            {feature.details.map(detail => (
                                                                <div key={detail.name} className="flex items-start">
                                                                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0"/>
                                                                    <div>
                                                                        <h4 className="font-semibold text-xl">{detail.name}</h4>
                                                                        <p className="text-base text-muted-foreground mt-1">{detail.detail}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </FullScreenDialog>
                                                </Dialog>
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </NavigationMenuContent>
                        </NavigationMenuItem>

                        {/* Industries Menu Item - Desktop */}
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className="bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-border transition-all duration-200">
                                Industries
                            </NavigationMenuTrigger>
                            <NavigationMenuContent className="bg-background/80 backdrop-blur-md border border-border/50">
                                <ScrollArea className="h-[65vh] w-[90vw] md:w-[700px] lg:w-[800px] max-w-[94vw] rounded-md">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                                        {['Common', 'Trades & Services', 'Specialized', 'Creative & Digital'].map(category => (
                                            <div key={category} className="col-span-1">
                                                <h3 className="font-semibold text-sm px-3 mb-2">{category}</h3>
                                                {siteConfig.industryItems.filter(i => i.category === category).map((item) => (
                                                    <Dialog key={item.name}>
                                                        <DialogTrigger asChild>
                                                            <button className="w-full text-left mb-2 block">
                                                                <ListItem title={item.name} icon={item.icon}>{item.description}</ListItem>
                                                            </button>
                                                        </DialogTrigger>
                                                        <FullScreenDialog
                                                            title={item.name}
                                                            description={item.description}
                                                            backgroundImage={item.backgroundImage}
                                                            icon={item.icon}
                                                        >
                                                            <div className="p-4 space-y-6">
                                                                <p className="text-lg text-muted-foreground leading-relaxed">
                                                                    {item.fullDescription}
                                                                </p>
                                                                <div className="bg-accent/50 p-6 rounded-xl border">
                                                                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                                        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Key Capabilities
                                                                    </h4>
                                                                    <ul className="grid gap-3">
                                                                        {item.keyFeatures.map((feature, idx) => (
                                                                            <li key={idx} className="flex items-start gap-3 text-sm md:text-base">
                                                                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                                                <span>{feature}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </FullScreenDialog>
                                                    </Dialog>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </NavigationMenuContent>
                        </NavigationMenuItem>

                        {/* Platform Menu Item - Desktop */}
                        <NavigationMenuItem>
                            <NavigationMenuTrigger className="bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-border transition-all duration-200">
                                Platform
                            </NavigationMenuTrigger>
                            <NavigationMenuContent className="bg-background/80 backdrop-blur-md border border-border/50">
                                <ScrollArea className="h-[65vh] w-[90vw] md:w-[500px] lg:w-[600px] max-w-[94vw] rounded-md">
                                    <ul className="grid gap-3 p-4 md:grid-cols-2">
                                        {siteConfig.platformPillars.map((pillar) => (
                                            <li key={pillar.title} className="list-none">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <button className="w-full text-left">
                                                            <ListItem title={pillar.title} icon={pillar.icon}>{pillar.description}</ListItem>
                                                        </button>
                                                    </DialogTrigger>
                                                    <FullScreenDialog
                                                        title={pillar.title}
                                                        description={pillar.description}
                                                        backgroundImage={pillar.backgroundImage}
                                                        icon={pillar.icon}
                                                    >
                                                        <div className="p-4 space-y-6">
                                                            <p className="text-lg text-muted-foreground leading-relaxed">
                                                                {pillar.fullDescription}
                                                            </p>
                                                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                                                                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                                    <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Technical Specifications
                                                                </h4>
                                                                <ul className="grid gap-3">
                                                                    {pillar.technicalSpecs.map((spec, idx) => (
                                                                        <li key={idx} className="flex items-start gap-3 text-sm md:text-base">
                                                                            <BadgeCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                                                            <span>{spec}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </FullScreenDialog>
                                                </Dialog>
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </NavigationMenuContent>
                        </NavigationMenuItem>

                        {/* Support Link */}
                        <NavigationMenuItem>
                            <Link href="/support" legacyBehavior passHref>
                                <NavigationMenuLink className={cn(
                                    navigationMenuTriggerStyle(),
                                    "bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-border transition-all duration-200"
                                )}>
                                    Support
                                </NavigationMenuLink>
                            </Link>
                        </NavigationMenuItem>

                        {/* FAQ Dialog */}
                        <NavigationMenuItem>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" className={cn(
                                        navigationMenuTriggerStyle(),
                                        "bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-border transition-all duration-200"
                                    )}>
                                        FAQ
                                    </Button>
                                </DialogTrigger>
                                <FullScreenDialog title="Frequently Asked Questions" icon={HelpCircle} backgroundImage="/images/showcase/office-admin-bbU1.jpg">
                                    <Accordion type="single" collapsible className="w-full py-4">
                                        {siteConfig.faqItems.map((faq, index) => (
                                            <AccordionItem key={index} value={`item-${index}`}>
                                                <AccordionTrigger className="text-lg text-left hover:text-blue-600">{faq.q}</AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground text-base">{faq.a}</AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </FullScreenDialog>
                            </Dialog>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-2">
                    {deferredPrompt && (
                        <Button 
                            variant="outline" 
                            onClick={handleInstallClick} 
                            className="flex items-center gap-1 bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
                        >
                            <DownloadCloud className="h-4 w-4" /> Install App
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        asChild
                        className="bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
                    >
                        <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a Demo</a>
                    </Button>
                    <Button 
                        variant="ghost" 
                        asChild
                        className="bg-transparent hover:bg-accent/20 backdrop-blur-sm border border-transparent hover:border-border transition-all duration-200"
                    >
                        <Link href="/login">Log In</Link>
                    </Button>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 transition-all duration-200">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                    <ModeToggle />
                </div>

                {/* Mobile Actions */}
                <div className="lg:hidden flex items-center gap-2">
                    <ModeToggle />
                    {deferredPrompt && (
                        <Button variant="ghost" size="icon" onClick={handleInstallClick} aria-label="Install App" className="hover:bg-accent/20">
                            <DownloadCloud className="h-6 w-6" />
                        </Button>
                    )}
                    <Button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} variant="ghost" size="icon" aria-label="Toggle mobile menu" className="hover:bg-accent/20">
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="lg:hidden bg-background/95 backdrop-blur-md border-t absolute w-full top-16 shadow-lg z-30 max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <div className="container mx-auto py-4 px-4 space-y-4">
                            {/* Mobile Menu Items */}
                            {/* Features */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="block text-lg font-medium hover:text-blue-600 w-full text-left py-2 px-2 rounded-md hover:bg-accent/20 transition-colors">
                                        Features
                                    </button>
                                </DialogTrigger>
                                <FullScreenDialog title="Features" description="Explore the powerful features of BBU1" backgroundImage="/images/showcase/modern-office-analytics.jpg" icon={LayoutGrid} onClose={() => setIsMobileMenuOpen(false)}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                        {siteConfig.featureSets.map((feature) => (
                                            <Dialog key={feature.title}>
                                                <DialogTrigger asChild>
                                                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors">
                                                        {React.createElement(feature.icon, { className: "h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" })}
                                                        <div>
                                                            <h4 className="font-semibold text-xl hover:text-blue-600">{feature.title}</h4>
                                                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <FullScreenDialog
                                                    title={feature.title}
                                                    description={feature.description}
                                                    backgroundImage={feature.backgroundImage}
                                                    icon={feature.icon}
                                                    onClose={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <div className="py-4 space-y-6">
                                                        {feature.details.map(detail => (
                                                            <div key={detail.name} className="flex items-start">
                                                                <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1 flex-shrink-0"/>
                                                                <div>
                                                                    <h4 className="font-semibold text-xl">{detail.name}</h4>
                                                                    <p className="text-base text-muted-foreground mt-1">{detail.detail}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </FullScreenDialog>
                                            </Dialog>
                                        ))}
                                    </div>
                                </FullScreenDialog>
                            </Dialog>

                            {/* Industries - Mobile */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="block text-lg font-medium hover:text-blue-600 w-full text-left py-2 px-2 rounded-md hover:bg-accent/20 transition-colors">
                                        Industries
                                    </button>
                                </DialogTrigger>
                                <FullScreenDialog title="Industries" description="Solutions tailored for your business sector" backgroundImage="/images/showcase/bakery-pos-system.jpg" icon={Building} onClose={() => setIsMobileMenuOpen(false)}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                        {siteConfig.industryItems.map((item) => (
                                            <Dialog key={item.name}>
                                                <DialogTrigger asChild>
                                                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors">
                                                        {React.createElement(item.icon, { className: "h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" })}
                                                        <div>
                                                            <h4 className="font-semibold text-xl hover:text-blue-600">{item.name}</h4>
                                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <FullScreenDialog
                                                    title={item.name}
                                                    description={item.description}
                                                    backgroundImage={item.backgroundImage}
                                                    icon={item.icon}
                                                    onClose={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <div className="p-4 space-y-6">
                                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                                            {item.fullDescription}
                                                        </p>
                                                        <div className="bg-accent/50 p-6 rounded-xl border">
                                                            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Key Capabilities
                                                            </h4>
                                                            <ul className="grid gap-3">
                                                                {item.keyFeatures.map((feature, idx) => (
                                                                    <li key={idx} className="flex items-start gap-3 text-sm md:text-base">
                                                                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                                        <span>{feature}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </FullScreenDialog>
                                            </Dialog>
                                        ))}
                                    </div>
                                </FullScreenDialog>
                            </Dialog>

                            {/* Platform - Mobile */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="block text-lg font-medium hover:text-blue-600 w-full text-left py-2 px-2 rounded-md hover:bg-accent/20 transition-colors">
                                        Platform
                                    </button>
                                </DialogTrigger>
                                <FullScreenDialog title="Platform" description="The foundational pillars of the BBU1 operating system" backgroundImage="/images/showcase/future-of-business-tech.jpg" icon={Cloud} onClose={() => setIsMobileMenuOpen(false)}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                        {siteConfig.platformPillars.map((pillar) => (
                                            <Dialog key={pillar.title}>
                                                <DialogTrigger asChild>
                                                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors">
                                                        {React.createElement(pillar.icon, { className: "h-7 w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" })}
                                                        <div>
                                                            <h4 className="font-semibold text-xl hover:text-blue-600">{pillar.title}</h4>
                                                            <p className="text-sm text-muted-foreground">{pillar.description}</p>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <FullScreenDialog
                                                    title={pillar.title}
                                                    description={pillar.description}
                                                    backgroundImage={pillar.backgroundImage}
                                                    icon={pillar.icon}
                                                    onClose={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <div className="p-4 space-y-6">
                                                        <p className="text-lg text-muted-foreground leading-relaxed">
                                                            {pillar.fullDescription}
                                                        </p>
                                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                                                            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                                <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Technical Specifications
                                                            </h4>
                                                            <ul className="grid gap-3">
                                                                {pillar.technicalSpecs.map((spec, idx) => (
                                                                    <li key={idx} className="flex items-start gap-3 text-sm md:text-base">
                                                                        <BadgeCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                                                        <span>{spec}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </FullScreenDialog>
                                            </Dialog>
                                        ))}
                                    </div>
                                </FullScreenDialog>
                            </Dialog>

                            {/* Other links */}
                            <Link href="/support" className="block text-lg font-medium hover:text-blue-600 py-2 px-2 rounded-md hover:bg-accent/20 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                                Support
                            </Link>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="block text-lg font-medium hover:text-blue-600 w-full text-left py-2 px-2 rounded-md hover:bg-accent/20 transition-colors">
                                        FAQ
                                    </button>
                                </DialogTrigger>
                                <FullScreenDialog title="Frequently Asked Questions" icon={HelpCircle} backgroundImage="/images/showcase/office-admin-bbU1.jpg" onClose={() => setIsMobileMenuOpen(false)}>
                                    <Accordion type="single" collapsible className="w-full py-4">
                                        {siteConfig.faqItems.map((faq, index) => (
                                            <AccordionItem key={index} value={`item-${index}`}>
                                                <AccordionTrigger className="text-lg text-left hover:text-blue-600">{faq.q}</AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground text-base">{faq.a}</AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </FullScreenDialog>
                            </Dialog>

                            <div className="flex flex-col gap-2 pt-4 border-t">
                                <Button asChild className="hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/10 dark:hover:text-blue-400">
                                    <a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer">Book a Demo</a>
                                </Button>
                                <Button variant="ghost" asChild className="hover:bg-accent/20">
                                    <Link href="/login">Log In</Link>
                                </Button>
                                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 transition-all">
                                    <Link href="/signup">Get Started</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

// --- LandingFooter Component ---
const LandingFooter = ({ onManageCookies }: { onManageCookies: () => void }) => (
    <footer className="relative bg-slate-950 text-slate-200 pt-16 pb-8 border-t border-slate-800 z-10">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                <div className="col-span-2 pr-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <Rocket className="h-6 w-6 text-blue-500" /> {siteConfig.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
                        {siteConfig.shortDescription}
                    </p>
                    <div className="flex items-center gap-4">
                        <a href={siteConfig.contactInfo.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all duration-300">
                            <Linkedin size={18} />
                        </a>
                        <a href={siteConfig.contactInfo.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-blue-400 hover:text-white transition-all duration-300">
                            <Twitter size={18} />
                        </a>
                        <a href={siteConfig.contactInfo.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-blue-700 hover:text-white transition-all duration-300">
                            <Facebook size={18} />
                        </a>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold text-white mb-6">Product</h4>
                    <ul className="space-y-4 text-sm">
                        <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">Features</Link></li>
                        <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">Industries</Link></li>
                        <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">Platform</Link></li>
                        <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors">Mobile App</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6">Company</h4>
                    <ul className="space-y-4 text-sm">
                        <li><a href={siteConfig.contactInfo.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors">Contact Sales</a></li>
                        <li><Link href="/support" className="text-slate-400 hover:text-blue-400 transition-colors">Support Center</Link></li>
                        <li>
    <Dialog>
        <DialogTrigger asChild>
            <button className="text-slate-400 hover:text-blue-400 text-left transition-colors font-medium">
                About Us
            </button>
        </DialogTrigger>
        {/* FIX: We added overflow-hidden to the content and h-screen */}
        <DialogContent className="!fixed !inset-0 !z-[200] !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !border-none p-0 bg-white dark:bg-slate-950 overflow-hidden">
            
            {/* FIX: Explicitly set h-screen so the ScrollArea knows how big the window is */}
            <ScrollArea className="h-screen w-full">
                <div className="relative flex flex-col">
                    
                    {/* EXECUTIVE CLOSE BUTTON - Sticky so it stays while you scroll */}
                    <div className="sticky top-0 z-[210] flex justify-end p-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-6 w-6 text-slate-900 dark:text-white" />
                            </Button>
                        </DialogClose>
                    </div>

                    {/* THE CONTENT */}
                    <div className="flex-grow">
                        <AboutCompanyExecutiveSection />
                    </div>

                    {/* PROFESSIONAL FINISH AT THE VERY BOTTOM */}
                    <div className="max-w-4xl mx-auto w-full px-4 text-center py-20 border-t mt-10">
                         <DialogClose asChild>
                            <Button variant="outline" className="px-12 h-12 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-bold uppercase tracking-widest">
                                Close & Return to System
                            </Button>
                        </DialogClose>
                    </div>
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
</li>
                        <li><Link href="/careers" className="text-slate-400 hover:text-blue-400 transition-colors">Careers</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6">Legal</h4>
                    <ul className="space-y-4 text-sm">
                        <li>
                            <Dialog>
                                <DialogTrigger asChild><button className="text-slate-400 hover:text-blue-400 text-left transition-colors">Terms of Service</button></DialogTrigger>
                                <FullScreenDialog title="Terms of Service" icon={FileText} backgroundImage="/images/showcase/office-admin-bbU1.jpg">
                                    <ScrollArea className="h-[60vh] pr-4">{siteConfig.termsOfService}</ScrollArea>
                                </FullScreenDialog>
                            </Dialog>
                        </li>
                        <li>
                            <Dialog>
                                <DialogTrigger asChild><button className="text-slate-400 hover:text-blue-400 text-left transition-colors">Privacy Policy</button></DialogTrigger>
                                <FullScreenDialog title="Privacy Policy" icon={ShieldCheck} backgroundImage="/images/showcase/office-presentation-dashboard.jpg">
                                    <ScrollArea className="h-[60vh] pr-4">{siteConfig.privacyPolicy}</ScrollArea>
                                </FullScreenDialog>
                            </Dialog>
                        </li>
                        <li><button onClick={onManageCookies} className="text-slate-400 hover:text-blue-400 text-left transition-colors">Manage Cookies</button></li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
                <p>© {new Date().getFullYear()} {siteConfig.name} International. All rights reserved.</p>
                <div className="flex items-center gap-6 mt-4 md:mt-0">
                    <p className="flex items-center gap-1">Made with <Leaf className="h-3 w-3 text-green-500" /> for the World.</p>
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
                                        {messages.map((m: CoreMessage, i: number) => (
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

    // Base Pricing in USD (Automatically converts)
    const PLANS = [
        {
            name: "Starter",
            basePrice: 15, // Affordable entry point
            userLimit: "2 Users",
            idealFor: "Small Shops & Solo Founders",
            highlight: false,
            btnText: "Start Free Trial",
            features: ["Full ERP Core", "Mobile App", "Enterprise Reports", "invoicing system", "cloud accounting", "cloud auditing", "complete tax filling system"]
        },
        {
            name: "Growth",
            basePrice: 49,
            userLimit: "10 Users",
            idealFor: "Growing SMEs & Teams",
            highlight: true,
            btnText: "Start Free Trial",
            features: ["All Industry Modules", "custom branding", "HR & Payroll", "Inventory Tracking", "Mobile App", "Enterprise Reports", "invoicing system", "cloud accounting", "cloud auditing", "complete tax filling system"]
        },
        {
            name: "Scale",
            basePrice: 119,
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
                // Determine user's country
                const response = await fetch('https://ipapi.co/json/');
                if (response.ok) {
                    const data = await response.json();
                    const countryCode = data.country_code;
                    
                    // --- OPTIMIZED DETECTION LOGIC ---
                    let detectedCurrency;
                    if (EUROZONE_COUNTRIES.includes(countryCode)) {
                        detectedCurrency = GEO_CURRENCIES['EU'];
                    } else {
                        detectedCurrency = GEO_CURRENCIES[countryCode] || GEO_CURRENCIES['DEFAULT'];
                    }
                    
                    setCurrency(detectedCurrency);
                }
            } catch (error) {
                console.warn("Location detection failed, defaulting to USD.");
            } finally {
                setLoading(false);
            }
        };
        detectLocation();
    }, []);

    const formatPrice = (base: number) => {
        let price = base * currency.rate;
        if (billingCycle === 'yearly') price = price * 0.8; // 20% Discount
        
        // Smart Rounding for cleaner numbers
        if (currency.code === 'UGX' || currency.code === 'TZS' || currency.code === 'RWF') {
            price = Math.floor(price / 1000) * 1000; // Round to nearest 1000 for high-denom currencies
        } else if (currency.code === 'NGN' || currency.code === 'KES') {
            price = Math.floor(price / 100) * 100; // Round to nearest 100
        } else {
            price = Math.floor(price); // Round to nearest integer for USD, EUR, GBP
        }

        return new Intl.NumberFormat('en-US').format(price);
    };

    return (
        <>
            {/* SECTION 1: Standard Pricing (Light Background) */}
            <section id="pricing" className="py-24 bg-background relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-4xl mx-auto mb-16">
                        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl mb-6">
                            Fair Pricing for Every Business
                        </h2>
                        <p className="text-xl text-muted-foreground mb-8">
                            We believe in fair access to technology. Whether you are a local shop or a global enterprise, 
                            you get the full power of the BBU1 Operating System.
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4">
                            <span className={cn("text-sm font-medium transition-colors", billingCycle === 'monthly' ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
                            <button 
                                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                                className="relative w-14 h-7 bg-blue-600/20 rounded-full p-1 transition-colors hover:bg-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                            >
                                <motion.div 
                                    className="h-5 w-5 bg-blue-600 rounded-full shadow-sm"
                                    animate={{ x: billingCycle === 'yearly' ? 28 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            </button>
                            <span className={cn("text-sm font-medium transition-colors flex items-center gap-1.5", billingCycle === 'yearly' ? "text-foreground" : "text-muted-foreground")}>
                                Yearly <span className="text-[10px] font-bold bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20">SAVE 20%</span>
                            </span>
                        </div>
                        
                        {loading && <p className="text-xs text-muted-foreground mt-4 animate-pulse">Detecting your local currency...</p>}
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
                        {PLANS.map((plan, index) => (
                            <Card key={index} className={cn("flex flex-col relative transition-all duration-300 hover:shadow-lg", plan.highlight ? "border-blue-600 shadow-2xl scale-105 z-10" : "border-border hover:border-blue-600/50")}>
                                {plan.highlight && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-600 rounded-t-xl" />
                                )}
                                <CardHeader>
                                    {plan.highlight && <div className="mb-2"><span className="text-xs font-bold text-blue-600 bg-blue-600/10 px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span></div>}
                                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                    <CardDescription className="text-sm font-medium mt-1">{plan.idealFor}</CardDescription>
                                    <div className="mt-6 flex items-baseline">
                                        <span className="text-4xl font-extrabold tracking-tight">
                                            {currency.symbol} {formatPrice(plan.basePrice)}
                                        </span>
                                        <span className="text-muted-foreground ml-2">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-6">
                                    <div className="p-4 bg-muted/50 rounded-lg border">
                                        <p className="font-semibold flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" /> {plan.userLimit}
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold uppercase text-muted-foreground tracking-wider">What's Included:</p>
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3 text-sm">
                                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                                <span className="font-semibold">Full System Access</span>
                                            </li>
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm">
                                                    <CheckCircle className="h-5 w-5 text-blue-600/60 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-700 text-white" variant={plan.highlight ? "default" : "outline"} asChild>
                                        <Link href="/signup">{plan.btnText}</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 2: Enterprise/Included Modules (Deep Navy Background) */}
            <section className="py-24 bg-slate-900 relative overflow-hidden">
                 {/* Decorative background element */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold uppercase tracking-widest mb-4 border border-blue-500/20">
                                <Sparkles className="h-3 w-3" /> Unlocked Potential
                            </span>
                            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-white">
                                The "No-Addons" Promise
                            </h3>
                            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                                Stop paying for "Extra Modules." With BBU1, the moment you sign up, 
                                <span className="text-white font-semibold"> every single enterprise engine is unlocked</span> tailored to your industry.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ALL_INCLUDED_MODULES.map((module, i) => {
                                // Dynamic Icon Mapping based on Title
                                let ModuleIcon = BadgeCheck;
                                if (module.title.includes("Finance")) ModuleIcon = Landmark;
                                if (module.title.includes("Human")) ModuleIcon = Users;
                                if (module.title.includes("Inventory")) ModuleIcon = Warehouse;
                                if (module.title.includes("Sales")) ModuleIcon = Handshake;
                                if (module.title.includes("Specialized")) ModuleIcon = Briefcase;

                                return (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        // MODIFIED: White bg, Slate-900 text for high contrast pop
                                        className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-white text-slate-900 shadow-sm transition-all hover:shadow-xl hover:border-blue-600"
                                    >
                                        {/* Subtle gradient background on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="p-6 relative z-10 h-full flex flex-col">
                                            <div className="flex items-center gap-3 mb-5">
                                                {/* MODIFIED: Icon colors for white background */}
                                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform duration-300">
                                                    <ModuleIcon className="h-6 w-6" />
                                                </div>
                                                <h4 className="font-bold text-xl leading-tight text-slate-900">
                                                    {module.title}
                                                </h4>
                                            </div>

                                            <div className="flex flex-wrap gap-2 content-start">
                                                {module.features.map((feature, j) => (
                                                    <span 
                                                        key={j} 
                                                        // MODIFIED: Badge styling for white background
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-[13px] font-medium text-blue-700 transition-colors group-hover:border-blue-200 group-hover:text-blue-900"
                                                    >
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Trust Banner at bottom of features */}
                        {/* MODIFIED: Adjusted for dark background */}
                        <div className="mt-12 p-6 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-lg text-white">Enterprise Security Included</h5>
                                    <p className="text-sm text-slate-400">We don't charge extra for security. SSO, 2FA, and Audit Logs are standard.</p>
                                </div>
                            </div>
                            <div className="h-px w-full md:w-px md:h-12 bg-white/10" />
                             <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                    <Bot className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-lg text-white">Aura AI Built-In</h5>
                                    <p className="text-sm text-slate-400">Artificial Intelligence is not an upgrade. It's the core of the system.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-16 text-center">
                        <p className="text-slate-500 text-sm">
                             PLEASE NOTE: Prices exclude local  VAT/GST where applicable. 
                            Need On-Premise hosting or White-Label solutions? <a href={siteConfig.contactInfo.whatsappLink} className="text-blue-400 hover:underline font-medium">Contact Enterprise Sales</a>.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
};
{/* --- ENTERPRISE LEAD CAPTURE SECTION --- */}
<AnimatedSection className="bg-blue-600 py-16">
    <div className="max-w-4xl mx-auto text-center px-4">
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-4">
            Ready for Sovereign Control?
        </h2>
        <p className="text-blue-100 text-lg mb-8 font-medium">
            Enter your email to receive the BBU1 Enterprise Architecture Whitepaper and a direct line to our Architects.
        </p>
        <form 
            onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleLeadCapture(formData.get('lead_email') as string);
                e.currentTarget.reset();
            }}
            className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
        >
            <Input 
                name="lead_email"
                type="email" 
                placeholder="Enter business email..." 
                className="h-14 bg-white/10 border-white/20 text-white placeholder:text-blue-200 rounded-2xl focus:ring-white"
                required
            />
            <Button 
                type="submit"
                className="h-14 px-8 bg-white text-blue-600 font-black uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-all"
            >
                Get Started
            </Button>
        </form>
    </div>
</AnimatedSection>
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
        window.open(`mailto:nakkungujackline.92@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    
                    {/* 1. Affiliate Card */}
                    <Card className="hover:border-blue-600/50 transition-all hover:shadow-xl group relative overflow-hidden border-t-4 border-t-blue-600 bg-white dark:bg-slate-950">
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

                    {/* 2. Investor Card */}
                    <Card className="hover:border-blue-600/50 transition-all hover:shadow-xl group relative overflow-hidden border-t-4 border-t-green-500 bg-white dark:bg-slate-950">
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

                    {/* 3. Solution Partner Card */}
                    <Card className="hover:border-blue-600/50 transition-all hover:shadow-xl group relative overflow-hidden border-t-4 border-t-purple-500 bg-white dark:bg-slate-950">
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

                </div>
            </div>
        </AnimatedSection>
    );
};

// --- MASTER CORPORATE & ARCHITECT MANIFESTO SECTION (TIER 1 FULL UPGRADE) ---
const AboutCompanyExecutiveSection = () => {
    // Tier 1 Animation Variants
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    return (
        <section className="relative w-full overflow-hidden selection:bg-blue-500/30">
            
            {/* 1. UNIVERSAL BACKGROUND IMAGE (Visible across the entire section) */}
            <div className="absolute inset-0 z-0">
                <Image 
                    src="/images/showcase/ai-warehouse-logistics.jpg" 
                    alt="BBU1 Universe Background"
                    fill
                    className="object-cover brightness-[0.25] contrast-[1.1] fixed"
                    priority
                />
                {/* Subtle Overlays to ensure text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/80" />
                <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]" />
            </div>

            <div className="relative z-10">
                
                {/* 2. EXECUTIVE HERO HEADER */}
                <div className="relative h-[60vh] flex flex-col items-center justify-center text-center px-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-3 px-6 py-2 border border-white/10 bg-white/5 backdrop-blur-2xl rounded-full mb-8 shadow-2xl"
                    >
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em]">
                            Corporate Governance & Infrastructure
                        </span>
                    </motion.div>

                    <motion.h2 
                        {...fadeInUp}
                        className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8"
                    >
                        The Business <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30">
                            Base Universe.
                        </span>
                    </motion.h2>

                    <motion.p 
                        {...fadeInUp}
                        transition={{ delay: 0.2 }}
                        className="text-blue-200/60 text-xs md:text-sm uppercase tracking-[0.6em] font-bold"
                    >
                        Architecting Sovereign Commerce
                    </motion.p>
                </div>

                {/* 3. CORPORATE IDENTITY (Mission, Vision, Values) */}
                <div className="container mx-auto px-6 py-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* Card Component with Glassmorphism */}
                        {[
                            {
                                title: "Our Mission",
                                icon: <Target className="h-7 w-7 text-white" />,
                                color: "bg-blue-600",
                                desc: "To engineer a unified, sovereign business infrastructure that eliminates operational friction, enabling enterprises to scale from startups to global conglomerates through intelligent automation and data integrity."
                            },
                            {
                                title: "Our Vision",
                                icon: <Globe2 className="h-7 w-7 text-white" />,
                                color: "bg-indigo-600",
                                desc: "To be the global standard for the modern Business Operating System (BOS)—empowering the next generation of African and international commerce with an unbreakable 'Business Base' that functions anywhere."
                            },
                            {
                                title: "Core Values",
                                icon: <ShieldCheck className="h-7 w-7 text-white" />,
                                color: "bg-emerald-600",
                                values: ["Technical Integrity", "Data Sovereignty", "Innovation with Purpose", "Radical Accessibility"]
                            }
                        ].map((item, idx) => (
                            <motion.div 
                                key={idx}
                                {...fadeInUp}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-white/[0.03] backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl hover:bg-white/[0.06] transition-all duration-500"
                            >
                                <div className={`${item.color} h-14 w-14 rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase italic">{item.title}</h3>
                                {item.desc ? (
                                    <p className="text-slate-300 text-base leading-relaxed font-medium">{item.desc}</p>
                                ) : (
                                    <ul className="space-y-4">
                                        {item.values?.map((val) => (
                                            <li key={val} className="flex items-center gap-3 font-bold text-slate-200 tracking-tight">
                                                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> {val}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* 4. THE LEAD ARCHITECT PROFILE (Mwesigwa Jimmy) */}
                    <div className="mt-40 mb-20">
                        <div className="relative bg-white/[0.02] backdrop-blur-3xl rounded-[4rem] border border-white/10 overflow-hidden">
                            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                                
                                {/* Identity Column */}
                                <div className="lg:col-span-5 p-12 md:p-20 flex flex-col items-center lg:items-start border-b lg:border-b-0 lg:border-r border-white/10">
                                    <div className="relative mb-12">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full" />
                                        <div className="h-72 w-72 rounded-[3.5rem] bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-8xl font-thin text-white/10 border border-white/10 relative z-10">
                                            MJ
                                        </div>
                                    </div>
                                    <div className="text-center lg:text-left">
                                        <h4 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Mwesigwa Jimmy</h4>
                                        <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mt-4">Founder, CEO & Lead Architect</p>
                                        
                                        <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-10">
                                            {["Uganda", "System Architect", "FinTech"].map(tag => (
                                                <span key={tag} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] text-slate-400 font-black tracking-widest uppercase">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Narrative Column */}
                                <div className="lg:col-span-7 p-12 md:p-20 space-y-12 bg-white/[0.01]">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 text-blue-500">
                                            <div className="h-[1px] w-12 bg-blue-500" />
                                            <span className="text-xs font-black uppercase tracking-[0.4em]">Architectural Milestone</span>
                                        </div>
                                        <h3 className="text-4xl md:text-6xl font-black text-white leading-[0.95] tracking-tighter">
                                            Bridging Concept <br /> to Global Utility.
                                        </h3>
                                    </div>
                                    
                                    <div className="space-y-8 text-slate-300 text-lg md:text-xl leading-relaxed font-light">
                                        <p>
                                            BBU1 was born in <span className="text-white font-black underline decoration-blue-600 underline-offset-8 decoration-2">July 2024</span> when Mwesigwa Jimmy identified a critical failure in the modern enterprise landscape: the "Integration Tax"—the heavy cost businesses pay for using disconnected tools.
                                        </p>
                                        <p>
                                            Driven by the ambition to create a tech-sovereign Africa, Jimmy initiated the full system architecting on <span className="text-blue-400 font-black">August 17, 2024</span>. His approach ensures even the most remote business in Uganda operates with the same digital power as a firm in London or New York.
                                        </p>
                                        
                                        <div className="relative p-10 bg-blue-600/5 border-l-4 border-blue-600 rounded-r-[2.5rem] shadow-inner">
                                            <p className="text-slate-100 text-xl md:text-2xl italic font-medium leading-relaxed">
                                                "My work is to architect a universe where your business never stops. We don't build software; we build certainty."
                                            </p>
                                            <p className="mt-6 text-blue-500 font-black text-xs uppercase tracking-[0.4em]">— Mwesigwa Jimmy</p>
                                        </div>
                                    </div>

                                    {/* Specialized Architect Badges */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                                        <div className="flex items-center gap-5 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all">
                                            <div className="h-14 w-14 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0">
                                                <BrainCircuit className="h-7 w-7 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-white text-lg font-black tracking-tight uppercase">Aura AI Strategy</p>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Global Insights Lead</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5 p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all">
                                            <div className="h-14 w-14 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0">
                                                <ShieldHalf className="h-7 w-7 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-white text-lg font-black tracking-tight uppercase">Audit Engineering</p>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Compliance Architect</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-10">
                                        <Button className="bg-blue-600 text-white font-black px-12 py-8 text-lg rounded-2xl hover:bg-blue-700 hover:scale-105 transition-all shadow-2xl shadow-blue-600/20 group" asChild>
                                            <a href="mailto:mwesigwajimmy123@gmail.com">
                                                Inquire with the Founder
                                                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- HomePage Component ---
export default function HomePage() {
    const supabase = createClient();

    // 1. STATE DECLARATIONS
    const [mounted, setMounted] = useState(false);
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [activePillarIndex, setActivePillarIndex] = useState(0);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [isCustomizingCookies, setIsCustomizingCookies] = useState(false);
    const [toastState, setToastState] = useState<ToastState>({ visible: false, message: '' });

    // 2. DATA ARRAYS
    const rotatingTexts = ["We are part of your business.", "In.", "Book Keeping.", "Advanced Accounting.", "Business Reports.", "Internal & External Auditing.", "From startup to enterprise.", "For every ambition."];
    const slideshowContent = [
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
        setMounted(true);

        const trackVisitor = async () => {
            if (process.env.NODE_ENV === 'development') return;
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
    }, [supabase, memoizedRotatingTexts.length, memoizedSlideshowContent.length, memoizedPlatformPillars.length]);

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
            <MegaMenuHeader />
            <main className="flex-grow">
                {/* HERO SECTION */}
                <section id="hero" className="relative pt-24 pb-32 overflow-hidden text-center min-h-[600px] flex items-center justify-center">
                    <motion.div className="absolute inset-0 z-0" variants={heroImageVariants} initial="initial" animate="animate">
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
                                        <motion.span key={currentTextIndex} variants={textVariants} initial="hidden" animate="visible" exit="exit" className="block text-blue-300 drop-shadow-md">{memoizedRotatingTexts[currentTextIndex]}</motion.span>
                                    </AnimatePresence>
                                </div>
                            </motion.h1>
                            <motion.p className="mt-6 text-xl leading-8 text-gray-200 max-w-2xl mx-auto" variants={itemVariants}>Stop juggling multiple apps. BBU1 is the single, unified operating system where growth is not an option—it's guaranteed.</motion.p>
                            <motion.div className="mt-10 flex items-center justify-center gap-x-4" variants={itemVariants}>
                                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 transition-all duration-200">
                                    <Link href="/signup">Start Free Trial</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm hover:scale-105 transition-all duration-200">
                                    <a href={siteConfig.contactInfo.whatsappLink} target='_blank' rel="noopener noreferrer">Request a Demo <ArrowRight className="ml-2 h-4 w-4" /></a>
                                </Button>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                <TrustedBySection />

                {/* PLATFORM SECTION */}
                <section id="platform" className="relative py-16 sm:py-20 overflow-hidden bg-background">
                    <div className="absolute inset-0 z-0 opacity-5 dark:[&_path]:fill-white/10" style={{ backgroundImage: 'url("/images/tech-pattern.svg")', backgroundSize: '300px 300px' }}></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">An Operating System <br /> Engineered for Growth</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">BBU1 is more than software. It's a complete platform designed to simplify complexity and accelerate your business.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
                            <div className="space-y-4 md:space-y-6">
                                <AnimatePresence mode="wait">
                                    <motion.div key={activePillarIndex} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.5 }} className="bg-card border rounded-xl p-6 shadow-sm">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="p-3 bg-blue-600/10 rounded-lg">
                                                {React.createElement(memoizedPlatformPillars[activePillarIndex].icon, { className: "h-6 w-6 text-blue-600 dark:text-blue-400" })}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{memoizedPlatformPillars[activePillarIndex].title}</h3>
                                                <p className="text-muted-foreground mt-2">{memoizedPlatformPillars[activePillarIndex].description}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                <div className="flex flex-wrap gap-2 md:gap-3">
                                    {memoizedPlatformPillars.map((pillar, index) => (
                                        <button key={pillar.title} onClick={() => setActivePillarIndex(index)} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300", activePillarIndex === index ? "bg-blue-600 text-white shadow-sm" : "bg-muted hover:bg-accent text-muted-foreground")}>
                                            {pillar.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative h-[300px] md:h-[450px] rounded-xl overflow-hidden shadow-xl">
                                <AnimatePresence mode="wait">
                                    <motion.div key={activePillarIndex} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.7 }} className="absolute inset-0">
                                        <Image src={memoizedPlatformPillars[activePillarIndex].backgroundImage} alt={memoizedPlatformPillars[activePillarIndex].title} fill style={{ objectFit: 'cover' }} className="brightness-90" />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </section>

                {/* IN-ACTION SECTION */}
                <AnimatedSection id="in-action" className="bg-gray-900 text-white">
                    <div className="relative z-10 text-center mb-12">
                        <motion.h2 className="text-3xl sm:text-4xl font-bold text-white">The Engine For Every business from strartup to Enterprise.</motion.h2>
                        <motion.p className="mt-4 text-lg text-gray-300">From bustling city markets to the digital frontier, BBU1 is built for ambition.</motion.p>
                    </div>
                    <motion.div className="relative rounded-xl overflow-hidden shadow-2xl h-[400px] md:h-[700px] bg-black/50">
                        <AnimatePresence mode="wait">
                            <motion.div key={currentSlideIndex} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 1.2 }} className="absolute inset-0">
                                <Image src={memoizedSlideshowContent[currentSlideIndex].src} alt={memoizedSlideshowContent[currentSlideIndex].alt} layout="fill" objectFit="cover" className="filter brightness-[0.7]" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white max-w-3xl">
                                    <h3 className="text-2xl md:text-4xl font-bold mb-2">{memoizedSlideshowContent[currentSlideIndex].title}</h3>
                                    <p className="text-base md:text-lg">{memoizedSlideshowContent[currentSlideIndex].description}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                            {memoizedSlideshowContent.map((_, idx) => (
                                <button key={idx} className={cn("h-2 w-2 rounded-full bg-white/50 transition-all", { "bg-white w-4": currentSlideIndex === idx })} onClick={() => setCurrentSlideIndex(idx)} />
                            ))}
                        </div>
                    </motion.div>
                </AnimatedSection>
                
                <DynamicPricingSection />

                {/* --- ENTERPRISE LEAD CAPTURE SECTION (MOVED TO CORRECT POSITION) --- */}
                <AnimatedSection className="bg-blue-600 py-16">
                    <div className="max-w-4xl mx-auto text-center px-4">
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-4">Ready for Sovereign Control?</h2>
                        <p className="text-blue-100 text-lg mb-8 font-medium">Enter your email to receive the BBU1 Enterprise Architecture Whitepaper and a direct line to our Architects.</p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleLeadCapture(formData.get('lead_email') as string);
                            e.currentTarget.reset();
                        }} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                            <Input name="lead_email" type="email" placeholder="Enter business email..." className="h-14 bg-white/10 border-white/20 text-white placeholder:text-blue-200 rounded-2xl focus:ring-white" required />
                            <Button type="submit" className="h-14 px-8 bg-white text-blue-600 font-black uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-all">Get Started</Button>
                        </form>
                    </div>
                </AnimatedSection>

                <PartnerWithUsSection />

                {/* LEGACY WEALTH SECTION */}
                <AnimatedSection className="text-center py-16 md:py-20">
                    <div className="relative py-12 md:py-16 bg-blue-600 text-white rounded-2xl shadow-2xl overflow-hidden">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Build an Enterprise That Lasts Generations</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-white/90">The tools, insights, and platform to revolutionize your business and build a durable legacy.</p>
                        <div className="mt-8">
                            <Button asChild size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 transition-all duration-200">
                                <Link href="/signup">Start Your Free Trial & Build Your Legacy <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                    </div>
                </AnimatedSection>
            </main>

            {mounted && <AdvancedChatWidget />}
            <LandingFooter onManageCookies={openCookiePreferences} />
            <Toast message={toastState.message} isVisible={toastState.visible} />

            {/* COOKIE CONSENT BANNER */}
            {mounted && (
                <AnimatePresence>
                    {showCookieBanner && (
                        <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 z-[100] p-4">
                            <Card className="max-w-xl mx-auto shadow-2xl bg-background/90 backdrop-blur-md">
                                <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" /> Privacy Choice</CardTitle></CardHeader>
                                {!isCustomizingCookies ? (
                                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
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