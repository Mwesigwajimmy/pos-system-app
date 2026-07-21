"use client";

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, parseISO, format, isWithinInterval, subDays } from 'date-fns';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { 
  Loader2, Search, X, DollarSign, Filter, 
  CheckSquare, History, CheckCircle2, ShieldAlert,
  MoreVertical, ArrowRight, Plus, Calendar as CalendarIcon,
  Activity, FileText, Clock
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
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox"; 
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// --- IMPORT COMPONENTS ---
import CreateDirectIncomeModal from './CreateDirectIncomeModal';
import DirectIncomeLedger from './DirectIncomeLedger'; // Added this import

// --- Enterprise Types ---

export type InvoiceStatus = 'draft' | 'awaiting_approval' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'ISSUED' | 'Paid' | 'Draft';

export interface Invoice {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount_due: number; 
  total_amount: number;
  amount_paid: number;
  due_date: string;
  issue_date?: string;
  currency: string;
  status: InvoiceStatus;
  entity?: string;
  country?: string;
}

interface AgedReceivable {
  customer: string;
  currency: string;
  due_0_30: number;
  due_31_60: number;
  due_61_90: number;
  due_90_plus: number;
  total: number;
  invoices: Invoice[]; 
}

interface Props {
  initialInvoices: Invoice[];
  businessId: string;
}

// --- API Functions ---

const fetchInvoicesClient = async (businessId: string) => {
    const supabase = createClient();
    
    const { data, error } = await supabase
        .from('accounting_invoices')
        .select('*')
        .eq('business_id', businessId)
        .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    
    return data.map((inv: any) => ({
        ...inv,
        amount_due: Number(inv.amount_due || (Number(inv.total_amount || 0) - Number(inv.amount_paid || 0)))
    })) as Invoice[];
};

const fetchDepositAccounts = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, currency, balance')
        .eq('business_id', businessId)
        .in('type', ['Bank', 'Cash']) 
        .eq('is_active', true);

    if (error) throw new Error(error.message);
    return data;
};

const receivePayment = async (payload: { invoice_id: string; account_id: string; amount: number; payment_date: string, business_id: string }) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('receive_invoice_payment', {
        p_invoice_id: payload.invoice_id,
        p_account_id: payload.account_id,
        p_amount: payload.amount,
        p_date: payload.payment_date,
        p_business_id: payload.business_id
    });
    if (error) throw new Error(error.message);
    return data;
};

// --- Sub-Component: Receive Payment Dialog ---

