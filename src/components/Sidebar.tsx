'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useCopilot } from '@/context/CopilotContext'; 

import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/core/BrandingProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BusinessSwitcher from '@/components/layout/BusinessSwitcher';

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
    Send, Factory, FileDigit, PenTool, ListFilter, Hash, Signature, Layers, ChevronDown, Download, Check, Fingerprint
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

// --- MASTER NAVIGATION CONFIGURATION ---
// UPGRADE: 'module' keys now strictly match the database slugs verified in the forensic audit.
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
        // Authorized Roles: Includes standard sales roles plus your specialized DSR reps
        roles: ['admin', 'manager', 'cashier', 'owner', 'architect', 'pharmacist', 'bartender', 'dsr_rep'], 
        module: 'sales', // Technical Slug matching public.modules
        // Industry Logic: Now explicitly includes Distribution sectors for Nim Paints
        businessTypes: [
            'Retail / Wholesale', 
            'Restaurant / Cafe', 
            'Mixed/Conglomerate', 
            'Professional Services', 
            'Distribution', 
            'Distribution / Wholesale Supply'
        ]
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
        type: 'accordion', title: 'Reports Center', icon: PieChart, roles: ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect'], 
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
        type: 'accordion', title: 'Sales', icon: BarChart3, roles: ['admin', 'manager', 'owner', 'architect', 'pharmacist'], 
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
        type: 'accordion', title: 'Inventory', icon: Boxes, roles: ['admin', 'manager', 'owner', 'architect', 'pharmacist', 'warehouse_manager'], 
        module: 'inventory',
        subItems: [
            { href: '/inventory', label: 'Products & Stock', icon: Boxes }, 
            { href: '/inventory/categories', label: 'Categories', icon: Tags }, 
 { 
            href: '/inventory/raw-materials', 
            label: 'Raw Materials', 
            icon: FlaskConical,
            businessTypes: ['Manufacturing', 'Distribution', 'Retail / Wholesale', 'Restaurant / Cafe'] 
        },
{ 
            href: '/inventory/composites/designer', 
            label: 'Production Catalog', 
            icon: Layers, 
            businessTypes: ['Manufacturing', 'Distribution', 'Retail / Wholesale'] 
        },
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
            { href: '/compliance', label: 'Tax and Compliance Hub', icon: ShieldCheck, roles: ['admin', 'manager', 'auditor', 'owner', 'architect'] },
            { href: '/compliance/risk-dashboard', label: 'Risk Dashboard', icon: BarChart3 },
            { href: '/compliance/tax-reports', label: 'Tax Report Generator', icon: FileText },
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
        type: 'accordion', title: 'Finance', icon: Scale, roles: ['admin', 'manager', 'accountant', 'owner', 'architect', 'auditor'], 
        module: 'finance',
        subItems: [ 
            { href: '/finance/banking', label: 'Banking', icon: Landmark },
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
            { href: '/distribution/aura-master', label: 'Aura Master HUD', icon: Zap },
            { href: '/distribution/manifest-entry', label: 'Global Manifest', icon: Anchor },
            { href: '/distribution/customs', label: 'Forensic Customs', icon: Fingerprint },
            { href: '/distribution/market-intel', label: 'Market Scout', icon: Globe }, 
            { href: '/distribution/routes', label: 'Routes', icon: Route }, 
            { href: '/distribution/assignments', label: 'Assignments', icon: UserCog },
            { href: '/distribution/loading', label: 'Loading', icon: Boxes },
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
        type: 'accordion', title: 'Management', icon: UserCog, roles: ['admin', 'manager', 'auditor', 'owner', 'architect'], 
        module: 'management',
        subItems: [
            { href: '/management/employees', label: 'Employees', icon: UsersRound, roles: ['admin', 'owner', 'architect'] },
{ 
    href: '/settings/memberships', 
    label: 'Linked Businesses', 
    icon: Building2 
},
            { href: '/payroll', label: 'Payroll', icon: Banknote, roles: ['admin', 'manager', 'owner', 'architect'] },
            { href: '/settings/locations', label: 'Branch Locations', icon: Building2, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/locations', label: 'Location Mgmt', icon: Building2, roles: ['admin', 'owner'] },
            { href: '/management/budgets', label: 'Budgeting', icon: Banknote, roles: ['admin', 'manager', 'owner', 'architect'] },
            { href: '/management/comms', label: 'Communication Hub', icon: MessageSquare },   
            { href: '/management/timecard-report', label: 'Attendance Logs', icon: FileSpreadsheet },
            { href: '/management/sentry-hub', label: 'Security Hub', icon: ShieldAlert, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/monitoring', label: 'System Monitor', icon: Activity, roles: ['admin', 'manager', 'owner', 'architect'], businessTypes: ['Retail / Wholesale', 'Distribution'] }, 
            { href: '/loyalty', label: 'Loyalty Program', icon: Percent, roles: ['admin', 'manager', 'owner', 'architect'], businessTypes: ['Retail / Wholesale'] },
            { href: '/shifts', label: 'Shift Reports', icon: ClipboardCheck, roles: ['admin', 'manager', 'owner', 'architect'] },
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

const NavLinkComponent = ({ href, label, Icon, isSidebarOpen }: { href: string; label: string; Icon: React.ElementType; isSidebarOpen: boolean; }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isSidebarOpen) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href}>
              <Button variant={isActive ? "secondary" : "ghost"} size="icon" className={cn("w-full justify-center transition-all", isActive && "bg-blue-50 text-blue-600")} aria-label={label}>
                <Icon className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right"><p>{label}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link href={href}>
      <Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start font-semibold transition-all", isActive && "bg-blue-50 text-blue-600 border-l-4 border-blue-600 rounded-l-none")}>
        <Icon className="mr-3 h-5 w-5" />{label}
      </Button>
    </Link>
  );
};

export default function Sidebar() {
    const pathname = usePathname();
    
    // 1. Authoritative Data Retrieval
    // 'rawRole' isolates the hook result to allow for context resolution below
    const { role: rawRole, isLoading: isLoadingRole } = useUserRole();
    const { data: rawModules, isLoading: isLoadingModules } = useTenantModules();
    const enabledModules = rawModules || [];
    const { data: tenant, isLoading: isLoadingTenant } = useTenant();
    const { branding } = useBranding();
    const { data: profile } = useUserProfile();

    // 2. DEEP IDENTITY RESOLUTION (THE WELD)
    // Resolves the context-aware role (e.g., Accountant) from the active business membership.
    // Scoped at component root to be accessible to all sub-link filters.
    const activeRole = tenant?.user_role || rawRole || profile?.role || "guest";
    const userRole = activeRole.toLowerCase();

    // 3. INDUSTRY CONTEXT NORMALIZATION
    // Centralized industry logic ensuring sub-items and main modules are in perfect sync.
    const rawBizType = tenant?.business_type || '';
    const bizType = rawBizType === 'Distribution' ? 'Distribution / Wholesale Supply' :
                    rawBizType === 'Telecom Services' ? 'Telecom & Mobile Money' :
                    rawBizType === 'Nonprofit' ? 'Nonprofit / Education / NGO' :
                    rawBizType === 'Contractor' ? 'Contractor (General, Remodeling)' : 
                    (rawBizType === '' || rawBizType === null) ? 'Mixed/Conglomerate' : rawBizType;

    // 4. SOVEREIGN AUTHORITY GATES
    // Root-scoped booleans to resolve 'God-Mode' vs 'Restricted-Node' access instantly.
    const isSovereign = ['architect', 'commander'].includes(userRole);
    const isAdminOrOwner = ['admin', 'owner'].includes(userRole);

    // 5. BRANDING RESOLUTION CHAIN
    const businessName = tenant?.business_display_name || branding?.company_name_display || tenant?.name || profile?.business_name || "SOVEREIGN OS";
    const operatorName = profile?.full_name || "Authorized Operator"; 
    
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const { openCopilot } = useCopilot();

    const isLoading = isLoadingRole || isLoadingTenant || isLoadingModules; 

    // --- NAVIGATION LOGIC ENGINE ---
    const finalNavItems = useMemo(() => {
        // [IDENTITY GUARD]: Strictly validates session readiness before rendering
        if (isLoading || !userRole || !tenant) return [];

        return navSections.filter((item) => {
            // RULE 1: SOVEREIGN BYPASS (Only for mwesigwajimmy123@gmail.com)
            if (isSovereign) return true;

            // RULE 2: ROLE PERMISSION GATE (Supports your 60+ Job Roles)
            const hasRolePermission = item.roles?.map(r => r.toLowerCase()).includes(userRole);
            if (!hasRolePermission) return false;

            // RULE 3: MODULE ENTITLEMENT GATE (Matches SQL public.modules slugs)
            if (item.module) {
                const isModuleEnabled = enabledModules?.includes?.(item.module);
                if (!isAdminOrOwner && !isModuleEnabled) {
                    return false;
                }
            }

            // RULE 4: INDUSTRY ALIGNMENT GATE
            if (item.businessTypes) {
                const hasBizMatch = item.businessTypes.includes(rawBizType) || item.businessTypes.includes(bizType);
                if (!hasBizMatch) return false;
            }

            return true;
        });
        // [REACTIVE SYNC]: Recalculates instantly on business switch or identity swap
    }, [isLoading, userRole, enabledModules, tenant, pathname, bizType, rawBizType, isSovereign, isAdminOrOwner]);

    const activeAccordionValue = useMemo(() => {
        for (const section of navSections) {
            if (section.type === 'accordion' && section.subItems?.some(sub => pathname.startsWith(sub.href))) {
                return section.module;
            }
        }
        return undefined;
    }, [pathname]);

    const renderAccordionNav = (items: NavItem[]) => (
        <Accordion type="single" collapsible defaultValue={activeAccordionValue} className="w-full">
            {items.map((item) => {
                if (item.type === 'link') {
                    return <NavLinkComponent key={item.href} href={item.href} label={item.label} Icon={item.icon} isSidebarOpen={isSidebarOpen} />;
                }
                
                if (item.type === 'accordion') {
                    // [DEEP SCOPE WELD]: Local declarations removed to utilize the authoritative 
                    // root-level variables. This fixes the 'ReferenceError' and unlocks sub-links.
                    const filteredSubItems = item.subItems.filter(sub => {
                        if (isSovereign) return true;
                        
                        const roleOk = !sub.roles || sub.roles.map(r => r.toLowerCase()).includes(userRole);
                        const bizOk = !sub.businessTypes || (sub.businessTypes.includes(rawBizType) || sub.businessTypes.includes(bizType));
                        
                        return roleOk && bizOk;
                    });

                    if (filteredSubItems.length === 0 || !isSidebarOpen) return null;

                    const isModuleActive = activeAccordionValue === item.module;

                    return (
                        <AccordionItem key={item.module} value={item.module} className="border-none">
                            <AccordionTrigger className={cn("px-3 py-2 text-sm font-semibold rounded-md hover:bg-slate-50 hover:no-underline transition-colors", isModuleActive && "text-blue-600 bg-blue-50/50")}>
                                <div className="flex items-center flex-1"><item.icon className="mr-3 h-5 w-5" /><span>{item.title}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-6 pt-1 space-y-1">
                                {filteredSubItems.map(subItem => {
                                    const isSubItemActive = pathname.startsWith(subItem.href);
                                    return (
                                        <Link key={subItem.href} href={subItem.href} className={cn("flex items-center py-2 px-3 text-[13px] font-medium rounded-md transition-colors", isSubItemActive ? "text-blue-600 font-bold bg-blue-50/30" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/20")}>
                                            <subItem.icon className="mr-3 h-4 w-4" /><span>{subItem.label}</span>
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
        <aside className={cn(
            "h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out shadow-sm overflow-hidden",
            isSidebarOpen ? "w-64" : "w-20"
        )}>
            {/* --- IDENTITY SELECTOR PORTAL --- */}
            <div className={cn(
                "flex items-center justify-between border-b border-slate-100 px-4 flex-shrink-0 bg-white transition-all",
                isSidebarOpen ? "h-20" : "h-16"
            )}>
                {isSidebarOpen ? (
                    <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-left-2 duration-500 overflow-hidden">
                        <BusinessSwitcher />
                        
                        {/* [IDENTITY SEAL]: Real-time node name and operator role resolution */}
                        <div className="flex flex-col mt-1 px-1 overflow-hidden">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900 truncate leading-none">
                                {businessName}
                            </span>
                            <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest truncate opacity-70 mt-0.5 leading-tight">
                                {operatorName} • {activeRole}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* PROFESSIONAL IDENTITY ANCHOR (CLOSED VIEW) */
                    <div className="flex-1 flex justify-center animate-in zoom-in duration-300">
                        {branding?.logo_url ? (
                            <img 
                                src={branding.logo_url} 
                                className="h-9 w-9 object-contain rounded-xl shadow-sm border border-slate-50 p-0.5 bg-white" 
                                alt="Logo" 
                            />
                        ) : (
                            <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm font-black text-xs">
                                {businessName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-xl ml-2",
                        !isSidebarOpen && "bg-blue-50 text-blue-600"
                    )}
                >
                    {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
            </div>

            {/* --- NAVIGATION SECTION --- */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-4 scrollbar-hide">
                {isLoading ? (
                    <div className="p-4 flex flex-col items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        {isSidebarOpen && <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Synchronizing Identity...</span>}
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        {renderAccordionNav(finalNavItems)}
                    </div>
                )}
            </nav>

            {/* --- FOOTER ACTION SECTION --- */}
            <div className={cn(
                "p-4 mt-auto border-t border-slate-100 space-y-3 flex-shrink-0 transition-colors",
                isSidebarOpen ? "bg-slate-50/50" : "bg-white"
            )}>
                <Button 
                    variant="default" 
                    className={cn(
                        "w-full justify-start bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/10 transition-all active:scale-95", 
                        !isSidebarOpen && "justify-center px-0 h-12 w-12 mx-auto rounded-xl"
                    )} 
                    onClick={openCopilot}
                >
                    <Sparkles className={cn("h-5 w-5 fill-white/20", isSidebarOpen && "mr-3")} />
                    {isSidebarOpen && <span className="tracking-tight">AI Assistant</span>}
                </Button>
                
                <Link href="/settings" className="block">
                    <Button 
                        variant="ghost" 
                        className={cn(
                            "w-full justify-start text-slate-500 font-bold hover:bg-white hover:text-blue-600 transition-all group", 
                            !isSidebarOpen && "justify-center px-0 h-10 w-10 mx-auto rounded-xl"
                        )}
                    >
                        <Settings className={cn("h-5 w-5 transition-transform group-hover:rotate-45", isSidebarOpen && "mr-3")} />
                        {isSidebarOpen && <span className="tracking-tight">General Settings</span>}
                    </Button>
                </Link>
            </div>
        </aside>
    );
}