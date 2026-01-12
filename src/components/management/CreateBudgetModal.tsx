// src/components/management/CreateBudgetModal.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

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
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Icons & Utilities
import { 
    PlusCircle, Trash2, Sparkles, Loader2, 
    ArrowRight, ArrowLeft, Target, Calculator, ShieldCheck, 
    DatabaseZap
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

// Enterprise Interconnects
import { createBudgetAction, generateDraftBudgetAction, FormState } from '@/lib/actions';
import { Account } from '@/lib/types'; 

// --- Enterprise Validation Schema ---
const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  accountType: z.string(),
  budgetedAmount: z.coerce.number().min(0, "Amount must be positive"),
});

const formSchema = z.object({
    name: z.string().min(3, "Budget name must be at least 3 characters."),
    year: z.coerce.number().int().min(2020),
    lines: z.array(BudgetLineSchema).min(1, "At least one budget line is required.")
});

type FormData = z.infer<typeof formSchema>;

interface CreateBudgetModalProps {
    accounts: Account[];
    businessId: string; 
}

// --- Sub-Component: Submit Action Button ---
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-blue-700 hover:bg-blue-800 shadow-xl px-10 font-bold">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Committing to Ledger...
                </>
            ) : (
                <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Authorize & Activate Budget
                </>
            )}
        </Button>
    );
}

