'use client';

import React, { useState, useMemo } from 'react';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  PaginationState,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
  VisibilityState,
  OnChangeFn
} from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  Settings2, 
  Download, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search
} from 'lucide-react';
import AddExpenseDialog from './AddExpenseDialog';

// --- Strictly Typed Props ---
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  businessId: string;
  userId: string;
}

// --- API Fetcher (Enterprise Server-Side Logic) ---
async function fetchExpenses(businessId: string, pageIndex: number, pageSize: number, searchTerm: string) {
    const supabase = createClient();
    
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    // Build the query
    let query = supabase
        .from('expenses') // Fetching from the operational expenses table
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .order('expense_date', { ascending: false });

    // Apply server-side search if text exists
    if (searchTerm) {
        query = query.ilike('description', `%${searchTerm}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) throw new Error(error.message);
    
    return { 
        expenses: data || [], 
        total_count: count || 0 
    };
}

export default function ExpenseDataTable<TData, TValue>({ 
    columns, 
    businessId,
    userId 
}: DataTableProps<TData, TValue>) {
  
  // --- Table State ---
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchTerm, setSearchTerm] = useState('');

  // --- React Query (Autonomous Synchronization) ---
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expenses', businessId, pagination.pageIndex, pagination.pageSize, searchTerm],
    queryFn: () => fetchExpenses(businessId, pagination.pageIndex, pagination.pageSize, searchTerm),
    placeholderData: (previousData) => previousData,
    staleTime: 5000, // Keep data fresh
  });

  const expenses = useMemo(() => (data?.expenses as TData[]) ?? [], [data?.expenses]);
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // --- Table Instance ---
  const table = useReactTable({
    data: expenses,
    columns,
    pageCount: pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Crucial for Enterprise scale
    debugTable: false,
  });

  return (
    <div className="space-y-4 w-full">
      {/* --- Toolbar / Command Bar --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search ledger descriptions..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
                    }}
                    className="pl-9 bg-slate-50/50 border-slate-200"
                />
             </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto hidden md:flex h-10">
                        <Settings2 className="mr-2 h-4 w-4" /> Columns
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => (
                            <DropdownMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                            >
                                {column.id.replace('_', ' ')}
                            </DropdownMenuCheckboxItem>
                        ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-10">
                Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-10">
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            {/* Jimmy: This links to the Real Enterprise Dialog */}
            <AddExpenseDialog businessId={businessId} userId={userId} />
        </div>
      </div>

      {/* --- Ledger View Area --- */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-600 font-bold uppercase text-[11px] tracking-wider py-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <span className="text-slate-500 font-medium">Fetching Enterprise Ledger...</span>
                    </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center text-red-600">
                        <div className="flex flex-col items-center justify-center gap-2">
                             <AlertCircle className="h-8 w-8" />
                             <span className="font-bold">Data Synchronization Failed</span>
                             <p className="text-sm opacity-80">{error instanceof Error ? error.message : 'Unknown database error'}</p>
                        </div>
                    </TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-slate-400 italic">
                  No expenditure records found in the ledger for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Pagination Controls --- */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-slate-500 font-medium">
            Showing {expenses.length} of {totalCount} records
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-slate-600">Rows</p>
                <select
                    className="h-9 w-[80px] rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                >
                    {[10, 20, 50, 100].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                            {pageSize}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center justify-center text-sm font-bold text-slate-700">
                Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-1">
                <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}