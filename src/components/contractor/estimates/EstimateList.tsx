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
import { ArrowUpDown, Eye, Circle, CheckCircle, XCircle, Send } from "lucide-react";

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
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";

// --- TYPES & CONSTANTS ---
interface Customer { id: string; name: string; }
export interface Estimate {
    id: string;
    estimate_uid: string;
    title: string;
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
    total_amount: number;
    created_at: string;
    customers: Customer | null;
}

export const statuses = [
    { value: "DRAFT", label: "Draft", icon: Circle },
    { value: "SENT", label: "Sent", icon: Send },
    { value: "APPROVED", label: "Approved", icon: CheckCircle },
    { value: "REJECTED", label: "Rejected", icon: XCircle },
];

// Define the valid variant types for the Badge component
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

// --- UPDATED FUNCTION ---
const getStatusVariant = (status: Estimate['status']): BadgeVariant => {
    switch (status) {
        case 'APPROVED': return 'default'; // Changed 'success' to 'default'
        case 'REJECTED': return 'destructive';
        case 'SENT': return 'default';
        case 'DRAFT':
        default: return 'secondary';
    }
};

// --- COLUMN DEFINITIONS ---
export const columns: ColumnDef<Estimate>[] = [
    {
        accessorKey: "estimate_uid",
        header: "Estimate ID",
        cell: ({ row }) => (
            <Link href={`/contractor/estimates/${row.original.id}`} className="font-medium text-primary hover:underline">
                {row.getValue("estimate_uid")}
            </Link>
        ),
    },
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "customers",
        header: "Customer",
        cell: ({ row }) => row.original.customers?.name || 'N/A',
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.getValue("status"))}>
                {statuses.find(s => s.value === row.getValue("status"))?.label || 'Unknown'}
            </Badge>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        accessorKey: "total_amount",
        header: ({ column }) => (
             <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Amount <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("total_amount"));
            const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
     {
        accessorKey: "created_at",
        header: "Date Created",
        cell: ({ row }) => format(new Date(row.getValue("created_at")), "LLL dd, yyyy"),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Link href={`/contractor/estimates/${row.original.id}`}>
                    <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                </Link>
            </div>
        ),
    },
];

// --- MAIN COMPONENT ---
export function EstimateList({ estimates }: { estimates: Estimate[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'created_at', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: estimates,
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
                <div className="flex items-center justify-between py-4">
                    <Input
                        placeholder="Filter by title..."
                        value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("title")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                    <DataTableFacetedFilter
                        column={table.getColumn("status")}
                        title="Status"
                        options={statuses}
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
                                        No estimates found.
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