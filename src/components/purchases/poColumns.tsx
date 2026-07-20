"use client"

/**
 * --- BBU1 PURCHASE ORDER COLUMN DEFINITIONS ---
 * VERSION: v6.3 OMEGA (ROUTING WELDED)
 * Use: Master schema for procurement registry interaction.
 * Logic: Linked to dynamic [poId] routes with full locale support.
 */

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, ArrowUpDown, Eye, CheckCircle, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";

export type PurchaseOrderRow = {
  id: number;
  status: 'Draft' | 'Ordered' | 'Partially Received' | 'Received' | 'Billed' | 'Cancelled';
  supplier_name: string | null;
  order_date: string | null;
  total_cost: number | null;
  currency_code: string; 
  total_cost_ugx: number; 
};

const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency || 'UGX' 
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
  },
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
      
      // --- WELDING: IDENTITY & ROUTER HOOKS ---
      const params = useParams();
      const router = useRouter();
      const locale = params.locale as string;

      const handleNavigation = () => {
        // Correcting the path to include locale and target the poId
        router.push(`/${locale}/purchases/${po.id}`);
      };

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
              
              {/* WELDED: FIXED NAVIGATION LINK */}
              <DropdownMenuItem onClick={handleNavigation} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4 text-blue-600"/> View Details
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {po.status === 'Draft' && ( 
                  <DropdownMenuItem className="text-blue-600 cursor-pointer">
                      <CheckCircle className="mr-2 h-4 w-4"/> Confirm Order
                  </DropdownMenuItem> 
              )}
              
              {/* WELDED: REDIRECTS TO DETAIL VIEW TO FINALIZE RECEIPT */}
              {['Ordered', 'Partially Received'].includes(po.status) && ( 
                  <DropdownMenuItem onClick={handleNavigation} className="text-green-600 font-bold cursor-pointer">
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