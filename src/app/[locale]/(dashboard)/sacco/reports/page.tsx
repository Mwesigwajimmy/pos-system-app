// src/app/(dashboard)/sacco/reports/page.tsx

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Landmark, PiggyBank, Scale, Loader2 } from 'lucide-react';

// --- Helper Functions & Components ---

const formatCurrency = (value: number | null | undefined) => 
    value != null ? `UGX ${new Intl.NumberFormat('en-US').format(value)}` : 'UGX 0';

const KpiCard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType; description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

// --- Async Functions ---

// 1. Secure Context Fetching (Auth & Tenant)
async function fetchReportContext() {
    const supabase = createClient();
    
    // Check Authentication
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        throw new Error('Not authenticated');
    }

    // Check Tenant Context
    const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;
    
    return { user, tenantId };
}

// 2. Data Fetching
async function fetchFinancialSummary() {
    const supabase = createClient();
    // The RPC typically uses the authenticated user's session to filter data
    const { data, error } = await supabase.rpc('get_sacco_financial_summary');
    
    if (error) throw new Error(error.message);
    
    // Return the first record or null if empty
    return data && data.length > 0 ? data[0] : null;
}

export default function ReportsPage() {
    const router = useRouter();

    // 1. Fetch Auth Context
    const { data: context, isLoading: isContextLoading, isError: isContextError } = useQuery({
        queryKey: ['reportsPageContext'],
        queryFn: fetchReportContext,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 2. Fetch Financial Data (Only if Context is valid)
    const { data: summary, isLoading: isDataLoading, isError: isDataError } = useQuery({
        queryKey: ['saccoFinancialSummary', context?.tenantId],
        queryFn: fetchFinancialSummary,
        enabled: !!context?.tenantId, // Only fetch if tenant is resolved
    });

    // 3. Handle Auth Redirection
    useEffect(() => {
        if (isContextError) {
            router.push('/auth/login');
        }
    }, [isContextError, router]);

    // 4. Combined Loading State
    const isLoading = isContextLoading || isDataLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6 flex flex-col items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-2">Loading financial reports...</p>
            </div>
        );
    }

    // Prevent render on auth error
    if (isContextError || !context) return null;

    // Handle Tenant Error
    if (!context.tenantId) {
        return (
            <div className="container mx-auto py-6">
                <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md">
                    <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization.
                </div>
            </div>
        );
    }

    // Handle Data Fetch Error
    if (isDataError) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <h1 className="text-3xl font-bold">Financial Reports</h1>
                <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md">
                    Failed to load financial data. Please try again later.
                </div>
            </div>
        );
    }

    // Safe calculation with optional chaining
    const netProfit = (summary?.total_revenue || 0) - (summary?.total_expenses || 0);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">A summary of the organization's financial health and performance.</p>

            <div className="space-y-6">
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Scale className="mr-2 h-5 w-5"/>Income Statement (Profit & Loss)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <KpiCard 
                            title="Total Revenue" 
                            value={formatCurrency(summary?.total_revenue)} 
                            icon={TrendingUp} 
                            description="Loan fees, interest, other income" 
                        />
                        <KpiCard 
                            title="Total Expenses" 
                            value={formatCurrency(summary?.total_expenses)} 
                            icon={TrendingDown} 
                            description="Operational costs" 
                        />
                        <KpiCard 
                            title="Net Profit / (Loss)" 
                            value={formatCurrency(netProfit)} 
                            icon={Scale} 
                            description="Revenue minus Expenses" 
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Balance Sheet Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <KpiCard 
                            title="Total Share Capital" 
                            value={formatCurrency(summary?.total_shares)} 
                            icon={Landmark} 
                        />
                        <KpiCard 
                            title="Total Member Savings" 
                            value={formatCurrency(summary?.total_savings)} 
                            icon={PiggyBank} 
                        />
                        <KpiCard 
                            title="Outstanding Loan Portfolio" 
                            value={formatCurrency(summary?.total_loans_outstanding)} 
                            icon={Wallet} 
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}