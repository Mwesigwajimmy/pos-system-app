'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// FIXED: Define the shape of a single invoice object.
interface UnpaidInvoice {
    invoice_id: number;
    tenant_name: string;
    property_name: string;
    unit_identifier: string;
    due_date: string;
    amount_due: number;
}

// FIXED: Specify that the function returns a promise of an array of UnpaidInvoice.
async function fetchUnpaidInvoices(): Promise<UnpaidInvoice[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_unpaid_invoices');
    if (error) throw error;
    return data || []; // Ensure we always return an array
}

async function recordPayment(invoiceId: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('record_rent_payment', { p_invoice_id: invoiceId });
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function UnpaidInvoices() {
    const queryClient = useQueryClient();
    // FIXED: Provide the expected data type to the useQuery hook.
    const { data: invoices, isLoading } = useQuery<UnpaidInvoice[]>({ queryKey: ['unpaidInvoices'], queryFn: fetchUnpaidInvoices });
    
    const mutation = useMutation({
        mutationFn: recordPayment,
        onSuccess: () => {
            toast.success("Payment recorded successfully!");
            queryClient.invalidateQueries({ queryKey: ['unpaidInvoices'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center h-24">Loading invoices...</TableCell></TableRow>}
                {/* Because 'invoices' is now correctly typed, TypeScript knows the shape of 'inv' here. */}
                {invoices?.map(inv => (
                    <TableRow key={inv.invoice_id}>
                        <TableCell>{inv.tenant_name}</TableCell>
                        <TableCell>{inv.property_name} ({inv.unit_identifier})</TableCell>
                        <TableCell>{format(new Date(inv.due_date), 'dd MMM, yyyy')}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.amount_due)}</TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" onClick={() => mutation.mutate(inv.invoice_id)} disabled={mutation.isPending && mutation.variables === inv.invoice_id}>
                                {mutation.isPending && mutation.variables === inv.invoice_id ? "Recording..." : "Record Payment"}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {!isLoading && !invoices?.length && <TableRow><TableCell colSpan={5} className="text-center h-24">No unpaid invoices found.</TableCell></TableRow>}
            </TableBody>
        </Table>
    );
}