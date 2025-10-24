'use client';

import * as React from "react";
import Link from 'next/link';
import { ColumnDef, ColumnFiltersState, SortingState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string | null;
}

export const columns: ColumnDef<Client>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.getValue("phone") || 'N/A' },
    { id: "actions", enableHiding: false, cell: ({ row }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.id)}>Copy client ID</DropdownMenuItem>
                <Link href={`/professional-services/clients/${row.original.id}`}><DropdownMenuItem>View Details</DropdownMenuItem></Link>
            </DropdownMenuContent>
        </DropdownMenu>
    )}
];

export function ClientList({ clients }: { clients: Client[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({ data: clients, columns, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), state: { sorting, columnFilters } });

    return (
        <div>
            <div className="flex items-center py-4">
                <Input placeholder="Filter by name..." value={(table.getColumn("name")?.getFilterValue() as string) ?? ""} onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)} className="max-w-sm" />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>{table.getHeaderGroups().map(headerGroup => <TableRow key={headerGroup.id}>{headerGroup.headers.map(header => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No clients found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            </div>
        </div>
    );
}