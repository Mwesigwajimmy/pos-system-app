'use client';

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
  Loader2, Search, Filter, DollarSign 
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
// FIX: Made amount_due optional in the base type to accept raw data from parent
export interface Bill {
  id: string;
  vendor_name: string;
  reference_number: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  currency: string;
  status: string;
  amount_due?: number; // Optional on input
}

// Internal type for calculation with guaranteed amount_due
interface ProcessedBill extends Bill {
    amount_due: number;
}

interface AgedPayable {
  supplier: string;
  currency: string;
  due_0_30: number;
  due_31_60: number;
  due_61_90: number;
  due_90_plus: number;
  total: number;
  bills: ProcessedBill[];
}

interface Props {
  initialBills: Bill[]; // Accepts the Bills from the parent component
  businessId: string;
}

// --- API Functions ---

const fetchBillsClient = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_bills')
        .select('*')
        .eq('business_id', businessId)
        .neq('status', 'paid')
        .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    
    // Calculate amount_due on fetch
    return data.map((bill: any) => ({
        ...bill,
        amount_due: bill.total_amount - bill.amount_paid
    })) as ProcessedBill[];
};

const fetchPaymentAccounts = async (businessId: string) => {
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

const payBill = async (payload: { bill_id: string; account_id: string; amount: number; payment_date: string, business_id: string }) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('record_bill_payment', {
        p_bill_id: payload.bill_id,
        p_account_id: payload.account_id,
        p_amount: payload.amount,
        p_date: payload.payment_date,
        p_business_id: payload.business_id
    });
    if (error) throw new Error(error.message);
    return data;
};

// --- Sub-Component: Payment Dialog ---

const PayBillDialog = ({ bill, businessId, isOpen, onClose }: { bill: ProcessedBill | null, businessId: string, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState<string>('');
    const [accountId, setAccountId] = useState<string>('');

    const { data: accounts } = useQuery({
        queryKey: ['payment_accounts', businessId],
        queryFn: () => fetchPaymentAccounts(businessId),
        enabled: isOpen
    });

    React.useEffect(() => {
        if (bill) {
            setAmount(bill.amount_due.toString());
        }
    }, [bill]);

    const mutation = useMutation({
        mutationFn: payBill,
        onSuccess: () => {
            toast.success("Payment recorded successfully");
            queryClient.invalidateQueries({ queryKey: ['payables'] });
            onClose();
        },
        onError: (err) => toast.error(err.message)
    });

    const handleSubmit = () => {
        if (!bill || !accountId || !amount) return;
        mutation.mutate({
            bill_id: bill.id,
            account_id: accountId,
            amount: parseFloat(amount),
            payment_date: new Date().toISOString(),
            business_id: businessId
        });
    };

    if (!bill) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Bill Payment</DialogTitle>
                    <DialogDescription>
                        Paying <strong>{bill.vendor_name}</strong> (Ref: {bill.reference_number}).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Balance Due</Label>
                        <div className="col-span-3 font-mono">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: bill.currency }).format(bill.amount_due)}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Pay From</Label>
                        <Select onValueChange={setAccountId} value={accountId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts?.map((acc: any) => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency}) - Bal: {acc.balance.toLocaleString()}</SelectItem>
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
                            max={bill.amount_due}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---

export default function AgedPayablesTable({ initialBills, businessId }: Props) {
  const [filter, setFilter] = useState('');
  
  // Interaction State
  const [selectedBill, setSelectedBill] = useState<ProcessedBill | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // FIX: Pre-process initial data to ensure amount_due exists
  const processedInitialData: ProcessedBill[] = useMemo(() => {
      return initialBills.map(b => ({
          ...b,
          amount_due: b.amount_due !== undefined ? b.amount_due : (b.total_amount - b.amount_paid)
      }));
  }, [initialBills]);

  // TanStack Query
  const { data: bills, isLoading } = useQuery({
    queryKey: ['payables', businessId],
    queryFn: () => fetchBillsClient(businessId),
    initialData: processedInitialData
  });

  // Aggregation Logic
  const payables = useMemo(() => {
    if (!bills) return [];
    
    const today = new Date();
    const aggregation: Record<string, AgedPayable> = {};

    bills.forEach((bill) => {
        // Skip fully paid bills if they somehow slipped in
        if (bill.amount_due <= 0) return;

        const supplier = bill.vendor_name || 'Unknown';
        const currency = bill.currency || 'USD';
        const key = `${supplier}-${currency}`;

        if (!aggregation[key]) {
            aggregation[key] = {
                supplier,
                currency,
                due_0_30: 0,
                due_31_60: 0,
                due_61_90: 0,
                due_90_plus: 0,
                total: 0,
                bills: [] 
            };
        }

        const dueDate = parseISO(bill.due_date);
        const daysOverdue = differenceInDays(today, dueDate);
        const amount = bill.amount_due;

        if (daysOverdue <= 30) aggregation[key].due_0_30 += amount;
        else if (daysOverdue <= 60) aggregation[key].due_31_60 += amount;
        else if (daysOverdue <= 90) aggregation[key].due_61_90 += amount;
        else aggregation[key].due_90_plus += amount;

        aggregation[key].total += amount;
        aggregation[key].bills.push(bill);
    });

    return Object.values(aggregation).sort((a, b) => b.total - a.total);
  }, [bills]);

  // Filtering
  const filtered = useMemo(() => 
    payables.filter(p => p.supplier.toLowerCase().includes(filter.toLowerCase())), 
  [payables, filter]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const openPaymentForOldest = (supplierRow: AgedPayable) => {
      // Find the oldest bill to prioritize paying off debt
      const oldest = supplierRow.bills.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      if (oldest) {
          setSelectedBill(oldest);
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
                    placeholder="Filter by supplier..." 
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
            <CardTitle>Aging Report (Payables)</CardTitle>
            <CardDescription>
                Overview of amounts you owe to vendors by aging period.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[600px] border rounded-md">
            <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="w-[200px]">Supplier</TableHead>
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
                        No outstanding payables found.
                    </TableCell>
                    </TableRow>
                ) : (
                    filtered.map((p, idx) => (
                    <TableRow key={`${p.supplier}-${idx}`} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span>{p.supplier}</span>
                                <span className="text-xs text-muted-foreground">{p.bills.length} bills</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary">{p.currency}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {p.due_0_30 > 0 ? formatCurrency(p.due_0_30, p.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-yellow-700 bg-yellow-50/50">
                            {p.due_31_60 > 0 ? formatCurrency(p.due_31_60, p.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-orange-700 bg-orange-50/50">
                            {p.due_61_90 > 0 ? formatCurrency(p.due_61_90, p.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-700 bg-red-50/50 font-semibold">
                            {p.due_90_plus > 0 ? formatCurrency(p.due_90_plus, p.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                            {formatCurrency(p.total, p.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openPaymentForOldest(p)}>
                                <DollarSign className="h-4 w-4 mr-1 text-red-600" />
                                <span className="text-xs">Pay</span>
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

        {/* Pay Bill Modal */}
        <PayBillDialog 
            bill={selectedBill}
            businessId={businessId}
            isOpen={isPaymentOpen}
            onClose={() => {
                setIsPaymentOpen(false);
                setSelectedBill(null);
            }}
        />
    </div>
  );
}