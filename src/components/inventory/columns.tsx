"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash2, AlertCircle, Layers, Package, Tag, ClipboardList, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; // <--- NEW: Required for Selection
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ProductRow } from "@/types/dashboard";

// Advanced TanStack Table meta for enterprise actions
declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    onEdit: (product: TData) => void;
    onDelete: (product: TData) => void;
    onAudit: (product: TData) => void;
    onAdjust: (product: TData) => void;
    userRole?: string;
    businessEntityId?: string;
  }
}

// Helper for low-stock/expiry indicators
const getStockStatus = (product: ProductRow) => {
  if (product.total_stock < 5) return { warning: true, message: "Low Stock: Only " + product.total_stock + " units left." };
  // Add more advanced logic if expiry, lot, etc.
  return { warning: false, message: "" };
};

export const columns: ColumnDef<ProductRow>[] = [
  // --- 1. ENTERPRISE SELECTION COLUMN (New) ---
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40, 
  },
  // --------------------------------------------
  {
    accessorKey: "name",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" /> Product Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-semibold">{row.original.name}</div>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },
  {
    accessorKey: "category_name",
    header: () => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" /> Category
      </div>
    ),
    cell: ({ row }) => (
      row.original.category_name ? (
        <span className="px-2 py-1 rounded bg-muted">{row.original.category_name}</span>
      ) : <span className="italic text-muted-foreground">Uncategorized</span>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },
  {
    accessorKey: "total_stock",
    header: () => (
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-yellow-700" /> Stock
      </div>
    ),
    cell: ({ row }) => {
      const status = getStockStatus(row.original);
      return (
        <div className="flex items-center gap-2">
          <span>{row.original.total_stock}</span>
          {/* 
             Enterprise Logic: Visual Indicator for Low Stock
          */}
          {status.warning && (
            <span title={status.message}>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </span>
          )}
        </div>
      );
    },
    enableSorting: true,
    enableGlobalFilter: false,
  },
  {
    accessorKey: "variants_count",
    header: () => (
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-600" /> Variants
      </div>
    ),
    cell: ({ row }) => (
      <span className="font-mono">{row.original.variants_count}</span>
    ),
    enableSorting: true,
    enableGlobalFilter: false,
  },
  {
    id: "entity",
    header: () => (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-green-700" /> Branch/Entity
      </div>
    ),
    cell: ({ row }) => (
      // Enterprise: Shows which branch owns this item
      <span className="text-xs text-muted-foreground">{row.original.business_entity_name || "Main"}</span>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => {
      const product = row.original;
      // Enterprise: Role-Based Access Control (RBAC) Check
      const isManager = table.options.meta?.userRole === "manager" || table.options.meta?.userRole === "admin";
      
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => table.options.meta?.onEdit(product)}
                disabled={!isManager}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => table.options.meta?.onAdjust(product)}
                disabled={!isManager}
              >
                <ClipboardList className="mr-2 h-4 w-4" /> Stock Adjustment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => table.options.meta?.onDelete(product)}
                disabled={!isManager}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => table.options.meta?.onAudit(product)}
              >
                <AlertCircle className="mr-2 h-4 w-4" /> View Audit Log
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableGlobalFilter: false,
  },
];