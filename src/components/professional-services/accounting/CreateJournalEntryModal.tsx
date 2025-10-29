'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useFormState, useFormStatus } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { createJournalEntryAction, FormState } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Check, ChevronsUpDown, Sparkles } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface Account { id: string; name: string; type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'; }

const JournalLineSchema = z.object({
  accountId: z.string().uuid({ message: "Required" }),
  debit: z.coerce.number().min(0),
  credit: z.coerce.number().min(0),
});

const formSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(3),
  lines: z.array(JournalLineSchema).min(2, { message: "At least two lines are required." })
});

type FormData = z.infer<typeof formSchema>;
type JournalLineData = z.infer<typeof JournalLineSchema>; // Defined type for individual lines

function SubmitButton({ isBalanced }: { isBalanced: boolean }) {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending || !isBalanced}>{pending ? 'Saving...' : 'Save Entry'}</Button>;
}

const AsyncAccountCombobox = ({ control, index, accounts }: { control: any, index: number, accounts: Account[] }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const filteredAccounts = accounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <Controller
            control={control}
            name={`lines.${index}.accountId`}
            render={({ field }) => (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            {field.value ? accounts.find(acc => acc.id === field.value)?.name : "Select Account..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search accounts..." value={searchTerm} onValueChange={setSearchTerm} />
                            <CommandList>
                                <CommandEmpty>No account found.</CommandEmpty>
                                <CommandGroup>
                                    {filteredAccounts.map(acc => (
                                        <CommandItem key={acc.id} value={acc.id} onSelect={() => { field.onChange(acc.id); setOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", field.value === acc.id ? "opacity-100" : "opacity-0")} />
                                            {acc.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        />
    );
};

export function CreateJournalEntryModal({ accounts }: { accounts: Account[] }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [naturalInput, setNaturalInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    
    // FIX 1: Removed the redundant <FormData> generic from useForm and cast defaultValues.
    const { register, control, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            date: new Date().toISOString().substring(0, 10), 
            description: '', 
            lines: [
                { accountId: '', debit: 0, credit: 0 }, 
                { accountId: '', debit: 0, credit: 0 }
            ] 
        } as FormData 
    });
    
    const { fields, append, remove, replace } = useFieldArray({ control, name: "lines" });
    const watchedLines = watch("lines");

    const { totalDebits, totalCredits, difference } = useMemo(() => {
        // FIX 2 (Definitive): Use explicit type assertion on the 'line' variable 
        // to tell TypeScript/Linter the exact type of debit/credit property,
        // resolving the persistent 'line.debit is of type unknown' error.
        const debits = watchedLines.reduce((sum, line) => sum + (line as JournalLineData).debit, 0); 
        const credits = watchedLines.reduce((sum, line) => sum + (line as JournalLineData).credit, 0);
        return { totalDebits: debits, totalCredits: credits, difference: debits - credits };
    }, [watchedLines]);

    const isBalanced = Math.abs(difference) < 0.001 && totalDebits > 0;

    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createJournalEntryAction, initialState);

    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        formData.set('lines', JSON.stringify(data.lines.filter(l => l.accountId)));
        formAction(formData);
    };

    useEffect(() => {
        if (!formState.message) return;
        if (formState.success) {
            toast({ title: "Success!", description: formState.message });
            setIsOpen(false);
            reset(); setNaturalInput('');
        } else {
            toast({ title: "Error", description: formState.message, variant: 'destructive' });
        }
    }, [formState, toast, reset]);

    const handleAutoBalance = () => {
        const zeroDebitLines = watchedLines.filter(l => l.debit === 0);
        const zeroCreditLines = watchedLines.filter(l => l.credit === 0);

        if (difference > 0 && zeroCreditLines.length === 1) {
            const index = watchedLines.indexOf(zeroCreditLines[0]);
            if (index !== -1) setValue(`lines.${index}.credit`, difference);
        } else if (difference < 0 && zeroDebitLines.length === 1) {
            const index = watchedLines.indexOf(zeroDebitLines[0]);
            if (index !== -1) setValue(`lines.${index}.debit`, -difference);
        }
    };
    
    const handleNaturalLanguageParse = async () => {
        setIsParsing(true);
        // In a real app, this is where you'd call a lightweight, local AI model.
        // For this example, we'll simulate it with keyword matching.
        await new Promise(res => setTimeout(res, 500));
        
        const amountMatch = naturalInput.match(/\$?(\d+(\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        
        const cashAcc = accounts.find(a => a.name.toLowerCase() === 'cash');
        const suppliesAcc = accounts.find(a => a.name.toLowerCase().includes('supplies'));
        
        if (naturalInput.toLowerCase().includes('paid') && naturalInput.toLowerCase().includes('supplies') && cashAcc && suppliesAcc && amount > 0) {
            setValue('description', `Purchase of office supplies`);
            replace([{ accountId: suppliesAcc.id, debit: amount, credit: 0 }, { accountId: cashAcc.id, debit: 0, credit: amount }]);
            toast({ title: "AI Parsed Entry", description: "Journal entry has been pre-filled. Please verify." });
        } else {
            toast({ title: "Parsing Failed", description: "The AI could not confidently parse the transaction. Please enter manually.", variant: 'destructive' });
        }
        setIsParsing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> New Journal Entry</Button></DialogTrigger>
            <DialogContent className="max-w-4xl">
                <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Create New Journal Entry</DialogTitle>
                        <DialogDescription>Record a balanced transaction in the general ledger. Use the AI helper or enter manually.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="my-4 p-4 border bg-muted/50 rounded-lg">
                        <Label htmlFor="natural-input" className="flex items-center gap-2 mb-2 font-semibold">
                            <Sparkles className="h-5 w-5 text-primary" /> AI-Powered Entry
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input id="natural-input" placeholder="e.g., Paid $500 cash for office supplies..." value={naturalInput} onChange={(e) => setNaturalInput(e.target.value)} />
                            <Button type="button" onClick={handleNaturalLanguageParse} disabled={isParsing}>
                                {isParsing ? 'Parsing...' : 'Parse'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                        <div className="space-y-1"><Label htmlFor="date">Date</Label><Input id="date" type="date" {...register("date")} /></div>
                        <div className="space-y-1 md:col-span-2"><Label htmlFor="description">Description</Label><Input id="description" {...register("description")} /></div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">Account</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell><AsyncAccountCombobox control={control} index={index} accounts={accounts} /></TableCell>
                                    <TableCell><Input type="number" step="0.01" placeholder="0.00" {...register(`lines.${index}.debit`)} className="text-right" onBlur={handleAutoBalance} /></TableCell>
                                    <TableCell><Input type="number" step="0.01" placeholder="0.00" {...register(`lines.${index}.credit`)} className="text-right" onBlur={handleAutoBalance} /></TableCell>
                                    <TableCell>
                                        {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell><Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: '', debit: 0, credit: 0 })}>Add Line</Button></TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalDebits, 'USD')}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalCredits, 'USD')}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    <div className="mt-4 flex justify-end">
                        <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-base px-4 py-2">
                            {isBalanced ? 'Balanced' : `Out of Balance: ${formatCurrency(difference, 'USD')}`}
                        </Badge>
                    </div>
                    {errors.lines && <p className="text-sm text-destructive mt-2">{errors.lines.message}</p>}

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <SubmitButton isBalanced={isBalanced} />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}