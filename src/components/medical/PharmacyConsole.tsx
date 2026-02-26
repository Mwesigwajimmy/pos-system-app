'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill, CheckCircle2, ShoppingCart, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PharmacyConsole({ tenantId }: { tenantId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { data: scripts, isLoading } = useQuery({
        queryKey: ['prescriptions', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('medical_prescriptions')
                .select('*, medical_patients(full_name)')
                .eq('tenant_id', tenantId)
                .eq('status', 'pending');
            if (error) throw error;
            return data;
        }
    });

    const dispenseMutation = useMutation({
        mutationFn: async (id: string) => {
            // This triggers 'fn_sovereign_medical_kernel_v1' which deducts inventory
            const { error } = await supabase
                .from('medical_prescriptions')
                .update({ status: 'dispensed' })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Pharmacy Handshake Complete", {
                description: "Inventory deducted and transaction sealed in POS.",
                icon: <ShieldCheck className="text-emerald-500" />
            });
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
        }
    });

    return (
        <Card className="border-l-4 border-l-emerald-600 shadow-xl">
            <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Pill className="text-emerald-600" /> ROBOTIC DISPENSARY CONSOLE
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {isLoading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin" /></div> :
                scripts?.map(s => (
                    <div key={s.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-slate-50 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><Pill size={20} /></div>
                            <div>
                                <p className="font-bold text-slate-900">{(s as any).medical_patients?.full_name}</p>
                                <p className="text-sm text-slate-500 italic">"{s.dosage_instruction}"</p>
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px]">QTY: {s.quantity_prescribed}</Badge>
                                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100 uppercase">POS_LINK_ACTIVE</Badge>
                                </div>
                            </div>
                        </div>
                        <Button 
                            onClick={() => dispenseMutation.mutate(s.id)}
                            disabled={dispenseMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 font-black h-12 shadow-lg shadow-emerald-100"
                        >
                            {dispenseMutation.isPending ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2" /> DISPENSE & SYNC</>}
                        </Button>
                    </div>
                ))}
                {scripts?.length === 0 && <div className="text-center py-20 text-slate-300 font-black uppercase">No Pending Prescriptions</div>}
            </CardContent>
        </Card>
    );
}