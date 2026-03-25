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
  Barcode,
  DollarSign
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

// Advanced Table Meta
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

// Simple stock status helper
const getStockStatus = (product: ProductRow) => {
  const stock = Number(product.total_stock || 0);
  if (stock <= 0) return { warning: true, message: "Out of stock", color: "text-red-600" };
  if (stock < 5) return { warning: true, message: "Low stock: " + stock, color: "text-amber-500" };
  return { warning: false, message: "" };
};

export const columns: ColumnDef<ProductRow>[] = [
  // 1. SELECTION
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40, 
  },
  
  // 2. SKU
  {
    accessorKey: "sku",
    header: () => (
      <div className="flex items-center gap-2 text-slate-500">
        <Barcode className="h-4 w-4" /> SKU
      </div>
    ),
    cell: ({ row }) => (
      <code className="text-[11px] font-medium font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
        {row.original.sku || 'N/A'}
      </code>
    ),
  },

  // 3. PRODUCT NAME
  {
    accessorKey: "name",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-blue-600" /> Product Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-semibold text-slate-900">{row.original.name}</div>
    ),
    enableSorting: true,
  },

  // 4. PRICE
  {
    accessorKey: "price",
    header: () => (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-slate-400" /> Price
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-slate-700">
        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(row.original.price || 0)}
      </div>
    ),
  },

  // 5. CATEGORY
  {
    accessorKey: "category_name",
    header: () => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-slate-400" /> Category
      </div>
    ),
    cell: ({ row }) => (
      row.original.category_name ? (
        <Badge variant="secondary" className="font-semibold text-slate-600">
          {row.original.category_name}
        </Badge>
      ) : <span className="text-slate-400 text-xs">Unassigned</span>
    ),
  },

  // 6. TAX
  {
    id: "tax_category",
    header: () => (
      <div className="flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-slate-400" /> Tax Category
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      return (
        <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-600 bg-white">
          {rawRow.tax_category_code || 'STANDARD'}
        </Badge>
      );
    },
  },

  // 7. STOCK
  {
    accessorKey: "total_stock",
    header: () => (
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-slate-400" /> Stock Level
      </div>
    ),
    cell: ({ row }) => {
      const status = getStockStatus(row.original);
      const stockValue = Number(row.original.total_stock);
      
      return (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${status.warning ? status.color : "text-slate-900"}`}>
            {stockValue % 1 === 0 ? stockValue : stockValue.toFixed(2)}
          </span>
          {status.warning && <AlertCircle className={`h-4 w-4 ${status.color}`} />}
        </div>
      );
    },
  },

  // 8. PACKAGING
  {
    id: "packaging",
    header: () => (
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-slate-400" /> Packaging
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      const uPack = rawRow.units_per_pack || 1;
      return (
        <span className="text-xs font-medium text-slate-500">
          {uPack > 1 ? `${uPack} units/pack` : 'Single unit'}
        </span>
      );
    },
  },

  // 9. VARIANTS
  {
    accessorKey: "variants_count",
    header: () => (
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-slate-400" /> Variants
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-medium text-slate-600">{row.original.variants_count}</span>
    ),
  },

  // 10. BRANCH
  {
    id: "branch",
    header: () => (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-slate-400" /> Branch
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-slate-500">
        {row.original.business_entity_name || "Main Branch"}
      </span>
    ),
  },

  // 11. ACTIONS
  {
    id: "actions",
    cell: ({ row, table }) => {
      const product = row.original;
      // Fixed Authorization: Managers can now interact
      const isAuthorized = 
        table.options.meta?.userRole === "owner" || 
        table.options.meta?.userRole === "admin" || 
        table.options.meta?.userRole === "manager";
      
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] p-2 rounded-lg shadow-xl border-slate-200">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1.5">Actions</DropdownMenuLabel>
              <DropdownMenuItem
                className="rounded-md font-semibold cursor-pointer"
                onClick={() => table.options.meta?.onEdit(product)}
                disabled={!isAuthorized}
              >
                <Edit className="mr-2 h-4 w-4 text-blue-600" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-md font-semibold cursor-pointer"
                onClick={() => table.options.meta?.onAdjust(product)}
                disabled={!isAuthorized}
              >
                <Calculator className="mr-2 h-4 w-4 text-emerald-600" /> Adjust Stock
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md font-semibold text-red-600 cursor-pointer focus:bg-red-50"
                onClick={() => table.options.meta?.onDelete(product)}
                disabled={!isAuthorized}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md font-semibold text-slate-600 cursor-pointer"
                onClick={() => table.options.meta?.onAudit(product)}
              >
                <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" /> View Audit Logs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];