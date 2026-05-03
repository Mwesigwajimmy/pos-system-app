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
  DollarSign,
  MapPin
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
    size: 50, 
  },
  
  // 2. SKU - Added fixed width to prevent cutting off
  {
    accessorKey: "sku",
    header: () => (
      <div className="flex items-center gap-2 text-slate-500 whitespace-nowrap">
        <Barcode className="h-4 w-4" /> SKU
      </div>
    ),
    cell: ({ row }) => (
      <div className="min-w-[120px]">
        <code className="text-[11px] font-medium font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
          {row.original.sku || 'N/A'}
        </code>
      </div>
    ),
    size: 140,
  },

  // 3. PRODUCT NAME - Added min-width for long titles
  {
    accessorKey: "name",
    header: ({ column }) => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Package className="h-4 w-4 text-blue-600" /> Product Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-semibold text-slate-900 min-w-[200px] max-w-[400px] truncate">
        {row.original.name}
      </div>
    ),
    enableSorting: true,
    size: 250,
  },

  // NEW: LOCATION COLUMN
  // This allows users to differentiate products if they have same business in different branches
  {
    id: "location",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap text-blue-600">
        <MapPin className="h-4 w-4" /> Location
      </div>
    ),
    cell: ({ row }) => {
        const locationName = (row.original as any).location_name || row.original.business_entity_name || "Main Branch";
        return (
            <div className="flex items-center gap-2 min-w-[150px]">
                <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 font-bold text-[10px] uppercase tracking-tighter whitespace-nowrap">
                    {locationName}
                </Badge>
            </div>
        );
    },
    size: 180,
  },

  // 4. PRICE
  {
    accessorKey: "price",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <DollarSign className="h-4 w-4 text-slate-400" /> Price
      </div>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-slate-700 whitespace-nowrap">
        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(row.original.price || 0)}
      </div>
    ),
    size: 130,
  },

  // 5. CATEGORY
  {
    accessorKey: "category_name",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Tag className="h-4 w-4 text-slate-400" /> Category
      </div>
    ),
    cell: ({ row }) => (
      <div className="min-w-[120px]">
        {row.original.category_name ? (
          <Badge variant="secondary" className="font-semibold text-slate-600 whitespace-nowrap">
            {row.original.category_name}
          </Badge>
        ) : <span className="text-slate-400 text-xs">Unassigned</span>}
      </div>
    ),
    size: 150,
  },

  // 6. TAX
  {
    id: "tax_category",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Fingerprint className="h-4 w-4 text-slate-400" /> Tax Category
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      return (
        <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-600 bg-white whitespace-nowrap">
          {rawRow.tax_category_code || 'STANDARD'}
        </Badge>
      );
    },
    size: 140,
  },

  // 7. STOCK
  {
    accessorKey: "total_stock",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <ClipboardList className="h-4 w-4 text-slate-400" /> Stock Level
      </div>
    ),
    cell: ({ row }) => {
      const status = getStockStatus(row.original);
      const stockValue = Number(row.original.total_stock);
      
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={`font-semibold ${status.warning ? status.color : "text-slate-900"}`}>
            {stockValue % 1 === 0 ? stockValue : stockValue.toFixed(2)}
          </span>
          {status.warning && <AlertCircle className={`h-4 w-4 ${status.color}`} />}
        </div>
      );
    },
    size: 130,
  },

  // 8. PACKAGING
  {
    id: "packaging",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Calculator className="h-4 w-4 text-slate-400" /> Packaging
      </div>
    ),
    cell: ({ row }) => {
      const rawRow = row.original as any;
      const uPack = rawRow.units_per_pack || 1;
      return (
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          {uPack > 1 ? `${uPack} units/pack` : 'Single unit'}
        </span>
      );
    },
    size: 150,
  },

  // 9. VARIANTS
  {
    accessorKey: "variants_count",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Layers className="h-4 w-4 text-slate-400" /> Variants
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-medium text-slate-600 px-2">{row.original.variants_count}</span>
    ),
    size: 100,
  },

  // 10. BRANCH (Existing Column - can stay or be redundant now)
  {
    id: "branch",
    header: () => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Building2 className="h-4 w-4 text-slate-400" /> Entity
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
        {row.original.business_entity_name || "Main Branch"}
      </span>
    ),
    size: 180,
  },

  // 11. ACTIONS
  {
    id: "actions",
    cell: ({ row, table }) => {
      const product = row.original;
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
    size: 60,
  },
];