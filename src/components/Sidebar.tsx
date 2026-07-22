'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- MASTER ICON REGISTRY ---
import {
    LayoutDashboard, ShoppingCart, Clock, Users, BarChart3, History, Boxes, Truck,
    ClipboardCheck, Receipt, BookOpen, ShieldAlert, Banknote, BookCopy, Briefcase, UsersRound,
    ShieldCheck, Settings, Landmark, Home, FileText, Tags, Undo2, LucideIcon,
    Building2, Handshake, ClipboardList, UserCog, Sparkles, ArrowRightLeft, Percent,
    Printer, CalendarDays, ClipboardPlus, Activity, Route, KeyRound, PiggyBank,
    UserCheck as UserCheckIcon, Smartphone, Zap, SlidersHorizontal, FileSpreadsheet, 
    UploadCloud, Plug, Scale, Wallet, FileWarning, Construction, Wrench, FolderKanban, 
    Library, ScrollText, PieChart, Gavel, FileCheck, Calculator, HardHat, Signal, HeartHandshake,
    Thermometer, MapPin, AlertTriangle, FilePlus, FileMinus, Archive, Megaphone, 
    CreditCard, Repeat, FileStack, Loader2, BadgeAlert, Contact, CheckSquare, UserPlus, Package, Utensils,
    Bell, MessageSquare, TrendingUp, ListChecks, GitGraph, Eye, FileClock, Globe, Stethoscope, Pill, 
    Bus, RefreshCcw, Beaker, FlaskConical, Anchor, ArrowUpRight, ArrowDownRight, DollarSign, PlusCircle,
    Send, Factory, FileDigit, PenTool, ListFilter, Hash, Signature, Layers, ChevronDown, Download, Check, Fingerprint,
    ChevronLeft, ChevronRight, Menu, ScanLine, Navigation, ArrowLeftRight, Unlock, Sprout, X, LogOut, Minimize2, Maximize2, User
} from 'lucide-react';

import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTenant } from '@/hooks/useTenant';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

// --- Type Definitions ---
interface NavLink { type: 'link'; href: string; label: string; icon: LucideIcon; roles: string[]; module?: string; businessTypes?: string[]; }
interface SubItem { href:string; label: string; icon: LucideIcon; roles?: string[]; businessTypes?: string[]; }
interface NavAccordion { type: 'accordion'; title: string; icon: LucideIcon; roles: string[]; module: string; businessTypes?: string[]; subItems: SubItem[]; }
type NavItem = NavLink | NavAccordion;

const supabase = createClient();

