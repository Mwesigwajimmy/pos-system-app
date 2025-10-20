// ./src/components/inventory/InventoryDataTable.tsx

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
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Category, ProductRow } from '@/types/dashboard';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import AddProductDialog from '@/components/inventory/AddProductDialog';
import ImportProductsDialog from '@/components/inventory/ImportProductsDialog';
import EditProductModal from '@/components/inventory/EditProductModal';

import AuditLogDialog from '@/components/inventory/AuditLogDialog';
import CreateAdjustmentForm from '@/components/inventory/CreateAdjustmentForm';

interface DataTableProps {
  columns: ColumnDef<ProductRow>[];
  initialData: ProductRow[];
  totalCount: number;
  categories: Category[];
  userRole?: string;
  businessEntityId?: string;
}

async function fetchProducts(pagination: PaginationState, searchTerm: string, businessEntityId?: string): Promise<{ products: ProductRow[], total_count: number }> {
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

async function deleteProduct(productId: number) {
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_product', { p_product_id: productId });
  if (error) throw new Error(error.message);
}

export default function InventoryDataTable({
  columns,
  initialData,
  totalCount,
  categories,
  userRole = "manager",
  businessEntityId,
}: DataTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const [auditingProduct, setAuditingProduct] = useState<ProductRow | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventoryProducts', pagination, debouncedSearchTerm, businessEntityId],
    queryFn: () => fetchProducts(pagination, debouncedSearchTerm, businessEntityId),
    initialData: { products: initialData, total_count: totalCount },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Product deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
    },
    onError: (err) => toast.error(`Deletion failed: ${err.message}`),
  });

  const table = useReactTable({
    data: (data?.products as ProductRow[]) ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total_count ?? 0) / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
    meta: {
      onEdit: (product: ProductRow) => setEditingProduct(product),
      onDelete: (product: ProductRow) => setDeletingProduct(product),
      onAudit: (product: ProductRow) => setAuditingProduct(product),
      onAdjust: (product: ProductRow) => setAdjustingProduct(product),
      userRole,
      businessEntityId,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Input
          placeholder="Search products by name or SKU, filter by category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm w-full"
        />
        <div className="flex gap-2 self-end sm:self-auto">
          <ImportProductsDialog />
          <AddProductDialog categories={categories} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled>
          Bulk Delete <span className="ml-1 text-xs">(Select rows)</span>
        </Button>
        <Button variant="outline" size="sm" disabled>
          Export CSV
        </Button>
        <Button variant="outline" size="sm" disabled>
          Bulk Adjust Stock
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
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
            {isLoading && !data?.products.length ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : isError ? (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-red-500">Error: {error.message}</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No products found. Add your first product to get started.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total Products: {data?.total_count ?? 0}</div>
        <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Page {pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      <EditProductModal
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        categories={categories}
      />

      <AuditLogDialog
        product={auditingProduct}
        isOpen={!!auditingProduct}
        onClose={() => setAuditingProduct(null)}
      />

      <CreateAdjustmentForm
        product={adjustingProduct}
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        categories={categories}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product "{deletingProduct?.name}". This action cannot be undone and will be logged for compliance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingProduct) {
                  deleteMutation.mutate(deletingProduct.id);
                }
              }}
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}