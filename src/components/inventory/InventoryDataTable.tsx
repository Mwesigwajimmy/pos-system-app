'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Category, ProductRow } from '@/types/dashboard';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, 
  Download, 
  Trash, 
  BarChart, 
  Calculator, 
  Fingerprint,
  MapPin,
  Activity,
  Box,
  Zap,
  ShieldCheck,
  Search,
  Database,
  History,
  Archive
} from 'lucide-react';

import AddProductDialog from '@/components/inventory/AddProductDialog';
import ImportProductsDialog from '@/components/inventory/ImportProductsDialog';
import EditProductModal from '@/components/inventory/EditProductModal';
import AuditLogDialog from '@/components/inventory/AuditLogDialog';
import CreateAdjustmentForm from '@/components/inventory/CreateAdjustmentForm';
import { Badge } from '@/components/ui/badge';

// --- ENTERPRISE UTILITIES ---
const Money = {
  roundStock: (val: number) => Math.round((val + Number.EPSILON) * 10000) / 10000,
};

interface DataTableProps {
  columns: ColumnDef<ProductRow>[];
  initialData: ProductRow[];
  totalCount: number;
  categories: Category[];
  userRole?: string;
  businessEntityId?: string;
}

interface VariantReference {
    id: number;
    product_id: number;
    sku: string;
}

interface Location {
    id: string;
    name: string;
    is_primary: boolean;
}

// --- DATA ACCESS LAYER ---

async function fetchProducts(pagination: PaginationState, searchTerm: string, businessEntityId?: string, locationId?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_paginated_products', {
    p_page: pagination.pageIndex + 1,
    p_page_size: pagination.pageSize,
    p_search_text: searchTerm || null,
    p_business_entity_id: businessEntityId || null,
    p_location_id: locationId || null, 
  });
  if (error) throw new Error(error.message);
  return data;
}

async function bulkDeleteProducts(productIds: number[]) {
  const supabase = createClient();
  const { error } = await supabase.rpc('bulk_delete_products_v2', { p_product_ids: productIds });
  if (error) throw new Error(error.message);
}

async function processBulkAdjustment(payload: { reason: string; productIds: number[]; quantityChange: number }) {
    const supabase = createClient();
    
    const { data: variants, error: fetchError } = await supabase
        .from('product_variants')
        .select('id, product_id, sku')
        .in('product_id', payload.productIds);

    if (fetchError) throw new Error(`Database error: ${fetchError.message}`);
    if (!variants || variants.length === 0) throw new Error("No sellable variants found for the selected products.");

    const items = (variants as VariantReference[]).map((v) => ({
        variant_id: v.id,
        quantity_change: payload.quantityChange 
    }));

    const { error } = await supabase.rpc('process_stock_adjustment_v2', {
        p_reason: payload.reason,
        p_notes: `Bulk Dashboard Adjustment: Applied to ${items.length} variants across ${payload.productIds.length} products.`,
        p_items: items
    });

    if (error) throw new Error(error.message);
}

// --- MAIN COMPONENT ---

