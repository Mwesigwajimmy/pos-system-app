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
import { ArrowUpDown, Edit, Search, PackageOpen, AlertCircle } from "lucide-react";
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Import the real server action
import { updateProductVisibility } from '@/lib/ecommerce/actions/products';

// --- TYPES ---
// Aligned with DB structure for seamless prop passing
export interface ManagedProduct {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    stock_quantity: number;
    is_online: boolean; // Is it technically allowed on the store?
    is_visible: boolean; // Is it currently shown to customers?
    category: string | null;
}

// --- SUB-COMPONENTS ---

const VisibilityToggle = ({ row }: { row: any }) => {
    const { toast } = useToast();
    const product: ManagedProduct = row.original;
    // useTransition prevents the UI from freezing during the server action
    const [isPending, startTransition] = React.useTransition();

    const handleToggle = (checked: boolean) => {
        // Optimistic toggle could be added here, but revalidatePath is usually fast enough
        startTransition(async () => {
            const result = await updateProductVisibility(product.id, checked, product.is_online);

            if (!result.success) {
                toast({ 
                    title: "Update Failed", 
                    description: result.message, 
                    variant: 'destructive' 
                });
            } else {
                 toast({ 
                     title: checked ? "Product Visible" : "Product Hidden", 
                     description: `${product.name} is now ${checked ? 'live' : 'hidden'} on the storefront.` 
                });
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Switch
                checked={product.is_visible}
                onCheckedChange={handleToggle}
                disabled={!product.is_online || isPending}
                aria-label="Toggle product visibility"
            />
            {isPending && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
        </div>
    );
};

// --- COLUMN DEFINITIONS ---
export const columns: ColumnDef<ManagedProduct>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Product Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.getValue("name")}</span>
                <span className="text-xs text-muted-foreground">{row.original.category || 'Uncategorized'}</span>
            </div>
        ),
    },
    {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("sku") || 'N/A'}</span>,
    },
    {
        accessorKey: "stock_quantity",
        header: ({ column }) => (
             <div className="text-right">Stock</div>
        ),
        cell: ({ row }) => {
            const qty = row.original.stock_quantity;
            // Stock Logic: Red if 0, Yellow if < 10, else Default
            const colorClass = qty === 0 ? "text-red-600 font-bold" : qty < 10 ? "text-amber-600" : "";
            return <div className={`text-right ${colorClass}`}>{qty}</div>
        }
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
        header: "Setup Status",
        cell: ({ row }) => (
            <Badge variant={row.getValue("is_online") ? "outline" : "secondary"} className={row.getValue("is_online") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-500"}>
                {row.getValue("is_online") ? "Store Ready" : "Draft"}
            </Badge>
        ),
    },
    {
        accessorKey: "is_visible",
        header: "Live on Store",
        cell: VisibilityToggle,
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
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
        <Card className="h-full border-zinc-200 dark:border-zinc-800">
             <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl">
                        <PackageOpen className="h-5 w-5 text-primary" />
                        Product Manager
                        </CardTitle>
                        <CardDescription>
                        Manage pricing, visibility, and catalog details for your online store.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between py-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by product name..."
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                            className="pl-8"
                        />
                    </div>
                    {/* Optional: Add 'Export' or 'Add Product' buttons here */}
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
                                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center py-6">
                                            <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                                            No products found matching your filter.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        Showing {table.getRowModel().rows.length} of {products.length} products.
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