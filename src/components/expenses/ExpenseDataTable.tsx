'use client';

import React, { useState } from 'react';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  PaginationState,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState
} from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Settings2, Download, AlertCircle } from 'lucide-react';
import AddExpenseDialog from './AddExpenseDialog';

// Generic Props for the Table
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  businessId: string;
  userId: string;
}

// --- API Fetcher ---
async function fetchExpenses(businessId: string, pageIndex: number, pageSize: number) {
    const supabase = createClient();
    
    // Calculate range for Supabase (0-based index)
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
        .from('accounting_expenses')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .order('date', { ascending: false })
        .range(from, to);

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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // --- React Query ---
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expenses', businessId, pagination],
    queryFn: () => fetchExpenses(businessId, pagination.pageIndex, pagination.pageSize),
    // Keep previous data while fetching new page for smoother UX
    placeholderData: (previousData) => previousData,
  });

  const expenses = (data?.expenses as TData[]) ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // --- Table Instance ---
  const table = useReactTable({
    data: expenses,
    columns,
    pageCount: pageCount, // Required for server-side pagination
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), 
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // IMPORTANT: Tells table we handle pagination via API
    debugTable: false,
  });

  return (
    <div className="space-y-4 w-full">
      {/* --- Toolbar --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
             <Input
                placeholder="Filter loaded expenses..."
                value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                    table.getColumn("description")?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                        <Settings2 className="mr-2 h-4 w-4" /> View
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                            return (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                >
                                    {column.id}
                                </DropdownMenuCheckboxItem>
                            )
                        })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            {/* Correctly passing props to the Dialog */}
            <AddExpenseDialog businessId={businessId} userId={userId} />
        </div>
      </div>

      {/* --- Main Table Area --- */}
      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-muted-foreground text-sm">Syncing financial data...</span>
                    </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                        <div className="flex flex-col items-center justify-center gap-2">
                             <AlertCircle className="h-6 w-6" />
                             <span>Error loading data: {error instanceof Error ? error.message : 'Unknown error'}</span>
                        </div>
                    </TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No expenses recorded for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Pagination --- */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground hidden sm:block">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {totalCount} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows/Page</p>
                <select
                    className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => {
                        table.setPageSize(Number(e.target.value))
                    }}
                >
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                        <option key={pageSize} value={pageSize}>
                            {pageSize}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span className="sr-only">First</span>
                    {"<<"}
                </Button>
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span className="sr-only">Prev</span>
                    {"<"}
                </Button>
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <span className="sr-only">Next</span>
                    {">"}
                </Button>
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                >
                    <span className="sr-only">Last</span>
                    {">>"}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}