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
import { ArrowUpDown, Eye, Mail, MessageSquare } from "lucide-react";

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
    type: 'EMAIL' | 'SMS';
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'ARCHIVED';
    created_at: string;
    scheduled_at: string | null;
    sent_at: string | null;
    employees: Creator | null;
}

type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

const getStatusVariant = (status: Campaign['status']): BadgeVariant => {
    switch (status) {
        case 'SENT': return 'default';
        case 'SCHEDULED': return 'default';
        case 'ARCHIVED': return 'secondary';
        case 'DRAFT':
        default: return 'outline';
    }
};

// Define the columns for the data table
export const columns: ColumnDef<Campaign>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Campaign Name
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <Link href={`/crm/marketing/${row.original.id}`} className="font-medium text-primary hover:underline">
                {row.getValue("name")}
            </Link>
        ),
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("type") as Campaign['type'];
            const Icon = type === 'EMAIL' ? Mail : MessageSquare;
            return <div className="flex items-center"><Icon className="mr-2 h-4 w-4 text-muted-foreground" /> {type}</div>;
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.getValue("status"))} className="capitalize">
                {/* --- THIS IS THE FIXED LINE --- */}
                {(row.getValue("status") as string).toLowerCase()}
            </Badge>
        ),
    },
    {
        accessorKey: "employees",
        header: "Created By",
        cell: ({ row }) => row.original.employees?.full_name || 'N/A',
    },
    {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => {
            const status: Campaign['status'] = row.original.status;
            const date = status === 'SENT' ? row.original.sent_at : (status === 'SCHEDULED' ? row.original.scheduled_at : row.original.created_at);
            const prefix = status === 'SENT' ? 'Sent' : (status === 'SCHEDULED' ? 'Sends' : 'Created');
            return date ? `${prefix}: ${format(new Date(date), 'LLL dd, yyyy')}` : 'N/A';
        }
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                 <Link href={`/crm/marketing/${row.original.id}`}>
                    <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> View
                    </Button>
                </Link>
            </div>
        ),
    },
];

// The main data table component
export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'created_at', desc: true }]);
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
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center py-4">
                    <Input
                        placeholder="Filter by campaign name..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No campaigns found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}