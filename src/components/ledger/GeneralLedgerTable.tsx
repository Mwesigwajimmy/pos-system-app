'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
  ColumnSizingState,
} from '@tanstack/react-table';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

// --- Type Imports ---
// All data shapes are imported from a single, centralized source of truth.
import { Transaction, Account, TransactionFilters } from '@/types/dashboard';

// --- API Service Imports ---
// Only the data-fetching functions are imported from the service file.
import { fetchTransactions, fetchAccounts } from '@/services/api/ledgerService';

// --- UI Component Imports ---
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Loader2, Search, AlertCircle, Settings2, FileDown } from 'lucide-react';
import { exportToExcel } from '@/lib/utils';

// A simple utility function for formatting currency, assuming it's defined elsewhere.
const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function GeneralLedgerTable() {
  // --- State Management ---
  const [filters, setFilters] = useState<Omit<TransactionFilters, 'searchText'>>({
    date: { from: addDays(new Date(), -30), to: new Date() } as DateRange,
    accountId: null,
    page: 1,
    pageSize: 25,
  });
  const [searchText, setSearchText] = useState('');
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnVisibility, setColumnVisibility] = useState({});

  // Debounce search text to prevent excessive API calls
  const debouncedSearch = useDebounce(searchText, 500);
  const queryClient = useQueryClient();

  // --- Data Fetching using React Query ---

  // Fetch accounts for the filter dropdown
  const { data: accounts, error: accountsError } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  // Combine filters and debounced search text for the main query
  const queryFilters: TransactionFilters = { ...filters, searchText: debouncedSearch };

  // Main query to fetch transactions based on the combined filters
  const { data, isLoading, isFetching, error: transactionsError } = useQuery({
    queryKey: ['transactions', queryFilters],
    queryFn: () => fetchTransactions(queryFilters),
    placeholderData: (previousData) => previousData,
  });

  // Memoize transaction data or default to an empty array
  const transactions = data?.transactions ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / filters.pageSize) || 1;
  
  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      size: 40,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => row.toggleExpanded()}
          className="w-8"
        >
          {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
        </Button>
      ),
    },
    {
      accessorKey: 'transaction_date',
      header: 'Date',
      size: 120,
      cell: ({ row }) => format(new Date(row.original.transaction_date), 'dd MMM yyyy')
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 450,
    },
    {
      accessorKey: 'account_name',
      header: 'Account',
      size: 200,
    },
    {
        accessorKey: 'amount',
        header: () => <div className="text-right">Amount</div>,
        size: 150,
        cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.amount)}</div>,
    }
  ], []);

  // --- Table Instance ---
  const table = useReactTable({
    data: transactions,
    columns,
    pageCount,
    state: {
      columnSizing,
      columnVisibility,
    },
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    columnResizeMode: 'onChange',
  });

  // --- Event Handlers ---
  const handleFilterChange = (newFilters: Partial<Omit<TransactionFilters, 'searchText'>>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };
  
  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      alert("There is no data to export on the current page.");
      return;
    }
    exportToExcel(transactions, "GeneralLedgerExport");
  };

  // --- Render Logic ---
  if (transactionsError || accountsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {transactionsError?.message || accountsError?.message}
          <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions', 'accounts'] })} className="ml-4">
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Filter Controls --- */}
      <div className="p-4 border rounded-lg bg-muted/50 flex flex-wrap items-center gap-4">
        <DatePickerWithRange
          date={filters.date}
          setDate={(date) => handleFilterChange({ date: date! })}
        />
        <Select
          value={String(filters.accountId || '')}
          onValueChange={value => handleFilterChange({ accountId: value ? Number(value) : null })}
        >
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filter by Account..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Accounts</SelectItem>
            {accounts?.map(acc => <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto flex gap-2">
              <Settings2 className="h-4 w-4" /> View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={handleExport} className="flex gap-2">
          <FileDown className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* --- Data Table --- */}
      <div className="rounded-md border relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div className="overflow-x-auto">
            <Table style={{ width: table.getTotalSize() }}>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} style={{ width: header.getSize() }} className="relative">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanResize() && (
                            <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className="absolute top-0 right-0 h-full w-2 bg-blue-400 opacity-0 hover:opacity-100 cursor-col-resize select-none"
                            />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.original.id}>
                    <TableRow data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow className="bg-muted hover:bg-muted">
                        <TableCell colSpan={columns.length} className="p-2">
                          <div className="p-2 grid grid-cols-3 gap-x-4">
                            <h4 className="font-semibold text-xs col-span-3 border-b pb-1 mb-1">Journal Entries</h4>
                            <div className="font-bold text-xs">Account</div>
                            <div className="font-bold text-xs text-right">Debit</div>
                            <div className="font-bold text-xs text-right">Credit</div>
                            {row.original.journal_entries.map(entry => (
                              <React.Fragment key={entry.entry_id}>
                                <span className="text-xs py-1 border-b">{entry.account_name}</span>
                                <span className="text-xs py-1 border-b text-right font-mono">
                                  {entry.type === 'DEBIT' ? formatCurrency(entry.amount) : ''}
                                </span>
                                <span className="text-xs py-1 border-b text-right font-mono">
                                  {entry.type === 'CREDIT' ? formatCurrency(entry.amount) : ''}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {isLoading ? "Fetching data..." : "No transactions found for the selected filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      {/* --- Pagination Controls --- */}
      <div className="flex items-center justify-between">
        <span className="flex-1 text-sm text-muted-foreground">
          Total Transactions: {totalCount}
        </span>
        <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange({ page: filters.page - 1 })}
              disabled={filters.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">Page {filters.page} of {pageCount}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange({ page: filters.page + 1 })}
              disabled={filters.page >= pageCount}
            >
              Next
            </Button>
        </div>
      </div>
    </div>
  );
}