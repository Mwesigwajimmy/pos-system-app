'use client';

/**
 * --- BBU1 SOVEREIGN MEDICAL & DIAGNOSTIC ANALYTICS HUB ---
 * VERSION: v11.0 OMEGA (EPIDEMIOLOGICAL & MULTI-SECTOR FINANCIAL AUDIT)
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { 
  BarChart3, TrendingUp, DollarSign, FlaskConical, 
  ShieldAlert, Printer, Download, Calendar, Activity, 
  FileText, ShieldCheck, Stethoscope, Users, Loader2,
  Search, Filter, Edit3, Trash2, Globe, Eye, Lock,
  PieChart, Pill, Layers, ChevronRight, CheckCircle2,
  X, Sparkles, Building2, RefreshCw, CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalReportsAnalyticsProps {
  tenantId: string;
}

const supabase = createClient();

const DEPARTMENTS = [
  'ALL',
  'Biochemistry',
  'Immunology',
  'Hematology',
  'Parasitology',
  'Microbiology',
  'Radiology',
  'General Diagnostics'
];

export default function MedicalReportsAnalytics({ tenantId }: MedicalReportsAnalyticsProps) {
  const queryClient = useQueryClient();

  // --- FILTERS & SEARCH STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [paymentFilter, setPaymentStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');

  // --- MODAL EDIT & DELETE STATES ---
  const [editOrder, setEditOrder] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteOrder, setDeleteOrder] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_medical_reports', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id || tenantId;

  // 2. DATA: Diagnostic Orders & Requisitions
  const { data: labOrders, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['medical_lab_reports_data', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_orders')
        .select('*, medical_patients(full_name, gender, patient_uid)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId
  });

  // 3. DATA: Lab Results (For Disease Prevalence Analytics)
  const { data: labResults } = useQuery({
    queryKey: ['medical_lab_results_reports', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_results')
        .select('*, medical_lab_orders(test_name, department_name)')
        .eq('tenant_id', tenantId);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId
  });

  // 4. DATA: Prescriptions (For Pharmacy Consumption Analytics)
  const { data: prescriptions } = useQuery({
    queryKey: ['medical_prescriptions_reports', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_prescriptions')
        .select('*, product_variants(name, price, products(name))')
        .eq('tenant_id', tenantId);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId
  });

  // MULTI-PROPERTY SEARCH & CALENDAR DATE RANGE FILTER ENGINE
  const filteredOrders = useMemo(() => {
    if (!labOrders) return [];
    return labOrders.filter((order: any) => {
      // Text Search: Name, UID, Lab #, Test Name, Country Code
      const matchesSearch = 
        !searchTerm.trim() ||
        order.medical_patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.medical_patients?.patient_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.lab_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.country_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.anonymous_code?.toLowerCase().includes(searchTerm.toLowerCase());

      // Department Filter
      const matchesDept = selectedDeptFilter === 'ALL' || order.department_name === selectedDeptFilter;

      // Payment Status Filter
      const matchesPayment = paymentFilter === 'ALL' || order.payment_status === paymentFilter;

      // Date Range Filter
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesStart = !startDate || orderDate >= startDate;
      const matchesEnd = !endDate || orderDate <= endDate;

      return matchesSearch && matchesDept && matchesPayment && matchesStart && matchesEnd;
    });
  }, [labOrders, searchTerm, selectedDeptFilter, paymentFilter, startDate, endDate]);

  // SECTOR 1: FINANCIAL & REVENUE COMPUTATIONS
  const financialSummary = useMemo(() => {
    if (!filteredOrders) return { totalGross: 0, totalNet: 0, totalTax: 0, paidCount: 0, pendingCount: 0 };
    
    const paidOrders = filteredOrders.filter(o => o.payment_status === 'paid');
    const totalGross = paidOrders.reduce((acc, curr) => acc + Number(curr.total_amount || curr.cost || 0), 0);
    const totalTax = paidOrders.reduce((acc, curr) => acc + Number(curr.tax_amount || 0), 0);
    const totalNet = totalGross - totalTax;

    return {
      totalGross,
      totalNet,
      totalTax,
      paidCount: paidOrders.length,
      pendingCount: filteredOrders.length - paidOrders.length
    };
  }, [filteredOrders]);

  // SECTOR 2: DEPARTMENTAL REVENUE DISTRIBUTION
  const departmentAnalytics = useMemo(() => {
    if (!filteredOrders) return [];
    const map: Record<string, { count: number; revenue: number }> = {};

    filteredOrders.forEach(o => {
      const dept = o.department_name || 'General';
      if (!map[dept]) map[dept] = { count: 0, revenue: 0 };
      map[dept].count += 1;
      if (o.payment_status === 'paid') {
        map[dept].revenue += Number(o.total_amount || o.cost || 0);
      }
    });

    return Object.entries(map).map(([dept, data]) => ({
      department: dept,
      count: data.count,
      revenue: data.revenue
    }));
  }, [filteredOrders]);

  // SECTOR 3: EPIDEMIOLOGICAL TEST FREQUENCY & CRITICAL FINDINGS
  const epidemiologicalTrends = useMemo(() => {
    if (!filteredOrders) return [];
    const testCountMap: Record<string, number> = {};

    filteredOrders.forEach(o => {
      const test = o.test_name || 'Diagnostic Panel';
      testCountMap[test] = (testCountMap[test] || 0) + 1;
    });

    return Object.entries(testCountMap)
      .map(([test, count]) => ({ test, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredOrders]);

  // MUTATION 1: Update / Edit Requisition Record
  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      if (!editOrder) return;

      const { error } = await supabase
        .from('medical_lab_orders')
        .update({
          lab_number: editOrder.lab_number,
          test_name: editOrder.test_name,
          department_name: editOrder.department_name,
          cost: Number(editOrder.cost),
          total_amount: Number(editOrder.cost),
          payment_status: editOrder.payment_status,
          payment_method: editOrder.payment_method,
          requested_by: editOrder.requested_by,
          referral_facility: editOrder.referral_facility
        })
        .eq('id', editOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laboratory Record Updated Successfully");
      setIsEditOpen(false);
      setEditOrder(null);
      queryClient.invalidateQueries({ queryKey: ['medical_lab_reports_data'] });
    },
    onError: (e: any) => toast.error(`Update Failed: ${e.message}`)
  });

  // MUTATION 2: Delete Requisition Record
  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      if (!deleteOrder) return;

      const { error } = await supabase
        .from('medical_lab_orders')
        .delete()
        .eq('id', deleteOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Requisition Record Deleted cleanly");
      setIsDeleteOpen(false);
      setDeleteOrder(null);
      queryClient.invalidateQueries({ queryKey: ['medical_lab_reports_data'] });
    },
    onError: (e: any) => toast.error(`Delete Failed: ${e.message}`)
  });

  // EXPORT COMPREHENSIVE EXECUTIVE DIAGNOSTIC AUDIT PDF
  const exportExecutivePdf = () => {
    const doc = new jsPDF();
    
    // Page Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || "BBU1 MEDICAL DIAGNOSTICS").toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("EXECUTIVE DIAGNOSTIC AUDIT & FINANCIAL LEDGER REPORT", 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()} | Currency Scope: ${businessCurrency}`, 14, 33);
    if (startDate || endDate) {
      doc.text(`Audit Period: ${startDate || 'Beginning'} to ${endDate || 'Present'}`, 14, 39);
    }
    doc.line(14, 42, 196, 42);

    // Financial KPI Summary Block
    autoTable(doc, {
      startY: 46,
      head: [['Gross Diagnostic Revenue', 'Net Service Revenue', 'Tax Output (VAT/EFRIS)', 'Cleared Invoices', 'Pending Collection']],
      body: [[
        `${businessCurrency} ${financialSummary.totalGross.toLocaleString()}`,
        `${businessCurrency} ${financialSummary.totalNet.toLocaleString()}`,
        `${businessCurrency} ${financialSummary.totalTax.toLocaleString()}`,
        `${financialSummary.paidCount} Paid`,
        `${financialSummary.pendingCount} Pending`
      ]],
      headStyles: { fillColor: [15, 23, 42] }
    });

    // Itemized Requisition Journal
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Requisition #', 'Patient Identity', 'Department', 'Test Panel', 'Fee', 'Status']],
      body: filteredOrders?.map((o: any) => [
        o.lab_number || `LAB-${o.id.substring(0,6)}`,
        o.anonymous_code ? 'CONFIDENTIAL CLIENT' : (o.medical_patients?.full_name || 'Walk-in Subject'),
        o.department_name || 'General',
        o.test_name,
        `${Number(o.total_amount || o.cost).toLocaleString()} ${businessCurrency}`,
        o.payment_status?.toUpperCase() || 'PENDING'
      ]),
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Departmental Revenue Distribution
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Department Name', 'Total Test Count', 'Department Revenue']],
      body: departmentAnalytics?.map(d => [
        d.department,
        `${d.count} Tests`,
        `${businessCurrency} ${d.revenue.toLocaleString()}`
      ]),
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Signatures
    const currentY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFont('helvetica', 'bold');
    doc.text("Report Compiled By: ___________________________", 14, currentY);
    doc.text("Facility Director Seal: ___________________________", 110, currentY);

    doc.save(`Diagnostic_Executive_Audit_${Date.now()}.pdf`);
    toast.success("Executive PDF Audit Downloaded!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. HEADER & TOP CONTROL BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest">
            <BarChart3 size={16} /> Diagnostic Business Intelligence
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medical Laboratory Audit & Analytics</h1>
          <p className="text-sm font-medium text-slate-500">Facility: {profile?.business_name || 'Diagnostic Center'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={exportExecutivePdf} className="h-11 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg">
            <Printer size={16} className="mr-2" /> Download Executive Audit PDF
          </Button>
        </div>
      </div>

      {/* 2. SEARCH & MULTI-FILTER CONTROL BAR */}
      <Card className="border border-slate-200 shadow-sm rounded-3xl p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          {/* SEARCH INPUT */}
          <div className="lg:col-span-2 space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400">Universal Search (Name, Lab #, Country, Code)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search patient name, UID, Lab #, test..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-9 h-11 rounded-xl font-bold text-xs border-slate-200" 
              />
            </div>
          </div>

          {/* DEPARTMENT FILTER */}
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400">Department</Label>
            <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
              <SelectTrigger className="h-11 rounded-xl font-bold text-xs border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="font-bold text-xs">{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* PAYMENT STATUS FILTER */}
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400">Payment Status</Label>
            <Select value={paymentFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="h-11 rounded-xl font-bold text-xs border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold text-xs">All Billing States</SelectItem>
                <SelectItem value="paid" className="font-bold text-xs text-emerald-600">Cleared / Paid</SelectItem>
                <SelectItem value="pending" className="font-bold text-xs text-amber-600">Pending Collection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CALENDAR START & END DATE */}
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400">Calendar Range</Label>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-11 rounded-xl text-[10px] font-bold px-2" />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-11 rounded-xl text-[10px] font-bold px-2" />
            </div>
          </div>

        </div>
      </Card>

      {/* 3. FINANCIAL & OPERATIONAL KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gross Diagnostic Revenue</span>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">{businessCurrency} {financialSummary.totalGross.toLocaleString()}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">100% Posted to GL 4000</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Diagnostic Requisitions</span>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{filteredOrders.length}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Tests Logged in Filter</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Paid Invoices</span>
          <h3 className="text-3xl font-black text-blue-600 mt-2">{financialSummary.paidCount}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Cleared Transactions</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pending Bills</span>
          <h3 className="text-3xl font-black text-amber-600 mt-2">{financialSummary.pendingCount}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Awaiting Collection</p>
        </Card>
      </div>

      {/* 4. CONSOLIDATED SECTOR TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 max-w-xl w-full shadow-inner">
          <TabsTrigger value="ledger" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
            <FileText size={16} className="mr-2 text-blue-600" /> Requisition Journal
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
            <PieChart size={16} className="mr-2 text-emerald-600" /> Departments
          </TabsTrigger>
          <TabsTrigger value="epidemiology" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
            <Activity size={16} className="mr-2 text-rose-600" /> Disease Prevalence
          </TabsTrigger>
        </TabsList>

        {/* SECTOR 1: REQUISITION JOURNAL & EDIT/DELETE LEDGER */}
        <TabsContent value="ledger">
          <Card className="border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="p-8 bg-slate-50/50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Itemized Diagnostic Audit Journal</CardTitle>
                <CardDescription className="text-xs">Filter, view, edit or remove diagnostic records</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold px-3 py-1 text-[10px] uppercase">
                {filteredOrders.length} Records Match
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-12">
                      <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Lab Requisition #</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Patient Subject</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Department</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Test Designation</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Fee ({businessCurrency})</TableHead>
                      <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500">Payment</TableHead>
                      <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isOrdersLoading ? (
                      <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Synchronizing Analytics...</TableCell></TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400 font-bold">No diagnostic requisitions match your search filters.</TableCell></TableRow>
                    ) : filteredOrders.map((o: any) => (
                      <TableRow key={o.id} className="h-16 hover:bg-slate-50/50">
                        <TableCell className="pl-8 font-mono font-bold text-xs text-blue-600">
                          {o.lab_number || `LAB-${o.id.substring(0,6)}`}
                          {o.anonymous_code && <span className="block text-[9px] text-amber-600 font-mono"><Lock size={9} className="inline mr-1"/>ANON</span>}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-900">
                          {o.anonymous_code ? 'CONFIDENTIAL CLIENT' : (o.medical_patients?.full_name || 'Walk-in Subject')}
                          <span className="block text-[9px] text-slate-400 font-normal">Ref: {o.requested_by || 'Self'}</span>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase">{o.department_name || 'General'}</Badge></TableCell>
                        <TableCell className="font-bold text-xs text-slate-800">{o.test_name}</TableCell>
                        <TableCell className="text-right font-black text-sm tabular-nums">{Number(o.total_amount || o.cost).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("border-none text-[9px] font-bold uppercase px-3 py-1", o.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                            {o.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button onClick={() => { setEditOrder(o); setIsEditOpen(true); }} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 rounded-lg">
                              <Edit3 size={14} />
                            </Button>
                            <Button onClick={() => { setDeleteOrder(o); setIsDeleteOpen(true); }} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg">
                              <Trash2 size={14} />
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
        </TabsContent>

        {/* SECTOR 2: DEPARTMENTAL REVENUE BREAKDOWN */}
        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departmentAnalytics.map((dept, idx) => (
              <Card key={idx} className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{dept.department}</h4>
                  <Badge className="bg-blue-50 text-blue-700 border-none font-bold text-[9px]">{dept.count} Tests</Badge>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Department Revenue</span>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">{businessCurrency} {dept.revenue.toLocaleString()}</h3>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SECTOR 3: DISEASE PREVALENCE & EPIDEMIOLOGY */}
        <TabsContent value="epidemiology">
          <Card className="border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <Activity size={20} className="text-rose-600" /> Epidemiological Test Frequency
              </h3>
              <p className="text-xs text-slate-500 font-medium">Most requested diagnostic procedures and disease surveillance trends</p>
            </div>

            <div className="space-y-4">
              {epidemiologicalTrends.map((trend, idx) => {
                const percentage = Math.round((trend.count / (filteredOrders.length || 1)) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>{trend.test}</span>
                      <span className="font-mono text-blue-600">{trend.count} Requisitions ({percentage}%)</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* MODAL 1: EDIT REQUISITION RECORD */}
      {/* ==================================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Update Requisition Record</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">Lab No: {editOrder?.lab_number}</DialogDescription>
          </div>

          <div className="p-8 space-y-4 bg-white">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Requisition Lab #</Label>
              <Input value={editOrder?.lab_number || ''} onChange={e => setEditOrder({ ...editOrder, lab_number: e.target.value })} className="h-11 font-mono font-bold rounded-xl" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Test Designation Name</Label>
              <Input value={editOrder?.test_name || ''} onChange={e => setEditOrder({ ...editOrder, test_name: e.target.value })} className="h-11 font-bold rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Fee ({businessCurrency})</Label>
                <Input type="number" value={editOrder?.cost || 0} onChange={e => setEditOrder({ ...editOrder, cost: Number(e.target.value) })} className="h-11 font-bold rounded-xl text-blue-600" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Status</Label>
                <Select value={editOrder?.payment_status || 'pending'} onValueChange={v => setEditOrder({ ...editOrder, payment_status: v })}>
                  <SelectTrigger className="h-11 font-bold rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid" className="font-bold text-emerald-600">Cleared / Paid</SelectItem>
                    <SelectItem value="pending" className="font-bold text-amber-600">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => updateOrderMutation.mutate()} disabled={updateOrderMutation.isPending} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {updateOrderMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Authorize Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: DELETE CONFIRMATION */}
      {/* ==================================================================== */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-rose-600 p-8 text-white text-center">
            <Trash2 size={36} className="mx-auto mb-2 opacity-90" />
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Delete Requisition Record</DialogTitle>
          </div>

          <div className="p-8 text-center space-y-2 bg-white">
            <p className="text-xs font-bold text-slate-800">Are you sure you want to delete this requisition record?</p>
            <p className="text-[10px] font-mono text-slate-400 uppercase">{deleteOrder?.test_name} ({deleteOrder?.lab_number})</p>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => deleteOrderMutation.mutate()} disabled={deleteOrderMutation.isPending} className="h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {deleteOrderMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}