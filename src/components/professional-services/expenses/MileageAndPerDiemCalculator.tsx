'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, MapPin, CalendarDays, Loader2 } from "lucide-react";

interface TenantContext { 
    tenantId: string; 
    currency: string; 
}

interface PolicyRate {
    rate_type: 'MILEAGE' | 'PER_DIEM';
    rate_amount: number;
    description: string;
}

// Fetch rates from DB instead of hardcoding
async function fetchRates(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
        .from('expense_policy_rates') // Assumes a table for rates
        .select('*')
        .eq('tenant_id', tenantId);
    
    if (error) {
        console.warn("Failed to fetch rates, using defaults", error);
        return []; 
    }
    return data as PolicyRate[];
}

export default function MileageAndPerDiemCalculator({ tenant }: { tenant: TenantContext }) {
    const [mode, setMode] = useState<'MILEAGE' | 'PER_DIEM'>('MILEAGE');
    const [units, setUnits] = useState<string>('');
    const [total, setTotal] = useState<number | null>(null);

    const { data: rates, isLoading } = useQuery({
        queryKey: ['policy-rates', tenant.tenantId],
        queryFn: () => fetchRates(tenant.tenantId),
        staleTime: 1000 * 60 * 30 // Cache for 30 mins
    });

    const handleCalculate = () => {
        const val = parseFloat(units);
        if (isNaN(val) || val <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        // Find relevant rate or default
        const rateObj = rates?.find(r => r.rate_type === mode);
        // Fallbacks if DB is empty
        const rateAmount = rateObj?.rate_amount || (mode === 'MILEAGE' ? 0.65 : 50);

        setTotal(val * rateAmount);
        toast.success("Calculation updated");
    };

    const currentRate = rates?.find(r => r.rate_type === mode)?.rate_amount 
        || (mode === 'MILEAGE' ? 0.65 : 50);

    return (
        <Card className="h-full shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-slate-500"/> Reimbursement Calculator
                </CardTitle>
                <CardDescription>Estimate reimbursements based on current company policy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => { setMode('MILEAGE'); setTotal(null); }}
                        className={`text-sm font-medium py-1.5 rounded-md transition-all ${mode === 'MILEAGE' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Mileage
                    </button>
                    <button
                        onClick={() => { setMode('PER_DIEM'); setTotal(null); }}
                        className={`text-sm font-medium py-1.5 rounded-md transition-all ${mode === 'PER_DIEM' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Per Diem
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400"/></div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{mode === 'MILEAGE' ? 'Distance (Kilometers)' : 'Duration (Days)'}</Label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400">
                                    {mode === 'MILEAGE' ? <MapPin className="w-4 h-4"/> : <CalendarDays className="w-4 h-4"/>}
                                </div>
                                <Input 
                                    type="number" 
                                    className="pl-9"
                                    placeholder={mode === 'MILEAGE' ? "e.g. 120" : "e.g. 3"} 
                                    value={units} 
                                    onChange={e => setUnits(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                                Current Rate: {tenant.currency} {currentRate} / {mode === 'MILEAGE' ? 'km' : 'day'}
                            </p>
                        </div>

                        <Button onClick={handleCalculate} className="w-full" disabled={!units}>
                            Calculate
                        </Button>

                        {total !== null && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg text-center animate-in zoom-in-95">
                                <span className="text-xs text-green-600 uppercase font-semibold">Estimated Reimbursement</span>
                                <div className="text-2xl font-bold text-green-700 mt-1">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(total)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}