'use client';

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
// Import the real server action
import { updateProductVisibility } from '@/lib/ecommerce/actions/products';


// --- TYPES ---
export interface ManagedProduct {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    stock_quantity: number;
    is_online: boolean;
    is_visible: boolean;
    online_title: string | null;
}

// --- SUB-COMPONENTS for the Table ---
const VisibilityToggle = ({ row }: { row: any }) => {
    const { toast } = useToast();
    const product: ManagedProduct = row.original;
    const [isLoading, setIsLoading] = React.useState(false);

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        
        const result = await updateProductVisibility(product.id, checked, product.is_online);

        if (!result.success) {
            toast({ title: "Error", description: result.message, variant: 'destructive' });
        } else {
             toast({ title: "Success", description: "Product visibility updated." });
        }

        setIsLoading(false);
    };

    return (
        <Switch
            checked={product.is_visible}
            onCheckedChange={handleToggle}
            disabled={!product.is_online || isLoading}
            aria-label="Toggle product visibility"
        />
    );
};


// --- COLUMN DEFINITIONS ---
export const columns: ColumnDef<ManagedProduct>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Product Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "sku",
        header: "SKU",
    },
    {
        accessorKey: "price",
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("price"));
            const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "is_online",
        header: "Online Status",
        // --- THIS IS THE FIXED BLOCK ---
        cell: ({ row }) => (
            <Badge variant={row.getValue("is_online") ? "default" : "secondary"}>
                {row.getValue("is_online") ? "On Storefront" : "Not Online"}
            </Badge>
        ),
    },
    {
        accessorKey: "is_visible",
        header: "Visible",
        cell: VisibilityToggle,
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Button variant="ghost" size="sm" disabled={!row.original.is_online}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Online Details
                </Button>
            </div>
        ),
    },
];

// --- MAIN COMPONENT ---
export function OnlineProductManager({ products }: { products: ManagedProduct[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'name', desc: false }]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: products,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center py-4">
                    <Input
                        placeholder="Filter by product name..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
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
                                        No products found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
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