export default function InventoryDataTable({
  columns,
  initialData,
  totalCount,
  categories,
  userRole = "manager",
  businessEntityId,
}: DataTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
  const [rowSelection, setRowSelection] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL_BRANCHES");
  const [locations, setLocations] = useState<Location[]>([]);

  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [auditingProduct, setAuditingProduct] = useState<ProductRow | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);
  
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkAdjustReason, setBulkAdjustReason] = useState("");
  const [bulkAdjustValue, setBulkAdjustValue] = useState<number | string>("");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // UPGRADE: Location Handshake
  useEffect(() => {
    const fetchLocations = async () => {
        const { data } = await supabase
            .from('locations')
            .select('id, name, is_primary')
            .eq('business_id', businessEntityId);
        if (data) setLocations(data);
    };
    if (businessEntityId) fetchLocations();
  }, [businessEntityId, supabase]);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['inventoryProducts', pagination, debouncedSearchTerm, businessEntityId, selectedLocationId],
    queryFn: () => fetchProducts(
        pagination, 
        debouncedSearchTerm, 
        businessEntityId, 
        selectedLocationId === "ALL_BRANCHES" ? undefined : selectedLocationId
    ),
    initialData: { products: initialData, total_count: totalCount },
    placeholderData: keepPreviousData,
  });

  // --- MUTATIONS ---

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: () => {
      toast.success("Product assets permanently purged from registry.");
      setRowSelection({});
      setIsBulkDeleting(false);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err) => toast.error(`Liquidation Error: ${err.message}`),
  });

  const singleDeleteMutation = useMutation({
    mutationFn: (id: number) => bulkDeleteProducts([id]),
    onSuccess: () => {
        toast.success("SKU variant purged successfully.");
        setDeletingProduct(null);
        queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const bulkAdjustMutation = useMutation({
      mutationFn: processBulkAdjustment,
      onSuccess: () => {
          toast.success("Fiduciary stock adjustment sealed.");
          setRowSelection({});
          setIsBulkAdjustOpen(false);
          setBulkAdjustValue("");
          setBulkAdjustReason("");
          queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      },
      onError: (err) => toast.error(err.message)
  });

  // --- TABLE INSTANCE ---

  const table = useReactTable({
    data: (data?.products as ProductRow[]) ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total_count ?? 0) / pagination.pageSize),
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    meta: {
      onEdit: setEditingProduct,
      onDelete: setDeletingProduct,
      onAudit: setAuditingProduct,
      onAdjust: setAdjustingProduct,
      userRole,
      businessEntityId,
    },
  });

  // --- HANDLERS ---

  const handleExportCSV = () => {
    const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
    const dataToExport = selectedRows.length > 0 ? selectedRows : (data?.products || []);

    if (dataToExport.length === 0) {
        toast.error("Forensic error: No data discovered in local registry.");
        return;
    }

    const headers = ["ID", "Asset_Name", "SKU_Reference", "Stock_Level", "Category_DNA", "Tax_Protocol", "Units_Per_Pack", "Enterprise_Entity"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map((row: any) => {
          const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
          return [
              row.id, 
              escape(row.name), 
              escape(row.sku),
              row.total_stock, 
              escape(row.category_name),
              escape(row.tax_category_code || 'STANDARD'), 
              row.units_per_pack || 1,                     
              escape(row.business_entity_name)
          ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BBU1_SOVEREIGN_INVENTORY_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Forensic Trace Exported: ${dataToExport.length} assets archived.`);
  };

  const handleBulkAdjustSubmit = () => {
      const ids = Object.keys(rowSelection).map(Number);
      const val = Money.roundStock(Number(bulkAdjustValue));
      
      if (ids.length === 0) return;
      if (!bulkAdjustReason.trim()) {
          toast.error("A forensic reason is required for ledger adjustments.");
          return;
      }
      if (isNaN(val) || val === 0) {
          toast.error("Adjustment magnitude must be a non-zero fractional value.");
          return;
      }
      
      bulkAdjustMutation.mutate({
          reason: bulkAdjustReason,
          productIds: ids,
          quantityChange: val
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* Search & Actions Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4">
            <div className="relative w-full sm:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input
                    placeholder="Search Sovereign Asset Registry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-slate-50/50 border-slate-100 rounded-2xl font-medium placeholder:text-slate-300"
                />
            </div>

            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-full sm:w-[240px] h-12 bg-white border-slate-200 rounded-2xl shadow-sm font-black text-[10px] uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        <SelectValue placeholder="Filter by Jurisdiction" />
                    </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="ALL_BRANCHES" className="font-black text-[10px] uppercase tracking-tighter italic text-slate-400">Total Consolidated View</SelectItem>
                    {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id} className="font-bold">
                            {loc.name} {loc.is_primary ? '(HQ)' : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="flex gap-3 w-full sm:w-auto justify-end">
          <ImportProductsDialog />
          <AddProductDialog categories={categories} />
        </div>
      </div>

      {/* COMMAND BAR: High-Integrity Bulk Operations */}
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center bg-slate-900 text-white p-5 px-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl">
                <Archive size={22} className="text-blue-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Selection State</span>
                <span className="text-xl font-black font-mono text-blue-100">
                    {Object.keys(rowSelection).length.toString().padStart(2, '0')} <span className="text-xs">SKUs</span>
                </span>
            </div>
        </div>
        
        <div className="h-10 w-[1px] bg-white/5 hidden sm:block mx-4" />
        
        <div className="flex flex-wrap gap-3 relative z-10">
            <Button 
                variant="destructive" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkDeleting(true)}
                className="font-black text-[10px] uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-red-900/40"
            >
                <Trash className="w-4 h-4 mr-2" /> Liquidate
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkAdjustOpen(true)}
                className="font-black text-[10px] uppercase tracking-widest h-10 px-6 bg-blue-600 hover:bg-blue-700 border-none text-white shadow-xl shadow-blue-900/40"
            >
                <Calculator className="w-4 h-4 mr-2 text-blue-200" /> Adjust DNA
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                className="font-black text-[10px] uppercase tracking-widest h-10 px-6 bg-transparent border-slate-700 hover:bg-white/5 text-slate-300"
            >
                <Download className="w-4 h-4 mr-2" /> Export Audit
            </Button>
        </div>

        <div className="ml-auto hidden xl:flex items-center gap-3 opacity-30 relative z-10">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Sovereign Guard Enabled</span>
        </div>
      </div>

      {/* Main Asset Table */}
      <div className="rounded-[2.5rem] border-none bg-white shadow-2xl shadow-slate-200/60 overflow-hidden ring-1 ring-slate-100">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-16 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 pl-8">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronizing Ledger State...</span>
                    </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"} 
                    className="hover:bg-blue-50/20 transition-all duration-300 h-20 border-b border-slate-50 group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 pl-8">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                  <TableCell colSpan={columns.length} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center opacity-10">
                        <Database size={80} className="mb-6" />
                        <p className="font-black uppercase tracking-[0.5em] text-lg">Null Registry</p>
                    </div>
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 px-4 bg-slate-50/50 p-6 rounded-[2rem] border border-dashed border-slate-200">
        <div className="flex flex-col gap-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Fingerprint size={14} className="text-blue-500" />
                Global Record Integrity: {data?.total_count ?? 0} Assets
            </div>
            {dataUpdatedAt && (
                <span className="text-[9px] font-mono text-slate-400">Last Ledger Handshake: {format(new Date(dataUpdatedAt), 'HH:mm:ss')}</span>
            )}
        </div>
        <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-10 font-black text-[10px] uppercase tracking-widest hover:bg-white shadow-sm">PREV</Button>
            <div className="bg-slate-900 px-6 py-2 rounded-full text-xs font-black text-white shadow-xl font-mono">
                {pagination.pageIndex + 1} <span className="mx-2 opacity-30">/</span> {table.getPageCount()}
            </div>
            <Button variant="ghost" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-10 font-black text-[10px] uppercase tracking-widest hover:bg-white shadow-sm">NEXT</Button>
        </div>
      </div>

      {/* --- DIALOGS (SOVEREIGN SEALED) --- */}

      <AlertDialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-12">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase text-red-600">Forensic Liquidation</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-base leading-relaxed mt-4">
                You are initiating a terminal operation to purge **{Object.keys(rowSelection).length} assets** from the Sovereign Registry. This will permanently erase all associated SKU metadata and historical ledger links. This action cannot be undone by the kernel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-slate-50 p-10 -mx-12 -mb-12 rounded-b-[2.5rem] mt-10 border-t border-slate-100 flex items-center justify-between">
            <AlertDialogCancel className="font-black text-xs uppercase tracking-widest border-none bg-transparent text-slate-400 hover:text-slate-900">ABORT MISSION</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest h-14 px-10 rounded-2xl shadow-2xl shadow-red-200 hover:scale-105 transition-all"
                onClick={() => {
                    const ids = Object.keys(rowSelection).map(Number);
                    bulkDeleteMutation.mutate(ids);
                }}
            >
                {bulkDeleteMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Trash className="mr-2 h-4 w-4" />}
                CONFIRM PURGE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-2xl tracking-tight uppercase italic text-slate-900">Purge Individual Asset?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 font-medium">
                Confirming the removal of <span className="text-blue-600 font-bold">"{deletingProduct?.name}"</span> from the global registry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8">
            <AlertDialogCancel className="font-bold border-none rounded-xl">CANCEL</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 font-black h-12 px-8 rounded-xl shadow-xl shadow-red-100"
                onClick={() => deletingProduct && singleDeleteMutation.mutate(deletingProduct.id)}
            >
                {singleDeleteMutation.isPending ? "PROCESSING..." : "PURGE ASSET"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBulkAdjustOpen} onOpenChange={setIsBulkAdjustOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[3rem] border-none shadow-2xl p-12">
            <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                    <Calculator className="w-8 h-8 text-white animate-pulse"/>
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">DNA Adjust</DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase text-emerald-600 tracking-widest">Fiduciary Precision Engine</DialogDescription>
                  </div>
                </div>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mt-4">
                    Modify stock magnitude for <span className="text-slate-900 font-black">{Object.keys(rowSelection).length} assets</span>. High-precision fractional rounding is applied autonomously.
                </p>
            </DialogHeader>
            <div className="grid gap-8 py-8">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Quantity Delta (0.0001 Scale)</Label>
                    <Input 
                        type="number" 
                        step="0.0001" 
                        placeholder="e.g. +24 or -0.25" 
                        className="h-16 text-3xl font-mono font-black bg-slate-50 border-none shadow-inner rounded-2xl px-6 text-blue-600"
                        value={bulkAdjustValue}
                        onChange={(e) => setBulkAdjustValue(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Forensic Justification</Label>
                    <Input 
                        placeholder="Describe the nature of this correction..." 
                        className="h-14 bg-slate-50 border-none shadow-inner text-sm font-bold rounded-xl px-6"
                        value={bulkAdjustReason}
                        onChange={(e) => setBulkAdjustReason(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter className="bg-slate-50 p-10 -mx-12 -mb-12 rounded-b-[3rem] mt-6 border-t border-slate-100 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setIsBulkAdjustOpen(false)} className="font-black text-xs uppercase tracking-widest text-slate-400">CANCEL</Button>
                <Button 
                    onClick={handleBulkAdjustSubmit} 
                    disabled={bulkAdjustMutation.isPending}
                    className="bg-slate-900 text-white font-black px-12 h-14 rounded-2xl shadow-2xl hover:scale-105 transition-all"
                >
                    {bulkAdjustMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <ShieldCheck className="w-5 h-5 mr-3 text-emerald-400" />}
                    SEAL LEDGER
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditProductModal product={editingProduct} isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} categories={categories} />
      <AuditLogDialog product={auditingProduct} isOpen={!!auditingProduct} onClose={() => setAuditingProduct(null)} />
      <CreateAdjustmentForm product={adjustingProduct} isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} categories={categories} />
    </div>
  );
}