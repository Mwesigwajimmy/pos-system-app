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

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select";

// Icons
import { 
  Loader2, 
  Download, 
  Trash, 
  Search, 
  Calculator, 
  MapPin, 
  Box, 
  CheckCircle2, 
  Package, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

// Custom Inventory Components
import AddProductDialog from '@/components/inventory/AddProductDialog';
import ImportProductsDialog from '@/components/inventory/ImportProductsDialog';
import EditProductModal from '@/components/inventory/EditProductModal';
import AuditLogDialog from '@/components/inventory/AuditLogDialog';
import CreateAdjustmentForm from '@/components/inventory/CreateAdjustmentForm';

// --- Interfaces ---
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

// --- Data Access Functions ---
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
    p_notes: `Bulk Adjustment: Applied to ${items.length} variants across ${payload.productIds.length} products.`,
    p_items: items
  });

  if (error) throw new Error(error.message);
}

// --- Main Component ---
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
  
  // Modal states
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

  // Load locations
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

  // Main Products Query
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

  // --- Mutations ---
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: () => {
      toast.success("Products deleted successfully");
      setRowSelection({});
      setIsBulkDeleting(false);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  const singleDeleteMutation = useMutation({
    mutationFn: (id: number) => bulkDeleteProducts([id]),
    onSuccess: () => {
      toast.success("Product deleted successfully");
      setDeletingProduct(null);
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const bulkAdjustMutation = useMutation({
    mutationFn: processBulkAdjustment,
    onSuccess: () => {
      toast.success("Stock adjustment applied");
      setRowSelection({});
      setIsBulkAdjustOpen(false);
      setBulkAdjustValue("");
      setBulkAdjustReason("");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // --- Table Setup ---
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

  // --- Handlers ---
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
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataToExport.length} items.`);
  };

  const handleBulkAdjustSubmit = () => {
    const ids = Object.keys(rowSelection).map(Number);
    const val = Number(bulkAdjustValue);
    
    if (ids.length === 0) return;
    if (!bulkAdjustReason.trim()) {
        toast.error("Please provide a reason for adjustment.");
        return;
    }
    if (isNaN(val) || val === 0) {
        toast.error("Please enter a valid quantity.");
        return;
    }
    
    bulkAdjustMutation.mutate({
        reason: bulkAdjustReason,
        productIds: ids,
        quantityChange: val
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Search & Location Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-slate-200 bg-white"
                />
            </div>

            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-white border-slate-200">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        <SelectValue placeholder="Branch" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL_BRANCHES" className="font-semibold">All Branches</SelectItem>
                    {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.is_primary && '(HQ)'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <ImportProductsDialog />
          <AddProductDialog categories={categories} />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-slate-900 text-white p-3 px-5 rounded-xl shadow-lg border-none">
        <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-md">
                <Box size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
                {Object.keys(rowSelection).length} Items Selected
            </span>
        </div>
        
        <div className="h-4 w-[1px] bg-white/20 hidden sm:block mx-2" />
        
        <div className="flex flex-wrap gap-2">
            <Button 
                variant="destructive" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkDeleting(true)}
                className="h-8 px-4 text-xs font-bold"
            >
                <Trash className="w-3.5 h-3.5 mr-2" /> Delete
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkAdjustOpen(true)}
                className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                <Calculator className="w-3.5 h-3.5 mr-2" /> Adjust Stock
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExportCSV}
                className="h-8 px-4 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10"
            >
                <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
            </Button>
        </div>

        <div className="ml-auto hidden xl:flex items-center gap-2 opacity-60">
            <CheckCircle2 size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Secure Sync Active</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
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
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-slate-500">Updating inventory...</span>
                    </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"} 
                    className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-sm text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                  <TableCell colSpan={columns.length} className="h-64 text-center">
                    <div className="flex flex-col items-center text-slate-300">
                        <Package size={48} className="mb-2" />
                        <p className="text-sm font-semibold">No products found</p>
                    </div>
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            Total Items: {data?.total_count ?? 0}
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-9 px-4">
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <div className="bg-slate-100 px-3 py-1.5 rounded-md text-xs font-bold text-slate-600">
                Page {pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-9 px-4">
                Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
      </div>

      {/* --- MODALS & DIALOGS --- */}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
        <AlertDialogContent className="rounded-xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> Delete {Object.keys(rowSelection).length} Products?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 leading-relaxed pt-2">
                This will permanently remove the selected products and their associated variants from your inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="font-semibold border-none">Cancel</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 font-bold px-8"
                onClick={() => {
                    const ids = Object.keys(rowSelection).map(Number);
                    bulkDeleteMutation.mutate(ids);
                }}
            >
                {bulkDeleteMutation.isPending ? "Processing..." : "Delete Products"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
                Are you sure you want to delete "{deletingProduct?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 font-bold"
                onClick={() => deletingProduct && singleDeleteMutation.mutate(deletingProduct.id)}
            >
                {singleDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Stock Adjustment */}
      <Dialog open={isBulkAdjustOpen} onOpenChange={setIsBulkAdjustOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-8">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Calculator className="w-5 h-5 text-emerald-600"/>
                  </div>
                  Adjust Stock Levels
                </DialogTitle>
                <DialogDescription className="text-slate-500 pt-1">
                    Apply adjustment to {Object.keys(rowSelection).length} items.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase">Quantity Change</Label>
                    <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="e.g. +10 or -5" 
                        className="h-11 font-semibold bg-slate-50 border-slate-200"
                        value={bulkAdjustValue}
                        onChange={(e) => setBulkAdjustValue(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600 uppercase">Reason</Label>
                    <Input 
                        placeholder="e.g. Stock Count Correction" 
                        className="h-11 bg-slate-50 border-slate-200 text-sm"
                        value={bulkAdjustReason}
                        onChange={(e) => setBulkAdjustReason(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={() => setIsBulkAdjustOpen(false)} className="font-semibold">Cancel</Button>
                <Button 
                    onClick={handleBulkAdjustSubmit} 
                    disabled={bulkAdjustMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 h-11"
                >
                    {bulkAdjustMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Confirm Adjustment
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-modals for Edit/Audit/Adjust */}
      <EditProductModal product={editingProduct} isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} categories={categories} />
      <AuditLogDialog product={auditingProduct} isOpen={!!auditingProduct} onClose={() => setAuditingProduct(null)} />
      <CreateAdjustmentForm product={adjustingProduct} isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} categories={categories} />
    </div>
  );
}