'use client';

import React, { useState } from 'react';
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
import { Loader2, Download, Trash, BarChart } from 'lucide-react';

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

// --- DATA ACCESS LAYER ---

async function fetchProducts(pagination: PaginationState, searchTerm: string, businessEntityId?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_paginated_products', {
    p_page: pagination.pageIndex + 1,
    p_page_size: pagination.pageSize,
    p_search_text: searchTerm || null,
    p_business_entity_id: businessEntityId || null,
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

  const { data, isLoading } = useQuery({
    queryKey: ['inventoryProducts', pagination, debouncedSearchTerm, businessEntityId],
    queryFn: () => fetchProducts(pagination, debouncedSearchTerm, businessEntityId),
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

    const headers = ["ID", "Name", "SKU", "Total Stock", "Category", "Variants Count", "Entity"];
    const csvContent = [
      headers.join(","),
      // FIX: Cast row to 'any' to bypass missing SKU definition in ProductRow type
      ...dataToExport.map((row: any) => {
          const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
          return [
              row.id, 
              escape(row.name), 
              escape(row.sku), // This will now work
              row.total_stock, 
              escape(row.category_name),
              row.variants_count,
              escape(row.business_entity_name)
          ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataToExport.length} rows to CSV.`);
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
    <div className="space-y-4">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Input
          placeholder="Search products by name, SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm w-full"
        />
        <div className="flex gap-2 self-end sm:self-auto">
          <ImportProductsDialog />
          <AddProductDialog categories={categories} />
        </div>
      </div>

      {/* Bulk Toolbar */}
      <div className="flex gap-2 items-center bg-muted/40 p-2 rounded-md border shadow-sm h-12">
        <span className="text-sm font-medium text-muted-foreground ml-2 min-w-[100px]">
            {Object.keys(rowSelection).length} selected
        </span>
        <div className="h-4 w-[1px] bg-border mx-2" />
        
        <div className="flex gap-2">
            <Button 
                variant="destructive" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkDeleting(true)}
            >
            <Trash className="w-4 h-4 mr-2" /> Bulk Delete
            </Button>
            <Button 
                variant="secondary" 
                size="sm" 
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => setIsBulkAdjustOpen(true)}
            >
            <BarChart className="w-4 h-4 mr-2" /> Bulk Adjust
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
            >
            <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading inventory...</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">No products found matching your criteria.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">Total Records: {data?.total_count ?? 0}</div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <span className="text-sm px-2">Page {pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      {/* --- DIALOGS --- */}

      <AlertDialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {Object.keys(rowSelection).length} Products?</AlertDialogTitle>
            <AlertDialogDescription>
                Are you sure you want to delete these products? This action will remove all associated variants and stock history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                    const ids = Object.keys(rowSelection).map(Number);
                    bulkDeleteMutation.mutate(ids);
                }}
            >
                {bulkDeleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently remove "{deletingProduct?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => deletingProduct && singleDeleteMutation.mutate(deletingProduct.id)}
            >
                {singleDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBulkAdjustOpen} onOpenChange={setIsBulkAdjustOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Bulk Adjust Stock</DialogTitle>
                <DialogDescription>
                    Apply a quick stock adjustment to the {Object.keys(rowSelection).length} selected products. 
                    <br/><span className="text-xs text-muted-foreground font-medium mt-1 block">Note: This will update ALL variants associated with selected products.</span>
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="adj-val" className="text-right">Change</Label>
                    <Input 
                        id="adj-val" 
                        type="number" 
                        placeholder="+10 or -5" 
                        className="col-span-3"
                        value={bulkAdjustValue}
                        onChange={(e) => setBulkAdjustValue(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="adj-reason" className="text-right">Reason</Label>
                    <Input 
                        id="adj-reason" 
                        placeholder="e.g. Received Shipment" 
                        className="col-span-3"
                        value={bulkAdjustReason}
                        onChange={(e) => setBulkAdjustReason(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkAdjustOpen(false)}>Cancel</Button>
                <Button onClick={handleBulkAdjustSubmit} disabled={bulkAdjustMutation.isPending}>
                    {bulkAdjustMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Apply Adjustment
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Components */}
      <EditProductModal product={editingProduct} isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} categories={categories} />
      <AuditLogDialog product={auditingProduct} isOpen={!!auditingProduct} onClose={() => setAuditingProduct(null)} />
      <CreateAdjustmentForm product={adjustingProduct} isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} categories={categories} />
    </div>
  );
}