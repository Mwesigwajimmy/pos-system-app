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
  Loader2, Search, X, DollarSign, Filter 
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

// --- Types ---

export interface Invoice {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount_due: number; // calculated as total - paid
  total_amount: number;
  amount_paid: number;
  due_date: string;
  currency: string;
  status: string;
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
  invoices: Invoice[]; // Keep track of the actual invoices for drill-down/payment
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
            toast.success("Payment received successfully");
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
                        Receiving payment for Invoice <strong>{invoice.invoice_number}</strong> from {invoice.customer_name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Amount Due</Label>
                        <div className="col-span-3 font-mono">
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
                            max={invoice.amount_due}
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
  const [filter, setFilter] = useState('');
  
  // Interaction State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // TanStack Query for live updates
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', businessId],
    queryFn: () => fetchInvoicesClient(businessId),
    initialData: initialInvoices
  });

  // Aggregation Logic (Client-Side for flexibility)
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
                invoices: [] // Store references
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

  const openPaymentForOldest = (customerRow: AgedReceivable) => {
      // Find the oldest invoice for this customer to encourage paying off debt
      const oldest = customerRow.invoices.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      if (oldest) {
          setSelectedInvoice(oldest);
          setIsPaymentOpen(true);
      }
  };

  return (
    <div className="space-y-4">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filter by customer..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8" 
                />
            </div>
            <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Export Report
            </Button>
        </div>

        <Card>
        <CardHeader>
            <CardTitle>Aging Report</CardTitle>
            <CardDescription>
                Overview of amounts due by customer and aging period.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[600px] border rounded-md">
            <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="w-[200px]">Customer</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Current (0-30)</TableHead>
                    <TableHead className="text-right text-yellow-600">31-60 Days</TableHead>
                    <TableHead className="text-right text-orange-600">61-90 Days</TableHead>
                    <TableHead className="text-right text-red-600 font-bold">90+ Days</TableHead>
                    <TableHead className="text-right font-bold">Total Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                    </TableRow>
                ) : filtered.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No outstanding receivables found.
                    </TableCell>
                    </TableRow>
                ) : (
                    filtered.map((r, idx) => (
                    <TableRow key={`${r.customer}-${idx}`} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span>{r.customer}</span>
                                <span className="text-xs text-muted-foreground">{r.invoices.length} inv</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary">{r.currency}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {r.due_0_30 > 0 ? formatCurrency(r.due_0_30, r.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-yellow-700 bg-yellow-50/50">
                            {r.due_31_60 > 0 ? formatCurrency(r.due_31_60, r.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-orange-700 bg-orange-50/50">
                            {r.due_61_90 > 0 ? formatCurrency(r.due_61_90, r.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-700 bg-red-50/50 font-semibold">
                            {r.due_90_plus > 0 ? formatCurrency(r.due_90_plus, r.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                            {formatCurrency(r.total, r.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openPaymentForOldest(r)}>
                                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                                <span className="text-xs">Receive</span>
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            </ScrollArea>
        </CardContent>
        </Card>

        {/* Payment Modal */}
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
}