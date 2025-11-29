// src/components/Sidebar.tsx

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

// --- V-REVOLUTION FIX: THIS IMPORT PATH IS NOW CORRECT ---
import { useCopilot } from '@/context/CopilotContext'; 
// --- END OF FIX ---

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
    LayoutDashboard, ShoppingCart, Clock, Users, BarChart3, History, Boxes, Truck,
    ClipboardCheck, Receipt, BookOpen, Banknote, BookCopy, Briefcase, UsersRound,
    ShieldCheck, Settings, Landmark, Home, FileText, Tags, Undo2, LucideIcon,
    Building2, Handshake, ClipboardList, UserCog, Sparkles, ArrowRightLeft, Percent,
    Printer, CalendarDays, ClipboardPlus, Activity, Route, KeyRound, PiggyBank,
    UserCheck as UserCheckIcon, Smartphone, Zap, SlidersHorizontal, FileSpreadsheet, 
    UploadCloud, Plug, Scale, Wallet, FileWarning, Construction, Wrench, FolderKanban, 
    Library, ScrollText, PieChart, Gavel, FileCheck, Calculator, HardHat, Signal, HeartHandshake
} from 'lucide-react';

import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useTenantModules';
import { useTenant } from '@/hooks/useTenant';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

// --- Type Definitions (Unchanged) ---
interface NavLink { type: 'link'; href: string; label: string; icon: LucideIcon; roles: string[]; module?: string; }
interface SubItem { href:string; label: string; icon: LucideIcon; roles?: string[]; businessTypes?: string[]; }
interface NavAccordion { type: 'accordion'; title: string; icon: LucideIcon; roles: string[]; module: string; subItems: SubItem[]; }
type NavItem = NavLink | NavAccordion;

