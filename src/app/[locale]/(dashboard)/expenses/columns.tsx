"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Eye, FileText, ShieldCheck, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

// --- Strictly Typed Enterprise Interface ---
// Aligned exactly with your public.expenses table schema
export type Expense = {
  id: string;
  expense_date: string; // Changed from 'date' to match DB
  description: string;
  category: string;
  amount: number;
  currency: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'void'; // Aligned with DB
  vendor_name?: string | null;
  receipt_url?: string;
  created_at: string;
};

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: "expense_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="hover:bg-transparent p-0 font-bold text-slate-600 uppercase text-[11px] tracking-wider"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
                {format(new Date(row.original.expense_date), "MMM dd, yyyy")}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
                {format(new Date(row.original.expense_date), "HH:mm")}
            </span>
        </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description / Vendor",
    cell: ({ row }) => (
        <div className="flex flex-col max-w-[300px]">
            <span className="font-medium text-slate-800 truncate" title={row.original.description}>
                {row.original.description}
            </span>
            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">
                {row.original.vendor_name || "General Expenditure"}
            </span>
        </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Ledger Category",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-500 border-slate-200 uppercase">
        {row.getValue("category")}
      </Badge>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right uppercase text-[11px] font-bold text-slate-600 tracking-wider">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const currency = row.original.currency || 'UGX';
      
      return (
        <div className="text-right font-bold text-slate-900 tabular-nums">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
          }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "approval_status",
    header: "Ledger Status",
    cell: ({ row }) => {
      const status = row.original.approval_status;
      return (
        <Badge 
          className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5 border-none",
            status === 'approved' ? 'bg-green-100 text-green-700' : 
            status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            status === 'void' ? 'bg-slate-100 text-slate-700' : 
            'bg-red-100 text-red-700'
          )}
        >
          {status === 'approved' ? <ShieldCheck className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
          {status}
        </Badge>
      );
    },
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
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel className="text-xs text-slate-400">Transaction Actions</DropdownMenuLabel>
            <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => navigator.clipboard.writeText(expense.id)}
            >
              Copy Audit ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <Eye className="mr-2 h-4 w-4" /> View Ledger Detail
            </DropdownMenuItem>
            {expense.receipt_url && (
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => window.open(expense.receipt_url, '_blank')}
              >
                <FileText className="mr-2 h-4 w-4" /> View Source Receipt
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
              Void Expense
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];

// Helper for CN if needed
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}