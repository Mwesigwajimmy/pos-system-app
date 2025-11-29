'use client';

import * as React from "react";
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel, 
  useReactTable 
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

export interface TimeEntry {
    id: string;
    created_at: string;
    description: string;
    hours: number;
    rate: number;
    is_billed: boolean;
    // Join relation from Supabase
    clients: { name: string } | null; 
}

export const columns: ColumnDef<TimeEntry>[] = [
    { 
        accessorKey: "created_at", 
        header: "Date", 
        cell: ({ row }) => <span className="whitespace-nowrap text-xs text-slate-500">{format(new Date(row.getValue("created_at")), "MMM d, yyyy")}</span> 
    },
    { 
        accessorKey: "clients", 
        header: "Client", 
        cell: ({ row }) => <span className="font-medium text-slate-900">{(row.original.clients?.name) || 'Internal Task'}</span> 
    },
    { 
        accessorKey: "description", 
        header: "Task",
        cell: ({ row }) => <span className="block max-w-[200px] truncate text-slate-600" title={row.getValue("description")}>{row.getValue("description")}</span>
    },
    { 
        accessorKey: "hours", 
        header: () => <div className="text-right">Hrs</div>, 
        cell: ({ row }) => <div className="text-right font-mono">{(row.getValue("hours") as number).toFixed(2)}</div> 
    },
    { 
        accessorKey: "rate", 
        header: () => <div className="text-right">Billable</div>, 
        cell: ({ row }) => {
            const amount = (row.original.hours * row.original.rate);
            return <div className="text-right font-mono font-bold text-slate-700">${amount.toFixed(2)}</div>
        }
    },
    { 
        accessorKey: "is_billed", 
        header: "Status", 
        cell: ({ row }) => (
            row.getValue("is_billed") 
                ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Billed</Badge> 
                : <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Unbilled</Badge>
        ) 
    },
];

export function TimeEntryList({ entries }: { entries: TimeEntry[] }) {
    const table = useReactTable({ 
        data: entries, 
        columns, 
        getCoreRowModel: getCoreRowModel(), 
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 5 } }
    });

    return (
        <Card className="h-full shadow-sm border-t-4 border-t-blue-500">
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500"/> Time Logs</CardTitle>
                <CardDescription>Recent billable activity across all clients.</CardDescription>
             </CardHeader>
             <CardContent>
                 <div className="rounded-md border mb-4">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id} className="hover:bg-slate-50">
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                        No time entries found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-end space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}