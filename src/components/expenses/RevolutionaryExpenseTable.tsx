'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Search,
  Download,
  RefreshCcw,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  format,
  isValid,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface StagedExpense {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  vendor: string;
  category_id: string;
  payment_account_id: string;
}

interface RevolutionaryExpenseTableProps {
  businessId: string;
  userId: string;
}

type PeriodType = 'all' | 'day' | 'month' | 'quarter' | 'year' | 'custom';

const supabase = createClient();

const SORTABLE_COLUMNS = ['expense_date', 'description', 'category', 'approval_status', 'amount'];

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'expense_date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm text-slate-600">
        {format(new Date(row.original.expense_date), 'dd MMM yyyy')}
      </span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div>
        <div className="text-sm text-slate-900">{row.original.description}</div>
        {row.original.vendor_name ? (
          <div className="mt-0.5 text-xs text-slate-400">{row.original.vendor_name}</div>
        ) : null}
      </div>
    )
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.category}</span>,
  },
  {
    accessorKey: 'approval_status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.approval_status;
      return (
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-sm capitalize text-slate-600">{status}</span>
        </div>
      );
    }
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm tabular-nums text-slate-900">
        {formatCurrency(row.original.amount, row.original.currency || 'UGX')}
      </div>
    ),
  },
];

const pickColumn = (row: any, keys: string[]) => {
  const match = Object.keys(row).find(k => keys.includes(k.trim().toLowerCase()));
  return match ? row[match] : '';
};

const normaliseDate = (value: any) => {
  const raw = String(value || '').trim();
  if (!raw) return format(new Date(), 'yyyy-MM-dd');
  const iso = parseISO(raw);
  if (isValid(iso)) return format(iso, 'yyyy-MM-dd');
  const parsed = new Date(raw);
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
};

const cleanSearchTerm = (term: string) => term.trim().replace(/[,%()]/g, '');

function applyFilters(query: any, searchTerm: string, from: string | null, to: string | null) {
  const term = cleanSearchTerm(searchTerm);
  if (term) {
    query = query.or(`description.ilike.%${term}%,vendor_name.ilike.%${term}%,category.ilike.%${term}%`);
  }
  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);
  return query;
}

function buildExpenseQuery(
  businessId: string,
  searchTerm: string,
  from: string | null,
  to: string | null,
  sortColumn: string,
  sortAscending: boolean,
  withCount: boolean
) {
  const base = supabase
    .from('expenses')
    .select('*', withCount ? { count: 'exact' } : undefined)
    .eq('business_id', businessId);

  return applyFilters(base, searchTerm, from, to).order(sortColumn, { ascending: sortAscending });
}

