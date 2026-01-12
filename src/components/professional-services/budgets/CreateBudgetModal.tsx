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
    ArrowRight, ArrowLeft, ShieldCheck, Target, 
    DatabaseZap, Calculator 
} from 'lucide-react';

/**
 * ENTERPRISE VALIDATION SCHEMA
 * Ensures data integrity before ledger operations.
 */
const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  accountType: z.string(),
  budgetedAmount: z.coerce.number().min(0, "Amount must be positive"),
});

const formSchema = z.object({
    name: z.string().min(3, "Budget designation must be at least 3 characters."),
    year: z.coerce.number().int().min(2020), 
    lines: z.array(BudgetLineSchema).min(1, "At least one ledger account must be mapped.")
});

type FormData = z.infer<typeof formSchema>;

/**
 * SUB-COMPONENT: STRATEGIC SUBMIT BUTTON
 * Handles the 'pending' state via React DOM status.
 */
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="bg-blue-700 hover:bg-blue-800 shadow-lg px-10 font-black uppercase tracking-tighter" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing Ledger...
                </>
            ) : (
                <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Commit and Activate Budget
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
    
    // AI Forecast Parameter States
    const [historicalYear, setHistoricalYear] = useState(new Date().getFullYear());
    const [growthFactor, setGrowthFactor] = useState(10);
    
    const formRef = useRef<HTMLFormElement>(null);

    // 1. Form Initialization with Type-Safe Resolver
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

    // 2. Real-time GAAP Calculation Engine
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

    // 3. Server Action Transition Management
    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createBudgetAction, initialState);

    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        // Ensure business_id is passed for multi-tenant isolation
        formData.append('business_id', businessId);
        formData.set('lines', JSON.stringify(data.lines));
        formAction(formData);
    };

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Budget Operational", description: "Strategic fiscal blueprint synchronized successfully." });
                setIsOpen(false); 
                reset(); 
                setStep(1);
            } else {
                toast({ title: "ERP Engine Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast, reset]);

    /**
     * AI STRATEGIC FORECAST ENGINE
     * FIXED: Utilizing full 3-argument signature (businessId, historicalYear, growthFactor).
     */
    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        try {
            const result = await generateDraftBudgetAction(businessId, historicalYear, growthFactor);
            
            if (result.success && result.data) {
                replace(result.data as FormData['lines']);
                setStep(3);
                toast({ title: "AI Draft Ready", description: "Ledger historical patterns projected successfully." });
            } else {
                toast({ 
                    title: "AI Analysis Failed", 
                    description: result.message || "Could not access historical ledger data.", 
                    variant: 'destructive' 
                });
            }
        } catch (error) {
            toast({ title: "Ledger Connection Interrupt", description: "Failed to connect to the ERP backend.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 shadow-2xl hover:bg-slate-800 transition-all font-black uppercase tracking-tighter">
                    <PlusCircle className="mr-2 h-4 w-4" /> Initialize New Budget
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-5xl border-t-8 border-t-blue-600 shadow-2xl rounded-2xl overflow-hidden">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <Target className="w-7 h-7 text-blue-600" />
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Strategic Budgeting Wizard</DialogTitle>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-200 bg-blue-50">
                                Tenant Auth: {businessId.slice(0,8)}
                            </Badge>
                        </div>
                        <DialogDescription className="pt-2 text-slate-500 font-medium">
                            Authorized ERP environment. Follow the high-performance 3-step protocol to establish data-driven financial targets.
                        </DialogDescription>
                    </DialogHeader>

                    {/* PHASE 1: METADATA & OBJECTIVES */}
                    {step === 1 && (
                        <div className="py-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Strategic Plan Designation</Label>
                                    <Input placeholder="e.g., FY25 Global Expansion Plan" {...register("name")} className="bg-white h-14 text-xl font-bold border-slate-200 focus:ring-blue-500" />
                                    {errors.name && <p className="text-xs text-red-600 font-bold italic">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Target Fiscal Year</Label>
                                    <Input type="number" {...register("year")} className="bg-white h-14 font-mono text-xl font-bold border-slate-200" />
                                    {errors.year && <p className="text-xs text-red-600 font-bold italic">{errors.year.message}</p>}
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" onClick={() => setStep(2)} className="h-14 px-14 text-lg font-black uppercase tracking-tighter shadow-blue-500/20 shadow-2xl">
                                    Configure Strategy <ArrowRight className="ml-2 h-6 w-6" />
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                    
                    {/* PHASE 2: AI TREND ANALYSIS */}
                    {step === 2 && (
                        <div className="py-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="p-10 bg-purple-50/50 border border-purple-100 rounded-3xl space-y-10 relative overflow-hidden">
                                <div className="absolute -right-6 -top-6 opacity-5">
                                    <DatabaseZap className="w-40 h-40 text-purple-900" />
                                </div>
                                <div className="flex items-center gap-3 text-purple-900">
                                    <Sparkles className="w-7 h-7" />
                                    <h3 className="font-black uppercase text-xl tracking-tight">AI Forecasting Engine</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-10 relative z-10">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">Historical Benchmark (Year)</Label>
                                        <Select value={String(historicalYear)} onValueChange={(val) => setHistoricalYear(Number(val))}>
                                            <SelectTrigger className="bg-white h-14 font-black text-lg"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={String(new Date().getFullYear())} className="font-bold">{new Date().getFullYear()} Current Performance</SelectItem>
                                                <SelectItem value={String(new Date().getFullYear() - 1)} className="font-bold">{new Date().getFullYear() - 1} Actual Ledger History</SelectItem>
                                                <SelectItem value={String(new Date().getFullYear() - 2)} className="font-bold">{new Date().getFullYear() - 2} Actual Ledger History</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-purple-700 tracking-widest font-mono">Projected Strategic Variance (%)</Label>
                                        <div className="relative">
                                            <Calculator className="absolute left-5 top-4.5 h-6 w-6 text-purple-300" />
                                            <Input type="number" value={growthFactor} onChange={(e) => setGrowthFactor(Number(e.target.value))} className="pl-14 h-14 bg-white font-mono text-xl font-black text-purple-700 border-purple-200" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex justify-between w-full pt-4">
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-14 font-bold border-2"><ArrowLeft className="mr-2 h-5 w-5" /> Previous</Button>
                                <Button type="button" onClick={handleGenerateDraft} disabled={isGenerating} className="h-14 bg-purple-700 hover:bg-purple-800 text-white font-black uppercase tracking-tighter px-12 shadow-purple-500/20 shadow-2xl">
                                    {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                    Sync AI Forecast
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {/* PHASE 3: FINANCIAL RECONCILIATION */}
                    {step === 3 && (
                        <div className="py-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                            {/* EXECUTIVE PERFORMANCE SUMMARY */}
                            <div className="grid grid-cols-3 gap-8 bg-slate-900 text-white p-10 rounded-3xl shadow-2xl border border-slate-700">
                                <div className="space-y-1"><p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Projected Revenue</p><p className="font-mono text-3xl font-black text-blue-400">{formatCurrency(totalRevenue, 'USD')}</p></div>
                                <div className="border-x border-slate-700 px-8"><p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Ceiling Expenses</p><p className="font-mono text-3xl font-black text-red-400">{formatCurrency(totalExpenses, 'USD')}</p></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Net ERP Delta</p>
                                    <p className={cn("font-mono text-3xl font-black", netProfit >= 0 ? "text-green-400" : "text-red-500")}>
                                        {formatCurrency(netProfit, 'USD')}
                                    </p>
                                </div>
                            </div>

                            {/* ACCOUNT-LEVEL ALLOCATION GRID */}
                            <ScrollArea className="h-[450px] rounded-3xl border bg-white shadow-inner overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-md">
                                        <TableRow className="border-none">
                                            <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest pl-8 text-slate-400">General Ledger Account</TableHead>
                                            <TableHead className="text-right py-6 font-black uppercase text-[10px] tracking-widest pr-8 text-slate-400">Allocated Blueprint</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                                                <TableCell className="pl-8">
                                                    <div className="flex flex-col py-2">
                                                        <span className="font-black text-slate-800 text-base tracking-tight">{field.accountName}</span>
                                                        <Badge variant="secondary" className="w-fit text-[8px] uppercase tracking-widest h-5 bg-slate-100 font-black text-slate-500 border-none px-2 mt-1">
                                                            {field.accountType}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-8">
                                                    <div className="relative w-56 ml-auto">
                                                        <span className="absolute left-5 top-3.5 text-base text-slate-300 font-black">$</span>
                                                        <Input 
                                                            type="number" 
                                                            step="0.01" 
                                                            {...register(`lines.${index}.budgetedAmount`)} 
                                                            className="text-right font-mono pl-10 h-14 font-black text-xl text-slate-900 bg-white border-2 border-slate-100 focus:border-blue-500 transition-all rounded-2xl shadow-sm" 
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            <DialogFooter className="pt-8 border-t flex justify-between items-center w-full">
                                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="h-14 font-black uppercase tracking-tighter"><ArrowLeft className="mr-2 h-6 w-6" /> Back to AI Analysis</Button>
                                <SubmitButton />
                            </DialogFooter>
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}