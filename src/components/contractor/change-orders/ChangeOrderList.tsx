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
import { ArrowUpDown, Circle, CheckCircle, XCircle } from "lucide-react";

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
import { cn } from "@/lib/utils";

// --- TYPES & CONSTANTS ---
interface Project { id: string; name: string; project_uid: string; }
export interface ChangeOrder {
    id: string;
    title: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    amount_change: number;
    created_at: string;
    projects: Project | null;
}

export const statuses = [
    { value: "PENDING", label: "Pending", icon: Circle },
    { value: "APPROVED", label: "Approved", icon: CheckCircle },
    { value: "REJECTED", label: "Rejected", icon: XCircle },
];

// Define the valid variant types for the Badge component
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

// --- UPDATED FUNCTION ---
const getStatusVariant = (status: ChangeOrder['status']): BadgeVariant => {
    switch (status) {
        case 'APPROVED': return 'default'; // Changed 'success' to 'default'
        case 'REJECTED': return 'destructive';
        case 'PENDING':
        default: return 'secondary';
    }
};

// --- COLUMN DEFINITIONS ---
export const columns: ColumnDef<ChangeOrder>[] = [
    {
        accessorKey: "projects",
        header: "Project",
        cell: ({ row }) => {
            const project = row.original.projects;
            if (!project) return 'N/A';
            return (
                <Link href={`/contractor/jobs/${project.id}`} className="font-medium text-primary hover:underline">
                    <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-xs text-muted-foreground">{project.project_uid}</span>
                    </div>
                </Link>
            );
        },
    },
    {
        accessorKey: "title",
        header: "Change Order Title",
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
        accessorKey: "amount_change",
        header: ({ column }) => (
             <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Amount <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount_change"));
            const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
            const isPositive = amount >= 0;
            return <div className={cn("text-right font-medium", isPositive ? "text-green-600" : "text-destructive")}>{isPositive ? '+' : ''}{formatted}</div>;
        },
    },
     {
        accessorKey: "created_at",
        header: "Date Created",
        cell: ({ row }) => format(new Date(row.getValue("created_at")), "LLL dd, yyyy"),
    },
];

// --- MAIN COMPONENT ---
export function ChangeOrderList({ changeOrders }: { changeOrders: ChangeOrder[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'created_at', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: changeOrders,
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
                                        No change orders found.
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