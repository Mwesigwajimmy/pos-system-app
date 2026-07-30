'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useForm, useFieldArray, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormState } from 'react-dom';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
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
    Plus, Trash2, Loader2,
    ArrowRight, ArrowLeft
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

import { createBudgetAction, generateDraftBudgetAction, FormState } from '@/lib/actions';
import { Account } from '@/lib/types';

const BudgetLineSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  accountType: z.string(),
  budgetedAmount: z.coerce.number().min(0, "Amount must be positive"),
});

const formSchema = z.object({
    name: z.string().min(3, "Enter a name of at least 3 characters."),
    year: z.coerce.number().int().min(2020),
    lines: z.array(BudgetLineSchema).min(1, "Add at least one account.")
});

type FormData = z.infer<typeof formSchema>;
type BudgetLine = FormData['lines'][number];

interface CreateBudgetModalProps {
    accounts: Account[];
    businessId: string;
}

const CURRENCY = 'UGX';
const STEPS = ['Details', 'Starting point', 'Amounts'];

const isRevenue = (type?: string) => {
    const t = (type || '').toLowerCase();
    return t === 'revenue' || t === 'income';
};

const isExpense = (type?: string) => {
    const t = (type || '').toLowerCase();
    return t.includes('expense') || t === 'cost of goods sold' || t === 'cogs' || t === 'overhead';
};

