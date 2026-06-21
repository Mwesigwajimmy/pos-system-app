'use client';

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
    X, 
    Hourglass, 
    ChevronsRight, 
    Flag, 
    Circle,
    FileText,
    Coins,
    UserCheck,
    History,
    AlertCircle
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

// --- TYPES & CONSTANTS ENHANCED FOR FORENSIC TRACKING ---
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
    { value: "OPEN", label: "Open Record", icon: Circle },
    { value: "IN_PROGRESS", label: "Resolving", icon: Hourglass },
    { value: "CLOSED", label: "Finalized", icon: Check },
    { value: "ON_HOLD", label: "Blocked", icon: ChevronsRight },
];

export const priorities = [
    { value: "LOW", label: "Routine", icon: Flag },
    { value: "MEDIUM", label: "Standard", icon: Flag },
    { value: "HIGH", label: "High Risk", icon: Flag },
    { value: "URGENT", label: "Critical", icon: AlertCircle },
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

// --- FORENSIC AUDIT GENERATOR ---
const generateSupportAudit = (tickets: Ticket[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("Sovereign Support: Resolution Forensic Audit", 14, 20);
    
    autoTable(doc, {
        startY: 30,
        head: [['ID', 'Subject', 'Client', 'Agent', 'Status', 'Priority', 'Est. Cost']],
        body: tickets.map(t => [
            t.ticket_uid,
            t.subject,
            t.customers?.name || 'N/A',
            t.employees?.full_name || 'Unassigned',
            t.status,
            t.priority,
            `${t.estimated_cost?.toLocaleString()} ${t.currency_code || 'UGX'}`
        ]),
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 }
    });
    doc.save(`Support_Audit_${Date.now()}.pdf`);
};

// --- ENHANCED COLUMNS ---
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
            <Link href={`/crm/support/${row.original.id}`} className="font-black text-[11px] text-blue-600 hover:underline tracking-tighter">
                #{row.getValue("ticket_uid")}
            </Link>
        ),
    },
    {
        accessorKey: "subject",
        header: "Issue DNA",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <div className="font-bold text-slate-800 text-xs leading-tight">{row.getValue("subject")}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 flex items-center">
                    <History size={10} className="mr-1" /> Updated {formatDistanceToNow(new Date(row.original.updated_at), { addSuffix: true })}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "customers",
        header: "Client",
        cell: ({ row }) => (
            <div className="font-semibold text-xs text-slate-600">
                {row.original.customers?.name || 'N/A'}
            </div>
        ),
    },
    {
        accessorKey: "employees",
        header: "Agent",
        cell: ({ row }) => (
            <div className="flex items-center text-[10px] font-bold text-slate-500">
                <UserCheck className="mr-1.5 h-3 w-3 text-slate-300" />
                {row.original.employees?.full_name || 'Unassigned'}
            </div>
        ),
    },
    {
        accessorKey: "resolution_cost",
        header: "Resolution Cost",
        cell: ({ row }) => (
            <div className="flex items-center text-[10px] font-black text-slate-900">
                <Coins className="mr-1.5 h-3 w-3 text-emerald-500" />
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
                <div className="flex items-center text-[10px] font-bold text-slate-600">
                    <status.icon className="mr-1.5 h-3 w-3 text-slate-400" />
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
            <Badge variant={getPriorityVariant(row.getValue("priority"))} className="text-[9px] font-black uppercase px-2 py-0">
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
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-blue-600">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Intel
                    </Button>
                </Link>
            </div>
        ),
    },
];

export function TicketList({ tickets }: { tickets: Ticket[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'updated_at', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});

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

    return (
        <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-0">
                {/* FORENSIC SEARCH & FILTER HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-slate-50/50 border-b gap-4">
                    <div className="flex items-center w-full max-w-xl gap-2">
                        <Input
                            placeholder="Filter by subject or UID..."
                            value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => table.getColumn("subject")?.setFilterValue(event.target.value)}
                            className="h-9 font-semibold text-xs border-slate-200 bg-white"
                        />
                        <div className="flex space-x-2">
                            <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statuses} />
                            <DataTableFacetedFilter column={table.getColumn("priority")} title="Priority" options={priorities} />
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200" 
                        onClick={() => generateSupportAudit(tickets)}
                    >
                        <FileText size={14} /> Download Ledger
                    </Button>
                </div>

                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-100">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-12 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">
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
                                        className="hover:bg-slate-50/50 border-slate-50 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-32 text-center text-xs font-bold text-slate-400">
                                        No forensic support records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} Tickets Selected
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="h-8 font-bold text-[10px] uppercase border-slate-100" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                            Prev
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 font-bold text-[10px] uppercase border-slate-100" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}