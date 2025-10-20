"use client"

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * UPDATED: Data structure now includes currency and converted UGX total.
 * These fields must be returned by your backend RPC 'get_paginated_purchase_orders'.
 */
export type PurchaseOrderRow = {
  id: number;
  status: 'Draft' | 'Ordered' | 'Partially Received' | 'Received' | 'Billed' | 'Cancelled';
  supplier_name: string | null;
  order_date: string | null;
  total_cost: number | null;
  currency_code: string; // e.g., 'USD', 'KES', 'UGX'
  total_cost_ugx: number; // The calculated value in the base currency
};

/**
 * A reusable helper to format a number into a currency string with a code.
 * @param value The number to format.
 * @param currencyCode The currency code (e.g., 'USD').
 * @returns A formatted currency string, e.g., "$1,234.56 USD".
 */
const formatCurrency = (value: number, currencyCode: string) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value);
    } catch (e) {
        // Fallback for unrecognized currency codes
        return `${currencyCode} ${new Intl.NumberFormat('en-US').format(value)}`;
    }
};

const statusStyles: Record<PurchaseOrderRow['status'], string> = {
    Draft: "border-transparent bg-gray-200 text-gray-800 hover:bg-gray-200",
    Ordered: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
    "Partially Received": "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    Received: "border-transparent bg-green-100 text-green-800 hover:bg-green-100",
    Billed: "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-100",
    Cancelled: "border-transparent bg-red-100 text-red-800 hover:bg-red-100",
};

export const poColumns: ColumnDef<PurchaseOrderRow>[] = [
  { accessorKey: "id", header: "PO Number", cell: ({ row }) => `#${row.original.id}` },
  { accessorKey: "status", header: "Status", cell: ({ row }) => ( <Badge className={cn("capitalize", statusStyles[row.original.status])}> {row.original.status} </Badge> ) },
  { accessorKey: "supplier_name", header: "Supplier" },
  {
    accessorKey: "order_date",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Order Date <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.order_date ? format(new Date(row.original.order_date), "dd MMM, yyyy") : "N/A",
  },
  {
    accessorKey: "total_cost_ugx", // Sort by the base currency value for consistency
    header: ({ column }) => (
      <div className="text-right">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Total Cost <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const { total_cost, currency_code, total_cost_ugx } = row.original;
      const isForeignCurrency = currency_code !== 'UGX';

      return (
        <div className="text-right font-medium">
          {/* Always show the transaction amount */}
          <span>{formatCurrency(total_cost || 0, currency_code)}</span>
          {/* If it's a foreign currency, also show the UGX equivalent underneath */}
          {isForeignCurrency && (
            <p className="text-xs text-muted-foreground mt-1">
              (UGX {new Intl.NumberFormat('en-US').format(total_cost_ugx || 0)})
            </p>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const po = row.original;
      return (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => window.location.href = `/purchases/${po.id}`}>View Details</DropdownMenuItem>
              {po.status === 'Draft' && ( <DropdownMenuItem>Mark as Ordered</DropdownMenuItem> )}
              {(po.status === 'Ordered' || po.status === 'Partially Received') && ( <DropdownMenuItem>Receive Stock</DropdownMenuItem> )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];