'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Loader2, Plus, Search, Printer, Lock, Settings, CreditCard, FlaskConical
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

const SAMPLE_TYPES = ['Blood', 'Sputum', 'Urine', 'Stool', 'Swab', 'Tissue'];

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank', 'Insurance'];

const INTERPRETATIONS = ['Normal', 'Abnormal', 'Positive', 'Negative', 'Critical'];

const TAX_CATEGORIES = ['EXEMPT', 'STANDARD', 'ZERO_RATED'];

const readFindings = (record: any) => {
  if (record?.result_value) return String(record.result_value);
  const detected = record?.detected_values;
  if (!detected) return '—';
  if (typeof detected === 'string') return detected;
  if (typeof detected === 'object' && detected.findings) return String(detected.findings);
  return '—';
};

const interpretationTone = (interpretation?: string) => {
  if (interpretation === 'Critical' || interpretation === 'Positive') return "bg-red-100 text-red-700";
  if (interpretation === 'Abnormal') return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
};

export default function LabResultsHub({ tenantId }: LabResultsHubProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [collectionMethod, setCollectionMethod] = useState('Cash');
  const [catalogSearch, setCatalogSearch] = useState('');

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

  const [resultForm, setResultForm] = useState({
    order_id: '',
    detected_values: '',
    reference_range: '',
    interpretation: 'Normal',
    clinician_notes: '',
    medical_recommendation: '',
    verified_by_name: '',
    is_critical: false
  });

  const [newTest, setNewTest] = useState({
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

  const { data: profile } = useQuery({
    queryKey: ['active_profile_medical_hub', tenantId],
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

  const { data: catalog } = useQuery({
    queryKey: ['medical_lab_test_catalog', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_test_catalog')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('department_name', { ascending: true });
      if (error) return [];
      return data || [];
    }
  });

  const { data: labOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['medical_lab_orders_list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_orders')
        .select('*, medical_patients(full_name, patient_uid, gender, dob)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: labResults, isLoading: isResultsLoading } = useQuery({
    queryKey: ['medical_lab_results_list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_results')
        .select('*, medical_lab_orders(test_name, sample_type, lab_number, requested_by, referral_facility), medical_patients(full_name, patient_uid)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const stats = useMemo(() => {
    const orders = labOrders || [];
    return {
      pending: orders.filter(o => o.status !== 'completed').length,
      unpaid: orders.filter(o => o.payment_status !== 'paid').length,
      owing: orders
        .filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + Number(o.cost || o.total_amount || 0), 0),
      completed: orders.filter(o => o.status === 'completed').length,
    };
  }, [labOrders]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = labOrders || [];
    if (!term) return list;
    return list.filter(o =>
      (o.test_name || '').toLowerCase().includes(term) ||
      (o.lab_number || '').toLowerCase().includes(term) ||
      (o.medical_patients?.full_name || '').toLowerCase().includes(term) ||
      (o.anonymous_code || '').toLowerCase().includes(term)
    );
  }, [labOrders, searchTerm]);

  const filteredResults = useMemo(() => {
    const term = resultSearch.trim().toLowerCase();
    const list = labResults || [];
    if (!term) return list;
    return list.filter(r =>
      (r.medical_lab_orders?.test_name || '').toLowerCase().includes(term) ||
      (r.medical_patients?.full_name || '').toLowerCase().includes(term) ||
      (r.anonymous_code || '').toLowerCase().includes(term)
    );
  }, [labResults, resultSearch]);

  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    const list = catalog || [];
    if (!term) return list;
    return list.filter(t =>
      (t.test_name || '').toLowerCase().includes(term) ||
      (t.department_name || '').toLowerCase().includes(term)
    );
  }, [catalog, catalogSearch]);

  const requisitionTotals = useMemo(() => {
    if (!catalog || reqForm.selected_tests.length === 0) return { total: 0, hasSensitive: false };
    const selectedObj = catalog.filter(t => reqForm.selected_tests.includes(t.id));
    const total = selectedObj.reduce((acc, curr) => acc + Number(curr.selling_price || 0), 0);
    const hasSensitive = selectedObj.some(t => t.is_sensitive);
    return { total, hasSensitive };
  }, [catalog, reqForm.selected_tests]);

  const resetRequisition = () => setReqForm({
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

  const createRequisitionMutation = useMutation({
    mutationFn: async () => {
      if (!reqForm.patient_id) throw new Error("Select a patient.");
      if (reqForm.selected_tests.length === 0) throw new Error("Select at least one test.");

      const selectedTestNames = catalog
        ?.filter(t => reqForm.selected_tests.includes(t.id))
        .map(t => t.test_name)
        .join(', ') || 'Diagnostic panel';

      let anonCode = null;
      if (requisitionTotals.hasSensitive) {
        const { data: codeData } = await supabase.rpc('fn_generate_anonymous_client_code', {
          p_business_id: activeBusinessId,
          p_prefix: 'AIC-ANON'
        });
        anonCode = codeData || `AIC-ANON-${Date.now().toString().slice(-6)}`;
      }

      const generatedLabNo = reqForm.lab_number || `LAB-${Math.floor(100000 + Math.random() * 900000)}`;

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
          referral_facility: reqForm.referral_facility || null,
          took_vct: reqForm.took_vct,
          anonymous_code: anonCode,
          clinical_details: reqForm.clinical_details,
          priority_level: requisitionTotals.hasSensitive ? 'urgent' : 'routine',
          status: 'pending',
          cost: requisitionTotals.total,
          total_amount: requisitionTotals.total,
          net_amount: requisitionTotals.total,
          currency_code: businessCurrency,
          payment_status: 'pending',
          payment_method: reqForm.payment_method
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      if (reqForm.is_paid_immediately && newOrder) {
        const { error: payErr } = await supabase.rpc('fn_process_direct_lab_payment_enterprise', {
          p_order_id: newOrder.id,
          p_business_id: activeBusinessId,
          p_tenant_id: tenantId,
          p_total_amount: requisitionTotals.total,
          p_tax_amount: 0,
          p_payment_method: reqForm.payment_method,
          p_currency: businessCurrency
        });

        if (payErr) {
          return { paymentFailed: true, message: payErr.message };
        }
      }

      return { paymentFailed: false };
    },
    onSuccess: (result) => {
      if (result?.paymentFailed) {
        toast.error(
          `Requisition saved but the payment did not go through: ${result.message}. Collect the fee from the requisition list.`,
          { duration: 12000 }
        );
      } else {
        toast.success("Requisition saved");
      }
      setIsNewRequisitionOpen(false);
      resetRequisition();
      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const commitResultMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("No order selected.");
      if (!resultForm.detected_values.trim()) throw new Error("Enter the finding.");
      if (!resultForm.verified_by_name.trim()) throw new Error("Enter who verified this result.");

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
          verified_by_name: resultForm.verified_by_name,
          is_critical: isCritical,
          status: 'verified'
        }]);

      if (resultErr) throw resultErr;

      const { error: statusErr } = await supabase
        .from('medical_lab_orders')
        .update({ status: 'completed' })
        .eq('id', selectedOrder.id);

      if (statusErr) {
        return { statusFailed: true };
      }
      return { statusFailed: false };
    },
    onSuccess: (result) => {
      if (result?.statusFailed) {
        toast.error("Result saved, but the requisition is still showing as pending. Refresh and check.", { duration: 10000 });
      } else {
        toast.success("Result saved");
      }
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
    onError: (e: any) => toast.error(e.message)
  });

  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("No order selected.");

      const { data, error } = await supabase.rpc('fn_process_direct_lab_payment_enterprise', {
        p_order_id: selectedOrder.id,
        p_business_id: activeBusinessId,
        p_tenant_id: tenantId,
        p_total_amount: Number(selectedOrder.cost || selectedOrder.total_amount),
        p_tax_amount: 0,
        p_payment_method: collectionMethod,
        p_currency: businessCurrency
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.receipt_number ? `Payment recorded · ${data.receipt_number}` : "Payment recorded");
      setIsPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['medical_lab_orders_list'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const addCatalogTestMutation = useMutation({
    mutationFn: async () => {
      if (!newTest.test_name.trim() || !newTest.test_code.trim()) throw new Error("Enter a test code and name.");

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
      toast.success("Test added");
      setNewTest({
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
    onError: (e: any) => toast.error(e.message)
  });

  const generateOfficialPdfReport = (resultRecord: any) => {
    const doc = new jsPDF();
    const patientName = resultRecord.anonymous_code
      ? `Confidential · ${resultRecord.anonymous_code}`
      : (resultRecord.medical_patients?.full_name || 'Patient');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.business_name || 'Laboratory report', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Laboratory report', 14, 27);
    doc.text(`Date: ${new Date(resultRecord.created_at).toLocaleString()}`, 14, 33);
    doc.line(14, 37, 196, 37);

    autoTable(doc, {
      startY: 42,
      head: [['Patient', 'Requisition', 'Specimen', 'Requested by']],
      body: [[
        patientName,
        resultRecord.medical_lab_orders?.lab_number || '—',
        resultRecord.medical_lab_orders?.sample_type || '—',
        resultRecord.medical_lab_orders?.requested_by || '—'
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 60) + 8,
      head: [['Test', 'Finding', 'Reference range', 'Interpretation']],
      body: [[
        resultRecord.medical_lab_orders?.test_name || '—',
        readFindings(resultRecord),
        resultRecord.reference_range || '—',
        resultRecord.interpretation || '—'
      ]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    let y = ((doc as any).lastAutoTable?.finalY || 100) + 12;

    if (resultRecord.medical_recommendation) {
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendation', 14, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(resultRecord.medical_recommendation), 180);
      doc.text(lines, 14, y + 6);
      y = y + 6 + (lines.length * 5);
    }

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(`Verified by: ${resultRecord.verified_by_name || '—'}`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature: _______________________', 120, y);

    const reference = typeof resultRecord.id === 'string' ? resultRecord.id.substring(0, 8) : 'report';
    doc.save(`Lab_Report_${resultRecord.anonymous_code || reference}.pdf`);
  };

  const money = (value: any) => `${businessCurrency} ${Number(value || 0).toLocaleString()}`;

  const OrderActions = ({ order }: { order: any }) => (
    <div className="flex items-center gap-2">
      {order.payment_status !== 'paid' ? (
        <Button
          onClick={() => { setSelectedOrder(order); setCollectionMethod('Cash'); setIsPaymentModalOpen(true); }}
          variant="outline"
          className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
        >
          <CreditCard size={13} className="mr-1.5 text-slate-400" />
          Collect
        </Button>
      ) : null}
      {order.status !== 'completed' ? (
        <Button
          onClick={() => { setSelectedOrder(order); setResultForm(prev => ({ ...prev, order_id: order.id })); setIsResultModalOpen(true); }}
          className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
        >
          Enter result
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-16 pt-6 sm:space-y-6 xl:px-8">

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Laboratory</h1>
          <p className="mt-1 text-sm text-slate-500">{profile?.business_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsCatalogModalOpen(true)}
            variant="outline"
            className="h-10 rounded-lg border-slate-200 px-4 text-sm font-medium"
          >
            <Settings size={15} className="mr-2 text-slate-400" />
            Test catalog
          </Button>
          <Button
            onClick={() => setIsNewRequisitionOpen(true)}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus size={15} className="mr-2" />
            New requisition
          </Button>
        </div>
      </div>

      <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Awaiting results</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{stats.pending}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Unpaid</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{stats.unpaid}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{money(stats.owing)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Completed</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{stats.completed}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg bg-slate-100 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="orders" className="rounded-md px-6 text-xs font-medium">
            Requisitions ({labOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-md px-6 text-xs font-medium">
            Results ({labResults?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-200 px-5 py-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search patient, lab number or test"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 pl-9 text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isOrdersLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <p className="py-20 text-center text-sm text-slate-400">No requisitions</p>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 lg:hidden">
                    {filteredOrders.map(order => (
                      <div key={order.id} className="space-y-3 px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-slate-500">
                              {order.lab_number || `LAB-${String(order.id).substring(0, 6)}`}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                              {order.anonymous_code
                                ? <span className="font-mono">Confidential</span>
                                : (order.medical_patients?.full_name || 'Walk-in')}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-slate-500">{order.test_name}</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                            {Number(order.cost || order.total_amount || 0).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            order.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                          )}>
                            {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
                          <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                            {order.status || 'pending'}
                          </Badge>
                          {order.anonymous_code ? (
                            <Badge variant="secondary" className="gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              <Lock size={10} />
                              {order.anonymous_code}
                            </Badge>
                          ) : null}
                        </div>

                        <OrderActions order={order} />
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                          <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Requisition</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Patient</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tests</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Specimen</TableHead>
                          <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fee</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Payment</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</TableHead>
                          <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map(order => (
                          <TableRow key={order.id} className="border-b border-slate-100 last:border-0">
                            <TableCell className="px-5 py-3.5">
                              <p className="font-mono text-xs text-slate-600">
                                {order.lab_number || `LAB-${String(order.id).substring(0, 6)}`}
                              </p>
                              {order.anonymous_code ? (
                                <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-slate-400">
                                  <Lock size={10} />
                                  {order.anonymous_code}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="py-3.5">
                              <p className="text-sm text-slate-900">
                                {order.anonymous_code ? 'Confidential' : (order.medical_patients?.full_name || 'Walk-in')}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">{order.requested_by || 'Self'}</p>
                            </TableCell>
                            <TableCell className="max-w-[240px] py-3.5">
                              <p className="truncate text-sm text-slate-600">{order.test_name}</p>
                              <p className="mt-0.5 text-xs text-slate-400">{order.department_name || 'General'}</p>
                            </TableCell>
                            <TableCell className="py-3.5 text-sm text-slate-600">{order.sample_type || 'Blood'}</TableCell>
                            <TableCell className="py-3.5 text-right text-sm tabular-nums text-slate-900">
                              {Number(order.cost || order.total_amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-3.5">
                              <Badge variant="secondary" className={cn(
                                "rounded-md px-2 py-0.5 text-xs font-medium",
                                order.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                              )}>
                                {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3.5">
                              <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                                {order.status || 'pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-3.5">
                              <div className="flex justify-end">
                                <OrderActions order={order} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-200 px-5 py-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search patient or test"
                  value={resultSearch}
                  onChange={e => setResultSearch(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 pl-9 text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isResultsLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : filteredResults.length === 0 ? (
                <p className="py-20 text-center text-sm text-slate-400">No results</p>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 lg:hidden">
                    {filteredResults.map(res => (
                      <div key={res.id} className="space-y-3 px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {res.anonymous_code
                              ? <span className="font-mono">{res.anonymous_code}</span>
                              : (res.medical_patients?.full_name || 'Patient')}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">{res.medical_lab_orders?.test_name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-slate-900">{readFindings(res)}</span>
                          <Badge variant="secondary" className={cn("rounded-md px-2 py-0.5 text-xs font-medium", interpretationTone(res.interpretation))}>
                            {res.interpretation || 'Recorded'}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => generateOfficialPdfReport(res)}
                          variant="outline"
                          className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                        >
                          <Printer size={13} className="mr-1.5 text-slate-400" />
                          Report
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-slate-200 hover:bg-transparent">
                          <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Patient</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Test</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Finding</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reference</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Interpretation</TableHead>
                          <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Verified by</TableHead>
                          <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Report</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map(res => (
                          <TableRow key={res.id} className="border-b border-slate-100 last:border-0">
                            <TableCell className="px-5 py-3.5 text-sm text-slate-900">
                              {res.anonymous_code
                                ? <span className="font-mono text-slate-600">{res.anonymous_code}</span>
                                : (res.medical_patients?.full_name || 'Patient')}
                            </TableCell>
                            <TableCell className="py-3.5 text-sm text-slate-600">{res.medical_lab_orders?.test_name}</TableCell>
                            <TableCell className="py-3.5 font-mono text-sm text-slate-900">{readFindings(res)}</TableCell>
                            <TableCell className="py-3.5 text-sm text-slate-500">{res.reference_range || '—'}</TableCell>
                            <TableCell className="py-3.5">
                              <Badge variant="secondary" className={cn("rounded-md px-2 py-0.5 text-xs font-medium", interpretationTone(res.interpretation))}>
                                {res.interpretation || 'Recorded'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3.5 text-sm text-slate-600">{res.verified_by_name || '—'}</TableCell>
                            <TableCell className="px-5 py-3.5 text-right">
                              <Button
                                onClick={() => generateOfficialPdfReport(res)}
                                variant="outline"
                                className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium"
                              >
                                <Printer size={13} className="mr-1.5 text-slate-400" />
                                Report
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewRequisitionOpen} onOpenChange={setIsNewRequisitionOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-slate-900">New requisition</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">Patient <span className="text-red-600">*</span></Label>
                <Select value={reqForm.patient_id} onValueChange={v => setReqForm({ ...reqForm, patient_id: v })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 rounded-lg">
                    {patients?.length ? patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                        <span className="ml-2 text-xs text-slate-400">{p.patient_uid}</span>
                      </SelectItem>
                    )) : (
                      <div className="px-3 py-2 text-sm text-slate-400">No patients registered</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Lab number</Label>
                <Input
                  placeholder="Generated if left blank"
                  value={reqForm.lab_number}
                  onChange={e => setReqForm({ ...reqForm, lab_number: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Requested by</Label>
                <Input
                  placeholder="Dr. K. Musoke"
                  value={reqForm.requested_by}
                  onChange={e => setReqForm({ ...reqForm, requested_by: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Referring facility</Label>
                <Input
                  placeholder="Leave blank if in-house"
                  value={reqForm.referral_facility}
                  onChange={e => setReqForm({ ...reqForm, referral_facility: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Department</Label>
                <Select value={reqForm.department_name} onValueChange={v => setReqForm({ ...reqForm, department_name: v })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {DEFAULT_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Specimen</Label>
                <Select value={reqForm.sample_type} onValueChange={v => setReqForm({ ...reqForm, sample_type: v })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {SAMPLE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 sm:h-11 sm:self-end">
                <Switch
                  id="vct-toggle"
                  checked={reqForm.took_vct}
                  onCheckedChange={c => setReqForm({ ...reqForm, took_vct: c })}
                />
                <Label htmlFor="vct-toggle" className="cursor-pointer py-3 text-sm text-slate-600 sm:py-0">
                  Took VCT here
                </Label>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-500">
                    Tests <span className="text-red-600">*</span>
                  </Label>
                  <span className="text-xs text-slate-400">{reqForm.selected_tests.length} selected</span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search the catalog"
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="h-10 rounded-lg border-slate-200 pl-9 text-sm"
                  />
                </div>

                <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {filteredCatalog.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      {catalog?.length ? 'No tests match' : 'No tests in the catalog yet'}
                    </p>
                  ) : filteredCatalog.map(t => (
                    <label key={t.id} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          checked={reqForm.selected_tests.includes(t.id)}
                          onCheckedChange={checked => {
                            setReqForm(prev => ({
                              ...prev,
                              selected_tests: checked
                                ? [...prev.selected_tests, t.id]
                                : prev.selected_tests.filter(id => id !== t.id)
                            }));
                          }}
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm text-slate-900">
                            {t.test_name}
                            {t.is_sensitive ? <Lock size={11} className="shrink-0 text-slate-400" /> : null}
                          </p>
                          <p className="truncate text-xs text-slate-400">{t.department_name}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-slate-600">
                        {Number(t.selling_price || 0).toLocaleString()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {requisitionTotals.hasSensitive ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <Lock size={15} className="mt-0.5 shrink-0 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    A confidential code will be generated instead of the patient name on this requisition.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">Clinical details</Label>
                <Textarea
                  placeholder="Symptoms, relevant history, reason for the test"
                  value={reqForm.clinical_details}
                  onChange={e => setReqForm({ ...reqForm, clinical_details: e.target.value })}
                  className="min-h-[90px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                />
              </div>

              <div className="space-y-4 rounded-lg border border-slate-200 p-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">
                    {money(requisitionTotals.total)}
                  </span>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="pay-now"
                      checked={reqForm.is_paid_immediately}
                      onCheckedChange={c => setReqForm({ ...reqForm, is_paid_immediately: c })}
                    />
                    <Label htmlFor="pay-now" className="cursor-pointer text-sm text-slate-600">Collect payment now</Label>
                  </div>

                  {reqForm.is_paid_immediately ? (
                    <Select value={reqForm.payment_method} onValueChange={v => setReqForm({ ...reqForm, payment_method: v })}>
                      <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 text-sm sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsNewRequisitionOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createRequisitionMutation.mutate()}
              disabled={createRequisitionMutation.isPending}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {createRequisitionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-slate-900">Enter result</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">
              {selectedOrder?.test_name}
              {selectedOrder?.anonymous_code ? ` · ${selectedOrder.anonymous_code}` : ''}
            </p>
          </DialogHeader>

          <div className="space-y-5 px-5 py-6 sm:px-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Finding <span className="text-red-600">*</span></Label>
              <Input
                placeholder="450 cells/uL or Positive"
                value={resultForm.detected_values}
                onChange={e => setResultForm({ ...resultForm, detected_values: e.target.value })}
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Reference range</Label>
              <Input
                placeholder="500 - 1500 cells/uL"
                value={resultForm.reference_range}
                onChange={e => setResultForm({ ...resultForm, reference_range: e.target.value })}
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Interpretation</Label>
              <Select value={resultForm.interpretation} onValueChange={v => setResultForm({ ...resultForm, interpretation: v })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {INTERPRETATIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Notes for the clinician</Label>
              <Textarea
                placeholder="Anything the requesting clinician should know"
                value={resultForm.clinician_notes}
                onChange={e => setResultForm({ ...resultForm, clinician_notes: e.target.value })}
                className="min-h-[80px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Recommendation</Label>
              <Textarea
                placeholder="Follow-up or treatment advice"
                value={resultForm.medical_recommendation}
                onChange={e => setResultForm({ ...resultForm, medical_recommendation: e.target.value })}
                className="min-h-[80px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Verified by <span className="text-red-600">*</span></Label>
              <Input
                placeholder="Name of the person signing this result"
                value={resultForm.verified_by_name}
                onChange={e => setResultForm({ ...resultForm, verified_by_name: e.target.value })}
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsResultModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => commitResultMutation.mutate()}
              disabled={commitResultMutation.isPending}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {commitResultMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Collect payment</DialogTitle>
            <p className="mt-0.5 truncate text-sm text-slate-500">{selectedOrder?.test_name}</p>
          </DialogHeader>

          <div className="space-y-5 px-5 py-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-medium text-slate-500">Amount due</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {money(selectedOrder?.cost || selectedOrder?.total_amount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Payment method</Label>
              <Select value={collectionMethod} onValueChange={setCollectionMethod}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4">
            <Button
              variant="ghost"
              onClick={() => setIsPaymentModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => processPaymentMutation.mutate()}
              disabled={processPaymentMutation.isPending}
              className="h-11 flex-1 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
            >
              {processPaymentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-slate-900">Test catalog</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">{catalog?.length || 0} tests</p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Code <span className="text-red-600">*</span></Label>
                <Input
                  placeholder="LAB-CD4"
                  value={newTest.test_code}
                  onChange={e => setNewTest({ ...newTest, test_code: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 font-mono text-sm uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Department</Label>
                <Select value={newTest.department_name} onValueChange={v => setNewTest({ ...newTest, department_name: v })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {DEFAULT_DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">Test name <span className="text-red-600">*</span></Label>
                <Input
                  placeholder="Absolute CD4 count"
                  value={newTest.test_name}
                  onChange={e => setNewTest({ ...newTest, test_name: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Price ({businessCurrency})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={newTest.selling_price || ''}
                  placeholder="0"
                  onChange={e => setNewTest({ ...newTest, selling_price: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Cost ({businessCurrency})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={newTest.cost_price || ''}
                  placeholder="0"
                  onChange={e => setNewTest({ ...newTest, cost_price: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Specimen</Label>
                <Select value={newTest.sample_type} onValueChange={v => setNewTest({ ...newTest, sample_type: v })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {SAMPLE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Tax category</Label>
                <Select value={newTest.tax_category_code} onValueChange={v => setNewTest({ ...newTest, tax_category_code: v })}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {TAX_CATEGORIES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">Normal range</Label>
                <Input
                  placeholder="500 - 1500 cells/uL"
                  value={newTest.normal_range}
                  onChange={e => setNewTest({ ...newTest, normal_range: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2">
                <Switch
                  id="sensitive-toggle"
                  checked={newTest.is_sensitive}
                  onCheckedChange={c => setNewTest({ ...newTest, is_sensitive: c })}
                />
                <Label htmlFor="sensitive-toggle" className="cursor-pointer text-sm text-slate-600">
                  Confidential test
                  <span className="mt-0.5 block text-xs text-slate-400">
                    Requisitions use a code instead of the patient name.
                  </span>
                </Label>
              </div>
            </div>

            {catalog?.length ? (
              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium text-slate-500">Existing tests</p>
                <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {catalog.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm text-slate-900">
                          {t.test_name}
                          {t.is_sensitive ? <Lock size={11} className="shrink-0 text-slate-400" /> : null}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {t.test_code} · {t.department_name}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-slate-600">
                        {Number(t.selling_price || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsCatalogModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Close
            </Button>
            <Button
              onClick={() => addCatalogTestMutation.mutate()}
              disabled={addCatalogTestMutation.isPending}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {addCatalogTestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}