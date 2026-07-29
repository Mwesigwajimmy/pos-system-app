'use client';

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

Copy, Globe, Loader2, Store, MessageSquare, Video,

Image as ImageIcon, Film, Plus, Camera, CheckSquare, Square,

Upload, Trash2, ShieldCheck, Zap, Eye, EyeOff

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


// HELPER: DETECT IF URL IS A VIDEO FILE

const isVideoUrl = (url?: string) => {

if (!url) return false;

const cleanUrl = url.split('?')[0].toLowerCase();

return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');

};


export interface ManagedProduct {

id: string | number;

product_id?: number;

name: string;

sku: string | null;

price: number;

online_price?: number;

wholesale_price?: number;

min_b2b_qty?: number;

stock_quantity: number;

is_online: boolean;

is_visible: boolean;

is_network_published?: boolean;

category: string | null;

primary_media_url?: string | null;

video_url?: string | null;

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
            queryClient.invalidateQueries({ queryKey: ['global_bbu1_marketplace'] });
        } catch (err: any) {
            toast.error(`Visibility Update Failed: ${err.message}`);
        }
    });
};

return (
    <div className="flex items-center justify-end gap-2">
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

const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});


// EDIT MODAL STATE
const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(null);
const [editForm, setEditForm] = useState({ 
    online_price: 0, 
    wholesale_price: 0,
    description: '', 
    primary_media_url: '', 
    video_url: '' 
});

// MEDIA UPLOAD LOADING STATES
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const [isUploadingVideo, setIsUploadingVideo] = useState(false);

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

