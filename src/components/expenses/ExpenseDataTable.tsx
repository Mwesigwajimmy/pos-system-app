'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
  SortingState,
  getSortedRowModel,
  VisibilityState
} from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RefreshCw,
  Search
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear
} from 'date-fns';
import AddExpenseDialog from './AddExpenseDialog';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  businessId: string;
  userId: string;
}

type PeriodType = 'all' | 'day' | 'month' | 'quarter' | 'year' | 'custom';

const supabase = createClient();

function buildExpenseQuery(businessId: string, searchTerm: string, from: string | null, to: string | null) {
  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('expense_date', { ascending: false });

  if (searchTerm) {
    query = query.ilike('description', `%${searchTerm}%`);
  }
  if (from) {
    query = query.gte('expense_date', from);
  }
  if (to) {
    query = query.lte('expense_date', to);
  }
  return query;
}

async function fetchExpenses(
  businessId: string,
  pageIndex: number,
  pageSize: number,
  searchTerm: string,
  from: string | null,
  to: string | null
) {
  const rangeStart = pageIndex * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  const { data, count, error } = await buildExpenseQuery(businessId, searchTerm, from, to)
    .range(rangeStart, rangeEnd);

  if (error) throw new Error(error.message);

  return {
    expenses: data || [],
    total_count: count || 0
  };
}

async function fetchPeriodTotal(businessId: string, searchTerm: string, from: string | null, to: string | null) {
  let query = supabase
    .from('expenses')
    .select('amount')
    .eq('business_id', businessId);

  if (searchTerm) query = query.ilike('description', `%${searchTerm}%`);
  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);

  const { data, error } = await query;
  if (error) return null;

  return (data || []).reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);
}

export default function ExpenseDataTable<TData, TValue>({
  columns,
  businessId,
  userId
}: DataTableProps<TData, TValue>) {

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [day, setDay] = useState(format(now, 'yyyy-MM-dd'));
  const [month, setMonth] = useState(format(now, 'yyyy-MM'));
  const [quarter, setQuarter] = useState(String(Math.floor(now.getMonth() / 3) + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(current - i));
  }, []);

  const { from, to, periodLabel } = useMemo(() => {
    const iso = (d: Date) => format(d, 'yyyy-MM-dd');

    switch (periodType) {
      case 'day': {
        return { from: day, to: day, periodLabel: format(new Date(`${day}T00:00:00`), 'dd MMM yyyy') };
      }
      case 'month': {
        const base = new Date(`${month}-01T00:00:00`);
        return {
          from: iso(startOfMonth(base)),
          to: iso(endOfMonth(base)),
          periodLabel: format(base, 'MMMM yyyy')
        };
      }
      case 'quarter': {
        const base = new Date(Number(year), (Number(quarter) - 1) * 3, 1);
        return {
          from: iso(startOfQuarter(base)),
          to: iso(endOfQuarter(base)),
          periodLabel: `Q${quarter} ${year}`
        };
      }
      case 'year': {
        const base = new Date(Number(year), 0, 1);
        return {
          from: iso(startOfYear(base)),
          to: iso(endOfYear(base)),
          periodLabel: year
        };
      }
      case 'custom': {
        if (!customFrom || !customTo) return { from: null, to: null, periodLabel: 'All dates' };
        return { from: customFrom, to: customTo, periodLabel: `${customFrom} to ${customTo}` };
      }
      default:
        return { from: null, to: null, periodLabel: 'All dates' };
    }
  }, [periodType, day, month, quarter, year, customFrom, customTo]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, from, to]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['expenses', businessId, pagination.pageIndex, pagination.pageSize, searchTerm, from, to],
    queryFn: () => fetchExpenses(businessId, pagination.pageIndex, pagination.pageSize, searchTerm, from, to),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  const { data: periodTotal } = useQuery({
    queryKey: ['expenses-total', businessId, searchTerm, from, to],
    queryFn: () => fetchPeriodTotal(businessId, searchTerm, from, to),
    staleTime: 5000,
  });

  const expenses = useMemo(() => (data?.expenses as TData[]) ?? [], [data?.expenses]);
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

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
    manualPagination: true,
    debugTable: false,
  });

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      const { data: rows, error: exportError } = await buildExpenseQuery(businessId, searchTerm, from, to)
        .range(0, 4999);

      if (exportError) throw new Error(exportError.message);
      if (!rows?.length) return;

      const headers = Object.keys(rows[0]);
      const escape = (cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
      const csv = [
        headers.map(escape).join(','),
        ...rows.map((row: any) => headers.map(h => escape(row[h])).join(','))
      ].join('\n');

      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.setAttribute('download', `Expenses_${from || 'all'}_${to || 'all'}.csv`);
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Period</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger className="h-9 w-40 rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'day' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Date</Label>
                <Input
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="h-9 w-44 rounded-lg border-slate-200 text-sm"
                />
              </div>
            )}

            {periodType === 'month' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Month</Label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-9 w-44 rounded-lg border-slate-200 text-sm"
                />
              </div>
            )}

            {periodType === 'quarter' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger className="h-9 w-44 rounded-lg border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="1">Q1 · Jan to Mar</SelectItem>
                      <SelectItem value="2">Q2 · Apr to Jun</SelectItem>
                      <SelectItem value="3">Q3 · Jul to Sep</SelectItem>
                      <SelectItem value="4">Q4 · Oct to Dec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="h-9 w-28 rounded-lg border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {periodType === 'year' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-9 w-28 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">From</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 w-44 rounded-lg border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">To</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    min={customFrom}
                    className="h-9 w-44 rounded-lg border-slate-200 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
            >
              <RefreshCw className={`mr-2 h-4 w-4 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportCSV}
              disabled={isExporting}
              className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
            >
              {isExporting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                : <Download className="mr-2 h-4 w-4 text-slate-400" />}
              Export CSV
            </Button>
            <AddExpenseDialog businessId={businessId} userId={userId} />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search descriptions"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {periodLabel} · {totalCount} record{totalCount === 1 ? '' : 's'}
              {typeof periodTotal === 'number'
                ? ` · ${new Intl.NumberFormat().format(periodTotal)}`
                : ''}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden h-9 rounded-lg border-slate-200 px-4 text-xs font-medium md:flex">
                  <Settings2 className="mr-2 h-4 w-4 text-slate-400" />
                  Columns
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
                      {column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-slate-200 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
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
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  <p className="mt-3 text-sm text-slate-400">Loading</p>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-3 text-sm font-medium text-slate-900">Expenses could not load</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {error instanceof Error ? error.message : 'Please try again'}
                  </p>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5 text-sm text-slate-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-sm text-slate-400">
                  No expenses for {periodLabel.toLowerCase()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing {expenses.length} of {totalCount}
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-500">Rows</Label>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-9 w-20 rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} of {pageCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-9 w-9 rounded-lg border-slate-200 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 rounded-lg border-slate-200 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 rounded-lg border-slate-200 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 rounded-lg border-slate-200 p-0"
              onClick={() => table.setPageIndex(pageCount - 1)}
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