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
    Hourglass, 
    ChevronsRight, 
    Flag, 
    Circle,
    FileText,
    Coins,
    UserCheck,
    History,
    AlertCircle,
    Search
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
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0">
                {/* SEARCH & FILTER BAR */}
                <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-100 gap-4">
                    <div className="flex flex-wrap items-center w-full max-w-2xl gap-3">
                        <div className="relative min-w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by subject or UID..."
                                value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
                                onChange={(event) => table.getColumn("subject")?.setFilterValue(event.target.value)}
                                className="h-10 pl-10 text-sm font-medium border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statuses} />
                            <DataTableFacetedFilter column={table.getColumn("priority")} title="Priority" options={priorities} />
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-10 text-xs font-bold gap-2 border-slate-200 bg-white hover:bg-slate-50" 
                        onClick={() => generateSupportAudit(tickets)}
                    >
                        <FileText size={16} /> Export PDF
                    </Button>
                </div>

                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="border-slate-100 hover:bg-transparent">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-12 px-6 text-xs font-bold text-slate-700">
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
                                        className="hover:bg-slate-50/30 border-slate-50 transition-colors"
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
                                    <TableCell colSpan={columns.length} className="h-40 text-center text-sm font-medium text-slate-500">
                                        No support tickets found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} Records Selected
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-bold border-slate-200" 
                            onClick={() => table.previousPage()} 
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-bold border-slate-200" 
                            onClick={() => table.nextPage()} 
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}