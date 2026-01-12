'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CreateBudgetModal } from './CreateBudgetModal';
import { formatCurrency, cn } from '@/lib/utils';
import { Sparkles, Loader2, Landmark, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useCopilot } from '@/context/CopilotContext';
import { Badge } from '@/components/ui/badge';

// FIXED IMPORT: Using the central enterprise type to resolve the build error
import { Account } from '@/lib/types'; 

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

const supabase = createClient();

// API Functions scoped to the enterprise businessId
async function fetchBudgets(businessId: string): Promise<Budget[]> {
    const { data, error } = await supabase
        .from('budgets')
        .select('id, name, year')
        .eq('business_id', businessId) 
        .order('year', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
}

async function fetchBudgetVsActuals(budgetId: string): Promise<BudgetData[]> {
    if (!budgetId) return [];
    const { data, error } = await supabase.rpc('get_budget_vs_actuals', { p_budget_id: budgetId });
    if (error) throw new Error(error.message);
    return data || [];
}

const VarianceCell = ({ variance, accountType }: { variance: number, accountType: string }) => {
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

export default function BudgetManager({ 
    initialAccounts = [], 
    businessId // Corrected prop name to match your multi-tenant interconnect
}: { 
    initialAccounts?: Account[], 
    businessId: string 
}) {
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const { openCopilot, setInput: setCopilotInput } = useCopilot();

    // 1. Synchronized Budget Fetching
    const { data: budgets, isLoading: isLoadingBudgets } = useQuery<Budget[]>({
        queryKey: ['allBudgets', businessId],
        queryFn: () => fetchBudgets(businessId),
    });

    useEffect(() => {
        if (budgets && budgets.length > 0 && !selectedBudgetId) {
            setSelectedBudgetId(budgets[0].id);
        }
    }, [budgets, selectedBudgetId]);

    // 2. Real-time Ledger Variance Fetching
    const { data: budgetData, isLoading: isLoadingData, isError, error } = useQuery<BudgetData[]>({
        queryKey: ['budgetVsActuals', selectedBudgetId],
        queryFn: () => fetchBudgetVsActuals(selectedBudgetId!),
        enabled: !!selectedBudgetId,
    });

    // 3. Performance Aggregation Math
    const { revenue, expenses, totals } = useMemo(() => {
        if (!budgetData) return { revenue: [], expenses: [], totals: { revenue: { budget: 0, actual: 0, variance: 0 }, expense: { budget: 0, actual: 0, variance: 0 }, net: { budget: 0, actual: 0, variance: 0 } } };
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
                net: { budget: totalRevenueBudget - totalExpenseBudget, actual: totalRevenueActual - totalExpenseActual, variance: (totalRevenueActual - totalExpenseActual) - (totalRevenueBudget - totalExpenseBudget) },
            }
        };
    }, [budgetData]);
    
    // 4. AI Strategic Analysis Handshake
    const handleAnalyzeWithAI = () => {
        const prompt = `Senior CFO Assistant Analysis. Business ID: ${businessId}. 
        Please evaluate this Budget vs. Actuals report for current period.
        Current Performance Stats:
        - Revenue vs Target: ${((totals.revenue.actual / totals.revenue.budget) * 100 || 0).toFixed(1)}%
        - Expense vs Limit: ${((totals.expense.actual / totals.expense.budget) * 100 || 0).toFixed(1)}%
        
        Identify the top 3 most significant account variances and suggest strategic actions:\n\n${JSON.stringify(budgetData, null, 2)}`;
        
        setCopilotInput(prompt);
        openCopilot();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight">Budget Command Center</h1>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">v3.5 Interconnect</Badge>
                    </div>
                    <p className="text-muted-foreground font-medium">Strategic financial planning backed by real-time ledger synchronization.</p>
                </div>
                {/* FIXED: Passing businessId to the modal for secure isolation */}
                <CreateBudgetModal accounts={initialAccounts} businessId={businessId} />
            </div>

            {/* Metrics Snapshot Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between"><Target className="w-5 h-5 text-blue-600" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Revenue Attainment</span></div>
                        <p className="text-2xl font-black mt-2">{((totals.revenue.actual / totals.revenue.budget) * 100 || 0).toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between"><TrendingUp className="w-5 h-5 text-purple-600" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Budget Utilization</span></div>
                        <p className="text-2xl font-black mt-2">{((totals.expense.actual / totals.expense.budget) * 100 || 0).toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between"><Landmark className="w-5 h-5 text-green-600" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Delta Impact</span></div>
                        <p className={cn("text-2xl font-black mt-2", totals.net.variance >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(totals.net.variance, 'USD')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b">
                    <div>
                        <CardTitle className="text-lg">Performance Analysis Grid</CardTitle>
                        <CardDescription>Live variance detection through direct database interconnectivity.</CardDescription>
                    </div>
                     <div className="flex items-center gap-4">
                        {isLoadingBudgets ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <Select value={selectedBudgetId || ''} onValueChange={setSelectedBudgetId}>
                                <SelectTrigger className="w-72 bg-white shadow-sm"><SelectValue placeholder="Select active budget plan..." /></SelectTrigger>
                                <SelectContent>
                                    {budgets?.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Button onClick={handleAnalyzeWithAI} variant="secondary" className="shadow-sm border font-bold" disabled={!budgetData || isLoadingData}>
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" /> Strategic Analysis
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="h-10 w-10 animate-spin text-primary" /><span>Syncing ledger actuals...</span></div>
                    ) : isError ? (
                        <div className="p-12 text-center text-red-600 bg-red-50 flex flex-col items-center gap-2 font-bold"><AlertCircle className="w-8 h-8" /><span>Ledger Connection Error: {error.message}</span></div>
                    ) : !budgetData || budgetData.length === 0 ? (
                        <div className="text-center py-24 text-muted-foreground italic">No financial data mapped for this specific budget profile.</div>
                    ) :
                     (
                        <Table>
                            <TableHeader className="bg-slate-100/50">
                                <TableRow>
                                    <TableHead className="py-4">Ledger Account</TableHead>
                                    <TableHead className="text-right">Planned Limit</TableHead>
                                    <TableHead className="text-right">Actual Realized</TableHead>
                                    <TableHead className="text-right">Variance Impact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="font-black bg-blue-50/20 uppercase text-[10px] tracking-widest text-blue-800 hover:bg-blue-50/20"><TableCell colSpan={4}>Revenue & Asset Growth Accounts</TableCell></TableRow>
                                {revenue.map(item => (
                                    <TableRow key={item.account_id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-8 font-medium">{item.account_name}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-500">{formatCurrency(item.budgeted_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-900 underline decoration-dotted underline-offset-4 cursor-pointer">{formatCurrency(item.actual_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Revenue" /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold border-t bg-slate-50/30"><TableCell>Consolidated Period Revenue</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.revenue.budget, 'USD')}</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.revenue.actual, 'USD')}</TableCell><TableCell className="text-right"><VarianceCell variance={totals.revenue.variance} accountType="Revenue" /></TableCell></TableRow>
                                
                                <TableRow className="font-black bg-red-50/20 uppercase text-[10px] tracking-widest text-red-800 hover:bg-red-50/20 mt-4"><TableCell colSpan={4}>Operational & Liability Accounts</TableCell></TableRow>
                                {expenses.map(item => (
                                    <TableRow key={item.account_id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-8 font-medium">{item.account_name}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-500">{formatCurrency(item.budgeted_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-900 underline decoration-dotted underline-offset-4 cursor-pointer">{formatCurrency(item.actual_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Expense" /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold border-t bg-slate-50/30"><TableCell>Consolidated Period Expenses</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.expense.budget, 'USD')}</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.expense.actual, 'USD')}</TableCell><TableCell className="text-right"><VarianceCell variance={totals.expense.variance} accountType="Expense" /></TableCell></TableRow>
                            </TableBody>
                             <TableFooter className="bg-slate-900 text-white border-t-0 hover:bg-slate-900 shadow-inner">
                                <TableRow className="text-lg font-black tracking-tight">
                                    <TableCell>Comprehensive Net ERP Outcome</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totals.net.budget, 'USD')}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totals.net.actual, 'USD')}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        <div className={cn(totals.net.variance >= 0 ? "text-green-400" : "text-red-400")}>
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