const navSections: NavItem[] = [
    { type: 'link', href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { type: 'link', href: '/copilot', label: 'AI Co-Pilot', icon: Sparkles, roles: ['admin', 'manager', 'accountant', 'auditor'] },
    { type: 'link', href: '/time-clock', label: 'Time Clock', icon: Clock, roles: ['admin', 'manager', 'cashier'] },
    { type: 'link', href: '/pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'], module: 'sales' },
    
    // --- SALES ---
    {
        type: 'accordion', title: 'Sales', icon: BarChart3, roles: ['admin', 'manager'], module: 'sales',
        subItems: [
            { href: '/customers', label: 'Customers', icon: Users },
            { href: '/invoicing', label: 'Invoices & Quotes', icon: FileText }, // Added from File 1
            { href: '/returns', label: 'Returns', icon: Undo2 },
            { href: '/reports', label: 'Sales Reports', icon: BarChart3 },
            { href: '/reports/sales-history', label: 'Sales History', icon: History },
            { href: '/dsr', label: 'Daily Sales Report', icon: FileSpreadsheet, roles: ['admin', 'manager'] },
            { href: '/sales/pricing-rules', label: 'Advanced Pricing', icon: Percent, roles: ['admin'], businessTypes: ['Retail / Wholesale', 'Distribution'] },
        ]
    },

    // --- INVENTORY ---
    {
        type: 'accordion', title: 'Inventory', icon: Boxes, roles: ['admin', 'manager'], module: 'inventory',
        subItems: [
            { href: '/inventory', label: 'Products & Stock', icon: Boxes },
            { href: '/inventory/categories', label: 'Categories', icon: Tags },
            { href: '/inventory/composites', label: 'Manufacturing', icon: BookOpen, businessTypes: ['Retail / Wholesale', 'Distribution'] },
            { href: '/purchases', label: 'Purchase Orders', icon: Truck },
            { href: '/inventory/adjustments', label: 'Stock Adjustments', icon: ClipboardCheck },
            { href: '/inventory/transfers/new', label: 'Stock Transfers', icon: ArrowRightLeft },
            // Added from File 1:
            { href: '/inventory/cycle-counts', label: 'Cycle Counts', icon: ClipboardList },
            { href: '/inventory/maintenance', label: 'Asset Maintenance', icon: Wrench },
            { href: '/inventory/repairs', label: 'Repair Tickets', icon: Wrench },
        ]
    },

    // --- PROCUREMENT (Added from File 1) ---
    {
        type: 'accordion', title: 'Procurement', icon: ScrollText, roles: ['admin', 'manager'], module: 'procurement',
        subItems: [
            { href: '/procurement', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/procurement/tenders', label: 'Tenders & Bids', icon: Gavel },
            { href: '/procurement/contracts', label: 'Contract Mgmt', icon: FileCheck },
            { href: '/procurement/suppliers', label: 'Supplier Risk', icon: ShieldCheck },
            { href: '/procurement/spend', label: 'Spend Analysis', icon: PieChart },
        ]
    },

    // --- PROFESSIONAL SERVICES ---
    {
        type: 'accordion', title: 'Professional Services', icon: Briefcase, roles: ['admin', 'manager'], module: 'professional-services',
        subItems: [
            { href: '/professional-services', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/professional-services/clients', label: 'Client Hub', icon: Users },
            { href: '/professional-services/projects', label: 'Case / Project Mgmt', icon: FolderKanban },
            { href: '/professional-services/resource-planning', label: 'Resource Planning', icon: UsersRound }, // Added from File 1
            { href: '/professional-services/billing', label: 'Time & Billing', icon: Receipt },
            { href: '/professional-services/documents', label: 'Document Management', icon: Library },
            { href: '/professional-services/reports', label: 'Practice Reports', icon: FileText }, // Added from File 1
            { href: '/professional-services/trust-accounting', label: 'Trust Accounting', icon: Landmark, businessTypes: ['Professional Services (Accounting, Legal)'] },
        ]
    },

    // --- HUMAN RESOURCES ---
    {
        type: 'accordion', title: 'Human Resources', icon: UsersRound, roles: ['admin', 'manager'], module: 'hcm',
        subItems: [ 
            { href: '/hr/leave', label: 'Leave Management', icon: CalendarDays }, 
            { href: '/hr/recruitment', label: 'Recruitment', icon: UserCheckIcon }, 
            { href: '/hr/performance', label: 'Performance', icon: Activity }, 
            { href: '/hr/onboarding', label: 'Onboarding', icon: ClipboardCheck }, 
            // Added from File 1:
            { href: '/hr/benefits', label: 'Benefits Admin', icon: HeartHandshake },
            { href: '/hr/rewards', label: 'Rewards & Recognition', icon: Sparkles },
            { href: '/hr/fleet', label: 'Fleet Management', icon: Truck },
        ]
    },

    // --- NON-PROFIT & NGO (Added from File 1) ---
    {
        type: 'accordion', title: 'Non-Profit', icon: HeartHandshake, roles: ['admin', 'manager'], module: 'nonprofit',
        subItems: [ 
            { href: '/nonprofit/donors', label: 'Donor Management', icon: Users },
            { href: '/nonprofit/donations', label: 'Donations', icon: Banknote },
            { href: '/nonprofit/grants', label: 'Grants Mgmt', icon: FileText },
            { href: '/nonprofit/fundraising', label: 'Campaigns', icon: Sparkles },
            { href: '/nonprofit/volunteering', label: 'Volunteers', icon: Handshake },
            { href: '/nonprofit/impact', label: 'Impact Reporting', icon: Activity },
            { href: '/nonprofit/communication', label: 'Communication', icon: Signal },
        ]
    },

    // --- CRM ---
    {
        type: 'accordion', title: 'CRM', icon: Handshake, roles: ['admin', 'manager'], module: 'crm',
        subItems: [ { href: '/crm/leads', label: 'Sales Pipeline', icon: BarChart3 }, { href: '/crm/support', label: 'Support Tickets', icon: Users }, { href: '/crm/marketing', label: 'Marketing', icon: Sparkles }, ]
    },

    // --- E-COMMERCE ---
    {
        type: 'accordion', title: 'eCommerce', icon: ShoppingCart, roles: ['admin', 'manager'], module: 'ecommerce',
        subItems: [ { href: '/ecommerce', label: 'Dashboard', icon: LayoutDashboard }, { href: '/ecommerce/orders', label: 'Online Orders', icon: ClipboardCheck }, { href: '/ecommerce/products', label: 'Online Products', icon: Boxes }, ]
    },

    // --- CONTRACTOR TOOLS ---
    {
        type: 'accordion', title: 'Contractor Tools', icon: Construction, roles: ['admin', 'manager'], module: 'contractor',
        subItems: [ { href: '/contractor', label: 'Dashboard', icon: LayoutDashboard }, { href: '/contractor/jobs', label: 'Job Management', icon: Briefcase }, { href: '/contractor/estimates', label: 'Estimates & Bids', icon: FileText }, { href: '/contractor/change-orders', label: 'Change Orders', icon: Undo2 }, ]
    },

    // --- FIELD SERVICE ---
    {
        type: 'accordion', title: 'Field Service', icon: Wrench, roles: ['admin', 'manager'], module: 'field-service',
        subItems: [ 
            { href: '/field-service/schedule', label: 'Dispatch & Schedule', icon: CalendarDays }, 
            { href: '/field-service/work-orders', label: 'Work Orders', icon: ClipboardList }, 
            { href: '/field-service/equipment', label: 'Equipment', icon: Truck }, 
            // Added from File 1:
            { href: '/field-service/analytics', label: 'Service Analytics', icon: BarChart3 },
            { href: '/field-service/technician', label: 'Technician Portal', icon: Smartphone },
        ]
    },

    // --- FINANCE ---
    {
        type: 'accordion', title: 'Finance', icon: Scale, roles: ['admin', 'manager', 'accountant'], module: 'finance',
        subItems: [ 
            { href: '/finance', label: 'Financial Reports', icon: BarChart3, roles: ['admin', 'manager', 'accountant'] }, 
            // Added from File 1:
            { href: '/finance/banking', label: 'Banking & Reconciliation', icon: Landmark, roles: ['admin', 'manager', 'accountant'] },
            { href: '/finance/payables', label: 'Accounts Payable', icon: UploadCloud, roles: ['admin', 'accountant'] },
            { href: '/finance/receivables', label: 'Accounts Receivable', icon: UploadCloud, roles: ['admin', 'accountant'] },
            // Existing in File 2:
            { href: '/expenses', label: 'Expenses', icon: Wallet, roles: ['admin', 'manager', 'accountant', 'cashier'] },
            { href: '/ledger', label: 'General Ledger', icon: BookOpen, roles: ['admin', 'manager', 'accountant'] },
            // Added from File 1:
            { href: '/finance/tax', label: 'Tax Returns', icon: FileWarning, roles: ['admin', 'accountant'] },
        ]
    },

    // --- DISTRIBUTION ---
    {
        type: 'accordion', title: 'Distribution', icon: Truck, roles: ['admin', 'manager'], module: 'distribution',
        subItems: [ { href: '/distribution', label: 'Dashboard', icon: LayoutDashboard }, { href: '/distribution/routes', label: 'Routes & Vehicles', icon: Route }, { href: '/distribution/settlement', label: 'Route Settlements', icon: ClipboardCheck }, ]
    },

    // --- SACCO & CO-OPS ---
    {
        type: 'accordion', title: 'SACCO & Co-ops', icon: Handshake, roles: ['admin', 'manager'], module: 'sacco',
        subItems: [ 
            { href: '/sacco', label: 'Dashboard', icon: LayoutDashboard }, 
            { href: '/sacco/reports', label: 'Reports', icon: BarChart3 }, 
            { href: '/sacco/members', label: 'Member Accounts', icon: Users }, 
            { href: '/sacco/groups', label: 'Group Management', icon: UserCog }, 
            { href: '/sacco/collections', label: 'Group Collections', icon: ClipboardList }, 
            { href: '/sacco/loans', label: 'Loan Applications', icon: FileText }, 
            // Added from File 1:
            { href: '/sacco/shares', label: 'Share Capital', icon: PieChart },
            { href: '/sacco/dividends', label: 'Dividends', icon: Banknote },
            // Existing:
            { href: '/sacco/savings-products', label: 'Savings Products', icon: PiggyBank }, 
            { href: '/sacco/products', label: 'Loan Products', icon: Boxes }, 
            { href: '/sacco/finance', label: 'Financial Ledger', icon: BookOpen }, 
            { href: '/sacco/admin', label: 'Administration', icon: ShieldCheck, roles: ['admin'] }, 
        ]
    },

    // --- RENTALS ---
    {
        type: 'accordion', title: 'Rentals', icon: Home, roles: ['admin', 'manager'], module: 'rentals',
        subItems: [ { href: '/rentals/properties', label: 'Properties & Units', icon: Building2 }, { href: '/rentals/leases', label: 'Leases', icon: FileText }, { href: '/rentals/invoices', label: 'Rental Invoices', icon: Receipt }, ]
    },

    // --- LENDING ---
    {
        type: 'accordion', title: 'Lending & Microfinance', icon: Landmark, roles: ['admin', 'manager'], module: 'lending',
        subItems: [ { href: '/lending/applications', label: 'Loan Applications', icon: FileText }, { href: '/lending/borrowers', label: 'Borrower Accounts', icon: Users }, { href: '/lending/officers', label: 'Loan Officers', icon: UserCheckIcon }, { href: '/lending/products', label: 'Loan Products', icon: Boxes }, ]
    },

    // --- TELECOM ---
    {
        type: 'accordion', title: 'Telecom Services', icon: Smartphone, roles: ['admin', 'manager', 'cashier', 'accountant'], module: 'telecom',
        subItems: [ { href: '/telecom', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] }, { href: '/telecom/operator', label: 'Operator Center', icon: Zap, roles: ['admin', 'manager'] }, { href: '/telecom/agents', label: 'Agent Management', icon: UserCog, roles: ['admin', 'manager'] }, { href: '/telecom/products', label: 'Product Management', icon: Boxes, roles: ['admin', 'manager'] }, { href: '/telecom/reconciliation', label: 'Reconciliation Center', icon: ClipboardCheck, roles: ['admin', 'manager', 'accountant'] }, { href: '/telecom/financials', label: 'Financial Controls', icon: Banknote, roles: ['admin', 'manager'] }, { href: '/telecom/reports', label: 'Performance Reports', icon: BarChart3, roles: ['admin', 'manager'] }, { href: '/telecom/history', label: 'Financial History', icon: History, roles: ['admin', 'manager', 'accountant'] }, { href: '/telecom/dsr-dashboard', label: 'DSR Field App', icon: Activity, roles: ['cashier'] }, { href: '/telecom/agent', label: 'Agent Dashboard', icon: Users, roles: ['cashier'] }, ]
    },

    // --- BOOKING ---
    {
        type: 'accordion', title: 'Booking', icon: CalendarDays, roles: ['admin', 'manager'], module: 'booking',
        subItems: [ { href: '/booking', label: 'Calendar', icon: CalendarDays }, { href: '/booking/services', label: 'Manage Services', icon: ClipboardPlus }, ]
    },

    // --- COLLABORATION ---
    {
        type: 'accordion', title: 'Collaboration', icon: Users, roles: ['admin', 'manager', 'cashier', 'accountant', 'auditor'], module: 'collaboration',
        subItems: [ { href: '/workbooks', label: 'Live Workbooks', icon: FileSpreadsheet, roles: ['admin', 'manager', 'cashier', 'accountant'] }, ]
    },

    // --- BUSINESS HUB ---
    {
        type: 'accordion', title: 'Business Hub', icon: Briefcase, roles: ['admin', 'manager', 'accountant', 'cashier', 'auditor'], module: 'business-hub',
        subItems: [ { href: '/library', label: 'Document Library', icon: FileSpreadsheet, roles: ['admin', 'manager', 'accountant', 'cashier', 'auditor'] }, ]
    },

    // --- MANAGEMENT ---
    {
        type: 'accordion', title: 'Management', icon: UserCog, roles: ['admin', 'manager', 'auditor'], module: 'management',
        subItems: [
            { href: '/management/employees', label: 'Employees', icon: UsersRound, roles: ['admin'] },
            { href: '/payroll', label: 'Payroll', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/management/locations', label: 'Locations', icon: Building2, roles: ['admin'] },
            { href: '/management/budgets', label: 'Budgeting', icon: Banknote, roles: ['admin', 'manager'] },
            { href: '/management/monitoring', label: 'Live POS Monitor', icon: Activity, roles: ['admin', 'manager'], businessTypes: ['Retail / Wholesale', 'Distribution'] },
            { href: '/shifts', label: 'Shift Reports', icon: ClipboardCheck, roles: ['admin', 'manager'] },
            { href: '/management/timecards', label: 'Timecards', icon: ClipboardCheck, roles: ['admin', 'manager'] },
            { href: '/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['admin', 'auditor'] },
            { href: '/compliance', label: 'Tax & Compliance', icon: FileWarning, roles: ['admin', 'manager', 'auditor'] },
            { href: '/accountant', label: 'Accountant Center', icon: BookCopy, roles: ['admin', 'accountant'] },
            { href: '/settings', label: 'General Settings', icon: Settings, roles: ['admin'] },
            { href: '/loyalty', label: 'Loyalty Program', icon: Percent, roles: ['admin'], businessTypes: ['Retail / Wholesale'] },
            { href: '/settings/branding', label: 'Branding', icon: Sparkles, roles: ['admin'] },
            { href: '/settings/hardware', label: 'Hardware', icon: Printer, roles: ['admin'] },
            { href: '/settings/currencies', label: 'Currencies', icon: Banknote, roles: ['admin'] },
            { href: '/settings/migration', label: 'Data Migration', icon: UploadCloud, roles: ['admin'] },
            { href: '/marketplace', label: 'App Marketplace', icon: Plug, roles: ['admin'] },
            { href: '/settings/integrations', label: 'API Integrations', icon: Plug, roles: ['admin'] },
            { href: '/management/api', label: 'API Keys', icon: KeyRound, roles: ['admin'] },
        ]
    },
];

const settingsNav = { href: '/dashboard/settings', label: 'General Settings', Icon: Settings, roles: ['admin'] };

const NavLinkComponent = ({ href, label, Icon, isSidebarOpen }: { href: string; label: string; Icon: React.ElementType; isSidebarOpen: boolean; }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isSidebarOpen) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className="w-full justify-center"
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className="w-full justify-start"
      >
        <Icon className="mr-3 h-5 w-5" />
        {label}
      </Button>
    </Link>
  );
};

export default function Sidebar() {
    const pathname = usePathname();
    const { role, isLoading: isLoadingRole } = useUserRole();
    const { data: enabledModules, isLoading: isLoadingModules } = useTenantModules();
    const { data: tenant, isLoading: isLoadingTenant } = useTenant();
    
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const { openCopilot } = useCopilot(); // The hook is used here.

    const isLoading = isLoadingRole || isLoadingModules || isLoadingTenant;

    const finalNavItems = useMemo(() => {
        if (isLoading || !role || !enabledModules || !tenant) return [];
        const userRole = role.toLowerCase();
        const businessType = tenant.business_type || '';

        return navSections.filter(item => {
            const hasRolePermission = item.roles.map(r => r.toLowerCase()).includes(userRole);
            if (!hasRolePermission) return false;
            if (item.module) return enabledModules.includes(item.module);
            return true;
        });
    }, [isLoading, role, enabledModules, tenant]);

    const activeAccordionValue = useMemo(() => {
        for (const section of navSections) {
            if (section.type === 'accordion' && section.subItems?.some(sub => pathname.startsWith(sub.href) && sub.href !== '/')) {
                return section.module;
            }
        }
        return undefined;
    }, [pathname]);

    const renderAccordionNav = (items: NavItem[]) => (
        <Accordion type="single" collapsible defaultValue={activeAccordionValue} className="w-full">
            {items.map((item) => {
                if (item.type === 'link') {
                    const { icon: Icon, ...rest } = item;
                    return <NavLinkComponent key={item.href} {...rest} Icon={Icon} isSidebarOpen={isSidebarOpen} />;
                }
                if (item.type === 'accordion') {
                    const userRole = role?.toLowerCase() || '';
                    const businessType = tenant?.business_type || '';
                    const filteredSubItems = item.subItems.filter(sub => {
                        const hasRolePermission = !sub.roles || sub.roles.map(r => r.toLowerCase()).includes(userRole);
                        const hasBusinessTypePermission = !sub.businessTypes || sub.businessTypes.includes(businessType);
                        return hasRolePermission && hasBusinessTypePermission;
                    });

                    if (filteredSubItems.length === 0) return null;
                    if (!isSidebarOpen) return null;

                    return (
                        <AccordionItem key={item.module} value={item.module} className="border-none">
                            <AccordionTrigger className={cn("px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:no-underline", activeAccordionValue === item.module && "text-primary font-bold")}>
                                <div className="flex items-center flex-1"><item.icon className="mr-3 h-5 w-5" /><span>{item.title}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-6 pt-1 space-y-1">
                                {filteredSubItems.map(subItem => {
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
    );

    return (
        <aside className={cn(
            "h-full bg-card border-r flex flex-col transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-64" : "w-20"
        )}>
            <div className="flex items-center justify-between h-16 border-b px-4 flex-shrink-0">
                {isSidebarOpen && <h1 className="text-lg font-bold tracking-tight text-primary">BBU1</h1>}
                <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"} className={cn(!isSidebarOpen && "mx-auto")}>
                    {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </Button>
            </div>
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground animate-pulse">Loading navigation...</div>
                ) : (
                    renderAccordionNav(finalNavItems)
                )}
            </nav>
            <div className="p-4 mt-auto border-t space-y-2 flex-shrink-0">
                {isSidebarOpen ? (
                    <Button variant="outline" className="w-full justify-start" onClick={openCopilot}>
                        <Sparkles className="mr-3 h-5 w-5 text-primary" />
                        Ask Aura
                    </Button>
                ) : (
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="w-full" onClick={openCopilot} aria-label="Ask Aura">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Ask Aura</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <NavLinkComponent {...settingsNav} Icon={settingsNav.Icon} isSidebarOpen={isSidebarOpen} />
            </div>
        </aside>
    );
}