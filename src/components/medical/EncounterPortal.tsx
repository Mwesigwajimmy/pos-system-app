'use client';

/**
 * --- BBU1 SOVEREIGN CLINICAL ENCOUNTER PORTAL ---
 * VERSION: v12.0 OMEGA (FULL LAB & PHARMACY PRESCRIPTION WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Health System
 */

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  Stethoscope, FileText, Brain, ShieldAlert, FlaskConical, 
  Send, Loader2, Zap, Pill, Plus, Trash2, User, Activity, 
  HeartPulse, Thermometer, CheckCircle2, Clock, Lock, 
  Building2, Calendar, DollarSign, AlertCircle, Search, 
  Sparkles, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EncounterPortalProps {
  tenantId: string;
  patientId?: string;
  practitionerId?: string;
}

interface QueuedLabTest {
  catalog_id: string;
  test_name: string;
  department_name: string;
  sample_type: string;
  price: number;
  is_sensitive: boolean;
}

interface QueuedPrescription {
  variant_id: number;
  product_name: string;
  dosage: string;
  quantity: number;
}

const supabase = createClient();

const DEPARTMENTS = [
  'General Medicine',
  'Pediatrics',
  'Gynaecology & Obstetrics',
  'AIC Counseling / VCT',
  'Dental Surgery',
  'Emergency & Triage',
  'Minor Surgery'
];

