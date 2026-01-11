"use client";

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';
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
  MoreVertical, ArrowRight
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox"; // Assuming standard shadcn checkbox
import { cn } from "@/lib/utils";

// --- Enterprise Types ---

export type InvoiceStatus = 'draft' | 'awaiting_approval' | 'approved' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount_due: number; 
  total_amount: number;
  amount_paid: number;
  due_date: string;
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
        .neq('status', 'paid')
        .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    
    return data.map((inv: any) => ({
        ...inv,
        amount_due: inv.total_amount - inv.amount_paid
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

// Enterprise Action: Receive Payment
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

// Enterprise Action: Bulk Approval
const bulkApproveInvoices = async (payload: { invoice_ids: string[], business_id: string }) => {
    const supabase = createClient();
    const { error } = await supabase
        .from('accounting_invoices')
        .update({ status: 'approved' })
        .in('id', payload.invoice_ids)
        .eq('business_id', payload.business_id);
    
    if (error) throw new Error(error.message);
    return true;
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
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
                        {invoice.status !== 'approved' && (
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
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.amount_due)}
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
  
  // Enterprise State: Selection & Workflow
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // TanStack Query for live updates
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', businessId],
    queryFn: () => fetchInvoicesClient(businessId),
    initialData: initialInvoices
  });

  // Aggregation Logic (Aged Buckets)
  const receivables = useMemo(() => {
    if (!invoices) return [];
    
    const today = new Date();
    const aggregation: Record<string, AgedReceivable> = {};

    invoices.forEach((inv) => {
        const customer = inv.customer_name || 'Unknown';
        const currency = inv.currency || 'USD';
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

        const dueDate = parseISO(inv.due_date);
        const daysOverdue = differenceInDays(today, dueDate);
        const amount = inv.amount_due;

        if (daysOverdue <= 30) aggregation[key].due_0_30 += amount;
        else if (daysOverdue <= 60) aggregation[key].due_31_60 += amount;
        else if (daysOverdue <= 90) aggregation[key].due_61_90 += amount;
        else aggregation[key].due_90_plus += amount;

        aggregation[key].total += amount;
        aggregation[key].invoices.push(inv);
    });

    return Object.values(aggregation).sort((a, b) => b.total - a.total);
  }, [invoices]);

  // Filtering
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

  // Bulk Action Mutation
  const bulkApproveMutation = useMutation({
      mutationFn: bulkApproveInvoices,
      onSuccess: () => {
          toast.success(`Successfully approved ${selectedInvoiceIds.length} invoices`);
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          setSelectedInvoiceIds([]);
      }
  });

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

  return (
    <div className="relative space-y-4">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 max-w-sm w-full">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search customer ledger..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        className="pl-8" 
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm">
                    <History className="mr-2 h-4 w-4" /> Audit Trail
                </Button>
                <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" /> Advanced Filter
                </Button>
            </div>
        </div>

        <Card className="border-none shadow-lg">
        <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-xl">Receivables Aging Analysis</CardTitle>
                    <CardDescription>
                        Monitoring liquid assets and customer credit risk exposure.
                    </CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Outstanding</p>
                    <p className="text-2xl font-black text-primary">
                        {formatCurrency(receivables.reduce((acc, r) => acc + r.total, 0), 'USD')}
                    </p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
            <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox 
                            checked={selectedInvoiceIds.length > 0 && selectedInvoiceIds.length === invoices?.length}
                            onCheckedChange={() => toggleSelectAll(invoices || [])}
                        />
                    </TableHead>
                    <TableHead className="w-[200px]">Customer Entity</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead className="text-right">0-30 Days</TableHead>
                    <TableHead className="text-right text-yellow-600">31-60 Days</TableHead>
                    <TableHead className="text-right text-orange-600">61-90 Days</TableHead>
                    <TableHead className="text-right text-red-600 font-bold">90+ Overdue</TableHead>
                    <TableHead className="text-right font-bold">Total Exposure</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground italic">No receivables detected.</TableCell></TableRow>
                ) : (
                    filtered.map((r, idx) => {
                        const rowInvoiceIds = r.invoices.map(i => i.id);
                        const isPartiallySelected = rowInvoiceIds.some(id => selectedInvoiceIds.includes(id));
                        
                        return (
                            <TableRow key={`${r.customer}-${idx}`} className={cn("hover:bg-blue-50/30 transition-colors", isPartiallySelected && "bg-blue-50/50")}>
                                <TableCell>
                                    <Checkbox 
                                        checked={rowInvoiceIds.every(id => selectedInvoiceIds.includes(id))}
                                        onCheckedChange={() => toggleSelectRow(rowInvoiceIds)}
                                    />
                                </TableCell>
                                <TableCell className="font-semibold">
                                    <div className="flex flex-col">
                                        <span>{r.customer}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{r.invoices.length} Active Documents</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {r.invoices.some(i => i.status === 'awaiting_approval') ? (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
                                            <ShieldAlert className="w-3 h-3" /> Approval Req.
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                    {r.due_0_30 > 0 ? formatCurrency(r.due_0_30, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-yellow-700 font-mono text-sm">
                                    {r.due_31_60 > 0 ? formatCurrency(r.due_31_60, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-orange-700 font-mono text-sm">
                                    {r.due_61_90 > 0 ? formatCurrency(r.due_61_90, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-red-700 font-black font-mono text-sm bg-red-50/20">
                                    {r.due_90_plus > 0 ? formatCurrency(r.due_90_plus, r.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                    {formatCurrency(r.total, r.currency)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPaymentForOldest(r)}>
                                            <DollarSign className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                                            <History className="h-4 w-4" />
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

        {/* --- FLOATING BULK ACTION BAR --- */}
        {selectedInvoiceIds.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-bold">{selectedInvoiceIds.length} Items Selected</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-white hover:bg-slate-800 hover:text-green-400"
                        onClick={() => bulkApproveMutation.mutate({ invoice_ids: selectedInvoiceIds, business_id: businessId })}
                        disabled={bulkApproveMutation.isPending}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Bulk Approve
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold">
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
    </div>
  );

  function toggleSelectAll(allInvoices: Invoice[]) {
      if (selectedInvoiceIds.length === allInvoices.length) {
          setSelectedInvoiceIds([]);
      } else {
          setSelectedInvoiceIds(allInvoices.map(i => i.id));
      }
  }
}