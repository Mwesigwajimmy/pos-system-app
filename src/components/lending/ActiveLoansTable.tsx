'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreVertical, Search, Filter, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

// --- Enterprise Types (Strict Typing) ---

// 1. Raw DB Response Type (Nested structure from Supabase joins)
interface LoanApplicationDBResponse {
    id: number;
    application_no: string;
    principal_amount: number;
    status: 'Active' | 'In Arrears' | 'Defaulted' | 'Completed';
    // Join: Borrower Profile
    borrower: {
        full_name: string;
        national_id: string;
    };
    // Join: Product Details
    product: {
        name: string;
        interest_rate: number;
    };
    // Join: Balances (Usually a View or Summary Table)
    loan_balances: {
        current_balance: number;
    }[];
    // Join: Schedule (To find next due date)
    repayment_schedules: {
        due_date: string;
        status: string;
    }[];
}

// 2. Clean UI Type (Flattened)
interface ActiveLoan {
    id: number;
    applicationNo: string;
    borrowerName: string;
    nationalId: string;
    productName: string;
    interestRate: number;
    principal: number;
    outstandingBalance: number;
    nextDueDate: string | null; // Null if loan is completed or logic fails
    status: 'Active' | 'In Arrears' | 'Defaulted' | 'Completed';
}

// --- Real Data Fetcher ---
async function fetchActiveLoans(tenantId: string, searchTerm: string = '') {
    const supabase = createClient();
    
    // Step 1: Build the Query
    // We select specific fields to optimize payload size.
    // We join 'repayment_schedules' filtering for 'pending' to find the next date.
    let query = supabase
        .from('loan_applications')
        .select(`
            id,
            application_no,
            principal_amount,
            status,
            borrower:profiles!inner(full_name, national_id),
            product:loan_products(name, interest_rate),
            loan_balances(current_balance),
            repayment_schedules(due_date, status)
        `)
        .eq('business_id', tenantId)
        .in('status', ['Active', 'In Arrears', 'Defaulted']); // Only live loans

    // Step 2: Server-Side Search
    if (searchTerm) {
        query = query.ilike('profiles.full_name', `%${searchTerm}%`);
    }

    // Step 3: Optimization - We only want the *next* schedule, but Supabase JS join limits are tricky.
    // We fetch pending schedules and sort them in JavaScript or trust the DB order.
    // Ideally, .filter('repayment_schedules.status', 'eq', 'pending') is applied here.
    query = query.eq('repayment_schedules.status', 'pending'); 

    const { data, error } = await query;

    if (error) {
        console.error("Supabase Loan Fetch Error:", error);
        throw new Error("Failed to retrieve loan portfolio.");
    }

    // Step 4: Data Transformation & Logic
    const loans: ActiveLoan[] = (data as unknown as LoanApplicationDBResponse[]).map(item => {
        
        // Logic: Find earliest due date among pending schedules
        const schedules = item.repayment_schedules || [];
        // Sort by date ascending to get the *next* one
        schedules.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        const nextSchedule = schedules.length > 0 ? schedules[0] : null;

        // Logic: Get Balance (Handle case where balance record might be missing)
        const balance = item.loan_balances?.[0]?.current_balance ?? 0;

        return {
            id: item.id,
            applicationNo: item.application_no,
            borrowerName: item.borrower.full_name,
            nationalId: item.borrower.national_id,
            productName: item.product.name,
            interestRate: item.product.interest_rate,
            principal: item.principal_amount,
            outstandingBalance: balance,
            nextDueDate: nextSchedule ? nextSchedule.due_date : null,
            status: item.status
        };
    });

    return loans;
}

export default function ActiveLoansTable({ tenantId }: { tenantId: string }) {
    const router = useRouter();
    const [search, setSearch] = useState('');

    // React Query with Debouncing strategy (implicit via placeholderData)
    const { data: loans, isLoading, isError, error } = useQuery({
        queryKey: ['activeLoans', tenantId, search],
        queryFn: () => fetchActiveLoans(tenantId, search),
        placeholderData: (prev) => prev, // Keeps the table populated while searching
        staleTime: 60 * 1000, // Data is fresh for 1 minute
    });

    if (isError) {
        toast.error((error as Error).message);
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search borrower..." 
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
                    <Button size="sm" onClick={() => router.push('/lending/applications/new')}>New Loan</Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Loan #</TableHead>
                            <TableHead>Borrower</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Principal</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead>Next Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="animate-spin h-5 w-5" /> Loading Portfolio...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-red-500">
                                    <div className="flex items-center justify-center gap-2">
                                        <AlertCircle className="h-5 w-5" /> Failed to load data.
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : loans?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No active loans found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            loans?.map((loan) => (
                                <TableRow 
                                    key={loan.id} 
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => router.push(`/lending/loans/${loan.id}`)}
                                >
                                    <TableCell className="font-medium text-slate-900">{loan.applicationNo}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{loan.borrowerName}</span>
                                            <span className="text-xs text-muted-foreground">{loan.nationalId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{loan.productName}</span>
                                            <span className="text-xs text-muted-foreground">{loan.interestRate}% Interest</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-600">{formatCurrency(loan.principal)}</TableCell>
                                    <TableCell className={`text-right font-bold ${loan.outstandingBalance > 0 ? 'text-slate-800' : 'text-green-600'}`}>
                                        {formatCurrency(loan.outstandingBalance)}
                                    </TableCell>
                                    <TableCell>
                                        {loan.nextDueDate ? (
                                            <span className={`text-sm ${new Date(loan.nextDueDate) < new Date() ? 'text-red-600 font-medium' : ''}`}>
                                                {formatDate(loan.nextDueDate)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No pending schedule</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={loan.status === 'Active' ? 'default' : loan.status === 'In Arrears' ? 'destructive' : 'secondary'}>
                                            {loan.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/lending/loans/${loan.id}`)}>View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => router.push(`/lending/repayments?loan_id=${loan.id}`)}>Record Repayment</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}