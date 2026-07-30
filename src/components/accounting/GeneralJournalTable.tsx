"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, addDays, subDays, addMonths, subMonths, addQuarters, subQuarters,
  addYears, subYears, getQuarter, isWithinInterval
} from "date-fns";
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2, Search, Plus, Trash2, BookOpen, ShieldCheck, Fingerprint, Activity,
  Maximize2, Minimize2, X, Zap, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  CalendarIcon, SlidersHorizontal
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { submitJournalEntry } from '@/lib/actions/journal';
import { cn } from '@/lib/utils';

// --- Types ---
interface JournalLine {
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  account?: { name: string; code: string };
}

interface JournalTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  state: string;
  lines: JournalLine[];
}

type PeriodType = 'day' | 'month' | 'quarter' | 'year' | 'custom';
type DateRange = { from?: Date; to?: Date };

function getPeriodRange(period: PeriodType, anchor: Date, customRange: DateRange): DateRange {
  switch (period) {
    case 'day':
      return { from: startOfDay(anchor), to: endOfDay(anchor) };
    case 'month':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case 'quarter':
      return { from: startOfQuarter(anchor), to: endOfQuarter(anchor) };
    case 'year':
      return { from: startOfYear(anchor), to: endOfYear(anchor) };
    case 'custom':
      return {
        from: customRange.from ? startOfDay(customRange.from) : undefined,
        to: customRange.to ? endOfDay(customRange.to) : undefined,
      };
  }
}

function getPeriodLabel(period: PeriodType, anchor: Date, customRange: DateRange) {
  switch (period) {
    case 'day': return format(anchor, 'MMM d, yyyy');
    case 'month': return format(anchor, 'MMMM yyyy');
    case 'quarter': return `Q${getQuarter(anchor)} ${format(anchor, 'yyyy')}`;
    case 'year': return format(anchor, 'yyyy');
    case 'custom':
      if (customRange.from && customRange.to) return `${format(customRange.from, 'MMM d')} – ${format(customRange.to, 'MMM d, yyyy')}`;
      if (customRange.from) return `${format(customRange.from, 'MMM d, yyyy')} – …`;
      return 'Select range';
  }
}

function shiftAnchor(period: PeriodType, anchor: Date, direction: 1 | -1) {
  switch (period) {
    case 'day': return direction === 1 ? addDays(anchor, 1) : subDays(anchor, 1);
    case 'month': return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1);
    case 'quarter': return direction === 1 ? addQuarters(anchor, 1) : subQuarters(anchor, 1);
    case 'year': return direction === 1 ? addYears(anchor, 1) : subYears(anchor, 1);
    default: return anchor;
  }
}

