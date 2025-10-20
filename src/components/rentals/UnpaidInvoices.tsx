'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface UnpaidInvoice {
    invoice_id: number;
    tenant_name: string;
    property_name: string;
    unit_identifier: string;
    due_date: string;
    amount_due: number;
}

async function fetchUnpaidInvoices(): Promise<UnpaidInvoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_unpaid_invoices');
    if (error) throw error;
    return data || [];
}

async function recordPayment(invoiceId: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('record_rent_payment', { p_invoice_id: invoiceId });
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function UnpaidInvoices() {
    const queryClient = useQueryClient();
    const { data: invoices, isLoading } = useQuery<UnpaidInvoice[]>({ queryKey: ['unpaidInvoices'], queryFn: fetchUnpaidInvoices });
    
    const mutation = useMutation({
        mutationFn: recordPayment,
        onSuccess: (data, variables) => {
            toast.success(`Payment for Invoice #${variables} recorded successfully!`);
            queryClient.invalidateQueries({ queryKey: ['unpaidInvoices'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading unpaid invoices...</TableCell></TableRow>}
                    {invoices?.map(inv => {
                        const isOverdue = new Date(inv.due_date) < new Date();
                        return (
                            <TableRow key={inv.invoice_id}>
                                <TableCell className="font-medium">#{inv.invoice_id}</TableCell>
                                <TableCell>{inv.tenant_name}</TableCell>
                                <TableCell>{inv.property_name} ({inv.unit_identifier})</TableCell>
                                <TableCell>
                                    {format(new Date(inv.due_date), 'dd MMM, yyyy')}
                                    {isOverdue && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(inv.amount_due)}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => mutation.mutate(inv.invoice_id)} disabled={mutation.isPending && mutation.variables === inv.invoice_id}>
                                        {mutation.isPending && mutation.variables === inv.invoice_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Record Full Payment
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {!isLoading && !invoices?.length && <TableRow><TableCell colSpan={6} className="h-24 text-center">No unpaid invoices found. All accounts are settled!</TableCell></TableRow>}
                </TableBody>
            </Table>
        </div>
    );
}