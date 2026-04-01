// src/components/professional-services/budgets/CreateBudgetModal.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';

// Actions & Utils
import { createBudgetAction, generateDraftBudgetAction, FormState } from '@/lib/actions';
import { formatCurrency, cn } from '@/lib/utils';
import { Account } from '@/lib/types'; 

// UI Library Components
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons & Utilities
import { 
    PlusCircle, Sparkles, Loader2, 
    ArrowRight, ArrowLeft, CheckCircle2, Target, 
    BarChart3, Calculator, TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';

// --- Validation Schema ---
const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  accountType: z.string(),
  budgetedAmount: z.coerce.number().min(0, "Amount must be positive"),
});

const formSchema = z.object({
    name: z.string().min(3, "Budget name must be at least 3 characters."),
    year: z.coerce.number().int().min(2020), 
    lines: z.array(BudgetLineSchema).min(1, "At least one account must be mapped.")
});

type FormData = z.infer<typeof formSchema>;

/**
 * SUB-COMPONENT: SUBMIT BUTTON
 */
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-11 px-10 font-bold shadow-md" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save & Activate Budget
                </>
            )}
        </Button>
    );
}

interface CreateBudgetModalProps {
    accounts: Account[];
    businessId: string; 
}

export function CreateBudgetModal({ accounts, businessId }: CreateBudgetModalProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // AI Forecast States
    const [historicalYear, setHistoricalYear] = useState(new Date().getFullYear());
    const [growthFactor, setGrowthFactor] = useState(10);
    
    const formRef = useRef<HTMLFormElement>(null);

    const { register, control, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
        resolver: zodResolver(formSchema) as Resolver<FormData>, 
        defaultValues: { 
            name: '', 
            year: new Date().getFullYear() + 1, 
            lines: [] 
        }
    });
    
    const { fields, replace } = useFieldArray({ control, name: "lines" });
    const watchedLines = watch("lines");

    const { totalRevenue, totalExpenses, netProfit } = useMemo(() => {
        const lines = watchedLines || [];
        const revenue = lines
            .filter(l => l.accountType?.toLowerCase() === 'revenue' || l.accountType?.toLowerCase() === 'income')
            .reduce((sum, line) => sum + (Number(line.budgetedAmount) || 0), 0);
        const expenses = lines
            .filter(l => l.accountType?.toLowerCase() === 'expense')
            .reduce((sum, line) => sum + (Number(line.budgetedAmount) || 0), 0);
            
        return { totalRevenue: revenue, totalExpenses: expenses, netProfit: revenue - expenses };
    }, [watchedLines]);

    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createBudgetAction, initialState);

    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        formData.append('business_id', businessId);
        formData.set('lines', JSON.stringify(data.lines));
        formAction(formData);
    };

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Success", description: "Budget created successfully." });
                setIsOpen(false); 
                reset(); 
                setStep(1);
            } else {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast, reset]);

    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        try {
            const result = await generateDraftBudgetAction(businessId, historicalYear, growthFactor);
            if (result.success && result.data) {
                replace(result.data as FormData['lines']);
                setStep(3);
                toast({ title: "Draft Ready", description: "Forecast generated from history." });
            } else {
                toast({ title: "Analysis Failed", description: result.message || "Could not access data.", variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: "Connection Error", description: "Backend synchronization failed.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm font-bold h-10 px-6">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Budget
                </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-4xl p-0 border-none rounded-xl overflow-hidden shadow-2xl bg-white">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col h-full max-h-[90vh]">
                    <DialogHeader className="p-8 border-b bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 uppercase tracking-tight">Budget Setup</DialogTitle>
                                    <Badge variant="secondary" className="mt-1 text-[10px] font-bold uppercase tracking-wider bg-white text-blue-600 border border-blue-100">
                                        Tenant: {businessId.slice(0,8)}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8">
                        {/* STEP 1: INITIALIZATION */}
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Budget Name</Label>
                                        <Input placeholder="e.g., Annual Budget 2025" {...register("name")} className="bg-white h-11 font-semibold" />
                                        {errors.name && <p className="text-xs text-red-600 font-semibold">{errors.name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Fiscal Year</Label>
                                        <Input type="number" {...register("year")} className="bg-white h-11 font-mono font-bold" />
                                        {errors.year && <p className="text-xs text-red-600 font-semibold">{errors.year.message}</p>}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="button" onClick={() => setStep(2)} className="h-11 px-10 bg-slate-900 text-white font-bold rounded-lg shadow-sm">
                                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {/* STEP 2: AI FORECASTING */}
                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="p-8 bg-blue-50/30 border border-blue-100 rounded-xl space-y-6">
                                    <div className="flex items-center gap-3 text-blue-700">
                                        <Sparkles className="w-5 h-5" />
                                        <h3 className="font-bold text-lg">Smart Forecasting Engine</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Historical Benchmark</Label>
                                            <Select value={String(historicalYear)} onValueChange={(val) => setHistoricalYear(Number(val))}>
                                                <SelectTrigger className="bg-white h-11 font-semibold border-slate-200"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={String(new Date().getFullYear())} className="font-medium">{new Date().getFullYear()} Actuals</SelectItem>
                                                    <SelectItem value={String(new Date().getFullYear() - 1)} className="font-medium">{new Date().getFullYear() - 1} Actuals</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Growth Projection (%)</Label>
                                            <div className="relative">
                                                <Calculator className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                                                <Input type="number" value={growthFactor} onChange={(e) => setGrowthFactor(Number(e.target.value))} className="pl-10 h-11 bg-white font-bold border-slate-200" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11 font-semibold border-slate-200">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button type="button" onClick={handleGenerateDraft} disabled={isGenerating} className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 shadow-sm">
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate Draft
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ALLOCATION */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Summary Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <TrendingUp size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Planned Revenue</span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-900">{formatCurrency(totalRevenue, 'UGX')}</p>
                                    </div>
                                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <TrendingDown size={14} className="text-red-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Planned Expenses</span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-900">{formatCurrency(totalExpenses, 'UGX')}</p>
                                    </div>
                                    <div className="p-5 bg-slate-900 rounded-xl shadow-lg border-none text-white">
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <DollarSign size={14} className="text-emerald-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Net Income</span>
                                        </div>
                                        <p className={cn("text-xl font-bold", netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                            {formatCurrency(netProfit, 'UGX')}
                                        </p>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <ScrollArea className="h-[350px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="py-4 text-[10px] font-bold uppercase text-slate-500 pl-8 tracking-wider">Ledger Account</TableHead>
                                                    <TableHead className="text-right py-4 text-[10px] font-bold uppercase text-slate-500 pr-8 tracking-wider">Allocation (UGX)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {fields.map((field, index) => (
                                                    <TableRow key={field.id} className="hover:bg-slate-50 transition-colors border-slate-100 last:border-0">
                                                        <TableCell className="pl-8 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800 text-sm tracking-tight">{field.accountName}</span>
                                                                <Badge variant="secondary" className="w-fit text-[9px] font-bold uppercase mt-1 px-1.5 h-4 bg-slate-100 text-slate-500 border-none">
                                                                    {field.accountType}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="pr-8">
                                                            <div className="relative w-40 ml-auto">
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.01" 
                                                                    {...register(`lines.${index}.budgetedAmount`)} 
                                                                    className="text-right h-10 font-bold border-slate-200 focus:ring-blue-600 rounded-lg pr-3" 
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                        {step > 1 ? (
                            <Button type="button" variant="ghost" onClick={() => setStep(prev => prev - 1)} className="font-semibold text-slate-500 h-11 px-8">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Previous Step
                            </Button>
                        ) : (
                            <div />
                        )}
                        {step === 3 && <SubmitButton />}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}