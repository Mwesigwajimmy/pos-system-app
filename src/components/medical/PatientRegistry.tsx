'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

import {
  Search,
  UserPlus,
  Loader2,
  Eye,
  Pencil,
  Printer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientRegistryProps {
  tenantId: string;
}

const supabase = createClient();

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Friend', 'Other'];
const PAYER_TYPES = ['Self paying', 'Insurance', 'Employer', 'NGO or programme'];
const STATUS_FILTERS = ['All patients', 'Active only', 'Archived only'];
const PAGE_SIZES = [10, 20, 50, 100];

const emptyPatientForm = {
  full_name: '',
  gender: 'Male',
  dob: '',
  age_estimate: '',
  phone: '',
  alternate_phone: '',
  address: '',
  district: '',
  national_id: '',
  blood_group: 'Unknown',
  allergies: '',
  chronic_conditions: '',
  current_medications: '',
  medical_history: '',
  marital_status: 'Single',
  occupation: '',
  referring_facility: '',
  payer_type: 'Self paying',
  insurance_provider: '',
  insurance_policy_no: '',
  coverage_percentage: 100,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: 'Spouse',
  emergency_contact_address: '',
  is_active: true,
};

const calculateAge = (dob?: string) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const displayAge = (patient: any) => {
  const fromDob = calculateAge(patient?.dob);
  if (fromDob !== null) return `${fromDob} yrs`;
  const estimate = patient?.medical_history_summary?.age_estimate;
  return estimate ? `${estimate} yrs (est.)` : 'Age unknown';
};

function Field({
  label,
  required,
  hint,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-2', wide && 'sm:col-span-2')}>
      <Label className="text-xs font-medium text-slate-500">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</p>
    </div>
  );
}

export default function PatientRegistry({ tenantId }: PatientRegistryProps) {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All patients');
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isPatientFileOpen, setIsPatientFileOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [newPatient, setNewPatient] = useState({ ...emptyPatientForm });
  const [editPatient, setEditPatient] = useState({ ...emptyPatientForm });

  const { data: profile } = useQuery({
    queryKey: ['active_profile_patient_registry', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('profiles')
        .select('*, business_name, currency, business_id')
        .eq('id', user?.id)
        .limit(1)
        .single();
      return data;
    },
  });

  const activeBusinessId = profile?.business_id || tenantId;

  const { data: patients, isLoading, isError } = useQuery({
    queryKey: ['medical_patients', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_patients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: patientEncounters } = useQuery({
    queryKey: ['patient_encounters_360', selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_encounters')
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const { data: patientLabs } = useQuery({
    queryKey: ['patient_labs_360', selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_orders')
        .select('*, medical_lab_results(*)')
        .eq('patient_id', selectedPatient.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const { data: patientPrescriptions } = useQuery({
    queryKey: ['patient_prescriptions_360', selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_prescriptions')
        .select('*, product_variants(name, sku, products(name))')
        .eq('patient_id', selectedPatient.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = patients || [];

    return list
      .filter((p: any) => {
        if (statusFilter === 'Active only') return p.is_active;
        if (statusFilter === 'Archived only') return !p.is_active;
        return true;
      })
      .filter((p: any) => {
        if (!term) return true;
        const summary = p.medical_history_summary || {};
        return (
          (p.full_name || '').toLowerCase().includes(term) ||
          (p.patient_uid || '').toLowerCase().includes(term) ||
          (p.insurance_provider || '').toLowerCase().includes(term) ||
          (summary.phone || '').toLowerCase().includes(term) ||
          (summary.national_id || '').toLowerCase().includes(term)
        );
      });
  }, [patients, searchTerm, statusFilter]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, statusFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const pagedPatients = useMemo(
    () => filteredPatients.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filteredPatients, pageIndex, pageSize]
  );

  const activeCount = useMemo(
    () => (patients || []).filter((p: any) => p.is_active).length,
    [patients]
  );

  const buildSummary = (form: typeof emptyPatientForm, existing: any = {}) => ({
    ...existing,
    notes: form.medical_history,
    phone: form.phone,
    alternate_phone: form.alternate_phone,
    address: form.address,
    district: form.district,
    national_id: form.national_id,
    marital_status: form.marital_status,
    occupation: form.occupation,
    referring_facility: form.referring_facility,
    age_estimate: form.age_estimate,
    payer_type: form.payer_type,
    chronic_conditions: form.chronic_conditions,
    current_medications: form.current_medications,
    emergency_contact: {
      name: form.emergency_contact_name,
      phone: form.emergency_contact_phone,
      relationship: form.emergency_contact_relationship,
      address: form.emergency_contact_address,
    },
  });

  const splitAllergies = (value: string) =>
    value ? value.split(',').map(a => a.trim()).filter(Boolean) : [];

  const registerPatientMutation = useMutation({
    mutationFn: async () => {
      if (!newPatient.full_name.trim()) throw new Error("Enter the patient's name.");
      if (!newPatient.dob && !newPatient.age_estimate) {
        throw new Error("Enter a date of birth or an estimated age.");
      }

      const generatedUid = `PAT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { data: patient, error } = await supabase
        .from('medical_patients')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          full_name: newPatient.full_name.trim(),
          patient_uid: generatedUid,
          dob: newPatient.dob || null,
          gender: newPatient.gender,
          blood_group: newPatient.blood_group === 'Unknown' ? null : newPatient.blood_group,
          allergies: splitAllergies(newPatient.allergies),
          insurance_provider: newPatient.insurance_provider || null,
          insurance_policy_no: newPatient.insurance_policy_no || null,
          coverage_percentage: Number(newPatient.coverage_percentage) || 100,
          medical_history_summary: buildSummary(newPatient),
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return patient;
    },
    onSuccess: (patient) => {
      toast.success(`Registered ${patient?.full_name} · ${patient?.patient_uid}`);
      setIsRegisterOpen(false);
      setNewPatient({ ...emptyPatientForm });
      queryClient.invalidateQueries({ queryKey: ['medical_patients'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePatientMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient?.id) throw new Error("No patient selected.");
      if (!editPatient.full_name.trim()) throw new Error("Enter the patient's name.");

      const { data, error } = await supabase
        .from('medical_patients')
        .update({
          full_name: editPatient.full_name.trim(),
          gender: editPatient.gender,
          dob: editPatient.dob || null,
          blood_group: editPatient.blood_group === 'Unknown' ? null : editPatient.blood_group,
          allergies: splitAllergies(editPatient.allergies),
          insurance_provider: editPatient.insurance_provider || null,
          insurance_policy_no: editPatient.insurance_policy_no || null,
          coverage_percentage: Number(editPatient.coverage_percentage) || 100,
          is_active: editPatient.is_active,
          medical_history_summary: buildSummary(
            editPatient,
            selectedPatient.medical_history_summary || {}
          ),
        })
        .eq('id', selectedPatient.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (patient) => {
      toast.success("Patient record updated");
      setIsEditModalOpen(false);
      setSelectedPatient(patient);
      queryClient.invalidateQueries({ queryKey: ['medical_patients'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditModal = (p: any) => {
    if (!p) return;
    const summary = p.medical_history_summary || {};
    setSelectedPatient(p);
    setEditPatient({
      full_name: p.full_name || '',
      gender: p.gender || 'Male',
      dob: p.dob || '',
      age_estimate: summary.age_estimate || '',
      phone: summary.phone || '',
      alternate_phone: summary.alternate_phone || '',
      address: summary.address || '',
      district: summary.district || '',
      national_id: summary.national_id || '',
      blood_group: p.blood_group || 'Unknown',
      allergies: Array.isArray(p.allergies) ? p.allergies.join(', ') : '',
      chronic_conditions: summary.chronic_conditions || '',
      current_medications: summary.current_medications || '',
      medical_history: summary.notes || '',
      marital_status: summary.marital_status || 'Single',
      occupation: summary.occupation || '',
      referring_facility: summary.referring_facility || '',
      payer_type: summary.payer_type || 'Self paying',
      insurance_provider: p.insurance_provider || '',
      insurance_policy_no: p.insurance_policy_no || '',
      coverage_percentage: p.coverage_percentage ?? 100,
      emergency_contact_name: summary.emergency_contact?.name || '',
      emergency_contact_phone: summary.emergency_contact?.phone || '',
      emergency_contact_relationship: summary.emergency_contact?.relationship || 'Spouse',
      emergency_contact_address: summary.emergency_contact?.address || '',
      is_active: p.is_active ?? true,
    });
    setIsEditModalOpen(true);
  };

  const exportPatientEhrPdf = (patient: any) => {
    if (!patient) return;
    const notRecorded = 'Not recorded';
    const summary = patient.medical_history_summary || {};
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || 'Medical records').toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Patient record', 14, 28);
    doc.text(`Printed ${new Date().toLocaleString()}`, 14, 34);
    doc.line(14, 38, 196, 38);

    autoTable(doc, {
      startY: 44,
      head: [['Patient number', 'Name', 'Sex', 'Age', 'Blood group']],
      body: [[
        patient.patient_uid || notRecorded,
        patient.full_name || notRecorded,
        patient.gender || notRecorded,
        displayAge(patient),
        patient.blood_group || notRecorded,
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 60) + 6,
      head: [['Phone', 'Address', 'National ID', 'Occupation']],
      body: [[
        summary.phone || notRecorded,
        [summary.address, summary.district].filter(Boolean).join(', ') || notRecorded,
        summary.national_id || notRecorded,
        summary.occupation || notRecorded,
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 80) + 6,
      head: [['Allergies', 'Chronic conditions', 'Current medication']],
      body: [[
        Array.isArray(patient.allergies) && patient.allergies.length
          ? patient.allergies.join(', ')
          : 'None recorded',
        summary.chronic_conditions || 'None recorded',
        summary.current_medications || 'None recorded',
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 100) + 6,
      head: [['Payer', 'Insurer', 'Policy number', 'Coverage']],
      body: [[
        summary.payer_type || notRecorded,
        patient.insurance_provider || notRecorded,
        patient.insurance_policy_no || notRecorded,
        `${patient.coverage_percentage ?? 100}%`,
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 120) + 6,
      head: [['Next of kin', 'Relationship', 'Phone']],
      body: [[
        summary.emergency_contact?.name || notRecorded,
        summary.emergency_contact?.relationship || notRecorded,
        summary.emergency_contact?.phone || notRecorded,
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    doc.save(`Patient_${patient.patient_uid || 'record'}.pdf`);
  };

  const renderPatientForm = (
    form: typeof emptyPatientForm,
    setForm: (value: typeof emptyPatientForm) => void,
    mode: 'create' | 'edit'
  ) => (
    <div className="grid gap-5 sm:grid-cols-2">
      <SectionTitle>Identity</SectionTitle>

      <Field label="Full name" required wide>
        <Input
          placeholder="Mukasa David"
          value={form.full_name}
          onChange={e => setForm({ ...form, full_name: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Sex" required>
        <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
          <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Date of birth"
        hint={form.dob ? `${calculateAge(form.dob) ?? '—'} years old` : 'Leave blank if unknown'}
      >
        <Input
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={form.dob}
          onChange={e => setForm({ ...form, dob: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Estimated age" hint="Use when the date of birth is not known.">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={130}
          placeholder="45"
          value={form.age_estimate}
          onChange={e => setForm({ ...form, age_estimate: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
        />
      </Field>

      <Field label="National ID or passport">
        <Input
          placeholder="CM8901234XXXXX"
          value={form.national_id}
          onChange={e => setForm({ ...form, national_id: e.target.value })}
          className="h-11 rounded-lg border-slate-200 font-mono text-sm"
        />
      </Field>

      <Field label="Marital status">
        <Select value={form.marital_status} onValueChange={v => setForm({ ...form, marital_status: v })}>
          <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {MARITAL_STATUSES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Occupation">
        <Input
          placeholder="Teacher, trader, farmer"
          value={form.occupation}
          onChange={e => setForm({ ...form, occupation: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <SectionTitle>Contact</SectionTitle>

      <Field label="Phone number">
        <Input
          type="tel"
          inputMode="tel"
          placeholder="0770000000"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Alternative phone">
        <Input
          type="tel"
          inputMode="tel"
          placeholder="Another number that reaches them"
          value={form.alternate_phone}
          onChange={e => setForm({ ...form, alternate_phone: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Village or street">
        <Input
          placeholder="Plot 24, Kanjokya Street"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="District">
        <Input
          placeholder="Kampala"
          value={form.district}
          onChange={e => setForm({ ...form, district: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Referred from" wide hint="Facility that sent this patient, if any.">
        <Input
          placeholder="Mulago Regional Referral Hospital"
          value={form.referring_facility}
          onChange={e => setForm({ ...form, referring_facility: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <SectionTitle>Clinical</SectionTitle>

      <Field label="Blood group">
        <Select value={form.blood_group} onValueChange={v => setForm({ ...form, blood_group: v })}>
          <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Allergies" hint="Separate each one with a comma.">
        <Input
          placeholder="Penicillin, sulphur, latex"
          value={form.allergies}
          onChange={e => setForm({ ...form, allergies: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Chronic conditions" wide>
        <Input
          placeholder="Diabetes, hypertension, asthma"
          value={form.chronic_conditions}
          onChange={e => setForm({ ...form, chronic_conditions: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Current medication" wide>
        <Input
          placeholder="What the patient is already taking"
          value={form.current_medications}
          onChange={e => setForm({ ...form, current_medications: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Medical history" wide>
        <Textarea
          placeholder="Past admissions, surgeries, family history"
          value={form.medical_history}
          onChange={e => setForm({ ...form, medical_history: e.target.value })}
          className="min-h-[90px] resize-none rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
        />
      </Field>

      <SectionTitle>Billing</SectionTitle>

      <Field label="Who pays">
        <Select value={form.payer_type} onValueChange={v => setForm({ ...form, payer_type: v })}>
          <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {PAYER_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Coverage">
        <div className="relative">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={form.coverage_percentage}
            onChange={e => setForm({ ...form, coverage_percentage: Number(e.target.value) })}
            className="h-11 rounded-lg border-slate-200 pr-8 text-sm tabular-nums"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
        </div>
      </Field>

      {form.payer_type !== 'Self paying' ? (
        <>
          <Field label="Insurer or payer name">
            <Input
              placeholder="Jubilee, UAP, employer name"
              value={form.insurance_provider}
              onChange={e => setForm({ ...form, insurance_provider: e.target.value })}
              className="h-11 rounded-lg border-slate-200 text-sm"
            />
          </Field>

          <Field label="Policy or member number">
            <Input
              placeholder="Policy number"
              value={form.insurance_policy_no}
              onChange={e => setForm({ ...form, insurance_policy_no: e.target.value })}
              className="h-11 rounded-lg border-slate-200 font-mono text-sm"
            />
          </Field>
        </>
      ) : null}

      <SectionTitle>Next of kin</SectionTitle>

      <Field label="Name">
        <Input
          placeholder="Full name"
          value={form.emergency_contact_name}
          onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Phone">
        <Input
          type="tel"
          inputMode="tel"
          placeholder="0770000000"
          value={form.emergency_contact_phone}
          onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      <Field label="Relationship">
        <Select
          value={form.emergency_contact_relationship}
          onValueChange={v => setForm({ ...form, emergency_contact_relationship: v })}
        >
          <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Where they can be found">
        <Input
          placeholder="Village, workplace or landmark"
          value={form.emergency_contact_address}
          onChange={e => setForm({ ...form, emergency_contact_address: e.target.value })}
          className="h-11 rounded-lg border-slate-200 text-sm"
        />
      </Field>

      {mode === 'edit' ? (
        <>
          <SectionTitle>Record status</SectionTitle>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-sm text-slate-900">
                {form.is_active ? 'Active' : 'Archived'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Archived patients stay on record but are hidden from daily lists.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v === true })}
            />
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-16 pt-6 sm:space-y-6 xl:px-8">

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeCount} active {activeCount === 1 ? 'record' : 'records'}
          </p>
        </div>

        <Button
          onClick={() => setIsRegisterOpen(true)}
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          <UserPlus size={15} className="mr-2" />
          Register patient
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name, number, phone or ID"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-lg border-slate-200 pl-9 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {STATUS_FILTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-900">Patient records could not be loaded. Refresh the page.</p>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-400">Loading</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-500">No patients found</p>
            {searchTerm || statusFilter !== 'All patients' ? (
              <Button
                variant="outline"
                onClick={() => { setSearchTerm(''); setStatusFilter('All patients'); }}
                className="mt-5 h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
              >
                Clear search
              </Button>
            ) : (
              <Button
                onClick={() => setIsRegisterOpen(true)}
                className="mt-5 h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
              >
                Register the first patient
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Patient</TableHead>
                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Sex and age</TableHead>
                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Contact</TableHead>
                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Allergies</TableHead>
                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Payer</TableHead>
                    <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</TableHead>
                    <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPatients.map((p: any) => {
                    const summary = p.medical_history_summary || {};
                    const allergies = Array.isArray(p.allergies) ? p.allergies : [];

                    return (
                      <TableRow key={p.id} className="border-b border-slate-100 last:border-0">
                        <TableCell className="px-5 py-3.5">
                          <p className="text-sm font-medium text-slate-900">{p.full_name || 'Unnamed'}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">{p.patient_uid || '—'}</p>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <p className="text-sm text-slate-600">{p.gender || '—'}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{displayAge(p)}</p>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <p className="text-sm text-slate-600">{summary.phone || '—'}</p>
                          <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-400">
                            {[summary.address, summary.district].filter(Boolean).join(', ') || 'No address'}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[200px] py-3.5">
                          {allergies.length > 0 ? (
                            <Badge className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              {allergies.join(', ')}
                            </Badge>
                          ) : (
                            <span className="text-sm text-slate-400">None recorded</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <p className="text-sm text-slate-600">
                            {p.insurance_provider || summary.payer_type || 'Self paying'}
                          </p>
                          {p.insurance_policy_no ? (
                            <p className="mt-0.5 font-mono text-xs text-slate-400">
                              {p.insurance_policy_no} · {p.coverage_percentage ?? 100}%
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {p.is_active ? 'Active' : 'Archived'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => { setSelectedPatient(p); setIsPatientFileOpen(true); }}
                              variant="outline"
                              className="h-8 rounded-lg border-slate-200 px-3 text-xs font-medium"
                            >
                              <Eye size={13} className="mr-1.5 text-slate-400" />
                              File
                            </Button>
                            <Button
                              onClick={() => openEditModal(p)}
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
                              aria-label="Edit"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              onClick={() => exportPatientEhrPdf(p)}
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
                              aria-label="Print"
                            >
                              <Printer size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {pagedPatients.map((p: any) => {
                const summary = p.medical_history_summary || {};
                const allergies = Array.isArray(p.allergies) ? p.allergies : [];

                return (
                  <div key={p.id} className="space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{p.full_name || 'Unnamed'}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">{p.patient_uid || '—'}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                          p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {p.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-600">
                      {p.gender || '—'} · {displayAge(p)} · {summary.phone || 'No phone'}
                    </p>

                    {allergies.length > 0 ? (
                      <Badge className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Allergies: {allergies.join(', ')}
                      </Badge>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => { setSelectedPatient(p); setIsPatientFileOpen(true); }}
                        variant="outline"
                        className="h-9 flex-1 rounded-lg border-slate-200 text-xs font-medium"
                      >
                        Open file
                      </Button>
                      <Button
                        onClick={() => openEditModal(p)}
                        variant="outline"
                        className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        onClick={() => exportPatientEhrPdf(p)}
                        variant="outline"
                        className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                      >
                        <Printer size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {filteredPatients.length > 0 ? (
        <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, filteredPatients.length)} of {filteredPatients.length}
          </p>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-500">Rows</Label>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="h-9 w-20 rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {PAGE_SIZES.map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-slate-500">Page {pageIndex + 1} of {pageCount}</p>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-9 w-9 rounded-lg border-slate-200 p-0"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-9 w-9 rounded-lg border-slate-200 p-0"
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-9 w-9 rounded-lg border-slate-200 p-0"
                onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
                disabled={pageIndex >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-9 w-9 rounded-lg border-slate-200 p-0"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-slate-900">Register patient</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">A patient number is created automatically</p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            {renderPatientForm(newPatient, setNewPatient, 'create')}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsRegisterOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => registerPatientMutation.mutate()}
              disabled={registerPatientMutation.isPending}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {registerPatientMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-slate-900">Edit patient</DialogTitle>
            <p className="mt-0.5 font-mono text-sm text-slate-500">{selectedPatient?.patient_uid}</p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            {renderPatientForm(editPatient, setEditPatient, 'edit')}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updatePatientMutation.mutate()}
              disabled={updatePatientMutation.isPending}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {updatePatientMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPatientFileOpen} onOpenChange={setIsPatientFileOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <DialogTitle className="truncate text-base font-semibold text-slate-900">
                  {selectedPatient?.full_name || 'Patient'}
                </DialogTitle>
                <p className="mt-0.5 text-sm text-slate-500">
                  <span className="font-mono">{selectedPatient?.patient_uid || '—'}</span>
                  {' · '}{selectedPatient?.gender || '—'}
                  {' · '}{displayAge(selectedPatient)}
                  {selectedPatient?.blood_group ? ` · ${selectedPatient.blood_group}` : ''}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => { setIsPatientFileOpen(false); openEditModal(selectedPatient); }}
                  variant="outline"
                  className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
                >
                  <Pencil size={13} className="mr-1.5 text-slate-400" />
                  Edit
                </Button>
                <Button
                  onClick={() => exportPatientEhrPdf(selectedPatient)}
                  variant="outline"
                  className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
                >
                  <Printer size={13} className="mr-1.5 text-slate-400" />
                  Print
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            {Array.isArray(selectedPatient?.allergies) && selectedPatient.allergies.length > 0 ? (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Allergies</p>
                  <p className="text-sm font-medium text-red-900">{selectedPatient.allergies.join(', ')}</p>
                </div>
              </div>
            ) : null}

            <div className="mb-6 grid divide-y divide-slate-200 rounded-lg border border-slate-200 sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(n+3)]:border-t lg:grid-cols-4 lg:[&>*:nth-child(n+3)]:border-t-0 sm:divide-x">
              <div className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Phone</p>
                <p className="mt-1 text-sm text-slate-900">
                  {selectedPatient?.medical_history_summary?.phone || 'Not recorded'}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Address</p>
                <p className="mt-1 truncate text-sm text-slate-900">
                  {[selectedPatient?.medical_history_summary?.address, selectedPatient?.medical_history_summary?.district]
                    .filter(Boolean).join(', ') || 'Not recorded'}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Payer</p>
                <p className="mt-1 truncate text-sm text-slate-900">
                  {selectedPatient?.insurance_provider
                    || selectedPatient?.medical_history_summary?.payer_type
                    || 'Self paying'}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Next of kin</p>
                <p className="mt-1 truncate text-sm text-slate-900">
                  {selectedPatient?.medical_history_summary?.emergency_contact?.name || 'Not recorded'}
                </p>
              </div>
            </div>

            {selectedPatient?.medical_history_summary?.chronic_conditions
              || selectedPatient?.medical_history_summary?.current_medications
              || selectedPatient?.medical_history_summary?.notes ? (
              <div className="mb-6 space-y-3 rounded-lg border border-slate-200 px-4 py-4">
                {selectedPatient?.medical_history_summary?.chronic_conditions ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Chronic conditions</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedPatient.medical_history_summary.chronic_conditions}</p>
                  </div>
                ) : null}
                {selectedPatient?.medical_history_summary?.current_medications ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Current medication</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedPatient.medical_history_summary.current_medications}</p>
                  </div>
                ) : null}
                {selectedPatient?.medical_history_summary?.notes ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">History</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{selectedPatient.medical_history_summary.notes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <Tabs defaultValue="encounters" className="space-y-4">
              <TabsList className="grid h-10 w-full grid-cols-3 rounded-lg bg-slate-100 p-1 sm:inline-flex sm:w-auto">
                <TabsTrigger value="encounters" className="rounded-md px-5 text-xs font-medium">
                  Visits ({patientEncounters?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="labs" className="rounded-md px-5 text-xs font-medium">
                  Lab ({patientLabs?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="rounded-md px-5 text-xs font-medium">
                  Medicine ({patientPrescriptions?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="encounters">
                {!patientEncounters?.length ? (
                  <p className="py-12 text-center text-sm text-slate-400">No visits recorded</p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {patientEncounters.map((enc: any) => (
                      <div key={enc.id} className="space-y-1.5 px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">
                            {enc.department_name || 'Consultation'}
                            {enc.encounter_type ? ` · ${enc.encounter_type}` : ''}
                          </p>
                          <span className="shrink-0 text-xs text-slate-400">
                            {new Date(enc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {enc.diagnosis_icd10 ? (
                          <p className="text-sm text-slate-700">Diagnosis: {enc.diagnosis_icd10}</p>
                        ) : null}
                        {enc.symptoms ? (
                          <p className="line-clamp-3 whitespace-pre-line text-sm text-slate-500">{enc.symptoms}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="labs">
                {!patientLabs?.length ? (
                  <p className="py-12 text-center text-sm text-slate-400">No lab tests recorded</p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {patientLabs.map((lab: any) => {
                      const result = Array.isArray(lab.medical_lab_results) ? lab.medical_lab_results[0] : null;
                      return (
                        <div key={lab.id} className="space-y-1.5 px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{lab.test_name}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {new Date(lab.created_at).toLocaleDateString()}
                                {lab.requested_by ? ` · ${lab.requested_by}` : ''}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                                lab.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {lab.status || 'pending'}
                            </Badge>
                          </div>
                          {result ? (
                            <p className={cn(
                              "text-sm",
                              result.is_critical ? "font-medium text-red-700" : "text-slate-700"
                            )}>
                              {result.result_value || 'Result recorded'}
                              {result.interpretation ? ` · ${result.interpretation}` : ''}
                              {result.reference_range ? ` (ref ${result.reference_range})` : ''}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prescriptions">
                {!patientPrescriptions?.length ? (
                  <p className="py-12 text-center text-sm text-slate-400">No medicine recorded</p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {patientPrescriptions.map((rx: any) => (
                      <div key={rx.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {rx.product_variants?.products?.name || rx.product_variants?.name || 'Medication'}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">{rx.dosage_instruction}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Qty {rx.quantity_prescribed} · {new Date(rx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                            rx.status === 'dispensed' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {rx.status || 'pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button
              onClick={() => setIsPatientFileOpen(false)}
              variant="outline"
              className="h-11 w-full rounded-lg border-slate-200 text-sm font-medium sm:w-auto sm:px-6"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}