'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CreateBudgetModal } from './CreateBudgetModal';
import { formatCurrency, cn } from '@/lib/utils'; // FIXED: Combined imports at the top
import { Sparkles, Loader2, Landmark, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useCopilot } from '@/context/CopilotContext';
import { Badge } from '@/components/ui/badge';
import { Account } from '@/lib/types'; // FIXED: Import central enterprise type to resolve build error

/**
 * FIX: Removed the local 'Account' interface that was missing properties 
 * like 'business_id' and 'balance'. It is now imported from @/lib/types above.
 */

interface BudgetData {
  account_id: string;
  account_name: string;
  account_type: 'Revenue' | 'Expense';
  budgeted_amount: number;
  actual_amount: number;
}

interface Budget {
  id: string;
  name: string;
  year: number;
}

interface BudgetManagerProps {
    initialAccounts: Account[];
    businessId: string; // REQUIRED for Enterprise Interconnect
}

// --- API Functions (Enterprise Scoped) ---

const fetchBudgets = async (businessId: string): Promise<Budget[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('budgets')
        .select('id, name, year')
        .eq('business_id', businessId) // CRITICAL: Strict tenant isolation
        .order('year', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
};

const fetchBudgetVsActuals = async (budgetId: string): Promise<BudgetData[]> => {
    if (!budgetId) return [];
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_budget_vs_actuals', { 
        p_budget_id: budgetId 
    });
    
    if (error) throw new Error(error.message);
    return data || [];
};

// --- Sub-Component: Variance Visualizer ---

const VarianceCell = ({ variance, accountType }: { variance: number, accountType: string }) => {
    // In accounting, positive variance in Revenue is good, but positive variance in Expense is bad.
    const isGood = (accountType === 'Revenue' && variance >= 0) || (accountType === 'Expense' && variance <= 0);
    const isBad = (accountType === 'Revenue' && variance < 0) || (accountType === 'Expense' && variance > 0);
    
    return (
        <div className={cn(
            "font-mono font-bold text-sm",
            isGood ? 'text-green-600' : isBad ? 'text-red-600' : 'text-slate-500'
        )}>
            {variance > 0 ? '+' : ''}{formatCurrency(variance, 'USD')}
        </div>
    );
};

