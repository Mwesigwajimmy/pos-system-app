"use client"

import { ColumnDef } from "@tanstack/react-table"
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Layers, 
  Package, 
  Tag, 
  ClipboardList, 
  Building2,
  Fingerprint, // UPGRADE: Global Tax Icon
  Calculator,  // UPGRADE: Fractional Logic Icon
  ShieldCheck  // UPGRADE: Forensic Seal Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge"; // UPGRADE: Required for new labels
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
  // UPGRADE: Precision checking for fractional stock (e.g., 0.5 tablets vs 5 full boxes)
  const stock = Number(product.total_stock || 0);
  if (stock <= 0) return { warning: true, message: "Out of Stock: Critical Replenishment Required.", color: "text-red-600" };
  if (stock < 5) return { warning: true, message: "Low Stock: Only " + stock + " remaining.", color: "text-amber-500" };
  return { warning: false, message: "" };
};

export const columns: ColumnDef<ProductRow>[] = [
  // --- 1. ENTERPRISE SELECTION COLUMN ---
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
  
  {
    accessorKey: "name",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" /> Product Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="font-semibold">{row.original.name}</div>
        {/* UPGRADE: Forensic Integrity Seal badge for verified high-volume items */}
        {row.original.total_stock > 100 && (
          <ShieldCheck className="h-3 w-3 text-blue-500" title="High-Volume Sovereign Certified" />
        )}
      </div>
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
        <span className="px-2 py-1 rounded bg-muted text-xs font-medium">{row.original.category_name}</span>
      ) : <span className="italic text-muted-foreground text-xs">Uncategorized</span>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },

  // --- UPGRADE: GLOBAL TAX CATEGORY COLUMN ---
  {
    id: "tax_logic",
    header: () => (
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-blue-500" /> Tax Link
      </div>
    ),
    cell: ({ row }) => {
      // Cast to any to access the new 'tax_category_code' from the upgraded schema
      const rawRow = row.original as any;
      return (
        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-slate-50">
          {rawRow.tax_category_code || 'STANDARD'}
        </Badge>
      );
    },
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
      const stockValue = Number(row.original.total_stock);
      
      return (
        <div className="flex items-center gap-2">
          {/* UPGRADE: Supports Decimal display for fractional stock items */}
          <span className={`font-mono font-bold ${status.warning ? status.color : ""}`}>
            {stockValue % 1 === 0 ? stockValue : stockValue.toFixed(2)}
          </span>
          {status.warning && (
            <span title={status.message}>
              <AlertCircle className={`h-4 w-4 ${status.color}`} />
            </span>
          )}
        </div>
      );
    },
    enableSorting: true,
    enableGlobalFilter: false,
  },

  // --- UPGRADE: FRACTIONAL UNITS/PACK COLUMN ---
  {
    id: "packet_logic",
    header: () => (
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-slate-500" /> Units/Pack
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      const uPack = rawRow.units_per_pack || 1;
      return (
        <span className="text-xs font-mono text-slate-500">
          {uPack > 1 ? `1:${uPack}` : 'Whole'}
        </span>
      );
    },
  },

  {
    accessorKey: "variants_count",
    header: () => (
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-600" /> Variants
      </div>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.variants_count}</span>
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
      <span className="text-[10px] uppercase font-bold text-muted-foreground">
        {row.original.business_entity_name || "Main"}
      </span>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => {
      const product = row.original;
      // UPGRADE: Added 'architect' to the RBAC check
      const isManager = 
        table.options.meta?.userRole === "manager" || 
        table.options.meta?.userRole === "admin" || 
        table.options.meta?.userRole === "architect";
      
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Autonomous Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => table.options.meta?.onEdit(product)}
                disabled={!isManager}
              >
                <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => table.options.meta?.onAdjust(product)}
                disabled={!isManager}
              >
                <ClipboardList className="mr-2 h-4 w-4 text-orange-500" /> Stock Adjustment
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
                <AlertCircle className="mr-2 h-4 w-4 text-slate-400" /> View Audit Log
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