// --- API Functions (unchanged) ---
const fetchJournalEntries = async (businessId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounting_transactions')
    .select(`
            *,
            lines: accounting_journal_entries(
                id, 
                description, 
                debit, 
                credit, 
                account:accounting_accounts(name, code)
            )
        `)
    .eq('business_id', businessId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data as JournalTransaction[];
};

const fetchAccounts = async (businessId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('accounting_accounts')
    .select('id, name, code')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('code', { ascending: true });
  return data || [];
};

// --- Sub-Component: Create Entry Dialog ---
export const CreateEntryDialog = ({ businessId, isOpen, onClose }: { businessId: string, isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [isMaximized, setIsMaximized] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', description: '', debit: 0, credit: 0 }
  ]);

  const { data: accounts } = useQuery({
    queryKey: ['coa', businessId],
    queryFn: () => fetchAccounts(businessId),
    enabled: isOpen
  });

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

  const mutation = useMutation({
    mutationFn: submitJournalEntry,
    onSuccess: (res) => {
      if (res.success) {
        toast.success("General ledger updated");
        queryClient.invalidateQueries({ queryKey: ['journal_entries', businessId] });
        onClose();
        resetForm();
      } else {
        toast.error(`Ledger posting error: ${res.message}`);
      }
    }
  });

  const resetForm = () => {
    setDescription('');
    setReference('');
    setLines([{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }]);
  };

  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [bodyAtStart, setBodyAtStart] = useState(true);
  const [bodyAtEnd, setBodyAtEnd] = useState(true);
  const updateBodyScroll = useCallback(() => {
    if (!bodyEl) return;
    setBodyAtStart(bodyEl.scrollTop <= 1);
    setBodyAtEnd(bodyEl.scrollTop >= bodyEl.scrollHeight - bodyEl.clientHeight - 1);
  }, [bodyEl]);
  useEffect(() => {
    if (!bodyEl) return;
    updateBodyScroll();
    const ro = new ResizeObserver(updateBodyScroll);
    ro.observe(bodyEl);
    return () => ro.disconnect();
  }, [bodyEl, updateBodyScroll]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className={cn(
        "border-slate-200 shadow-xl overflow-hidden flex flex-col p-0 gap-0 transition-all duration-300 ease-out",
        isMaximized
          ? "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 m-0 w-screen h-screen max-w-none sm:max-w-none max-h-none rounded-none z-[9999]"
          : "w-full h-full sm:h-auto sm:max-h-[92vh] sm:w-[95vw] sm:max-w-6xl rounded-none sm:rounded-lg"
      )}>
        {/* Header */}
        <div className="p-5 sm:p-6 bg-white border-b relative shrink-0">
          <div className="flex items-start gap-4 pr-16 sm:pr-20">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                New journal entry
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Record a double-entry ledger transaction.
              </DialogDescription>
            </div>
          </div>

          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="hidden sm:inline-flex p-2 hover:bg-slate-100 rounded-md text-slate-400"
              aria-label={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-md text-slate-400 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          ref={setBodyEl}
          onScroll={updateBodyScroll}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-white"
        >
          {!bodyAtStart && (
            <div className="sticky top-0 z-10 h-0 flex justify-center overflow-visible pointer-events-none">
              <div className="h-6 w-6 translate-y-1 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center">
                <ChevronUp className="h-3 w-3 text-slate-400" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Posting date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 border-slate-200 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Reference</Label>
              <Input placeholder="JE-2024-001" value={reference} onChange={e => setReference(e.target.value)} className="h-10 border-slate-200 rounded-md" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
              <Label className="text-xs font-medium text-slate-500">Description</Label>
              <Input placeholder="Reason for entry..." value={description} onChange={e => setDescription(e.target.value)} className="h-10 border-slate-200 rounded-md" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6 sm:mb-8">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow className="h-11">
                    <TableHead className="w-[280px] pl-6 text-xs font-medium text-slate-500">Account</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Line description</TableHead>
                    <TableHead className="text-right w-[150px] text-xs font-medium text-slate-500">Debit</TableHead>
                    <TableHead className="text-right w-[150px] text-xs font-medium text-slate-500 pr-6">Credit</TableHead>
                    <TableHead className="w-[56px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, i) => (
                    <TableRow key={i} className="border-b border-slate-100 last:border-0">
                      <TableCell className="pl-6 py-3">
                        <Select value={line.account_id} onValueChange={(v) => { const n = [...lines]; n[i].account_id = v; setLines(n); }}>
                          <SelectTrigger className="h-10 border-slate-200 rounded-md">
                            <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-md">
                            {accounts?.map(a => <SelectItem key={a.id} value={a.id}><span className="text-slate-400 font-mono mr-2">[{a.code}]</span> {a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={e => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }}
                          placeholder={description || "Enter line description..."}
                          className="h-10 border-slate-200 rounded-md"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-10 text-right font-mono text-blue-700 border-slate-200 rounded-md"
                          value={line.debit || ''}
                          onChange={e => { const n = [...lines]; n[i].debit = parseFloat(e.target.value) || 0; n[i].credit = 0; setLines(n); }}
                        />
                      </TableCell>
                      <TableCell className="pr-6">
                        <Input
                          type="number"
                          className="h-10 text-right font-mono text-red-600 border-slate-200 rounded-md"
                          value={line.credit || ''}
                          onChange={e => { const n = [...lines]; n[i].credit = parseFloat(e.target.value) || 0; n[i].debit = 0; setLines(n); }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} disabled={lines.length <= 2} className="hover:bg-slate-100 text-slate-300 hover:text-red-500 rounded-md">
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked line cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {lines.map((line, i) => (
                <div key={i} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Line {i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} disabled={lines.length <= 2} className="h-8 w-8 hover:bg-slate-100 text-slate-300 hover:text-red-500 rounded-md">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <Select value={line.account_id} onValueChange={(v) => { const n = [...lines]; n[i].account_id = v; setLines(n); }}>
                    <SelectTrigger className="h-10 w-full border-slate-200 rounded-md">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {accounts?.map(a => <SelectItem key={a.id} value={a.id}><span className="text-slate-400 font-mono mr-2">[{a.code}]</span> {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={line.description}
                    onChange={e => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }}
                    placeholder={description || "Enter line description..."}
                    className="h-10 border-slate-200 rounded-md"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-400">Debit</Label>
                      <Input
                        type="number"
                        className="h-10 text-right font-mono text-blue-700 border-slate-200 rounded-md"
                        value={line.debit || ''}
                        onChange={e => { const n = [...lines]; n[i].debit = parseFloat(e.target.value) || 0; n[i].credit = 0; setLines(n); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-400">Credit</Label>
                      <Input
                        type="number"
                        className="h-10 text-right font-mono text-red-600 border-slate-200 rounded-md"
                        value={line.credit || ''}
                        onChange={e => { const n = [...lines]; n[i].credit = parseFloat(e.target.value) || 0; n[i].debit = 0; setLines(n); }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <Button variant="outline" onClick={() => setLines([...lines, { account_id: '', description: '', debit: 0, credit: 0 }])} className="w-full sm:w-auto h-10 px-5 rounded-md border-slate-200 font-medium hover:bg-white">
                <Plus className="w-4 h-4 mr-2" /> Add line
              </Button>
            </div>
          </div>

          {/* Balance summary */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-900 rounded-lg">
            <div className="flex justify-between sm:justify-start gap-6 sm:gap-12 font-mono">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 mb-1">Total debits</span>
                <span className="text-lg sm:text-2xl text-blue-400 font-semibold">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col border-l border-slate-700 pl-6 sm:pl-12">
                <span className="text-xs text-slate-400 mb-1">Total credits</span>
                <span className="text-lg sm:text-2xl text-red-400 font-semibold">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className={cn(
              "flex items-center justify-center gap-3 px-5 py-3 rounded-md border text-sm font-medium",
              isBalanced ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
            )}>
              {isBalanced ? <ShieldCheck size={18} /> : <Zap size={18} />}
              <div className="flex flex-col">
                <span>{isBalanced ? "Balanced" : "Unbalanced"}</span>
                {!isBalanced && <span className="text-xs font-mono text-red-300">Diff: {difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
              </div>
            </div>
          </div>

          {!bodyAtEnd && (
            <div className="sticky bottom-0 z-10 h-0 flex justify-center overflow-visible pointer-events-none">
              <div className="h-6 w-6 -translate-y-1 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center">
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending} className="w-full sm:w-auto h-10 px-5 font-medium text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ businessId, date, description, reference, lines })}
            disabled={!isBalanced || mutation.isPending}
            className="w-full sm:w-auto h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium flex items-center justify-center"
          >
            {mutation.isPending ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin shrink-0" />
                Posting...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4 shrink-0" />
                Post journal entry
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- Main Page Component ---
export default function GeneralJournalTable({ initialEntries, businessId, userId }: { initialEntries: JournalTransaction[], businessId: string, userId: string }) {
  const [filter, setFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Period filter: day / month / quarter / year / custom range
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [customRange, setCustomRange] = useState<DateRange>({});
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const tableRef = useRef<HTMLDivElement>(null);
  const [tableAtStart, setTableAtStart] = useState(true);
  const [tableAtEnd, setTableAtEnd] = useState(true);
  const updateTableScroll = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    setTableAtStart(el.scrollLeft <= 1);
    setTableAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
  }, []);
  useEffect(() => {
    updateTableScroll();
    const el = tableRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateTableScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateTableScroll]);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal_entries', businessId],
    queryFn: () => fetchJournalEntries(businessId),
    initialData: initialEntries
  });

  const range = useMemo(() => getPeriodRange(periodType, anchorDate, customRange), [periodType, anchorDate, customRange]);

  const filteredEntries = useMemo(() => {
    return entries?.filter((e: JournalTransaction) => {
      const matchesText = e.description?.toLowerCase().includes(filter.toLowerCase());
      const entryDate = new Date(e.date);
      const matchesDate = range.from && range.to
        ? isWithinInterval(entryDate, { start: range.from, end: range.to })
        : true;
      return matchesText && matchesDate;
    });
  }, [entries, filter, range]);

  // Reset to page 1 whenever the filtered set changes shape
  useEffect(() => {
    setPage(1);
  }, [filter, range.from, range.to, pageSize]);

  const totalResults = filteredEntries?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalResults);
  const paginatedEntries = useMemo(
    () => filteredEntries?.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredEntries, currentPage, pageSize]
  );

  const PeriodPicker = (
    <Popover open={periodPopoverOpen} onOpenChange={setPeriodPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 px-3 border-slate-200 rounded-md text-sm font-normal text-slate-700 justify-start gap-2 shrink-0">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          {getPeriodLabel(periodType, anchorDate, customRange)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-lg border-slate-200 shadow-lg" align="start">
        <div className="flex items-center gap-1 p-2 border-b border-slate-100">
          {(['day', 'month', 'quarter', 'year', 'custom'] as PeriodType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodType(p)}
              className={cn(
                "flex-1 text-xs font-medium px-2 py-1.5 rounded-md capitalize transition-colors",
                periodType === p ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {periodType !== 'custom' ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAnchorDate(shiftAnchor(periodType, anchorDate, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-slate-900">{getPeriodLabel(periodType, anchorDate, customRange)}</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAnchorDate(shiftAnchor(periodType, anchorDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={anchorDate}
              onSelect={(d: Date | undefined) => d && setAnchorDate(d)}
            />
          </div>
        ) : (
          <div className="p-3">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={(r: DateRange | undefined) => setCustomRange(r || {})}
              numberOfMonths={2}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6 relative">
      {/* Desktop toolbar */}
      <div className="hidden sm:flex flex-wrap justify-between items-center gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search description or reference..." value={filter} onChange={e => setFilter(e.target.value)} className="h-10 pl-9 border-slate-200 rounded-md" />
          </div>
          {PeriodPicker}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 w-10 p-0 rounded-md border-slate-200"><Fingerprint className="w-4 h-4 text-slate-400" /></Button>
          <Button onClick={() => setIsOpen(true)} className="h-10 px-5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm">
            <Plus className="w-4 h-4 mr-2" /> New entry
          </Button>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="sm:hidden px-1 space-y-2">
        {mobileSearchOpen ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                autoFocus
                placeholder="Search description or reference..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-10 pl-9 border-slate-200 rounded-md w-full"
              />
            </div>
            <button
              type="button"
              onClick={() => { setMobileSearchOpen(false); setFilter(''); }}
              className="shrink-0 h-10 px-3 text-sm font-medium text-slate-500"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                aria-label="Search"
                className="h-10 w-10 shrink-0 rounded-md border border-slate-200 bg-white flex items-center justify-center"
              >
                <Search className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                aria-label="Filters"
                className={cn(
                  "h-10 w-10 shrink-0 rounded-md border flex items-center justify-center",
                  mobileFiltersOpen ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-400"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsOpen(true)} className="h-10 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shrink-0">
                <Plus className="w-4 h-4 mr-1.5" /> New entry
              </Button>
            </div>
          </div>
        )}

        {mobileFiltersOpen && (
          <div className="flex flex-col gap-2">
            {PeriodPicker}
          </div>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-lg">
        <div className="relative">
          <Table containerRef={tableRef} onScroll={updateTableScroll} containerClassName="custom-scrollbar">
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="h-11">
                <TableHead className="w-[140px] pl-6 text-xs font-medium text-slate-500">Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Reference / description</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Ledger lines</TableHead>
                <TableHead className="text-right text-xs font-medium text-slate-500">Amount</TableHead>
                <TableHead className="text-center w-[130px] text-xs font-medium text-slate-500 pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" /></TableCell></TableRow>
              ) : totalResults === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center text-sm text-slate-400">No entries match the current filters</TableCell></TableRow>
              ) : paginatedEntries?.map((e: JournalTransaction) => (
                <TableRow key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="text-slate-700 pl-6 py-4">{format(new Date(e.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-slate-900">{e.description}</span>
                      <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit">{e.reference || 'No ref'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 py-1">
                      {e.lines?.map((l: JournalLine, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-500 gap-4">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-slate-400 font-mono">{l.account?.code}</span>
                            {l.account?.name}
                          </span>
                          <span className={cn("font-mono shrink-0", l.debit > 0 ? "text-blue-600" : "text-red-600")}>
                            {l.debit > 0 ? `${l.debit.toFixed(2)} Dr` : `${l.credit.toFixed(2)} Cr`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900 font-mono">
                    {e.lines?.reduce((s: number, l: JournalLine) => s + l.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium py-1 px-2.5 rounded-md">
                      Posted
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!tableAtStart && (
            <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center">
              <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
          {!tableAtEnd && (
            <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-slate-500">
            {totalResults === 0 ? 'No entries' : `Showing ${startIdx}–${endIdx} of ${totalResults}`}
          </span>
          <div className="flex items-center gap-3">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-[110px] border-slate-200 rounded-md text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-200 rounded-md"
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 px-2 min-w-[90px] text-center">Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-200 rounded-md"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" /> Live ledger sync active</div>
          <div>Auth: {userId.substring(0, 8)}...</div>
        </div>
      </Card>

      <CreateEntryDialog businessId={businessId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}