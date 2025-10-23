'use client';

import * as React from "react";
import Link from "next/link";
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Define the shape of our performance cycle data
export interface PerformanceCycle {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
    participant_count: number;
}

// Define the valid variant types for the Badge component
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

// --- UPDATED FUNCTION ---
const getStatusVariant = (status: PerformanceCycle['status']): BadgeVariant => {
    switch (status) {
        case 'ACTIVE':
            return 'default'; // Corrected from 'success'
        case 'CLOSED':
            return 'secondary';
        case 'UPCOMING':
        default:
            return 'default';
    }
};

// Define the columns for the data table
export const columns: ColumnDef<PerformanceCycle>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Cycle Name
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <Link href={`/hr/performance/${row.original.id}`} className="font-medium text-primary hover:underline">
                {row.getValue("name")}
            </Link>
        ),
    },
    {
        accessorKey: "start_date",
        header: "Review Period",
        cell: ({ row }) => {
            const startDate = new Date(row.original.start_date).toLocaleDateString();
            const endDate = new Date(row.original.end_date).toLocaleDateString();
            return `${startDate} - ${endDate}`;
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.getValue("status"))} className="capitalize">
                {/* --- THIS IS THE SECOND FIX --- */}
                {(row.getValue("status") as string).toLowerCase()}
            </Badge>
        ),
    },
    {
        accessorKey: "participant_count",
        header: "Participants",
        cell: ({ row }) => (
            <div className="text-center">{row.getValue("participant_count")}</div>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const cycle = row.original;
            return (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/hr/performance/${cycle.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
];

interface PerformanceCyclesTableProps {
    cycles: PerformanceCycle[];
}

export function PerformanceCyclesTable({ cycles }: PerformanceCyclesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: 'start_date', desc: true }
    ]);
    const [columnFilters, setColumnFilters] = React.useState<any[]>([]);

    const table = useReactTable({
        data: cycles,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    });

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center py-4">
                    <Input
                        placeholder="Filter by cycle name..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("name")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
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
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No performance cycles found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}