export default function BudgetManager({ initialAccounts, businessId }: BudgetManagerProps) {
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const { openCopilot, setInput: setCopilotInput } = useCopilot();

    // 1. Data Synchronization
    const { data: budgets, isLoading: isLoadingBudgets } = useQuery<Budget[]>({
        queryKey: ['budgets', businessId],
        queryFn: () => fetchBudgets(businessId),
        enabled: !!businessId
    });

    useEffect(() => {
        if (budgets && budgets.length > 0 && !selectedBudgetId) {
            setSelectedBudgetId(budgets[0].id);
        }
    }, [budgets, selectedBudgetId]);

    const { data: budgetData, isLoading: isLoadingData, isError, error } = useQuery<BudgetData[]>({
        queryKey: ['budgetVsActuals', selectedBudgetId],
        queryFn: () => fetchBudgetVsActuals(selectedBudgetId!),
        enabled: !!selectedBudgetId,
    });

    // 2. Performance Logic (Aggregations)
    const { revenue, expenses, totals } = useMemo(() => {
        if (!budgetData) return { 
            revenue: [], 
            expenses: [], 
            totals: { 
                revenue: { budget: 0, actual: 0, variance: 0 }, 
                expense: { budget: 0, actual: 0, variance: 0 }, 
                net: { budget: 0, actual: 0, variance: 0 } 
            } 
        };

        const rev = budgetData.filter(d => d.account_type === 'Revenue');
        const exp = budgetData.filter(d => d.account_type === 'Expense');
        
        const totalRevenueBudget = rev.reduce((s, i) => s + i.budgeted_amount, 0);
        const totalRevenueActual = rev.reduce((s, i) => s + i.actual_amount, 0);
        const totalExpenseBudget = exp.reduce((s, i) => s + i.budgeted_amount, 0);
        const totalExpenseActual = exp.reduce((s, i) => s + i.actual_amount, 0);

        return {
            revenue: rev,
            expenses: exp,
            totals: {
                revenue: { budget: totalRevenueBudget, actual: totalRevenueActual, variance: totalRevenueActual - totalRevenueBudget },
                expense: { budget: totalExpenseBudget, actual: totalExpenseActual, variance: totalExpenseActual - totalExpenseBudget },
                net: { 
                    budget: totalRevenueBudget - totalExpenseBudget, 
                    actual: totalRevenueActual - totalExpenseActual, 
                    variance: (totalRevenueActual - totalExpenseActual) - (totalRevenueBudget - totalExpenseBudget) 
                },
            }
        };
    }, [budgetData]);
    
    // 3. AI Strategic Handshake
    const handleAnalyzeWithAI = () => {
        const prompt = `System Role: Senior CFO Assistant. 
        Context: Analyzing current performance for Business ID ${businessId} against Budget ID ${selectedBudgetId}.
        Data Summary:
        - Revenue Variance: ${formatCurrency(totals.revenue.variance, 'USD')}
        - Expense Variance: ${formatCurrency(totals.expense.variance, 'USD')}
        - Net Profit Variance: ${formatCurrency(totals.net.variance, 'USD')}

        Please identify the top 3 critical account variances and provide strategic advice to improve the bottom line based on this real-time ledger data:\n\n${JSON.stringify(budgetData, null, 2)}`;
        
        setCopilotInput(prompt);
        openCopilot();
    };

    return (
        <div className="space-y-6">
            {/* Header: Global Command */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight">Budget Command Center</h1>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px]">Strategic View</Badge>
                    </div>
                    <p className="text-muted-foreground">Orchestrating financial performance through real-time ledger synchronization.</p>
                </div>
                {/* FIXED: Passed businessId to modal on line 174 */}
                <CreateBudgetModal accounts={initialAccounts} businessId={businessId} />
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <Target className="w-5 h-5 text-blue-600" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Revenue Performance</span>
                        </div>
                        <p className="text-2xl font-black mt-2">{((totals.revenue.actual / totals.revenue.budget) * 100 || 0).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">vs budgeted target</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Expense Control</span>
                        </div>
                        <p className="text-2xl font-black mt-2">{((totals.expense.actual / totals.expense.budget) * 100 || 0).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">utilization of limits</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <Landmark className="w-5 h-5 text-green-600" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Net Delta</span>
                        </div>
                        <p className={cn("text-2xl font-black mt-2", totals.net.variance >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(totals.net.variance, 'USD')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">variance to net plan</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-xl border-none overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Performance Analysis Grid</CardTitle>
                        <CardDescription>Direct integration with the General Ledger for real-time variance detection.</CardDescription>
                    </div>
                     <div className="flex items-center gap-3">
                        {isLoadingBudgets ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <Select value={selectedBudgetId || ''} onValueChange={setSelectedBudgetId}>
                                <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="Select active budget..." /></SelectTrigger>
                                <SelectContent>
                                    {budgets?.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Button onClick={handleAnalyzeWithAI} variant="secondary" className="shadow-sm border" disabled={!budgetData || isLoadingData}>
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" /> CFO Insights
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground italic">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <span>Recalculating ledger variances...</span>
                        </div>
                    ) : isError ? (
                        <div className="p-12 text-center text-red-600 bg-red-50 border-y border-red-100 flex flex-col items-center gap-2">
                             <AlertCircle className="w-8 h-8" />
                             <span className="font-bold">Error syncing with ledger: {error.message}</span>
                        </div>
                    ) : !budgetData || budgetData.length === 0 ? (
                        <div className="text-center py-24 text-muted-foreground italic">No financial data mapped for this budget profile.</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-100/50">
                                <TableRow>
                                    <TableHead className="py-4">Ledger Account</TableHead>
                                    <TableHead className="text-right">Budgeted Limit</TableHead>
                                    <TableHead className="text-right">Actual Activity</TableHead>
                                    <TableHead className="text-right">Variance Impact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="font-black bg-slate-50 uppercase text-[10px] tracking-widest text-blue-700 hover:bg-slate-50"><TableCell colSpan={4}>Revenue & Income Streams</TableCell></TableRow>
                                {revenue.map(item => (
                                    <TableRow key={item.account_id} className="hover:bg-blue-50/20 transition-colors">
                                        <TableCell className="pl-8 font-medium">{item.account_name}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-500">{formatCurrency(item.budgeted_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-900 underline decoration-dotted underline-offset-4">{formatCurrency(item.actual_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Revenue" /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold border-t bg-slate-50/30"><TableCell>Consolidated Revenue</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.revenue.budget, 'USD')}</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.revenue.actual, 'USD')}</TableCell><TableCell className="text-right"><VarianceCell variance={totals.revenue.variance} accountType="Revenue" /></TableCell></TableRow>
                                
                                <TableRow className="font-black bg-slate-50 uppercase text-[10px] tracking-widest text-red-700 hover:bg-slate-50 mt-4"><TableCell colSpan={4}>Operational Expenses</TableCell></TableRow>
                                {expenses.map(item => (
                                    <TableRow key={item.account_id} className="hover:bg-red-50/20 transition-colors">
                                        <TableCell className="pl-8 font-medium">{item.account_name}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-500">{formatCurrency(item.budgeted_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-900 underline decoration-dotted underline-offset-4">{formatCurrency(item.actual_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Expense" /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold border-t bg-slate-50/30"><TableCell>Consolidated Expenses</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.expense.budget, 'USD')}</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.expense.actual, 'USD')}</TableCell><TableCell className="text-right"><VarianceCell variance={totals.expense.variance} accountType="Expense" /></TableCell></TableRow>
                            </TableBody>
                             <TableFooter className="bg-slate-900 text-white border-t-0 hover:bg-slate-900">
                                <TableRow className="text-lg font-black tracking-tight">
                                    <TableCell>Net ERP Performance Score</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totals.net.budget, 'USD')}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totals.net.actual, 'USD')}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        <div className={totals.net.variance >= 0 ? "text-green-400" : "text-red-400"}>
                                            {totals.net.variance > 0 ? '+' : ''}{formatCurrency(totals.net.variance, 'USD')}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                     )
                    }
                </CardContent>
            </Card>
        </div>
    );
}