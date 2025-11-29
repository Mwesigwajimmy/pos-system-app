'use client';

import * as React from "react";
import { 
    ColumnDef, SortingState, flexRender, getCoreRowModel, 
    getPaginationRowModel, getSortedRowModel, useReactTable, ColumnFiltersState, getFilteredRowModel 
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, Search, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export interface Equipment {
    id: string;
    name: string;
    type: string | null;
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
    next_maintenance_date: string | null;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'IN_USE': return <Badge variant="destructive" className="bg-orange-500">In Use</Badge>;
        case 'MAINTENANCE': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
        case 'AVAILABLE': return <Badge className="bg-green-600 hover:bg-green-700">Available</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

export const columns: ColumnDef<Equipment>[] = [
    { 
        accessorKey: "name", 
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-semibold pl-4">{row.getValue("name")}</div> 
    },
    { accessorKey: "type", header: "Type" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
        accessorKey: "next_maintenance_date",
        header: "Next Service",
        cell: ({ row }) => {
            const date = row.original.next_maintenance_date;
            if (!date) return <span className="text-muted-foreground">—</span>;
            const isOverdue = new Date(date) < new Date();
            return (
                <span className={isOverdue ? "text-destructive font-bold" : ""}>
                    {format(new Date(date), "MMM dd, yyyy")}
                </span>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <Link href={`/field-service/equipment/${row.original.id}`}>
                <Button variant="ghost" size="icon"><PenLine className="h-4 w-4 text-muted-foreground" /></Button>
            </Link>
        )
    }
];

export function EquipmentList({ equipment }: { equipment: Equipment[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({ 
        data: equipment, 
        columns, 
        state: { sorting, columnFilters }, 
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(), 
        getSortedRowModel: getSortedRowModel(), 
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center py-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter equipment..." 
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""} 
                            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)} 
                            className="pl-8"
                        />
                    </div>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((h) => (
                                        <TableHead key={h.id}>
                                            {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No equipment found.</TableCell></TableRow>
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