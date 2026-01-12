'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ArrowUpDown, 
  Activity, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// --- Accurate Enterprise Ledger Type ---
export interface LedgerEntry {
  id: string;
  date: string;
  account_name: string;
  account_type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// Simple internal formatter for strict alignment
const formatCurrency = (val: number) => {
    if (!val || val === 0) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);
};

export function RevolutionaryLedgerTable({ data }: { data: LedgerEntry[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  // --- Enterprise Column Definition ---
  const columns = React.useMemo<ColumnDef<LedgerEntry>[]>(() => [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 hover:bg-transparent">
          Date <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-xs font-medium text-slate-500">
            {format(new Date(row.getValue('date')), 'dd MMM yyyy')}
        </div>
      ),
    },
    {
      accessorKey: 'account_name',
      header: 'Account Ledger',
      cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-800">{row.getValue('account_name')}</span>
            <Badge variant="outline" className="w-fit text-[9px] uppercase h-4 px-1 bg-slate-50">
                {row.original.account_type || 'General'}
            </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Narrative',
      cell: ({ row }) => (
        <div className="text-sm italic text-slate-600 max-w-[300px] truncate" title={row.getValue('description')}>
            {row.getValue('description')}
        </div>
      ),
    },
    {
      accessorKey: 'debit',
      header: () => <div className="text-right uppercase text-[10px] font-black tracking-widest text-slate-400">Debit (DR)</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-blue-700">
            {formatCurrency(row.getValue('debit'))}
        </div>
      ),
    },
    {
      accessorKey: 'credit',
      header: () => <div className="text-right uppercase text-[10px] font-black tracking-widest text-slate-400">Credit (CR)</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-red-600">
            {formatCurrency(row.getValue('credit'))}
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: () => <div className="text-right uppercase text-[10px] font-black tracking-widest text-slate-400">Cumulative</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-black text-slate-900 bg-slate-50 py-1 px-2 rounded border border-dashed border-slate-200">
            {formatCurrency(row.getValue('balance'))}
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 15 } }
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Search account ledger..."
            value={(table.getColumn('account_name')?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn('account_name')?.setFilterValue(event.target.value)}
            className="pl-9 bg-white shadow-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-100 transition-all"
            />
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 gap-1.5 px-3 py-1">
                <ShieldCheck className="w-3 h-3" />
                Audited View
            </Badge>
            <Button variant="outline" size="sm" className="rounded-xl border-dashed">
                <Filter className="w-3 h-3 mr-2" /> Advanced
            </Button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-4 font-bold text-slate-500">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-blue-50/20 transition-colors border-b border-slate-100 last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground italic">
                    <Activity className="w-8 h-8 opacity-20" />
                    No transactions matched your filter criteria.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modern Pagination Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm mt-4">
        <div className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Live Sync: {data.length} Ledger Lines
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="ghost"
                size="sm"
                className="rounded-xl hover:bg-slate-100"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 border text-slate-600">
                Page {table.getState().pagination.pageIndex + 1}
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="rounded-xl hover:bg-slate-100"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
      </div>
    </div>
  );
}