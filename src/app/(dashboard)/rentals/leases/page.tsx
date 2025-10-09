'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

async function fetchLeases() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('leases')
        .select('*, customers(name), rental_units(unit_identifier, properties(name))')
        .order('start_date', { ascending: false });
    if (error) throw error;
    return data;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function LeasesPage() {
    const { data: leases, isLoading } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases });

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Lease Management</h1>
                <Button asChild>
                    <Link href="/rentals/leases/new">Create New Lease</Link>
                </Button>
            </div>
             <p className="text-sm text-muted-foreground">
                View and manage all active, expired, and terminated lease agreements.
            </p>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader><TableRow><TableHead>Property / Unit</TableHead><TableHead>Tenant</TableHead><TableHead>Term</TableHead><TableHead>Monthly Rent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={5} className="text-center h-24">Loading leases...</TableCell></TableRow>}
                        {leases?.map(lease => (
                            <TableRow key={lease.id}>
                                <TableCell><div className="font-medium">{lease.rental_units?.properties?.name}</div><div className="text-sm text-muted-foreground">{lease.rental_units?.unit_identifier}</div></TableCell>
                                <TableCell>{lease.customers?.name}</TableCell>
                                <TableCell>{format(new Date(lease.start_date), 'dd MMM yyyy')} - {format(new Date(lease.end_date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>{formatCurrency(lease.monthly_rent)}</TableCell>
                                <TableCell><Badge>{lease.status}</Badge></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && !leases?.length && <TableRow><TableCell colSpan={5} className="text-center h-24">No leases found. Create your first lease agreement.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}