// 3. DATA: Live Inventory Products with Video Walkthrough & Deep Descriptions
const { data: liveProducts, isLoading } = useQuery({
    queryKey: ['online_products_managed', activeBusinessId],
    enabled: !!activeBusinessId && !propProducts,
    queryFn: async () => {
        const { data, error } = await supabase
            .from('product_variants')
            .select(`
                id, product_id, name, sku, price, selling_price, cost_price, 
                stock_quantity, current_stock, is_published_online, is_active, 
                online_price, wholesale_price, min_b2b_qty, is_network_published,
                primary_media_url, video_url, online_description,
                products ( id, name, description, categories ( name ) )
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
            online_price: Number(pv.online_price || pv.selling_price || pv.price || 0),
            wholesale_price: Number(pv.wholesale_price || pv.online_price || pv.price || 0),
            stock_quantity: Number(pv.current_stock ?? pv.stock_quantity ?? 0),
            is_online: true,
            is_visible: !!pv.is_published_online,
            is_network_published: !!pv.is_network_published,
            category: pv.products?.categories?.name || 'General',
            primary_media_url: pv.primary_media_url,
            video_url: pv.video_url,
            online_description: pv.online_description || pv.products?.description || ''
        })) as ManagedProduct[];
    }
});

const displayedProducts = useMemo(() => {
    return propProducts || liveProducts || [];
}, [propProducts, liveProducts]);

// HANDLER: MEDIA ASSET UPLOADER (SUPPORTS PHOTO AND VIDEO)
const handleMediaAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'primary_media_url' | 'video_url') => {
    const file = e.target.files?.[0];
    if (!file || !activeBusinessId) return;

    if (field === 'primary_media_url') setIsUploadingPhoto(true);
    if (field === 'video_url') setIsUploadingVideo(true);

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${activeBusinessId}/item_${field}_${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
            .from('inventory-assets')
            .upload(filePath, file);

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
            .from('inventory-assets')
            .getPublicUrl(filePath);

        setEditForm(prev => ({ ...prev, [field]: publicUrl }));
        toast.success(`${field === 'primary_media_url' ? 'Product Photo' : 'Video Walkthrough'} Uploaded!`);
    } catch (err: any) {
        toast.error(`Media Upload Failed: ${err.message}`);
    } finally {
        setIsUploadingPhoto(false);
        setIsUploadingVideo(false);
    }
};

// MUTATION: Update Deep Specs, Online Price, Description & Photo+Video Links
const updateProductMutation = useMutation({
    mutationFn: async () => {
        if (!editingProduct) return;

        const { error } = await supabase
            .from('product_variants')
            .update({
                online_price: Number(editForm.online_price),
                wholesale_price: Number(editForm.wholesale_price),
                online_description: editForm.description,
                primary_media_url: editForm.primary_media_url,
                video_url: editForm.video_url,
                is_published_online: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', editingProduct.id);

        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Deep Specifications & Media Links Saved!");
        setEditingProduct(null);
        queryClient.invalidateQueries({ queryKey: ['online_products_managed'] });
        queryClient.invalidateQueries({ queryKey: ['public_store_catalog'] });
        queryClient.invalidateQueries({ queryKey: ['global_bbu1_marketplace'] });
    },
    onError: (err: any) => toast.error(`Update failed: ${err.message}`)
});

// BULK ACTION HANDLER
const handleBulkVisibilityToggle = async (publish: boolean) => {
    const selectedIndexes = Object.keys(rowSelection);
    if (selectedIndexes.length === 0) return toast.error("Please select products first.");

    const selectedIds = selectedIndexes.map(idx => displayedProducts[Number(idx)]?.id).filter(Boolean);

    try {
        const { error } = await supabase
            .from('product_variants')
            .update({ 
                is_published_online: publish,
                updated_at: new Date().toISOString()
            })
            .in('id', selectedIds);

        if (error) throw error;

        toast.success(`${selectedIds.length} Products ${publish ? 'Published' : 'Hidden'}!`);
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: ['online_products_managed'] });
        queryClient.invalidateQueries({ queryKey: ['public_store_catalog'] });
    } catch (err: any) {
        toast.error(`Bulk Update Failed: ${err.message}`);
    }
};

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
        id: "select",
        size: 48,
        header: ({ table }) => (
            <button
                onClick={table.getToggleAllRowsSelectedHandler()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
                {table.getIsAllRowsSelected() ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
            </button>
        ),
        cell: ({ row }) => (
            <button
                onClick={row.getToggleSelectedHandler()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
                {row.getIsSelected() ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
            </button>
        ),
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button 
                variant="ghost" 
                className="h-auto whitespace-nowrap px-0 py-2 text-left font-bold text-[11px] uppercase tracking-wide text-slate-500 hover:bg-transparent" 
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Product Designation <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex min-w-[10rem] items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-900">
                    {row.original.primary_media_url ? (
                        isVideoUrl(row.original.primary_media_url) ? (
                            <video src={row.original.primary_media_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                        ) : (
                            <img src={row.original.primary_media_url} className="h-full w-full object-cover" alt="asset" />
                        )
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon size={18} className="text-slate-600" />
                        </div>
                    )}
                </div>
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold text-slate-900">{row.getValue("name")}</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.original.category || 'Uncategorized'}</span>
                        {row.original.video_url && (
                            <Badge className="flex items-center gap-0.5 border-none bg-purple-100 px-1.5 py-0 text-[9px] font-black uppercase text-purple-700">
                                <Film size={10} /> Video
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "sku",
        header: () => <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-500">SKU / Code</span>,
        cell: ({ row }) => <span className="font-mono text-xs font-bold uppercase text-slate-600">{row.getValue("sku") || 'N/A'}</span>,
    },
    {
        accessorKey: "stock_quantity",
        header: () => <div className="whitespace-nowrap text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Physical Stock</div>,
        cell: ({ row }) => {
            const qty = Number(row.original.stock_quantity || 0);
            const colorClass = qty === 0 ? "text-rose-600 font-black" : qty < 10 ? "text-amber-600 font-bold" : "text-slate-900 font-bold";
            return (
                <div className={cn("text-right text-sm tabular-nums", colorClass)}>
                    {qty.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">UNITS</span>
                </div>
            );
        }
    },
    {
        accessorKey: "price",
        header: () => <div className="whitespace-nowrap text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Online Rate ({businessCurrency})</div>,
        cell: ({ row }) => {
            const amount = Number(row.getValue("price") || 0);
            return (
                <div className="text-right text-sm font-black tabular-nums text-blue-600">
                    {amount.toLocaleString()}
                </div>
            );
        },
    },
    {
        accessorKey: "is_online",
        header: () => <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-500">Store Readiness</span>,
        cell: ({ row }) => (
            <Badge variant={row.getValue("is_online") ? "outline" : "secondary"} className={row.getValue("is_online") ? "border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700" : "bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500"}>
                {row.getValue("is_online") ? "Store Ready" : "Draft"}
            </Badge>
        ),
    },
    {
        accessorKey: "is_visible",
        header: () => <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-500">Published Online</span>,
        cell: ({ row }) => <VisibilityToggle product={row.original} />,
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="flex justify-end">
                <Button 
                    onClick={() => {
                        setEditingProduct(row.original);
                        setEditForm({ 
                            online_price: row.original.price, 
                            wholesale_price: row.original.wholesale_price || row.original.price,
                            description: row.original.online_description || '', 
                            primary_media_url: row.original.primary_media_url || '',
                            video_url: row.original.video_url || ''
                        });
                    }}
                    variant="ghost" 
                    size="sm" 
                    className="h-9 gap-1.5 rounded-xl px-3 text-xs font-black text-blue-600 hover:bg-blue-50"
                >
                    <Edit className="h-3.5 w-3.5" /> Edit Specs
                </Button>
            </div>
        ),
    },
], [businessCurrency]);

const table = useReactTable({
    data: displayedProducts,
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

const selectedCount = Object.keys(rowSelection).length;

return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-2 sm:p-4 lg:p-6">
        
        {/* PUBLIC SHAREABLE STOREFRONT LINK BANNER */}
        <Card className="relative overflow-hidden rounded-[2rem] border-none bg-slate-900 text-white shadow-2xl">
            <div className="absolute -right-6 -bottom-10 rotate-12 opacity-10">
                <Store className="h-48 w-48 text-blue-400" />
            </div>
            <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">
                        <Globe size={14} /> Public Digital Storefront Node
                    </div>
                    <h3 className="truncate text-xl font-black uppercase tracking-tight md:text-2xl">{storeConfig?.store_name || profile?.business_name || 'My Web Store'}</h3>
                    <p className="truncate font-mono text-xs text-slate-400">{publicStoreUrl}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={copyStoreLink} variant="outline" className="h-11 rounded-xl border-slate-700 bg-slate-800 px-5 text-xs font-black text-white hover:bg-slate-700">
                        <Copy size={16} className="mr-2 text-blue-400" /> Copy Link
                    </Button>
                    <Button onClick={shareWhatsapp} className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-700">
                        <MessageSquare size={16} className="mr-2" /> Share WhatsApp
                    </Button>
                </div>
            </div>
        </Card>

        {/* MAIN E-COMMERCE PRODUCTS CARD */}
        <Card className="h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl dark:border-slate-800">
            <CardHeader className="border-b bg-slate-50/60 p-5 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                        <CardTitle className="flex items-start gap-3 text-lg font-black uppercase tracking-tight text-slate-900 md:text-xl">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                                <PackageOpen className="h-5 w-5" />
                            </div>
                            <span className="leading-tight">Online Product Publishing & Deep Specifications</span>
                        </CardTitle>
                        <CardDescription className="max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
                            Toggle physical inventory items to display on your public web storefront. Add deep rich descriptions, photos, and video walkthrough clips.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 p-5 md:p-8">
                
                {/* CONTROLS & BULK MULTI-SELECT BAR */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Filter by product designation..."
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                            className="h-11 rounded-xl border-slate-200 pl-10 text-sm font-semibold placeholder:font-medium"
                        />
                    </div>

                    {/* BULK ACTION BAR */}
                    {selectedCount > 0 && (
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-900 p-2.5 px-4 text-white animate-in fade-in duration-300">
                            <span className="text-xs font-black uppercase tracking-wide text-blue-400">{selectedCount} Selected</span>
                            <div className="flex flex-wrap gap-2">
                                <Button 
                                    onClick={() => handleBulkVisibilityToggle(true)}
                                    size="sm" 
                                    className="h-9 gap-1.5 rounded-lg bg-blue-600 text-[10px] font-black uppercase text-white hover:bg-blue-700"
                                >
                                    <Eye size={12} /> Publish Selected
                                </Button>
                                <Button 
                                    onClick={() => handleBulkVisibilityToggle(false)}
                                    size="sm" 
                                    variant="outline"
                                    className="h-9 gap-1.5 rounded-lg border-slate-700 bg-transparent text-[10px] font-black uppercase text-slate-300 hover:bg-slate-800 hover:text-white"
                                >
                                    <EyeOff size={12} /> Hide Selected
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="h-12 hover:bg-transparent">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} className="text-slate-500">
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                                <Loader2 className="animate-spin text-blue-600" size={28} />
                                                <span className="text-xs font-bold uppercase tracking-wide">Fetching Inventory Catalog...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="h-16 transition-colors hover:bg-slate-50/80">
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="py-3 align-middle">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                                                    <AlertCircle className="h-7 w-7 opacity-40" />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-wide">No matching products found in inventory.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Showing {table.getRowModel().rows.length} of {displayedProducts.length} items
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-10 rounded-xl px-5 font-bold">
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-10 rounded-xl px-5 font-bold">
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* EDIT DEEP PRODUCT SPECS & DUAL MEDIA (PHOTO + VIDEO WALKTHROUGH) MODAL */}
        <Dialog open={!!editingProduct} onOpenChange={open => { if (!open) setEditingProduct(null); }}>
            <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-[2rem] border-none bg-white p-0 shadow-2xl">
                <DialogHeader className="bg-slate-900 p-6 text-center md:p-8">
                    <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">Deep Product Specifications & Media</DialogTitle>
                    <DialogDescription className="mt-1 truncate px-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {editingProduct?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[calc(92vh-12rem)] space-y-6 overflow-y-auto p-6 md:p-8">
                    
                    {/* PRICING FIELDS (RETAIL & B2B WHOLESALE) */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Online Retail Rate ({businessCurrency}) *</Label>
                            <Input 
                                type="number" 
                                value={editForm.online_price} 
                                onChange={e => setEditForm({ ...editForm, online_price: Number(e.target.value) })} 
                                className="h-12 rounded-2xl border-slate-200 text-xl font-black text-blue-600" 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                                <Zap size={12} /> B2B Wholesale Rate ({businessCurrency})
                            </Label>
                            <Input 
                                type="number" 
                                value={editForm.wholesale_price} 
                                onChange={e => setEditForm({ ...editForm, wholesale_price: Number(e.target.value) })} 
                                className="h-12 rounded-2xl border-emerald-200 bg-emerald-50/20 text-xl font-black text-emerald-900" 
                            />
                        </div>
                    </div>

                    {/* DEEP PRODUCT DESCRIPTION & SPECS */}
                    <div className="space-y-2">
                        <Label className="ml-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Deep Product Description, Warranty & Usage Guide *</Label>
                        <Textarea 
                            placeholder="Detail how this product or property is used, exact dimensions, warranty policies, or specifications for online buyers..." 
                            value={editForm.description} 
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                            className="min-h-[130px] rounded-2xl border-slate-200 text-sm font-medium leading-relaxed" 
                        />
                    </div>

                    {/* DUAL MEDIA ATTACHMENTS (PHOTO AND VIDEO WALKTHROUGH) */}
                    <div className="space-y-5 border-t border-slate-100 pt-6">
                        <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-blue-600">
                            <Film size={14} /> Dual Product Photo & Short Video Walkthrough
                        </Label>

                        {/* 1. PRODUCT PHOTO ATTACHMENT WITH INSTANT PREVIEW */}
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600">
                                    <ImageIcon size={12} className="text-blue-600" /> Primary Product Photo
                                </Label>
                                {editForm.primary_media_url && (
                                    <Badge className="bg-blue-100 px-2 py-0.5 text-[8px] font-black uppercase text-blue-800">Photo Attached</Badge>
                                )}
                            </div>

                            {editForm.primary_media_url && (
                                <div className="h-36 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                                    <img src={editForm.primary_media_url} className="h-full w-full object-cover" alt="Photo preview" />
                                </div>
                            )}

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Input 
                                    placeholder="https://... photo URL" 
                                    value={editForm.primary_media_url} 
                                    onChange={e => setEditForm({ ...editForm, primary_media_url: e.target.value })} 
                                    className="h-11 flex-1 rounded-xl bg-white font-mono text-xs" 
                                />
                                <div className="relative shrink-0">
                                    <Input type="file" accept="image/*" onChange={e => handleMediaAssetUpload(e, 'primary_media_url')} className="hidden" id="photo-file-upload" />
                                    <label htmlFor="photo-file-upload" className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-5 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100">
                                        {isUploadingPhoto ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload size={14} />} Upload
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 2. VIDEO WALKTHROUGH ATTACHMENT WITH INSTANT LIVE PREVIEW */}
                        <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-purple-900">
                                    <Video size={12} className="text-purple-600" /> Video Walkthrough Clip (Showing How Product is Used)
                                </Label>
                                {editForm.video_url && (
                                    <Badge className="bg-purple-600 px-2 py-0.5 text-[8px] font-black uppercase text-white">Video Attached</Badge>
                                )}
                            </div>

                            {editForm.video_url && (
                                <div className="h-36 w-full overflow-hidden rounded-xl border border-purple-200 bg-slate-900">
                                    <video src={editForm.video_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                                </div>
                            )}

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Input 
                                    placeholder="https://... video URL (.mp4)" 
                                    value={editForm.video_url} 
                                    onChange={e => setEditForm({ ...editForm, video_url: e.target.value })} 
                                    className="h-11 flex-1 rounded-xl bg-white font-mono text-xs" 
                                />
                                <div className="relative shrink-0">
                                    <Input type="file" accept="video/*" onChange={e => handleMediaAssetUpload(e, 'video_url')} className="hidden" id="video-file-upload" />
                                    <label htmlFor="video-file-upload" className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-5 text-xs font-black text-white transition-colors hover:bg-purple-700">
                                        {isUploadingVideo ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera size={14} />} Upload Video
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                <DialogFooter className="flex-col gap-3 border-t bg-slate-50 p-5 sm:flex-row sm:justify-end md:p-6">
                    <Button variant="ghost" onClick={() => setEditingProduct(null)} className="h-12 rounded-2xl px-6 text-xs font-black uppercase text-slate-500 hover:bg-slate-100">Cancel</Button>
                    <Button onClick={() => updateProductMutation.mutate()} disabled={updateProductMutation.isPending} className="h-12 flex-1 rounded-2xl bg-blue-600 px-6 text-xs font-black uppercase text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 sm:flex-initial">
                        {updateProductMutation.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Save Specifications & Publish"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
);

}