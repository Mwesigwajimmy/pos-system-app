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
import { formatCurrency } from '@/lib/utils';
import { Account } from '@/lib/types'; 

// UI Components
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

// Icons
import { PlusCircle, Trash2, Sparkles, Loader2, ArrowRight, ShieldCheck, Target } from 'lucide-react';

/**
 * Enterprise Validation Schema
 */
const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  accountType: z.string(),
  budgetedAmount: z.coerce.number().min(0, "Amount must be positive"),
});

const formSchema = z.object({
    name: z.string().min(3, "Budget name must be at least 3 characters."),
    year: z.coerce.number().int().min(2020), 
    lines: z.array(BudgetLineSchema).min(1, "At least one ledger account must be mapped.")
});

type FormData = z.infer<typeof formSchema>;

/**
 * Internal Submit Button Component
 */
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="bg-blue-700 hover:bg-blue-800" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Committing to Ledger...
                </>
            ) : 'Save and Activate Budget'}
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
    
    // AI Parameter States
    const [historicalYear, setHistoricalYear] = useState(new Date().getFullYear() - 1);
    const [growthFactor, setGrowthFactor] = useState(10);
    
    const formRef = useRef<HTMLFormElement>(null);

    // 1. Form Initialization
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

    // 2. Real-time Calculation
    const { totalRevenue, totalExpenses, netProfit } = useMemo(() => {
        const revenue = (watchedLines || [])
            .filter(l => l.accountType.toLowerCase() === 'revenue')
            .reduce((sum, line) => sum + (line.budgetedAmount || 0), 0);
        const expenses = (watchedLines || [])
            .filter(l => l.accountType.toLowerCase() === 'expense')
            .reduce((sum, line) => sum + (line.budgetedAmount || 0), 0);
        return { totalRevenue: revenue, totalExpenses: expenses, netProfit: revenue - expenses };
    }, [watchedLines]);

    // 3. Server Action Handshake
    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createBudgetAction, initialState);

    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        // Inject businessId into FormData for the main save action
        formData.append('business_id', businessId);
        formData.set('lines', JSON.stringify(data.lines));
        formAction(formData);
    };

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Budget Operational", description: formState.message });
                setIsOpen(false); 
                reset(); 
                setStep(1);
            } else {
                toast({ title: "Authorization Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast, reset]);

    /**
     * AI GENERATION ENGINE
     * FIXED: Added businessId as the first argument to satisfy the Enterprise Action signature.
     */
    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        try {
            // FIXED: Passing businessId as the first argument
            const result = await generateDraftBudgetAction(businessId, historicalYear, growthFactor);
            
            if (result.success && result.data) {
                replace(result.data as FormData['lines']);
                setStep(3);
            } else {
                toast({ 
                    title: "AI Analysis Failed", 
                    description: result.message || "Could not access historical ledger data.", 
                    variant: 'destructive' 
                });
            }
        } catch (error) {
            toast({ title: "Network Error", description: "Failed to connect to the ERP backend.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 shadow-lg">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Budget Blueprint
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl border-t-8 border-t-blue-600">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)}>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-2xl font-black">Configure Financial Budget</DialogTitle>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Tenant ID: {businessId.slice(0,8)}</Badge>
                        </div>
                        <DialogDescription>
                            Enterprise planning tool. Utilize real-time historical trends to forecast performance.
                        </DialogDescription>
                    </DialogHeader>

                    {/* STEP 1: METADATA */}
                    {step === 1 && (
                        <div className="py-6 space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2 mb-4">
                                <Target className="w-5 h-5 text-slate-400" />
                                <h3 className="font-bold text-lg">Step 1: Primary Objectives</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">Budget Designation</Label>
                                    <Input placeholder="e.g., FY25 Operational Forecast" {...register("name")} className="bg-slate-50 border-slate-200" />
                                    {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">Target Fiscal Year</Label>
                                    <Input type="number" {...register("year")} className="bg-slate-50 border-slate-200" />
                                    {errors.year && <p className="text-xs text-destructive font-medium">{errors.year.message}</p>}
                                </div>
                            </div>
                            <DialogFooter className="mt-8">
                                <Button type="button" onClick={() => setStep(2)} className="w-full md:w-auto">
                                    Continue to Strategy <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                    
                    {/* STEP 2: AI INTEGRATION */}
                    {step === 2 && (
                        <div className="py-6 space-y-4">
                             <div className="flex items-center gap-2 border-b pb-2 mb-4">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-lg">Step 2: AI Trend Analysis</h3>
                            </div>
                            <div className="p-6 border-2 border-dashed bg-blue-50/50 rounded-2xl grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500 font-mono">Benchmark Actuals From</Label>
                                    <Select value={String(historicalYear)} onValueChange={(val) => setHistoricalYear(Number(val))}>
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={String(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1} Fiscal Performance</SelectItem>
                                            <SelectItem value={String(new Date().getFullYear() - 2)}>{new Date().getFullYear() - 2} Fiscal Performance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500 font-mono">Growth Delta Projection (%)</Label>
                                    <Input type="number" value={growthFactor} onChange={(e) => setGrowthFactor(Number(e.target.value))} className="bg-white" />
                                </div>
                            </div>
                            <DialogFooter className="mt-8 flex justify-between w-full">
                                <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button type="button" onClick={handleGenerateDraft} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 shadow-lg">
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Sync AI Forecast
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {/* STEP 3: REVIEW GRID */}
                    {step === 3 && (
                        <div className="py-6 space-y-6">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                                <h3 className="font-bold text-lg">Step 3: Financial Reconciliation</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-4 p-5 border bg-slate-900 rounded-2xl text-white shadow-xl">
                                <div><p className="text-[10px] uppercase font-black text-slate-400 mb-1">Target Revenue</p><p className="font-mono text-xl font-bold">{formatCurrency(totalRevenue, 'USD')}</p></div>
                                <div><p className="text-[10px] uppercase font-black text-slate-400 mb-1">Ceiling Expenses</p><p className="font-mono text-xl font-bold">{formatCurrency(totalExpenses, 'USD')}</p></div>
                                <div className={netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    <p className="text-[10px] uppercase font-black text-slate-400 mb-1">EBITDA Projection</p>
                                    <p className="font-mono text-xl font-bold">{formatCurrency(netProfit, 'USD')}</p>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto border rounded-xl shadow-inner bg-slate-50">
                                <Table>
                                    <TableHeader className="bg-white sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase">Ledger Account</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase">Allocated Budget</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id} className="hover:bg-white transition-colors">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-slate-800">{field.accountName}</span>
                                                        <span className="text-[10px] uppercase text-slate-400 font-medium">{field.accountType}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        {...register(`lines.${index}.budgetedAmount`)} 
                                                        className="text-right font-mono font-bold bg-white" 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <DialogFooter className="mt-8 flex justify-between w-full">
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