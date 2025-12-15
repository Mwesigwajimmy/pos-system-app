'use client';

import * as React from "react";
import { 
    ColumnDef, SortingState, flexRender, getCoreRowModel, 
    getPaginationRowModel, getSortedRowModel, useReactTable, ColumnFiltersState, getFilteredRowModel 
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, Search, PenLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

// 1. Define Tenant Context Interface
interface TenantContext {
    tenantId: string;
    currency: string;
}

// 2. Define Equipment Interface (Matching Supabase Return)
export interface Equipment {
    id: string; // or number, depending on your DB
    name: string;
    type: string | null;
    status: string | null; // Allow string to match generic DB return
    next_maintenance_date: string | null;
    serial_number?: string | null;
}

const getStatusBadge = (status: string | null) => {
    const s = status?.toUpperCase() || 'UNKNOWN';
    switch (s) {
        case 'IN_USE': return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">In Use</Badge>;
        case 'MAINTENANCE': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Maintenance</Badge>;
        case 'AVAILABLE': return <Badge className="bg-green-600 hover:bg-green-700">Available</Badge>;
        case 'RETIRED': return <Badge variant="outline" className="text-muted-foreground">Retired</Badge>;
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
        cell: ({ row }) => (
            <div className="flex flex-col pl-4">
                <span className="font-semibold">{row.getValue("name")}</span>
                {row.original.serial_number && (
                    <span className="text-xs text-muted-foreground font-mono">{row.original.serial_number}</span>
                )}
            </div>
        )
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
            if (!date) return <span className="text-muted-foreground text-sm">—</span>;
            const isOverdue = new Date(date) < new Date();
            return (
                <span className={isOverdue ? "text-destructive font-bold text-sm" : "text-sm"}>
                    {format(new Date(date), "MMM dd, yyyy")}
                </span>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Link href={`/field-service/equipment/${row.original.id}`}>
                    <Button variant="ghost" size="icon" title="Edit">
                        <PenLine className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </Link>
            </div>
        )
    }
];

// 3. Update Component Props to accept 'tenant'
interface EquipmentListProps {
    equipment: Equipment[];
    tenant: TenantContext; // This fixes the Page error
}

export function EquipmentList({ equipment, tenant }: EquipmentListProps) {
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
        initialState: {
            pagination: { pageSize: 10 }
        }
    });

    return (
        <Card className="w-full">
            <CardContent className="p-4">
                <div className="flex items-center justify-between py-4 gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter by name..." 
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""} 
                            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)} 
                            className="pl-8"
                        />
                    </div>
                    {/* Optional: Use tenant currency context here if needed later */}
                    <div className="text-xs text-muted-foreground hidden md:block">
                        Context: {tenant.currency}
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
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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

                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}