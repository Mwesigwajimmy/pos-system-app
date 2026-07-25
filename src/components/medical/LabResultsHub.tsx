'use client';

/**
 * --- BBU1 SOVEREIGN LABORATORY & DIAGNOSTIC INTELLIGENCE HUB ---
 * VERSION: v10.6 OMEGA (DIGITAL AIC REQUISITION & DIRECT BILLING WELD)
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { 
  FlaskConical, AlertCircle, CheckCircle2, FileSearch, 
  ShieldAlert, Loader2, Plus, Search, DollarSign, 
  FileText, Printer, ShieldCheck, Activity, User, 
  Stethoscope, Syringe, Eye, Settings, Lock, 
  Building2, CreditCard, Download, RefreshCw, Sparkles, 
  Clock, ClipboardList, Send, FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabResultsHubProps {
  tenantId: string;
}

const supabase = createClient();

const DEFAULT_DEPARTMENTS = [
  'Biochemistry',
  'Immunology',
  'Hematology',
  'Parasitology',
  'Microbiology',
  'Radiology',
  'General Diagnostics'
];

export default function LabResultsHub({ tenantId }: LabResultsHubProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  // --- MODAL STATES ---
  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // --- ACTIVE SELECTION STATES ---
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // --- REQUISITION FORM STATE (DIGITAL AIC LAB FORM) ---
  const [reqForm, setReqForm] = useState({
    patient_id: '',
    lab_number: '',
    requested_by: '',
    referral_facility: '',
    took_vct: false,
    sample_type: 'Blood',
    department_name: 'Biochemistry',
    selected_tests: [] as string[],
    clinical_details: '',
    payment_method: 'Cash',
    is_paid_immediately: false
  });

  // --- RESULT FORM STATE ---
  const [resultForm, setResultForm] = useState({
    order_id: '',
    detected_values: '',
    reference_range: '',
    interpretation: 'Normal', // Normal, Abnormal, Positive, Negative, Critical
    clinician_notes: '',
    medical_recommendation: '',
    verified_by_name: '',
    is_critical: false
  });

  // --- CATALOG NEW TEST FORM STATE ---
  const [newTest, setNewUnitTest] = useState({
    test_code: '',
    test_name: '',
    department_name: 'Biochemistry',
    sample_type: 'Blood',
    selling_price: 0,
    cost_price: 0,
    normal_range: '',
    is_sensitive: false,
    tax_category_code: 'EXEMPT'
  });

  // 1. DATA: Identity Handshake & Currency Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_medical_hub', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id || tenantId;

  // 2. DATA: Pull Patients
  const { data: patients } = useQuery({
    queryKey: ['medical_patients_list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_patients')
        .select('id, full_name, patient_uid, gender, dob, blood_group')
        .order('full_name');
      if (error) throw error;
      return data || [];
    }
  });

  // 3. DATA: Pull Lab Catalog (Test Price List)
  const { data: catalog, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['medical_lab_test_catalog', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_test_catalog')
        .select('*')
        .order('department_name', { ascending: true });
      if (error) return [];
      return data || [];
    }
  });

  // 4. DATA: Pull Lab Orders (Requisitions)
  const { data: labOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['medical_lab_orders_list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_orders')
        .select('*, medical_patients(full_name, patient_uid, gender, dob)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 5. DATA: Pull Completed Lab Results
  const { data: labResults, isLoading: isResultsLoading } = useQuery({
    queryKey: ['medical_lab_results_list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_results')
        .select('*, medical_lab_orders(test_name, sample_type, lab_number, requested_by, referral_facility), medical_patients(full_name, patient_uid)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // MATH: Calculate Requisition Total Amount from Selected Catalog Tests
  const requisitionTotals = useMemo(() => {
    if (!catalog || reqForm.selected_tests.length === 0) return { total: 0, hasSensitive: false };
    const selectedObj = catalog.filter(t => reqForm.selected_tests.includes(t.id));
    const total = selectedObj.reduce((acc, curr) => acc + Number(curr.selling_price || 0), 0);
    const hasSensitive = selectedObj.some(t => t.is_sensitive);
    return { total, hasSensitive };
  }, [catalog, reqForm.selected_tests]);

  // MUTATION 1: Create New Lab Requisition (AIC Uganda Digital Form)
  const createRequisitionMutation = useMutation({
    mutationFn: async () => {
      if (!reqForm.patient_id) throw new Error("Please select a patient.");
      if (reqForm.selected_tests.length === 0) throw new Error("Please select at least one laboratory test.");

      const selectedTestNames = catalog
        ?.filter(t => reqForm.selected_tests.includes(t.id))
        .map(t => t.test_name)
        .join(', ') || 'Custom Diagnostic Panel';

      // Generate Anonymous Client Code for sensitive tests (HIV / VCT / Viral Load)
      let anonCode = null;
      if (requisitionTotals.hasSensitive) {
        const { data: codeData } = await supabase.rpc('fn_generate_anonymous_client_code', {
          p_business_id: activeBusinessId,
          p_prefix: 'AIC-ANON'
        });
        anonCode = codeData || `AIC-ANON-${Date.now().toString().slice(-6)}`;
      }

      const generatedLabNo = reqForm.lab_number || `LAB-${Math.floor(100000 + Math.random() * 900000)}`;

      // Insert Lab Order
      const { data: newOrder, error: orderErr } = await supabase
        .from('medical_lab_orders')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          patient_id: reqForm.patient_id,
          test_name: selectedTestNames,
          sample_type: reqForm.sample_type,
          department_name: reqForm.department_name,
          lab_number: generatedLabNo,
          requested_by: reqForm.requested_by || 'Self / Walk-in',
          referral_facility: reqForm.referral_facility || 'AIC Diagnostic Node',
          took_vct: reqForm.took_vct,
          anonymous_code: anonCode,
          clinical_details: reqForm.clinical_details,
          priority_level: requisitionTotals.hasSensitive ? 'urgent' : 'routine',
          status: 'pending',
          cost: requisitionTotals.total,
          total_amount: requisitionTotals.total,
          net_amount: requisitionTotals.total,
          currency_code: businessCurrency,
          payment_status: reqForm.is_paid_immediately ? 'paid' : 'pending',
          payment_method: reqForm.payment_method
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Direct Payment Handshake if paid immediately
      if (reqForm.is_paid_immediately && newOrder) {
        await supabase.rpc('fn_process_direct_lab_payment_enterprise', {
          p_order_id: newOrder.id,
          p_business_id: activeBusinessId,
          p_tenant_id: tenantId,
          p_total_amount: requisitionTotals.total,
          p_tax_amount: 0,
          p_payment_method: reqForm.payment_method,
          p_currency: businessCurrency
        });
      }
    },
    onSuccess: () => {
      toast.success("Laboratory Requisition Authorized & Saved!");
      setIsNewRequisitionOpen(false);
      setReqForm({
        patient_id: '',
        lab_number: '',
        requested_by: '',
        referral_facility: '',
        took_vct: false,
        sample_type: 'Blood',
        department_name: 'Biochemistry',
        selected_tests: [],
        clinical_details: '',
        payment_method: 'Cash',
        is_paid_immediately: false
      });
      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
    },
    onError: (e: any) => toast.error(`Requisition Failed: ${e.message}`)
  });

  // MUTATION 2: Commit Test Result Findings & Clinical Recommendations
  const commitResultMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("No lab order selected.");

      const isCritical = resultForm.interpretation === 'Critical' || resultForm.interpretation === 'Positive';

      const { error: resultErr } = await supabase
        .from('medical_lab_results')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          order_id: selectedOrder.id,
          patient_id: selectedOrder.patient_id,
          anonymous_code: selectedOrder.anonymous_code,
          detected_values: { findings: resultForm.detected_values },
          result_value: resultForm.detected_values,
          reference_range: resultForm.reference_range,
          interpretation: resultForm.interpretation,
          clinician_notes: resultForm.clinician_notes,
          medical_recommendation: resultForm.medical_recommendation,
          verified_by_name: resultForm.verified_by_name || 'Chief Pathologist',
          is_critical: isCritical,
          status: 'verified'
        }]);

      if (resultErr) throw resultErr;

      // Update order status to completed
      await supabase
        .from('medical_lab_orders')
        .update({ status: 'completed' })
        .eq('id', selectedOrder.id);
    },
    onSuccess: () => {
      toast.success("Diagnostic Results Signed & Committed!");
      setIsResultModalOpen(false);
      setResultForm({
        order_id: '',
        detected_values: '',
        reference_range: '',
        interpretation: 'Normal',
        clinician_notes: '',
        medical_recommendation: '',
        verified_by_name: '',
        is_critical: false
      });
      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['medical_lab_results_list'] });
    },
    onError: (e: any) => toast.error(`Result Entry Error: ${e.message}`)
  });

  // MUTATION 3: Direct Payment Collection at Medical Reception
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("No order selected.");

      const { data, error } = await supabase.rpc('fn_process_direct_lab_payment_enterprise', {
        p_order_id: selectedOrder.id,
        p_business_id: activeBusinessId,
        p_tenant_id: tenantId,
        p_total_amount: Number(selectedOrder.cost || selectedOrder.total_amount),
        p_tax_amount: 0,
        p_payment_method: reqForm.payment_method,
        p_currency: businessCurrency
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Payment Receipt Signed: ${data?.receipt_number || 'OK'}`);
      setIsPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
    },
    onError: (e: any) => toast.error(`Payment Failed: ${e.message}`)
  });

  // MUTATION 4: Add New Test to Dynamic Catalog
  const addCatalogTestMutation = useMutation({
    mutationFn: async () => {
      if (!newTest.test_name.trim() || !newTest.test_code.trim()) throw new Error("Test Code and Test Name are required.");

      const { error } = await supabase
        .from('medical_lab_test_catalog')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          test_code: newTest.test_code.toUpperCase(),
          test_name: newTest.test_name,
          department_name: newTest.department_name,
          sample_type: newTest.sample_type,
          selling_price: Number(newTest.selling_price),
          cost_price: Number(newTest.cost_price),
          currency_code: businessCurrency,
          normal_range: newTest.normal_range,
          is_sensitive: newTest.is_sensitive,
          tax_category_code: newTest.tax_category_code
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test added to Laboratory Catalog!");
      setIsCatalogModalOpen(false);
      setNewUnitTest({
        test_code: '',
        test_name: '',
        department_name: 'Biochemistry',
        sample_type: 'Blood',
        selling_price: 0,
        cost_price: 0,
        normal_range: '',
        is_sensitive: false,
        tax_category_code: 'EXEMPT'
      });
      queryClient.invalidateQueries({ queryKey: ['medical_lab_test_catalog'] });
    },
    onError: (e: any) => toast.error(`Catalog Addition Failed: ${e.message}`)
  });

  // OFFICIAL DIAGNOSTIC LAB REPORT PDF GENERATOR
  const generateOfficialPdfReport = (resultRecord: any) => {
    const doc = new jsPDF();
    const patientName = resultRecord.anonymous_code 
      ? `CONFIDENTIAL [CODE: ${resultRecord.anonymous_code}]` 
      : (resultRecord.medical_patients?.full_name || 'Patient Subject');

    // Header Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || "AIDS INFORMATION CENTRE - UGANDA").toUpperCase(), 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("OFFICIAL LABORATORY DIAGNOSTIC REPORT", 14, 27);
    doc.text(`Date: ${new Date(resultRecord.created_at).toLocaleString()} | Currency: ${businessCurrency}`, 14, 33);
    doc.line(14, 36, 196, 36);

    // Patient & Specimen Info Table
    autoTable(doc, {
      startY: 40,
      head: [['Patient Identity', 'Lab Requisition #', 'Specimen Type', 'Requesting Physician']],
      body: [[
        patientName,
        resultRecord.medical_lab_orders?.lab_number || 'N/A',
        resultRecord.medical_lab_orders?.sample_type || 'Blood',
        resultRecord.medical_lab_orders?.requested_by || 'Self Referral'
      ]],
      headStyles: { fillColor: [15, 23, 42] }
    });

    // Findings Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Diagnostic Test', 'Observed Finding', 'Reference Range', 'Interpretation']],
      body: [[
        resultRecord.medical_lab_orders?.test_name || 'Laboratory Panel',
        resultRecord.result_value || JSON.stringify(resultRecord.detected_values),
        resultRecord.reference_range || 'Standard Bounds',
        resultRecord.interpretation || 'Normal'
      ]],
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Clinical Guidance & Sign-Off
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.text("CLINICAL RECOMMENDATION & PHARMACY GUIDANCE:", 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(resultRecord.medical_recommendation || "No immediate clinical intervention required. Continue routine monitoring.", 14, currentY + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Verified By: ${resultRecord.verified_by_name || 'Chief Medical Pathologist'}`, 14, currentY + 25);
    doc.text("Signature / Seal: _______________________", 120, currentY + 25);

    doc.save(`Lab_Report_${resultRecord.anonymous_code || resultRecord.id.substring(0,8)}.pdf`);
    toast.success("Diagnostic Report Exported!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest">
            <FlaskConical size={16} /> Diagnostic System Engine
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laboratory Intelligence Hub</h1>
          <p className="text-sm font-medium text-slate-500">Facility: {profile?.business_name || 'Central Diagnostic Center'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => setIsCatalogModalOpen(true)} variant="outline" className="h-11 px-5 font-bold rounded-xl border-slate-200">
            <Settings size={16} className="mr-2 text-blue-600" /> Test Price Catalog
          </Button>

          <Button onClick={() => setIsNewRequisitionOpen(true)} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200">
            <Plus size={18} className="mr-2" /> New Lab Requisition
          </Button>
        </div>
      </div>

      {/* 2. SYSTEM TABS & NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 max-w-md w-full shadow-inner">
          <TabsTrigger value="orders" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
            <ClipboardList size={16} className="mr-2 text-blue-600" /> Requisitions ({labOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="results" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
            <FileCheck size={16} className="mr-2 text-emerald-600" /> Results Ledger ({labResults?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REQUISITIONS & ORDERS */}
        <TabsContent value="orders">
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="px-8 py-6 bg-slate-50/50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Active Laboratory Requisitions</CardTitle>
                <CardDescription className="text-xs">Real-time tracking of diagnostic requests, referrals, and payment states</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search patient, lab # or test..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-12">
                      <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Requisition #</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Patient Identity</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Department & Test Panel</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Specimen</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Fee ({businessCurrency})</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500 text-center">Billing State</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500 text-center">Status</TableHead>
                      <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isOrdersLoading ? (
                      <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Fetching Requisitions...</TableCell></TableRow>
                    ) : labOrders?.filter(o => o.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.medical_patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(order => (
                      <TableRow key={order.id} className="h-16 hover:bg-slate-50/50">
                        <TableCell className="pl-8 font-mono font-bold text-xs text-blue-600">
                          {order.lab_number || `LAB-${order.id.substring(0,6)}`}
                          {order.anonymous_code && (
                            <div className="flex items-center gap-1 text-[9px] text-amber-600 font-bold mt-0.5">
                              <Lock size={10} /> {order.anonymous_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 text-sm">
                          {order.anonymous_code ? (
                            <span className="text-amber-700 font-mono">CONFIDENTIAL [ANON CLIENT]</span>
                          ) : (
                            order.medical_patients?.full_name || 'Walk-in Subject'
                          )}
                          <p className="text-[10px] font-normal text-slate-400">Ref: {order.requested_by || 'Self'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-800 text-xs">{order.test_name}</p>
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">{order.department_name || 'General'}</span>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase">{order.sample_type || 'Blood'}</Badge></TableCell>
                        <TableCell className="text-right font-black text-sm tabular-nums">{Number(order.cost || order.total_amount).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("border-none text-[9px] uppercase font-bold px-3 py-1", order.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                            {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("border-none text-[9px] uppercase font-bold px-3 py-1", order.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                            {order.status || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            {order.payment_status !== 'paid' && (
                              <Button onClick={() => { setSelectedOrder(order); setIsPaymentModalOpen(true); }} size="sm" variant="outline" className="h-8 px-3 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                <CreditCard size={12} className="mr-1" /> Pay
                              </Button>
                            )}

                            {order.status !== 'completed' && (
                              <Button onClick={() => { setSelectedOrder(order); setResultForm(prev => ({ ...prev, order_id: order.id })); setIsResultModalOpen(true); }} size="sm" className="h-8 px-3 text-xs font-bold bg-slate-900 text-white rounded-lg">
                                <FlaskConical size={12} className="mr-1" /> Enter Result
                              </Button>
                            )}
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
        </TabsContent>

        {/* TAB 2: VERIFIED RESULTS & REPORTS */}
        <TabsContent value="results">
          <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="px-8 py-6 bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-bold text-slate-900">Signed Diagnostic Results Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-12">
                    <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Patient Subject</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Test Panel</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Observed Findings</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Interpretation</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Verified By</TableHead>
                    <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isResultsLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Loading Signed Results...</TableCell></TableRow>
                  ) : labResults?.map(res => (
                    <TableRow key={res.id} className={res.is_critical ? "bg-rose-50/30" : ""}>
                      <TableCell className="pl-8 font-bold text-slate-900">
                        {res.anonymous_code ? (
                          <span className="text-amber-700 font-mono">ANON CODE: {res.anonymous_code}</span>
                        ) : (
                          res.medical_patients?.full_name || 'Patient Subject'
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 text-xs">{res.medical_lab_orders?.test_name}</TableCell>
                      <TableCell className="font-mono text-xs text-blue-700 font-bold">{res.result_value || JSON.stringify(res.detected_values)}</TableCell>
                      <TableCell>
                        {res.is_critical ? (
                          <Badge className="bg-rose-600 text-white font-bold text-[9px] uppercase"><ShieldAlert size={10} className="mr-1"/> CRITICAL / POSITIVE</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold uppercase">NORMAL RANGE</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-600">{res.verified_by_name || 'Pathologist'}</TableCell>
                      <TableCell className="text-right pr-8">
                        <Button onClick={() => generateOfficialPdfReport(res)} variant="outline" size="sm" className="h-8 px-3 font-bold rounded-lg border-slate-200 text-slate-700">
                          <Printer size={12} className="mr-1 text-blue-600" /> Export PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* MODAL 1: NEW LABORATORY REQUISITION FORM (DIGITAL AIC UGANDA FORM) */}
      {/* ==================================================================== */}
      <Dialog open={isNewRequisitionOpen} onOpenChange={setIsNewRequisitionOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl">AIC</div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-wider">Laboratory Request Form</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs uppercase font-medium">Requisition, Referral & Specimen Selection</DialogDescription>
              </div>
            </div>
          </div>

          <ScrollArea className="max-h-[75vh] p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* PATIENT LOOKUP */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Client / Patient Identity *</Label>
                <Select value={reqForm.patient_id} onValueChange={v => setReqForm({ ...reqForm, patient_id: v })}>
                  <SelectTrigger className="h-12 rounded-2xl font-bold border-slate-200">
                    <SelectValue placeholder="Search or select registered patient" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {patients?.map(p => (
                      <SelectItem key={p.id} value={p.id} className="font-bold py-2.5">
                        {p.full_name} ({p.patient_uid}) • {p.gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* REQUISITION NUMBER & REFERRAL INFO */}
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Lab Requisition No (Red Stamp #)</Label>
                <Input placeholder="e.g. 18393" value={reqForm.lab_number} onChange={e => setReqForm({ ...reqForm, lab_number: e.target.value })} className="h-12 rounded-2xl font-mono font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Requested By (Physician / Doctor)</Label>
                <Input placeholder="e.g. Dr. K. Musoke" value={reqForm.requested_by} onChange={e => setReqForm({ ...reqForm, requested_by: e.target.value })} className="h-12 rounded-2xl font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral Hospital / Facility</Label>
                <Input placeholder="e.g. Mulago Hospital / External Clinic" value={reqForm.referral_facility} onChange={e => setReqForm({ ...reqForm, referral_facility: e.target.value })} className="h-12 rounded-2xl font-bold" />
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl h-12">
                  <Switch id="vct-toggle" checked={reqForm.took_vct} onCheckedChange={c => setReqForm({ ...reqForm, took_vct: c })} />
                  <Label htmlFor="vct-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">Took VCT at AIC Facility</Label>
                </div>
              </div>

              {/* SPECIMEN TYPE */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Specimen Type</Label>
                <Select value={reqForm.sample_type} onValueChange={v => setReqForm({ ...reqForm, sample_type: v })}>
                  <SelectTrigger className="h-12 rounded-2xl font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Blood" className="font-bold">Blood Specimen</SelectItem>
                    <SelectItem value="Sputum" className="font-bold">Sputum Specimen</SelectItem>
                    <SelectItem value="Urine" className="font-bold">Urine Specimen</SelectItem>
                    <SelectItem value="Stool" className="font-bold">Stool Specimen</SelectItem>
                    <SelectItem value="Swab" className="font-bold">Swab / Tissue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SELECT LAB TESTS FROM DYNAMIC CATALOG */}
              <div className="space-y-3 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Diagnostic Panel Tests *</Label>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 max-h-56 overflow-y-auto">
                  {catalog?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 font-bold">No tests configured in catalog yet. Add tests via Test Price Catalog.</p>
                  ) : catalog?.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id={t.id} 
                          checked={reqForm.selected_tests.includes(t.id)} 
                          onCheckedChange={checked => {
                            if (checked) {
                              setReqForm(prev => ({ ...prev, selected_tests: [...prev.selected_tests, t.id] }));
                            } else {
                              setReqForm(prev => ({ ...prev, selected_tests: prev.selected_tests.filter(id => id !== t.id) }));
                            }
                          }}
                        />
                        <label htmlFor={t.id} className="text-xs font-bold text-slate-900 cursor-pointer">
                          {t.test_name} <span className="text-[10px] text-blue-600 font-mono">({t.department_name})</span>
                        </label>
                      </div>
                      <span className="text-xs font-black text-slate-900">{businessCurrency} {Number(t.selling_price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SENSITIVE TEST ANONYMOUS WARNING */}
              {requisitionTotals.hasSensitive && (
                <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <Lock size={20} className="text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-800">
                    Sensitive test detected (HIV/VCT/DNA). An encrypted <span className="underline font-mono">Anonymous Client ID</span> will be generated for confidential results.
                  </p>
                </div>
              )}

              {/* BRIEF CLINICAL DETAILS */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Brief Clinical Details</Label>
                <Textarea placeholder="Symptoms, medical history, or clinical observations..." value={reqForm.clinical_details} onChange={e => setReqForm({ ...reqForm, clinical_details: e.target.value })} className="rounded-2xl border-slate-200 font-bold" />
              </div>

              {/* DIRECT BILLING SETUP */}
              <div className="space-y-2 md:col-span-2 bg-slate-900 p-6 rounded-2xl text-white space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Diagnostic Fee</span>
                  <span className="text-2xl font-black text-blue-400">{businessCurrency} {requisitionTotals.total.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center space-x-3">
                    <Switch id="pay-now" checked={reqForm.is_paid_immediately} onCheckedChange={c => setReqForm({ ...reqForm, is_paid_immediately: c })} />
                    <Label htmlFor="pay-now" className="text-xs font-bold text-white cursor-pointer">Collect Payment Now</Label>
                  </div>
                  {reqForm.is_paid_immediately && (
                    <Select value={reqForm.payment_method} onValueChange={v => setReqForm({ ...reqForm, payment_method: v })}>
                      <SelectTrigger className="h-10 rounded-xl bg-slate-800 border-none text-white font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash Inflow</SelectItem>
                        <SelectItem value="MTN MoMo">MTN Mobile Money</SelectItem>
                        <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsNewRequisitionOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => createRequisitionMutation.mutate()} disabled={createRequisitionMutation.isPending} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {createRequisitionMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Authorize Requisition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: RESULT ENTRY & CLINICAL RECOMMENDATIONS */}
      {/* ==================================================================== */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Sign Diagnostic Results</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">
              {selectedOrder?.test_name} • {selectedOrder?.anonymous_code || 'Patient Subject'}
            </DialogDescription>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Observed Findings / Values *</Label>
              <Input placeholder="e.g. 450 cells/uL or Positive" value={resultForm.detected_values} onChange={e => setResultForm({ ...resultForm, detected_values: e.target.value })} className="h-12 border-slate-200 rounded-xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Reference Normal Range</Label>
              <Input placeholder="e.g. 500 - 1500 cells/uL" value={resultForm.reference_range} onChange={e => setResultForm({ ...resultForm, reference_range: e.target.value })} className="h-12 border-slate-200 rounded-xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Diagnostic Interpretation</Label>
              <Select value={resultForm.interpretation} onValueChange={v => setResultForm({ ...resultForm, interpretation: v })}>
                <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal" className="font-bold text-emerald-600">Normal Bounds</SelectItem>
                  <SelectItem value="Abnormal" className="font-bold text-amber-600">Abnormal Finding</SelectItem>
                  <SelectItem value="Positive" className="font-bold text-rose-600">Positive Result</SelectItem>
                  <SelectItem value="Negative" className="font-bold text-emerald-600">Negative Result</SelectItem>
                  <SelectItem value="Critical" className="font-bold text-rose-700">Critical / Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Medical Recommendation (Pharmacy Link)</Label>
              <Textarea placeholder="Prescription advice or follow-up protocol..." value={resultForm.medical_recommendation} onChange={e => setResultForm({ ...resultForm, medical_recommendation: e.target.value })} className="rounded-xl border-slate-200 font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Verifying Technician Name</Label>
              <Input placeholder="e.g. Lab Tech J. Okello" value={resultForm.verified_by_name} onChange={e => setResultForm({ ...resultForm, verified_by_name: e.target.value })} className="h-12 border-slate-200 rounded-xl font-bold" />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsResultModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => commitResultMutation.mutate()} disabled={commitResultMutation.isPending} className="h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {commitResultMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Sign & Verification Stamp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3: DIRECT MEDICAL BILLING (CASH / MOMO RECEIPT) */}
      {/* ==================================================================== */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-sm rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Collect Diagnostic Fee</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">{selectedOrder?.test_name}</DialogDescription>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="text-center py-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance Due</p>
              <h3 className="text-3xl font-black text-blue-600">{businessCurrency} {Number(selectedOrder?.cost || selectedOrder?.total_amount).toLocaleString()}</h3>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Select Payment Channel</Label>
              <Select value={reqForm.payment_method} onValueChange={v => setReqForm({ ...reqForm, payment_method: v })}>
                <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash" className="font-bold">Cash Payment</SelectItem>
                  <SelectItem value="MTN MoMo" className="font-bold text-amber-600">MTN Mobile Money</SelectItem>
                  <SelectItem value="Airtel Money" className="font-bold text-rose-600">Airtel Money</SelectItem>
                  <SelectItem value="Bank" className="font-bold">Bank Transfer</SelectItem>
                  <SelectItem value="Insurance" className="font-bold">Insurance Claim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => processPaymentMutation.mutate()} disabled={processPaymentMutation.isPending} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {processPaymentMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Post Payment & Sign Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4: CUSTOM TEST CATALOG & PRICE LIST MANAGER */}
      {/* ==================================================================== */}
      <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Configure Lab Test Catalog</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">Add custom tests, prices & normal ranges</DialogDescription>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Test Code *</Label>
                <Input placeholder="e.g. LAB-CD4" value={newTest.test_code} onChange={e => setNewUnitTest({ ...newTest, test_code: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Department *</Label>
                <Select value={newTest.department_name} onValueChange={v => setNewUnitTest({ ...newTest, department_name: v })}>
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Full Test Designation Name *</Label>
              <Input placeholder="e.g. Absolute CD4 Count" value={newTest.test_name} onChange={e => setNewUnitTest({ ...newTest, test_name: e.target.value })} className="h-11 rounded-xl font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Selling Price ({businessCurrency})</Label>
                <Input type="number" value={newTest.selling_price} onChange={e => setNewUnitTest({ ...newTest, selling_price: Number(e.target.value) })} className="h-11 rounded-xl font-bold text-blue-600" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Sample Type</Label>
                <Input placeholder="e.g. Blood / Urine" value={newTest.sample_type} onChange={e => setNewUnitTest({ ...newTest, sample_type: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Normal Range Reference</Label>
              <Input placeholder="e.g. 500 - 1500 cells/uL or Negative" value={newTest.normal_range} onChange={e => setNewUnitTest({ ...newTest, normal_range: e.target.value })} className="h-11 rounded-xl font-bold" />
            </div>

            <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <Switch id="sensitive-toggle" checked={newTest.is_sensitive} onCheckedChange={c => setNewUnitTest({ ...newTest, is_sensitive: c })} />
              <Label htmlFor="sensitive-toggle" className="text-xs font-bold text-amber-800 cursor-pointer">
                Sensitive Test (Requires Anonymous Code Security for HIV/VCT/DNA)
              </Label>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsCatalogModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => addCatalogTestMutation.mutate()} disabled={addCatalogTestMutation.isPending} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {addCatalogTestMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Save to Catalog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}