export function CreateBudgetModal({ accounts, businessId }: CreateBudgetModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [historicalYear, setHistoricalYear] = useState(new Date().getFullYear() - 1);
    const [growthFactor, setGrowthFactor] = useState(10);
    const [accountToAdd, setAccountToAdd] = useState('');
    const formRef = useRef<HTMLFormElement>(null);

    const { register, control, handleSubmit, formState: { errors }, watch, reset, trigger } = useForm<FormData>({
        resolver: zodResolver(formSchema) as Resolver<FormData>,
        defaultValues: { name: '', year: new Date().getFullYear() + 1, lines: [] }
    });

    const { fields, replace, append, remove } = useFieldArray({ control, name: "lines" });
    const watchedLines = watch("lines");

    const budgetableAccounts = useMemo(
        () => (accounts || []).filter((a: any) => isRevenue(a.type || a.account_type) || isExpense(a.type || a.account_type)),
        [accounts]
    );

    const unusedAccounts = useMemo(() => {
        const used = new Set((watchedLines || []).map(l => l.accountId));
        return budgetableAccounts.filter((a: any) => !used.has(a.id));
    }, [budgetableAccounts, watchedLines]);

    const totals = useMemo(() => {
        const lines = watchedLines || [];
        const revenue = lines
            .filter(l => isRevenue(l.accountType))
            .reduce((sum, line) => sum + (Number(line.budgetedAmount) || 0), 0);

        const expenses = lines
            .filter(l => isExpense(l.accountType))
            .reduce((sum, line) => sum + (Number(line.budgetedAmount) || 0), 0);

        return { totalRevenue: revenue, totalExpenses: expenses, netProfit: revenue - expenses };
    }, [watchedLines]);

    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createBudgetAction, initialState);

    const closeAndReset = () => {
        setIsOpen(false);
        reset();
        setStep(1);
        setAccountToAdd('');
        setIsSubmitting(false);
    };

    useEffect(() => {
        if (formState.message) {
            setIsSubmitting(false);
            if (formState.success) {
                toast.success("Budget saved");
                closeAndReset();
            } else {
                toast.error(formState.message);
            }
        }
    }, [formState]);

    const goToAmounts = () => {
        setStep(3);
        setAccountToAdd('');
    };

    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        try {
            const result = await generateDraftBudgetAction(businessId, historicalYear, growthFactor);
            if (result.success && result.data) {
                const lines = result.data as BudgetLine[];
                if (!lines.length) {
                    toast.error(`No activity found for ${historicalYear}`);
                    return;
                }
                replace(lines);
                goToAmounts();
                toast.success("Draft ready");
            } else {
                toast.error(result.message || "Could not build the draft");
            }
        } catch (error) {
            toast.error("Could not reach the server");
        } finally {
            setIsGenerating(false);
        }
    };

    const startBlank = () => {
        if (!budgetableAccounts.length) {
            toast.error("No revenue or expense accounts found");
            return;
        }
        replace(budgetableAccounts.map((a: any) => ({
            accountId: a.id,
            accountName: a.name,
            accountType: a.type || a.account_type || '',
            budgetedAmount: 0,
        })));
        goToAmounts();
    };

    const addAccountLine = () => {
        const account: any = unusedAccounts.find((a: any) => a.id === accountToAdd);
        if (!account) return;
        append({
            accountId: account.id,
            accountName: account.name,
            accountType: account.type || account.account_type || '',
            budgetedAmount: 0,
        });
        setAccountToAdd('');
    };

    const handleContinueFromDetails = async () => {
        const valid = await trigger(['name', 'year']);
        if (valid) setStep(2);
    };

    const onFormSubmit = (data: FormData) => {
        setIsSubmitting(true);
        const formData = new FormData(formRef.current!);
        formData.set('business_id', businessId);
        formData.set('lines', JSON.stringify(data.lines));
        formAction(formData);
    };

    const years = [0, 1, 2].map(offset => new Date().getFullYear() - offset);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAndReset(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
                <Button className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4" />
                    New budget
                </Button>
            </DialogTrigger>

            <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
                        <DialogTitle className="text-base font-semibold text-slate-900">New budget</DialogTitle>
                        <div className="mt-3 flex items-center gap-2">
                            {STEPS.map((label, i) => (
                                <div key={label} className="flex flex-1 items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className={cn(
                                            "h-1 rounded-full",
                                            step > i ? "bg-slate-900" : "bg-slate-200"
                                        )} />
                                        <p className={cn(
                                            "mt-1.5 truncate text-[11px]",
                                            step === i + 1 ? "font-medium text-slate-900" : "text-slate-400"
                                        )}>
                                            {label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
                        {step === 1 && (
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-slate-500">Budget name</Label>
                                    <Input
                                        placeholder="Annual budget 2026"
                                        {...register("name")}
                                        className="h-11 rounded-lg border-slate-200 text-sm"
                                    />
                                    {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-slate-500">Year</Label>
                                    <Input
                                        type="number"
                                        inputMode="numeric"
                                        {...register("year")}
                                        className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                                    />
                                    {errors.year && <p className="text-xs text-red-600">{errors.year.message}</p>}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="space-y-4 rounded-xl border border-slate-200 p-5">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Build from past figures</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Takes what each account actually did and adjusts it by the growth you set.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-slate-500">Based on</Label>
                                            <Select value={String(historicalYear)} onValueChange={(val) => setHistoricalYear(Number(val))}>
                                                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg">
                                                    {years.map(y => (
                                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-slate-500">Growth</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    inputMode="numeric"
                                                    value={growthFactor}
                                                    onChange={(e) => setGrowthFactor(Number(e.target.value) || 0)}
                                                    className="h-11 rounded-lg border-slate-200 pr-8 text-sm tabular-nums"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleGenerateDraft}
                                        disabled={isGenerating}
                                        className="h-11 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto sm:px-6"
                                    >
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Build draft
                                    </Button>
                                </div>

                                <div className="space-y-4 rounded-xl border border-slate-200 p-5">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Start empty</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Lists your {budgetableAccounts.length} revenue and expense accounts at zero for you to fill in.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={startBlank}
                                        className="h-11 w-full rounded-lg border-slate-200 text-sm font-medium sm:w-auto sm:px-6"
                                    >
                                        Start empty
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5">
                                <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
                                    <div className="px-5 py-4">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Revenue</p>
                                        <p className="mt-1.5 text-lg font-semibold tabular-nums text-slate-900">
                                            {formatCurrency(totals.totalRevenue, CURRENCY)}
                                        </p>
                                    </div>
                                    <div className="px-5 py-4">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Expenses</p>
                                        <p className="mt-1.5 text-lg font-semibold tabular-nums text-slate-900">
                                            {formatCurrency(totals.totalExpenses, CURRENCY)}
                                        </p>
                                    </div>
                                    <div className="px-5 py-4">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Net</p>
                                        <p className={cn(
                                            "mt-1.5 text-lg font-semibold tabular-nums",
                                            totals.netProfit >= 0 ? "text-slate-900" : "text-red-600"
                                        )}>
                                            {formatCurrency(totals.netProfit, CURRENCY)}
                                        </p>
                                    </div>
                                </div>

                                {errors.lines && typeof errors.lines.message === 'string' ? (
                                    <p className="text-xs text-red-600">{errors.lines.message}</p>
                                ) : null}

                                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                    {fields.length === 0 ? (
                                        <p className="px-5 py-12 text-center text-sm text-slate-400">
                                            No accounts added yet
                                        </p>
                                    ) : (
                                        fields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm text-slate-900">{field.accountName}</p>
                                                    <p className="mt-0.5 truncate text-xs capitalize text-slate-400">
                                                        {(field.accountType || '').toLowerCase()}
                                                    </p>
                                                </div>
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    {...register(`lines.${index}.budgetedAmount`)}
                                                    className="h-10 w-28 shrink-0 rounded-lg border-slate-200 text-right text-sm tabular-nums sm:w-40"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => remove(index)}
                                                    className="h-9 w-9 shrink-0 p-0 text-slate-400 hover:text-red-600"
                                                    aria-label="Remove"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {unusedAccounts.length > 0 ? (
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Select value={accountToAdd} onValueChange={setAccountToAdd}>
                                            <SelectTrigger className="h-11 flex-1 rounded-lg border-slate-200 text-sm">
                                                <SelectValue placeholder="Add another account" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-72 rounded-lg">
                                                {unusedAccounts.map((a: any) => (
                                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addAccountLine}
                                            disabled={!accountToAdd}
                                            className="h-11 rounded-lg border-slate-200 px-5 text-sm font-medium"
                                        >
                                            <Plus size={15} className="mr-2" />
                                            Add
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
                        {step === 1 ? (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={closeAndReset}
                                    className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleContinueFromDetails}
                                    className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    Continue
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        ) : step === 2 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setStep(1)}
                                className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(2)}
                                    className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || fields.length === 0}
                                    className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save budget
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}