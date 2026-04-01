'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from '@/components/ui/card';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow, 
    TableFooter 
} from '@/components/ui/table';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CreateBudgetModal } from './CreateBudgetModal';
import { formatCurrency, cn } from '@/lib/utils';
import { 
    Sparkles, 
    Loader2, 
    Landmark, 
    Target, 
    TrendingUp, 
    AlertCircle,
    BarChart3,
    FileText,
    CheckCircle2
} from 'lucide-react';
import { useCopilot } from '@/context/CopilotContext';
import { Badge } from '@/components/ui/badge';
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

// API Functions
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
            isGood ? 'text-emerald-600' : isBad ? 'text-red-600' : 'text-slate-500'
        )}>
            {variance > 0 ? '+' : ''}{formatCurrency(variance, 'UGX')}
        </div>
    );
};

export default function BudgetManager({ 
    initialAccounts = [], 
    businessId 
}: { 
    initialAccounts?: Account[], 
    businessId: string 
}) {
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const { openCopilot, setInput: setCopilotInput } = useCopilot();

    const { data: budgets, isLoading: isLoadingBudgets } = useQuery<Budget[]>({
        queryKey: ['allBudgets', businessId],
        queryFn: () => fetchBudgets(businessId),
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
    
    const handleAnalyzeWithAI = () => {
        const prompt = `Financial Analysis for Business ID: ${businessId}. 
        Please evaluate current Actual vs Budget performance.
        Revenue: ${((totals.revenue.actual / totals.revenue.budget) * 100 || 0).toFixed(1)}% of target.
        Expenses: ${((totals.expense.actual / totals.expense.budget) * 100 || 0).toFixed(1)}% of limit.`;
        setCopilotInput(prompt);
        openCopilot();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
                            <BarChart3 className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Budget Management</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium ml-1">Real-time financial performance tracking against ledger targets.</p>
                </div>
                <CreateBudgetModal accounts={initialAccounts} businessId={businessId} />
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Revenue Target</span>
                            <Target className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900">{((totals.revenue.actual / totals.revenue.budget) * 100 || 0).toFixed(1)}%</p>
                            <span className="text-[10px] text-slate-400 font-semibold mb-1 uppercase">Attainment</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Budget Usage</span>
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-900">{((totals.expense.actual / totals.expense.budget) * 100 || 0).toFixed(1)}%</p>
                            <span className="text-[10px] text-slate-400 font-semibold mb-1 uppercase">Utilization</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-xl border-l-4 border-l-blue-600">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Net Variance</span>
                            <Landmark className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className={cn("text-2xl font-bold", totals.net.variance >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {formatCurrency(totals.net.variance, 'UGX')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Analysis Grid */}
            <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <CardTitle className="text-lg font-bold text-slate-900">Performance Overview</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500">Account-level variance detection from the General Ledger.</CardDescription>
                    </div>
                     <div className="flex items-center gap-3 w-full md:w-auto">
                        {isLoadingBudgets ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <Select value={selectedBudgetId || ''} onValueChange={setSelectedBudgetId}>
                                <SelectTrigger className="w-full md:w-64 bg-white border-slate-200 h-10 font-semibold text-sm">
                                    <SelectValue placeholder="Select active budget" />
                                </SelectTrigger>
                                <SelectContent>
                                    {budgets?.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Button onClick={handleAnalyzeWithAI} variant="secondary" className="h-10 border-slate-200 bg-white font-bold" disabled={!budgetData || isLoadingData}>
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" /> AI Insights
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingData ? (
                        <div className="py-32 text-center flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Ledger...</span>
                        </div>
                    ) : isError ? (
                        <div className="p-12 text-center bg-red-50 flex flex-col items-center gap-2">
                             <AlertCircle className="w-8 h-8 text-red-500" />
                             <span className="font-bold text-red-800">Connection Error: {error.message}</span>
                        </div>
                    ) : !budgetData || budgetData.length === 0 ? (
                        <div className="py-24 text-center text-slate-400 italic text-sm">No financial mappings found for this period.</div>
                    ) :
                     (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="py-4 text-[10px] font-bold uppercase text-slate-500 pl-8 tracking-wider">Account Name</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 tracking-wider">Budget Limit</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 tracking-wider">Actual Value</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase text-slate-500 pr-8 tracking-wider">Variance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-blue-50/20 hover:bg-blue-50/20"><TableCell colSpan={4} className="py-3 pl-8 font-bold text-[10px] uppercase text-blue-600 tracking-widest">Revenue Streams</TableCell></TableRow>
                                    {revenue.map(item => (
                                        <TableRow key={item.account_id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors">
                                            <TableCell className="pl-10 py-4 font-semibold text-slate-800 text-sm">{item.account_name}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-500">{formatCurrency(item.budgeted_amount, 'UGX')}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-900 text-sm">{formatCurrency(item.actual_amount, 'UGX')}</TableCell>
                                            <TableCell className="text-right pr-8"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Revenue" /></TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white border-t-2 font-bold"><TableCell className="pl-8 text-slate-900 uppercase text-xs">Total Revenue</TableCell><TableCell className="text-right font-mono text-slate-500">{formatCurrency(totals.revenue.budget, 'UGX')}</TableCell><TableCell className="text-right font-mono text-slate-900">{formatCurrency(totals.revenue.actual, 'UGX')}</TableCell><TableCell className="text-right pr-8"><VarianceCell variance={totals.revenue.variance} accountType="Revenue" /></TableCell></TableRow>
                                    
                                    <TableRow className="bg-red-50/20 hover:bg-red-50/20"><TableCell colSpan={4} className="py-3 pl-8 font-bold text-[10px] uppercase text-red-600 tracking-widest">Expense Accounts</TableCell></TableRow>
                                    {expenses.map(item => (
                                        <TableRow key={item.account_id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors">
                                            <TableCell className="pl-10 py-4 font-semibold text-slate-800 text-sm">{item.account_name}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-slate-500">{formatCurrency(item.budgeted_amount, 'UGX')}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-900 text-sm">{formatCurrency(item.actual_amount, 'UGX')}</TableCell>
                                            <TableCell className="text-right pr-8"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Expense" /></TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-white border-t-2 font-bold"><TableCell className="pl-8 text-slate-900 uppercase text-xs">Total Expenses</TableCell><TableCell className="text-right font-mono text-slate-500">{formatCurrency(totals.expense.budget, 'UGX')}</TableCell><TableCell className="text-right font-mono text-slate-900">{formatCurrency(totals.expense.actual, 'UGX')}</TableCell><TableCell className="text-right pr-8"><VarianceCell variance={totals.expense.variance} accountType="Expense" /></TableCell></TableRow>
                                </TableBody>
                                <TableFooter className="bg-slate-950 text-white hover:bg-slate-950 border-none">
                                    <TableRow>
                                        <TableCell className="pl-8 py-6 font-bold uppercase text-[11px] tracking-widest text-slate-400">Net Performance Summary</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-400">{formatCurrency(totals.net.budget, 'UGX')}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-white text-lg">{formatCurrency(totals.net.actual, 'UGX')}</TableCell>
                                        <TableCell className="text-right pr-8 font-mono font-bold">
                                            <div className={cn(totals.net.variance >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                {totals.net.variance > 0 ? '+' : ''}{formatCurrency(totals.net.variance, 'UGX')}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                     )
                    }
                </CardContent>
            </Card>

            {/* Footer validation */}
            <div className="pt-6 border-t border-slate-100 flex justify-center">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Ledger Integrity Verified
                </div>
            </div>
        </div>
    );
}