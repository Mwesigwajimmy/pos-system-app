// src/components/distribution/RouteSettlement.tsx
// FINAL & CORRECTED VERSION

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

// These functions are correct
async function getUnsettled() { 
    const { data, error } = await createClient().rpc('get_unsettled_van_loads'); 
    if (error) throw error; 
    return data; 
}
async function getSheet(id: string) {
    const { data, error } = await createClient().rpc('get_route_settlement_sheet', {p_van_load_id: id});
    if (error) throw error; 
    return data; 
}

export default function RouteSettlement() {
    const [selectedLoad, setSelectedLoad] = useState<string | null>(null);
    const { data: loads, isLoading: loadingLoads } = useQuery({ queryKey: ['unsettledLoads'], queryFn: getUnsettled });
    
    // ======================== FIX STARTS HERE ========================
    // 1. REMOVE onSuccess and onError from the useQuery options
    const { data: sheet, isLoading: loadingSheet, isFetching, refetch } = useQuery({ 
        queryKey: ['settlementSheet', selectedLoad], 
        queryFn: () => getSheet(selectedLoad!), 
        enabled: false, // This is correct, it only runs on manual refetch
    });

    // 2. CREATE a new handler for the button's onClick event
    const handleGenerateSheet = async () => {
        try {
            await refetch();
            // The success toast is now handled here, after the promise resolves
            toast.success("Settlement sheet generated!");
        } catch (error: any) {
            // The error toast is now handled here, if the promise rejects
            toast.error(`Failed to generate sheet: ${error.message}`);
        }
    };
    // ========================= FIX ENDS HERE =========================

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Route Settlement</h1>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Select a Load to Settle</CardTitle>
                    <CardDescription>Choose an active van load to generate its end-of-day financial settlement sheet.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <div className="flex-grow">
                        <Select onValueChange={(val) => setSelectedLoad(val)}>
                            <SelectTrigger disabled={loadingLoads}>
                                <SelectValue placeholder={loadingLoads ? "Loading active loads..." : "Select an active van load..."}/>
                            </SelectTrigger>
                            <SelectContent>
                                {loads?.map((l: any) => (
                                    <SelectItem key={l.id} value={l.id.toString()}> {/* Ensure value is a string */}
                                        Load #{l.id} - {l.salesperson_name} ({l.vehicle_name})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* 3. UPDATE the onClick to use the new handler */}
                    <Button onClick={handleGenerateSheet} disabled={!selectedLoad || isFetching}>
                        {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {isFetching ? 'Generating...' : 'Generate Settlement Sheet'}
                    </Button>
                </CardContent>
            </Card>
            
            {loadingSheet && !sheet && <Card className="mt-6"><CardContent className="p-8"><Skeleton className="h-48 w-full" /></CardContent></Card>}

            {sheet && (
                <Card className="max-w-2xl mx-auto animate-in fade-in-50">
                    <CardHeader>
                        <CardTitle>Settlement Sheet for Load #{selectedLoad}</CardTitle>
                        <CardDescription>Salesperson: {sheet.salesperson} | Vehicle: {sheet.vehicle}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <p>Total Value of Goods Loaded:</p><p className="font-medium text-right">{formatCurrency(sheet.total_loaded_value)}</p>
                            <p>Total Value of Sales (All Methods):</p><p className="font-medium text-right text-green-600">{formatCurrency(sheet.total_sales_value)}</p>
                            <p>Total Value of Returns Processed:</p><p className="font-medium text-right text-orange-500">- {formatCurrency(sheet.total_returns_value)}</p>
                            <p className="border-t pt-4 text-base font-bold">Expected Cash on Hand:</p><p className="font-bold text-right border-t pt-4 text-lg">{formatCurrency(sheet.expected_cash_on_hand)}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}