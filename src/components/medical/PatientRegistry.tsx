'use client';

/**
 * --- BBU1 SOVEREIGN PATIENT 360 REGISTRY & EHR HUB ---
 * VERSION: v10.0 OMEGA (DEEP PATIENT FILE & DIAGNOSTIC LEDGER)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Health System
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { 
  Users, Search, UserPlus, ShieldCheck, 
  Droplets, Activity, Calendar, MoreVertical, Loader2,
  Eye, Edit3, FileText, Phone, MapPin, AlertCircle,
  ShieldAlert, Pill, FlaskConical, CheckCircle2,
  HeartPulse, Thermometer, Download, Building2, CreditCard,
  Plus, X, Lock, Printer, ClipboardList, Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientRegistryProps {
  tenantId: string;
}

const supabase = createClient();

export default function PatientRegistry({ tenantId }: PatientRegistryProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATES ---
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isPatientFileOpen, setIsPatientFileOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- ACTIVE SELECTED PATIENT ---
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // --- NEW PATIENT FORM STATE ---
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    gender: 'Male',
    dob: '',
    phone: '',
    address: '',
    national_id: '',
    blood_group: 'O+',
    allergies: '',
    medical_history: '',
    insurance_provider: '',
    insurance_policy_no: '',
    coverage_percentage: 100,
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_patient_registry', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id || tenantId;

  // 2. DATA: Pull Patient Ledger
  const { data: patients, isLoading } = useQuery({
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
    enabled: !!tenantId
  });

  // 3. DATA: Pull Selected Patient Encounters (For 360 File)
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
    }
  });

  // 4. DATA: Pull Selected Patient Lab Orders & Results (For 360 File)
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
    }
  });

  // 5. DATA: Pull Selected Patient Prescriptions (For 360 File)
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
    }
  });

  // FILTERED PATIENT LIST
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter(p => 
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.insurance_provider?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  // MUTATION: Register New Patient
  const registerPatientMutation = useMutation({
    mutationFn: async () => {
      if (!newPatient.full_name.trim()) throw new Error("Patient Full Name is required.");

      const generatedUid = `PAT-UG-${toYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Split allergies array
      const allergyArray = newPatient.allergies
        ? newPatient.allergies.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      // 1. Create Patient Record
      const { data: patient, error } = await supabase
        .from('medical_patients')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          full_name: newPatient.full_name,
          patient_uid: generatedUid,
          dob: newPatient.dob || null,
          gender: newPatient.gender,
          blood_group: newPatient.blood_group,
          allergies: allergyArray,
          insurance_provider: newPatient.insurance_provider || null,
          insurance_policy_no: newPatient.insurance_policy_no || null,
          coverage_percentage: Number(newPatient.coverage_percentage) || 100,
          medical_history_summary: {
            notes: newPatient.medical_history,
            phone: newPatient.phone,
            address: newPatient.address,
            national_id: newPatient.national_id,
            emergency_contact: {
              name: newPatient.emergency_contact_name,
              phone: newPatient.emergency_contact_phone
            }
          },
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return patient;
    },
    onSuccess: (patient) => {
      toast.success(`Patient Registered: ${patient?.full_name} (${patient?.patient_uid})`);
      setIsRegisterOpen(false);
      setNewPatient({
        full_name: '',
        gender: 'Male',
        dob: '',
        phone: '',
        address: '',
        national_id: '',
        blood_group: 'O+',
        allergies: '',
        medical_history: '',
        insurance_provider: '',
        insurance_policy_no: '',
        coverage_percentage: 100,
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
      queryClient.invalidateQueries({ queryKey: ['medical_patients'] });
    },
    onError: (e: any) => toast.error(`Registration Failed: ${e.message}`)
  });

  // EXPORT PATIENT 360 MEDICAL SUMMARY PDF
  const exportPatientEhrPdf = (patient: any) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || "BBU1 MEDICAL CENTER").toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("OFFICIAL PATIENT ELECTRONIC HEALTH RECORD (EHR)", 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()} | Currency: ${businessCurrency}`, 14, 33);
    doc.line(14, 36, 196, 36);

    // Patient Profile Table
    autoTable(doc, {
      startY: 40,
      head: [['Patient Identifier', 'Full Name', 'Gender / DOB', 'Blood Group']],
      body: [[
        patient.patient_uid || 'N/A',
        patient.full_name,
        `${patient.gender || 'N/A'} (DOB: ${patient.dob || 'N/A'})`,
        `Group ${patient.blood_group || 'N/A'}`
      ]],
      headStyles: { fillColor: [15, 23, 42] }
    });

    // Medical Alerts & Insurance
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Known Allergies', 'Insurance Provider', 'Policy Number', 'Coverage']],
      body: [[
        patient.allergies?.join(', ') || 'No Known Allergies (NKA)',
        patient.insurance_provider || 'Private Cash Pay',
        patient.insurance_policy_no || 'N/A',
        `${patient.coverage_percentage || 100}%`
      ]],
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Patient_EHR_${patient.patient_uid || 'RECORD'}.pdf`);
    toast.success("Patient EHR Record Exported!");
  };

  function toYear() {
    return new Date().getFullYear();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* MAIN CARD CONTAINER */}
      <Card className="border border-slate-200 shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
        
        {/* HEADER & SEARCH BAR */}
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 p-8 bg-slate-50/30">
          <div>
            <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-900">
              <Users className="text-blue-600" size={28} /> PATIENT 360 REGISTRY
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
              Electronic Health Records (EHR), Insurance, Allergies & Patient History
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search Name, UID or Insurance..." 
                className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-bold text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button onClick={() => setIsRegisterOpen(true)} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200">
              <UserPlus size={18} className="mr-2" /> Register Patient
            </Button>
          </div>
        </CardHeader>

        {/* PATIENT LEDGER TABLE */}
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-14">
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500 pl-8">Identity & UID</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Bio Data & Blood</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Allergy Warnings</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Insurance Protocol</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500 text-center">Status</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-slate-500 pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="animate-spin inline-block mr-2 text-blue-600" /> Syncing Patient Ledger...</TableCell></TableRow>
                ) : filteredPatients?.map(p => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors group h-20">
                    
                    {/* IDENTITY & UID */}
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-lg shadow-sm">
                          {p.full_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{p.full_name}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">UID: {p.patient_uid || 'TEMP-ID'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* BIO DATA */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <Activity size={12} className="text-blue-500" /> {p.gender} • {p.dob || 'DOB N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-rose-600">
                          <Droplets size={12} className="text-rose-500" /> GROUP {p.blood_group || 'N/A'}
                        </div>
                      </div>
                    </TableCell>

                    {/* ALLERGY WARNINGS */}
                    <TableCell>
                      {p.allergies && p.allergies.length > 0 ? (
                        <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded-xl max-w-xs">
                          <ShieldAlert size={14} className="text-rose-600 shrink-0 animate-pulse" />
                          <span className="text-[10px] font-bold text-rose-800 truncate">{p.allergies.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">No Known Allergies</span>
                      )}
                    </TableCell>

                    {/* INSURANCE */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{p.insurance_provider || 'Private Cash Pay'}</span>
                        <span className="text-[10px] text-slate-400 font-mono italic">{p.insurance_policy_no || 'NO POLICY'}</span>
                      </div>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell className="text-center">
                      <Badge className={cn("border-none text-[9px] font-bold uppercase px-3 py-1", p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                        {p.is_active ? 'ACTIVE FILE' : 'ARCHIVED'}
                      </Badge>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => { setSelectedPatient(p); setIsPatientFileOpen(true); }}
                          variant="outline" size="sm" 
                          className="h-9 px-3 font-bold text-xs text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
                        >
                          <Eye size={14} className="mr-1.5" /> 360 File
                        </Button>

                        <Button 
                          onClick={() => exportPatientEhrPdf(p)} 
                          variant="ghost" size="icon" 
                          className="h-9 w-9 text-slate-400 hover:text-slate-900 rounded-xl"
                        >
                          <Printer size={16} />
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* MODAL 1: REGISTER NEW PATIENT FORM */}
      {/* ==================================================================== */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider flex items-center gap-3">
                <UserPlus className="text-blue-500" /> Patient Registration Master
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">Create electronic health file & insurance mapping</DialogDescription>
            </div>
          </div>

          <ScrollArea className="max-h-[75vh] p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Full Patient Name *</Label>
                <Input placeholder="e.g. Mukasa David" value={newPatient.full_name} onChange={e => setNewPatient({ ...newPatient, full_name: e.target.value })} className="h-12 rounded-2xl font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Gender *</Label>
                <Select value={newPatient.gender} onValueChange={v => setNewPatient({ ...newPatient, gender: v })}>
                  <SelectTrigger className="h-12 rounded-2xl font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male" className="font-bold">Male</SelectItem>
                    <SelectItem value="Female" className="font-bold">Female</SelectItem>
                    <SelectItem value="Other" className="font-bold">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Date of Birth (DOB)</Label>
                <Input type="date" value={newPatient.dob} onChange={e => setNewPatient({ ...newPatient, dob: e.target.value })} className="h-12 rounded-2xl font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Blood Group</Label>
                <Select value={newPatient.blood_group} onValueChange={v => setNewPatient({ ...newPatient, blood_group: v })}>
                  <SelectTrigger className="h-12 rounded-2xl font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                      <SelectItem key={b} value={b} className="font-bold">Group {b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Phone Number</Label>
                <Input placeholder="e.g. +256 700 000000" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} className="h-12 rounded-2xl font-bold" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-rose-500 uppercase ml-1">Known Allergies (Comma Separated)</Label>
                <Input placeholder="e.g. Penicillin, Sulphur, Nuts, Latex" value={newPatient.allergies} onChange={e => setNewPatient({ ...newPatient, allergies: e.target.value })} className="h-12 rounded-2xl font-bold border-rose-200 bg-rose-50/20 text-rose-900" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Insurance Provider & Policy No</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="e.g. Prudential / UAP / Jubilee" value={newPatient.insurance_provider} onChange={e => setNewPatient({ ...newPatient, insurance_provider: e.target.value })} className="h-12 rounded-2xl font-bold" />
                  <Input placeholder="Policy #" value={newPatient.insurance_policy_no} onChange={e => setNewPatient({ ...newPatient, insurance_policy_no: e.target.value })} className="h-12 rounded-2xl font-mono font-bold" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase ml-1">Emergency Contact Person & Phone</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Contact Name" value={newPatient.emergency_contact_name} onChange={e => setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })} className="h-12 rounded-2xl font-bold" />
                  <Input placeholder="Contact Phone" value={newPatient.emergency_contact_phone} onChange={e => setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })} className="h-12 rounded-2xl font-bold" />
                </div>
              </div>

            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsRegisterOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => registerPatientMutation.mutate()} disabled={registerPatientMutation.isPending} className="h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {registerPatientMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Authorize Patient File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: DEEP PATIENT 360 FILE DRAWER */}
      {/* ==================================================================== */}
      <Dialog open={isPatientFileOpen} onOpenChange={setIsPatientFileOpen}>
        <DialogContent className="max-w-4xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl text-white">
                {selectedPatient?.full_name?.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase">{selectedPatient?.full_name}</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs font-mono font-bold mt-1">
                  UID: {selectedPatient?.patient_uid} • {selectedPatient?.gender} • Group {selectedPatient?.blood_group}
                </DialogDescription>
              </div>
            </div>

            <Button onClick={() => exportPatientEhrPdf(selectedPatient)} variant="outline" className="bg-transparent border-slate-700 text-white hover:bg-slate-800 font-bold text-xs">
              <Printer size={16} className="mr-2" /> Export EHR PDF
            </Button>
          </div>

          <ScrollArea className="max-h-[75vh] p-8 bg-white">
            <Tabs defaultValue="labs" className="space-y-6">
              <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 w-full justify-start">
                <TabsTrigger value="labs" className="rounded-xl font-bold text-xs uppercase px-6"><FlaskConical size={14} className="mr-2"/> Lab History ({patientLabs?.length || 0})</TabsTrigger>
                <TabsTrigger value="encounters" className="rounded-xl font-bold text-xs uppercase px-6"><Stethoscope size={14} className="mr-2"/> Encounters ({patientEncounters?.length || 0})</TabsTrigger>
                <TabsTrigger value="prescriptions" className="rounded-xl font-bold text-xs uppercase px-6"><Pill size={14} className="mr-2"/> Pharmacy ({patientPrescriptions?.length || 0})</TabsTrigger>
              </TabsList>

              {/* TAB 1: LAB HISTORY */}
              <TabsContent value="labs">
                <div className="space-y-3">
                  {patientLabs?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8 font-bold">No lab diagnostic orders found for this patient.</p>
                  ) : patientLabs?.map(lab => (
                    <div key={lab.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{lab.test_name}</p>
                        <p className="text-[10px] text-slate-400">Date: {new Date(lab.created_at).toLocaleDateString()} • Ref: {lab.requested_by || 'Self'}</p>
                      </div>
                      <Badge className={cn("border-none text-[9px] font-bold uppercase", lab.status === 'completed' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                        {lab.status || 'PENDING'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 2: ENCOUNTERS */}
              <TabsContent value="encounters">
                <div className="space-y-3">
                  {patientEncounters?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8 font-bold">No historical consultation encounters logged.</p>
                  ) : patientEncounters?.map(enc => (
                    <div key={enc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-xs text-blue-600">{enc.department_name} • {enc.encounter_type}</p>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(enc.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-700">Diagnosis: <strong className="text-slate-900">{enc.diagnosis_icd10 || 'N/A'}</strong></p>
                      <p className="text-xs font-medium text-slate-600">Symptoms: {enc.symptoms}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 3: PRESCRIPTIONS */}
              <TabsContent value="prescriptions">
                <div className="space-y-3">
                  {patientPrescriptions?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8 font-bold">No prescription records logged.</p>
                  ) : patientPrescriptions?.map(rx => (
                    <div key={rx.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{rx.product_variants?.products?.name || 'Medication'}</p>
                        <p className="text-[10px] font-medium text-emerald-700">Instructions: {rx.dosage_instruction} (Qty: {rx.quantity_prescribed})</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-none text-[9px] font-bold uppercase">{rx.status || 'PENDING'}</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button onClick={() => setIsPatientFileOpen(false)} className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl uppercase text-xs">
              Close Patient 360 File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}