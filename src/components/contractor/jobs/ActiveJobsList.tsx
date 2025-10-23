'use client';

import * as React from "react";
import Link from "next/link";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- TYPES ---
export interface ActiveJob {
    id: string;
    project_uid: string;
    name: string;
    estimated_budget: number | null;
    actual_cost: number | null;
}

// --- COLUMN DEFINITIONS ---
export const columns: ColumnDef<ActiveJob>[] = [
    {
        accessorKey: "name",
        header: "Job Name",
        cell: ({ row }) => (
            <Link href={`/contractor/jobs/${row.original.id}`} className="font-medium text-primary hover:underline">
                <div className="flex flex-col">
                    <span>{row.getValue("name")}</span>
                    <span className="text-xs text-muted-foreground">{row.original.project_uid}</span>
                </div>
            </Link>
        ),
    },
    {
        id: "financials",
        header: "Budget vs. Actual",
        cell: ({ row }) => {
            const budget = row.original.estimated_budget || 0;
            const actual = row.original.actual_cost || 0;
            const percentage = budget > 0 ? (actual / budget) * 100 : 0;

            const formattedActual = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(actual);
            const formattedBudget = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(budget);

            return (
                <div className="flex flex-col space-y-2">
                    <Progress
                        value={percentage}
                        className={cn(
                            percentage > 90 && "[&>div]:bg-destructive",
                            percentage > 75 && percentage <= 90 && "[&>div]:bg-yellow-500"
                        )}
                    />
                    <div className="text-xs text-muted-foreground">
                        {formattedActual} of {formattedBudget}
                    </div>
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Link href={`/contractor/jobs/${row.original.id}`}>
                    <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> View Job
                    </Button>
                </Link>
            </div>
        ),
    },
];

// --- MAIN COMPONENT ---
export function ActiveJobsList({ jobs }: { jobs: ActiveJob[] }) {
    const table = useReactTable({
        data: jobs,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
                <CardDescription>A summary of all jobs currently in progress.</CardDescription>
            </CardHeader>
            <CardContent>
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
                                        No active jobs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}