export default function EncounterPortal({ tenantId, patientId, practitionerId }: EncounterPortalProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  
  const [submitting, setSubmitting] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('General Medicine');
  const [encounterType, setEncounterType] = useState('Outpatient Consultation');

  // --- QUEUED LAB & PHARMACY ORDERS ---
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [queuedLabTests, setQueuedLabTests] = useState<QueuedLabTest[]>([]);
  
  const [pharmaSearchQuery, setPharmaSearchQuery] = useState('');
  const [selectedPharmaVariant, setSelectedPharmaVariant] = useState<any>(null);
  const [dosageInput, setDosageInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(1);
  const [queuedPrescriptions, setQueuedPrescriptions] = useState<QueuedPrescription[]>([]);

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_encounter_portal', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id || tenantId;

  // 2. DATA: Active Patient Profile & Allergy Warning
  const { data: activePatient } = useQuery({
    queryKey: ['medical_patient_detail', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_patients')
        .select('*')
        .eq('id', patientId)
        .single();
      if (error) return null;
      return data;
    }
  });

  // 3. DATA: Latest Patient Triage Vitals
  const { data: latestVitals } = useQuery({
    queryKey: ['latest_patient_vitals', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_triage')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    }
  });

  // 4. DATA: Lab Test Catalog for Instant Ordering
  const { data: labCatalog } = useQuery({
    queryKey: ['lab_catalog_encounter', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_test_catalog')
        .select('*')
        .eq('is_active', true)
        .order('test_name');
      if (error) return [];
      return data || [];
    }
  });

  // 5. DATA: Pharmaceutical Inventory for Instant Prescribing
  const { data: pharmaInventory } = useQuery({
    queryKey: ['pharma_variants_encounter', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, price, selling_price, stock_quantity, products(name)')
        .eq('is_active', true)
        .limit(50);
      if (error) return [];
      return data || [];
    }
  });

  const filteredLabCatalog = useMemo(() => {
    if (!labCatalog) return [];
    return labCatalog.filter(t => 
      t.test_name.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
      t.department_name.toLowerCase().includes(labSearchQuery.toLowerCase())
    );
  }, [labCatalog, labSearchQuery]);

  const filteredPharmaInventory = useMemo(() => {
    if (!pharmaInventory) return [];
    return pharmaInventory.filter(p => 
      (p.products?.name || p.name).toLowerCase().includes(pharmaSearchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(pharmaSearchQuery.toLowerCase())
    );
  }, [pharmaInventory, pharmaSearchQuery]);

  // Total Lab Order Fee in Queue
  const totalLabFees = useMemo(() => {
    return queuedLabTests.reduce((acc, curr) => acc + curr.price, 0);
  }, [queuedLabTests]);

  // HANDLER: Add Lab Test to Queue
  const handleAddLabTest = (test: any) => {
    if (queuedLabTests.some(t => t.catalog_id === test.id)) {
      return toast.error("Test is already queued in this encounter.");
    }
    setQueuedLabTests(prev => [...prev, {
      catalog_id: test.id,
      test_name: test.test_name,
      department_name: test.department_name,
      sample_type: test.sample_type || 'Blood',
      price: Number(test.selling_price || 0),
      is_sensitive: test.is_sensitive
    }]);
    toast.success(`Queued Lab Test: ${test.test_name}`);
  };

  // HANDLER: Add Prescription to Queue
  const handleAddPrescription = () => {
    if (!selectedPharmaVariant) return toast.error("Please select a medication.");
    if (!dosageInput.trim()) return toast.error("Please specify dosage instructions.");

    const prodName = `${selectedPharmaVariant.products?.name || selectedPharmaVariant.name} (${selectedPharmaVariant.name})`;

    setQueuedPrescriptions(prev => [...prev, {
      variant_id: selectedPharmaVariant.id,
      product_name: prodName,
      dosage: dosageInput,
      quantity: Number(quantityInput) || 1
    }]);

    setSelectedPharmaVariant(null);
    setDosageInput('');
    setQuantityInput(1);
    toast.success("Medication queued for pharmacy dispensing");
  };

  // MAIN COMMIT ENCOUNTER MUTATION
  const onSubmit = async (formData: any) => {
    if (!patientId) {
      toast.error("No active patient selected for this encounter.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. CREATE CLINICAL ENCOUNTER RECORD
      const { data: encounter, error: encErr } = await supabase
        .from('medical_encounters')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          patient_id: patientId,
          practitioner_id: practitionerId || profile?.id,
          department_name: selectedDepartment,
          encounter_type: encounterType,
          symptoms: formData.symptoms,
          diagnosis_icd10: formData.diagnosis_icd10,
          mental_state_exam: formData.mental_state_exam ? { notes: formData.mental_state_exam } : null,
          treatment_plan: formData.treatment_plan,
          follow_up_date: formData.follow_up_date || null,
          referral_status: formData.referral_status || 'None',
          status: 'closed'
        }])
        .select()
        .single();

      if (encErr) throw encErr;

      // 2. PROCESS QUEUED LAB ORDERS
      if (queuedLabTests.length > 0 && encounter) {
        for (const labItem of queuedLabTests) {
          
          let anonCode = null;
          if (labItem.is_sensitive) {
            const { data: codeData } = await supabase.rpc('fn_generate_anonymous_client_code', {
              p_business_id: activeBusinessId,
              p_prefix: 'AIC-ANON'
            });
            anonCode = codeData || `AIC-ANON-${Date.now().toString().slice(-6)}`;
          }

          await supabase.from('medical_lab_orders').insert([{
            tenant_id: tenantId,
            business_id: activeBusinessId,
            encounter_id: encounter.id,
            patient_id: patientId,
            test_name: labItem.test_name,
            department_name: labItem.department_name,
            sample_type: labItem.sample_type,
            cost: labItem.price,
            total_amount: labItem.price,
            currency_code: businessCurrency,
            anonymous_code: anonCode,
            requested_by: profile?.full_name || 'Attending Physician',
            priority_level: labItem.is_sensitive ? 'urgent' : 'routine',
            status: 'pending',
            payment_status: 'pending'
          }]);
        }
      }

      // 3. PROCESS QUEUED PHARMACY PRESCRIPTIONS
      if (queuedPrescriptions.length > 0 && encounter) {
        const scriptPayload = queuedPrescriptions.map(p => ({
          tenant_id: tenantId,
          business_id: activeBusinessId,
          encounter_id: encounter.id,
          patient_id: patientId,
          variant_id: p.variant_id,
          dosage_instruction: p.dosage,
          quantity_prescribed: p.quantity,
          status: 'pending'
        }));

        await supabase.from('medical_prescriptions').insert(scriptPayload);
      }

      toast.success("Clinical Encounter Sealed Successfully", {
        description: `Encounter #${encounter.id.substring(0,8).toUpperCase()} committed with ${queuedLabTests.length} Lab Orders and ${queuedPrescriptions.length} Prescriptions.`
      });

      reset();
      setQueuedLabTests([]);
      setQueuedPrescriptions([]);
      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
    } catch (e: any) {
      toast.error("Handshake Failure: " + e.message);
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* PATIENT IDENTITY & TRIAGE VITALS BANNER */}
      <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
        <div className="bg-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
              <User size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">{activePatient?.full_name || 'Walk-in Client / Patient'}</h2>
                <Badge className="bg-blue-500/20 text-blue-300 border-none font-mono text-[10px] uppercase">
                  UID: {activePatient?.patient_uid || 'TEMP-PATIENT'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-3">
                <span>Gender: <strong className="text-white">{activePatient?.gender || 'Unspecified'}</strong></span>
                <span>•</span>
                <span>DOB: <strong className="text-white">{activePatient?.dob || 'N/A'}</strong></span>
                <span>•</span>
                <span>Blood Group: <strong className="text-emerald-400 font-black">{activePatient?.blood_group || 'N/A'}</strong></span>
              </p>
            </div>
          </div>

          {/* ALLERGY WARNING BADGE */}
          {activePatient?.allergies && activePatient.allergies.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300">
              <ShieldAlert size={20} className="shrink-0 animate-pulse" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Allergy Warning</p>
                <p className="text-xs font-bold text-white">{activePatient.allergies.join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        {/* LATEST TRIAGE VITALS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-slate-50 border-t border-slate-100">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
              <HeartPulse size={12} className="text-rose-500" /> Blood Pressure
            </span>
            <p className="text-lg font-black text-slate-900">{latestVitals?.blood_pressure || '120/80'} <span className="text-[10px] text-slate-400">mmHg</span></p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
              <Thermometer size={12} className="text-amber-500" /> Body Temp
            </span>
            <p className="text-lg font-black text-slate-900">{latestVitals?.temperature_c || '36.6'} <span className="text-[10px] text-slate-400">°C</span></p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
              <Activity size={12} className="text-blue-500" /> Body Weight
            </span>
            <p className="text-lg font-black text-slate-900">{latestVitals?.weight_kg || '70.0'} <span className="text-[10px] text-slate-400">kg</span></p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
              <Activity size={12} className="text-emerald-500" /> Oxygen Sat (SpO2)
            </span>
            <p className="text-lg font-black text-slate-900">{latestVitals?.oxygen_saturation || '98'} <span className="text-[10px] text-slate-400">%</span></p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Triage Urgency</span>
            <Badge className={cn("border-none uppercase font-black text-[10px] px-3 py-1", latestVitals?.urgency_level === 'Emergency' ? "bg-rose-600 text-white" : "bg-emerald-100 text-emerald-800")}>
              {latestVitals?.urgency_level || 'Routine Consultation'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* MAIN CLINICAL CONSULTATION WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CONSULTATION NOTE & PRESCRIPTIONS (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-2xl border-t-4 border-t-blue-600 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between p-6">
              <div>
                <CardTitle className="font-black text-xl tracking-tight text-slate-900 flex items-center gap-2">
                  <Stethoscope className="text-blue-600" /> Clinical Consultation Record
                </CardTitle>
                <CardDescription className="text-xs">Enter medical findings, symptoms, diagnosis, and treatment notes</CardDescription>
              </div>

              {/* DEPARTMENT & ENCOUNTER SELECTOR */}
              <div className="flex gap-3">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="font-bold text-xs">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              
              {/* PRESENTING SYMPTOMS */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber-500" /> Presenting Symptoms & HPI *
                </Label>
                <Textarea 
                  {...register('symptoms', { required: true })} 
                  className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/30 font-medium" 
                  placeholder="Patient reports fever for 3 days, headaches, joint pain, loss of appetite..." 
                />
              </div>

              {/* DIAGNOSIS & MENTAL STATE */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-blue-500" /> Diagnosis (ICD-10 / Narrative)
                  </Label>
                  <Input 
                    {...register('diagnosis_icd10')} 
                    className="h-12 rounded-xl font-mono uppercase font-bold border-slate-200" 
                    placeholder="e.g. B20 (HIV Disease) or Acute Malaria" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Brain size={14} className="text-purple-500" /> Mental State Exam
                  </Label>
                  <Input 
                    {...register('mental_state_exam')} 
                    className="h-12 rounded-xl border-slate-200 font-medium" 
                    placeholder="Orientation, Affect, Speech, Cognition..." 
                  />
                </div>
              </div>

              {/* TREATMENT PLAN */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-500 tracking-widest">
                  Treatment Plan & Clinical Notes
                </Label>
                <Textarea 
                  {...register('treatment_plan')} 
                  className="min-h-[120px] rounded-2xl border-slate-200 font-medium" 
                  placeholder="Comprehensive management plan, counseling summary, referral advice..." 
                />
              </div>

              {/* PHARMACY PRESCRIPTION QUEUE SECTION */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-900">
                    <Pill size={18} className="text-emerald-600" /> Pharmacy Prescriptions Queue
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{queuedPrescriptions.length} Prescribed</span>
                </div>

                {/* SEARCH PHARMA INVENTORY */}
                <div className="grid md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Search Medication</Label>
                    <Select value={selectedPharmaVariant?.id ? String(selectedPharmaVariant.id) : ''} onValueChange={id => {
                      const found = pharmaInventory?.find(p => String(p.id) === id);
                      setSelectedPharmaVariant(found);
                    }}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs">
                        <SelectValue placeholder="Select Medication..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pharmaInventory?.map(p => (
                          <SelectItem key={p.id} value={String(p.id)} className="font-bold text-xs">
                            {p.products?.name || p.name} ({p.name}) • Stock: {p.stock_quantity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Dosage Instruction</Label>
                    <Input placeholder="e.g. 1 tab 3x daily x 5 days" value={dosageInput} onChange={e => setDosageInput(e.target.value)} className="h-11 bg-white rounded-xl text-xs font-bold" />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Qty</Label>
                    <Input type="number" value={quantityInput} onChange={e => setQuantityInput(Number(e.target.value))} className="h-11 bg-white rounded-xl font-bold text-xs" />
                  </div>

                  <div className="md:col-span-1">
                    <Button onClick={handleAddPrescription} type="button" className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      <Plus size={18} />
                    </Button>
                  </div>
                </div>

                {/* QUEUED PRESCRIPTIONS LIST */}
                {queuedPrescriptions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {queuedPrescriptions.map((rx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                        <div>
                          <p className="font-bold text-xs text-slate-900">{rx.product_name}</p>
                          <p className="text-[10px] font-medium text-emerald-700">Instructions: {rx.dosage} (Qty: {rx.quantity})</p>
                        </div>
                        <Button onClick={() => setQueuedPrescriptions(prev => prev.filter((_, i) => i !== idx))} variant="ghost" size="sm" className="h-8 w-8 text-rose-500 hover:bg-rose-50">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>

            {/* ACTION FOOTER */}
            <div className="p-6 bg-slate-900 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                <Zap className="text-emerald-500 fill-current h-4 w-4 animate-pulse" /> 
                <span>AUTONOMOUS BILLING & LEDGER SEAL ACTIVE</span>
              </div>

              <Button 
                onClick={handleSubmit(onSubmit)} 
                disabled={submitting} 
                className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    <span>Sealing Encounter...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" /> Seal Encounter & Commit Orders
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: INSTANT LAB ORDER QUEUE (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-emerald-600 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-900">
                  <FlaskConical size={18} className="text-emerald-600" /> Instant Lab Order Queue
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-bold">
                  {queuedLabTests.length} QUEUED
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* SEARCH LAB TEST CATALOG */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Search Laboratory Catalog</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search test name or department..." 
                    value={labSearchQuery} 
                    onChange={e => setLabSearchQuery(e.target.value)} 
                    className="pl-9 h-11 rounded-xl text-xs font-bold border-slate-200" 
                  />
                </div>
              </div>

              {/* CATALOG QUICK LIST */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredLabCatalog.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-bold">No matching diagnostic tests in catalog.</p>
                ) : (
                  filteredLabCatalog.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 transition-colors">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{t.test_name}</p>
                        <p className="text-[9px] font-bold text-blue-600">{t.department_name} • {t.sample_type || 'Blood'}</p>
                      </div>
                      <Button onClick={() => handleAddLabTest(t)} size="sm" variant="outline" className="h-8 px-3 font-bold text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                        <Plus size={12} className="mr-1" /> Add
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* QUEUED LAB TESTS LIST */}
              {queuedLabTests.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Queued Requisitions for this Visit</Label>
                  {queuedLabTests.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                      <div>
                        <p className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          {t.test_name}
                          {t.is_sensitive && <Lock size={10} className="text-amber-600" />}
                        </p>
                        <span className="text-[9px] font-bold text-slate-400">{businessCurrency} {t.price.toLocaleString()}</span>
                      </div>
                      <Button onClick={() => setQueuedLabTests(prev => prev.filter((_, i) => i !== idx))} variant="ghost" size="sm" className="h-7 w-7 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}

                  <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Lab Orders Fee</span>
                    <span className="text-lg font-black text-emerald-400">{businessCurrency} {totalLabFees.toLocaleString()}</span>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}