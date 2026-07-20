'use client';

/**
 * --- BBU1 SOVEREIGN SUPPORT & INTELLIGENCE HUB ---
 * VERSION: v6.2 OMEGA (VOICE COMMAND & SETTINGS INTEGRATED)
 * Use: Dual-mode command center for Support Tickets and Autonomous Receptionist logs.
 * Logic: Linked to crm_visitor_logs for real-time signal pulsing and manual dial-pad gateway.
 */

import * as React from "react";
import Link from "next/link";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { 
    ArrowUpDown, 
    Eye, 
    Check, 
    Hourglass, 
    ChevronsRight, 
    Flag, 
    Circle,
    FileText,
    Coins,
    UserCheck,
    History,
    AlertCircle,
    Search,
    LayoutDashboard,
    Zap,
    BrainCircuit,
    ShieldCheck,
    ArrowLeftRight,
    Mic2,
    Settings,
    PhoneCall
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// --- CONCIERGE COMPONENT IMPORTS ---
import ConciergeDashboard from "./ConciergeDashboard";
import { AuraDialPad } from "./AuraDialPad"; // WELDED: Physical Dialer Interface

// --- TYPES & CONSTANTS ---
interface Customer { id: string; name: string; }
interface Assignee { id: string; full_name: string; }
export interface Ticket {
    id: string;
    ticket_uid: string;
    subject: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ON_HOLD';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    estimated_cost: number;
    currency_code: string;
    created_at: string;
    updated_at: string;
    customers: Customer | null;
    employees: Assignee | null;
}

export const statuses = [
    { value: "OPEN", label: "Open", icon: Circle },
    { value: "IN_PROGRESS", label: "In Progress", icon: Hourglass },
    { value: "CLOSED", label: "Closed", icon: Check },
    { value: "ON_HOLD", label: "On Hold", icon: ChevronsRight },
];

export const priorities = [
    { value: "LOW", label: "Low", icon: Flag },
    { value: "MEDIUM", label: "Medium", icon: Flag },
    { value: "HIGH", label: "High", icon: Flag },
    { value: "URGENT", label: "Urgent", icon: AlertCircle },
];

type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

const getPriorityVariant = (priority: Ticket['priority']): BadgeVariant => {
    switch (priority) {
        case 'URGENT': return 'destructive';
        case 'HIGH': return 'destructive'; 
        case 'LOW': return 'outline';     
        default: return 'secondary';      
    }
};

// --- REPORT GENERATOR ---
const generateSupportAudit = (tickets: Ticket[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text("Support Ticket Audit Report", 14, 20);
    
    autoTable(doc, {
        startY: 30,
        head: [['UID', 'Subject', 'Customer', 'Agent', 'Status', 'Priority', 'Cost']],
        body: tickets.map(t => [
            t.ticket_uid,
            t.subject,
            t.customers?.name || 'N/A',
            t.employees?.full_name || 'Unassigned',
            t.status,
            t.priority,
            `${t.estimated_cost?.toLocaleString()} ${t.currency_code || 'UGX'}`
        ]),
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 }
    });
    doc.save(`Support_Ticket_Audit_${Date.now()}.pdf`);
};

// --- TABLE COLUMNS ---
export const columns: ColumnDef<Ticket>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                className="border-slate-300"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                className="border-slate-300"
            />
        ),
        enableSorting: false,
    },
    {
        accessorKey: "ticket_uid",
        header: "UID",
        cell: ({ row }) => (
            <Link href={`/crm/support/${row.original.id}`} className="font-semibold text-xs text-blue-600 hover:text-blue-800">
                #{row.getValue("ticket_uid")}
            </Link>
        ),
    },
    {
        accessorKey: "subject",
        header: "Subject",
        cell: ({ row }) => (
            <div className="flex flex-col py-1">
                <div className="font-semibold text-slate-900 text-sm leading-tight">{row.getValue("subject")}</div>
                <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center">
                    <History size={12} className="mr-1.5 text-slate-400" /> 
                    Updated {formatDistanceToNow(new Date(row.original.updated_at), { addSuffix: true })}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "customers",
        header: "Customer",
        cell: ({ row }) => (
            <div className="font-medium text-xs text-slate-700">
                {row.original.customers?.name || 'N/A'}
            </div>
        ),
    },
    {
        accessorKey: "employees",
        header: "Agent",
        cell: ({ row }) => (
            <div className="flex items-center text-xs font-medium text-slate-600">
                <UserCheck className="mr-2 h-3.5 w-3.5 text-slate-400" />
                {row.original.employees?.full_name || 'Unassigned'}
            </div>
        ),
    },
    {
        accessorKey: "estimated_cost",
        header: "Cost",
        cell: ({ row }) => (
            <div className="flex items-center text-xs font-bold text-slate-900">
                <Coins className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                {row.original.estimated_cost?.toLocaleString()} {row.original.currency_code || 'UGX'}
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = statuses.find(s => s.value === row.getValue("status"));
            return status ? (
                <div className="flex items-center text-xs font-medium text-slate-600">
                    <status.icon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    {status.label}
                </div>
            ) : null;
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
            <Badge variant={getPriorityVariant(row.getValue("priority"))} className="text-[10px] font-bold px-2.5 py-0.5 border-none">
                {row.getValue("priority")}
            </Badge>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Link href={`/crm/support/${row.original.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-50 text-blue-600">
                        <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                </Link>
            </div>
        ),
    },
];

export function TicketList({ tickets, businessId }: { tickets: Ticket[], businessId: string }) {
    const supabase = createClient();
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'updated_at', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});
    
    // --- MODE TOGGLE & MODAL STATES ---
    const [viewMode, setViewMode] = React.useState<'TICKETS' | 'AI_CONCIERGE'>('TICKETS');
    const [isDialPadOpen, setIsDialPadOpen] = React.useState(false);

    // --- LIVE INTELLIGENCE PULSE (WEB VISITORS) ---
    const { data: activeVisitorCount } = useQuery({
        queryKey: ['active_visitor_pulse', businessId],
        queryFn: async () => {
            const { count } = await supabase
                .from('crm_visitor_logs')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('is_active', true);
            return count || 0;
        },
        refetchInterval: 5000 
    });

    const table = useReactTable({
        data: tickets,
        columns,
        state: { sorting, columnFilters, rowSelection },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // --- CONDITIONAL RENDER: AI CONCIERGE MODE ---
    if (viewMode === 'AI_CONCIERGE') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center px-4 py-2 bg-slate-900 rounded-2xl shadow-lg border border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-600 rounded-xl text-white">
                            <BrainCircuit size={18} />
                        </div>
                        <span className="text-white font-bold text-sm tracking-tight">Autonomous Receptionist Activated</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => setIsDialPadOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 rounded-xl gap-2 text-xs shadow-lg shadow-blue-500/20"
                        >
                            <PhoneCall size={14} /> Voice Command
                        </Button>
                        <Button 
                            onClick={() => setViewMode('TICKETS')} 
                            className="bg-white hover:bg-slate-100 text-slate-900 font-bold h-9 rounded-xl gap-2 text-xs"
                        >
                            <ArrowLeftRight size={14} /> Back to Ticket Ledger
                        </Button>
                    </div>
                </div>
                <ConciergeDashboard businessId={businessId} />

                {/* VOIP DIAL PAD MODAL */}
                <Dialog open={isDialPadOpen} onOpenChange={setIsDialPadOpen}>
                    <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-md">
                        <AuraDialPad />
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // --- STANDARD TICKET LEDGER MODE ---
    return (
        <div className="space-y-6">
            {/* --- INTELLIGENCE ACTION BAR --- */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                        <Zap size={14} className="fill-blue-600 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Aura Signal: {activeVisitorCount || 0} Visitors Online</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-200" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Support Operations Center</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* WELDED: QUICK DIAL TRIGGER */}
                    <Button 
                        onClick={() => setIsDialPadOpen(true)} 
                        variant="outline" 
                        className="h-11 px-5 rounded-2xl border-slate-200 gap-3 hover:bg-blue-600 hover:text-white transition-all group"
                    >
                        <Mic2 size={18} className="text-blue-500 group-hover:text-white" />
                        <span className="font-bold text-xs uppercase tracking-wider">Voice Command</span>
                    </Button>

                    <Button 
                        onClick={() => setViewMode('AI_CONCIERGE')} 
                        variant="outline" 
                        className="h-11 px-5 rounded-2xl border-slate-200 gap-3 hover:bg-slate-900 hover:text-white transition-all group"
                    >
                        <LayoutDashboard size={18} className="text-blue-500 group-hover:text-white" />
                        <span className="font-bold text-xs uppercase tracking-wider">AI Receptionist Hub</span>
                    </Button>

                    {/* WELDED: VOICE SETTINGS GATEWAY */}
                    <Link href="/crm/settings/voice">
                        <Button 
                            variant="outline" 
                            className="h-11 w-11 p-0 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
                            title="Aura Voice Settings"
                        >
                            <Settings size={18} className="text-slate-500 group-hover:text-blue-600 group-hover:rotate-90 transition-all" />
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-0">
                    {/* SEARCH & FILTER BAR */}
                    <div className="flex flex-wrap items-center justify-between px-8 py-6 bg-slate-50/30 border-b border-slate-100 gap-4">
                        <div className="flex flex-wrap items-center w-full max-w-3xl gap-4">
                            <div className="relative min-w-[320px] flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by subject, UID, or customer context..."
                                    value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
                                    onChange={(event) => table.getColumn("subject")?.setFilterValue(event.target.value)}
                                    className="h-12 pl-12 text-sm font-medium border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="flex gap-2">
                                <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statuses} />
                                <DataTableFacetedFilter column={table.getColumn("priority")} title="Priority" options={priorities} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-12 px-5 text-xs font-black uppercase tracking-widest gap-2 border-slate-200 bg-white hover:bg-slate-50 rounded-2xl" 
                                onClick={() => generateSupportAudit(tickets)}
                            >
                                <FileText size={16} /> Audit Export
                            </Button>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="border-slate-100 hover:bg-transparent h-14">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} className="px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow 
                                            key={row.id} 
                                            data-state={row.getIsSelected() && "selected"}
                                            className="hover:bg-slate-50/50 border-slate-50 transition-all h-24"
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="px-8 py-4">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <History size={48} />
                                                <p className="text-sm font-black uppercase tracking-widest">No support tickets found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* PAGINATION FOOTER */}
                    <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 bg-white">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-4">
                            <ShieldCheck size={14} className="text-blue-500" />
                            {table.getFilteredSelectedRowModel().rows.length} of{" "}
                            {table.getFilteredRowModel().rows.length} Records Isolated
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-10 px-5 text-[10px] font-black uppercase tracking-widest border-slate-200 rounded-xl" 
                                onClick={() => table.previousPage()} 
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-10 px-5 text-[10px] font-black uppercase tracking-widest border-slate-200 rounded-xl" 
                                onClick={() => table.nextPage()} 
                                disabled={!table.getCanNextPage()}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* VOIP DIAL PAD MODAL (GATEWAY TO VOICE COMMAND) */}
            <Dialog open={isDialPadOpen} onOpenChange={setIsDialPadOpen}>
                <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-md">
                    <AuraDialPad />
                </DialogContent>
            </Dialog>
        </div>
    );
}

const X = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);