// --- MASTER NAVIGATION CONFIGURATION ---
const navSections: NavItem[] = [
    {
        type: 'accordion', 
        title: 'System Control', 
        icon: ShieldAlert, 
        roles: ['architect', 'commander'], 
        module: 'admin',
        subItems: [
            { href: '/command-center', label: 'Command Dashboard', icon: Zap },
            { href: '/sovereign-control', label: 'Control Center', icon: ShieldCheck },
            { href: '/tenants', label: 'Tenant Management', icon: Building2 },
            { href: '/telemetry', label: 'System Traffic', icon: Activity },
            { href: '/billing', label: 'Global Finance', icon: Banknote },
        ]
    },

    { type: 'link', href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'manager', 'owner', 'architect', 'commander', 'accountant', 'auditor'] },
    { type: 'link', href: '/copilot', label: 'AI Assistant', icon: Sparkles, roles: ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander'] }, 
    { type: 'link', href: '/time-clock', label: 'Time Clock', icon: Clock, roles: ['admin', 'manager', 'cashier', 'owner', 'architect', 'waiter_staff', 'pharmacist'] },
    
    { 
        type: 'link', 
        href: '/pos', 
        label: 'Point of Sale', 
        icon: ShoppingCart, 
        roles: ['admin', 'manager', 'cashier', 'owner', 'architect', 'pharmacist', 'bartender', 'dsr_rep'], 
        module: 'sales', 
        businessTypes: ['Retail / Wholesale', 'Restaurant / Cafe', 'Mixed/Conglomerate', 'Professional Services', 'Distribution', 'Distribution / Wholesale Supply']
    },
    { 
        type: 'link', href: '/kds', label: 'Kitchen Display (KDS)', icon: Utensils, 
        roles: ['admin', 'manager', 'cashier', 'kitchen', 'owner', 'architect', 'chef'], 
        module: 'sales', 
        businessTypes: ['Restaurant / Cafe', 'Mixed/Conglomerate']
    },
    
    {
        type: 'accordion', title: 'Activities & Logs', icon: ListChecks, roles: ['admin', 'manager', 'auditor', 'owner', 'architect'], 
        module: 'activities',
        subItems: [
            { href: '/activities/timeline', label: 'Timeline', icon: Activity },      
            { href: '/activities/user-feeds', label: 'User Feed', icon: UserCog },  
            { href: '/activities/workflows', label: 'Workflows', icon: GitGraph },       
            { href: '/activities/tasks', label: 'Tasks', icon: ClipboardCheck },
            { href: '/activities/notifications', label: 'Notifications', icon: Bell },       
            { href: '/activities/comments', label: 'Comments', icon: MessageSquare },
        ]
    },

    {
        type: 'accordion', title: 'CRM', icon: Handshake, roles: ['admin', 'manager', 'owner', 'architect', 'marketing_specialist', 'support_agent'], 
        module: 'crm',
        subItems: [ 
            { href: '/crm/leads', label: 'Leads & Pipeline', icon: BarChart3 },
            { href: '/crm/clients', label: 'Clients & Billing', icon: Landmark }, 
            { href: '/crm/marketing', label: 'Marketing', icon: Megaphone }, 
            { href: '/crm/support', label: 'Support', icon: Users }, 
        ]
    },

    {
        type: 'accordion', title: 'eCommerce', icon: Globe, roles: ['admin', 'manager', 'owner', 'architect', 'ecommerce_manager'], 
        module: 'ecommerce',
        subItems: [ 
            { href: '/ecommerce/orders', label: 'Online Orders', icon: ClipboardCheck }, 
            { href: '/ecommerce/returns', label: 'Order Returns', icon: Undo2 }, 
            { href: '/ecommerce/products', label: 'Online Products', icon: Boxes }, 
            { href: '/ecommerce/inventory', label: 'Warehouse Management', icon: Building2 }, 
            { href: '/ecommerce/customers', label: 'Customer 360', icon: Users }, 
            { href: '/ecommerce/abandoned-carts', label: 'Abandoned Carts', icon: AlertTriangle }, 
            { href: '/ecommerce/marketing', label: 'Promotions', icon: Megaphone }, 
            { href: '/ecommerce/payments', label: 'Payment Methods', icon: CreditCard }, 
            { href: '/ecommerce/storefront', label: 'Storefront', icon: Settings }, 
            { href: '/ecommerce/marketplaces', label: 'Marketplaces', icon: Plug }, 
        ]
    },

    {
        type: 'accordion', title: 'Invoicing', icon: Receipt, roles: ['admin', 'manager', 'accountant', 'cashier', 'owner', 'architect', 'pharmacist', 'legal_counsel'], 
        module: 'invoicing',
        subItems: [
            { href: '/invoicing/create', label: 'Create Invoice', icon: FilePlus }, 
            { href: '/invoicing/estimates', label: 'Estimate Terminal', icon: FileText },
            { href: '/invoicing/estimates/history', label: 'Quotation Ledger', icon: FileDigit },
            { href: '/invoicing/estimates/execution', label: 'Execution Terminal', icon: Gavel },
            { href: '/invoicing/payments', label: 'Payment Registry', icon: Handshake },
            { href: '/invoicing/list', label: 'All Invoices', icon: FileStack }, 
            { href: '/invoicing/fx-audit', label: 'FX Forensic Audit', icon: RefreshCcw },
            { href: '/invoicing/compliance', label: 'Compliance Bridge', icon: Landmark },
            { href: '/invoicing/recurring', label: 'Revenue Streams', icon: Repeat },
            { href: '/invoicing/to-be-issued', label: 'Pending Issuance', icon: Clock }, 
            { href: '/invoicing/credit-notes', label: 'Credit Notes', icon: FileMinus }, 
            { href: '/invoicing/debit-notes', label: 'Debit Notes', icon: FilePlus }, 
            { href: '/invoicing/deferred-revenue', label: 'Deferred Revenue', icon: PiggyBank }, 
            { href: '/invoicing/deferred-expenses', label: 'Deferred Expenses', icon: Wallet }, 
        ]
    },

    {
        type: 'accordion', title: 'Reports Center', icon: PieChart, roles: ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'cashier'], 
        module: 'reports',
        subItems: [
            { href: '/reports/finance-hub', label: 'Finance Hub', icon: Landmark },
            { href: '/reports/executive-summary', label: 'Executive Summary', icon: Activity },
            { href: '/reports/income-statement', label: 'Income Statement', icon: TrendingUp },
            { href: '/reports/profit-loss', label: 'Profit & Loss', icon: FileText },
            { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: Scale },
            { href: '/reports/trial-balance', label: 'Trial Balance', icon: Scale },
            { href: '/reports/fiscal', label: 'Fiscal Report', icon: FileCheck },
            { href: '/reports/cash-flow', label: 'Cash Flow', icon: Banknote },
            { href: '/reports/aging', label: 'Aging Reports', icon: History },
            { href: '/reports/reports', label: 'Manufacturing Audit', icon: Factory },
            { href: '/reports/sales', label: 'Sales Reports', icon: BarChart3 },
            { href: '/reports/sales-history', label: 'Sales History', icon: History },
            { href: '/reports/tax', label: 'Tax Liability', icon: Calculator },
            { href: '/reports/forensic-audit', label: 'Forensic Cash Audit', icon: Fingerprint },
            { href: '/reports/audit-trail', label: 'Audit Trail', icon: ShieldCheck },
            { href: '/reports/esg', label: 'ESG & Impact', icon: Handshake },
            { href: '/reports/benchmarking', label: 'Benchmarking', icon: Activity },
        ]
    },

    {
        type: 'accordion', title: 'Sales', icon: BarChart3, roles: ['admin', 'manager', 'owner', 'architect', 'pharmacist', 'cashier'], 
        module: 'sales',
        businessTypes: ['Retail / Wholesale', 'Restaurant / Cafe', 'Distribution', 'Mixed/Conglomerate', 'Professional Services'], 
        subItems: [
            { href: '/customers', label: 'Customers', icon: Users },
            { href: '/returns', label: 'Returns', icon: Undo2 },
            { href: '/dsr', label: 'Daily Sales (DSR)', icon: FileSpreadsheet, roles: ['admin', 'manager', 'owner', 'accountant', 'architect'] },
            { href: '/sales/pricing-rules', label: 'Pricing Rules', icon: Percent },
            { href: '/sales/orders-to-upsell', label: 'Upsell Leads', icon: Activity },
        ]
    },

    {
        type: 'accordion', title: 'Inventory', icon: Boxes, roles: ['admin', 'manager', 'owner', 'architect', 'pharmacist', 'warehouse_manager', 'cashier'], 
        module: 'inventory',
        subItems: [
            { href: '/inventory', label: 'Products & Stock', icon: Boxes },
            { href: '/inventory/scanner', label: 'Scanner Workbench', icon: ScanLine },
            { href: '/inventory/categories', label: 'Categories', icon: Tags }, 
            { href: '/inventory/raw-materials', label: 'Raw Materials', icon: FlaskConical, businessTypes: ['Manufacturing', 'Distribution', 'Retail / Wholesale', 'Restaurant / Cafe'] },
            { href: '/inventory/composites/designer', label: 'Production Catalog', icon: Layers, businessTypes: ['Manufacturing', 'Distribution', 'Retail / Wholesale'] },
            { href: '/inventory/composites', label: 'Recipes', icon: BookOpen, businessTypes: ['Retail / Wholesale', 'Distribution', 'Restaurant / Cafe'] }, 
            { href: '/inventory/work-center', label: 'Work Center', icon: CalendarDays, businessTypes: ['Distribution', 'Retail / Wholesale'] },
            { href: '/inventory/manufacturing-orders', label: 'Manufacturing', icon: Wrench, businessTypes: ['Distribution', 'Retail / Wholesale'] }, 
            { href: '/purchases', label: 'Purchase Orders', icon: Truck },
            { href: '/inventory/adjustments', label: 'Adjustments', icon: ClipboardCheck },
            { href: '/inventory/transfers', label: 'Stock Transfers', icon: ArrowRightLeft }, 
            { href: '/inventory/cycle-counts', label: 'Cycle Counts', icon: ClipboardList },
            { href: '/inventory/valuation', label: 'Valuation', icon: Calculator, roles: ['admin', 'manager', 'accountant'] }, 
            { href: '/inventory/reorder-points', label: 'Reorder Points', icon: Signal },
            { href: '/inventory/replenishment', label: 'Replenishment', icon: ShoppingCart },
            { href: '/inventory/tracking', label: 'Batch/Serial Tracking', icon: Activity }, 
            { href: '/inventory/maintenance', label: 'Maintenance', icon: Wrench },
            { href: '/inventory/repairs', label: 'Repair Tickets', icon: Wrench }, 
        ]
    },

    {
        type: 'accordion',
        title: 'Agribusiness',
        icon: Sprout,
        roles: ['admin', 'manager', 'owner', 'architect', 'accountant', 'auditor', 'farm_manager', 'veterinary_officer'],
        module: 'agri',
        businessTypes: ['Agriculture / Farming', 'Mixed/Conglomerate'],
        subItems: [
            { href: '/agri', label: 'Executive Hub', icon: LayoutDashboard, roles: ['admin', 'manager', 'owner', 'architect', 'accountant', 'auditor'] },
            { href: '/agri/plots', label: 'Land Plot Registry', icon: MapPin, roles: ['admin', 'manager', 'owner', 'architect', 'farm_manager'] },
            { href: '/agri/livestock', label: 'Biological Assets', icon: Fingerprint, roles: ['admin', 'manager', 'owner', 'architect', 'farm_manager', 'veterinary_officer'] },
            { href: '/agri/growth', label: 'Growth Cycles', icon: Activity, roles: ['admin', 'manager', 'owner', 'architect', 'farm_manager', 'accountant'] },
        ]
    },

    {
        type: 'accordion', title: 'Procurement', icon: ScrollText, roles: ['admin', 'manager', 'owner', 'architect', 'procurement_officer'],
        module: 'procurement',
        subItems: [
            { href: '/procurement', label: 'Overview', icon: LayoutDashboard },
            { href: '/procurement/pipeline', label: 'Pipeline', icon: Activity },
            { href: '/procurement/tenders', label: 'Tenders & Bids', icon: Gavel },
            { href: '/procurement/contracts', label: 'Contracts', icon: FileCheck },
            { href: '/procurement/suppliers', label: 'Supplier Register', icon: ShieldCheck },
            { href: '/procurement/approvals', label: 'Approvals', icon: CheckSquare },
            { href: '/procurement/spend', label: 'Spend Analysis', icon: PieChart },
            { href: '/procurement/strategy', label: 'Category Strategy', icon: SlidersHorizontal },
            { href: '/procurement/calendar', label: 'Calendar', icon: CalendarDays },
            { href: '/procurement/agentic-drafts', label: 'AI Drafts', icon: Zap },
        ]
    },

   {
        type: 'accordion', 
        title: 'Audit & Assurance', 
        icon: ShieldCheck, 
        roles: ['admin', 'auditor', 'owner', 'architect'], 
        module: 'audit',
        subItems: [
            { href: '/audit', label: 'Audit Hub', icon: LayoutDashboard }, 
            { href: '/audit/sandbox', label: 'Audit Sandbox', icon: ShieldCheck, roles: ['admin', 'manager', 'auditor', 'accountant', 'owner', 'architect'] },
            { href: '/audit/planning', label: 'Planning Board', icon: CalendarDays },
            { href: '/audit/findings', label: 'Audit Findings', icon: ClipboardList },
            { href: '/audit/controls', label: 'Controls Matrix', icon: ShieldCheck },
            { href: '/audit/trail-viewer', label: 'Trail Viewer', icon: Eye },
            { href: '/audit/ingestion', label: 'Data Ingestion', icon: UploadCloud },
            { href: '/audit/kpi-cards', label: 'KPI Cards', icon: Activity },
            { href: '/audit/logs', label: 'Audit Logs', icon: History }, 
            { href: '/audit/action-workflow', label: 'Workflows', icon: GitGraph },
            { href: '/audit/assignments', label: 'Assignments', icon: UserCog },
            { href: '/audit/files', label: 'File Manager', icon: Archive },
            { href: '/audit/liveguard', label: 'LiveGuard', icon: ShieldAlert },
        ]
    },

    {
        type: 'accordion', 
        title: 'Compliance Hub', 
        icon: Gavel, 
        roles: ['admin', 'manager', 'auditor', 'owner', 'architect', 'accountant', 'commander'], 
        module: 'compliance',
        subItems: [
            { href: '/compliance', label: 'Overview', icon: LayoutDashboard },
            { href: '/compliance/risk-dashboard', label: 'Risk Dashboard', icon: BarChart3 },
            { href: '/compliance/tax-reports', label: 'Tax Report Generator', icon: FileText },
            { href: '/compliance/income-tax', label: 'Income Tax Intelligence', icon: Landmark },
            { href: '/compliance/kyc-aml', label: 'KYC / AML', icon: UserCheckIcon },
            { href: '/compliance/gdpr', label: 'Data Requests', icon: FileText },
            { href: '/compliance/sales-tax', label: 'Sales Tax Intelligence', icon: Calculator },
            { href: '/compliance/regulations', label: 'Regulations', icon: ScrollText },
            { href: '/compliance/permits', label: 'Licenses & Permits', icon: KeyRound },
            { href: '/compliance/policy-library', label: 'Policy Library', icon: Library },
            { href: '/compliance/sanctions', label: 'Sanctions Screening', icon: BadgeAlert },
            { href: '/compliance/drilldown', label: 'Compliance Drilldown', icon: Activity },
            { href: '/compliance/checklist', label: 'Checklist', icon: ListChecks },
            { href: '/compliance/revolutionary-compliance', label: 'Revolutionary Intelligence', icon: Zap },
        ]
    },

    {
        type: 'accordion', 
        title: 'Accounting Tools', 
        icon: Calculator, 
        roles: ['admin', 'accountant', 'architect', 'manager'], 
        module: 'accountant',
        subItems: [
            { href: '/accountant', label: 'Accounting Hub', icon: LayoutDashboard }, 
            { href: '/accountant/ai-assistant', label: 'AI Assistant', icon: Sparkles },
            { href: '/accountant/auditor-management', label: 'Auditor Mgmt', icon: UsersRound }, 
            { href: '/accountant/invite-auditor', label: 'Invite Auditor', icon: UserPlus },
            { href: '/accountant/chart-of-accounts', label: 'Chart of Accounts', icon: ListChecks },
            { href: '/accountant/export', label: 'Data Export', icon: UploadCloud },
        ]
    },

    {
        type: 'accordion', title: 'Professional Services', icon: Briefcase, roles: ['admin', 'manager', 'owner', 'architect', 'lawyer', 'accountant', 'consultant', 'practitioner'], 
        module: 'professional-services',
        businessTypes: ['Professional Services', 'Mixed/Conglomerate'],
        subItems: [
            { href: '/professional-services', label: 'Hub', icon: LayoutDashboard },
            { href: '/professional-services/clients', label: 'Client Hub', icon: Users },
            { href: '/professional-services/projects', label: 'Project Mgmt', icon: FolderKanban },
            { href: '/professional-services/resource-planning', label: 'Resource Planning', icon: UsersRound },
            { href: '/professional-services/billing', label: 'Fee Billing', icon: Receipt },
            { href: '/professional-services/budgets', label: 'Project Budgets', icon: Calculator },
            { href: '/professional-services/documents', label: 'Document Library', icon: Library },
            { href: '/professional-services/reports', label: 'Practice Reports', icon: FileText },
            { href: '/professional-services/expenses', label: 'Expense Mgmt', icon: CreditCard }, 
            { href: '/professional-services/accounting', label: 'General Ledger', icon: BookOpen }, 
            { href: '/professional-services/trust-accounting', label: 'Trust Accounting', icon: Landmark, roles: ['admin', 'accountant', 'lawyer'] },
            { href: '/professional-services/compliance', label: 'Compliance', icon: ShieldAlert }, 
        ]
    },
   
    {
        type: 'accordion',
        title: 'Medical',
        icon: Stethoscope,
        roles: ['admin', 'manager', 'owner', 'architect', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist'],
        module: 'medical',
        businessTypes: ['Healthcare / Medical / Pharmacy', 'Mixed/Conglomerate'],
        subItems: [
            { href: '/medical', label: 'Medical Hub', icon: LayoutDashboard },
            { href: '/medical/patients', label: 'Patient Registry', icon: Users },
            { href: '/medical/encounters', label: 'Encounters & Visits', icon: ClipboardPlus },
            { href: '/medical/prescriptions', label: 'Pharmacy', icon: Pill },
            { href: '/medical/lab-results', label: 'Lab Results', icon: FlaskConical },
            { href: '/medical/vitals', label: 'Vitals & Triage', icon: Thermometer },
        ]
    },

    {
        type: 'accordion', title: 'Human Resources', icon: UsersRound, roles: ['admin', 'manager', 'owner', 'architect', 'hr_manager'],
        module: 'hcm',
        subItems: [ 
            { href: '/hr/dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
            { href: '/hr/directory', label: 'Directory', icon: Contact },
            { href: '/hr/org-chart', label: 'Org Chart', icon: Route },
            { href: '/hr/leave', label: 'Leave Management', icon: CalendarDays }, 
            { href: '/hr/time-attendance', label: 'Attendance', icon: Clock },
            { href: '/hr/recruitment', label: 'Recruitment', icon: UserCheckIcon }, 
            { href: '/hr/onboarding', label: 'Onboarding', icon: ClipboardCheck }, 
            { href: '/hr/offboarding', label: 'Offboarding', icon: Archive }, 
            { href: '/hr/performance', label: 'Performance', icon: Activity }, 
            { href: '/hr/benefits', label: 'Benefits', icon: HeartHandshake },
            { href: '/hr/rewards', label: 'Rewards', icon: Sparkles },
            { href: '/hr/fleet', label: 'Fleet Management', icon: Truck },
        ]
    },

    {
        type: 'accordion', title: 'Accounting', icon: Scale, roles: ['admin', 'manager', 'accountant', 'owner', 'architect', 'auditor'], 
        module: 'finance',
        subItems: [ 
            { href: '/finance/banking', label: 'Banking', icon: Landmark },
            { href: '/accounting/daily-ledger', label: 'Daily Ledger', icon: Banknote },
            { href: '/finance/bills', label: 'Bills & Payables', icon: FileText },
            { href: '/finance/payables', label: 'Accounts Payable', icon: UploadCloud, roles: ['admin', 'accountant', 'owner', 'architect'] },
            { href: '/finance/receivables', label: 'Receivables', icon: FilePlus },
            { href: '/expenses', label: 'Expenses', icon: Wallet },
            { href: '/ledger', label: 'General Ledger', icon: BookOpen, roles: ['admin', 'manager', 'accountant', 'owner', 'architect'] },
            { href: '/finance/journal', label: 'Journal', icon: BookCopy },
            { href: '/finance/tax-returns', label: 'Tax Returns', icon: FileWarning },
            { href: '/finance/fiscal-positions', label: 'Fiscal Positions', icon: Settings },
            { href: '/finance/lock-dates', label: 'Lock Dates', icon: KeyRound },
            { href: '/finance/chart-of-accounts', label: 'Chart of Accounts', icon: Settings },
        ]
    },

    {
        type: 'accordion', title: 'Logistics', icon: Truck, roles: ['admin', 'manager', 'owner', 'architect', 'fleet_manager', 'driver'], 
        module: 'distribution',
        businessTypes: ['Distribution', 'Distribution / Wholesale Supply', 'Mixed/Conglomerate', 'Logistics', 'all'],
        subItems: [ 
            { href: '/distribution', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/distribution/radar', label: 'Fleet Radar', icon: Activity }, 
            { href: '/distribution/dispatch', label: 'Dispatch Workbench', icon: ScanLine },
            { href: '/distribution/handshake', label: 'Handshake Queue', icon: KeyRound },
            { href: '/distribution/aura-master', label: 'Aura Master HUD', icon: Zap },
            { href: '/distribution/manifest-entry', label: 'Global Manifest', icon: Anchor },
            { href: '/distribution/customs', label: 'Forensic Customs', icon: Fingerprint },
            { href: '/distribution/market-intel', label: 'Market Scout', icon: Globe }, 
            { href: '/distribution/routes', label: 'Routes', icon: Route }, 
            { href: '/distribution/assignments', label: 'Assignments', icon: UserCog },
            { href: '/distribution/loading', label: 'Loading', icon: Boxes },
            { href: '/distribution/picking', label: 'Picking Queue', icon: ListChecks },
            { href: '/distribution/handshake', label: 'Delivery Verification', icon: KeyRound },
            { href: '/distribution/tracking', label: 'Active Shipments', icon: Navigation },
            { href: '/distribution/reconciliation', label: 'Returns Reconciliation', icon: ArrowLeftRight },
            { href: '/distribution/settlement', label: 'Settlements', icon: ClipboardCheck },
            { href: '/distribution/fulfillment', label: 'Fulfillment', icon: Package },
            { href: '/distribution/fleet-maintenance', label: 'Fleet Maintenance', icon: Wrench },
            { href: '/distribution/cold-chain', label: 'Cold Chain', icon: Thermometer },
            { href: '/distribution/geofencing', label: 'Geofencing', icon: MapPin },
            { href: '/distribution/performance', label: 'Analytics', icon: BarChart3 },
            { href: '/distribution/returns', label: 'Returns', icon: Undo2 },
        ]
    },

    {
        type: 'accordion', title: 'SACCO & Co-ops', icon: PiggyBank, roles: ['admin', 'manager', 'owner', 'architect', 'sacco_manager', 'teller', 'loan_officer'], 
        module: 'sacco',
        businessTypes: ['SACCO / Co-operative', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/sacco', label: 'Dashboard', icon: LayoutDashboard }, 
            { href: '/sacco/analytics', label: 'Analytics', icon: BarChart3 },
            { href: '/sacco/members', label: 'Members', icon: Users }, 
            { href: '/sacco/new-member', label: 'Register Member', icon: UserPlus },
            { href: '/sacco/kyc', label: 'KYC Manager', icon: ShieldCheck },
            { href: '/sacco/groups', label: 'Groups', icon: UserCog }, 
            { href: '/sacco/contributions', label: 'Contributions', icon: PiggyBank }, 
            { href: '/sacco/collections', label: 'Collections', icon: ClipboardList }, 
            { href: '/sacco/savings-products', label: 'Savings', icon: PiggyBank },
            { href: '/sacco/shares', label: 'Shares', icon: PieChart },
            { href: '/sacco/dividends', label: 'Dividends', icon: Banknote },
            { href: '/sacco/loans', label: 'Loans', icon: FileText }, 
            { href: '/sacco/transactions', label: 'Transactions', icon: ArrowRightLeft },
            { href: '/sacco/finance', label: 'Financial Ledger', icon: BookOpen },
            { href: '/sacco/reports', label: 'Reports', icon: FileText },
            { href: '/sacco/notifications', label: 'Notifications', icon: Bell },
            { href: '/sacco/audit', label: 'Statutory Audit', icon: ShieldCheck, roles: ['auditor', 'admin'] }, 
            { href: '/sacco/api', label: 'API Gateway', icon: Plug },
            { href: '/sacco/agent-portal', label: 'Agent Portal', icon: Smartphone }, 
            { href: '/sacco/admin', label: 'Administration', icon: Settings, roles: ['admin', 'owner'] }, 
        ]
    },

    {
        type: 'accordion', title: 'Lending Portal', icon: Landmark, roles: ['admin', 'manager', 'owner', 'architect', 'loan_officer', 'credit_analyst', 'debt_collector'], 
        module: 'lending',
        businessTypes: ['Lending / Microfinance', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/lending', label: 'Portfolio', icon: LayoutDashboard },
            { href: '/lending/analytics', label: 'Analytics', icon: BarChart3 },
            { href: '/lending/applications', label: 'Applications', icon: FileText }, 
            { href: '/lending/borrowers', label: 'Borrower CRM', icon: Users }, 
            { href: '/lending/officers', label: 'Officers', icon: UserCheckIcon },
            { href: '/lending/kyc', label: 'KYC Manager', icon: ShieldCheck }, 
            { href: '/lending/loans', label: 'Active Loans', icon: FileCheck },
            { href: '/lending/collections', label: 'Collections', icon: AlertTriangle },
            { href: '/lending/risk', label: 'Risk Scoring', icon: BadgeAlert },
            { href: '/lending/repayments', label: 'Repayments', icon: CalendarDays },
            { href: '/lending/products', label: 'Loan Products', icon: Boxes }, 
            { href: '/lending/audit', label: 'Statutory Audit', icon: ShieldCheck }, 
            { href: '/lending/notifications', label: 'Notifications', icon: Bell }, 
            { href: '/lending/api', label: 'API Gateway', icon: Plug },
            { href: '/lending/agent-portal', label: 'Agent Portal', icon: Smartphone }, 
        ]
    },

    {
        type: 'accordion', title: 'Property', icon: Home, roles: ['admin', 'manager', 'owner', 'architect', 'property_manager', 'leasing_agent'], 
        module: 'rentals',
        businessTypes: ['Rentals / Real Estate', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/rentals/properties', label: 'Units', icon: Building2 }, 
            { href: '/rentals/leases', label: 'Leases', icon: FileText }, 
            { href: '/rentals/invoices', label: 'Invoices', icon: Receipt }, 
            { href: '/rentals/maintenance', label: 'Maintenance', icon: Wrench },
        ]
    },

    {
        type: 'accordion', title: 'Telecom', icon: Smartphone, roles: ['admin', 'manager', 'cashier', 'accountant', 'owner', 'architect', 'dsr_rep', 'agent', 'float_manager'], 
        module: 'telecom',
        businessTypes: ['Telecom Services', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/telecom', label: 'Admin Hub', icon: LayoutDashboard, roles: ['admin', 'manager', 'owner', 'architect'] }, 
            { href: '/telecom/operator', label: 'Console', icon: Zap, roles: ['admin', 'float_manager'] }, 
            { href: '/telecom/agents', label: 'Agents', icon: UserCog }, 
            { href: '/telecom/virtual-agent', label: 'Agent Form', icon: Smartphone }, 
            { href: '/telecom/float-requests', label: 'Float', icon: ArrowRightLeft }, 
            { href: '/telecom/products', label: 'Products', icon: Boxes, roles: ['admin', 'manager', 'owner'] }, 
            { href: '/telecom/inventory', label: 'Device Inventory', icon: Boxes }, 
            { href: '/telecom/tariffs', label: 'Tariff Plans', icon: FileSpreadsheet }, 
            { href: '/telecom/subscribers', label: 'Subscribers', icon: Users }, 
            { href: '/telecom/channels', label: 'Partners', icon: Handshake },
            { href: '/telecom/reconciliation', label: 'Reconciliation', icon: ClipboardCheck }, 
            { href: '/telecom/financials', label: 'Financials', icon: Banknote, roles: ['admin', 'manager', 'owner'] }, 
            { href: '/telecom/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager', 'owner'] }, 
            { href: '/telecom/history', label: 'History', icon: History, roles: ['admin', 'manager', 'accountant', 'owner'] }, 
            { href: '/telecom/compliance', label: 'Regulatory', icon: ShieldCheck }, 
            { href: '/telecom/dsr-dashboard', label: 'Field App', icon: Activity, roles: ['cashier', 'owner', 'dsr_rep', 'architect'] }, 
            { href: '/telecom/agent', label: 'Agent Dashboard', icon: Users, roles: ['cashier', 'owner', 'agent', 'architect'] },
            { href: '/telecom/bi', label: 'Analytics', icon: BarChart3 }
        ]
    },

    {
        type: 'accordion', title: 'Field Service', icon: Wrench, roles: ['admin', 'manager', 'owner', 'architect', 'field_technician', 'dispatcher'], 
        module: 'field-service',
        businessTypes: ['Field Service', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/field-service/schedule', label: 'Schedule', icon: CalendarDays, roles: ['dispatcher', 'admin'] }, 
            { href: '/field-service/smart-schedule', label: 'Smart Schedule', icon: Zap },
            { href: '/field-service/work-orders', label: 'Work Orders', icon: ClipboardList }, 
            { href: '/field-service/equipment', label: 'Equipment', icon: Truck }, 
            { href: '/field-service/technician', label: 'Tech Portal', icon: Smartphone, roles: ['field_technician'] },
            { href: '/field-service/analytics', label: 'Analytics', icon: BarChart3 },
            { href: '/field-service/compliance', label: 'Compliance', icon: ShieldCheck },
        ]
    },

    {
        type: 'accordion', title: 'Project Management', icon: Construction, roles: ['admin', 'manager', 'owner', 'architect', 'engineer', 'foreman', 'site_manager'], 
        module: 'contractor',
        businessTypes: ['Contractor', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/contractor', label: 'Dashboard', icon: LayoutDashboard }, 
            { href: '/contractor/jobs', label: 'Job Management', icon: Briefcase }, 
            { href: '/contractor/estimates', label: 'Estimates', icon: FileText }, 
            { href: '/contractor/blueprints', label: 'Blueprints', icon: Library },
            { href: '/contractor/safety', label: 'HSE / Safety', icon: HardHat },
            { href: '/contractor/change-orders', label: 'Change Orders', icon: Undo2 }, 
        ]
    },

    {
        type: 'accordion', title: 'Non-Profit', icon: HeartHandshake, roles: ['admin', 'manager', 'owner', 'architect', 'donor_relations', 'grant_manager', 'volunteer_coordinator'], 
        module: 'nonprofit',
        businessTypes: ['Nonprofit', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/nonprofit', label: 'Overview', icon: LayoutDashboard },
            { href: '/nonprofit/donors', label: 'Donors', icon: Users },
            { href: '/nonprofit/donations', label: 'Donations', icon: Banknote },
            { href: '/nonprofit/grants', label: 'Grants', icon: FileText },
            { href: '/nonprofit/fundraising', label: 'Campaigns', icon: Sparkles },
            { href: '/nonprofit/volunteering', label: 'Volunteers', icon: Handshake },
            { href: '/nonprofit/impact', label: 'Impact Reports', icon: Activity },
            { href: '/nonprofit/communication', label: 'Communication', icon: Signal }, 
        ]
    },

    {
        type: 'accordion', title: 'Appointments', icon: CalendarDays, roles: ['admin', 'manager', 'owner', 'architect'], 
        module: 'booking',
        subItems: [ { href: '/booking', label: 'Calendar', icon: CalendarDays }, { href: '/booking/services', label: 'Services', icon: ClipboardPlus }, ]
    },
    {
        type: 'accordion', title: 'Collaboration', icon: Users, roles: ['admin', 'manager', 'cashier', 'accountant', 'auditor', 'owner', 'architect'], 
        module: 'collaboration',
        subItems: [ { href: '/workbooks', label: 'Workbooks', icon: FileSpreadsheet }, ]
    },
    {
        type: 'accordion', title: 'Business Library', icon: Library, roles: ['admin', 'manager', 'accountant', 'cashier', 'auditor', 'owner', 'architect'], 
        module: 'business-hub',
        subItems: [ { href: '/library', label: 'Documents', icon: Library }, ]
    },

    {
        type: 'accordion', title: 'Management', icon: UserCog, roles: ['admin', 'manager', 'auditor', 'owner', 'architect', 'cashier', 'accountant'], 
        module: 'management',
        subItems: [
            { href: '/management/employees', label: 'Employees', icon: UsersRound, roles: ['admin', 'owner', 'architect'] },
            { href: '/settings/profile', label: 'My Identity', icon: User },
            { href: '/settings/memberships', label: 'Linked Businesses', icon: Building2 },
            { href: '/payroll', label: 'Payroll', icon: Banknote, roles: ['admin', 'manager', 'owner', 'architect', 'accountant'] },
            { href: '/settings/locations', label: 'Branch Locations', icon: Building2, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/locations', label: 'Location Mgmt', icon: Building2, roles: ['admin', 'owner'] },
            { href: '/management/budgets', label: 'Budgeting', icon: Banknote, roles: ['admin', 'manager', 'owner', 'architect'] },
            { href: '/management/comms', label: 'Communication Hub', icon: MessageSquare },   
            { href: '/management/timecard-report', label: 'Attendance Logs', icon: FileSpreadsheet },
            { href: '/management/sentry-hub', label: 'Security Hub', icon: ShieldAlert, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/monitoring', label: 'System Monitor', icon: Activity, roles: ['admin', 'manager', 'owner', 'architect'], businessTypes: ['Retail / Wholesale', 'Distribution'] }, 
            { href: '/loyalty', label: 'Loyalty Program', icon: Percent, roles: ['admin', 'manager', 'owner', 'architect'], businessTypes: ['Retail / Wholesale'] },
            { href: '/shifts', label: 'Shift Reports', icon: ClipboardCheck, roles: ['admin', 'manager', 'owner', 'architect', 'cashier'] },
            { href: '/settings', label: 'General Settings', icon: Settings, roles: ['admin', 'owner', 'architect'] },
            { href: '/settings/branding', label: 'System Branding', icon: Sparkles, roles: ['admin', 'owner', 'architect'] }, 
            { href: '/settings/hardware', label: 'Hardware', icon: Printer, roles: ['admin', 'owner', 'architect'] },
            { href: '/settings/currencies', label: 'Currencies', icon: Banknote, roles: ['admin', 'owner', 'architect'] },
            { href: '/settings/migration', label: 'Data Migration', icon: UploadCloud, roles: ['admin', 'owner', 'architect'] },
            { href: '/marketplace', label: 'App Store', icon: Plug, roles: ['admin', 'owner', 'architect'] },
            { href: '/settings/integrations', label: 'Integrations', icon: Plug, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/api', label: 'API Keys', icon: KeyRound, roles: ['admin', 'owner', 'architect'] }, 
        ]
    },
];

const NavLinkComponent = ({ href, label, Icon, isSidebarOpen, onClick }: { href: string; label: string; Icon: React.ElementType; isSidebarOpen: boolean; onClick?: () => void; }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isSidebarOpen) {
    return (
      <TooltipProvider delay={0}>
        <Tooltip>
          {/* base-ui's Trigger doesn't support Radix-style `asChild` — passing it
              silently no-ops, which left the hover tooltip mis-anchored and
              rendering underneath the sidebar. `render` is the correct prop. */}
          <TooltipTrigger
            render={
              <Link href={href} onClick={onClick}>
                <Button variant={isActive ? "secondary" : "ghost"} size="icon" className={cn("group w-full justify-center transition-all h-10 w-10 mx-auto rounded-xl", isActive && "bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40 text-blue-600 shadow-sm")} aria-label={label}>
                  <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                </Button>
              </Link>
            }
          />
          <TooltipContent side="right" className="font-bold text-[10px] uppercase tracking-widest">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link href={href} onClick={onClick}>
      <Button variant={isActive ? "secondary" : "ghost"} className={cn("group w-full justify-start font-bold text-xs uppercase tracking-tight transition-all h-11 px-4 rounded-xl", isActive ? "bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40 text-blue-600" : "text-slate-500 hover:text-slate-900")}>
        <Icon className="mr-3 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />{label}
      </Button>
    </Link>
  );
};

// Icon-rail representation of an accordion module — clicking it opens the
// flyout submenu next to the rail instead of expanding the whole sidebar.
const ModuleRailIcon = ({ title, Icon, isActive, isOpen, onClick }: { title: string; Icon: React.ElementType; isActive: boolean; isOpen: boolean; onClick: (e: React.MouseEvent) => void; }) => {
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              onClick={onClick}
              variant={isActive || isOpen ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "group w-full justify-center transition-all h-10 w-10 mx-auto rounded-xl",
                (isActive || isOpen) && "bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40 text-blue-600 shadow-sm"
              )}
              aria-label={title}
            >
              <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
            </Button>
          }
        />
        <TooltipContent side="right" className="font-bold text-[10px] uppercase tracking-widest">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isSidebarOpen, toggleSidebar, setIsSidebarOpen } = useSidebar();

    const { role: rawRole, isLoading: isLoadingRole } = useUserRole();
    const { data: rawModules, isLoading: isLoadingModules } = useTenantModules();
    const enabledModules = rawModules || [];
    const { data: tenant, isLoading: isLoadingTenant } = useTenant();
    const { data: profile } = useUserProfile();

    const activeRole = tenant?.user_role || rawRole || profile?.role || "guest";
    const userRole = activeRole.toLowerCase();
    const isNimPaints = tenant?.id === '51342887-69e2-456c-b835-629b8f2b0e49';
    const rawBizType = tenant?.business_type || '';
    const bizType = rawBizType === 'Distribution' ? 'Distribution / Wholesale Supply' :
                    rawBizType === 'Telecom Services' ? 'Telecom & Mobile Money' :
                    rawBizType === 'Nonprofit' ? 'Nonprofit / Education / NGO' :
                    rawBizType === 'Contractor' ? 'Contractor (General, Remodeling)' : 
                    (rawBizType === '' || rawBizType === null) ? 'Mixed/Conglomerate' : rawBizType;

    const isSovereign = ['architect', 'commander'].includes(userRole);
    const isAdminOrOwner = ['admin', 'owner'].includes(userRole);
    const isLoading = isLoadingRole || isLoadingTenant || isLoadingModules;

    const [isMobileView, setIsMobileView] = useState(false);

    // Which module's submenu flyout is open next to the icon rail, and whether
    // that flyout itself has been collapsed down to an icon-only strip.
    const [activeFlyoutModule, setActiveFlyoutModule] = useState<string | null>(null);
    const [isFlyoutMinimized, setIsFlyoutMinimized] = useState(false);

    // 🛡️ MOBILE STATE INITIALIZATION
    useEffect(() => {
        const checkMobile = () => {
            const isMobile = window.innerWidth < 1024;
            setIsMobileView(isMobile);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ✅ UNIVERSAL AUTO-CLOSE ON SELECTION
    useEffect(() => {
        if (isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    }, [pathname]);

    // The flyout is desktop-only — mobile always uses the inline accordion
    // instead, so drop any open flyout the moment we land in mobile view.
    useEffect(() => {
        if (isMobileView) {
            setActiveFlyoutModule(null);
            setIsFlyoutMinimized(false);
        }
    }, [isMobileView]);

    // ✅ SMART EXPANSION LOGIC
    const handleRailExpandClick = (e: React.MouseEvent) => {
        if (!isSidebarOpen && !isMobileView) {
            toggleSidebar();
        }
    };

    const handleModuleRailClick = (e: React.MouseEvent, moduleKey: string) => {
        e.stopPropagation();
        setActiveFlyoutModule(prev => (prev === moduleKey ? null : moduleKey));
        setIsFlyoutMinimized(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Selecting a destination inside the flyout should close it — the module
    // rail icon stays highlighted blue afterwards because that's driven by
    // the current route (isModuleActive), not by whether the flyout is open.
    const closeFlyout = () => {
        setActiveFlyoutModule(null);
        setIsFlyoutMinimized(false);
    };

    const finalNavItems = useMemo(() => {
        if (isLoading) return [];
        return navSections.filter((item) => {
            if (isSovereign) return true;
            if (isNimPaints) {
                if (['activities', 'ecommerce'].includes(item.module || '')) return false;
                if (item.type === 'link' && item.label === 'Kitchen Display (KDS)') return false;
                if (['manager', 'admin'].includes(userRole)) {
                    if (['hcm', 'accountant', 'procurement'].includes(item.module || '')) return false;
                }
                if (item.module === 'sales') return true;
                if (userRole === 'accountant' && (item.module === 'compliance' || item.module === 'finance')) return true;
            }
            const hasRolePermission = item.roles?.map(r => r.toLowerCase()).includes(userRole);
            if (!hasRolePermission) return false;
            if (item.module) {
                const isModuleEnabled = enabledModules?.includes?.(item.module);
                if (!isAdminOrOwner && !isModuleEnabled) return false;
            }
            if (item.businessTypes) {
                const hasBizMatch = item.businessTypes.includes(rawBizType) || item.businessTypes.includes(bizType);
                if (!hasBizMatch) return false;
            }
            return true;
        });
    }, [isLoading, userRole, enabledModules, tenant, bizType, rawBizType, isSovereign, isAdminOrOwner, isNimPaints]);

    const activeAccordionValue = useMemo(() => {
        for (const section of navSections) {
            if (section.type === 'accordion' && section.subItems?.some(sub => pathname.startsWith(sub.href))) {
                return section.module;
            }
        }
        return undefined;
    }, [pathname]);

    // Shared by both the inline accordion (expanded mode) and the rail flyout
    // (collapsed mode) so role/business-type visibility rules stay in one place.
    const getFilteredSubItems = (item: NavAccordion) => item.subItems.filter(sub => {
        if (isSovereign) return true;
        if (userRole === 'cashier') {
            if (item.module === 'sales' && !['/customers', '/returns'].includes(sub.href)) return false;
            const cashierInventoryLinks = ['/inventory', '/inventory/categories', '/inventory/adjustments', '/purchases'];
            if (item.module === 'inventory' && !cashierInventoryLinks.includes(sub.href)) return false;
            const cashierReportLinks = ['/reports/sales', '/reports/sales-history'];
            if (item.module === 'reports' && !cashierReportLinks.includes(sub.href)) return false;
            if (item.module === 'management' && sub.href !== '/shifts') return false;
        }
        const roleOk = !sub.roles || sub.roles.map(r => r.toLowerCase()).includes(userRole);
        const bizOk = !sub.businessTypes || (sub.businessTypes.includes(rawBizType) || sub.businessTypes.includes(bizType));
        return roleOk && bizOk;
    });

    const flyoutModuleItem = useMemo(
        () => finalNavItems.find((item): item is NavAccordion => item.type === 'accordion' && item.module === activeFlyoutModule),
        [finalNavItems, activeFlyoutModule]
    );
    const flyoutSubItems = useMemo(
        () => (flyoutModuleItem ? getFilteredSubItems(flyoutModuleItem) : []),
        [flyoutModuleItem, isSovereign, userRole, rawBizType, bizType]
    );

    // Desktop rendering — module submenus never expand inline here, they
    // always open as a flyout next to the sidebar. `expanded` only changes
    // whether each row shows a label alongside its icon.
    const renderDesktopNav = (items: NavItem[], expanded: boolean) => (
        <div className="space-y-1.5">
            {items.map((item) => {
                if (item.type === 'link') {
                    return (
                        <NavLinkComponent
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            Icon={item.icon}
                            isSidebarOpen={expanded}
                        />
                    );
                }
                const filteredSubItems = getFilteredSubItems(item);
                if (filteredSubItems.length === 0) return null;
                const isModuleActive = activeAccordionValue === item.module;
                const isFlyoutOpenForThis = activeFlyoutModule === item.module;

                if (!expanded) {
                    return (
                        <ModuleRailIcon
                            key={item.module}
                            title={item.title}
                            Icon={item.icon}
                            isActive={isModuleActive}
                            isOpen={isFlyoutOpenForThis}
                            onClick={(e) => handleModuleRailClick(e, item.module)}
                        />
                    );
                }

                return (
                    <button
                        key={item.module}
                        type="button"
                        onClick={(e) => handleModuleRailClick(e, item.module)}
                        className={cn(
                            "group w-full flex items-center gap-3 h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-tight transition-all",
                            (isModuleActive || isFlyoutOpenForThis) ? "bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <item.icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                        <span className="flex-1 text-left truncate">{item.title}</span>
                        {/* Points sideways — this opens a flyout beside the sidebar, it never expands in place. */}
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
                    </button>
                );
            })}
        </div>
    );

    // Mobile only — inline accordion expand-in-place. Desktop always uses the
    // flyout (renderDesktopNav) regardless of whether the rail is expanded.
    const renderAccordionNav = (items: NavItem[]) => (
        <Accordion defaultValue={activeAccordionValue ? [activeAccordionValue] : []} className="w-full space-y-1">
            {items.map((item) => {
                if (item.type === 'link') {
                    return (
                        <NavLinkComponent
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            Icon={item.icon}
                            isSidebarOpen={isSidebarOpen}
                        />
                    );
                }
                if (item.type === 'accordion') {
                    const filteredSubItems = getFilteredSubItems(item);

                    if (filteredSubItems.length === 0) return null;
                    const isModuleActive = activeAccordionValue === item.module;

                    return (
                        <AccordionItem key={item.module} value={item.module} className="not-last:border-b-0">
                            <AccordionTrigger className={cn("group px-4 py-3 text-xs font-bold uppercase tracking-tight rounded-xl hover:bg-slate-50 hover:no-underline transition-colors", isModuleActive && "text-blue-600 bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40")}>
                                <div className="flex items-center flex-1">
                                    <item.icon className="mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                                    <span>{item.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-6 pt-1 space-y-1 pb-2">
                                {filteredSubItems.map(subItem => {
                                    const isSubItemActive = pathname.startsWith(subItem.href);
                                    return (
                                        <Link
                                            key={subItem.href}
                                            href={subItem.href}
                                            className={cn("group flex items-center py-2.5 px-4 text-[11px] font-bold uppercase tracking-wide rounded-xl no-underline hover:no-underline transition-all", isSubItemActive ? "text-blue-600 bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50/20")}
                                        >
                                            <subItem.icon className="mr-3 h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" /><span>{subItem.label}</span>
                                        </Link>
                                    );
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    );
                }
                return null;
            })}
        </Accordion>
    );

    return (
        <>
            {/* MOBILE OVERLAY BACKDROP */}
            {isMobileView && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 z-[90] backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                onClick={handleRailExpandClick}
                className={cn(
                    // Flush, edge-to-edge panel — no floating card margin, no
                    // rounded corners, no drop shadow. A right border does the
                    // job of separating it from the main content instead.
                    "h-full lg:h-dvh bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-[transform,opacity,width] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] z-[150] shrink-0",
                    "fixed lg:sticky top-0 left-0",
                    !isSidebarOpen
                        ? "-translate-x-full opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto lg:w-20"
                        : "translate-x-0 opacity-100 pointer-events-auto w-full sm:w-80 lg:w-72",

                    !isSidebarOpen && !isMobileView && "lg:cursor-pointer"
                )}
            >
                <div className={cn("flex items-center border-b border-slate-100 px-4 flex-shrink-0 bg-white relative z-[110] h-16", isSidebarOpen ? "justify-between" : "justify-center")}>
                    {/* Mirrors the identity shown in the top Header bar, so it's still visible while the mobile drawer covers the header. */}
                    {isSidebarOpen && (
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-sm shadow-blue-600/30">
                                {(profile?.full_name || "A").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-black text-slate-900 truncate min-w-0">
                                {profile?.full_name || "Authorized Operator"}
                            </span>
                        </div>
                    )}
                    {/* The only close/collapse control now — bigger and higher-contrast
                        than before (it used to be barely visible, especially on mobile
                        where it was the sole way to dismiss the drawer). */}
                    <Button onClick={(e) => { e.stopPropagation(); toggleSidebar(); }} variant="ghost" size="icon" className={cn("h-11 w-11 text-slate-600 border border-slate-200 bg-slate-50 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all rounded-xl shrink-0 shadow-sm", !isSidebarOpen && "bg-blue-50 text-blue-600 border-blue-100 shadow-sm")}>
                        {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>

                <nav className="flex-1 min-h-0 px-4 space-y-1 overflow-y-auto pt-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4 opacity-40"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                    ) : (
                        <div className="animate-in fade-in duration-700">
                            {isMobileView ? renderAccordionNav(finalNavItems) : renderDesktopNav(finalNavItems, isSidebarOpen)}
                        </div>
                    )}
                </nav>

                <div className={cn("p-4 mt-auto border-t border-slate-100 space-y-3 bg-white", !isSidebarOpen && "flex flex-col items-center")}>
                    {(['cashier', 'accountant', 'admin', 'owner'].includes(userRole)) && isSidebarOpen && (
                        <Button variant="secondary" className="group w-full h-auto py-2.5 px-3 justify-start bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-100 rounded-xl shadow-sm" asChild>
                            <Link href="/accounting/daily-ledger" className="flex items-center gap-3 no-underline hover:no-underline">
                                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-white text-blue-500 shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                                    <Unlock size={15} />
                                </span>
                                <span className="flex flex-col items-start leading-tight text-left min-w-0">
                                    <span className="text-[11px] font-black uppercase tracking-wide">Open / Seal</span>
                                    <span className="text-[9px] font-semibold text-blue-500/80 normal-case truncate">Daily Register</span>
                                </span>
                            </Link>
                        </Button>
                    )}
                    <Button variant="default" className={cn("group w-full justify-start bg-slate-900 hover:bg-red-600 text-white font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-95 h-12 rounded-xl", !isSidebarOpen && "justify-center px-0 w-12")} onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
                        <LogOut className={cn("h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5", isSidebarOpen && "mr-3")} />
                        {isSidebarOpen && <span className="text-xs uppercase tracking-tight">Sign Out</span>}
                    </Button>
                    <Link href="/settings" className="w-full">
                        <Button variant="ghost" className={cn("w-full justify-start text-slate-500 font-bold hover:bg-slate-50 hover:text-blue-600 transition-all group h-11 rounded-xl", !isSidebarOpen && "justify-center px-0 w-11 mx-auto")}>
                            <Settings className={cn("h-5 w-5 transition-transform duration-200 group-hover:rotate-45", isSidebarOpen && "mr-3")} />
                            {isSidebarOpen && <span className="text-xs uppercase tracking-tight">Settings</span>}
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* SUBMENU FLYOUT — opens next to the collapsed icon rail when a module
                icon is clicked, instead of expanding the whole sidebar. Can be
                shrunk to an icon-only strip or closed independently. */}
            {activeFlyoutModule && flyoutModuleItem && !isMobileView && (
                <>
                    <div
                        className="fixed inset-0 z-[145]"
                        onClick={() => { setActiveFlyoutModule(null); setIsFlyoutMinimized(false); }}
                    />
                    <div
                        className={cn(
                            // Flush against the rail/expanded sidebar, same as the
                            // sidebar itself now — no rounding, no floating shadow,
                            // just a border to read as a distinct panel. Starts below
                            // the top header bar (mt-3/mt-4 + h-16 ≈ 5rem) instead of
                            // top-0, so it no longer covers the company name there.
                            "fixed top-20 h-[calc(100dvh-5rem)] bg-white border-r border-slate-200 z-[148] flex flex-col overflow-hidden transition-[left,width] duration-200",
                            isSidebarOpen ? "left-72" : "left-20",
                            isFlyoutMinimized ? "w-20" : "w-72"
                        )}
                    >
                        <div className={cn("flex items-center border-b border-slate-100 px-4 flex-shrink-0 h-16", isFlyoutMinimized ? "justify-center" : "justify-between")}>
                            {!isFlyoutMinimized && (
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <flyoutModuleItem.icon className="h-5 w-5 text-blue-600 shrink-0" />
                                    <span className="text-xs font-black uppercase tracking-tight text-slate-900 truncate">{flyoutModuleItem.title}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    onClick={() => setIsFlyoutMinimized(prev => !prev)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    aria-label={isFlyoutMinimized ? "Expand submenu" : "Minimize submenu"}
                                >
                                    {isFlyoutMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </Button>
                                {!isFlyoutMinimized && (
                                    <Button
                                        onClick={() => { setActiveFlyoutModule(null); setIsFlyoutMinimized(false); }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                        aria-label="Close submenu"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3 py-4 space-y-1">
                            {flyoutSubItems.map(subItem => {
                                const isSubItemActive = pathname.startsWith(subItem.href);
                                if (isFlyoutMinimized) {
                                    return (
                                        <TooltipProvider key={subItem.href} delay={0}>
                                            <Tooltip>
                                                <TooltipTrigger
                                                    render={
                                                        <Link href={subItem.href} onClick={closeFlyout}>
                                                            <Button variant={isSubItemActive ? "secondary" : "ghost"} size="icon" className={cn("w-full h-10 mx-auto rounded-xl", isSubItemActive && "bg-blue-500/10 ring-1 ring-blue-500/40 text-blue-600")} aria-label={subItem.label}>
                                                                <subItem.icon className="h-4.5 w-4.5" />
                                                            </Button>
                                                        </Link>
                                                    }
                                                />
                                                <TooltipContent side="right" className="font-bold text-[10px] uppercase tracking-widest">{subItem.label}</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                }
                                return (
                                    <Link
                                        key={subItem.href}
                                        href={subItem.href}
                                        onClick={closeFlyout}
                                        className={cn("group flex items-center py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide rounded-xl no-underline hover:no-underline transition-all", isSubItemActive ? "text-blue-600 bg-blue-500/10 backdrop-blur-md ring-1 ring-blue-500/40" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50/20")}
                                    >
                                        <subItem.icon className="mr-3 h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" /><span>{subItem.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}