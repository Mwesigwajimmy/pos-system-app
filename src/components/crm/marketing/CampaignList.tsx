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
import { 
    ArrowUpDown, 
    Eye, 
    Mail, 
    MessageSquare, 
    Globe, 
    Target,
    FileText,
    MapPin,
    UserCheck,
    Search
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

// --- TYPES & CONSTANTS ---
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

// --- REPORT GENERATOR ---
const generateCampaignReport = (campaigns: Campaign[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text("Marketing Campaign Management Report", 14, 20);
    
    autoTable(doc, {
        startY: 30,
        head: [['Campaign Name', 'Category', 'Status', 'Region', 'Budget', 'Projected Revenue', 'Assigned Agent']],
        body: campaigns.map(c => [
            c.name,
            c.campaign_category,
            c.status,
            c.target_location || 'Global',
            `${(c.budget_spent || 0).toLocaleString()} ${c.currency_code || 'UGX'}`,
            `${(c.projected_revenue || 0).toLocaleString()} ${c.currency_code || 'UGX'}`,
            c.employees?.full_name || 'System'
        ]),
        headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save(`Campaign_Report_${Date.now()}.pdf`);
};

// --- TABLE COLUMNS ---
export const columns: ColumnDef<Campaign>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button 
                variant="ghost" 
                className="text-xs font-bold uppercase tracking-tight p-0 hover:bg-transparent text-slate-700" 
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Campaign Name <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex flex-col py-1">
                <Link href={`/crm/marketing/${row.original.id}`} className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors">
                    {row.getValue("name")}
                </Link>
                <div className="flex items-center text-[11px] text-slate-500 font-medium mt-0.5">
                    <MapPin className="h-3 w-3 mr-1.5 text-slate-400" /> 
                    {row.original.target_location || 'All Regions'}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "campaign_category",
        header: "Channel",
        cell: ({ row }) => {
            const cat = row.getValue("campaign_category") as Campaign['campaign_category'];
            const Icon = cat === 'EMAIL' ? Mail : (cat === 'SMS' ? MessageSquare : (cat === 'ADS' ? Target : Globe));
            return (
                <div className="flex items-center text-xs font-semibold text-slate-600">
                    <Icon className="mr-2 h-3.5 w-3.5 text-blue-500" /> {cat || 'GENERAL'}
                </div>
            );
        },
    },
    {
        accessorKey: "financials",
        header: "Performance",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <div className="text-xs font-bold text-emerald-600">
                    +{(row.original.projected_revenue || 0).toLocaleString()} {row.original.currency_code || 'UGX'}
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Budget: {(row.original.budget_spent || 0).toLocaleString()}
                </div>
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.getValue("status"))} className="text-[10px] font-bold px-2 py-0.5">
                {row.getValue("status")}
            </Badge>
        ),
    },
    {
        accessorKey: "employees",
        header: "Owner",
        cell: ({ row }) => (
            <div className="flex items-center text-xs font-semibold text-slate-700">
                <UserCheck className="h-3.5 w-3.5 mr-2 text-slate-400" />
                {row.original.employees?.full_name || 'Auto Assigned'}
            </div>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                 <Link href={`/crm/marketing/${row.original.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold border-slate-200 hover:bg-slate-50">
                        <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                    </Button>
                </Link>
            </div>
        ),
    },
];

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
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0">
                {/* Search and Action Bar */}
                <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-slate-100 gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search campaigns..."
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                            className="h-10 pl-10 text-sm font-medium border-slate-200 bg-white focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-10 text-xs font-bold gap-2 border-slate-200 bg-white hover:bg-slate-50" 
                        onClick={() => generateCampaignReport(campaigns)}
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
                                    <TableRow key={row.id} className="hover:bg-slate-50/30 border-slate-50 transition-colors">
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
                                        No campaign records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* Pagination Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Showing {table.getRowModel().rows.length} of {campaigns.length} Campaigns
                    </p>
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