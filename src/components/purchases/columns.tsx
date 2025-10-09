"use client"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export type PurchaseOrderRow = {
  id: number;
  status: string;
  supplier_name: string | null;
  order_date: string | null;
  total_cost: number | null;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export const columns: ColumnDef<PurchaseOrderRow>[] = [
  { 
    accessorKey: "id",
    header: "PO Number",
    cell: ({ row }) => `#${row.original.id}`
  },
  { 
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge className="capitalize">{row.original.status}</Badge>
  },
  { accessorKey: "supplier_name", header: "Supplier" },
  { 
    accessorKey: "order_date", 
    header: "Order Date",
    cell: ({ row }) => row.original.order_date ? format(new Date(row.original.order_date), "dd MMM, yyyy") : "N/A"
  },
  { 
    accessorKey: "total_cost", 
    header: "Total Cost",
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.total_cost || 0)}</div>
  },
]