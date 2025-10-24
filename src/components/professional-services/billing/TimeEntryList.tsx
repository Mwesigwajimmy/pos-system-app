'use client';

import * as React from "react";
import { ColumnDef, ColumnFiltersState, SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimeEntry {
    id: string;
    created_at: string;
    description: string;
    hours: number;
    rate: number;
    is_billed: boolean;
    customers: { name: string } | null;
}

export const columns: ColumnDef<TimeEntry>[] = [
    { accessorKey: "created_at", header: "Date", cell: ({ row }) => format(new Date(row.getValue("created_at")), "PP") },
    { accessorKey: "customers", header: "Client", cell: ({ row }) => row.original.customers?.name || 'N/A' },
    { accessorKey: "description", header: "Description" },
    { accessorKey: "hours", header: "Hours", cell: ({ row }) => (row.getValue("hours") as number).toFixed(2) },
    { accessorKey: "rate", header: "Rate", cell: ({ row }) => `$${(row.getValue("rate") as number).toFixed(2)}` },
    { accessorKey: "is_billed", header: "Status", cell: ({ row }) => row.getValue("is_billed") ? <Badge>Billed</Badge> : <Badge variant="secondary">Unbilled</Badge> },
];

export function TimeEntryList({ entries }: { entries: TimeEntry[] }) {
    const table = useReactTable({ data: entries, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });

    return (
        <Card>
             <CardHeader><CardTitle>All Time Entries</CardTitle></CardHeader>
             <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
                            : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No time entries found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}