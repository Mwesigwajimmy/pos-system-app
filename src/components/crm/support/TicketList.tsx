'use client';

import * as React from "react";
import Link from "next/link";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Eye, Check, X, Hourglass, ChevronsRight, Flag, Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";

// --- TYPES & CONSTANTS ---
interface Customer { id: string; name: string; }
interface Assignee { id: string; full_name: string; }
export interface Ticket {
    id: string;
    ticket_uid: string;
    subject: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ON_HOLD';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    created_at: string;
    updated_at: string;
    customers: Customer | null;
    employees: Assignee | null;
}

export const statuses = [
    { value: "OPEN", label: "Open", icon: Circle },
    { value: "IN_PROGRESS", label: "In Progress", icon: Hourglass },
    { value: "CLOSED", label: "Closed", icon: Check },
    { value: "ON_HOLD", label: "On Hold", icon: ChevronsRight },
];

export const priorities = [
    { value: "LOW", label: "Low", icon: Flag },
    { value: "MEDIUM", label: "Medium", icon: Flag },
    { value: "HIGH", label: "High", icon: Flag },
    { value: "URGENT", label: "Urgent", icon: Flag },
];

// Define the valid variant types for the Badge component
type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

// --- UPDATED FUNCTION ---
const getPriorityVariant = (priority: Ticket['priority']): BadgeVariant => {
    switch (priority) {
        case 'URGENT': return 'destructive';
        case 'HIGH': return 'destructive'; // Corrected from 'warning'
        case 'LOW': return 'outline';     // Corrected from 'success'
        default: return 'secondary';      // This will catch 'MEDIUM'
    }
};

// Define the columns for the data table
export const columns: ColumnDef<Ticket>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "ticket_uid",
        header: "Ticket ID",
        cell: ({ row }) => (
            <Link href={`/crm/support/${row.original.id}`} className="font-medium text-primary hover:underline">
                {row.getValue("ticket_uid")}
            </Link>
        ),
    },
    {
        accessorKey: "subject",
        header: "Subject",
        cell: ({ row }) => <div className="font-medium">{row.getValue("subject")}</div>,
    },
    {
        accessorKey: "customers",
        header: "Customer",
        cell: ({ row }) => row.original.customers?.name || 'N/A',
    },
    {
        accessorKey: "employees",
        header: "Assignee",
        cell: ({ row }) => row.original.employees?.full_name || 'Unassigned',
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = statuses.find(s => s.value === row.getValue("status"));
            return status ? <div className="flex items-center"><status.icon className="mr-2 h-4 w-4 text-muted-foreground" />{status.label}</div> : null;
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
            <Badge variant={getPriorityVariant(row.getValue("priority"))}>
                {row.getValue("priority")}
            </Badge>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "updated_at",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Last Updated <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatDistanceToNow(new Date(row.getValue("updated_at")), { addSuffix: true }),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <Link href={`/crm/support/${row.original.id}`}>
                <Button variant="ghost" size="sm">
                    <Eye className="mr-2 h-4 w-4" /> View
                </Button>
            </Link>
        ),
    },
];
// The main data table component
export function TicketList({ tickets }: { tickets: Ticket[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'updated_at', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});

    const table = useReactTable({
        data: tickets,
        columns,
        state: { sorting, columnFilters, rowSelection },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between py-4">
                    <Input
                        placeholder="Filter by subject..."
                        value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("subject")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                    <div className="flex space-x-2">
                        <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={statuses} />
                        <DataTableFacetedFilter column={table.getColumn("priority")} title="Priority" options={priorities} />
                    </div>
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
                                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
.
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
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