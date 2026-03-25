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
  Fingerprint, 
  Calculator,  
  ShieldCheck,
  Barcode,    // UPGRADE: Added for SKU visibility
  DollarSign  // UPGRADE: Added for Valuation visibility
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
import { Badge } from "@/components/ui/badge"; 
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
  // GRASSROOT ALIGNMENT: Precision checking matched to DB Kernel v10
  const stock = Number(product.total_stock || 0);
  if (stock <= 0) return { warning: true, message: "Out of Stock: Critical Replenishment Required.", color: "text-red-600" };
  if (stock < 5) return { warning: true, message: "Low Stock: Only " + stock + " remaining.", color: "text-amber-500" };
  return { warning: false, message: "" };
};

export const columns: ColumnDef<ProductRow>[] = [
  // --- 1. SELECTION COLUMN ---
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
  
  // --- 2. SKU / BARCODE (UPGRADE: Mandatory for Enterprise) ---
  {
    accessorKey: "sku",
    header: () => (
      <div className="flex items-center gap-2">
        <Barcode className="h-4 w-4 text-slate-400" /> SKU
      </div>
    ),
    cell: ({ row }) => (
      <code className="text-[10px] font-black font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
        {row.original.sku || 'NO-SKU'}
      </code>
    ),
  },

  {
    accessorKey: "name",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" /> Product Asset
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="font-bold text-slate-900">{row.original.name}</div>
        {row.original.total_stock > 100 && (
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600 animate-pulse" title="Sovereign Certified High-Volume" />
        )}
      </div>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },

  // --- 3. VALUATION (UPGRADE: Mandatory for Fiduciary Accuracy) ---
  {
    accessorKey: "price",
    header: () => (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-emerald-600" /> Price
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-mono font-black text-xs text-slate-700">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(row.original.price || 0)}
      </div>
    ),
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
        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter">
          {row.original.category_name}
        </Badge>
      ) : <span className="italic text-muted-foreground text-[10px]">Unassigned</span>
    ),
    enableSorting: true,
    enableGlobalFilter: true,
  },

  {
    id: "tax_logic",
    header: () => (
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-blue-500" /> Tax DNA
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      return (
        <Badge variant="outline" className="text-[9px] font-black font-mono uppercase bg-slate-50 border-blue-100 text-blue-700">
          {rawRow.tax_category_code || 'STANDARD'}
        </Badge>
      );
    },
  },

  {
    accessorKey: "total_stock",
    header: () => (
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-yellow-700" /> Ledger Stock
      </div>
    ),
    cell: ({ row }) => {
      const status = getStockStatus(row.original);
      const stockValue = Number(row.original.total_stock);
      
      return (
        <div className="flex items-center gap-2">
          {/* GRASSROOT FIX: Precision matched to Database rounding logic (4 decimal places) */}
          <span className={`font-mono font-black text-sm ${status.warning ? status.color : "text-slate-900"}`}>
            {stockValue % 1 === 0 ? stockValue : stockValue.toFixed(4)}
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

  {
    id: "packet_logic",
    header: () => (
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-slate-500" /> Robotic Pack
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      const uPack = rawRow.units_per_pack || 1;
      return (
        <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-tighter">
          {uPack > 1 ? `Ratio 1:${uPack}` : 'Whole Unit'}
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
      <span className="font-mono text-xs font-bold text-slate-600">{row.original.variants_count}</span>
    ),
    enableSorting: true,
    enableGlobalFilter: false,
  },
  {
    id: "entity",
    header: () => (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-green-700" /> Jurisdictional Branch
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">
        {row.original.business_entity_name || "CENTRAL HQ"}
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
      // UPGRADE: Corrected RBAC logic to include 'owner' and 'architect' for high-authority actions
      const isAuthorized = 
        table.options.meta?.userRole === "owner" || 
        table.options.meta?.userRole === "admin" || 
        table.options.meta?.userRole === "architect";
      
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full" aria-label="Open menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] rounded-xl shadow-2xl border-none p-2">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 pb-2">Autonomous Controls</DropdownMenuLabel>
              <DropdownMenuItem
                className="rounded-lg font-bold"
                onClick={() => table.options.meta?.onEdit(product)}
                disabled={!isAuthorized}
              >
                <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Metadata
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg font-bold"
                onClick={() => table.options.meta?.onAdjust(product)}
                disabled={!isAuthorized}
              >
                <Calculator className="mr-2 h-4 w-4 text-emerald-500" /> Ledger Adjustment
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                className="rounded-lg font-bold text-destructive focus:text-destructive focus:bg-red-50"
                onClick={() => table.options.meta?.onDelete(product)}
                disabled={!isAuthorized}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Purge Asset
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                className="rounded-lg font-bold text-slate-600"
                onClick={() => table.options.meta?.onAudit(product)}
              >
                <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" /> Forensic Audit
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