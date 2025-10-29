'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CreateBudgetModal } from './CreateBudgetModal'; // <-- FIX: Changed absolute path to relative path
import { formatCurrency } from '@/lib/utils';
import { Sparkles, Loader2 } from 'lucide-react';
import { useCopilot } from '@/context/CopilotContext';
import { Account } from '@/components/ledger/CreateJournalEntryModal';

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

async function fetchBudgets(): Promise<Budget[]> {
    const { data, error } = await supabase.from('budgets').select('id, name, year').order('year', { ascending: false });
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
        <div className={`font-semibold ${isGood ? 'text-green-600' : isBad ? 'text-red-600' : ''}`}>
            {formatCurrency(variance, 'USD')}
        </div>
    );
};

export default function BudgetManager({ initialAccounts }: { initialAccounts: Account[] }) {
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const { openCopilot, setInput: setCopilotInput } = useCopilot();

    const { data: budgets, isLoading: isLoadingBudgets } = useQuery<Budget[]>({
        queryKey: ['allBudgets'],
        queryFn: fetchBudgets,
    });

    useEffect(() => {
        if (budgets && budgets.length > 0 && !selectedBudgetId) {
            setSelectedBudgetId(budgets[0].id);
        }
    }, [budgets, selectedBudgetId]);

    const { data: budgetData, isLoading: isLoadingData } = useQuery<BudgetData[]>({
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
        const prompt = `Analyze the following "Budget vs. Actuals" report. Identify the top 3 most significant variances (both positive and negative) and provide a brief analysis for each, explaining its potential impact on the business. Finally, suggest one strategic action the business owner could take based on your analysis. Here is the data in JSON format:\n\n${JSON.stringify(budgetData, null, 2)}`;
        setCopilotInput(prompt);
        openCopilot();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Budget Command Center</h1>
                    <p className="text-muted-foreground">Strategic financial planning and real-time performance analysis.</p>
                </div>
                <CreateBudgetModal accounts={initialAccounts} />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Budget vs. Actuals Analysis</CardTitle>
                        <CardDescription>Select a budget to see its real-time performance against the general ledger.</CardDescription>
                    </div>
                     <div className="flex items-center gap-4">
                        {isLoadingBudgets ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <Select value={selectedBudgetId || ''} onValueChange={setSelectedBudgetId}>
                                <SelectTrigger className="w-72"><SelectValue placeholder="Select a budget..." /></SelectTrigger>
                                <SelectContent>
                                    {budgets?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Button onClick={handleAnalyzeWithAI} disabled={!budgetData || isLoadingData}>
                            <Sparkles className="mr-2 h-4 w-4" /> Analyze with AI
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingData ? <div className="text-center p-12"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div> :
                     !budgetData || budgetData.length === 0 ? <div className="text-center p-12">No data found for this budget.</div> :
                     (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Budgeted</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50"><TableCell colSpan={4}>Revenue</TableCell></TableRow>
                                {revenue.map(item => (
                                    <TableRow key={item.account_id}>
                                        <TableCell className="pl-8">{item.account_name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.budgeted_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right font-semibold cursor-pointer hover:underline">{formatCurrency(item.actual_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Revenue" /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-semibold border-t"><TableCell>Total Revenue</TableCell><TableCell className="text-right">{formatCurrency(totals.revenue.budget, 'USD')}</TableCell><TableCell className="text-right">{formatCurrency(totals.revenue.actual, 'USD')}</TableCell><TableCell className="text-right"><VarianceCell variance={totals.revenue.variance} accountType="Revenue" /></TableCell></TableRow>
                                
                                <TableRow className="font-bold bg-muted/50 hover:bg-muted/50"><TableCell colSpan={4}>Expenses</TableCell></TableRow>
                                {expenses.map(item => (
                                    <TableRow key={item.account_id}>
                                        <TableCell className="pl-8">{item.account_name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.budgeted_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right font-semibold cursor-pointer hover:underline">{formatCurrency(item.actual_amount, 'USD')}</TableCell>
                                        <TableCell className="text-right"><VarianceCell variance={item.actual_amount - item.budgeted_amount} accountType="Expense" /></TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-semibold border-t"><TableCell>Total Expenses</TableCell><TableCell className="text-right">{formatCurrency(totals.expense.budget, 'USD')}</TableCell><TableCell className="text-right">{formatCurrency(totals.expense.actual, 'USD')}</TableCell><TableCell className="text-right"><VarianceCell variance={totals.expense.variance} accountType="Expense" /></TableCell></TableRow>
                            </TableBody>
                             <TableFooter>
                                <TableRow className="text-lg font-bold hover:bg-transparent bg-muted/30">
                                    <TableCell>Net Profit / (Loss)</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.net.budget, 'USD')}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.net.actual, 'USD')}</TableCell>
                                    <TableCell className="text-right"><VarianceCell variance={totals.net.variance} accountType="Revenue" /></TableCell>
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