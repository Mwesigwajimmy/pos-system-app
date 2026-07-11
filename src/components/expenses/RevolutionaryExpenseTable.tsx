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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Search, Download, RefreshCcw, 
  FileText, FileSpreadsheet, ChevronDown, 
  UploadCloud, Trash2, CheckCircle2, AlertTriangle, 
  Settings2, Edit3, X
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import Papa from 'papaparse'; // Professional CSV parser

// PDF & Export Utilities
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
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

// --- Enterprise Columns Definition (Table UI) ---
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

// --- Bulk Import Logic Component ---
function BulkImportTerminal({ businessId, userId, onSuccess }: { businessId: string, userId: string, onSuccess: () => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [stagedData, setStagedData] = React.useState<StagedExpense[]>([]);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // 1. Fetch Accounts for Distribution Dropdowns
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
                const mapped: StagedExpense[] = results.data.map((row: any, idx: number) => ({
                    tempId: `row-${idx}-${Date.now()}`,
                    date: row.Date || format(new Date(), 'yyyy-MM-dd'),
                    description: row.Description || 'Imported Expense',
                    amount: parseFloat(row.Amount?.replace(/[^0-9.-]+/g, "")) || 0,
                    vendor: row.Vendor || '',
                    category_id: '',
                    payment_account_id: ''
                }));
                setStagedData(mapped);
                setIsOpen(true);
            }
        });
    };

    const updateStagedRow = (tempId: string, updates: Partial<StagedExpense>) => {
        setStagedData(prev => prev.map(row => row.tempId === tempId ? { ...row, ...updates } : row));
    };

    const deleteStagedRow = (tempId: string) => {
        setStagedData(prev => prev.filter(row => row.tempId !== tempId));
    };

    const handleBulkCommit = async () => {
        const incomplete = stagedData.some(r => !r.category_id || !r.payment_account_id);
        if (incomplete) return toast.error("Distribution Error: Please select Category and Payment Source for all rows.");

        setIsProcessing(true);
        let successCount = 0;

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
                if (!error) successCount++;
            } catch (e) { console.error(e); }
        }

        toast.success(`Sovereign Bulk Commit Finished: ${successCount} entries added.`);
        setIsProcessing(false);
        setIsOpen(false);
        setStagedData([]);
        onSuccess();
    };

    return (
        <>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" className="font-bold border-slate-200" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="mr-2 h-4 w-4 text-blue-500" /> Import Ledger CSV
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <Settings2 className="h-6 w-6 text-blue-400" />
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Bulk Distribution Terminal</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs uppercase font-bold tracking-widest mt-1">
                                    Stage and distribute {stagedData.length} records to the General Ledger.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-4 bg-slate-50">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-slate-200">
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Basic Details</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Amount</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">GL Category (Debit)</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Payment Source (Credit)</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stagedData.map((row) => (
                                    <TableRow key={row.tempId} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Input className="h-7 text-xs font-bold border-none bg-slate-100/50" value={row.description} onChange={(e) => updateStagedRow(row.tempId, { description: e.target.value })} />
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[9px] font-mono text-slate-400 uppercase">{row.date}</span>
                                                    <span className="text-[9px] font-mono text-blue-500 font-bold uppercase">{row.vendor || 'No Vendor'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" className="h-8 text-xs font-mono font-black border-slate-200" value={row.amount} onChange={(e) => updateStagedRow(row.tempId, { amount: parseFloat(e.target.value) })} />
                                        </TableCell>
                                        <TableCell>
                                            <Select onValueChange={(val) => updateStagedRow(row.tempId, { category_id: val })} value={row.category_id}>
                                                <SelectTrigger className="h-8 text-[10px] border-slate-200 font-semibold bg-blue-50/30">
                                                    <SelectValue placeholder="Assign Account..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {expAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="text-xs">{acc.code} - {acc.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select onValueChange={(val) => updateStagedRow(row.tempId, { payment_account_id: val })} value={row.payment_account_id}>
                                                <SelectTrigger className="h-8 text-[10px] border-slate-200 font-semibold bg-emerald-50/30">
                                                    <SelectValue placeholder="Source Fund..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {payAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id} className="text-xs">{acc.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => deleteStagedRow(row.tempId)}><Trash2 size={14}/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="p-6 border-t bg-white gap-4">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="uppercase font-black text-[10px] tracking-widest text-slate-400">Discard Batch</Button>
                        <Button className="bg-slate-900 hover:bg-black text-white min-w-[200px]" onClick={handleBulkCommit} disabled={isProcessing || stagedData.length === 0}>
                            {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />}
                            Commit {stagedData.length} Rows to Ledger
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// --- Main Table Component ---
export function RevolutionaryExpenseTable({ businessId, userId }: RevolutionaryExpenseTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);

  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: expenses, isLoading, isError, refetch } = useQuery({
    queryKey: ['expenses', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').eq('business_id', businessId).order('expense_date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!businessId,
  });

  const handleExportPDF = () => {
    if (!expenses || expenses.length === 0) return;
    setIsExporting(true);
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(15, 23, 42); doc.text("EXPENDITURE AUDIT REPORT", 14, 20);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text(`LEDGER NODE: ${businessId}`, 14, 28);
    const tableBody = expenses.map(exp => [format(new Date(exp.expense_date), 'dd/MM/yyyy'), `${exp.description}\n[${exp.vendor_name || 'General'}]`, exp.category, exp.approval_status.toUpperCase(), `${new Intl.NumberFormat().format(exp.amount)} ${exp.currency || 'UGX'}`]);
    autoTable(doc, { startY: 40, head: [['DATE', 'NARRATIVE / PAYEE', 'CATEGORY', 'STATUS', 'AMOUNT']], body: tableBody, theme: 'grid', headStyles: { fillColor: [30, 41, 59], fontSize: 8 }, styles: { fontSize: 8, cellPadding: 4 } });
    doc.save(`Expense_Audit_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setIsExporting(false);
  };

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) return;
    const headers = ["Date,Description,Vendor,Category,Status,Amount,Currency"];
    const rows = expenses.map(e => `"${format(new Date(e.expense_date), 'yyyy-MM-dd')}","${e.description}","${e.vendor_name || ''}","${e.category}","${e.approval_status}",${e.amount},"${e.currency}"`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Expenditure_Ledger_${format(new Date(), 'yyyyMMdd')}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const table = useReactTable({
    data: expenses || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
  });

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search ledger entries..." value={globalFilter ?? ''} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10 bg-slate-50 border-none ring-1 ring-slate-200 focus-visible:ring-blue-500" />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Sync Ledger"><RefreshCcw className="h-4 w-4 text-slate-600" /></Button>

          <BulkImportTerminal businessId={businessId} userId={userId} onSuccess={() => refetch()} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="font-bold border-slate-200"><Download className="mr-2 h-4 w-4" /> Export <ChevronDown className="ml-1 h-3 w-3 opacity-50" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-2xl">
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2 py-2"><FileText className="h-4 w-4 text-red-500" /> <span className="font-medium">Export Professional PDF</span></DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2 py-2"><FileSpreadsheet className="h-4 w-4 text-emerald-500" /> <span className="font-medium">Export Raw CSV</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">
                    <div className={header.column.getCanSort() ? "cursor-pointer select-none flex items-center" : ""} onClick={header.column.getToggleSortingHandler()}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-32 text-center"><div className="flex flex-col items-center justify-center gap-2"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><span className="text-sm font-medium text-slate-500">Retrieving Financial Records...</span></div></TableCell></TableRow>
            ) : isError ? (
                <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-red-500 font-medium">Error synchronizing with enterprise ledger. Please check connection.</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">
                  {row.getVisibleCells().map((cell) => (<TableCell key={cell.id} className="py-4 text-slate-700">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-slate-400 font-medium italic">No expenditure records found for this business entity.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}