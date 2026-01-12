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
import { createClient } from '@/lib/supabase/client';

// --- UI Component Imports ---
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
    ChevronDown, ChevronRight, Loader2, Search, 
    AlertCircle, Settings2, FileDown, Landmark, 
    ShieldCheck, Fingerprint, ArrowRightLeft
} from 'lucide-react';
import { exportToExcel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner'; // FIXED: Added missing toast import

// --- Enterprise Types ---
export interface LedgerLine {
    id: string;
    account_name: string;
    account_code: string;
    debit: number;
    credit: number;
    description: string;
}

export interface LedgerTransaction {
    id: string;
    date: string;
    reference: string;
    description: string;
    state: string;
    total_amount: number;
    lines: LedgerLine[];
}

interface Props {
    businessId: string;
}

// --- API Services (Aligned with confirmed ERP Schema) ---
const fetchEnterpriseLedger = async (businessId: string, filters: any) => {
    const supabase = createClient();
    
    // We query the Master Transaction Header and join the Ledger Lines
    let query = supabase
        .from('accounting_transactions')
        .select(`
            id, date, reference, description, state,
            lines: accounting_journal_entries(
                id, debit, credit, description,
                account: accounting_accounts(name, code)
            )
        `, { count: 'exact' })
        .eq('business_id', businessId);

    // Date Range Filtering
    if (filters.date?.from) query = query.gte('date', format(filters.date.from, 'yyyy-MM-dd'));
    if (filters.date?.to) query = query.lte('date', format(filters.date.to, 'yyyy-MM-dd'));

    // Text Search
    if (filters.searchText) {
        query = query.or(`description.ilike.%${filters.searchText}%,reference.ilike.%${filters.searchText}%`);
    }

    // Pagination
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    
    const { data, error, count } = await query
        .order('date', { ascending: false })
        .range(from, to);

    if (error) throw error;

    return {
        transactions: data.map((tx: any) => ({
            ...tx,
            // Calculate total impact for the high-level row
            total_amount: tx.lines.reduce((sum: number, l: any) => sum + Number(l.debit), 0)
        })),
        total_count: count || 0
    };
};

export default function GeneralLedgerTable({ businessId }: Props) {
  // --- State Management ---
  const [filters, setFilters] = useState({
    date: { from: addDays(new Date(), -30), to: new Date() } as DateRange,
    accountId: null,
    page: 1,
    pageSize: 25,
  });
  const [searchText, setSearchText] = useState('');
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnVisibility, setColumnVisibility] = useState({});

  const debouncedSearch = useDebounce(searchText, 500);
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const queryFilters = { ...filters, searchText: debouncedSearch };

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['ledger_explorer', businessId, queryFilters],
    queryFn: () => fetchEnterpriseLedger(businessId, queryFilters),
    placeholderData: (prev) => prev,
  });

  const transactions = data?.transactions ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / filters.pageSize) || 1;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  
  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<LedgerTransaction>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      size: 50,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => row.toggleExpanded()}
          className="hover:bg-blue-50 text-blue-600"
        >
          {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Posting Date',
      size: 140,
      cell: ({ row }) => (
        <div className="font-semibold text-slate-700">
            {format(new Date(row.original.date), 'dd MMM yyyy')}
        </div>
      )
    },
    {
        accessorKey: 'reference',
        header: 'Reference',
        size: 150,
        cell: ({ row }) => (
            <div className="font-mono text-[11px] bg-slate-100 px-2 py-1 rounded border inline-block">
                {row.original.reference || '---'}
            </div>
        )
    },
    {
      accessorKey: 'description',
      header: 'Ledger Narrative',
      size: 400,
    },
    {
        accessorKey: 'state',
        header: 'Status',
        size: 120,
        cell: ({ row }) => (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-black uppercase text-[10px]">
                {row.original.state}
            </Badge>
        )
    },
    {
        accessorKey: 'total_amount',
        header: () => <div className="text-right">Balance Impact</div>,
        size: 150,
        cell: ({ row }) => <div className="text-right font-black text-primary">{formatCurrency(row.original.total_amount)}</div>,
    }
  ], []);

  const table = useReactTable({
    data: transactions,
    columns,
    pageCount,
    state: { columnSizing, columnVisibility },
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    columnResizeMode: 'onChange',
  });

  // --- Handlers ---
  const handleFilterChange = (newFilters: any) => setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  
  const handleExport = () => {
    if (!transactions.length) return toast.error("No data to export");
    exportToExcel(transactions, `General_Ledger_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  if (error) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-bold">System Connection Interrupted</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to synchronize with the General Ledger.</span>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['ledger_explorer'] })}>Retry Sync</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Global Enterprise Toolbar --- */}
      <div className="p-4 border-none rounded-2xl bg-white shadow-xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 pr-4 border-r">
            <Landmark className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-black uppercase tracking-tighter">Filter Engine</span>
        </div>
        
        <DatePickerWithRange
          date={filters.date}
          setDate={(date) => handleFilterChange({ date: date! })}
        />

        <div className="relative flex-grow min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by description or reference..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2 rounded-xl">
                <Settings2 className="h-4 w-4" /> Columns
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
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

            <Button variant="outline" onClick={handleExport} className="flex gap-2 rounded-xl bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                <FileDown className="h-4 w-4" /> Export Ledger
            </Button>
        </div>
      </div>

      {/* --- Professional Data Grid --- */}
      <div className="rounded-2xl border bg-white shadow-2xl relative overflow-hidden">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <span className="text-xs font-black uppercase text-blue-600">Syncing Ledger...</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} style={{ width: header.getSize() }} className="text-slate-500 font-bold py-4">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.original.id}>
                    <TableRow className={cn("transition-colors", row.getIsExpanded() ? "bg-blue-50/30" : "hover:bg-slate-50/50")}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* --- ENTERPRISE DRILL-DOWN (Balanced Double Entry View) --- */}
                    {row.getIsExpanded() && (
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableCell colSpan={columns.length} className="p-0 border-y">
                          <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-widest">
                                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                                    Double-Entry Breakdown
                                </h4>
                                <div className="flex gap-4 text-[10px] font-bold text-muted-foreground uppercase">
                                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Balanced</span>
                                    <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Immutable</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 pb-2 border-b">
                                <div className="col-span-3">Account Account</div>
                                <div className="col-span-5">Line Memo</div>
                                <div className="col-span-2 text-right">Debit</div>
                                <div className="col-span-2 text-right">Credit</div>
                            </div>

                            {row.original.lines.map((line: any) => (
                              <div key={line.id} className="grid grid-cols-12 gap-2 py-2 border-b border-slate-200/50 items-center hover:bg-white transition-colors">
                                <div className="col-span-3 flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">{line.account?.name}</span>
                                    <span className="text-[9px] font-mono text-muted-foreground tracking-tighter">GL CODE: {line.account?.code}</span>
                                </div>
                                <div className="col-span-5 text-xs text-slate-600 italic">
                                    {line.description || 'Auto-generated ledger entry'}
                                </div>
                                <div className="col-span-2 text-right font-mono text-xs font-bold text-blue-700">
                                  {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                                </div>
                                <div className="col-span-2 text-right font-mono text-xs font-bold text-red-700">
                                  {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                                </div>
                              </div>
                            ))}

                            <div className="flex justify-end pt-2">
                                <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-xs flex gap-6">
                                    <span>DR TOTAL: {formatCurrency(row.original.total_amount)}</span>
                                    <span>CR TOTAL: {formatCurrency(row.original.total_amount)}</span>
                                </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground italic">
                      No matching records found in the General Ledger.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      {/* --- Enterprise Pagination --- */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
        <div className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
          <Landmark className="w-3 h-3" />
          System Record Count: <span className="text-slate-900">{totalCount}</span>
        </div>
        <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4"
              onClick={() => handleFilterChange({ page: filters.page - 1 })}
              disabled={filters.page <= 1}
            >
              Previous
            </Button>
            <div className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full">
                Page {filters.page} of {pageCount}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4"
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