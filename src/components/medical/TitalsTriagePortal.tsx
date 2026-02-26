'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Thermometer, Activity, Scale, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VitalsTriagePortal({ tenantId, patientId }: { tenantId: string, patientId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset, setValue } = useForm();

    const triageMutation = useMutation({
        mutationFn: async (formData: any) => {
            const { error } = await supabase.from('medical_triage').insert([{
                ...formData,
                tenant_id: tenantId,
                patient_id: patientId
            }]);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Vitals Synchronized", {
                description: "Triage data sealed and transmitted to Clinical Orchestrator.",
                icon: <ShieldCheck className="text-emerald-500" />
            });
            reset();
        }
    });

    return (
        <Card className="border-l-4 border-l-orange-500 shadow-2xl">
            <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-slate-800">
                    <Activity className="text-orange-500" /> Patient Triage Monitor
                </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit((data) => triageMutation.mutate(data))}>
                <CardContent className="grid md:grid-cols-3 gap-8 pt-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                <Thermometer size={14} /> Temperature (°C)
                            </Label>
                            <Input type="number" step="0.1" {...register('temperature_c')} placeholder="36.5" className="h-12 font-mono font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                <Zap size={14} /> Blood Pressure (mmHg)
                            </Label>
                            <Input {...register('blood_pressure')} placeholder="120/80" className="h-12 font-mono font-bold" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                <Scale size={14} /> Weight (KG)
                            </Label>
                            <Input type="number" step="0.1" {...register('weight_kg')} placeholder="70.0" className="h-12 font-mono font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                Oxygen Saturation (SpO2 %)
                            </Label>
                            <Input type="number" {...register('oxygen_saturation')} placeholder="98" className="h-12 font-mono font-bold" />
                        </div>
                    </div>

                    <div className="space-y-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                        <Label className="text-[10px] font-black uppercase text-orange-600">Clinical Urgency Level</Label>
                        <Select onValueChange={(v) => setValue('urgency_level', v)}>
                            <SelectTrigger className="h-12 font-black">
                                <SelectValue placeholder="Select Triage Tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="P1 - EMERGENCY">RED (Emergency)</SelectItem>
                                <SelectItem value="P2 - URGENT">YELLOW (Urgent)</SelectItem>
                                <SelectItem value="P3 - STABLE">GREEN (Stable)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[9px] text-orange-400 italic">Determines priority in Clinical Orchestrator v2.</p>
                    </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t mt-8 p-6">
                    <Button 
                        disabled={triageMutation.isPending}
                        className="w-full bg-orange-600 hover:bg-orange-700 h-14 text-lg font-black shadow-xl shadow-orange-100 uppercase"
                    >
                        {triageMutation.isPending ? <Loader2 className="animate-spin" /> : "Authorize Vital Sync"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}