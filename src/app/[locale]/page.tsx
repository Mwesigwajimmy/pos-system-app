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
import { toast } from 'sonner'; 
import { createClient } from '@/lib/supabase/client'; 

import {
    Banknote, Bot, BrainCircuit, Facebook, Handshake, ShieldCheck, TrendingUp, Landmark, Leaf, Linkedin, LucideIcon, Menu, ArrowRight, Utensils, WifiOff, Rocket, Send, Signal, Store, Twitter, Users, X, Zap, ShieldHalf, LayoutGrid, Lightbulb, Wallet, ClipboardList, Package, UserCog, Files, Download, Share, Sparkles, Loader2, CheckCircle, Briefcase, Globe, BarChart3, Clock, Scale, Phone, Building, Wrench, HeartHandshake, Car, PawPrint, Megaphone, Palette, FileText, Settings, KeyRound, Cloud, GitBranch, BadgeCheck, Coins, PiggyBank, ReceiptText, Barcode, Warehouse, ShoppingCart, CalendarDays, LineChart, MessageSquareText, HelpCircle, Book, CircleDollarSign, DownloadCloud, Truck, Mail, Globe2, Target
} from 'lucide-react';

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

    industryItems: [
        { 
            name: "Retail / Wholesale", 
            icon: Store, 
            description: "Unified POS, inventory, and CRM for retail operations.", 
            fullDescription: "Transform your retail business with a unified commerce platform that connects your physical stores, e-commerce, and warehouse in real-time.",
            keyFeatures: ["Integrated POS with offline capability", "Real-time inventory synchronization", "Customer loyalty & gift card management", "Matrix inventory for size/color variants"],
            category: 'Common', 
            backgroundImage: "/images/showcase/grocery-store-bbu1.jpg" 
        },
        { 
            name: "Restaurant / Cafe", 
            icon: Utensils, 
            description: "Complete management with KDS, tables, and recipes.", 
            fullDescription: "Run a tighter kitchen and a happier front-of-house. Minimize food waste and maximize table turnover.",
            keyFeatures: ["Kitchen Display System (KDS) integration", "Recipe costing & margin analysis", "Table management & split billing", "Ingredient-level stock deduction"],
            category: 'Common', 
            backgroundImage: "/images/showcase/restaurant-kitchen-orders.jpg" 
        },
        { 
            name: "Professional Services", 
            icon: Briefcase, 
            description: "Project tracking and time billing for agencies.", 
            fullDescription: "For consultancies, law firms, and agencies, time is money. Capture and invoice billable hours accurately.",
            keyFeatures: ["Automated time tracking & timesheets", "Project profitability analysis", "Retainer management & recurring billing", "Client portal for approvals"],
            category: 'Common', 
            backgroundImage: "/images/showcase/modern-office-team.jpg" 
        },
        { 
            name: "Manufacturing", 
            icon: Wrench, 
            description: "BOM, production planning, and work orders.", 
            fullDescription: "Manage complex Bills of Materials (BOM), track work-in-progress, and calculate exact costs.",
            keyFeatures: ["Multi-level Bill of Materials (BOM)", "Production scheduling & Work Orders", "Raw material demand forecasting", "Waste & scrap tracking"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/produce-inspection.jpg" 
        },
        { 
            name: "Construction & Engineering", 
            icon: Building, 
            description: "Job costing and project management.", 
            fullDescription: "Manage job costing, track equipment on site, and handle progress billing efficiently.",
            keyFeatures: ["Project job costing", "AIA style progress billing", "Subcontractor management", "Equipment & tool tracking"],
            category: 'Trades & Services', 
            backgroundImage: "/images/showcase/construction-site.jpg" 
        },
        { 
            name: "Field Service Management", 
            icon: Car, 
            description: "Scheduling and technician tracking.", 
            fullDescription: "Optimize your mobile workforce. Dispatch jobs, track location, and collect payments on-site.",
            keyFeatures: ["Visual dispatch board", "Mobile app for field technicians", "On-site invoicing & signature capture", "Maintenance contracts"],
            category: 'Trades & Services', 
            backgroundImage: "/images/showcase/logistics-handheld-scanner.jpg" 
        },
        { 
            name: "Distribution & Logistics", 
            icon: Package, 
            description: "Warehouse management and fleet optimization.", 
            fullDescription: "Advanced warehouse tools. Optimize routes, track maintenance, and ensure on-time delivery.",
            keyFeatures: ["Bin location & warehouse mapping", "Barcode/QR scanning mobile app", "Fleet maintenance tracking", "Delivery route optimization"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/ai-warehouse-logistics.jpg" 
        },
        { 
            name: "Lending / Microfinance", 
            icon: Banknote, 
            description: "Loan accounts, disbursements, and portfolio management.", 
            fullDescription: "Core banking module for lenders. Manage applications, credit scoring, and repayment tracking.",
            keyFeatures: ["Loan origination & credit scoring", "Automated penalty & interest calculation", "Portfolio at Risk (PAR) reporting", "SMS repayment reminders"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/mobile-money-agent.jpg" 
        },
        { 
            name: "Real Estate & Property Management", 
            icon: KeyRound, 
            description: "Property management and tenant billing.", 
            fullDescription: "Centralize your portfolio. Automate rent invoicing and track maintenance requests.",
            keyFeatures: ["Lease contract management", "Automated rent invoicing & collection", "Maintenance ticket tracking", "Landlord & owner statements"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/office-admin-bbU1.jpg" 
        },
        { 
            name: "SACCO / Co-operative", 
            icon: Users, 
            description: "Member management and dividend calculation.", 
            fullDescription: "Manage member shares, savings, and loans with transparency and automation.",
            keyFeatures: ["Member registry & KYC", "Share capital management", "Savings & deposit tracking", "Dividend calculation engine"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/community-group-meeting.jpg" 
        },
        { 
            name: "Telecom Services", 
            icon: Signal, 
            description: "Mobile money, airtime, and agent networks.", 
            fullDescription: "The backbone for telecom dealers. Manage agent hierarchies and reconcile float in real-time.",
            keyFeatures: ["Agent hierarchy & commission structures", "Real-time float monitoring", "Bulk airtime/data distribution", "Fraud detection algorithms"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/mobile-money-agent.jpg" 
        },
        { 
            name: "Nonprofit & NGOs", 
            icon: HeartHandshake, 
            description: "Donor management and fund accounting.", 
            fullDescription: "Track restricted funds and donor relationships while ensuring international grant compliance.",
            keyFeatures: ["Grant & fund accounting", "Donor CRM & pledge tracking", "Program budget vs. actuals", "Impact reporting metrics"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/community-group-meeting.jpg" 
        },
        { 
            name: "Healthcare & Clinics", 
            icon: ClipboardList, 
            description: "Patient management and medical inventory.", 
            fullDescription: "Integrated practice management. Handle registration, appointments, and EMR.",
            keyFeatures: ["Patient EMR/EHR", "Appointment scheduling & reminders", "Pharmacy inventory & expiry tracking", "Insurance billing integration"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/healthcare-team.jpg" 
        },
        { 
            name: "Education & Institutions", 
            icon: Book, 
            description: "Student systems and fee management.", 
            fullDescription: "Run your institution efficiently. Manage admissions and academic records.",
            keyFeatures: ["Student Information System (SIS)", "Fee structure management & billing", "Academic grading & reports", "Parent & Teacher portals"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/education-dashboard.jpg" 
        },
        { 
            name: "Agriculture & Agribusiness", 
            icon: Leaf, 
            description: "Farm management and crop tracking.", 
            fullDescription: "Digital precision for agribusiness. Track inputs and harvest yields.",
            keyFeatures: ["Crop cycle & harvest tracking", "Livestock genealogy & health records", "Farm input inventory control", "Field mapping & labor tracking"],
            category: 'Specialized', 
            backgroundImage: "/images/showcase/agriculture-tech.jpg" 
        },
        { 
            name: "Creative Agencies", 
            icon: Palette, 
            description: "Portfolio tracking and client billing.", 
            fullDescription: "Manage the business side of creativity. Track time against creative briefs.",
            keyFeatures: ["Digital asset management", "Retainer & milestone billing", "Freelancer portal", "Project collaboration tools"],
            category: 'Creative & Digital', 
            backgroundImage: "/images/showcase/creative-agency-pm.jpg" 
        },
        { 
            name: "Tech & Software", 
            icon: Cloud, 
            description: "Subscription billing and issue tracking.", 
            fullDescription: "Scale your SaaS business. Manage MRR and track customer churn.",
            keyFeatures: ["Subscription & recurring billing", "Churn & MRR analytics", "Helpdesk & issue tracking", "SLA management"],
            category: 'Creative & Digital', 
            backgroundImage: "/images/showcase/future-of-business-tech.jpg" 
        },
    ] as IndustryItem[],
    faqItems: [
        { q: 'What is BBU1?', a: 'BBU1 (Business Base Universe) is an all-in-one operating system for businesses, unifying accounting, CRM, inventory, HR, project management, and AI-powered insights into a single, intelligent platform.' },
        { q: 'How does the AI Copilot Aura work?', a: 'Aura analyses your company-wide data in real-time to find patterns and provide simple, actionable insights.' },
        { q: 'Is my enterprise data secure?', a: 'Yes. BBU1 uses bank-level encryption, multi-tenant isolation, and multi-factor authentication.' },
    ] as FaqItem[],
    termsOfService: (<div>Enterprise Grade Terms...</div>),
    privacyPolicy: (<div>Enterprise Privacy Policy...</div>),
    cookieCategories: [
        { id: 'essential', name: 'Essential Cookies', description: 'Crucial for basic functionality.', isRequired: true, defaultChecked: true },
        { id: 'analytics', name: 'Analytics Cookies', description: 'Helps us measure site performance.', isRequired: false, defaultChecked: false },
        { id: 'marketing', name: 'Marketing Cookies', description: 'Used for relevant advertising.', isRequired: false, defaultChecked: false }
    ] as CookieCategoryInfo[],
};

// --- Framer Motion Variants ---
const sectionVariants: Variants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.2 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const textVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }, exit: { opacity: 0, y: -20, transition: { duration: 0.5, ease: "easeIn" } } };
const heroImageVariants: Variants = { initial: { scale: 1 }, animate: { scale: [1, 1.05, 1], transition: { duration: 20, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" } } };

// --- ListItem Component ---
const ListItem = forwardRef<ElementRef<"div">, ComponentPropsWithoutRef<"div"> & { icon: LucideIcon }>(({ className, title, children, icon: Icon, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-start select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-blue-100 hover:text-blue-900 focus:bg-blue-100 focus:text-blue-900 dark:hover:bg-blue-900/30 dark:hover:text-blue-100 cursor-pointer", className)} {...props}>
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md mr-4 mt-1"><Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div>
        <div>
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">{children}</p>
        </div>
    </div>
));
ListItem.displayName = "ListItem";

const AnimatedSection = ({ children, className, id }: { children: ReactNode; className?: string; id?: string; }) => (
    <motion.section id={id} className={cn("relative py-16 sm:py-20 overflow-hidden", className)} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}><div className="container mx-auto px-4 relative z-10">{children}</div></motion.section>
);

const Toast = ({ message, isVisible }: { message: string, isVisible: boolean }) => (
    <AnimatePresence>{isVisible && <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-6 z-[150] flex items-center gap-3 rounded-lg bg-blue-600 text-white p-4 shadow-2xl"><CheckCircle className="h-6 w-6 text-green-400" /><p className="font-medium">{message}</p></motion.div>}</AnimatePresence>
);

// --- FullScreenDialog Component ---
interface FullScreenDialogProps { children: ReactNode; title: string; description?: string; backgroundImage?: string; icon?: LucideIcon; onClose?: () => void; }
const FullScreenDialog = ({ children, title, description, backgroundImage, icon: Icon, onClose }: FullScreenDialogProps) => (
    <DialogContent className="!fixed !inset-0 !left-0 !top-0 !z-[200] !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !border-none p-0 flex flex-col animate-in slide-in-from-bottom-full duration-500">
        {backgroundImage && <Image src={backgroundImage} alt={title} fill style={{ objectFit: 'cover' }} className="absolute inset-0 z-0 opacity-20 filter brightness-[0.6]" />}
        <div className="relative z-10 flex flex-col h-full w-full bg-background/90 backdrop-blur-lg">
            <DialogHeader className="p-6 md:p-8 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                    <DialogTitle className="text-3xl font-bold flex items-center gap-3">{Icon && <Icon className="h-8 w-8 text-blue-600" />} {title}</DialogTitle>
                    <DialogClose asChild><Button variant="ghost" size="icon" onClick={onClose}><X className="h-6 w-6" /></Button></DialogClose>
                </div>
                {description && <DialogDescription className="mt-2 text-lg">{description}</DialogDescription>}
            </DialogHeader>
            <ScrollArea className="flex-grow p-6 md:p-8">{children}</ScrollArea>
        </div>
    </DialogContent>
);

// --- MegaMenuHeader Component ---
const MegaMenuHeader = () => {
    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2 font-bold text-lg text-blue-600"><Rocket className="h-6 w-6" /> <span>{siteConfig.name}</span></Link>
                <div className="flex items-center gap-4"><Link href="/login" className="text-sm font-medium">Log In</Link><Button asChild className="bg-blue-600"><Link href="/signup">Get Started</Link></Button><ModeToggle /></div>
            </div>
        </header>
    );
};

// --- LandingFooter Component ---
const LandingFooter = ({ onManageCookies }: { onManageCookies: () => void }) => (
    <footer className="bg-slate-950 text-slate-200 py-16 border-t border-slate-800"><div className="container mx-auto px-4 text-center">© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</div></footer>
);

// --- AdvancedChatWidget Component ---
const AdvancedChatWidget = () => {
    const { messages, append, isLoading }: any = useChat({ api: '/api/chat' });
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-blue-600 z-50"><Bot /></Button>
            <AnimatePresence>{isOpen && <motion.div className="fixed bottom-24 right-6 w-80 h-[500px] bg-white shadow-2xl z-50 rounded-lg p-4 border flex flex-col">AI Copilot UI here...</motion.div>}</AnimatePresence>
        </>
    );
};

// --- PRICING COMPONENTS ---
const DynamicPricingSection = () => (
    <section className="py-24 bg-background"><div className="container mx-auto text-center"><h2 className="text-4xl font-bold">Standard Pricing for Enterprises</h2></div></section>
);

// --- PARTNER WITH US SECTION ---
const PartnerWithUsSection = () => (
    <AnimatedSection className="bg-slate-50 py-16"><div className="container mx-auto text-center"><h2>Partner with BBU1 Ecosystem</h2></div></AnimatedSection>
);

// --- HomePage Component ---
export default function HomePage() {
    // --- FIXED: SUPABASE AND MOUNT STATE ---
    const supabase = createClient();
    const [mounted, setMounted] = useState(false);
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [toastState, setToastState] = useState<ToastState>({ visible: false, message: '' });

    const rotatingTexts = ["We are part of your business.", "From startup to enterprise.", "For every ambition."];

    // --- FIXED: TELEMETRY TRACKING INSIDE COMPONENT ---
    useEffect(() => {
        setMounted(true);
        const trackVisitor = async () => {
            try {
                await supabase.from('system_global_telemetry').insert({
                    event_category: 'VISIT',
                    event_name: 'Landing Page Access',
                    metadata: {
                        path: window.location.pathname,
                        userAgent: navigator.userAgent
                    }
                });
            } catch (err) {
                console.error("Telemetry link failed:", err);
            }
        };

        trackVisitor();

        const interval = setInterval(() => { 
            setCurrentTextIndex(p => (p + 1) % rotatingTexts.length); 
        }, TEXT_ROTATION_INTERVAL);

        return () => clearInterval(interval);
    }, [supabase, rotatingTexts.length]);

    // --- FIXED: LEAD CAPTURE HANDLER INSIDE COMPONENT ---
    const handleLeadCapture = async (email: string) => {
        if (!email || !email.includes('@')) {
            toast.error("Please enter a valid business email.");
            return;
        }
        try {
            const { error } = await supabase.from('system_marketing_leads').insert({ 
                email: email.toLowerCase().trim(),
                metadata: { source: 'Landing Page Lead Magnet' }
            });
            if (error && error.code !== '23505') throw error;
            showToast("Welcome packet dispatched to your email!");
        } catch (err) {
            console.error(err);
            showToast("Connection established, but packet delayed.");
        }
    };

    const showToast = useCallback((message: string) => {
        setToastState({ visible: true, message });
        setTimeout(() => setToastState({ visible: false, message: '' }), TOAST_DURATION);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex flex-col min-h-screen">
            <MegaMenuHeader />
            
            <main className="flex-grow">
                {/* HERO SECTION */}
                <section id="hero" className="relative pt-24 pb-32 text-center bg-slate-900 text-white min-h-[600px] flex items-center justify-center">
                    <div className="container mx-auto z-10">
                        <motion.h1 className="text-5xl font-bold mb-6">The One Platform <br /> 
                            <span className="text-blue-400">{rotatingTexts[currentTextIndex]}</span>
                        </motion.h1>
                        <div className="flex justify-center gap-4">
                            <Button size="lg" className="bg-blue-600">Start Free Trial</Button>
                            <Button variant="outline" size="lg" className="text-white">Request Demo</Button>
                        </div>
                    </div>
                </section>

                <DynamicPricingSection />

                {/* --- FIXED: LEAD CAPTURE SECTION (MOVED INSIDE RETURN) --- */}
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

                <PartnerWithUsSection />
            </main>

            <LandingFooter onManageCookies={() => {}} />
            <AdvancedChatWidget />
            <Toast message={toastState.message} isVisible={toastState.visible} />
        </div>
    );
}