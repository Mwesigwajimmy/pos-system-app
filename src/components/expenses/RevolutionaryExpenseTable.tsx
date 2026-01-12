'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Download, RefreshCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import AddExpenseDialog from './AddExpenseDialog';

// --- Enterprise Expense Interface (Matching your real DB schema) ---
export interface Expense {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  category: string;
  vendor_name: string | null;
  approval_status: string;
  currency: string;
}

// --- Enterprise Columns Definition ---
export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'expense_date',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.original.expense_date), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-medium text-slate-900">{row.original.description}</span>
            <span className="text-xs text-slate-500 uppercase font-mono">{row.original.vendor_name || 'General Vendor'}</span>
        </div>
    )
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-2 py-0">
            {row.original.category}
        </Badge>
    ),
  },
  {
    accessorKey: 'approval_status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.original.approval_status;
        return (
            <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs font-semibold capitalize text-slate-600">{status}</span>
            </div>
        )
    }
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
        <div className="text-right font-bold text-slate-900">
            {formatCurrency(row.original.amount, row.original.currency || 'UGX')}
        </div>
    ),
  },
];

// --- Props for Multi-Tenant Context ---
interface RevolutionaryExpenseTableProps {
  businessId: string;
  userId: string;
}

/**
 * Jimmy, this is the Fully Activated Enterprise Table.
 * It is multi-tenant aware and fetches data based on the businessId.
 */
export function RevolutionaryExpenseTable({ businessId, userId }: RevolutionaryExpenseTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const supabase = createClient();

  // --- Multi-Tenant Data Fetcher ---
  const { data: expenses, isLoading, isError, refetch } = useQuery({
    queryKey: ['expenses', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('business_id', businessId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!businessId,
  });

  const table = useReactTable({
    data: expenses || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4 w-full">
      {/* --- ENTERPRISE TOOLBAR --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search ledger entries..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Sync Ledger">
            <RefreshCcw className="h-4 w-4 text-slate-600" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {/* THE REAL INTERCONNECTED DIALOG */}
          <AddExpenseDialog businessId={businessId} userId={userId} />
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">
                    <div 
                      className={header.column.getCanSort() ? "cursor-pointer select-none flex items-center" : ""}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                   <div className="flex flex-col items-center justify-center gap-2">
                       <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                       <span className="text-sm font-medium text-slate-500">Retrieving Financial Records...</span>
                   </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
                <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-red-500 font-medium">
                  Error synchronizing with enterprise ledger. Please check connection.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 text-slate-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400 font-medium italic">
                  No expenditure records found for this business entity.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}