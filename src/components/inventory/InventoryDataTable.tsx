'use client';

import React, { useState, useEffect } from 'react';
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
  Zap
} from 'lucide-react';

import AddProductDialog from '@/components/inventory/AddProductDialog';
import ImportProductsDialog from '@/components/inventory/ImportProductsDialog';
import EditProductModal from '@/components/inventory/EditProductModal';
import AuditLogDialog from '@/components/inventory/AuditLogDialog';
import CreateAdjustmentForm from '@/components/inventory/CreateAdjustmentForm';

// --- ENTERPRISE INTERFACES ---

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

// UPGRADE: Added p_location_id to ensure branch-level isolation
async function fetchProducts(pagination: PaginationState, searchTerm: string, businessEntityId?: string, locationId?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_paginated_products', {
    p_page: pagination.pageIndex + 1,
    p_page_size: pagination.pageSize,
    p_search_text: searchTerm || null,
    p_business_entity_id: businessEntityId || null,
    p_location_id: locationId || null, // NEW: Filter by specific branch
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
  
  // UPGRADE: Branch Isolation State
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

  // UPGRADE: Fetch locations for the branch-specific filter
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

  // UPGRADE: Query now depends on selectedLocationId to ensure isolation
  const { data, isLoading } = useQuery({
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
      toast.success("Products deleted successfully.");
      setRowSelection({});
      setIsBulkDeleting(false);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err) => toast.error(`Deletion failed: ${err.message}`),
  });

  const singleDeleteMutation = useMutation({
    mutationFn: (id: number) => bulkDeleteProducts([id]),
    onSuccess: () => {
        toast.success("Product deleted.");
        setDeletingProduct(null);
        queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const bulkAdjustMutation = useMutation({
      mutationFn: processBulkAdjustment,
      onSuccess: () => {
          toast.success("Stock adjustment applied successfully.");
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
        toast.error("No data available to export.");
        return;
    }

    const headers = ["ID", "Name", "SKU", "Total Stock", "Category", "Tax Category", "Units/Pack", "Entity"];
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
    link.setAttribute("download", `sovereign_inventory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataToExport.length} rows with global metadata.`);
  };

  const handleBulkAdjustSubmit = () => {
      const ids = Object.keys(rowSelection).map(Number);
      const val = Number(bulkAdjustValue);
      
      if (ids.length === 0) return;
      if (!bulkAdjustReason.trim()) {
          toast.error("Please provide a reason (e.g., 'Initial Stock').");
          return;
      }
      if (isNaN(val) || val === 0) {
          toast.error("Please enter a valid non-zero quantity.");
          return;
      }
      
      bulkAdjustMutation.mutate({
          reason: bulkAdjustReason,
          productIds: ids,
          quantityChange: val
      });
  };

  // --- RENDER ---

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* Search & Actions Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
            <div className="relative w-full sm:w-80 group">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Find product by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 shadow-sm border-slate-200"
                />
            </div>

            {/* UPGRADE: Robotic Branch Isolation Dropdown */}
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-full sm:w-[220px] h-11 bg-white border-slate-200 shadow-sm font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-primary" />
                        <SelectValue placeholder="Filter by Branch" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL_BRANCHES" className="font-bold italic">Global System View</SelectItem>
                    {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.is_primary && '(HQ)'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <ImportProductsDialog />
          <AddProductDialog categories={categories} />
        </div>
      </div>

      {/* Bulk Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-slate-900 text-white p-3 px-4 rounded-xl shadow-2xl border border-slate-800">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
                <Box size={18} className="text-emerald-400" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                {Object.keys(rowSelection).length} Units Selected
            </span>
        </div>
        
        <div className="h-6 w-[1px] bg-white/10 hidden sm:block mx-2" />
        
        <div className="flex flex-wrap gap-2">
            <Button 
                variant="destructive" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkDeleting(true)}
                className="font-bold h-9 px-4"
            >
                <Trash className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkAdjustOpen(true)}
                className="font-bold h-9 px-4 bg-emerald-600 hover:bg-emerald-700 border-none text-white shadow-lg shadow-emerald-900/20"
            >
                <Calculator className="w-4 h-4 mr-2" /> Fractional Adjust
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                className="font-bold h-9 px-4 bg-transparent border-slate-700 hover:bg-white/5 text-slate-300"
            >
                <Download className="w-4 h-4 mr-2" /> Export Fiduciary Trace
            </Button>
        </div>

        <div className="ml-auto hidden xl:flex items-center gap-2 opacity-50">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Autonomous Guard Active</span>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-2xl border bg-white shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-100">
        <Table>
          <TableHeader className="bg-slate-50/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-14 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Syncing Ledger...</span>
                    </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"} 
                    className="hover:bg-blue-50/30 transition-all duration-200 h-16 border-b"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                  <TableCell colSpan={columns.length} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20 grayscale">
                        <Zap size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-[0.3em] text-sm">No Transactional Data Discovered</p>
                    </div>
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Fingerprint size={14} className="text-primary" />
            Total Fiduciary Records: {data?.total_count ?? 0}
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-9 font-bold">PREVIOUS</Button>
            <div className="bg-slate-100 px-4 py-1.5 rounded-lg text-xs font-black text-slate-600">
                PAGE {pagination.pageIndex + 1} / {table.getPageCount()}
            </div>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-9 font-bold">NEXT</Button>
        </div>
      </div>

      {/* --- DIALOGS --- */}

      <AlertDialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">Liquidate {Object.keys(rowSelection).length} Product Assets?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                This action initiates a permanent deletion of the selected SKU variants and historical stock movements. This is a terminal operation and cannot be reversed by the kernel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-2xl mt-4">
            <AlertDialogCancel className="font-bold border-none bg-transparent">ABORT</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 font-black px-8 shadow-lg shadow-red-200"
                onClick={() => {
                    const ids = Object.keys(rowSelection).map(Number);
                    bulkDeleteMutation.mutate(ids);
                }}
            >
                {bulkDeleteMutation.isPending ? "DELETING..." : "CONFIRM LIQUIDATION"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight italic uppercase">Purge Product Asset?</AlertDialogTitle>
            <AlertDialogDescription>
                System will permanently remove "{deletingProduct?.name}" from the global registry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">CANCEL</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 font-black"
                onClick={() => deletingProduct && singleDeleteMutation.mutate(deletingProduct.id)}
            >
                {singleDeleteMutation.isPending ? "PURGING..." : "DELETE"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBulkAdjustOpen} onOpenChange={setIsBulkAdjustOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter uppercase italic">
                  <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
                    <Calculator className="w-5 h-5 text-white animate-pulse"/>
                  </div>
                  Fractional Adjust
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500">
                    Execute high-precision stock adjustment for {Object.keys(rowSelection).length} assets.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Quantity Change (0.0001 Accuracy)</Label>
                    <Input 
                        type="number" 
                        step="0.0001" 
                        placeholder="e.g. +10 or -0.5 (Half Pack)" 
                        className="h-12 text-lg font-black bg-slate-50 border-none shadow-inner"
                        value={bulkAdjustValue}
                        onChange={(e) => setBulkAdjustValue(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Forensic Reason for Delta</Label>
                    <Input 
                        placeholder="e.g. Physical Count Correction" 
                        className="h-12 bg-slate-50 border-none shadow-inner text-sm font-medium"
                        value={bulkAdjustReason}
                        onChange={(e) => setBulkAdjustReason(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-2xl mt-4">
                <Button variant="ghost" onClick={() => setIsBulkAdjustOpen(false)} className="font-bold">CANCEL</Button>
                <Button 
                    onClick={handleBulkAdjustSubmit} 
                    disabled={bulkAdjustMutation.isPending}
                    className="bg-slate-900 text-white font-black px-8 h-12 shadow-xl hover:scale-105 transition-all"
                >
                    {bulkAdjustMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    SEAL ADJUSTMENT
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