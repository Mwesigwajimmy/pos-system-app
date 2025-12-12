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
import { format } from "date-fns";
import { 
    ArrowUpDown, 
    Eye, 
    Truck, 
    CheckCircle2, 
    Package, 
    XCircle, 
    AlertCircle, 
    Filter,
    Check
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// --- TYPES ---
interface Customer { id: string; name: string; }

export interface Order {
    id: string;
    order_uid: string;
    status: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
    total_amount: number;
    created_at: string;
    customers: Customer | null;
}

// --- CONFIG ---
export const statuses = [
    { value: "PENDING", label: "Pending", icon: Package },
    { value: "PAID", label: "Paid", icon: CheckCircle2 },
    { value: "SHIPPED", label: "Shipped", icon: Truck },
    { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
    { value: "CANCELLED", label: "Cancelled", icon: XCircle },
];

const getStatusColor = (status: Order['status']) => {
    switch (status) {
        case 'COMPLETED': return "bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400";
        case 'PAID': return "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
        case 'SHIPPED': return "bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
        case 'CANCELLED': return "bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400";
        default: return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400";
    }
};

// --- COLUMNS ---
export const columns: ColumnDef<Order>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "order_uid",
        header: "Order ID",
        cell: ({ row }) => (
            <Link href={`/ecommerce/orders/${row.original.id}`} className="font-mono font-medium text-primary hover:underline transition-colors">
                #{row.getValue("order_uid")}
            </Link>
        ),
    },
    {
        accessorKey: "customers",
        header: "Customer",
        cell: ({ row }) => {
            const customer = row.original.customers;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{customer?.name || 'Guest Checkout'}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const statusVal = row.getValue("status") as Order['status'];
            const statusConfig = statuses.find(s => s.value === statusVal);
            const Icon = statusConfig?.icon || AlertCircle;
            
            return (
                <Badge variant="outline" className={cn("pl-1 pr-2 py-0.5 font-normal border-0", getStatusColor(statusVal))}>
                    <Icon className="mr-1 h-3 w-3" />
                    {statusConfig?.label || statusVal}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "total_amount",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("total_amount"));
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "created_at",
        header: ({ column }) => (
            <Button variant="ghost" className="pl-0" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}
            </span>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/ecommerce/orders/${row.original.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                    </Link>
                </Button>
            </div>
        ),
    },
];

// --- MAIN COMPONENT ---
export function OrderList({ orders }: { orders: Order[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'created_at', desc: true }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});

    const table = useReactTable({
        data: orders,
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

    const isFiltered = table.getState().columnFilters.length > 0;

    return (
        <Card className="h-full border-zinc-200 dark:border-zinc-800">
            <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Manage and view details of all transaction history.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between py-4 gap-2">
                    {/* Search Filter */}
                    <Input
                        placeholder="Filter by customer..."
                        value={(table.getColumn("customers")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("customers")?.setFilterValue(event.target.value)}
                        className="h-8 w-[150px] lg:w-[250px]"
                    />
                    
                    {/* Status Faceted Filter (Custom Built-in) */}
                    <div className="flex items-center gap-2">
                        {table.getColumn("status") && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                                        <Filter className="mr-2 h-4 w-4" />
                                        Status
                                        {/* Badge count for selected filters */}
                                        {(table.getColumn("status")?.getFilterValue() as string[])?.length > 0 && (
                                            <>
                                                <Separator orientation="vertical" className="mx-2 h-4" />
                                                <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                                    {(table.getColumn("status")?.getFilterValue() as string[])?.length}
                                                </Badge>
                                                <div className="hidden space-x-1 lg:flex">
                                                    {(table.getColumn("status")?.getFilterValue() as string[])?.length > 2 ? (
                                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                            {(table.getColumn("status")?.getFilterValue() as string[])?.length} selected
                                                        </Badge>
                                                    ) : (
                                                        statuses
                                                            .filter((option) => (table.getColumn("status")?.getFilterValue() as string[])?.includes(option.value))
                                                            .map((option) => (
                                                                <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal">
                                                                    {option.label}
                                                                </Badge>
                                                            ))
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="end">
                                    <Command>
                                        <CommandList>
                                            <CommandGroup>
                                                {statuses.map((status) => {
                                                    const isSelected = (table.getColumn("status")?.getFilterValue() as string[])?.includes(status.value);
                                                    return (
                                                        <CommandItem
                                                            key={status.value}
                                                            onSelect={() => {
                                                                const filterValue = (table.getColumn("status")?.getFilterValue() as string[]) || [];
                                                                if (isSelected) {
                                                                    table.getColumn("status")?.setFilterValue(filterValue.filter((val) => val !== status.value));
                                                                } else {
                                                                    table.getColumn("status")?.setFilterValue([...filterValue, status.value]);
                                                                }
                                                            }}
                                                        >
                                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                                                <Check className={cn("h-4 w-4")} />
                                                            </div>
                                                            <span>{status.label}</span>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                            {isFiltered && (
                                                <>
                                                    <CommandSeparator />
                                                    <CommandGroup>
                                                        <CommandItem
                                                            onSelect={() => table.getColumn("status")?.setFilterValue(undefined)}
                                                            className="justify-center text-center"
                                                        >
                                                            Clear filters
                                                        </CommandItem>
                                                    </CommandGroup>
                                                </>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                        
                        {/* Reset All Button */}
                        {isFiltered && (
                            <Button
                                variant="ghost"
                                onClick={() => table.resetColumnFilters()}
                                className="h-8 px-2 lg:px-3"
                            >
                                Reset
                                <XCircle className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
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
                                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Package className="h-8 w-8 mb-2 opacity-20" />
                                            No orders found matching criteria.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-between py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}