'use client';

/**
 * --- BBU1 SOVEREIGN E-COMMERCE PRODUCT MANAGER ---
 * VERSION: v16.0 OMEGA (DEEP DESCRIPTIONS, DUAL PHOTO+VIDEO MEDIA & BULK MULTI-SELECT)
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
            header: ({ table }) => (
                <button
                    onClick={table.getToggleAllRowsSelectedHandler()}
                    className="flex items-center justify-center p-1 text-slate-400 hover:text-slate-900"
                >
                    {table.getIsAllRowsSelected() ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                </button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={row.getToggleSelectedHandler()}
                    className="flex items-center justify-center p-1 text-slate-400 hover:text-slate-900"
                >
                    {row.getIsSelected() ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                </button>
            ),
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button variant="ghost" className="pl-0 hover:bg-transparent font-bold text-xs uppercase text-slate-500" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Product Designation <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-900 flex items-center justify-center relative">
                        {row.original.primary_media_url ? (
                            isVideoUrl(row.original.primary_media_url) ? (
                                <video src={row.original.primary_media_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                            ) : (
                                <img src={row.original.primary_media_url} className="h-full w-full object-cover" alt="asset" />
                            )
                        ) : (
                            <ImageIcon size={18} className="text-slate-600" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{row.getValue("name")}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{row.original.category || 'Uncategorized'}</span>
                            {row.original.video_url && (
                                <Badge className="bg-purple-100 text-purple-800 font-bold text-[8px] uppercase px-1.5 py-0 border-none flex items-center gap-0.5">
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
                        className="h-9 px-3 font-bold text-xs text-blue-600 hover:bg-blue-50 rounded-xl"
                    >
                        <Edit className="h-4 w-4 mr-1" /> Edit Specs
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
                                Online Product Publishing & Deep Specifications
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">
                                Toggle physical inventory items to display on your public web storefront. Add deep rich descriptions, photos, and video walkthrough clips.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                    
                    {/* CONTROLS & BULK MULTI-SELECT BAR */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Filter by product designation..."
                                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                                onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                                className="pl-10 h-11 rounded-xl font-bold text-xs border-slate-200"
                            />
                        </div>

                        {/* BULK ACTION BAR */}
                        {selectedCount > 0 && (
                            <div className="flex items-center gap-3 p-2 px-4 bg-slate-900 text-white rounded-2xl animate-in fade-in duration-300">
                                <span className="text-xs font-bold uppercase text-blue-400">{selectedCount} Selected</span>
                                <Button 
                                    onClick={() => handleBulkVisibilityToggle(true)}
                                    size="sm" 
                                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-lg"
                                >
                                    <Eye size={12} className="mr-1" /> Publish Selected
                                </Button>
                                <Button 
                                    onClick={() => handleBulkVisibilityToggle(false)}
                                    size="sm" 
                                    variant="outline"
                                    className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-[10px] uppercase rounded-lg"
                                >
                                    <EyeOff size={12} className="mr-1" /> Hide Selected
                                </Button>
                            </div>
                        )}
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

            {/* EDIT DEEP PRODUCT SPECS & DUAL MEDIA (PHOTO + VIDEO WALKTHROUGH) MODAL */}
            <Dialog open={!!editingProduct} onOpenChange={open => { if (!open) setEditingProduct(null); }}>
                <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl max-h-[90vh] overflow-y-auto">
                    <div className="bg-slate-900 p-8 text-white text-center">
                        <DialogTitle className="text-lg font-black uppercase tracking-wider">Deep Product Specifications & Media</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">{editingProduct?.name}</DialogDescription>
                    </div>

                    <div className="p-8 space-y-6 bg-white">
                        
                        {/* PRICING FIELDS (RETAIL & B2B WHOLESALE) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Online Retail Rate ({businessCurrency}) *</Label>
                                <Input 
                                    type="number" 
                                    value={editForm.online_price} 
                                    onChange={e => setEditForm({ ...editForm, online_price: Number(e.target.value) })} 
                                    className="h-12 border-slate-200 rounded-2xl font-black text-xl text-blue-600" 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1">
                                    <Zap size={12} /> B2B Wholesale Rate ({businessCurrency})
                                </Label>
                                <Input 
                                    type="number" 
                                    value={editForm.wholesale_price} 
                                    onChange={e => setEditForm({ ...editForm, wholesale_price: Number(e.target.value) })} 
                                    className="h-12 border-emerald-200 bg-emerald-50/20 rounded-2xl font-black text-xl text-emerald-900" 
                                />
                            </div>
                        </div>

                        {/* DEEP PRODUCT DESCRIPTION & SPECS */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Deep Product Description, Warranty & Usage Guide *</Label>
                            <Textarea 
                                placeholder="Detail how this product or property is used, exact dimensions, warranty policies, or specifications for online buyers..." 
                                value={editForm.description} 
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                                className="rounded-2xl border-slate-200 font-medium min-h-[120px]" 
                            />
                        </div>

                        {/* DUAL MEDIA ATTACHMENTS (PHOTO AND VIDEO WALKTHROUGH) */}
                        <div className="space-y-4 border-t border-slate-100 pt-6">
                            <Label className="text-[10px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                                <Film size={14} /> Dual Product Photo & Short Video Walkthrough
                            </Label>

                            {/* 1. PRODUCT PHOTO ATTACHMENT WITH INSTANT PREVIEW */}
                            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                                        <ImageIcon size={12} className="text-blue-600" /> Primary Product Photo
                                    </Label>
                                    {editForm.primary_media_url && (
                                        <Badge className="bg-blue-100 text-blue-800 font-bold text-[8px] uppercase">Photo Attached</Badge>
                                    )}
                                </div>

                                {editForm.primary_media_url && (
                                    <div className="h-28 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                                        <img src={editForm.primary_media_url} className="h-full w-full object-cover" alt="Photo preview" />
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Input 
                                        placeholder="https://... photo URL" 
                                        value={editForm.primary_media_url} 
                                        onChange={e => setEditForm({ ...editForm, primary_media_url: e.target.value })} 
                                        className="h-10 rounded-xl font-mono text-xs flex-1 bg-white" 
                                    />
                                    <div className="relative shrink-0">
                                        <Input type="file" accept="image/*" onChange={e => handleMediaAssetUpload(e, 'primary_media_url')} className="hidden" id="photo-file-upload" />
                                        <label htmlFor="photo-file-upload" className="h-10 px-4 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-100">
                                            {isUploadingPhoto ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload size={14} className="mr-1" />} Upload
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* 2. VIDEO WALKTHROUGH ATTACHMENT WITH INSTANT LIVE PREVIEW */}
                            <div className="space-y-2 p-4 bg-purple-50/40 rounded-2xl border border-purple-100">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase text-purple-900 flex items-center gap-1">
                                        <Video size={12} className="text-purple-600" /> Video Walkthrough Clip (Showing How Product is Used)
                                    </Label>
                                    {editForm.video_url && (
                                        <Badge className="bg-purple-600 text-white font-bold text-[8px] uppercase">Video Attached</Badge>
                                    )}
                                </div>

                                {editForm.video_url && (
                                    <div className="h-28 w-full rounded-xl overflow-hidden border border-purple-200 bg-slate-900 flex items-center justify-center">
                                        <video src={editForm.video_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Input 
                                        placeholder="https://... video URL (.mp4)" 
                                        value={editForm.video_url} 
                                        onChange={e => setEditForm({ ...editForm, video_url: e.target.value })} 
                                        className="h-10 rounded-xl font-mono text-xs flex-1 bg-white" 
                                    />
                                    <div className="relative shrink-0">
                                        <Input type="file" accept="video/*" onChange={e => handleMediaAssetUpload(e, 'video_url')} className="hidden" id="video-file-upload" />
                                        <label htmlFor="video-file-upload" className="h-10 px-4 bg-purple-600 text-white font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer hover:bg-purple-700">
                                            {isUploadingVideo ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera size={14} className="mr-1" />} Upload Video
                                        </label>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
                        <Button variant="ghost" onClick={() => setEditingProduct(null)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
                        <Button onClick={() => updateProductMutation.mutate()} disabled={updateProductMutation.isPending} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
                            {updateProductMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Save Specifications & Publish"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}