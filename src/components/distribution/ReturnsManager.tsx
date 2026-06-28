'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    ArrowLeftRight, PackageCheck, ShieldCheck, 
    AlertTriangle, Loader2, CheckCircle2, Warehouse, Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReturnsManager({ businessId }: { businessId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('pending');

    const { data: returns, isLoading } = useQuery({
        queryKey: ['enterprise_returns', filter],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('distribution_returns')
                .select(`*, items:return_items(*, product_variants(name, sku))`)
                .eq('business_id', businessId)
                .eq('reconciliation_status', filter);
            if (error) throw error;
            return data;
        }
    });

    const authorizeRestock = useMutation({
        mutationFn: async ({ returnId, locId }: { returnId: string, locId: string }) => {
            const { error } = await supabase.rpc('process_distribution_return_restock', {
                p_return_id: returnId,
                p_business_id: businessId,
                p_location_id: locId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enterprise_returns'] });
            toast.success("Inventory Reconciled", { description: "Stock levels successfully adjusted and logged." });
        }
    });

    if (isLoading) return <div className="p-32 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-blue-600" /></div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-1000 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-blue-600">
                        <ArrowLeftRight size={24} />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em]">Reverse Logistics Center</span>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Returns & Claims</h1>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl h-12">
                    <button onClick={() => setFilter('pending')} className={`px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Awaiting Audit</button>
                    <button onClick={() => setFilter('restocked')} className={`px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${filter === 'restocked' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Reconciled</button>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {returns?.map((ret: any) => (
                    <Card key={ret.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-[2rem] overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col lg:flex-row">
                                <div className="p-10 flex-1 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 uppercase">Load Return: {ret.id.substring(0,8)}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason: {ret.reason_code || 'Damaged / Rejected'}</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-slate-900 text-white font-bold text-[9px] uppercase px-4 py-1.5 rounded-full border-none">{ret.reconciliation_status}</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {ret.items?.map((it: any) => (
                                            <div key={it.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                                                <p className="text-xs font-bold text-slate-900 truncate">{it.product_variants?.name}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Restock Qty</span>
                                                    <span className="text-sm font-black text-blue-600">x{it.quantity}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 border-l border-slate-100 p-10 flex flex-col justify-center items-center gap-6 lg:w-80 text-center">
                                    <Warehouse className="text-slate-200" size={48} strokeWidth={1} />
                                    <Button 
                                        onClick={() => authorizeRestock.mutate({ returnId: ret.id, locId: ret.tenant_id })}
                                        disabled={authorizeRestock.isPending || ret.reconciliation_status === 'restocked'}
                                        className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 transition-all active:scale-95"
                                    >
                                        {authorizeRestock.isPending ? <Loader2 className="animate-spin" /> : "Verify & Restock"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}