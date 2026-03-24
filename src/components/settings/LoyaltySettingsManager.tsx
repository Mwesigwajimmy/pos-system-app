'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
// --- FIX STEP 1: Import the 'Resolver' type ---
import { useForm, Resolver } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    AlertTriangle, 
    Sparkles, 
    ShieldCheck, 
    Fingerprint, 
    Coins, 
    Landmark,
    TrendingUp
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Define the shape of the form from the schema
const loyaltySchema = z.object({
  points_per_currency_unit: z.coerce.number().min(0, "Must be zero or positive"),
  currency_units_for_point: z.coerce.number().positive("Threshold must be a positive number"),
  value_per_point: z.coerce.number().min(0, "Value must be zero or positive"),
  is_active: z.boolean(),
});
type LoyaltyFormData = z.infer<typeof loyaltySchema>;

// API Functions
const supabase = createClient();

const fetchLoyaltySettings = async () => {
    const { data, error } = await supabase.rpc('get_loyalty_program_settings');
    if (error) throw new Error(error.message);
    return data[0] || null;
};

const fetchBusinessDNA = async () => {
    const { data, error } = await supabase.from('tenants').select('currency_code, name').single();
    if (error) throw error;
    return data;
};

const saveSettings = async (settings: LoyaltyFormData) => {
    const { error } = await supabase.rpc('upsert_loyalty_program_settings', {
        p_points_per_currency_unit: settings.points_per_currency_unit,
        p_currency_units_for_point: settings.currency_units_for_point,
        p_value_per_point: settings.value_per_point,
        p_is_active: settings.is_active,
    });
    if (error) throw error;
};

