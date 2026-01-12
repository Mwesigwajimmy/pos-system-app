"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Eye, Receipt, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// --- Strictly Typed Enterprise Row ---
export type ExpenseRow = {
  id: string | number;
  expense_date: string;
  description: string;
  category: string; // Matched to verified DB column
  amount: number;
  vendor_name?: string | null;
  currency?: string;
  approval_status?: string;
}

// Global Currency Formatter
const formatCurrency = (value: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(value);
};

export const columns: ColumnDef<ExpenseRow>[] = [
  { 
    accessorKey: "expense_date", 
    header: "Transaction Date",
    cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
                {format(new Date(row.original.expense_date), "dd MMM, yyyy")}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
                {format(new Date(row.original.expense_date), "HH:mm")}
            </span>
        </div>
    )
  },
  { 
    accessorKey: "description", 
    header: "Description / Payee",
    cell: ({ row }) => (
        <div className="flex flex-col max-w-[250px]">
            <span className="font-medium text-slate-800 truncate" title={row.original.description}>
                {row.original.description}
            </span>
            <span className="text-xs text-blue-600 font-semibold uppercase tracking-tight">
                {row.original.vendor_name || "Internal / General"}
            </span>
        </div>
    )
  },
  { 
    accessorKey: "category", 
    header: "Ledger Category",
    cell: ({ row }) => (
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-medium capitalize">
            {row.original.category}
        </Badge>
    )
  },
  { 
    accessorKey: "amount", 
    header: () => <div className="text-right">Total Amount</div>,
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        return (
            <div className="text-right font-bold text-slate-900 tabular-nums">
                {formatCurrency(amount, row.original.currency || 'UGX')}
            </div>
        );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const expense = row.original;
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel className="text-xs text-slate-400">Ledger Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(expense.id.toString())}>
              Copy Reference ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" /> View Entry
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
                <Receipt className="mr-2 h-4 w-4" /> View Receipt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Void Transaction
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]