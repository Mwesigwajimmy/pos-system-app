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
    UserCheck, Smartphone, Zap, SlidersHorizontal
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useBusinessType } from '@/hooks/useBusinessType';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

interface NavLink { type: 'link'; href: string; label: string; icon: LucideIcon; roles: string[]; industries?: string[]; }
interface SubItem { href: string; label: string; icon: LucideIcon; roles?: string[]; }
interface NavAccordion { type: 'accordion'; title: string; icon: LucideIcon; roles: string[]; industries?: string[]; subItems: SubItem[]; }
type NavItem = NavLink | NavAccordion;

const navSections: NavItem[] = [
    { type: 'link', href: '/', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { type: 'link', href: '/copilot', label: 'AI Co-Pilot', icon: Sparkles, roles: ['admin', 'manager'] },
    { type: 'link', href: '/time-clock', label: 'Time Clock', icon: Clock, roles: ['admin', 'manager', 'cashier'] },

    { type: 'link', href: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'], industries: ['Retail / Wholesale', 'Restaurant / Cafe'] },
    {
        type: 'accordion', title: 'Distribution', icon: Truck, roles: ['admin', 'manager'], industries: ['Retail / Wholesale'],
        subItems: [
            { href: '/distribution', label: 'Dashboard', icon: LayoutDashboard }, { href: '/distribution/routes', label: 'Routes & Vehicles', icon: Route }, { href: '/distribution/settlement', label: 'Route Settlements', icon: ClipboardCheck },
        ]
    },
    {
        type: 'accordion', title: 'SACCO & Co-ops', icon: Handshake, roles: ['admin', 'manager'], industries: ['SACCO / Co-operative'],
        subItems: [
            { href: '/sacco', label: 'Dashboard', icon: LayoutDashboard }, { href: '/sacco/reports', label: 'Reports', icon: BarChart3 }, { href: '/sacco/members', label: 'Member Accounts', icon: Users }, { href: '/sacco/groups', label: 'Group Management', icon: UserCog }, { href: '/sacco/collections', label: 'Group Collections', icon: ClipboardList }, { href: '/sacco/loans', label: 'Loan Applications', icon: FileText }, { href: '/sacco/savings-products', label: 'Savings Products', icon: PiggyBank }, { href: '/sacco/products', label: 'Loan Products', icon: Boxes }, { href: '/sacco/finance', label: 'Financial Ledger', icon: BookOpen }, { href: '/sacco/admin', label: 'Administration', icon: ShieldCheck, roles: ['admin'] },
        ]
    },
    {
        type: 'accordion', title: 'Rentals', icon: Home, roles: ['admin', 'manager'], industries: ['Rentals / Real Estate'],
        subItems: [
            { href: '/rentals/properties', label: 'Properties & Units', icon: Building2 }, { href: '/rentals/leases', label: 'Leases', icon: FileText }, { href: '/rentals/invoices', label: 'Rental Invoices', icon: Receipt },
        ]
    },
    {
        type: 'accordion', title: 'Lending & Microfinance', icon: Landmark, roles: ['admin', 'manager'], industries: ['Lending / Microfinance'],
        subItems: [
            { href: '/lending/applications', label: 'Loan Applications', icon: FileText }, { href: '/lending/borrowers', label: 'Borrower Accounts', icon: Users }, { href: '/lending/officers', label: 'Loan Officers', icon: UserCheck }, { href: '/lending/products', label: 'Loan Products', icon: Boxes },
        ]
    },
    {
        type: 'accordion', title: 'Telecom Services', icon: Smartphone, roles: ['admin', 'manager', 'cashier'], industries: ['Telecom Services'],
        subItems: [
            { href: '/telecom', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
            { href: '/telecom/operator', label: 'Operator Center', icon: Zap, roles: ['admin', 'manager'] },
            // ==================== NEW PAGE ADDED HERE ====================
            { href: '/telecom/agents', label: 'Agent Management', icon: UserCog, roles: ['admin', 'manager'] },
            // =============================================================
            { href: '/telecom/financials', label: 'Financial Controls', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/telecom/agent', label: 'Agent Dashboard', icon: Users, roles: ['cashier'] },
            { href: '/telecom/reports', label: 'Performance Reports', icon: BarChart3, roles: ['admin', 'manager'] },
        ]
    },
     {
        type: 'accordion', title: 'Booking', icon: CalendarDays, roles: ['admin', 'manager'], industries: ['Restaurant / Cafe'],
        subItems: [
            { href: '/booking', label: 'Calendar', icon: CalendarDays }, { href: '/booking/services', label: 'Manage Services', icon: ClipboardPlus },
        ]
    },
    {
        type: 'accordion', title: 'Sales', icon: BarChart3, roles: ['admin', 'manager'],
        industries: ['Retail / Wholesale', 'Restaurant / Cafe', 'Telecom Services'],
        subItems: [
            { href: '/customers', label: 'Customers', icon: Users }, { href: '/returns', label: 'Returns', icon: Undo2 }, { href: '/reports', label: 'Sales Reports', icon: BarChart3 }, { href: '/reports/sales-history', label: 'Sales History', icon: History },
        ]
    },
    {
        type: 'accordion', title: 'Inventory', icon: Boxes, roles: ['admin', 'manager'],
        industries: ['Retail / Wholesale', 'Restaurant / Cafe'],
        subItems: [
            { href: '/inventory', label: 'Products', icon: Boxes }, { href: '/inventory/categories', label: 'Categories', icon: Tags }, { href: '/inventory/composites', label: 'Composite Products', icon: BookOpen }, { href: '/purchases', label: 'Purchase Orders', icon: Truck }, { href: '/inventory/adjustments', label: 'Stock Adjustments', icon: ClipboardCheck }, { href: '/inventory/transfers', label: 'Stock Transfers', icon: ArrowRightLeft },
        ]
    },
    {
        type: 'accordion', title: 'Finance', icon: Briefcase, roles: ['admin', 'manager', 'accountant'],
        subItems: [
            { href: '/expenses', label: 'Expenses', icon: Receipt }, { href: '/finance/tax-management', label: 'Tax Management', icon: Percent }, { href: '/accounting/chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen }, { href: '/accounting/reports', label: 'Financial Reports', icon: Banknote },
        ]
    },
    {
        type: 'accordion', title: 'Management', icon: UsersRound, roles: ['admin', 'manager', 'auditor'],
        subItems: [
            { href: '/management/employees', label: 'Employees', icon: UsersRound, roles: ['admin'] },
            { href: '/management/locations', label: 'Locations', icon: Building2, roles: ['admin'] },
            { href: '/management/budgets', label: 'Budgeting', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/management/monitoring', label: 'Live POS Monitor', icon: Activity, roles: ['admin', 'manager'] },
            { href: '/shifts', label: 'Shift Reports', icon: ClipboardCheck, roles: ['admin', 'manager'] },
            { href: '/management/timecards', label: 'Timecards', icon: ClipboardCheck, roles: ['admin', 'manager'] },
            { href: '/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['admin', 'auditor'] },
            { href: '/accountant', label: 'Accountant Center', icon: BookCopy, roles: ['admin', 'accountant'] },
            { href: '/settings', label: 'General Settings', icon: Settings, roles: ['admin'] },
            { href: '/settings/hardware', label: 'Hardware', icon: Printer, roles: ['admin'] },
            { href: '/management/api', label: 'API & Integrations', icon: KeyRound, roles: ['admin'] },
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { role, isLoading: isLoadingRole } = useUserRole();
    const { data: businessType, isLoading: isLoadingType } = useBusinessType();
    const isLoading = isLoadingRole || isLoadingType;

    const getPosLabel = (industry: string | null) => {
        switch (industry) {
            case 'Restaurant / Cafe':
                return 'Services Desk';
            case 'Retail / Wholesale':
            default:
                return 'Point of Sale';
        }
    };

    const navItems = useMemo(() => {
        if (isLoading) return [];
        const userRole = role?.toLowerCase() || '';
        const userIndustry = businessType || '';

        return navSections
            .map(item => {
                if (item.type === 'link' && item.href === '/pos') {
                    return { ...item, label: getPosLabel(userIndustry) };
                }
                return item;
            })
            .filter(item => {
                const hasRolePermission = item.roles.map(r => r.toLowerCase()).includes(userRole);
                if (!hasRolePermission) return false;
                const hasIndustryPermission = !item.industries || item.industries.includes(userIndustry);
                return hasIndustryPermission;
            });
    }, [isLoading, role, businessType]);

    const activeAccordionValue = useMemo(() => {
        for (const section of navItems) {
            if (section.type === 'accordion' && section.subItems) {
                if (section.subItems.some(sub => pathname.startsWith(sub.href) && sub.href !== '/')) {
                    return section.title;
                }
            }
        }
        return undefined;
    }, [navItems, pathname]);

    return (
        <div className="w-64 bg-card border-r hidden md:flex md:flex-col">
            <div className="p-4 border-b flex items-center">
                <h1 className="text-2xl font-bold text-primary">UG-BizSuite</h1>
            </div>
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                {isLoading ? <div className="p-3 text-sm text-muted-foreground animate-pulse">Loading navigation...</div> : (
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
                                    <AccordionItem key={item.title} value={item.title} className="border-none">
                                        <AccordionTrigger className={cn("px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:no-underline", activeAccordionValue === item.title && "text-primary font-bold")}>
                                            <div className="flex items-center flex-1"><item.icon className="mr-3 h-5 w-5" /><span>{item.title}</span></div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pl-6 pt-1 space-y-1">
                                            {item.subItems.filter(sub =>
                                                !sub.roles || sub.roles.map(r => r.toLowerCase()).includes(userRole)
                                            ).map(subItem => {
                                                const isSubItemActive = pathname.startsWith(subItem.href) && pathname !== item.title;
                                                return (
                                                    <Link
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={cn("flex items-center py-2 px-3 text-sm font-medium rounded-md transition-colors duration-150", isSubItemActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}
                                                    >
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