'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
    LayoutDashboard, ShoppingCart, Clock, Users, BarChart3, History, Boxes, Truck,
    ClipboardCheck, Receipt, BookOpen, Banknote, BookCopy, Briefcase, UsersRound,
    ShieldCheck, Settings, Landmark, Home, FileText, Tags, Undo2, LucideIcon,
    Building2, Handshake, ClipboardList, UserCog, Sparkles, ArrowRightLeft, Percent,
    Printer, CalendarDays, ClipboardPlus, Activity, Route, KeyRound, PiggyBank,
    UserCheck, Smartphone, Zap, SlidersHorizontal, FileSpreadsheet, UploadCloud, Plug,
    Scale, Wallet, FileWarning, Construction, Wrench
} from 'lucide-react';

// Core hooks for fetching user and module data
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useTenantModules';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

// Unified type definitions for all navigation items
interface NavLink {
    type: 'link';
    href: string;
    label: string;
    icon: LucideIcon;
    roles: string[];
    module?: string; // Optional: Link to a specific module slug
}
interface SubItem {
    href: string;
    label: string;
    icon: LucideIcon;
    roles?: string[];
}
interface NavAccordion {
    type: 'accordion';
    title: string;
    icon: LucideIcon;
    roles: string[];
    module: string; // Required: Every accordion must belong to a module slug
    subItems: SubItem[];
}
type NavItem = NavLink | NavAccordion;

