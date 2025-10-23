'use client';

import * as React from "react";
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
import { ArrowUpDown, HardHat, Wrench, Truck, User, MoreHorizontal } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";

// --- TYPES & CONSTANTS ---
export interface JobCost {
    id: string;
    cost_type: 'LABOR' | 'MATERIAL' | 'SUBCONTRACTOR' | 'EQUIPMENT' | 'OTHER';
    description: string;
    amount: number;
    transaction_date: string;
}

export const costTypes = [
    { value: "LABOR", label: "Labor", icon: User },
    { value: "MATERIAL", label: "Material", icon: Wrench },
    { value: "SUBCONTRACTOR", label: "Subcontractor", icon: HardHat },
    { value: "EQUIPMENT", label: "Equipment", icon: Truck },
    { value: "OTHER", label: "Other", icon: MoreHorizontal },
];

// --- COLUMN DEFINITIONS ---
export const columns: ColumnDef<JobCost>[] = [
    {
        accessorKey: "transaction_date",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => format(new Date(row.getValue("transaction_date")), "LLL dd, yyyy"),
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <div className="font-medium">{row.getValue("description")}</div>,
    },
    {
        accessorKey: "cost_type",
        header: "Type",
        cell: ({ row }) => {
            const type = costTypes.find(t => t.value === row.getValue("cost_type"));
            return type ? (
                <Badge variant="secondary" className="capitalize">
                    {type.label}
                </Badge>
            ) : null;
        },
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"));
            const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
];

// --- MAIN COMPONENT ---
export function JobCostsList({ costs }: { costs: JobCost[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'transaction_date', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: costs,
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
            <CardHeader>
                <CardTitle>Job Costs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between py-4">
                    <Input
                        placeholder="Filter by description..."
                        value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("description")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                    <DataTableFacetedFilter
                        column={table.getColumn("cost_type")}
                        title="Cost Type"
                        options={costTypes}
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
                                        No costs have been added to this job yet.
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