const ReceivePaymentDialog = ({ invoice, businessId, isOpen, onClose }: { invoice: Invoice | null, businessId: string, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState<string>('');
    const [accountId, setAccountId] = useState<string>('');

    const { data: accounts } = useQuery({
        queryKey: ['deposit_accounts', businessId],
        queryFn: () => fetchDepositAccounts(businessId),
        enabled: isOpen
    });

    React.useEffect(() => {
        if (invoice) {
            setAmount(invoice.amount_due.toString());
        }
    }, [invoice]);

    const mutation = useMutation({
        mutationFn: receivePayment,
        onSuccess: () => {
            toast.success("Payment received & Ledger updated");
            queryClient.invalidateQueries({ queryKey: ['invoices', businessId] });
            onClose();
        },
        onError: (err) => toast.error(err.message)
    });

    const handleSubmit = () => {
        if (!invoice || !accountId || !amount) return;
        mutation.mutate({
            invoice_id: invoice.id,
            account_id: accountId,
            amount: parseFloat(amount),
            payment_date: new Date().toISOString(),
            business_id: businessId
        });
    };

    if (!invoice) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Receive Payment</DialogTitle>
                    <DialogDescription>
                        Confirm payment for <strong>{invoice.invoice_number}</strong>.
                        {(invoice.status !== 'approved' && invoice.status !== 'ISSUED') && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                Note: This invoice is pending approval but payment can be forced by authorized users.
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Amount Due</Label>
                        <div className="col-span-3 font-mono font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency || 'UGX' }).format(invoice.amount_due)}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Deposit To</Label>
                        <Select onValueChange={setAccountId} value={accountId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Bank Account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts?.map((acc: any) => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Amount</Label>
                        <Input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---

export default function AgedReceivablesTable({ initialInvoices, businessId }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  
  // --- ACTIVATION STATES ---
  const [currentView, setCurrentView] = useState<'aging' | 'ledger'>('aging'); // Added view state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDirectIncomeOpen, setIsDirectIncomeOpen] = useState(false);

  // TanStack Query for live updates
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', businessId],
    queryFn: () => fetchInvoicesClient(businessId),
    initialData: initialInvoices,
    refetchOnMount: true,
    staleTime: 0 
  });

  // Aggregation Logic (Now Reacting to Filters and Date Range)
  const receivables = useMemo(() => {
    if (!invoices) return [];
    
    const today = new Date();
    const aggregation: Record<string, AgedReceivable> = {};

    invoices.forEach((inv) => {
        // 1. Status Advanced Filtering
        if (statusFilter.length > 0 && !statusFilter.includes(inv.status)) return;

        // 2. Date Range Filtering
        const recordDate = parseISO(inv.issue_date || inv.due_date || new Date().toISOString());
        if (dateRange?.from && dateRange?.to) {
            if (!isWithinInterval(recordDate, { start: dateRange.from, end: dateRange.to })) return;
        }

        const customer = inv.customer_name || 'Unknown';
        const currency = inv.currency || 'UGX';
        const key = `${customer}-${currency}`;

        if (!aggregation[key]) {
            aggregation[key] = {
                customer,
                currency,
                due_0_30: 0,
                due_31_60: 0,
                due_61_90: 0,
                due_90_plus: 0,
                total: 0,
                invoices: [] 
            };
        }

        const dueDateString = inv.due_date || new Date().toISOString();
        const dueDate = parseISO(dueDateString);
        const daysOverdue = differenceInDays(today, dueDate);
        const amount = Number(inv.amount_due || 0);

        if (daysOverdue <= 30) aggregation[key].due_0_30 += amount;
        else if (daysOverdue <= 60) aggregation[key].due_31_60 += amount;
        else if (daysOverdue <= 90) aggregation[key].due_61_90 += amount;
        else aggregation[key].due_90_plus += amount;

        aggregation[key].total += amount;
        aggregation[key].invoices.push(inv);
    });

    return Object.values(aggregation).sort((a, b) => b.total - a.total);
  }, [invoices, dateRange, statusFilter]);

  // Search Filtering
  const filtered = useMemo(() => 
    receivables.filter(r => r.customer.toLowerCase().includes(filter.toLowerCase())), 
  [receivables, filter]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const toggleSelectRow = (ids: string[]) => {
      setSelectedInvoiceIds(prev => {
          const allSelected = ids.every(id => prev.includes(id));
          if (allSelected) {
              return prev.filter(id => !ids.includes(id));
          } else {
              return Array.from(new Set([...prev, ...ids]));
          }
      });
  };

  const openPaymentForOldest = (customerRow: AgedReceivable) => {
      const oldest = customerRow.invoices.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      if (oldest) {
          setSelectedInvoice(oldest);
          setIsPaymentOpen(true);
      }
  };

  // --- LOGIC SWITCH FOR DIRECT INCOME LEDGER ---
  if (currentView === 'ledger') {
      return (
        <DirectIncomeLedger 
            businessId={businessId} 
            onBack={() => setCurrentView('aging')} 
        />
      );
  }

  return (
    <div className="relative space-y-4">
        {/* Top Controls - ACTIVATED */}
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search customer ledger..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        className="pl-9 h-11 bg-white border-slate-200 rounded-xl" 
                    />
                </div>

                {/* DATE RANGE PICKER ACTIVATION */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-11 justify-start text-left font-normal bg-white border-slate-200 rounded-xl px-4 min-w-[260px]", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                            {dateRange?.from ? (
                                dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))
                            ) : (<span>Filter by date range</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex gap-2">
                <Button onClick={() => setIsDirectIncomeOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md h-11 px-6 rounded-xl font-bold">
                    <Plus className="mr-2 h-4 w-4" /> Record Direct Income
                </Button>

                {/* AUDIT TRAIL BUTTON ACTIVATED */}
                <Button variant="outline" onClick={() => setIsAuditOpen(true)} className="h-11 rounded-xl border-slate-200 bg-white">
                    <History className="mr-2 h-4 w-4 text-slate-500" /> Audit Trail
                </Button>

                {/* ADVANCED FILTER BUTTON ACTIVATED */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white">
                            <Filter className="mr-2 h-4 w-4 text-slate-500" /> Advanced Filter
                            {statusFilter.length > 0 && <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">{statusFilter.length}</Badge>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 rounded-2xl shadow-xl border-slate-200" align="end">
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500">Filter by Status</h4>
                            <div className="grid gap-2">
                                {['ISSUED', 'partially_paid', 'overdue', 'Draft', 'Approved'].map((status) => (
                                    <div key={status} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={status} 
                                            checked={statusFilter.includes(status)}
                                            onCheckedChange={(checked) => {
                                                setStatusFilter(prev => checked ? [...prev, status] : prev.filter(s => s !== status))
                                            }}
                                        />
                                        <label htmlFor={status} className="text-sm font-medium leading-none capitalize">{status.replace('_', ' ')}</label>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full text-xs text-red-500 h-8" onClick={() => setStatusFilter([])}>Reset Filters</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b py-6 px-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-2xl font-bold text-slate-900">Receivables Aging Analysis</CardTitle>
                        {/* THE REQUESTED BUTTON ADDED HERE WITHOUT OVERCROWDING THE TOP */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentView('ledger')}
                            className="h-7 px-3 rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                        >
                            <FileText className="mr-1.5 h-3.5 w-3.5" /> View Registry
                        </Button>
                    </div>
                    <CardDescription className="text-slate-500 font-medium">
                        Monitoring liquid assets and customer credit risk exposure.
                    </CardDescription>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-right min-w-[200px]">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Aggregate Exposure</p>
                    <p className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
                        {formatCurrency(receivables.reduce((acc, r) => acc + r.total, 0), 'UGX')}
                    </p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
            <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                <TableRow>
                    <TableHead className="w-[50px] pl-8">
                        <Checkbox 
                            checked={selectedInvoiceIds.length > 0 && selectedInvoiceIds.length === (invoices?.length || 0)}
                            onCheckedChange={() => toggleSelectAll(invoices || [])}
                        />
                    </TableHead>
                    <TableHead className="w-[200px] font-bold text-slate-500 uppercase text-[10px] tracking-widest">Customer Entity</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Workflow</TableHead>
                    <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest">0-30 Days</TableHead>
                    <TableHead className="text-right font-bold text-yellow-600 uppercase text-[10px] tracking-widest bg-yellow-50/20">31-60 Days</TableHead>
                    <TableHead className="text-right font-bold text-orange-600 uppercase text-[10px] tracking-widest bg-orange-50/20">61-90 Days</TableHead>
                    <TableHead className="text-right font-bold text-red-600 uppercase text-[10px] tracking-widest bg-red-50/20">90+ Overdue</TableHead>
                    <TableHead className="text-right font-bold text-slate-900 uppercase text-[10px] tracking-widest pr-8">Total Exposure</TableHead>
                    <TableHead className="w-20"></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-20 text-slate-400 italic bg-slate-50/20">No matching receivables detected within the current selection.</TableCell></TableRow>
                ) : (
                    filtered.map((r, idx) => {
                        const rowInvoiceIds = r.invoices.map(i => i.id);
                        const isPartiallySelected = rowInvoiceIds.some(id => selectedInvoiceIds.includes(id));
                        
                        return (
                            <TableRow key={`${r.customer}-${idx}`} className={cn("h-20 hover:bg-slate-50 transition-colors border-b border-slate-100", isPartiallySelected && "bg-blue-50/50")}>
                                <TableCell className="pl-8">
                                    <Checkbox 
                                        checked={rowInvoiceIds.every(id => selectedInvoiceIds.includes(id))}
                                        onCheckedChange={() => toggleSelectRow(rowInvoiceIds)}
                                    />
                                </TableCell>
                                <TableCell className="font-semibold">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                                            {r.customer.substring(0,2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{r.customer}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{r.invoices.length} Active Documents</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {r.invoices.some(i => i.status === 'awaiting_approval' || i.status === 'Draft') ? (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 rounded-lg py-1">
                                            <ShieldAlert className="w-3 h-3" /> Approval Req.
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-lg py-1">Verified</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-medium">
                                    {r.due_0_30 > 0 ? formatCurrency(r.due_0_30, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-yellow-700 font-mono text-sm font-bold bg-yellow-50/10">
                                    {r.due_31_60 > 0 ? formatCurrency(r.due_31_60, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-orange-700 font-mono text-sm font-bold bg-orange-50/10">
                                    {r.due_61_90 > 0 ? formatCurrency(r.due_61_90, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-red-700 font-black font-mono text-sm bg-red-50/20">
                                    {r.due_90_plus > 0 ? formatCurrency(r.due_90_plus, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-900 pr-8">
                                    {formatCurrency(r.total, r.currency)}
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => openPaymentForOldest(r)}>
                                            <DollarSign className="h-4 w-4 text-emerald-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-400">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })
                )}
                </TableBody>
            </Table>
            </ScrollArea>
        </CardContent>
        </Card>

        {/* --- AUDIT TRAIL SIDEBAR ACTIVATION --- */}
        <Sheet open={isAuditOpen} onOpenChange={setIsAuditOpen}>
            <SheetContent className="sm:max-w-md border-l-0 shadow-2xl">
                <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" /> Enterprise Audit Trail
                    </SheetTitle>
                    <SheetDescription>Forensic log of all receivable movements for this business.</SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
                    <div className="space-y-6">
                        {/* WELDING: Rendering recent invoices as placeholder audit activity */}
                        {invoices?.slice(0, 15).map((inv, i) => (
                            <div key={i} className="flex gap-4 relative">
                                {i !== 14 && <div className="absolute left-[19px] top-10 w-[2px] h-full bg-slate-100" />}
                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 z-10 border border-white">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-900">Receivable Generated: {inv.invoice_number}</p>
                                    <p className="text-xs text-slate-500 font-medium">Recorded for {inv.customer_name}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-500 border-slate-200 uppercase font-black tracking-widest">
                                            <Clock className="w-3 h-3 mr-1" /> {format(parseISO(inv.issue_date || inv.due_date || new Date().toISOString()), 'MMM dd, HH:mm')}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-emerald-600">+{formatCurrency(inv.total_amount, inv.currency)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>

        {/* --- FLOATING BULK ACTION BAR --- */}
        {selectedInvoiceIds.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-bold">{selectedInvoiceIds.length} Items Selected</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6">
                        Process Batch Payments
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setSelectedInvoiceIds([])} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )}

        <ReceivePaymentDialog 
            invoice={selectedInvoice}
            businessId={businessId}
            isOpen={isPaymentOpen}
            onClose={() => {
                setIsPaymentOpen(false);
                setSelectedInvoice(null);
            }}
        />

        <CreateDirectIncomeModal 
            businessId={businessId}
            isOpen={isDirectIncomeOpen}
            onClose={() => setIsDirectIncomeOpen(false)}
        />
    </div>
  );

  function toggleSelectAll(allInvoices: Invoice[]) {
      if (selectedInvoiceIds.length === (allInvoices?.length || 0)) {
          setSelectedInvoiceIds([]);
      } else {
          setSelectedInvoiceIds(allInvoices.map(i => i.id));
      }
  }
}