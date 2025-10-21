'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';

// THE FIX IS HERE: We define the precise shape of a LoanApplication object.
interface LoanApplication {
    id: number; // Or string if it's a UUID
    customer_name: string;
    product_name: string;
    principal_amount: number;
    status: string;
    application_date: string; // Dates often come as ISO strings
}

// Professional Practice: We also type the return value of our fetching function.
async function fetchLoanApplications(): Promise<LoanApplication[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_paginated_loan_applications');
    if (error) throw new Error(error.message);
    // We cast the data to our type to ensure consistency.
    return data as LoanApplication[] || [];
}

// Helper function for consistent currency formatting.
const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function LoanApplicationsPage() {
    const router = useRouter();
    const { data: applications, isLoading, error } = useQuery({ 
        queryKey: ['loanApplications'], 
        queryFn: fetchLoanApplications 
    });

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Loan Applications</h1>
                <Button asChild>
                    <Link href="/lending/applications/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Application
                    </Link>
                </Button>
            </div>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                        )}
                        {error && (
                            <TableRow><TableCell colSpan={5} className="text-center h-24 text-red-500">Failed to load applications.</TableCell></TableRow>
                        )}
                        {/* THE FIX IS HERE: We explicitly tell map() the type of 'app' */}
                        {applications?.map((app: LoanApplication) => (
                            <TableRow key={app.id} onClick={() => router.push(`/lending/applications/${app.id}`)} className="cursor-pointer hover:bg-muted/50">
                                <TableCell className="font-medium">{app.customer_name}</TableCell>
                                <TableCell>{app.product_name}</TableCell>
                                <TableCell>{formatCurrency(app.principal_amount)}</TableCell>
                                <TableCell><Badge>{app.status}</Badge></TableCell>
                                <TableCell>{new Date(app.application_date).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}