export function CreateBudgetModal({ accounts, businessId }: CreateBudgetModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [historicalYear, setHistoricalYear] = useState(new Date().getFullYear() - 1);
    const [growthFactor, setGrowthFactor] = useState(10);
    const formRef = useRef<HTMLFormElement>(null);

    // 1. Form Initialization with Zod
    const { register, control, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
        resolver: zodResolver(formSchema) as Resolver<FormData>, 
        defaultValues: { name: '', year: new Date().getFullYear() + 1, lines: [] }
    });
    
    const { fields, replace } = useFieldArray({ control, name: "lines" });
    const watchedLines = watch("lines");

    // 2. Real-time Calculation Engine (GAAP Compliant)
    const totals = useMemo(() => {
        const lines = watchedLines || [];
        const revenue = lines
            .filter(l => l.accountType?.toLowerCase() === 'revenue' || l.accountType?.toLowerCase() === 'income')
            .reduce((sum, line) => sum + (Number(line.budgetedAmount) || 0), 0);
        
        const expenses = lines
            .filter(l => l.accountType?.toLowerCase() === 'expense')
            .reduce((sum, line) => sum + (Number(line.budgetedAmount) || 0), 0);
            
        return { 
            totalRevenue: revenue, 
            totalExpenses: expenses, 
            netProfit: revenue - expenses 
        };
    }, [watchedLines]);

    // 3. Server Action State Management
    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createBudgetAction, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast.success("Strategic Financial Plan Post Successful");
                setIsOpen(false); 
                reset(); 
                setStep(1);
            } else {
                toast.error(formState.message);
            }
        }
    }, [formState, reset]);

    // 4. AI Strategic Projection (FIXED ARGUMENT COUNT)
    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        try {
            // FIXED: Passing businessId as the 1st argument to satisfy the Enterprise Action signature
            const result = await generateDraftBudgetAction(businessId, historicalYear, growthFactor);
            
            if (result.success && result.data) {
                replace(result.data as FormData['lines']);
                setStep(3);
                toast.success("AI Strategic Forecast Synchronized");
            } else {
                toast.error(result.message || "Strategic Analysis Engine Timeout");
            }
        } catch (error) {
            toast.error("Ledger Connection Interrupt");
        } finally {
            setIsGenerating(false);
        }
    };

    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        formData.set('business_id', businessId); 
        formData.set('lines', JSON.stringify(data.lines));
        formAction(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 shadow-lg hover:bg-slate-800 transition-all font-bold">
                    <PlusCircle className="mr-2 h-4 w-4" /> Initialize New Budget
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-5xl border-t-8 border-t-blue-600 shadow-2xl rounded-2xl overflow-hidden">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <Target className="w-6 h-6 text-blue-600" />
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Strategic Budgeting Wizard</DialogTitle>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-200 bg-blue-50">
                                Tenant Auth: {businessId.slice(0, 8)}
                            </Badge>
                        </div>
                        <DialogDescription className="pt-2 text-slate-500 font-medium">
                            Authorized ERP environment. Follow the 3-step protocol to establish data-driven financial targets.
                        </DialogDescription>
                    </DialogHeader>

                    {/* STEP 1: INITIALIZATION */}
                    {step === 1 && (
                        <div className="py-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Strategic Plan Designation</Label>
                                    <Input placeholder="e.g., FY2025 Comprehensive Growth" {...register("name")} className="bg-white h-12 text-lg font-bold" />
                                    {errors.name && <p className="text-xs text-red-600 font-bold italic">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Fiscal Period Target</Label>
                                    <Input type="number" {...register("year")} className="bg-white h-12 font-mono text-lg font-bold" />
                                    {errors.year && <p className="text-xs text-red-600 font-bold italic">{errors.year.message}</p>}
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" onClick={() => setStep(2)} className="h-12 px-12 text-lg font-black uppercase tracking-tighter shadow-blue-500/20 shadow-xl">
                                    Next Phase <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                    
                    {/* STEP 2: AI STRATEGIC GENERATION */}
                    {step === 2 && (
                        <div className="py-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="p-8 bg-purple-50/50 border border-purple-100 rounded-3xl space-y-8 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-5">
                                    <DatabaseZap className="w-32 h-32 text-purple-900" />
                                </div>
                                <div className="flex items-center gap-3 text-purple-900">
                                    <Sparkles className="w-6 h-6" />
                                    <h3 className="font-black uppercase text-lg tracking-tight">AI Forecasting Engine</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Historical Baseline (Fiscal Year)</Label>
                                        <Select value={String(historicalYear)} onValueChange={(val) => setHistoricalYear(Number(val))}>
                                            <SelectTrigger className="bg-white h-12 font-bold"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={String(new Date().getFullYear() - 1)} className="font-bold">{new Date().getFullYear() - 1} Actual Ledger History</SelectItem>
                                                <SelectItem value={String(new Date().getFullYear() - 2)} className="font-bold">{new Date().getFullYear() - 2} Actual Ledger History</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-purple-700 tracking-widest">Projected Strategic Variance (%)</Label>
                                        <div className="relative">
                                            <Calculator className="absolute left-4 top-3.5 h-5 w-5 text-purple-300" />
                                            <Input type="number" value={growthFactor} onChange={(e) => setGrowthFactor(Number(e.target.value))} className="pl-12 h-12 bg-white font-mono text-lg font-bold text-purple-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex justify-between w-full pt-4">
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12"><ArrowLeft className="mr-2 h-5 w-5" /> Back</Button>
                                <Button type="button" onClick={handleGenerateDraft} disabled={isGenerating} className="h-12 bg-purple-700 hover:bg-purple-800 text-white font-black uppercase tracking-tighter px-10 shadow-purple-500/20 shadow-xl">
                                    {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                    Generate Strategic Draft
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {/* STEP 3: ANALYTICS REVIEW & POSTING */}
                    {step === 3 && (
                        <div className="py-4 space-y-6 animate-in slide-in-from-right-4 duration-500">
                            {/* EXECUTIVE SUMMARY BAR */}
                            <div className="grid grid-cols-3 gap-6 bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-700">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Total Planned Revenue</p>
                                    <p className="font-mono text-2xl font-black text-blue-400">{formatCurrency(totals.totalRevenue, 'USD')}</p>
                                </div>
                                <div className="border-x border-slate-700 px-6 space-y-1">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Total Strategic Spend</p>
                                    <p className="font-mono text-2xl font-black text-red-400">{formatCurrency(totals.totalExpenses, 'USD')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Projected ERP Delta</p>
                                    <p className={cn("font-mono text-2xl font-black", totals.netProfit >= 0 ? "text-green-400" : "text-red-500")}>
                                        {formatCurrency(totals.netProfit, 'USD')}
                                    </p>
                                </div>
                            </div>

                            {/* ACCOUNT ALLOCATION GRID */}
                            <ScrollArea className="h-[400px] rounded-2xl border bg-white shadow-inner overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                                        <TableRow className="border-none">
                                            <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest pl-6">Ledger Account Account</TableHead>
                                            <TableHead className="text-right py-5 font-black uppercase text-[10px] tracking-widest pr-6">Allocation Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                                                <TableCell className="pl-6">
                                                    <div className="flex flex-col py-1">
                                                        <span className="font-extrabold text-slate-800 text-sm tracking-tight">{field.accountName}</span>
                                                        <Badge variant="secondary" className="w-fit text-[8px] uppercase tracking-widest h-4 bg-slate-100 font-black text-slate-500 border-none">
                                                            {field.accountType}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-6">
                                                    <div className="relative w-48 ml-auto">
                                                        <span className="absolute left-4 top-3 text-sm text-slate-300 font-black">$</span>
                                                        <Input 
                                                            type="number" 
                                                            step="0.01" 
                                                            {...register(`lines.${index}.budgetedAmount`)} 
                                                            className="text-right font-mono pl-9 h-11 font-black text-slate-900 bg-white border-2 border-slate-100 focus:border-blue-500 transition-all rounded-xl" 
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                            
                            <DialogFooter className="pt-6 border-t flex justify-between items-center w-full">
                                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="h-12 font-bold"><ArrowLeft className="mr-2 h-5 w-5" /> Strategic Revision</Button>
                                <SubmitButton />
                            </DialogFooter>
                        </div>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}