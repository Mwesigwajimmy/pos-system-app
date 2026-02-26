'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Stethoscope, FileText, Brain, ShieldAlert, FlaskConical, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EncounterPortal({ tenantId, patientId, practitionerId }: any) {
    const supabase = createClient();
    const { register, handleSubmit, reset } = useForm();
    const [submitting, setSubmitting] = React.useState(false);

    const onSubmit = async (formData: any) => {
        setSubmitting(true);
        try {
            const { error } = await supabase.from('medical_encounters').insert([{
                ...formData,
                tenant_id: tenantId,
                patient_id: patientId,
                practitioner_id: practitionerId,
                department_name: 'General Medicine', // Dynamic in full build
                status: 'closed'
            }]);
            if (error) throw error;
            toast.success("Encounter Sealed", { description: "Autonomous Billing Triggered via Kernel v2." });
            reset();
        } catch (e: any) {
            toast.error("Handshake Failure: " + e.message);
        } finally { setSubmitting(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
                <Card className="shadow-2xl border-t-4 border-t-primary overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                        <CardTitle className="font-black tracking-tighter flex items-center gap-2">
                            <Stethoscope /> CLINICAL CONSULTATION NOTE
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                                <ShieldAlert size={14} /> Presenting Symptoms
                            </label>
                            <Textarea {...register('symptoms')} className="min-h-[120px] bg-slate-50/50" placeholder="Patient reports..." />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                                    <FileText size={14} /> Diagnosis (ICD-10 Code)
                                </label>
                                <Input {...register('diagnosis_icd10')} className="font-mono uppercase font-bold" placeholder="e.g. B20" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                                    <Brain size={14} /> Mental State Exam
                                </label>
                                <Input {...register('mental_state_exam')} placeholder="Orientation, Affect, Speech..." />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Treatment Plan & Recommendations</label>
                            <Textarea {...register('treatment_plan')} className="min-h-[150px]" />
                        </div>
                    </CardContent>
                    <div className="p-6 bg-slate-900 border-t flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold tracking-widest">
                            <Zap className="text-emerald-500 fill-current" /> AUTONOMOUS BILLING ACTIVE
                        </div>
                        <Button onClick={handleSubmit(onSubmit)} disabled={submitting} className="h-12 px-10 bg-primary font-black shadow-lg shadow-primary/20">
                            {submitting ? <Loader2 className="animate-spin" /> : <><Send size={16} className="mr-2"/> SEAL ENCOUNTER</>}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Sidebar for Lab & Prescriptions */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="border-l-4 border-l-blue-500 shadow-xl">
                    <CardHeader><CardTitle className="text-sm font-black uppercase flex items-center gap-2"><FlaskConical size={16}/> Instant Lab Order</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Input placeholder="Search Test (Malaria, HIV...)" className="text-xs" />
                        <Button variant="outline" className="w-full text-xs font-bold">Queue Laboratory Test</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}