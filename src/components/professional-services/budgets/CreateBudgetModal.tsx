// src/components/professional-services/budgets/CreateBudgetModal.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
// IMPORT FIX: Added 'Resolver' import
import { useForm, useFieldArray, Controller, Resolver } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createBudgetAction, generateDraftBudgetAction, FormState } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Account } from '@/components/ledger/CreateJournalEntryModal'; 

const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  accountType: z.string(),
  budgetedAmount: z.coerce.number().min(0),
});

const formSchema = z.object({
    name: z.string().min(3, { message: "Budget name is required." }),
    // Added .int() based on your working code sample for a fiscal year
    year: z.coerce.number().int().min(2020), 
    lines: z.array(BudgetLineSchema).min(1)
});
type FormData = z.infer<typeof formSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Saving Budget...' : 'Save and Activate Budget'}</Button>;
}

export function CreateBudgetModal({ accounts }: { accounts: Account[] }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [historicalYear, setHistoricalYear] = useState(new Date().getFullYear() - 1);
    const [growthFactor, setGrowthFactor] = useState(10);
    const formRef = useRef<HTMLFormElement>(null);

    // FIX: Apply the Resolver<FormData> assertion on zodResolver
    const { register, control, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
        resolver: zodResolver(formSchema) as Resolver<FormData>, 
        defaultValues: { name: '', year: new Date().getFullYear() + 1, lines: [] }
    });
    
    const { fields, replace } = useFieldArray({ control, name: "lines" });
    const watchedLines = watch("lines");

    const { totalRevenue, totalExpenses, netProfit } = useMemo(() => {
        const revenue = watchedLines.filter(l => l.accountType === 'Revenue').reduce((sum, line) => sum + line.budgetedAmount, 0);
        const expenses = watchedLines.filter(l => l.accountType === 'Expense').reduce((sum, line) => sum + line.budgetedAmount, 0);
        return { totalRevenue: revenue, totalExpenses: expenses, netProfit: revenue - expenses };
    }, [watchedLines]);

    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createBudgetAction, initialState);

    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        formData.set('lines', JSON.stringify(data.lines));
        formAction(formData);
    };

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Success!", description: formState.message });
                setIsOpen(false); reset(); setStep(1);
            } else {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast, reset]);

    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        const result = await generateDraftBudgetAction(historicalYear, growthFactor);
        if (result.success && result.data) {
            replace(result.data as FormData['lines']); // Assert to the correct lines array type
            setStep(3);
        } else {
            toast({ title: "Generation Failed", description: result.message || "Could not generate draft.", variant: 'destructive' });
        }
        setIsGenerating(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> New Budget</Button></DialogTrigger>
            <DialogContent className="max-w-4xl">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Create New Financial Budget</DialogTitle>
                        <DialogDescription>Use the AI-powered assistant to create a data-driven budget in minutes.</DialogDescription>
                    </DialogHeader>

                    {step === 1 && (
                        <div className="py-6 space-y-4">
                            <h3 className="font-semibold text-lg">Step 1: Define Your Budget</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Budget Name</Label><Input placeholder="e.g., 2025 Annual Operating Budget" {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
                                <div className="space-y-1"><Label>Fiscal Year for this Budget</Label><Input type="number" {...register("year")} />{errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}</div>
                            </div>
                            <DialogFooter className="mt-8"><Button type="button" onClick={() => setStep(2)}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter>
                        </div>
                    )}
                    
                    {step === 2 && (
                        <div className="py-6 space-y-4">
                             <h3 className="font-semibold text-lg">Step 2: Generate with AI</h3>
                            <div className="p-4 border bg-muted/50 rounded-lg grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Use Historical Data From</Label>
                                    <Select value={String(historicalYear)} onValueChange={(val) => setHistoricalYear(Number(val))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={String(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1} Actuals</SelectItem>
                                            <SelectItem value={String(new Date().getFullYear() - 2)}>{new Date().getFullYear() - 2} Actuals</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Apply Growth/Cut Factor (%)</Label>
                                    <Input type="number" value={growthFactor} onChange={(e) => setGrowthFactor(Number(e.target.value))} />
                                </div>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button type="button" onClick={handleGenerateDraft} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate Draft Budget
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="py-6 space-y-4">
                            <h3 className="font-semibold text-lg">Step 3: Review & Refine</h3>
                            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div><p className="text-sm text-muted-foreground">Budgeted Revenue</p><p className="font-bold text-lg">{formatCurrency(totalRevenue, 'USD')}</p></div>
                                <div><p className="text-sm text-muted-foreground">Budgeted Expenses</p><p className="font-bold text-lg">{formatCurrency(totalExpenses, 'USD')}</p></div>
                                <div className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}><p className="text-sm">Projected Net Profit</p><p className="font-bold text-lg">{formatCurrency(netProfit, 'USD')}</p></div>
                            </div>
                            <div className="h-96 overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Budgeted Amount</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="font-medium">{field.accountName}</TableCell>
                                                <TableCell><Input type="number" step="0.01" {...register(`lines.${index}.budgetedAmount`)} className="text-right" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button type="button" variant="ghost" onClick={() => setStep(2)}>Back</Button>
                                <SubmitButton />
                            </DialogFooter>
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}