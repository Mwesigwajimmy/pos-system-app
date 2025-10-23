'use client';

import * as React from "react";
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export interface Equipment {
    id: string;
    name: string;
    type: string | null;
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
    next_maintenance_date: string | null;
}

// Define the valid variant types for the Badge component
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

// --- UPDATED FUNCTION ---
const getStatusVariant = (status: Equipment['status']): BadgeVariant => {
    switch (status) {
        case 'IN_USE': return 'destructive';
        case 'MAINTENANCE': return 'secondary'; // Corrected from 'warning'
        case 'AVAILABLE':
        default: return 'default';      // Corrected from 'success'
    }
};

export const columns: ColumnDef<Equipment>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div> },
    { accessorKey: "type", header: "Type" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={getStatusVariant(row.getValue("status"))}>{row.getValue("status")}</Badge>,
    },
    {
        accessorKey: "next_maintenance_date",
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Next Maintenance <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
        cell: ({ row }) => row.original.next_maintenance_date ? format(new Date(row.original.next_maintenance_date), "LLL dd, yyyy") : 'N/A',
    },
];

export function EquipmentList({ equipment }: { equipment: Equipment[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
    const table = useReactTable({ data: equipment, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel() });

    return (
        <Card>
            <CardContent className="p-4">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => <TableRow key={hg.id}>{hg.headers.map((h) => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No equipment found.</TableCell></TableRow>
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