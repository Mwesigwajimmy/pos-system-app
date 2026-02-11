'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useCopilot } from '@/context/CopilotContext'; 

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    CreditCard, Repeat, FileStack, BadgeAlert, Contact, CheckSquare, UserPlus, Package, Utensils,
    Bell, MessageSquare, ListChecks, GitGraph, Eye, FileClock, Globe, Stethoscope, Pill, Bus
} from 'lucide-react';

import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useTenant } from '@/hooks/useTenant';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

// --- Type Definitions ---
interface NavLink { type: 'link'; href: string; label: string; icon: LucideIcon; roles: string[]; module?: string; businessTypes?: string[]; }
interface SubItem { href:string; label: string; icon: LucideIcon; roles?: string[]; businessTypes?: string[]; }
interface NavAccordion { type: 'accordion'; title: string; icon: LucideIcon; roles: string[]; module: string; businessTypes?: string[]; subItems: SubItem[]; }
type NavItem = NavLink | NavAccordion;

// --- MASTER NAVIGATION CONFIGURATION (Full Professional Dataset) ---
const navSections: NavItem[] = [
    {
        type: 'accordion', 
        title: 'Sovereign Control', 
        icon: ShieldAlert, 
        roles: ['architect', 'commander'], 
        module: 'admin',
        subItems: [
            { href: '/command-center', label: 'War Room Dashboard', icon: Zap },
            { href: '/sovereign-control', label: 'Control Center', icon: ShieldCheck },
            { href: '/tenants', label: 'Tenant Management', icon: Building2 },
            { href: '/telemetry', label: 'Global Traffic', icon: Activity },
            { href: '/billing', label: 'Global Cashflow', icon: Banknote },
        ]
    },

    // --- UNIVERSAL TOOLS ---
    { type: 'link', href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'manager', 'owner', 'architect', 'commander', 'accountant', 'auditor'] },
    { type: 'link', href: '/copilot', label: 'AI Co-Pilot', icon: Sparkles, roles: ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect', 'commander'] }, 
    { type: 'link', href: '/time-clock', label: 'Time Clock', icon: Clock, roles: ['admin', 'manager', 'cashier', 'owner', 'architect', 'waiter_staff', 'pharmacist'] },
    
    // --- POS & KDS (Industry Locked) ---
    { 
        type: 'link', href: '/pos', label: 'Point of Sale', icon: ShoppingCart, 
        roles: ['admin', 'manager', 'cashier', 'owner', 'architect', 'pharmacist', 'bartender'], 
        module: 'sales',
        businessTypes: ['Retail / Wholesale', 'Restaurant / Cafe', 'Mixed/Conglomerate']
    },
    { 
        type: 'link', href: '/kds', label: 'Kitchen Display (KDS)', icon: Utensils, 
        roles: ['admin', 'manager', 'cashier', 'kitchen', 'owner', 'architect', 'chef'], 
        module: 'sales',
        businessTypes: ['Restaurant / Cafe', 'Mixed/Conglomerate']
    },
    
    // --- ACTIVITIES & LOGS ---
    {
        type: 'accordion', title: 'Activities & Logs', icon: ListChecks, roles: ['admin', 'manager', 'auditor', 'owner', 'architect'], module: 'activities',
        subItems: [
            { href: '/activities/timeline', label: 'Global Timeline', icon: Activity },      
            { href: '/activities/user-feeds', label: 'User Activity Feed', icon: UserCog },  
            { href: '/activities/workflows', label: 'Workflow Logs', icon: GitGraph },       
            { href: '/activities/tasks', label: 'Task Activities', icon: ClipboardCheck },
            { href: '/activities/notifications', label: 'Notifications', icon: Bell },       
            { href: '/activities/comments', label: 'Comments History', icon: MessageSquare },
        ]
    },

    // --- CRM ---
    {
        type: 'accordion', title: 'CRM', icon: Handshake, roles: ['admin', 'manager', 'owner', 'architect', 'marketing_specialist', 'support_agent'], module: 'crm',
        subItems: [ 
            { href: '/crm/leads', label: 'Leads & Pipeline', icon: BarChart3 }, 
            { href: '/crm/marketing', label: 'Marketing Campaigns', icon: Megaphone }, 
            { href: '/crm/support', label: 'Support Tickets', icon: Users }, 
        ]
    },

    // --- eCOMMERCE ---
    {
        type: 'accordion', title: 'eCommerce', icon: Globe, roles: ['admin', 'manager', 'owner', 'architect', 'ecommerce_manager'], module: 'ecommerce',
        subItems: [ 
            { href: '/ecommerce/orders', label: 'Online Orders', icon: ClipboardCheck }, 
            { href: '/ecommerce/returns', label: 'Order Returns', icon: Undo2 }, 
            { href: '/ecommerce/products', label: 'Online Products', icon: Boxes }, 
            { href: '/ecommerce/inventory', label: 'Multi-Warehouse Inv.', icon: Building2 }, 
            { href: '/ecommerce/customers', label: 'Customer 360', icon: Users }, 
            { href: '/ecommerce/abandoned-carts', label: 'Cart Abandonment', icon: AlertTriangle }, 
            { href: '/ecommerce/marketing', label: 'Promotions', icon: Megaphone }, 
            { href: '/ecommerce/payments', label: 'Payment Providers', icon: CreditCard }, 
            { href: '/ecommerce/storefront', label: 'Storefront Settings', icon: Settings }, 
            { href: '/ecommerce/marketplaces', label: 'Marketplace Integration', icon: Plug }, 
        ]
    },

    // --- INVOICING ---
    {
        type: 'accordion', title: 'Invoicing', icon: Receipt, roles: ['admin', 'manager', 'accountant', 'cashier', 'owner', 'architect', 'pharmacist', 'legal_counsel'], module: 'invoicing',
        subItems: [
            { href: '/invoicing/create', label: 'Create Invoice', icon: FilePlus }, 
            { href: '/invoicing/list', label: 'All Invoices', icon: FileStack }, 
            { href: '/invoicing/to-be-issued', label: 'To Be Issued', icon: Clock }, 
            { href: '/invoicing/credit-notes', label: 'Credit Notes', icon: FileMinus }, 
            { href: '/invoicing/debit-notes', label: 'Debit Notes', icon: FilePlus }, 
            { href: '/invoicing/deferred-revenue', label: 'Deferred Revenue', icon: PiggyBank }, 
            { href: '/invoicing/deferred-expenses', label: 'Deferred Expenses', icon: Wallet }, 
        ]
    },

    // --- REPORTS CENTER ---
    {
        type: 'accordion', title: 'Reports Center', icon: PieChart, roles: ['admin', 'manager', 'accountant', 'auditor', 'owner', 'architect'], module: 'reports',
        subItems: [
            { href: '/reports/finance-hub', label: 'Finance Hub', icon: Landmark },
            { href: '/reports/executive-summary', label: 'Executive Summary', icon: Activity },
            { href: '/reports/profit-loss', label: 'Profit & Loss', icon: FileText },
            { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: Scale },
            { href: '/reports/trial-balance', label: 'Trial Balance', icon: Scale },
            { href: '/reports/fiscal', label: 'Fiscal Report', icon: FileCheck },
            { href: '/reports/cash-flow', label: 'Cash Flow', icon: Banknote },
            { href: '/reports/aging', label: 'Aged Payables/Receivables', icon: History },
            { href: '/reports/sales', label: 'Sales Reports', icon: BarChart3 },
            { href: '/reports/sales-history', label: 'Sales History', icon: History },
            { href: '/reports/tax', label: 'Tax Liability Reports', icon: Calculator },
            { href: '/reports/audit-trail', label: 'Audit Trail Report', icon: ShieldCheck },
            { href: '/reports/esg', label: 'ESG & Impact', icon: Handshake },
            { href: '/reports/benchmarking', label: 'Benchmarking', icon: Activity },
        ]
    },

    // --- SALES & CUSTOMERS ---
    {
        type: 'accordion', title: 'Sales', icon: BarChart3, roles: ['admin', 'manager', 'owner', 'architect', 'pharmacist'], module: 'sales',
        businessTypes: ['Retail / Wholesale', 'Restaurant / Cafe', 'Distribution / Wholesale Supply', 'Mixed/Conglomerate'],
        subItems: [
            { href: '/customers', label: 'Customers', icon: Users },
            { href: '/returns', label: 'Returns', icon: Undo2 },
            { href: '/dsr', label: 'Daily Sales Report', icon: FileSpreadsheet, roles: ['admin', 'manager', 'owner', 'accountant'] },
            { href: '/sales/pricing-rules', label: 'Price Lists & Rules', icon: Percent },
            { href: '/sales/orders-to-upsell', label: 'Upsell Opportunities', icon: Activity },
        ]
    },

    // --- PHARMACY SPECIALTY ---
    {
        type: 'accordion', title: 'Pharmacy & Health', icon: Pill, roles: ['admin', 'owner', 'pharmacist', 'medical_officer', 'nurse', 'architect'], module: 'inventory',
        businessTypes: ['Retail / Wholesale', 'Professional Services (Accounting, Medical)', 'Mixed/Conglomerate'],
        subItems: [
            { href: '/inventory/prescriptions', label: 'Prescription Tracking', icon: ClipboardPlus },
            { href: '/inventory/expiry-monitor', label: 'Expiry & Batch Alerts', icon: AlertTriangle },
            { href: '/pharmacy/patients', label: 'Patient Records', icon: Contact },
        ]
    },

    // --- INVENTORY & STOCK ---
    {
        type: 'accordion', title: 'Inventory', icon: Boxes, roles: ['admin', 'manager', 'owner', 'architect', 'pharmacist', 'warehouse_manager'], module: 'inventory',
        subItems: [
            { href: '/inventory', label: 'Products & Stock', icon: Boxes }, 
            { href: '/inventory/categories', label: 'Categories', icon: Tags }, 
            { href: '/inventory/composites', label: 'Manufacturing / Recipe', icon: BookOpen, businessTypes: ['Retail / Wholesale', 'Distribution / Wholesale Supply', 'Restaurant / Cafe'] }, 
            { href: '/inventory/manufacturing-orders', label: 'Manufacturing Orders', icon: Wrench, businessTypes: ['Distribution / Wholesale Supply', 'Retail / Wholesale'] }, 
            { href: '/purchases', label: 'Purchase Orders', icon: Truck },
            { href: '/inventory/valuation', label: 'Inventory Valuation', icon: Calculator, roles: ['admin', 'manager', 'accountant'] }, 
            { href: '/inventory/reorder-points', label: 'Reorder Points', icon: Signal },
            { href: '/inventory/tracking', label: 'Batch & Serial Tracking', icon: Activity }, 
            { href: '/inventory/maintenance', label: 'Asset Maintenance', icon: Wrench }, 
        ]
    },

    // --- PROCUREMENT ---
    {
        type: 'accordion', title: 'Procurement', icon: ScrollText, roles: ['admin', 'manager', 'owner', 'architect', 'procurement_officer'], module: 'procurement',
        subItems: [
            { href: '/procurement', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/procurement/pipeline', label: 'Procurement Pipeline', icon: Activity },
            { href: '/procurement/tenders', label: 'Tenders & Bids', icon: Gavel },
            { href: '/procurement/contracts', label: 'Contract Mgmt', icon: FileCheck },
            { href: '/procurement/suppliers', label: 'Supplier Risk', icon: ShieldCheck },
            { href: '/procurement/approvals', label: 'Approvals Workflow', icon: CheckSquare },
            { href: '/procurement/spend', label: 'Spend Analysis', icon: PieChart },
        ]
    },

    // --- PROFESSIONAL SERVICES ---
    {
        type: 'accordion', title: 'Professional Services', icon: Briefcase, roles: ['admin', 'manager', 'owner', 'architect', 'lawyer', 'accountant', 'consultant', 'practitioner'], module: 'professional-services',
        businessTypes: ['Professional Services (Accounting, Medical)', 'Mixed/Conglomerate'],
        subItems: [
            { href: '/professional-services', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/professional-services/clients', label: 'Client Hub', icon: Users },
            { href: '/professional-services/projects', label: 'Matter / Project Mgmt', icon: FolderKanban },
            { href: '/professional-services/billing', label: 'Time & Fee Billing', icon: Receipt },
            { href: '/professional-services/documents', label: 'Document Library', icon: Library },
            { href: '/professional-services/trust-accounting', label: 'Trust Accounting', icon: Landmark, roles: ['admin', 'accountant', 'lawyer'] },
            { href: '/professional-services/compliance', label: 'Compliance & Audit', icon: ShieldAlert }, 
        ]
    },
   
    // --- HUMAN RESOURCES ---
    {
        type: 'accordion', title: 'Human Resources', icon: UsersRound, roles: ['admin', 'manager', 'owner', 'architect', 'hr_manager'], module: 'hcm',
        subItems: [ 
            { href: '/hr/dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
            { href: '/hr/directory', label: 'Employee Directory', icon: Contact },
            { href: '/hr/org-chart', label: 'Org Chart', icon: Route },
            { href: '/hr/leave', label: 'Leave Management', icon: CalendarDays }, 
            { href: '/hr/time-attendance', label: 'Time & Attendance', icon: Clock },
            { href: '/hr/recruitment', label: 'Recruitment', icon: UserCheckIcon }, 
            { href: '/hr/onboarding', label: 'Onboarding', icon: ClipboardCheck }, 
            { href: '/hr/offboarding', label: 'Offboarding', icon: Archive }, 
            { href: '/hr/performance', label: 'Performance', icon: Activity }, 
            { href: '/hr/benefits', label: 'Benefits Admin', icon: HeartHandshake },
            { href: '/hr/rewards', label: 'Rewards & Recognition', icon: Sparkles },
            { href: '/hr/fleet', label: 'Fleet Management', icon: Truck },
        ]
    },

    // --- FINANCE ---
    {
        type: 'accordion', title: 'Finance', icon: Scale, roles: ['admin', 'manager', 'accountant', 'owner', 'architect', 'auditor'], module: 'finance',
        subItems: [ 
            { href: '/finance/banking', label: 'Banking & Reconciliation', icon: Landmark },
            { href: '/finance/payables', label: 'Accounts Payable', icon: UploadCloud, roles: ['admin', 'accountant', 'owner', 'architect'] },
            { href: '/finance/receivables', label: 'Receivables', icon: FilePlus },
            { href: '/expenses', label: 'Expenses', icon: Wallet },
            { href: '/ledger', label: 'General Ledger', icon: BookOpen },
            { href: '/finance/journal', label: 'General Journal', icon: BookCopy },
            { href: '/finance/tax-returns', label: 'Tax Returns', icon: FileWarning },
            { href: '/finance/fiscal-positions', label: 'Fiscal Positions', icon: Settings },
            { href: '/finance/lock-dates', label: 'Lock Dates', icon: KeyRound },
            { href: '/finance/chart-of-accounts',label: 'Chart of Accounts',icon: Settings },
        ]
    },

    // --- DISTRIBUTION & LOGISTICS ---
    {
        type: 'accordion', title: 'Distribution & Logistics', icon: Truck, roles: ['admin', 'manager', 'owner', 'architect', 'fleet_manager', 'driver'], module: 'distribution',
        businessTypes: ['Distribution / Wholesale Supply', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/distribution', label: 'Dashboard', icon: LayoutDashboard }, 
            { href: '/distribution/routes', label: 'Routes Manager', icon: Route }, 
            { href: '/distribution/assignments', label: 'Driver Assignments', icon: UserCog },
            { href: '/distribution/loading', label: 'Van Loading', icon: Boxes },
            { href: '/distribution/settlement', label: 'Route Settlements', icon: ClipboardCheck },
            { href: '/distribution/fulfillment', label: 'Order Fulfillment', icon: Package },
            { href: '/distribution/fleet-maintenance', label: 'Fleet Maintenance', icon: Wrench },
            { href: '/distribution/cold-chain', label: 'Cold Chain Monitor', icon: Thermometer },
        ]
    },

    // --- SACCO & CO-OPS ---
    {
        type: 'accordion', title: 'SACCO & Co-ops', icon: PiggyBank, roles: ['admin', 'manager', 'owner', 'architect', 'sacco_manager', 'teller', 'loan_officer'], module: 'sacco',
        businessTypes: ['SACCO / Co-operative', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/sacco', label: 'Dashboard', icon: LayoutDashboard }, 
            { href: '/sacco/members', label: 'Member Accounts', icon: Users }, 
            { href: '/sacco/kyc', label: 'KYC Manager', icon: ShieldCheck },
            { href: '/sacco/groups', label: 'Group Management', icon: UserCog }, 
            { href: '/sacco/contributions', label: 'Member Contributions', icon: PiggyBank }, 
            { href: '/sacco/collections', label: 'Group Collections', icon: ClipboardList }, 
            { href: '/sacco/shares', label: 'Share Ledger', icon: PieChart },
            { href: '/sacco/dividends', label: 'Dividend Management', icon: Banknote },
            { href: '/sacco/loans', label: 'Loan Applications', icon: FileText }, 
            { href: '/sacco/finance', label: 'Financial Ledger', icon: BookOpen },
            { href: '/sacco/matatu-fleet', label: 'Matatu / Transport Ops', icon: Bus },
            { href: '/sacco/audit', label: 'Statutory Audit', icon: ShieldCheck, roles: ['auditor', 'admin'] }, 
            { href: '/sacco/agent-portal', label: 'Agent Portal', icon: Smartphone }, 
            { href: '/sacco/admin', label: 'Administration', icon: Settings }, 
        ]
    },

    // --- LENDING & MICROFINANCE ---
    {
        type: 'accordion', title: 'Lending Portal', icon: Landmark, roles: ['admin', 'manager', 'owner', 'architect', 'loan_officer', 'credit_analyst', 'debt_collector'], module: 'lending',
        businessTypes: ['Lending / Microfinance', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/lending', label: 'Portfolio Dashboard', icon: LayoutDashboard },
            { href: '/lending/applications', label: 'Loan Applications', icon: FileText }, 
            { href: '/lending/borrowers', label: 'Borrower CRM', icon: Users }, 
            { href: '/lending/kyc', label: 'KYC & Due Diligence', icon: ShieldCheck }, 
            { href: '/lending/loans', label: 'Active Loans', icon: FileCheck },
            { href: '/lending/collections', label: 'Debt Collections', icon: AlertTriangle },
            { href: '/lending/risk', label: 'Credit Risk / Scoring', icon: BadgeAlert },
            { href: '/lending/repayments', label: 'Repayment Plans', icon: CalendarDays },
            { href: '/lending/products', label: 'Loan Products', icon: Boxes }, 
            { href: '/lending/agent-portal', label: 'Agent Portal', icon: Smartphone }, 
        ]
    },

    // --- RENTALS & PROPERTY ---
    {
        type: 'accordion', title: 'Property & Rentals', icon: Home, roles: ['admin', 'manager', 'owner', 'architect', 'property_manager', 'leasing_agent'], module: 'rentals',
        businessTypes: ['Rentals / Real Estate', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/rentals/properties', label: 'Properties & Units', icon: Building2 }, 
            { href: '/rentals/leases', label: 'Leases', icon: FileText }, 
            { href: '/rentals/invoices', label: 'Rental Invoices', icon: Receipt }, 
            { href: '/rentals/maintenance', label: 'Maintenance Tickets', icon: Wrench },
        ]
    },

    // --- TELECOM SERVICES ---
    {
        type: 'accordion', title: 'Telecom & Agents', icon: Smartphone, roles: ['admin', 'manager', 'cashier', 'accountant', 'owner', 'architect', 'dsr_rep', 'agent', 'float_manager'], module: 'telecom',
        businessTypes: ['Telecom & Mobile Money', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/telecom', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'owner', 'architect'] }, 
            { href: '/telecom/operator', label: 'Operator Console', icon: Zap, roles: ['admin', 'float_manager'] }, 
            { href: '/telecom/agents', label: 'Agent Management', icon: UserCog }, 
            { href: '/telecom/virtual-agent', label: 'Virtual Agent Form', icon: Smartphone }, 
            { href: '/telecom/float-requests', label: 'Float Requests', icon: ArrowRightLeft }, 
            { href: '/telecom/reconciliation', label: 'Reconciliation', icon: ClipboardCheck }, 
            { href: '/telecom/compliance', label: 'Regulatory Compliance', icon: ShieldCheck }, 
            { href: '/telecom/dsr-dashboard', label: 'DSR Field App', icon: Activity, roles: ['cashier', 'owner', 'dsr_rep', 'architect'] }, 
            { href: '/telecom/agent', label: 'Agent Dashboard', icon: Users, roles: ['cashier', 'owner', 'agent', 'architect'] },
            { href: '/telecom/bi', label: 'BI Analytics', icon: BarChart3 }
        ]
    },

    // --- FIELD SERVICE (Trades/Salon) ---
    {
        type: 'accordion', title: 'Field Service', icon: Wrench, roles: ['admin', 'manager', 'owner', 'architect', 'field_technician', 'dispatcher'], module: 'field-service',
        businessTypes: ['Field Service (Trades, Barber, Salon)', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/field-service/schedule', label: 'Dispatch & Schedule', icon: CalendarDays, roles: ['dispatcher', 'admin'] }, 
            { href: '/field-service/smart-schedule', label: 'Smart Scheduler', icon: Zap },
            { href: '/field-service/work-orders', label: 'Work Orders', icon: ClipboardList }, 
            { href: '/field-service/equipment', label: 'Equipment & Assets', icon: Truck }, 
            { href: '/field-service/technician', label: 'Technician Portal', icon: Smartphone, roles: ['field_technician'] },
            { href: '/field-service/analytics', label: 'Service Analytics', icon: BarChart3 },
            { href: '/field-service/compliance', label: 'Compliance & Warranty', icon: ShieldCheck },
        ]
    },

    // --- CONTRACTOR TOOLS (Construction) ---
    {
        type: 'accordion', title: 'Project & Site Mgmt', icon: Construction, roles: ['admin', 'manager', 'owner', 'architect', 'engineer', 'foreman', 'site_manager'], module: 'contractor',
        businessTypes: ['Contractor (General, Remodeling)', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/contractor', label: 'Dashboard', icon: LayoutDashboard }, 
            { href: '/contractor/jobs', label: 'Job Management', icon: Briefcase }, 
            { href: '/contractor/estimates', label: 'Estimates & Bids', icon: FileText }, 
            { href: '/contractor/blueprints', label: 'Drawing Library', icon: Library },
            { href: '/contractor/safety', label: 'HSE / Safety Logs', icon: HardHat },
            { href: '/contractor/change-orders', label: 'Change Orders', icon: Undo2 }, 
        ]
    },

    // --- NON-PROFIT & NGO ---
    {
        type: 'accordion', title: 'Non-Profit & NGO', icon: HeartHandshake, roles: ['admin', 'manager', 'owner', 'architect', 'donor_relations', 'grant_manager', 'volunteer_coordinator'], module: 'nonprofit',
        businessTypes: ['Nonprofit / Education / NGO', 'Mixed/Conglomerate'],
        subItems: [ 
            { href: '/nonprofit', label: 'Overview', icon: LayoutDashboard },
            { href: '/nonprofit/donors', label: 'Donor Management', icon: Users },
            { href: '/nonprofit/donations', label: 'Donations Ledger', icon: Banknote },
            { href: '/nonprofit/grants', label: 'Grants Mgmt', icon: FileText },
            { href: '/nonprofit/volunteering', label: 'Volunteers', icon: Handshake },
            { href: '/nonprofit/impact', label: 'Impact Reporting', icon: Activity },
            { href: '/nonprofit/communication', label: 'Communication Hub', icon: Signal }, 
        ]
    },

    // --- BOOKING & COLLABORATION ---
    {
        type: 'accordion', title: 'Booking', icon: CalendarDays, roles: ['admin', 'manager', 'owner', 'architect'], module: 'booking',
        subItems: [ { href: '/booking', label: 'Calendar', icon: CalendarDays }, { href: '/booking/services', label: 'Manage Services', icon: ClipboardPlus }, ]
    },
    {
        type: 'accordion', title: 'Collaboration', icon: Users, roles: ['admin', 'manager', 'cashier', 'accountant', 'auditor', 'owner', 'architect'], module: 'collaboration',
        subItems: [ { href: '/workbooks', label: 'Live Workbooks', icon: FileSpreadsheet }, ]
    },
    {
        type: 'accordion', title: 'Business Hub', icon: Library, roles: ['admin', 'manager', 'accountant', 'cashier', 'auditor', 'owner', 'architect'], module: 'business-hub',
        subItems: [ { href: '/library', label: 'Document Library', icon: Library }, ]
    },

    // --- MANAGEMENT & ADMIN ---
    {
        type: 'accordion', title: 'Management', icon: UserCog, roles: ['admin', 'manager', 'auditor', 'owner', 'architect'], module: 'management',
        subItems: [
            { href: '/management/employees', label: 'Employees', icon: UsersRound, roles: ['admin', 'owner', 'architect'] },
            { href: '/payroll', label: 'Payroll Engine', icon: Banknote, roles: ['admin', 'manager', 'owner', 'architect'] },
            { href: '/audit/sandbox', label: 'Sovereign Audit Sandbox', icon: ShieldCheck, roles: ['admin', 'manager', 'auditor', 'accountant', 'owner', 'architect'] },
            { href: '/settings/locations', label: 'Physical Locations', icon: Building2, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/budgets', label: 'Budgeting', icon: Banknote, roles: ['admin', 'manager', 'owner', 'architect'] },
            { href: '/management/monitoring', label: 'Live System Monitor', icon: Activity, roles: ['admin', 'manager', 'owner', 'architect'], businessTypes: ['Retail / Wholesale', 'Distribution / Wholesale Supply'] }, 
            { href: '/shifts', label: 'Shift Reports', icon: ClipboardCheck, roles: ['admin', 'manager', 'owner', 'architect'] },
            { href: '/audit', label: 'System Audit Log', icon: ShieldCheck, roles: ['admin', 'auditor', 'owner', 'architect'] },
            { href: '/compliance', label: 'Tax and Compliance Hub', icon: ShieldCheck, roles: ['admin', 'manager', 'auditor', 'owner', 'architect'] },
            { href: '/settings', label: 'General Settings', icon: Settings, roles: ['admin', 'owner', 'architect'] },
            { href: '/settings/branding', label: 'System Branding', icon: Sparkles, roles: ['admin', 'owner', 'architect'] }, 
            { href: '/marketplace', label: 'App Marketplace', icon: Plug, roles: ['admin', 'owner', 'architect'] },
            { href: '/management/api', label: 'API Keys & Gateway', icon: KeyRound, roles: ['admin', 'owner', 'architect'] }, 
        ]
    },
];

const settingsNav = { href: '/dashboard/settings', label: 'General Settings', Icon: Settings, roles: ['admin', 'architect', 'owner'] };

const NavLinkComponent = ({ href, label, Icon, isSidebarOpen }: { href: string; label: string; Icon: React.ElementType; isSidebarOpen: boolean; }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isSidebarOpen) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href}>
              <Button variant={isActive ? "secondary" : "ghost"} size="icon" className="w-full justify-center" aria-label={label}>
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
      <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start">
        <Icon className="mr-3 h-5 w-5" />{label}
      </Button>
    </Link>
  );
};

export default function Sidebar() {
    const pathname = usePathname();
    const { role, isLoading: isLoadingRole } = useUserRole();
    const { data: enabledModules = [], isLoading: isLoadingModules } = useTenantModules();
    const { data: tenant, isLoading: isLoadingTenant } = useTenant();
    
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const { openCopilot } = useCopilot();

    const isLoading = isLoadingRole || isLoadingTenant || isLoadingModules; 

    const finalNavItems = useMemo(() => {
        if (isLoading || !role || !tenant) return [];
        
        const userRole = role?.toLowerCase() || '';
        const bizType = tenant.business_type;
        const isSovereign = ['architect', 'commander'].includes(userRole);

        return navSections.filter((item) => {
            // 1. Gate One: Sovereign Bypass
            if (isSovereign) return true;

            // 2. Gate Two: Role Permission Check
            const hasRolePermission = item.roles.map(r => r.toLowerCase()).includes(userRole);
            if (!hasRolePermission) return false;

            // 3. Gate Three: Module License Check
            if (item.module && !enabledModules.includes(item.module)) {
                return false;
            }

            // 4. Gate Four: Industry Lockdown
            if (item.businessTypes && !item.businessTypes.includes(bizType)) {
                return false;
            }

            return true;
        });
    }, [isLoading, role, enabledModules, tenant]); 

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
                    const userRole = role?.toLowerCase() || '';
                    const bizType = tenant?.business_type || '';
                    const isSovereign = ['architect', 'commander'].includes(userRole);

                    const filteredSubItems = item.subItems.filter(sub => {
                        if (isSovereign) return true;
                        // Check sub-item role requirements
                        const roleOk = !sub.roles || sub.roles.map(r => r.toLowerCase()).includes(userRole);
                        // Check sub-item industry lock requirements
                        const bizOk = !sub.businessTypes || sub.businessTypes.includes(bizType);
                        
                        return roleOk && bizOk;
                    });

                    if (filteredSubItems.length === 0 || !isSidebarOpen) return null;

                    return (
                        <AccordionItem key={item.module} value={item.module} className="border-none">
                            <AccordionTrigger className={cn("px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:no-underline", activeAccordionValue === item.module && "text-primary font-bold")}>
                                <div className="flex items-center flex-1"><item.icon className="mr-3 h-5 w-5" /><span>{item.title}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-6 pt-1 space-y-1">
                                {filteredSubItems.map(subItem => {
                                    const isSubItemActive = pathname.startsWith(subItem.href);
                                    return (
                                        <Link key={subItem.href} href={subItem.href} onClick={(e) => e.stopPropagation()} className={cn("flex items-center py-2 px-3 text-sm font-medium rounded-md transition-colors duration-150", isSubItemActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}>
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
            "h-full bg-card border-r flex flex-col transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-64" : "w-20"
        )}>
            <div className="flex items-center justify-between h-16 border-b px-4 flex-shrink-0">
                {isSidebarOpen && <h1 className="text-lg font-bold tracking-tight text-primary">Sovereign ERP</h1>}
                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
            </div>
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto pt-4 scrollbar-hide">
                {isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground animate-pulse">Initializing Neural Core...</div>
                ) : (
                    renderAccordionNav(finalNavItems)
                )}
            </nav>
            <div className="p-4 mt-auto border-t space-y-2 flex-shrink-0">
                <Button variant="outline" className={cn("w-full justify-start", !isSidebarOpen && "justify-center px-0")} onClick={openCopilot}>
                    <Sparkles className={cn("h-5 w-5 text-primary", isSidebarOpen && "mr-3")} />
                    {isSidebarOpen && "Ask Aura"}
                </Button>
                <NavLinkComponent {...settingsNav} Icon={settingsNav.Icon} isSidebarOpen={isSidebarOpen} />
            </div>
        </aside>
    );
}