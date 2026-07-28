'use client';

/**
 * --- BBU1 SOVEREIGN E-COMMERCE PRODUCT MANAGER ---
 * VERSION: v12.0 OMEGA (STOREFRONT SETTINGS SYNC & MULTI-TENANT FILTER)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import * as React from "react";
import { useState, useMemo, useTransition } from "react";
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
import { 
    ArrowUpDown, Edit, Search, PackageOpen, AlertCircle, 
    Copy, Globe, Loader2, Store, MessageSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const supabase = createClient();

export interface ManagedProduct {
    id: string | number;
    product_id?: number;
    name: string;
    sku: string | null;
    price: number;
    online_price?: number;
    stock_quantity: number;
    is_online: boolean;
    is_visible: boolean;
    category: string | null;
    primary_media_url?: string | null;
    online_description?: string;
}

// --- SUB-COMPONENT: REALTIME VISIBILITY TOGGLE ---
const VisibilityToggle = ({ product }: { product: ManagedProduct }) => {
    const queryClient = useQueryClient();
    const [isPending, startTransition] = useTransition();

    const handleToggle = (checked: boolean) => {
        startTransition(async () => {
            try {
                const { error } = await supabase
                    .from('product_variants')
                    .update({ 
                        is_published_online: checked,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', product.id);

                if (error) throw error;

                toast.success(checked ? "Published to Web Store!" : "Hidden from Web Store", {
                    description: `${product.name} is now ${checked ? 'live on your public storefront' : 'hidden'}.`
                });

                queryClient.invalidateQueries({ queryKey: ['online_products_managed'] });
                queryClient.invalidateQueries({ queryKey: ['public_store_catalog'] });
            } catch (err: any) {
                toast.error(`Visibility Update Failed: ${err.message}`);
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Switch
                checked={!!product.is_visible}
                onCheckedChange={handleToggle}
                disabled={isPending}
                aria-label="Toggle product visibility"
            />
            {isPending && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
        </div>
    );
};

// --- MAIN COMPONENT ---
export function OnlineProductManager({ products: propProducts }: { products?: ManagedProduct[] }) {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(null);
    const [editForm, setEditForm] = useState({ online_price: 0, description: '' });

    // 1. DATA: Identity Context
    const { data: profile } = useQuery({
        queryKey: ['active_profile_ecom_manager'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('profiles')
                .select('*, business_name, currency, business_id, active_organization_slug')
                .eq('id', user?.id)
                .limit(1)
                .single();
            return data;
        }
    });

    const businessCurrency = profile?.currency || 'UGX';
    const activeBusinessId = profile?.business_id;

    // 2. DATA: Fetch Saved Storefront Settings (To get exact store_slug)
    const { data: storeConfig } = useQuery({
        queryKey: ['storefront_config_for_product_manager', activeBusinessId],
        enabled: !!activeBusinessId,
        queryFn: async () => {
            const { data } = await supabase
                .from('storefront_settings')
                .select('store_slug, store_name')
                .eq('business_id', activeBusinessId)
                .maybeSingle();
            return data;
        }
    });

    // 3. DATA: Live Inventory Products (Filtered by Business ID)
    const { data: liveProducts, isLoading } = useQuery({
        queryKey: ['online_products_managed', activeBusinessId],
        enabled: !!activeBusinessId && !propProducts,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_variants')
                .select(`
                    id, product_id, name, sku, price, selling_price, cost_price, 
                    stock_quantity, current_stock, is_published_online, is_active, 
                    online_price, primary_media_url,
                    products ( id, name, categories ( name ) )
                `)
                .eq('business_id', activeBusinessId)
                .order('name');

            if (error) throw error;

            return (data || []).map((pv: any) => ({
                id: pv.id,
                product_id: pv.product_id,
                name: `${pv.products?.name || ''} ${pv.name === 'Standard' ? '' : `(${pv.name})`}`.trim() || 'Product Asset',
                sku: pv.sku,
                price: Number(pv.online_price || pv.selling_price || pv.price || 0),
                stock_quantity: Number(pv.current_stock ?? pv.stock_quantity ?? 0),
                is_online: true,
                is_visible: !!pv.is_published_online,
                category: pv.products?.categories?.name || 'General',
                primary_media_url: pv.primary_media_url
            })) as ManagedProduct[];
        }
    });

    const displayedProducts = useMemo(() => {
        return propProducts || liveProducts || [];
    }, [propProducts, liveProducts]);

    // UPDATE ONLINE PRICE MUTATION
    const updateProductMutation = useMutation({
        mutationFn: async () => {
            if (!editingProduct) return;

            const { error } = await supabase
                .from('product_variants')
                .update({
                    online_price: Number(editForm.online_price),
                    is_published_online: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingProduct.id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Online Store Product Updated!");
            setEditingProduct(null);
            queryClient.invalidateQueries({ queryKey: ['online_products_managed'] });
            queryClient.invalidateQueries({ queryKey: ['public_store_catalog'] });
        },
        onError: (err: any) => toast.error(`Update failed: ${err.message}`)
    });

    // UNIFIED STOREFRONT URL GENERATOR (Uses exact storefront_settings store_slug)
    const storeSlug = storeConfig?.store_slug || profile?.active_organization_slug || profile?.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my-store';
    const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${storeSlug}` : `https://www.bbu1.com/store/${storeSlug}`;

    const copyStoreLink = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(publicStoreUrl);
            toast.success("Public Storefront Link Copied!", {
                description: "Share this link on WhatsApp, Instagram or TikTok for customers to order online."
            });
        }
    };

    const shareWhatsapp = () => {
        const text = encodeURIComponent(`Hello! Browse our official catalog and place your order online here: ${publicStoreUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const columns = useMemo<ColumnDef<ManagedProduct>[]>(() => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button variant="ghost" className="pl-0 hover:bg-transparent font-bold text-xs uppercase text-slate-500" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Product Designation <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    {row.original.primary_media_url && (
                        <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                            <img src={row.original.primary_media_url} className="h-full w-full object-cover" alt="asset" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{row.getValue("name")}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{row.original.category || 'Uncategorized'}</span>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "sku",
            header: () => <span className="font-bold text-xs uppercase text-slate-500">SKU / Code</span>,
            cell: ({ row }) => <span className="font-mono text-xs font-bold text-slate-600 uppercase">{row.getValue("sku") || 'N/A'}</span>,
        },
        {
            accessorKey: "stock_quantity",
            header: () => <div className="text-right font-bold text-xs uppercase text-slate-500">Physical Stock</div>,
            cell: ({ row }) => {
                const qty = Number(row.original.stock_quantity || 0);
                const colorClass = qty === 0 ? "text-rose-600 font-black" : qty < 10 ? "text-amber-600 font-bold" : "text-slate-900 font-bold";
                return (
                    <div className={cn("text-right text-sm tabular-nums", colorClass)}>
                        {qty.toLocaleString()} <span className="text-[9px] text-slate-400 font-bold">UNITS</span>
                    </div>
                );
            }
        },
        {
            accessorKey: "price",
            header: () => <div className="text-right font-bold text-xs uppercase text-slate-500">Online Rate ({businessCurrency})</div>,
            cell: ({ row }) => {
                const amount = Number(row.getValue("price") || 0);
                return (
                    <div className="text-right font-black text-sm text-blue-600 tabular-nums">
                        {amount.toLocaleString()}
                    </div>
                );
            },
        },
        {
            accessorKey: "is_online",
            header: () => <span className="font-bold text-xs uppercase text-slate-500">Store Readiness</span>,
            cell: ({ row }) => (
                <Badge variant={row.getValue("is_online") ? "outline" : "secondary"} className={row.getValue("is_online") ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] uppercase" : "bg-slate-100 text-slate-500 font-bold text-[9px] uppercase"}>
                    {row.getValue("is_online") ? "Store Ready" : "Draft"}
                </Badge>
            ),
        },
        {
            accessorKey: "is_visible",
            header: () => <span className="font-bold text-xs uppercase text-slate-500">Published Online</span>,
            cell: ({ row }) => <VisibilityToggle product={row.original} />,
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button 
                        onClick={() => {
                            setEditingProduct(row.original);
                            setEditForm({ online_price: row.original.price, description: row.original.online_description || '' });
                        }}
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Online Details</span>
                    </Button>
                </div>
            ),
        },
    ], [businessCurrency]);

    const table = useReactTable({
        data: displayedProducts,
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
        <div className="space-y-6">
            
            {/* PUBLIC SHAREABLE STOREFRONT LINK BANNER */}
            <Card className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-2xl border-none relative overflow-hidden">
                <Store className="absolute -right-4 -bottom-4 w-36 h-36 text-blue-500/10 rotate-12" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-widest">
                            <Globe size={14} /> Public Digital Storefront Node
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{storeConfig?.store_name || profile?.business_name || 'My Web Store'}</h3>
                        <p className="text-xs text-slate-400 font-mono">{publicStoreUrl}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button onClick={copyStoreLink} variant="outline" className="h-11 px-5 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-bold text-xs rounded-xl">
                            <Copy size={16} className="mr-2 text-blue-400" /> Copy Link
                        </Button>
                        <Button onClick={shareWhatsapp} className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30">
                            <MessageSquare size={16} className="mr-2" /> Share WhatsApp
                        </Button>
                    </div>
                </div>
            </Card>

            {/* MAIN E-COMMERCE PRODUCTS CARD */}
            <Card className="h-full border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 uppercase tracking-tight">
                                <PackageOpen className="h-6 w-6 text-blue-600" />
                                Online Product Publishing Manager
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">
                                Toggle physical inventory items to display on your public web storefront. Stock deducts only upon confirmed paid checkout.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Filter by product designation..."
                                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                                onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                                className="pl-10 h-11 rounded-xl font-bold text-xs border-slate-200"
                            />
                        </div>
                    </div>
                    
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="h-12">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={columns.length} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Fetching Inventory Catalog...</TableCell></TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="h-16 hover:bg-slate-50/50">
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center py-6">
                                                <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                                                <p className="text-xs font-bold uppercase">No matching products found in inventory.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Showing {table.getRowModel().rows.length} of {displayedProducts.length} items
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-xl font-bold h-9">
                                Previous
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-xl font-bold h-9">
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* EDIT ONLINE PRODUCT MODAL */}
            <Dialog open={!!editingProduct} onOpenChange={open => { if (!open) setEditingProduct(null); }}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
                    <div className="bg-slate-900 p-8 text-white text-center">
                        <DialogTitle className="text-lg font-black uppercase tracking-wider">Update Web Store Pricing</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">{editingProduct?.name}</DialogDescription>
                    </div>

                    <div className="p-8 space-y-6 bg-white">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Online Selling Rate ({businessCurrency}) *</Label>
                            <Input 
                                type="number" 
                                value={editForm.online_price} 
                                onChange={e => setEditForm({ ...editForm, online_price: Number(e.target.value) })} 
                                className="h-12 border-slate-200 rounded-2xl font-black text-xl text-blue-600" 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">E-Commerce Product Description</Label>
                            <Textarea 
                                placeholder="Highlight product specs for online buyers..." 
                                value={editForm.description} 
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                                className="rounded-2xl border-slate-200 font-medium min-h-[100px]" 
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
                        <Button variant="ghost" onClick={() => setEditingProduct(null)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
                        <Button onClick={() => updateProductMutation.mutate()} disabled={updateProductMutation.isPending} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
                            {updateProductMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Authorize & Publish"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}