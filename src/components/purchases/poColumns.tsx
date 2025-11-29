"use client"

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, ArrowUpDown, Eye, CheckCircle, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Matches DB View structure
export type PurchaseOrderRow = {
  id: number;
  status: 'Draft' | 'Ordered' | 'Partially Received' | 'Received' | 'Billed' | 'Cancelled';
  supplier_name: string | null;
  order_date: string | null;
  total_cost: number | null;
  currency_code: string; 
  total_cost_ugx: number; 
};

// Safe currency formatter
const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency || 'USD' 
    }).format(amount);
}

const statusStyles: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-800 border-slate-200",
    Ordered: "bg-blue-100 text-blue-800 border-blue-200",
    "Partially Received": "bg-amber-100 text-amber-800 border-amber-200",
    Received: "bg-green-100 text-green-800 border-green-200",
    Billed: "bg-purple-100 text-purple-800 border-purple-200",
    Cancelled: "bg-red-100 text-red-800 border-red-200",
};

export const poColumns: ColumnDef<PurchaseOrderRow>[] = [
  { 
    accessorKey: "id", 
    header: "PO #", 
    cell: ({ row }) => <span className="font-mono font-medium">#{row.original.id}</span> 
  },
  { 
    accessorKey: "status", 
    header: "Status", 
    cell: ({ row }) => {
        const status = row.original.status;
        return ( 
            <Badge variant="outline" className={cn("font-medium capitalize shadow-sm", statusStyles[status] || statusStyles['Draft'])}> 
                {status} 
            </Badge> 
        ) 
    } 
  },
  { 
    accessorKey: "supplier_name", 
    header: "Supplier",
    cell: ({ row }) => <span className="font-semibold text-slate-700">{row.original.supplier_name || 'N/A'}</span>
  },
  {
    accessorKey: "order_date",
    header: ({ column }) => (
      <Button variant="ghost" className="text-xs font-semibold uppercase" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Date <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => row.original.order_date ? format(new Date(row.original.order_date), "MMM dd, yyyy") : "-",
  },
  {
    accessorKey: "total_cost", 
    header: ({ column }) => (
      <div className="text-right">
        <Button variant="ghost" className="text-xs font-semibold uppercase" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Total <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const { total_cost, currency_code } = row.original;
      return (
        <div className="text-right font-mono font-medium">
          {formatMoney(total_cost || 0, currency_code)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const po = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => window.location.href = `/purchases/${po.id}`}>
                <Eye className="mr-2 h-4 w-4"/> View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {po.status === 'Draft' && ( 
                  <DropdownMenuItem className="text-blue-600">
                      <CheckCircle className="mr-2 h-4 w-4"/> Confirm Order
                  </DropdownMenuItem> 
              )}
              {['Ordered', 'Partially Received'].includes(po.status) && ( 
                  <DropdownMenuItem className="text-green-600">
                      <Truck className="mr-2 h-4 w-4"/> Receive Stock
                  </DropdownMenuItem> 
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];