'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2 } from 'lucide-react';

// --- TYPE DEFINITIONS & VALIDATION SCHEMA (kept in-file) ---
interface ExchangeRate { id: number; currency_code: string; rate: number; effective_date: string; }
interface Currency { code: string; name: string; }

// Using Zod for robust, schema-based validation
const ExchangeRateSchema = z.object({
    id: z.number().optional(),
    currency_code: z.string().min(3, "A currency must be selected."),
    rate: z.coerce.number().positive("Rate must be a positive number."),
    effective_date: z.string().min(1, "An effective date is required."),
});

type TExchangeRateSchema = z.infer<typeof ExchangeRateSchema>;

// --- API HELPER FUNCTIONS ---
const supabase = createClient();

async function fetchExchangeRates(): Promise<ExchangeRate[]> {
    const { data, error } = await supabase.from('exchange_rates').select('*').order('effective_date', { ascending: false });
    if (error) throw new Error("Could not fetch exchange rates.");
    return data;
}

async function fetchCurrencies(): Promise<Currency[]> {
    const { data, error } = await supabase.from('currencies').select('*').order('name');
    if (error) throw new Error("Could not fetch currencies.");
    return data;
}

async function upsertExchangeRate(rateData: TExchangeRateSchema): Promise<ExchangeRate> {
    const { data, error } = await supabase.from('exchange_rates').upsert(rateData).select().single();
    if (error) throw new Error(error.message);
    return data;
}

// --- MAIN PAGE COMPONENT ---
export default function CurrencyManagerPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // --- DATA FETCHING ---
    const { data: rates, isLoading: isLoadingRates, error: ratesError } = useQuery<ExchangeRate[]>({
        queryKey: ['exchangeRates'],
        queryFn: fetchExchangeRates,
    });

    const { data: currencies, isLoading: isLoadingCurrencies } = useQuery<Currency[]>({
        queryKey: ['currencies'],
        queryFn: fetchCurrencies,
        staleTime: 1000 * 60 * 60,
    });

    // --- FORM MANAGEMENT ---
    const form = useForm({
        resolver: zodResolver(ExchangeRateSchema),
        defaultValues: {
            currency_code: '',
            rate: 0,
            effective_date: new Date().toISOString().split('T')[0],
        },
    });

    // --- DATA MUTATION WITH OPTIMISTIC UPDATES ---
    const mutation = useMutation({
        mutationFn: upsertExchangeRate,
        onMutate: async (newRate) => {
            await queryClient.cancelQueries({ queryKey: ['exchangeRates'] });
            const previousRates = queryClient.getQueryData<ExchangeRate[]>(['exchangeRates']);
            queryClient.setQueryData<ExchangeRate[]>(['exchangeRates'], (old = []) => {
                const optimisticRate = { id: Math.random(), ...newRate };
                return [optimisticRate, ...old].sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
            });
            return { previousRates };
        },
        onError: (err, newRate, context) => {
            if (context?.previousRates) {
                queryClient.setQueryData(['exchangeRates'], context.previousRates);
            }
            toast.error(`Failed to save rate: ${err.message}`);
        },
        onSuccess: () => {
            toast.success("Exchange rate saved!");
            setIsDialogOpen(false);
            form.reset({ currency_code: '', rate: 0, effective_date: new Date().toISOString().split('T')[0] });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
        },
    });

    // Form submission handler
    const onSubmit = (values: TExchangeRateSchema) => {
        mutation.mutate(values);
    };

    // --- RENDER LOGIC ---
    const renderTableContent = () => {
        if (isLoadingRates) {
            return <CurrencyManagerPage.Skeleton />;
        }
        if (ratesError) {
            return (
                <TableRow><TableCell colSpan={3} className="h-24 text-center text-destructive">Error: {ratesError.message}</TableCell></TableRow>
            );
        }
        if (!rates || rates.length === 0) {
            return (
                 <TableRow><TableCell colSpan={3} className="h-24 text-center">No exchange rates found. Add one to get started.</TableCell></TableRow>
            );
        }
        return rates.map(rate => (
            <TableRow key={rate.id}>
                <TableCell className="font-medium">{rate.currency_code}</TableCell>
                <TableCell>{rate.rate.toLocaleString()}</TableCell>
                <TableCell>{format(new Date(rate.effective_date), 'dd MMM, yyyy')}</TableCell>
            </TableRow>
        ));
    };

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>Multi-Currency Management</CardTitle>
                        <CardDescription>Manage exchange rates for all currencies your business operates with. Rates are relative to your base currency (UGX).</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>Add Exchange Rate</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add/Update Exchange Rate</DialogTitle></DialogHeader>
                            <Form {...form}>
                                <form id="rate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                    <FormField
                                        control={form.control}
                                        name="currency_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Currency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger disabled={isLoadingCurrencies}><SelectValue placeholder="Select currency..."/></SelectTrigger></FormControl>
                                                    <SelectContent>{currencies?.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rate (1 Foreign Unit = ? UGX)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        placeholder="e.g., 3850.55"
                                                        {...field}
                                                        value={field.value === undefined || field.value === null ? '' : Number(field.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="effective_date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Effective Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                <Button form="rate-form" type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Save Rate
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader><TableRow><TableHead>Currency</TableHead><TableHead>Rate (to UGX)</TableHead><TableHead>Effective Date</TableHead></TableRow></TableHeader>
                            <TableBody>{renderTableContent()}</TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- SKELETON LOADER COMPONENT (kept in-file as a static property) ---
CurrencyManagerPage.Skeleton = function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}