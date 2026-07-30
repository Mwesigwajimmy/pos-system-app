'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import {
  Stethoscope, ClipboardList, FlaskConical, Pill, Loader2,
  Plus, Trash2, User, Lock, Search, AlertTriangle, Check
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
  urgent: boolean;
}

interface QueuedPrescription {
  variant_id: number;
  product_name: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  notes: string;
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

const ENCOUNTER_TYPES = [
  'Outpatient Consultation',
  'Follow-up Visit',
  'Emergency Attendance',
  'Inpatient Review',
  'Antenatal Visit',
  'Counseling Session',
  'Procedure'
];

const REFERRAL_OPTIONS = ['None', 'Internal department', 'External facility', 'Specialist'];

const ROUTES = ['Oral', 'IV', 'IM', 'Topical', 'Inhaled', 'Rectal', 'Subcutaneous', 'Eye', 'Ear'];

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'At night', 'As needed'];

const SECTIONS = [
  { id: 'history', label: 'History', icon: ClipboardList },
  { id: 'assessment', label: 'Assessment', icon: Stethoscope },
  { id: 'plan', label: 'Plan', icon: Check },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'labs', label: 'Lab orders', icon: FlaskConical },
];

const composeNotes = (parts: Array<[string, string | undefined]>) =>
  parts
    .filter(([, value]) => value && String(value).trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join('\n\n');

function Vital({ label, value, unit }: { label: string; value?: string | number | null; unit?: string }) {
  const recorded = value !== null && value !== undefined && String(value).trim() !== '';
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      {recorded ? (
        <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
          {value}
          {unit ? <span className="ml-1 text-xs font-normal text-slate-400">{unit}</span> : null}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-400">Not recorded</p>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
  wide = false
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("space-y-2", wide && "sm:col-span-2")}>
      <Label className="text-xs font-medium text-slate-500">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default function EncounterPortal({ tenantId, patientId, practitionerId }: EncounterPortalProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('history');
  const [selectedDepartment, setSelectedDepartment] = useState('General Medicine');
  const [encounterType, setEncounterType] = useState('Outpatient Consultation');
  const [referralStatus, setReferralStatus] = useState('None');

  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [queuedLabTests, setQueuedLabTests] = useState<QueuedLabTest[]>([]);

  const [pharmaSearchQuery, setPharmaSearchQuery] = useState('');
  const [selectedPharmaVariant, setSelectedPharmaVariant] = useState<any>(null);
  const [doseInput, setDoseInput] = useState('');
  const [frequencyInput, setFrequencyInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [routeInput, setRouteInput] = useState('Oral');
  const [rxNotesInput, setRxNotesInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(1);
  const [queuedPrescriptions, setQueuedPrescriptions] = useState<QueuedPrescription[]>([]);

  const { data: profile } = useQuery({
    queryKey: ['active_profile_encounter_portal', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('profiles')
        .select('*, business_name, currency, business_id')
        .eq('id', user?.id)
        .limit(1)
        .single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id || tenantId;

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

  const { data: pharmaInventory } = useQuery({
    queryKey: ['pharma_variants_encounter', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, price, selling_price, stock_quantity, products(name)')
        .eq('business_id', activeBusinessId)
        .eq('is_active', true)
        .order('name')
        .limit(500);
      if (error) return [];
      return data || [];
    }
  });

  const filteredLabCatalog = useMemo(() => {
    const term = labSearchQuery.trim().toLowerCase();
    const list = labCatalog || [];
    if (!term) return list;
    return list.filter(t =>
      (t.test_name || '').toLowerCase().includes(term) ||
      (t.department_name || '').toLowerCase().includes(term)
    );
  }, [labCatalog, labSearchQuery]);

  const filteredPharmaInventory = useMemo(() => {
    const term = pharmaSearchQuery.trim().toLowerCase();
    const list = pharmaInventory || [];
    if (!term) return list.slice(0, 50);
    return list.filter((p: any) =>
      (p.products?.name || p.name || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }, [pharmaInventory, pharmaSearchQuery]);

  const totalLabFees = useMemo(
    () => queuedLabTests.reduce((acc, curr) => acc + curr.price, 0),
    [queuedLabTests]
  );

  const patientAllergies: string[] = Array.isArray(activePatient?.allergies) ? activePatient.allergies : [];

  const handleAddLabTest = (test: any) => {
    if (queuedLabTests.some(t => t.catalog_id === test.id)) {
      toast.error("Already added");
      return;
    }
    setQueuedLabTests(prev => [...prev, {
      catalog_id: test.id,
      test_name: test.test_name,
      department_name: test.department_name,
      sample_type: test.sample_type || 'Blood',
      price: Number(test.selling_price || 0),
      is_sensitive: !!test.is_sensitive,
      urgent: !!test.is_sensitive
    }]);
  };

  const toggleLabUrgency = (index: number) => {
    setQueuedLabTests(prev => prev.map((t, i) => i === index ? { ...t, urgent: !t.urgent } : t));
  };

  const handleAddPrescription = () => {
    if (!selectedPharmaVariant) {
      toast.error("Select a medication");
      return;
    }
    if (!doseInput.trim()) {
      toast.error("Enter a dose");
      return;
    }
    if (!frequencyInput) {
      toast.error("Select how often it is taken");
      return;
    }

    const prodName = `${selectedPharmaVariant.products?.name || selectedPharmaVariant.name} (${selectedPharmaVariant.name})`;
    const dosage = [doseInput.trim(), frequencyInput, durationInput.trim(), routeInput, rxNotesInput.trim()]
      .filter(Boolean)
      .join(' · ');

    setQueuedPrescriptions(prev => [...prev, {
      variant_id: selectedPharmaVariant.id,
      product_name: prodName,
      dose: doseInput.trim(),
      frequency: frequencyInput,
      duration: durationInput.trim(),
      route: routeInput,
      notes: rxNotesInput.trim(),
      dosage,
      quantity: Number(quantityInput) || 1
    }]);

    setSelectedPharmaVariant(null);
    setDoseInput('');
    setFrequencyInput('');
    setDurationInput('');
    setRouteInput('Oral');
    setRxNotesInput('');
    setQuantityInput(1);
  };

  const onSubmit = async (formData: any) => {
    if (!patientId) {
      toast.error("No patient selected");
      return;
    }

    setSubmitting(true);
    try {
      const symptomsBlock = composeNotes([
        ['Chief complaint', formData.chief_complaint],
        ['Duration', formData.illness_duration],
        ['History of presenting illness', formData.symptoms],
        ['Past medical history', formData.past_history],
        ['Current medications', formData.current_medications],
        ['Allergies noted', formData.allergies_noted],
      ]);

      const planBlock = composeNotes([
        ['Examination findings', formData.examination_findings],
        ['Management plan', formData.treatment_plan],
        ['Advice given', formData.advice_given],
        ['Referred to', referralStatus !== 'None' ? formData.referred_to : ''],
      ]);

      const { data: encounter, error: encErr } = await supabase
        .from('medical_encounters')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          patient_id: patientId,
          practitioner_id: practitionerId || profile?.id,
          department_name: selectedDepartment,
          encounter_type: encounterType,
          symptoms: symptomsBlock,
          diagnosis_icd10: formData.diagnosis_icd10,
          mental_state_exam: formData.mental_state_exam ? { notes: formData.mental_state_exam } : null,
          treatment_plan: planBlock,
          follow_up_date: formData.follow_up_date || null,
          referral_status: referralStatus,
          status: 'closed'
        }])
        .select()
        .single();

      if (encErr) throw encErr;

      const failedLabs: string[] = [];
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

          const { error: labErr } = await supabase.from('medical_lab_orders').insert([{
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
            requested_by: profile?.full_name || 'Attending clinician',
            priority_level: labItem.urgent ? 'urgent' : 'routine',
            status: 'pending',
            payment_status: 'pending'
          }]);

          if (labErr) failedLabs.push(labItem.test_name);
        }
      }

      let prescriptionsFailed = false;
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

        const { error: rxErr } = await supabase.from('medical_prescriptions').insert(scriptPayload);
        if (rxErr) prescriptionsFailed = true;
      }

      if (failedLabs.length || prescriptionsFailed) {
        toast.error(
          [
            'Encounter saved, but some orders did not go through.',
            failedLabs.length ? `Lab tests not sent: ${failedLabs.join(', ')}.` : '',
            prescriptionsFailed ? 'Prescriptions were not sent to pharmacy.' : '',
            'Re-enter the missing orders before the patient leaves.'
          ].filter(Boolean).join(' '),
          { duration: 15000 }
        );
      } else {
        const reference = typeof encounter?.id === 'string' ? encounter.id.substring(0, 8).toUpperCase() : '';
        toast.success(
          `Encounter saved${reference ? ` (${reference})` : ''} · ${queuedLabTests.length} lab order${queuedLabTests.length === 1 ? '' : 's'} · ${queuedPrescriptions.length} prescription${queuedPrescriptions.length === 1 ? '' : 's'}`
        );
        reset();
        setQueuedLabTests([]);
        setQueuedPrescriptions([]);
        setReferralStatus('None');
        setActiveSection('history');
      }

      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label || '';

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 pb-32 pt-6 sm:space-y-6 xl:px-8">

      <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">
                {activePatient?.full_name || 'No patient selected'}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {activePatient?.patient_uid ? <span className="font-mono">{activePatient.patient_uid}</span> : null}
                {activePatient?.gender ? <span>{activePatient.gender}</span> : null}
                {activePatient?.dob ? <span>DOB {activePatient.dob}</span> : null}
                {activePatient?.blood_group ? <span>Blood group {activePatient.blood_group}</span> : null}
              </div>
            </div>
          </div>

          {patientAllergies.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Allergies</p>
                <p className="text-sm font-medium text-red-900">{patientAllergies.join(', ')}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <Vital label="Blood pressure" value={latestVitals?.blood_pressure} unit="mmHg" />
          <Vital label="Temperature" value={latestVitals?.temperature_c} unit="°C" />
          <Vital label="Weight" value={latestVitals?.weight_kg} unit="kg" />
          <Vital label="SpO2" value={latestVitals?.oxygen_saturation} unit="%" />
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Triage</p>
            {latestVitals?.urgency_level ? (
              <Badge
                variant="secondary"
                className={cn(
                  "mt-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                  latestVitals.urgency_level === 'Emergency'
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {latestVitals.urgency_level}
              </Badge>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Not triaged</p>
            )}
          </div>
        </div>

        {!latestVitals ? (
          <div className="border-t border-slate-200 bg-amber-50 px-5 py-3">
            <p className="text-sm text-amber-900">
              No vitals have been recorded for this patient. Send them to triage before prescribing.
            </p>
          </div>
        ) : null}
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
          <nav className="hidden lg:block">
            <div className="sticky top-6 space-y-0.5">
              {SECTIONS.map(section => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const count =
                  section.id === 'prescriptions' ? queuedPrescriptions.length :
                  section.id === 'labs' ? queuedLabTests.length : 0;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon size={15} className={isActive ? "text-slate-900" : "text-slate-400"} />
                    <span className="flex-1">{section.label}</span>
                    {count > 0 ? (
                      <span className="rounded-md bg-slate-900 px-1.5 text-[11px] font-medium text-white">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="lg:hidden">
            <Label className="text-xs font-medium text-slate-500">Section</Label>
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="mt-2 h-11 rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {SECTIONS.map(section => (
                  <SelectItem key={section.id} value={section.id}>{section.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <h2 className="text-sm font-semibold text-slate-900">{activeLabel}</h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 text-xs sm:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={encounterType} onValueChange={setEncounterType}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 text-xs sm:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {ENCOUNTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="px-5 py-6 sm:px-6">

                {activeSection === 'history' && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Chief complaint" required error={errors.chief_complaint ? 'Enter the main complaint' : undefined}>
                      <Input
                        {...register('chief_complaint', { required: true })}
                        placeholder="Fever and headache"
                        className="h-11 rounded-lg border-slate-200 text-sm"
                      />
                    </Field>

                    <Field label="Duration">
                      <Input
                        {...register('illness_duration')}
                        placeholder="3 days"
                        className="h-11 rounded-lg border-slate-200 text-sm"
                      />
                    </Field>

                    <Field
                      label="History of presenting illness"
                      required
                      wide
                      error={errors.symptoms ? 'Enter the history' : undefined}
                    >
                      <Textarea
                        {...register('symptoms', { required: true })}
                        className="min-h-[110px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                        placeholder="Onset, progression, associated symptoms, treatment taken so far"
                      />
                    </Field>

                    <Field label="Past medical history" wide>
                      <Textarea
                        {...register('past_history')}
                        className="min-h-[80px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                        placeholder="Chronic conditions, previous admissions, surgeries"
                      />
                    </Field>

                    <Field label="Current medications">
                      <Input
                        {...register('current_medications')}
                        placeholder="What the patient is already taking"
                        className="h-11 rounded-lg border-slate-200 text-sm"
                      />
                    </Field>

                    <Field
                      label="Allergies noted today"
                      hint={patientAllergies.length ? `On file: ${patientAllergies.join(', ')}` : 'Nothing on file'}
                    >
                      <Input
                        {...register('allergies_noted')}
                        placeholder="Any allergy reported during this visit"
                        className="h-11 rounded-lg border-slate-200 text-sm"
                      />
                    </Field>
                  </div>
                )}

                {activeSection === 'assessment' && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Examination findings" wide>
                      <Textarea
                        {...register('examination_findings')}
                        className="min-h-[110px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                        placeholder="General appearance, systemic examination, notable signs"
                      />
                    </Field>

                    <Field label="Diagnosis" hint="ICD-10 code or description.">
                      <Input
                        {...register('diagnosis_icd10')}
                        placeholder="B54 or Clinical malaria"
                        className="h-11 rounded-lg border-slate-200 font-mono text-sm uppercase"
                      />
                    </Field>

                    <Field label="Mental state">
                      <Input
                        {...register('mental_state_exam')}
                        placeholder="Orientation, mood, speech, cognition"
                        className="h-11 rounded-lg border-slate-200 text-sm"
                      />
                    </Field>
                  </div>
                )}

                {activeSection === 'plan' && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Management plan" wide>
                      <Textarea
                        {...register('treatment_plan')}
                        className="min-h-[110px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                        placeholder="Treatment, procedures, admission decision, monitoring"
                      />
                    </Field>

                    <Field label="Advice given" wide>
                      <Textarea
                        {...register('advice_given')}
                        className="min-h-[80px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                        placeholder="Diet, rest, danger signs to watch for, when to return"
                      />
                    </Field>

                    <Field label="Follow-up date">
                      <Input
                        type="date"
                        {...register('follow_up_date')}
                        className="h-11 rounded-lg border-slate-200 text-sm"
                      />
                    </Field>

                    <Field label="Referral">
                      <Select value={referralStatus} onValueChange={setReferralStatus}>
                        <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {REFERRAL_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>

                    {referralStatus !== 'None' ? (
                      <Field label="Referred to" wide>
                        <Input
                          {...register('referred_to')}
                          placeholder="Department, facility or specialist name"
                          className="h-11 rounded-lg border-slate-200 text-sm"
                        />
                      </Field>
                    ) : null}
                  </div>
                )}

                {activeSection === 'prescriptions' && (
                  <div className="space-y-5">
                    {patientAllergies.length > 0 ? (
                      <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />
                        <p className="text-sm text-red-900">
                          Allergies on file: <span className="font-medium">{patientAllergies.join(', ')}</span>
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-4 rounded-lg border border-slate-200 p-4 sm:p-5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Search the formulary"
                          value={pharmaSearchQuery}
                          onChange={e => setPharmaSearchQuery(e.target.value)}
                          className="h-11 rounded-lg border-slate-200 pl-9 text-sm"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Medication" required wide>
                          <Select
                            value={selectedPharmaVariant?.id ? String(selectedPharmaVariant.id) : ''}
                            onValueChange={id => {
                              const found = pharmaInventory?.find((p: any) => String(p.id) === id);
                              setSelectedPharmaVariant(found);
                            }}
                          >
                            <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                              <SelectValue placeholder="Select medication" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72 rounded-lg">
                              {filteredPharmaInventory.length ? (
                                filteredPharmaInventory.map((p: any) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.products?.name || p.name} ({p.name})
                                    <span className="ml-2 text-xs text-slate-400">
                                      {p.stock_quantity} in stock
                                    </span>
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-slate-400">No medication found</div>
                              )}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Dose" required>
                          <Input
                            placeholder="500 mg"
                            value={doseInput}
                            onChange={e => setDoseInput(e.target.value)}
                            className="h-11 rounded-lg border-slate-200 text-sm"
                          />
                        </Field>

                        <Field label="Frequency" required>
                          <Select value={frequencyInput} onValueChange={setFrequencyInput}>
                            <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                              <SelectValue placeholder="How often" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Duration">
                          <Input
                            placeholder="5 days"
                            value={durationInput}
                            onChange={e => setDurationInput(e.target.value)}
                            className="h-11 rounded-lg border-slate-200 text-sm"
                          />
                        </Field>

                        <Field label="Route">
                          <Select value={routeInput} onValueChange={setRouteInput}>
                            <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {ROUTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Quantity to dispense">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={quantityInput}
                            onChange={e => setQuantityInput(Math.max(1, Number(e.target.value) || 1))}
                            className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                          />
                        </Field>

                        <Field label="Notes for the pharmacist" wide>
                          <Input
                            placeholder="After meals, do not crush"
                            value={rxNotesInput}
                            onChange={e => setRxNotesInput(e.target.value)}
                            className="h-11 rounded-lg border-slate-200 text-sm"
                          />
                        </Field>
                      </div>

                      <Button
                        type="button"
                        onClick={handleAddPrescription}
                        className="h-11 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto sm:px-6"
                      >
                        <Plus size={15} className="mr-2" />
                        Add prescription
                      </Button>
                    </div>

                    {queuedPrescriptions.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {queuedPrescriptions.map((rx, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">{rx.product_name}</p>
                              <p className="mt-0.5 text-sm text-slate-500">{rx.dosage}</p>
                              <p className="mt-0.5 text-xs text-slate-400">Dispense {rx.quantity}</p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => setQueuedPrescriptions(prev => prev.filter((_, i) => i !== idx))}
                              variant="ghost"
                              className="h-8 w-8 shrink-0 p-0 text-slate-400 hover:text-red-600"
                              aria-label="Remove"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-400">No prescriptions added</p>
                    )}
                  </div>
                )}

                {activeSection === 'labs' && (
                  <div className="space-y-5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search test or department"
                        value={labSearchQuery}
                        onChange={e => setLabSearchQuery(e.target.value)}
                        className="h-11 rounded-lg border-slate-200 pl-9 text-sm"
                      />
                    </div>

                    <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                      {filteredLabCatalog.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-400">No tests found</p>
                      ) : (
                        filteredLabCatalog.map(t => {
                          const added = queuedLabTests.some(q => q.catalog_id === t.id);
                          return (
                            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm text-slate-900">{t.test_name}</p>
                                <p className="truncate text-xs text-slate-400">
                                  {t.department_name} · {t.sample_type || 'Blood'} · {businessCurrency} {Number(t.selling_price || 0).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                type="button"
                                onClick={() => handleAddLabTest(t)}
                                disabled={added}
                                variant="outline"
                                className="h-9 shrink-0 rounded-lg border-slate-200 px-3 text-xs font-medium"
                              >
                                {added ? 'Added' : <><Plus size={13} className="mr-1.5" />Add</>}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {queuedLabTests.length > 0 ? (
                      <div className="space-y-3">
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                          {queuedLabTests.map((t, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate text-sm text-slate-900">
                                  {t.test_name}
                                  {t.is_sensitive ? <Lock size={11} className="shrink-0 text-slate-400" /> : null}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {businessCurrency} {t.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Button
                                  type="button"
                                  onClick={() => toggleLabUrgency(idx)}
                                  variant="outline"
                                  className={cn(
                                    "h-8 rounded-lg px-2.5 text-xs font-medium",
                                    t.urgent ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 text-slate-500"
                                  )}
                                >
                                  {t.urgent ? 'Urgent' : 'Routine'}
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => setQueuedLabTests(prev => prev.filter((_, i) => i !== idx))}
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                  aria-label="Remove"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="text-sm text-slate-500">Lab charges</span>
                          <span className="text-sm font-semibold tabular-nums text-slate-900">
                            {businessCurrency} {totalLabFees.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-400">No tests added</p>
                    )}
                  </div>
                )}

              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {queuedLabTests.length} lab order{queuedLabTests.length === 1 ? '' : 's'} ·{' '}
                {queuedPrescriptions.length} prescription{queuedPrescriptions.length === 1 ? '' : 's'}
              </p>
              <Button
                type="submit"
                disabled={submitting || !patientId}
                className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save encounter
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}