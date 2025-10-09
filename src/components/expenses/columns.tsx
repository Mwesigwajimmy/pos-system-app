"use client"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

export type ExpenseRow = {
  id: number;
  expense_date: string;
  description: string;
  category_name: string;
  amount: number;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export const columns: ColumnDef<ExpenseRow>[] = [
  { 
    accessorKey: "expense_date", 
    header: "Date",
    cell: ({ row }) => format(new Date(row.original.expense_date), "dd MMM, yyyy")
  },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "category_name", header: "Category" },
  { 
    accessorKey: "amount", 
    header: "Amount",
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.amount)}</div>
  },
]