export default function LoyaltySettingsManager() {
    const queryClient = useQueryClient();
    
    // 1. Fetch System Settings & Business DNA (Currency/Name)
    const { data: settings, isLoading, isError, error } = useQuery({
        queryKey: ['loyaltySettings'],
        queryFn: fetchLoyaltySettings,
    });

    const { data: businessDNA } = useQuery({
        queryKey: ['businessDNA'],
        queryFn: fetchBusinessDNA,
    });

    const currency = businessDNA?.currency_code || 'USD';

    const form = useForm<LoyaltyFormData>({
        // --- FIX STEP 2: Explicitly cast the resolver to the correct type ---
        resolver: zodResolver(loyaltySchema) as Resolver<LoyaltyFormData>,
        defaultValues: {
            points_per_currency_unit: 1,
            currency_units_for_point: 1000,
            value_per_point: 50,
            is_active: false,
        },
    });

    useEffect(() => {
        if (settings) {
            form.reset({
                points_per_currency_unit: settings.points_per_currency_unit,
                currency_units_for_point: settings.currency_units_for_point,
                value_per_point: settings.value_per_point,
                is_active: settings.is_active,
            });
        }
    }, [settings, form]);
    
    const mutation = useMutation({
        mutationFn: saveSettings,
        onSuccess: () => {
            toast.success("Loyalty Engine Successfully Sealed");
            queryClient.invalidateQueries({ queryKey: ['loyaltySettings'] });
        },
        onError: (err: Error) => toast.error(`Fiduciary Sync Failed: ${err.message}`),
    });

    const onSubmit = (data: LoyaltyFormData) => {
        mutation.mutate(data);
    };

    if (isLoading) {
        return (
            <Card className="shadow-2xl border-none">
                <CardHeader className="bg-slate-50/50 border-b">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
                <CardContent className="p-8">
                    <div className="space-y-6">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-12 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Kernel Communication Error</h3>
                <p className="text-red-600 text-sm mt-1">{error.message}</p>
                <Button variant="outline" className="mt-6 border-red-200 text-red-700" onClick={() => window.location.reload()}>
                    Restart Handshake
                </Button>
            </div>
        );
    }

    return (
        <Card className="shadow-2xl border-none bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-6">
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-black flex items-center gap-2 uppercase tracking-tight">
                        <Coins className="h-6 w-6 text-blue-600" /> Customer Loyalty Engine
                    </CardTitle>
                    <CardDescription className="font-medium text-slate-500">
                        Configure autonomous reward logic for {businessDNA?.name || 'your empire'}.
                    </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-3 py-1">
                    <TrendingUp className="w-3 h-3 mr-1.5" /> REVENUE ACCELERATOR
                </Badge>
            </CardHeader>

            <CardContent className="pt-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* THE MASTER SWITCH */}
                        <FormField control={form.control} name="is_active" render={({ field }) => (
                            <FormItem className={cn(
                                "flex flex-row items-center justify-between rounded-[2rem] border-2 p-6 transition-all duration-300",
                                field.value ? "border-blue-600 bg-blue-50/30" : "border-slate-100 bg-slate-50/50"
                            )}>
                                <div className="space-y-0.5">
                                    <FormLabel className="text-lg font-black uppercase tracking-tight">
                                        Activate Sovereign Rewards
                                    </FormLabel>
                                    <FormDescription className="font-medium text-slate-500">
                                        When active, the kernel will autonomously calculate and distribute points on every sale.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-blue-600"
                                    />
                                </FormControl>
                            </FormItem>
                        )} />

                        {/* MATH CONFIGURATION GRID */}
                        <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="currency_units_for_point" render={({ field }) => (
                                <FormItem className="bg-white p-5 rounded-2xl border shadow-sm group hover:border-blue-400 transition-colors">
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Spending Threshold</FormLabel>
                                    <div className="relative mt-2">
                                        <FormControl>
                                            <Input type="number" {...field} className="h-12 text-xl font-mono font-bold pl-12" />
                                        </FormControl>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-300">{currency}</div>
                                    </div>
                                    <FormDescription className="text-[10px] leading-tight mt-2 italic">
                                        Amount spent to trigger a reward event.
                                    </FormDescription>
                                    <FormMessage />
                                 </FormItem>
                            )} />

                            <FormField control={form.control} name="points_per_currency_unit" render={({ field }) => (
                                <FormItem className="bg-white p-5 rounded-2xl border shadow-sm group hover:border-blue-400 transition-colors">
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Points Earned</FormLabel>
                                    <div className="relative mt-2">
                                        <FormControl>
                                            <Input type="number" {...field} className="h-12 text-xl font-mono font-bold pl-12" />
                                        </FormControl>
                                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 opacity-20" />
                                    </div>
                                    <FormDescription className="text-[10px] leading-tight mt-2 italic">
                                        Points awarded per threshold unit.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="value_per_point" render={({ field }) => (
                                <FormItem className="bg-white p-5 rounded-2xl border shadow-sm group hover:border-blue-400 transition-colors">
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Point Redemption Value</FormLabel>
                                    <div className="relative mt-2">
                                        <FormControl>
                                            <Input type="number" {...field} className="h-12 text-xl font-mono font-bold pl-12" />
                                        </FormControl>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-300">{currency}</div>
                                    </div>
                                    <FormDescription className="text-[10px] leading-tight mt-2 italic">
                                        Physical cash value of a single point.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        
                        <div className="flex justify-end pt-4 border-t">
                            <Button 
                                type="submit" 
                                disabled={mutation.isPending}
                                className="min-w-[200px] h-14 bg-slate-900 text-white font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
                            >
                                {mutation.isPending ? (
                                    <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> SYNCHRONIZING...</>
                                ) : (
                                    <><ShieldCheck className="mr-3 h-5 w-5 text-blue-400" /> Seal Reward Policy</>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>

            <CardFooter className="bg-slate-50 border-t py-4 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-green-600 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5"/> IFRS COMPLIANT REWARDS KERNEL
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5"/> AUDIT TRAIL ENABLED
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Landmark className="w-3 h-3"/>
                    JURISDICTION: {currency}
                </div>
            </CardFooter>
        </Card>
    );
}