function BulkImportTerminal({ businessId, userId, onSuccess }: { businessId: string, userId: string, onSuccess: () => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [stagedData, setStagedData] = React.useState<StagedExpense[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: expAccounts } = useQuery({
    queryKey: ['accounts', 'expense', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_accounts').select('id, name, code').eq('business_id', businessId).in('type', ['Expense', 'Cost of Goods Sold']).eq('is_active', true);
      return data || [];
    },
    enabled: isOpen
  });

  const { data: payAccounts } = useQuery({
    queryKey: ['accounts', 'payment', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_accounts').select('id, name').eq('business_id', businessId).eq('type', 'Asset').in('subtype', ['bank', 'cash']).eq('is_active', true);
      return data || [];
    },
    enabled: isOpen
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped: StagedExpense[] = (results.data as any[]).map((row: any, idx: number) => ({
          tempId: `row-${idx}-${Date.now()}`,
          date: normaliseDate(pickColumn(row, ['date', 'expense_date', 'transaction date'])),
          description: String(pickColumn(row, ['description', 'details', 'narration', 'particulars']) || '').trim() || 'Imported expense',
          amount: parseFloat(String(pickColumn(row, ['amount', 'value', 'total'])).replace(/[^0-9.-]+/g, "")) || 0,
          vendor: String(pickColumn(row, ['vendor', 'payee', 'supplier', 'vendor_name']) || '').trim(),
          category_id: '',
          payment_account_id: ''
        }));

        if (!mapped.length) {
          toast.error("No rows found in this file");
          return;
        }

        setStagedData(mapped);
        setIsOpen(true);
      },
      error: () => toast.error("This file could not be read")
    });

    e.target.value = '';
  };

  const updateStagedRow = (tempId: string, updates: Partial<StagedExpense>) => {
    setStagedData(prev => prev.map(row => row.tempId === tempId ? { ...row, ...updates } : row));
  };

  const deleteStagedRow = (tempId: string) => {
    setStagedData(prev => prev.filter(row => row.tempId !== tempId));
  };

  const applyToAll = (field: 'category_id' | 'payment_account_id', value: string) => {
    setStagedData(prev => prev.map(row => ({ ...row, [field]: value })));
  };

  const incompleteCount = stagedData.filter(r => !r.category_id || !r.payment_account_id).length;

  const handleBulkCommit = async () => {
    if (incompleteCount > 0) {
      toast.error(`${incompleteCount} row${incompleteCount === 1 ? '' : 's'} still need an expense account and a payment source`);
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failedCount = 0;

    for (const row of stagedData) {
      try {
        const { error } = await supabase.rpc('record_enterprise_expense', {
          p_business_id: businessId,
          p_user_id: userId,
          p_date: row.date,
          p_description: row.description,
          p_amount: row.amount,
          p_expense_account_id: row.category_id,
          p_payment_account_id: row.payment_account_id,
          p_vendor_name: row.vendor,
          p_currency: 'UGX',
          p_country_code: 'UG',
          p_exchange_rate: 1.0
        });
        if (error) {
          failedCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        failedCount++;
      }
    }

    setIsProcessing(false);

    if (failedCount > 0) {
      toast.error(`${successCount} saved, ${failedCount} failed`);
    } else {
      toast.success(`${successCount} expense${successCount === 1 ? '' : 's'} saved`);
      setIsOpen(false);
      setStagedData([]);
    }

    onSuccess();
  };

  return (
    <>
      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
      >
        <Upload className="mr-2 h-4 w-4 text-slate-400" />
        Import CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden rounded-xl p-0 sm:max-w-[1000px]">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Import expenses
            </DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              {stagedData.length} row{stagedData.length === 1 ? '' : 's'} ready
              {incompleteCount > 0 ? ` · ${incompleteCount} incomplete` : ''}
            </p>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Set expense account for all rows</p>
              <Select onValueChange={(val) => applyToAll('category_id', val)}>
                <SelectTrigger className="h-9 w-64 rounded-lg border-slate-200 bg-white text-sm">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {expAccounts?.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.code ? `${acc.code} — ` : ''}{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Set payment source for all rows</p>
              <Select onValueChange={(val) => applyToAll('payment_account_id', val)}>
                <SelectTrigger className="h-9 w-64 rounded-lg border-slate-200 bg-white text-sm">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {payAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-2">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                  <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Date</TableHead>
                  <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Description</TableHead>
                  <TableHead className="h-11 w-32 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Amount</TableHead>
                  <TableHead className="h-11 w-52 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Expense account</TableHead>
                  <TableHead className="h-11 w-52 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Paid from</TableHead>
                  <TableHead className="h-11 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagedData.map((row) => (
                  <TableRow key={row.tempId} className="border-b border-slate-100 last:border-0 hover:bg-transparent">
                    <TableCell className="py-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateStagedRow(row.tempId, { date: e.target.value })}
                        className="h-9 w-36 rounded-lg border-slate-200 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={row.description}
                        onChange={(e) => updateStagedRow(row.tempId, { description: e.target.value })}
                        className="h-9 rounded-lg border-slate-200 text-sm"
                      />
                      {row.vendor ? <div className="mt-1 text-xs text-slate-400">{row.vendor}</div> : null}
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={row.amount}
                        onChange={(e) => updateStagedRow(row.tempId, { amount: Number(e.target.value) || 0 })}
                        className="h-9 rounded-lg border-slate-200 text-sm tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Select value={row.category_id} onValueChange={(val) => updateStagedRow(row.tempId, { category_id: val })}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {expAccounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.code ? `${acc.code} — ` : ''}{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2">
                      <Select value={row.payment_account_id} onValueChange={(val) => updateStagedRow(row.tempId, { payment_account_id: val })}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {payAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => deleteStagedRow(row.tempId)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-9 rounded-lg px-4 text-xs font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCommit}
              disabled={isProcessing || stagedData.length === 0}
              className="h-9 rounded-lg bg-slate-900 px-5 text-xs font-medium text-white hover:bg-slate-800"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save {stagedData.length} expense{stagedData.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RevolutionaryExpenseTable({ businessId, userId }: RevolutionaryExpenseTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'expense_date', desc: true }]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [searchInput, setSearchInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);

  const now = new Date();
  const [periodType, setPeriodType] = React.useState<PeriodType>('all');
  const [day, setDay] = React.useState(format(now, 'yyyy-MM-dd'));
  const [month, setMonth] = React.useState(format(now, 'yyyy-MM'));
  const [quarter, setQuarter] = React.useState(String(Math.floor(now.getMonth() / 3) + 1));
  const [year, setYear] = React.useState(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = React.useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = React.useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  const years = React.useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(current - i));
  }, []);

  const { from, to, periodLabel } = React.useMemo(() => {
    const iso = (d: Date) => format(d, 'yyyy-MM-dd');

    switch (periodType) {
      case 'day':
        return { from: day, to: day, periodLabel: format(new Date(`${day}T00:00:00`), 'dd MMM yyyy') };
      case 'month': {
        const base = new Date(`${month}-01T00:00:00`);
        return { from: iso(startOfMonth(base)), to: iso(endOfMonth(base)), periodLabel: format(base, 'MMMM yyyy') };
      }
      case 'quarter': {
        const base = new Date(Number(year), (Number(quarter) - 1) * 3, 1);
        return { from: iso(startOfQuarter(base)), to: iso(endOfQuarter(base)), periodLabel: `Q${quarter} ${year}` };
      }
      case 'year': {
        const base = new Date(Number(year), 0, 1);
        return { from: iso(startOfYear(base)), to: iso(endOfYear(base)), periodLabel: year };
      }
      case 'custom': {
        if (!customFrom || !customTo) return { from: null, to: null, periodLabel: 'All dates' };
        return { from: customFrom, to: customTo, periodLabel: `${customFrom} to ${customTo}` };
      }
      default:
        return { from: null, to: null, periodLabel: 'All dates' };
    }
  }, [periodType, day, month, quarter, year, customFrom, customTo]);

  const sortColumn = SORTABLE_COLUMNS.includes(sorting[0]?.id) ? sorting[0].id : 'expense_date';
  const sortAscending = sorting[0] ? !sorting[0].desc : false;

  React.useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, from, to, sortColumn, sortAscending]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['expenses', businessId, pagination.pageIndex, pagination.pageSize, searchTerm, from, to, sortColumn, sortAscending],
    queryFn: async () => {
      const rangeStart = pagination.pageIndex * pagination.pageSize;
      const rangeEnd = rangeStart + pagination.pageSize - 1;

      const { data, count, error } = await buildExpenseQuery(businessId, searchTerm, from, to, sortColumn, sortAscending, true)
        .range(rangeStart, rangeEnd);

      if (error) throw error;
      return { rows: (data || []) as Expense[], total: count || 0 };
    },
    enabled: !!businessId,
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  const { data: periodTotal } = useQuery({
    queryKey: ['expenses-total', businessId, searchTerm, from, to],
    queryFn: async () => {
      const base = supabase.from('expenses').select('amount').eq('business_id', businessId);
      const { data, error } = await applyFilters(base, searchTerm, from, to);
      if (error) return null;
      return (data || []).reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);
    },
    enabled: !!businessId,
    staleTime: 5000,
  });

  const rows = data?.rows ?? [];
  const totalCount = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const fetchAllForExport = async () => {
    const { data, error } = await buildExpenseQuery(businessId, searchTerm, from, to, sortColumn, sortAscending, false)
      .range(0, 4999);
    if (error) throw new Error(error.message);
    return (data || []) as Expense[];
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const all = await fetchAllForExport();
      if (!all.length) {
        toast.error("Nothing to export");
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Expenses", 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${periodLabel}`, 14, 28);
      doc.text(`Generated ${format(new Date(), 'dd MMM yyyy')}`, 14, 34);

      autoTable(doc, {
        startY: 44,
        head: [['Date', 'Description', 'Category', 'Status', 'Amount']],
        body: all.map(exp => [
          format(new Date(exp.expense_date), 'dd/MM/yyyy'),
          exp.vendor_name ? `${exp.description} (${exp.vendor_name})` : exp.description,
          exp.category,
          exp.approval_status,
          `${new Intl.NumberFormat().format(exp.amount)} ${exp.currency || 'UGX'}`
        ]),
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        columnStyles: { 4: { halign: 'right' } }
      });

      doc.save(`Expenses_${from || 'all'}_${to || 'all'}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const all = await fetchAllForExport();
      if (!all.length) {
        toast.error("Nothing to export");
        return;
      }

      const headers = ["Date", "Description", "Vendor", "Category", "Status", "Amount", "Currency"];
      const escape = (cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
      const body = all.map(e => [
        format(new Date(e.expense_date), 'yyyy-MM-dd'),
        e.description,
        e.vendor_name || '',
        e.category,
        e.approval_status,
        e.amount,
        e.currency
      ]);
      const csv = [headers, ...body].map(row => row.map(escape).join(",")).join("\n");

      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.setAttribute("download", `Expenses_${from || 'all'}_${to || 'all'}.csv`);
      link.click();
    } catch (e: any) {
      toast.error(e.message);
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
              <RefreshCcw className={`mr-2 h-4 w-4 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <BulkImportTerminal businessId={businessId} userId={userId} onSuccess={() => refetch()} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isExporting}
                  className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
                >
                  {isExporting
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                    : <Download className="mr-2 h-4 w-4 text-slate-400" />}
                  Export
                  <ChevronDown className="ml-1.5 h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-lg">
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2 text-sm">
                  <FileText className="h-4 w-4 text-slate-400" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search description, payee or category"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
            />
          </div>
          <p className="text-sm text-slate-500">
            {periodLabel} · {totalCount} record{totalCount === 1 ? '' : 's'}
            {typeof periodTotal === 'number' ? ` · ${new Intl.NumberFormat().format(periodTotal)}` : ''}
          </p>
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
                    <div
                      className={header.column.getCanSort() ? "flex cursor-pointer select-none items-center gap-1.5" : ""}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" /> : null}
                      {header.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" /> : null}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  <p className="mt-3 text-sm text-slate-400">Loading</p>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-3 text-sm font-medium text-slate-900">Expenses could not load</p>
                  <p className="mt-1 text-sm text-slate-500">Check your connection and try again</p>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center text-sm text-slate-400">
                  No expenses for {periodLabel.toLowerCase()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing {rows.length} of {totalCount}
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-500">Rows</Label>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
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
            Page {pagination.pageIndex + 1} of {pageCount}
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