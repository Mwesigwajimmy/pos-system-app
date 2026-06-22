'use client';

import * as React from "react";
import Link from "next/link";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { 
    ArrowUpDown, 
    Eye, 
    Mail, 
    MessageSquare, 
    Globe, 
    TrendingUp, 
    Coins, 
    Target,
    FileText,
    MapPin,
    UserCheck
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// --- TYPES & CONSTANTS ENHANCED FOR DEEP INTEL ---
interface Creator { id: string; full_name: string; }
export interface Campaign {
    id: string;
    name: string;
    campaign_category: 'EMAIL' | 'SMS' | 'ADS' | 'BOOTCAMP' | 'EVENT' | 'OUTREACH';
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'ACTIVE' | 'ARCHIVED';
    created_at: string;
    scheduled_at: string | null;
    sent_at: string | null;
    budget_spent: number;
    projected_revenue: number;
    currency_code: string;
    target_location: string | null;
    employees: Creator | null;
}

type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

const getStatusVariant = (status: Campaign['status']): BadgeVariant => {
    switch (status) {
        case 'SENT': 
        case 'ACTIVE': return 'default';
        case 'SCHEDULED': return 'secondary';
        case 'ARCHIVED': return 'destructive';
        case 'DRAFT':
        default: return 'outline';
    }
};

// --- FORENSIC AUDIT GENERATOR ---
const generateCampaignAudit = (campaigns: Campaign[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("Sovereign Marketing: Campaign Forensic Audit", 14, 20);
    
    autoTable(doc, {
        startY: 30,
        head: [['Name', 'Category', 'Status', 'Location', 'Budget', 'Projection', 'Agent']],
        body: campaigns.map(c => [
            c.name,
            c.campaign_category,
            c.status,
            c.target_location || 'Global',
            `${(c.budget_spent || 0).toLocaleString()} ${c.currency_code || 'UGX'}`,
            `${(c.projected_revenue || 0).toLocaleString()} ${c.currency_code || 'UGX'}`,
            c.employees?.full_name || 'N/A'
        ]),
        headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`Marketing_Audit_${Date.now()}.pdf`);
};

// --- ENHANCED COLUMNS FOR ENTERPRISE TRACKING ---
export const columns: ColumnDef<Campaign>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button variant="ghost" className="font-black text-[10px] uppercase tracking-widest p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Campaign Identity <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex flex-col">
                <Link href={`/crm/marketing/${row.original.id}`} className="font-bold text-slate-900 hover:underline">
                    {row.getValue("name")}
                </Link>
                <div className="flex items-center text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    <MapPin className="h-2.5 w-2.5 mr-1" /> {row.original.target_location || 'Global Reach'}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "campaign_category",
        header: "Strategy",
        cell: ({ row }) => {
            const cat = row.getValue("campaign_category") as Campaign['campaign_category'];
            const Icon = cat === 'EMAIL' ? Mail : (cat === 'SMS' ? MessageSquare : (cat === 'ADS' ? Target : Globe));
            return (
                <div className="flex items-center text-[11px] font-bold text-slate-600">
                    <Icon className="mr-2 h-3.5 w-3.5 text-blue-500" /> {cat || 'GENERAL'}
                </div>
            );
        },
    },
    {
        accessorKey: "financials",
        header: "Forensic ROI",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <div className="text-[10px] font-black text-emerald-600">
                    +{(row.original.projected_revenue || 0).toLocaleString()} {row.original.currency_code || 'UGX'}
                </div>
                <div className="text-[9px] font-bold text-slate-400 italic">
                    Cost: {(row.original.budget_spent || 0).toLocaleString()}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.getValue("status"))} className="text-[9px] font-black uppercase px-2 py-0.5">
                {row.getValue("status")}
            </Badge>
        ),
    },
    {
        accessorKey: "employees",
        header: "Agent",
        cell: ({ row }) => (
            <div className="flex items-center text-[11px] font-bold text-slate-700">
                <UserCheck className="h-3.5 w-3.5 mr-1.5 text-slate-300" />
                {row.original.employees?.full_name || 'System Auto'}
            </div>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                 <Link href={`/crm/marketing/${row.original.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-blue-600">
                        <Eye className="mr-2 h-3.5 w-3.5" /> View Intel
                    </Button>
                </Link>
            </div>
        ),
    },
];

// The main data table component
export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: campaigns,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b">
                    <div className="relative w-full max-w-sm">
                        <Input
                            placeholder="Search campaign DNA..."
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                            className="h-9 font-semibold text-xs border-slate-200"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200" onClick={() => generateCampaignAudit(campaigns)}>
                        <FileText size={14} /> Download Audit
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
                                    <TableRow key={row.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
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
                                        No forensic campaign records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Showing {table.getRowModel().rows.length} of {campaigns.length} Active Strategies
                    </p>
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