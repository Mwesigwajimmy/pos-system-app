// src/components/management/BudgetManager.tsx
// FINAL, CORRECTED VERSION

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';

const formatCurrency = (value: number | null | undefined) => `UGX ${new Intl.NumberFormat('en-US').format(value || 0)}`;

async function getBudgetsWithStatus() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_all_budgets_with_status');
    if (error) throw new Error(error.message);
    return data;
}

async function createBudget(newBudget: { name: string, total_amount: number, start_date: string, end_date: string }) {
    const supabase = createClient();
    const { error } = await supabase.from('budgets').insert({
        name: newBudget.name,
        total_amount: newBudget.total_amount,
        period_start_date: newBudget.start_date,
        period_end_date: newBudget.end_date,
    });
    if (error) throw error;
}

const BudgetCard = ({ budget }: { budget: any }) => {
    const percentage = budget.total_amount > 0 ? (budget.amount_spent / budget.total_amount) * 100 : 0;
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{budget.name}</CardTitle>
                    <span className={`text-sm font-bold ${percentage > 90 ? 'text-destructive' : 'text-muted-foreground'}`}>{percentage.toFixed(0)}% Used</span>
                </div>
                 <CardDescription>Remaining: {formatCurrency(budget.remaining_budget)}</CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={percentage} />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{formatCurrency(budget.amount_spent)}</span>
                    <span>{formatCurrency(budget.total_amount)}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default function BudgetManager() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [totalAmount, setTotalAmount] = useState<number | ''>('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const queryClient = useQueryClient();

    const { data: budgets, isLoading } = useQuery({
        queryKey: ['budgetsWithStatus'],
        queryFn: getBudgetsWithStatus,
    });

    const createBudgetMutation = useMutation({
        mutationFn: createBudget,
        onSuccess: () => {
            toast.success('Budget created successfully!');
            queryClient.invalidateQueries({ queryKey: ['budgetsWithStatus'] });
            setIsDialogOpen(false);
            setName('');
            setTotalAmount('');
            setDateRange(undefined);
        },
        onError: (error: any) => {
            toast.error(`Failed to create budget: ${error.message}`);
        },
    });

    const handleSubmit = () => {
        // THIS IS THE FIX: The logic now correctly checks for a start AND end date.
        if (!name || !totalAmount || !dateRange?.from || !dateRange?.to) {
            return toast.error('Please fill all fields: Name, Total Amount, and a valid Date Range.');
        }
        createBudgetMutation.mutate({
            name,
            total_amount: Number(totalAmount),
            start_date: dateRange.from.toISOString(),
            end_date: dateRange.to.toISOString(),
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Budget Management</h1>
                    <p className="text-muted-foreground">Create and track departmental or project-based budgets in real-time.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> New Budget</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create a New Budget</DialogTitle>
                            <DialogDescription>Define a new budget to track expenses against.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">Budget Name</Label>
                                <Input id="name" placeholder="e.g., Marketing Q4 2025" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="totalAmount">Total Amount (UGX)</Label>
                                <Input id="totalAmount" type="number" placeholder="50000000" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>Budget Period</Label>
                                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={createBudgetMutation.isPending}>
                                {createBudgetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Budget
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? <div className="text-center p-8">Loading budgets...</div> :
             budgets && budgets.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {budgets.map((budget: any) => <BudgetCard key={budget.id} budget={budget} />)}
                </div>
             ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">No Budgets Found</h3>
                    <p className="text-muted-foreground mt-1">Create your first budget to start tracking expenses.</p>
                </div>
             )
            }
        </div>
    );
}