// The complete, unified navigation structure with 'module' slugs assigned to each section.
const navSections: NavItem[] = [
    // --- Core Links (Always available if role permits) ---
    { type: 'link', href: '/', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { type: 'link', href: '/copilot', label: 'AI Co-Pilot', icon: Sparkles, roles: ['admin', 'manager'] },
    { type: 'link', href: '/time-clock', label: 'Time Clock', icon: Clock, roles: ['admin', 'manager', 'cashier'] },

    // --- Module-Based Links & Accordions ---
    { type: 'link', href: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'], module: 'sales' },

    {
        type: 'accordion', title: 'Contractor Tools', icon: Construction, roles: ['admin', 'manager'], module: 'contractor',
        subItems: [
            { href: '/contractor', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/contractor/jobs', label: 'Job Management', icon: Briefcase },
            { href: '/contractor/estimates', label: 'Estimates & Bids', icon: FileText },
            { href: '/contractor/change-orders', label: 'Change Orders', icon: Undo2 },
        ]
    },
    {
        type: 'accordion', title: 'Field Service', icon: Wrench, roles: ['admin', 'manager'], module: 'field-service',
        subItems: [
            { href: '/field-service/schedule', label: 'Dispatch & Schedule', icon: CalendarDays },
            { href: '/field-service/work-orders', label: 'Work Orders', icon: ClipboardList },
            { href: '/field-service/equipment', label: 'Equipment', icon: Truck },
        ]
    },
    {
        type: 'accordion', title: 'Human Resources', icon: UsersRound, roles: ['admin', 'manager'], module: 'hcm',
        subItems: [
            { href: '/hr/leave', label: 'Leave Management', icon: CalendarDays },
            { href: '/hr/recruitment', label: 'Recruitment', icon: UserCheck },
            { href: '/hr/performance', label: 'Performance', icon: Activity },
            { href: '/hr/onboarding', label: 'Onboarding', icon: ClipboardCheck },
        ]
    },
    {
        type: 'accordion', title: 'CRM', icon: Handshake, roles: ['admin', 'manager'], module: 'crm',
        subItems: [
            { href: '/crm/leads', label: 'Sales Pipeline', icon: BarChart3 },
            { href: '/crm/support', label: 'Support Tickets', icon: Users },
            { href: '/crm/marketing', label: 'Marketing', icon: Sparkles },
        ]
    },
    {
        type: 'accordion', title: 'eCommerce', icon: ShoppingCart, roles: ['admin', 'manager'], module: 'ecommerce',
        subItems: [
            { href: '/ecommerce', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/ecommerce/orders', label: 'Online Orders', icon: ClipboardCheck },
            { href: '/ecommerce/products', label: 'Online Products', icon: Boxes },
        ]
    },
    {
        type: 'accordion', title: 'Distribution', icon: Truck, roles: ['admin', 'manager'], module: 'distribution',
        subItems: [
            { href: '/distribution', label: 'Dashboard', icon: LayoutDashboard }, { href: '/distribution/routes', label: 'Routes & Vehicles', icon: Route }, { href: '/distribution/settlement', label: 'Route Settlements', icon: ClipboardCheck },
        ]
    },
    {
        type: 'accordion', title: 'SACCO & Co-ops', icon: Handshake, roles: ['admin', 'manager'], module: 'sacco',
        subItems: [
            { href: '/sacco', label: 'Dashboard', icon: LayoutDashboard }, { href: '/sacco/reports', label: 'Reports', icon: BarChart3 }, { href: '/sacco/members', label: 'Member Accounts', icon: Users }, { href: '/sacco/groups', label: 'Group Management', icon: UserCog }, { href: '/sacco/collections', label: 'Group Collections', icon: ClipboardList }, { href: '/sacco/loans', label: 'Loan Applications', icon: FileText }, { href: '/sacco/savings-products', label: 'Savings Products', icon: PiggyBank }, { href: '/sacco/products', label: 'Loan Products', icon: Boxes }, { href: '/sacco/finance', label: 'Financial Ledger', icon: BookOpen }, { href: '/sacco/admin', label: 'Administration', icon: ShieldCheck, roles: ['admin'] },
        ]
    },
    {
        type: 'accordion', title: 'Rentals', icon: Home, roles: ['admin', 'manager'], module: 'rentals',
        subItems: [
            { href: '/rentals/properties', label: 'Properties & Units', icon: Building2 },
            { href: '/rentals/leases', label: 'Leases', icon: FileText },
            { href: '/rentals/invoices', label: 'Rental Invoices', icon: Receipt },
        ]
    },
    {
        type: 'accordion', title: 'Lending & Microfinance', icon: Landmark, roles: ['admin', 'manager'], module: 'lending',
        subItems: [
            { href: '/lending/applications', label: 'Loan Applications', icon: FileText }, { href: '/lending/borrowers', label: 'Borrower Accounts', icon: Users }, { href: '/lending/officers', label: 'Loan Officers', icon: UserCheck }, { href: '/lending/products', label: 'Loan Products', icon: Boxes },
        ]
    },
    {
        type: 'accordion', title: 'Telecom Services', icon: Smartphone, roles: ['admin', 'manager', 'cashier', 'accountant'], module: 'telecom',
        subItems: [
            { href: '/telecom', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
            { href: '/telecom/operator', label: 'Operator Center', icon: Zap, roles: ['admin', 'manager'] },
            { href: '/telecom/agents', label: 'Agent Management', icon: UserCog, roles: ['admin', 'manager'] },
            { href: '/telecom/products', label: 'Product Management', icon: Boxes, roles: ['admin', 'manager'] },
            { href: '/telecom/reconciliation', label: 'Reconciliation Center', icon: ClipboardCheck, roles: ['admin', 'manager', 'accountant'] },
            { href: '/telecom/financials', label: 'Financial Controls', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/telecom/reports', label: 'Performance Reports', icon: BarChart3, roles: ['admin', 'manager'] },
            { href: '/telecom/history', label: 'Financial History', icon: History, roles: ['admin', 'manager', 'accountant'] },
            { href: '/telecom/dsr-dashboard', label: 'DSR Field App', icon: Activity, roles: ['cashier'] },
            { href: '/telecom/agent', label: 'Agent Dashboard', icon: Users, roles: ['cashier'] },
        ]
    },
    {
        type: 'accordion', title: 'Booking', icon: CalendarDays, roles: ['admin', 'manager'], module: 'booking',
        subItems: [
            { href: '/booking', label: 'Calendar', icon: CalendarDays }, { href: '/booking/services', label: 'Manage Services', icon: ClipboardPlus },
        ]
    },
    {
        type: 'accordion', title: 'Sales', icon: BarChart3, roles: ['admin', 'manager'], module: 'sales',
        subItems: [
            { href: '/customers', label: 'Customers', icon: Users },
            { href: '/returns', label: 'Returns', icon: Undo2 },
            { href: '/reports', label: 'Sales Reports', icon: BarChart3 },
            { href: '/reports/sales-history', label: 'Sales History', icon: History },
            { href: '/dsr', label: 'Daily Sales Report', icon: FileSpreadsheet, roles: ['admin', 'manager'] },
        ]
    },
    {
        type: 'accordion', title: 'Inventory', icon: Boxes, roles: ['admin', 'manager'], module: 'inventory',
        subItems: [
            { href: '/inventory', label: 'Products & Stock', icon: Boxes }, { href: '/inventory/categories', label: 'Categories', icon: Tags }, { href: '/inventory/composites', label: 'Manufacturing', icon: BookOpen }, { href: '/purchases', label: 'Purchase Orders', icon: Truck }, { href: '/inventory/adjustments', label: 'Stock Adjustments', icon: ClipboardCheck }, { href: '/inventory/transfers/new', label: 'Stock Transfers', icon: ArrowRightLeft },
        ]
    },
    {
        type: 'accordion', title: 'Finance', icon: Scale, roles: ['admin', 'manager', 'accountant'], module: 'finance',
        subItems: [
            { href: '/finance', label: 'Financial Reports', icon: BarChart3, roles: ['admin', 'manager', 'accountant'] },
            { href: '/expenses', label: 'Expenses', icon: Wallet, roles: ['admin', 'manager', 'accountant', 'cashier'] },
        ]
    },
    { type: 'link', href: '/ledger', label: 'General Ledger', icon: BookOpen, roles: ['admin', 'manager', 'accountant'], module: 'finance' },
    {
        type: 'accordion', title: 'Collaboration', icon: Users, roles: ['admin', 'manager', 'cashier', 'accountant', 'auditor'], module: 'collaboration',
        subItems: [
            { href: '/workbooks', label: 'Live Workbooks', icon: FileSpreadsheet, roles: ['admin', 'manager', 'cashier', 'accountant'] },
        ]
    },
    {
        type: 'accordion', title: 'Business Hub', icon: Briefcase, roles: ['admin', 'manager', 'accountant', 'cashier', 'auditor'], module: 'business-hub',
        subItems: [
            { href: '/library', label: 'Document Library', icon: FileSpreadsheet, roles: ['admin', 'manager', 'accountant', 'cashier', 'auditor'] },
        ]
    },
    {
        type: 'accordion', title: 'Management', icon: UserCog, roles: ['admin', 'manager', 'auditor'], module: 'management',
        subItems: [
            { href: '/management/employees', label: 'Employees', icon: UsersRound, roles: ['admin'] },
            { href: '/payroll', label: 'Payroll', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/management/locations', label: 'Locations', icon: Building2, roles: ['admin'] },
            { href: '/management/budgets', label: 'Budgeting', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/management/monitoring', label: 'Live POS Monitor', icon: Activity, roles: ['admin', 'manager'] },
            { href: '/shifts', label: 'Shift Reports', icon: ClipboardCheck, roles: ['admin', 'manager'] },
            { href: '/management/timecards', label: 'Timecards', icon: ClipboardCheck, roles: ['admin', 'manager'] },
            { href: '/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['admin', 'auditor'] },
            { href: '/compliance', label: 'Compliance', icon: FileWarning, roles: ['admin', 'manager', 'auditor'] },
            { href: '/accountant', label: 'Accountant Center', icon: BookCopy, roles: ['admin', 'accountant'] },
            { href: '/settings', label: 'General Settings', icon: Settings, roles: ['admin'] },
            { href: '/loyalty', label: 'Loyalty Program', icon: Percent, roles: ['admin'] },
            { href: '/settings/branding', label: 'Branding', icon: Sparkles, roles: ['admin'] },
            { href: '/settings/hardware', label: 'Hardware', icon: Printer, roles: ['admin'] },
            { href: '/settings/currencies', label: 'Currencies', icon: Banknote, roles: ['admin'] },
            { href: '/settings/migration', label: 'Data Migration', icon: UploadCloud, roles: ['admin'] },
            { href: '/marketplace', label: 'App Marketplace', icon: Plug, roles: ['admin'] },
            { href: '/management/api', label: 'API Keys', icon: KeyRound, roles: ['admin'] },
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { role, isLoading: isLoadingRole } = useUserRole();
    const { data: enabledModules, isLoading: isLoadingModules } = useTenantModules();
    const isLoading = isLoadingRole || isLoadingModules;

    const navItems = useMemo(() => {
        if (isLoading) return [];
        const userRole = role?.toLowerCase() || '';

        return navSections.filter(item => {
            const hasRolePermission = item.roles.map(r => r.toLowerCase()).includes(userRole);
            if (!hasRolePermission) return false;

            if (item.module) {
                return enabledModules?.includes(item.module);
            }
            
            return true;
        });
    }, [isLoading, role, enabledModules]);

    const activeAccordionValue = useMemo(() => {
        for (const section of navItems) {
            if (section.type === 'accordion' && section.subItems?.some(sub => pathname.startsWith(sub.href) && sub.href !== '/')) {
                return section.module;
            }
        }
        return undefined;
    }, [navItems, pathname]);

    return (
        <div className="w-full h-full flex flex-col bg-card border-r">
            <div className="p-4 border-b flex items-center">
                <h1 className="text-2xl font-bold text-primary">BBU1</h1>
            </div>
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground animate-pulse">Loading navigation...</div>
                ) : (
                    <Accordion type="single" collapsible defaultValue={activeAccordionValue} className="w-full">
                        {navItems.map((item) => {
                            if (item.type === 'link') {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href} className={cn("flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150", isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground")}>
                                        <item.icon className="mr-3 h-5 w-5" /><span>{item.label}</span>
                                    </Link>
                                );
                            }
                            if (item.type === 'accordion') {
                                const userRole = role?.toLowerCase() || '';
                                return (
                                    <AccordionItem key={item.module} value={item.module} className="border-none">
                                        <AccordionTrigger className={cn("px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:no-underline", activeAccordionValue === item.module && "text-primary font-bold")}>
                                            <div className="flex items-center flex-1"><item.icon className="mr-3 h-5 w-5" /><span>{item.title}</span></div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pl-6 pt-1 space-y-1">
                                            {item.subItems
                                                .filter(sub => !sub.roles || sub.roles.map(r => r.toLowerCase()).includes(userRole))
                                                .map(subItem => {
                                                    // --- THIS IS THE FIXED LINE ---
                                                    const isSubItemActive = pathname.startsWith(subItem.href) && subItem.href !== '/';
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
                )}
            </nav>
        </div>
    );
}