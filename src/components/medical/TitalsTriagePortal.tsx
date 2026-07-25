'use client';

/**
 * --- BBU1 SOVEREIGN CLINICAL TRIAGE & VITALS PORTAL ---
 * VERSION: v12.0 OMEGA (AUTOMATED BMI & EMERGENCY CLASSIFIER WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Health System
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { 
  Thermometer, Activity, Scale, Zap, ShieldCheck, 
  Loader2, HeartPulse, Ruler, Droplets, AlertTriangle, 
  ShieldAlert, User, Plus, Search, Printer, Clock, 
  History, Sparkles, CheckCircle2, Lock, Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VitalsTriagePortalProps {
  tenantId: string;
  patientId?: string;
  onTriageComplete?: () => void;
}

const supabase = createClient();

export default function VitalsTriagePortal({ tenantId, patientId: propPatientId, onTriageComplete }: VitalsTriagePortalProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(propPatientId || '');
  const [urgencyTier, setUrgencyTier] = useState<string>('P3 - STABLE');

  // Watch height and weight for automatic live BMI calculation
  const watchWeight = watch('weight_kg');
  const watchHeight = watch('height_cm');
  const watchSystolic = watch('blood_pressure');
  const watchSpo2 = watch('oxygen_saturation');

  // 1. DATA: Identity Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_triage', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const activeBusinessId = profile?.business_id || tenantId;

  // 2. DATA: Pull Patients List (For Selection if standalone)
  const { data: patients } = useQuery({
    queryKey: ['medical_patients_triage_select', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_patients')
        .select('id, full_name, patient_uid, gender, dob, blood_group, allergies')
        .order('full_name');
      if (error) return [];
      return data || [];
    }
  });

  // Active Patient Details
  const activePatient = useMemo(() => {
    if (!selectedPatientId || !patients) return null;
    return patients.find(p => p.id === selectedPatientId);
  }, [selectedPatientId, patients]);

  // 3. DATA: Triage History for Active Patient
  const { data: triageHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['patient_triage_history', selectedPatientId],
    enabled: !!selectedPatientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_triage')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    }
  });

  // LIVE AUTOMATED BMI COMPUTATION
  const bmiMetrics = useMemo(() => {
    const weight = Number(watchWeight);
    const heightCm = Number(watchHeight);

    if (!weight || !heightCm || heightCm <= 0) return { bmi: null, category: 'Awaiting Height/Weight' };

    const heightM = heightCm / 100;
    const bmiVal = Number((weight / (heightM * heightM)).toFixed(1));

    let cat = 'Normal Weight';
    if (bmiVal < 18.5) cat = 'Underweight';
    else if (bmiVal >= 18.5 && bmiVal <= 24.9) cat = 'Normal Weight';
    else if (bmiVal >= 25.0 && bmiVal <= 29.9) cat = 'Overweight';
    else if (bmiVal >= 30.0 && bmiVal <= 34.9) cat = 'Obese Class I';
    else if (bmiVal >= 35.0) cat = 'Obese Class II/III';

    return { bmi: bmiVal, category: cat };
  }, [watchWeight, watchHeight]);

  // AUTOMATED TRIAGE URGENCY CLASSIFIER RECOMMENDATION
  const isCriticalVitals = useMemo(() => {
    const spo2 = Number(watchSpo2);
    if (spo2 && spo2 < 90) return true;
    return false;
  }, [watchSpo2]);

  // MUTATION: Authorize and Record Vital Signs
  const triageMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!selectedPatientId) throw new Error("Please select a patient.");

      const { data, error } = await supabase
        .from('medical_triage')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          patient_id: selectedPatientId,
          temperature_c: Number(formData.temperature_c) || null,
          blood_pressure: formData.blood_pressure || null,
          weight_kg: Number(formData.weight_kg) || null,
          height_cm: Number(formData.height_cm) || null,
          oxygen_saturation: Number(formData.oxygen_saturation) || null,
          respiratory_rate: Number(formData.respiratory_rate) || null,
          urgency_level: urgencyTier,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Vitals Synchronized & Sealed", {
        icon: <ShieldCheck className="text-emerald-500" />
      });
      reset();
      setUrgencyTier('P3 - STABLE');
      queryClient.invalidateQueries({ queryKey: ['patient_triage_history', selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ['latest_patient_vitals', selectedPatientId] });
      if (onTriageComplete) onTriageComplete();
    },
    onError: (e: any) => toast.error(`Triage Sync Failed: ${e.message}`)
  });

  // PRINT THERMAL TRIAGE SLIP (jsPDF)
  const printTriageSlip = (triageRecord: any) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 100] });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text((profile?.business_name || "BBU1 CLINICAL TRIAGE").toUpperCase(), 40, 10, { align: 'center' });

      doc.setFontSize(8);
      doc.text("TRIAGE VITAL SIGNS TICKET", 40, 16, { align: 'center' });
      doc.line(5, 18, 75, 18);

      doc.setFontSize(7);
      doc.text(`Patient: ${activePatient?.full_name || 'Walk-in Subject'}`, 6, 24);
      doc.text(`UID: ${activePatient?.patient_uid || 'TEMP-PATIENT'}`, 6, 29);
      doc.text(`Time: ${new Date(triageRecord.created_at).toLocaleString()}`, 6, 34);

      doc.line(5, 37, 75, 37);

      doc.setFontSize(8);
      doc.text(`Blood Pressure: ${triageRecord.blood_pressure || 'N/A'} mmHg`, 6, 43);
      doc.text(`Body Temp: ${triageRecord.temperature_c || 'N/A'} °C`, 6, 49);
      doc.text(`Weight: ${triageRecord.weight_kg || 'N/A'} kg | SpO2: ${triageRecord.oxygen_saturation || 'N/A'}%`, 6, 55);

      doc.line(5, 60, 75, 60);

      doc.setFontSize(9);
      doc.text(`TRIAGE TIER: ${triageRecord.urgency_level}`, 40, 67, { align: 'center' });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("Triage Slip Sent to Printer!");
    } catch (err: any) {
      toast.error(`Print Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. PATIENT SELECTOR BANNER */}
      <Card className="border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
        <div className="bg-slate-900 p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
              <Activity size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Patient Triage & Vitals Hub</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Clinical vital signs acquisition, BMI metrics & emergency tiering</p>
            </div>
          </div>

          {/* PATIENT LOOKUP SELECTOR */}
          <div className="w-full lg:w-96 space-y-1">
            <Label className="text-[10px] font-black uppercase text-orange-400 tracking-widest ml-1">Select Patient Subject *</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="h-12 bg-slate-800 border-slate-700 text-white font-bold rounded-2xl">
                <SelectValue placeholder="Search or Select Registered Patient..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-[10000]">
                {patients?.map(p => (
                  <SelectItem key={p.id} value={p.id} className="font-bold py-2.5">
                    {p.full_name} ({p.patient_uid}) • {p.gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ACTIVE PATIENT BIO SUMMARY */}
        {activePatient && (
          <div className="p-6 bg-orange-50/50 border-t border-orange-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Subject Name</span>
                <p className="text-sm font-black text-slate-900">{activePatient.full_name}</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Gender / DOB</span>
                <p className="text-sm font-bold text-slate-800">{activePatient.gender} ({activePatient.dob || 'DOB N/A'})</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400">Blood Group</span>
                <p className="text-sm font-black text-rose-600">Group {activePatient.blood_group || 'N/A'}</p>
              </div>
            </div>

            {activePatient.allergies && activePatient.allergies.length > 0 && (
              <Badge className="bg-rose-600 text-white font-black text-[10px] uppercase px-3 py-1 animate-pulse">
                <ShieldAlert size={12} className="mr-1" /> ALLERGIC: {activePatient.allergies.join(', ')}
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* 2. VITALS INPUT FORM WORKBENCH */}
      <Card className="border-l-4 border-l-orange-500 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <CardTitle className="flex items-center gap-3 text-xl tracking-tight font-black text-slate-900">
            <Thermometer className="text-orange-500" size={24} /> VITAL SIGNS REGISTRATION FORM
          </CardTitle>
          <CardDescription className="text-xs">Record physiological measurements for clinical evaluation</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit((data) => triageMutation.mutate(data))}>
          <CardContent className="p-8 space-y-8">
            
            {/* GRID 1: CORE PHYSIOLOGICAL PARAMETERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* BODY TEMP */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  <Thermometer size={14} className="text-amber-500" /> Temperature (°C) *
                </Label>
                <div className="relative">
                  <Input type="number" step="0.1" {...register('temperature_c', { required: true })} placeholder="36.5" className="h-12 font-mono font-black text-lg rounded-2xl border-slate-200" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">°C</span>
                </div>
              </div>

              {/* BLOOD PRESSURE */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  <HeartPulse size={14} className="text-rose-500" /> Blood Pressure (mmHg) *
                </Label>
                <div className="relative">
                  <Input {...register('blood_pressure', { required: true })} placeholder="120/80" className="h-12 font-mono font-black text-lg rounded-2xl border-slate-200" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">mmHg</span>
                </div>
              </div>

              {/* WEIGHT */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  <Scale size={14} className="text-blue-500" /> Body Weight (kg) *
                </Label>
                <div className="relative">
                  <Input type="number" step="0.1" {...register('weight_kg', { required: true })} placeholder="70.0" className="h-12 font-mono font-black text-lg rounded-2xl border-slate-200" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">kg</span>
                </div>
              </div>

              {/* HEIGHT */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  <Ruler size={14} className="text-purple-500" /> Height (cm)
                </Label>
                <div className="relative">
                  <Input type="number" {...register('height_cm')} placeholder="175" className="h-12 font-mono font-black text-lg rounded-2xl border-slate-200" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">cm</span>
                </div>
              </div>

              {/* OXYGEN SATURATION (SpO2) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  <Activity size={14} className="text-emerald-500" /> SpO2 Oxygen Saturation (%)
                </Label>
                <div className="relative">
                  <Input type="number" {...register('oxygen_saturation')} placeholder="98" className="h-12 font-mono font-black text-lg rounded-2xl border-slate-200" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">%</span>
                </div>
              </div>

              {/* RESPIRATORY RATE */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  <Activity size={14} className="text-blue-600" /> Respiratory Rate (bpm)
                </Label>
                <div className="relative">
                  <Input type="number" {...register('respiratory_rate')} placeholder="16" className="h-12 font-mono font-black text-lg rounded-2xl border-slate-200" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">bpm</span>
                </div>
              </div>

              {/* AUTOMATED LIVE BMI CALCULATOR DISPLAY */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col justify-between md:col-span-2 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Calculated BMI Index</span>
                  <Badge className="bg-blue-600 text-white font-black text-[9px] uppercase">{bmiMetrics.category}</Badge>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-blue-400">{bmiMetrics.bmi || '---'}</span>
                  <span className="text-xs text-slate-400 font-bold">kg/m²</span>
                </div>
              </div>

            </div>

            {/* CRITICAL WARNING ALERT IF VITALS ARE DANGEROUS */}
            {isCriticalVitals && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                <AlertTriangle size={20} className="text-rose-600 shrink-0 animate-bounce" />
                <p className="text-xs font-bold text-rose-900">
                  Critical Vitals Threshold Triggered! Oxygen Saturation is below 90%. Recommend immediate transfer to Emergency / P1 Resuscitation Bay.
                </p>
              </div>
            )}

            {/* GRID 2: URGENCY TIERING SELECTOR */}
            <div className="p-6 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-4">
              <Label className="text-[11px] font-black uppercase text-orange-800 tracking-widest ml-1">
                Clinical Urgency Level (Emergency Triage Tier) *
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <button
                  type="button"
                  onClick={() => setUrgencyTier('P1 - EMERGENCY')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-24",
                    urgencyTier === 'P1 - EMERGENCY' ? "bg-rose-600 text-white border-rose-700 shadow-lg scale-105" : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs uppercase">RED (P1)</span>
                    <Flame size={16} />
                  </div>
                  <span className="text-[10px] font-bold opacity-80">EMERGENCY / Immediate Resuscitation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUrgencyTier('P2 - URGENT')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-24",
                    urgencyTier === 'P2 - URGENT' ? "bg-amber-500 text-white border-amber-600 shadow-lg scale-105" : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs uppercase">YELLOW (P2)</span>
                    <Clock size={16} />
                  </div>
                  <span className="text-[10px] font-bold opacity-80">URGENT / High Priority Assessment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUrgencyTier('P3 - STABLE')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-24",
                    urgencyTier === 'P3 - STABLE' ? "bg-emerald-600 text-white border-emerald-700 shadow-lg scale-105" : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs uppercase">GREEN (P3)</span>
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-[10px] font-bold opacity-80">ROUTINE / Stable Consultation</span>
                </button>

              </div>
            </div>

          </CardContent>

          {/* CARD FOOTER BUTTON */}
          <CardFooter className="bg-slate-50 border-t p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Real-Time Clinical Handshake Active</span>
            </div>

            <Button 
              type="submit"
              disabled={triageMutation.isPending || !selectedPatientId}
              className="h-14 px-12 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-200 active:scale-95 transition-all"
            >
              {triageMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                "Authorize & Seal Vital Sync"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 3. HISTORICAL TRIAGE RECORD LEDGER */}
      {selectedPatientId && (
        <Card className="border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                <History size={18} className="text-blue-600" /> Historical Vitals Audit Log
              </CardTitle>
              <CardDescription className="text-xs">Past physiological measurements recorded for {activePatient?.full_name}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-12">
                  <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Timestamp</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Blood Pressure</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Temperature</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Weight & SpO2</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-500">Triage Tier</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Slip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isHistoryLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-orange-600"/> Loading Vitals Log...</TableCell></TableRow>
                ) : triageHistory?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400 font-bold">No historical vitals recorded yet for this patient.</TableCell></TableRow>
                ) : triageHistory?.map(t => (
                  <TableRow key={t.id} className="h-16">
                    <TableCell className="pl-8 font-mono text-xs font-bold text-slate-600">{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs font-black text-rose-600">{t.blood_pressure || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-amber-600">{t.temperature_c ? `${t.temperature_c} °C` : 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-800">{t.weight_kg ? `${t.weight_kg} kg` : 'N/A'} • SpO2: {t.oxygen_saturation ? `${t.oxygen_saturation}%` : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-none text-[9px] font-black uppercase px-3 py-1", t.urgency_level?.includes('EMERGENCY') ? "bg-rose-600 text-white" : t.urgency_level?.includes('URGENT') ? "bg-amber-500 text-white" : "bg-emerald-100 text-emerald-800")}>
                        {t.urgency_level || 'P3 - STABLE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button onClick={() => printTriageSlip(t)} variant="ghost" size="sm" className="h-8 px-3 font-bold text-slate-600">
                        <Printer size={14} className="mr-1 text-orange-600" /> Slip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}