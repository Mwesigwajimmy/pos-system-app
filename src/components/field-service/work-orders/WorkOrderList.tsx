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
import { ArrowUpDown, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { WorkOrder, WorkOrderStatus } from "@/lib/actions/work-orders";

// FIX 1: Define Tenant Interface
interface TenantContext {
    tenantId: string;
    currency: string;
}

const getStatusClasses = (status: WorkOrderStatus): string => {
    switch (status) {
        case 'completed': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100';
        case 'canceled': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100';
        case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100';
        case 'en_route': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100';
        default: return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100';
    }
};

export const columns: ColumnDef<WorkOrder>[] = [
    {
        accessorKey: "work_order_uid",
        header: "Order #",
        cell: ({ row }) => (
            <Link 
                href={`/field-service/work-orders/${row.original.id}`} 
                className="font-bold text-primary hover:underline font-mono"
            >
                {row.getValue("work_order_uid") || `#${row.original.id}`}
            </Link>
        ),
    },
    { 
        accessorKey: "summary", 
        header: "Summary",
        cell: ({ row }) => <span className="font-medium">{row.getValue("summary")}</span>
    },
    { 
        accessorKey: "customer_name", 
        header: "Customer", 
        cell: ({ row }) => row.original.customer_name 
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant="outline" className={getStatusClasses(row.original.status)}>
                {row.original.status.replace('_', ' ').toUpperCase()}
            </Badge>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "scheduled_at",
        header: ({ column }) => (
             <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Scheduled <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
        ),
        cell: ({ row }) => {
            const date = row.original.scheduled_at;
            return date ? (
                <div className="flex flex-col">
                    <span className="text-xs font-medium">{format(new Date(date), "MMM dd, yyyy")}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(date), "h:mm a")}</span>
                </div>
            ) : <span className="text-muted-foreground text-xs italic">—</span>;
        },
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Link href={`/field-service/work-orders/${row.original.id}`}>
                    <Button variant="outline" size="sm" className="h-8"><Eye className="mr-2 h-3 w-3" /> View</Button>
                </Link>
            </div>
        ),
    },
];

// FIX 2: Accept 'tenant' prop in component signature
export function WorkOrderList({ workOrders, tenant }: { workOrders: WorkOrder[], tenant: TenantContext }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'scheduled_at', desc: true }]);
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
        <Card className="w-full border shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between py-4 gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter by summary..." 
                            value={(table.getColumn("summary")?.getFilterValue() as string) ?? ""} 
                            onChange={(event) => table.getColumn("summary")?.setFilterValue(event.target.value)} 
                            className="pl-8 h-9"
                        />
                    </div>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-muted/40">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No work orders found.</TableCell></TableRow>
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