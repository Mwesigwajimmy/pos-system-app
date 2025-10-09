// src/app/(dashboard)/sacco/admin/page.tsx (or wherever your SaccoAdminPage is)

'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

async function runInterestAccrual() {
    const supabase = createClient();
    const { error } = await supabase.rpc('accrue_savings_interest');
    if (error) throw error;
}

// Function to fetch the new financial summary
async function fetchFinancialSummary() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sacco_financial_summary');
    if (error) throw new Error(error.message);
    return data[0];
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function SaccoAdminPage() {
    const queryClient = useQueryClient();
    const [taxRate, setTaxRate] = useState(30); // Default tax rate, e.g., 30%

    const { data: summary } = useQuery({
        queryKey: ['saccoFinancialSummary'],
        queryFn: fetchFinancialSummary,
    });
    
    const interestMutation = useMutation({
        mutationFn: runInterestAccrual,
        onSuccess: () => {
            toast.success("Monthly interest has been calculated and applied to all savings accounts!");
            queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs'] });
            queryClient.invalidateQueries({ queryKey: ['saccoMemberAccounts'] });
        },
        onError: (err: any) => toast.error(`Failed: ${err.message}`),
    });

    const handleRunInterest = () => {
        if (confirm("DANGER: Are you sure you want to run the monthly interest calculation now? This action adds interest to ALL savings accounts and cannot be undone.")) {
            interestMutation.mutate();
        }
    };
    
    const netProfit = (summary?.total_revenue || 0) - (summary?.total_expenses || 0);
    const taxLiability = netProfit > 0 ? netProfit * (taxRate / 100) : 0;

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">SACCO Administration</h1>
            <p className="text-muted-foreground">Run critical, system-wide tasks manually. Use with caution.</p>
            
            <Card>
                <CardHeader>
                    <CardTitle>Corporate Tax Calculator</CardTitle>
                    <CardDescription>
                        Calculate the estimated corporate tax based on the net profit (Total Revenue - Total Expenses). This is an informational tool.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Net Profit</Label>
                            <p className="text-xl font-bold">{formatCurrency(netProfit)}</p>
                        </div>
                        <div>
                            <Label htmlFor="taxRate">Tax Rate (%)</Label>
                            <Input id="taxRate" type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                        <Label>Estimated Tax Liability</Label>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(taxLiability)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Manual Interest Calculation</CardTitle>
                    <CardDescription>
                        This will calculate and add savings interest to every eligible member's account based on the current balances and product interest rates. This task normally runs automatically once a month. Only run this manually if you need to close a financial period or correct an issue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleRunInterest} disabled={interestMutation.isPending}>
                        {interestMutation.isPending ? "Calculating..." : "Run Monthly Savings Interest Calculation"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}