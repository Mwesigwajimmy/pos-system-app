"use client"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

export type SalesHistoryRow = {
  id: number;
  created_at: string;
  customer_name: string | null;
  employee_name: string | null;
  payment_method: string;
  total_amount: number;
  item_count: number;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export const columns: ColumnDef<SalesHistoryRow>[] = [
  { accessorKey: "id", header: "Sale ID" },
  { 
    accessorKey: "created_at", 
    header: "Date",
    cell: ({ row }) => format(new Date(row.original.created_at), "dd MMM, yyyy HH:mm")
  },
  { accessorKey: "customer_name", header: "Customer", cell: ({ row }) => row.original.customer_name || "Walk-in" },
  { accessorKey: "employee_name", header: "Sold By", cell: ({ row }) => row.original.employee_name || "N/A" },
  { accessorKey: "payment_method", header: "Payment Method" },
  { accessorKey: "item_count", header: "Items" },
  { 
    accessorKey: "total_amount", 
    header: "Total",
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.total_amount)}</div>
  },
]