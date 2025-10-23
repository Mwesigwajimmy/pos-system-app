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
import { ArrowUpDown, Eye, Circle, Hourglass, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";

interface Customer { id: string; name: string; }
export interface WorkOrder {
    id: string;
    work_order_uid: string;
    summary: string;
    status: 'SCHEDULED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'INVOICED' | 'CANCELLED';
    scheduled_date: string | null;
    customers: Customer | null;
}

export const statuses = [
    { value: "SCHEDULED", label: "Scheduled", icon: Circle },
    { value: "DISPATCHED", label: "Dispatched", icon: Hourglass },
    { value: "IN_PROGRESS", label: "In Progress", icon: Hourglass },
    { value: "COMPLETED", label: "Completed", icon: CheckCircle },
];

// Define the valid variant types for the Badge component
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

// --- UPDATED FUNCTION ---
const getStatusVariant = (status: WorkOrder['status']): BadgeVariant => {
    switch (status) {
        case 'COMPLETED':
        case 'INVOICED':
            return 'default'; // Corrected from 'success'
        case 'CANCELLED':
            return 'destructive';
        case 'IN_PROGRESS':
        case 'DISPATCHED':
            return 'default';
        case 'SCHEDULED':
        default:
            return 'secondary';
    }
};

export const columns: ColumnDef<WorkOrder>[] = [
    {
        accessorKey: "work_order_uid",
        header: "Work Order #",
        cell: ({ row }) => (
            <Link href={`/field-service/work-orders/${row.original.id}`} className="font-medium text-primary hover:underline">
                {row.getValue("work_order_uid")}
            </Link>
        ),
    },
    { accessorKey: "summary", header: "Summary" },
    { accessorKey: "customers", header: "Customer", cell: ({ row }) => row.original.customers?.name || 'N/A' },
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
        accessorKey: "scheduled_date",
        header: ({ column }) => (
             <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Scheduled Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.scheduled_date ? format(new Date(row.original.scheduled_date), "LLL dd, yyyy") : 'Not Scheduled',
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Link href={`/field-service/work-orders/${row.original.id}`}><Button variant="ghost" size="sm"><Eye className="mr-2 h-4 w-4" /> View</Button></Link>
            </div>
        ),
    },
];

export function WorkOrderList({ workOrders }: { workOrders: WorkOrder[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'scheduled_date', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: workOrders,
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
                    <Input placeholder="Filter by summary..." value={(table.getColumn("summary")?.getFilterValue() as string) ?? ""} onChange={(event) => table.getColumn("summary")?.setFilterValue(event.target.value)} className="max-w-sm"/>
                    <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statuses} />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No work orders found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                </div>
            </CardContent>
        </Card>
    );
}