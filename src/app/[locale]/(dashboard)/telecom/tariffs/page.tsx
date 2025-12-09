'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileSpreadsheet } from 'lucide-react';

interface TariffPlan {
    id: string;
    plan_name: string;
    provider: string;
    data_volume: string;
    validity_days: number;
    cost: number;
}

export default function TariffsPage() {
    const supabase = createClient();
    const { data: plans, isLoading, isError, error } = useQuery({
        queryKey: ['tariffPlans'],
        queryFn: async (): Promise<TariffPlan[]> => {
            const { data, error } = await supabase.rpc('get_tariff_plans');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    if (isError) { toast.error(`Error: ${error.message}`); }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Tariff Plans</h1>
                <p className="text-muted-foreground">Manage service rates and bundle configurations.</p>
            </header>
            <Card>
                <CardHeader><CardTitle className="flex items-center"><FileSpreadsheet className="mr-2"/> Active Plans</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Plan Name</TableHead><TableHead>Provider</TableHead><TableHead>Volume</TableHead><TableHead>Validity</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {plans?.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.plan_name}</TableCell>
                                        <TableCell>{p.provider}</TableCell>
                                        <TableCell>{p.data_volume}</TableCell>
                                        <TableCell>{p.validity_days} Days</TableCell>
                                        <TableCell className="text-right">{p.cost.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}