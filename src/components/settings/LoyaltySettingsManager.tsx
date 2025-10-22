'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
// --- FIX STEP 1: Import the 'Resolver' type ---
import { useForm, Resolver } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Define the shape of the form from the schema
const loyaltySchema = z.object({
  points_per_currency_unit: z.coerce.number().positive("Must be a positive number"),
  currency_units_for_point: z.coerce.number().positive("Must be a positive number"),
  value_per_point: z.coerce.number().positive("Must be a positive number"),
  is_active: z.boolean(),
});
type LoyaltyFormData = z.infer<typeof loyaltySchema>;

// API Functions
const supabase = createClient();
const fetchSettings = async () => {
    const { data, error } = await supabase.rpc('get_loyalty_program_settings');
    if (error) throw new Error(error.message);
    return data[0] || null;
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
    const { data: settings, isLoading, isError, error } = useQuery({
        queryKey: ['loyaltySettings'],
        queryFn: fetchSettings,
    });

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
            form.reset(settings);
        }
    }, [settings, form.reset]);
    
    const mutation = useMutation({
        mutationFn: saveSettings,
        onSuccess: () => {
            toast.success("Loyalty settings saved successfully!");
            queryClient.invalidateQueries({ queryKey: ['loyaltySettings'] });
        },
        onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
    });

    const onSubmit = (data: LoyaltyFormData) => {
        mutation.mutate(data);
    };

    if (isLoading) {
        return <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
    }

    if (isError) {
        return <div className="text-destructive text-center p-8"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />Error loading settings: {error.message}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Customer Loyalty Program</CardTitle>
                <CardDescription>Reward your repeat customers. When active, customers will earn points on every purchase they make.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField control={form.control} name="is_active" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Activate Loyalty Program</FormLabel>
                                    <FormDescription>Toggle this to turn the entire loyalty program on or off for your business.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />

                        <div className="grid md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="currency_units_for_point" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Spending Threshold</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>For every (e.g., 1000) UGX a customer spends...</FormDescription>
                                    <FormMessage />
                                 </FormItem>
                            )} />
                            <FormField control={form.control} name="points_per_currency_unit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Points Awarded</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>...they will earn this many points (e.g., 1).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="value_per_point" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Redemption Value</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>Each point is worth this much (e.g., 50) UGX when redeemed.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        
                        <div className="flex justify-end">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}