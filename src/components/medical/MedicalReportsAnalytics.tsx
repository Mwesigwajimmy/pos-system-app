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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Loader2, Search, Pencil, Trash2, Lock, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, FileSpreadsheet, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalReportsAnalyticsProps {
  tenantId: string;
}

const supabase = createClient();

const DEPARTMENTS = [
  'Biochemistry',
  'Immunology',
  'Hematology',
  'Parasitology',
  'Microbiology',
  'Radiology',
  'General Diagnostics'
];

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank', 'Insurance'];

const PAGE_SIZES = [10, 20, 50, 100];

const ROW_CAP = 2000;

const localDateKey = (value: any) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shortId = (value: any) => (typeof value === 'string' ? value.substring(0, 6) : '');

export default function MedicalReportsAnalytics({ tenantId }: MedicalReportsAnalyticsProps) {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');

  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);

  const [editOrder, setEditOrder] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteOrder, setDeleteOrder] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['active_profile_medical_reports', tenantId],
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

  const { data: labOrders, isLoading: isOrdersLoading, isError: ordersFailed } = useQuery({
    queryKey: ['medical_lab_reports_data', tenantId, startDate, endDate],
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('medical_lab_orders')
        .select('*, medical_patients(full_name, gender, patient_uid)')
        .eq('tenant_id', tenantId);

      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(ROW_CAP);

      if (error) throw error;
      return data || [];
    }
  });

  const { data: labResults } = useQuery({
    queryKey: ['medical_lab_results_reports', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_lab_results')
        .select('*, medical_lab_orders(test_name, department_name)')
        .eq('tenant_id', tenantId);
      if (error) return [];
      return data || [];
    }
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['medical_prescriptions_reports', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_prescriptions')
        .select('*, product_variants(name, price, products(name))')
        .eq('tenant_id', tenantId);
      if (error) return [];
      return data || [];
    }
  });

  const filteredOrders = useMemo(() => {
    const list = labOrders || [];
    const term = searchTerm.trim().toLowerCase();

    return list.filter((order: any) => {
      const matchesSearch =
        !term ||
        (order.medical_patients?.full_name || '').toLowerCase().includes(term) ||
        (order.medical_patients?.patient_uid || '').toLowerCase().includes(term) ||
        (order.lab_number || '').toLowerCase().includes(term) ||
        (order.test_name || '').toLowerCase().includes(term) ||
        (order.requested_by || '').toLowerCase().includes(term) ||
        (order.anonymous_code || '').toLowerCase().includes(term);

      const matchesDept = departmentFilter === 'ALL' || order.department_name === departmentFilter;
      const matchesPayment = paymentFilter === 'ALL' || order.payment_status === paymentFilter;

      return matchesSearch && matchesDept && matchesPayment;
    });
  }, [labOrders, searchTerm, departmentFilter, paymentFilter]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, departmentFilter, paymentFilter, startDate, endDate, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = useMemo(
    () => filteredOrders.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filteredOrders, pageIndex, pageSize]
  );

  const financialSummary = useMemo(() => {
    const paidOrders = filteredOrders.filter((o: any) => o.payment_status === 'paid');
    const totalGross = paidOrders.reduce((acc: number, curr: any) => acc + Number(curr.total_amount ?? curr.cost ?? 0), 0);
    const totalTax = paidOrders.reduce((acc: number, curr: any) => acc + Number(curr.tax_amount ?? 0), 0);

    return {
      totalGross,
      totalTax,
      totalNet: totalGross - totalTax,
      paidCount: paidOrders.length,
      pendingCount: filteredOrders.length - paidOrders.length,
      outstanding: filteredOrders
        .filter((o: any) => o.payment_status !== 'paid')
        .reduce((acc: number, curr: any) => acc + Number(curr.total_amount ?? curr.cost ?? 0), 0)
    };
  }, [filteredOrders]);

  const departmentAnalytics = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; outstanding: number }> = {};

    filteredOrders.forEach((o: any) => {
      const dept = o.department_name || 'General';
      if (!map[dept]) map[dept] = { count: 0, revenue: 0, outstanding: 0 };
      map[dept].count += 1;
      const amount = Number(o.total_amount ?? o.cost ?? 0);
      if (o.payment_status === 'paid') map[dept].revenue += amount;
      else map[dept].outstanding += amount;
    });

    return Object.entries(map)
      .map(([department, data]) => ({ department, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const testFrequency = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o: any) => {
      const test = o.test_name || 'Unnamed test';
      map[test] = (map[test] || 0) + 1;
    });

    return Object.entries(map)
      .map(([test, count]) => ({ test, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredOrders]);

  const resultSummary = useMemo(() => {
    const list = labResults || [];
    const inRange = list.filter((r: any) => {
      const key = localDateKey(r.created_at);
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    });

    const byInterpretation: Record<string, number> = {};
    inRange.forEach((r: any) => {
      const key = r.interpretation || 'Not recorded';
      byInterpretation[key] = (byInterpretation[key] || 0) + 1;
    });

    return {
      total: inRange.length,
      critical: inRange.filter((r: any) => r.is_critical).length,
      byInterpretation: Object.entries(byInterpretation)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
    };
  }, [labResults, startDate, endDate]);

  const medicineUsage = useMemo(() => {
    const list = (prescriptions || []).filter((p: any) => {
      const key = localDateKey(p.created_at);
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
      return true;
    });

    const map: Record<string, { units: number; scripts: number }> = {};
    list.forEach((p: any) => {
      const name = p.product_variants?.products?.name || p.product_variants?.name || 'Unnamed medication';
      if (!map[name]) map[name] = { units: 0, scripts: 0 };
      map[name].units += Number(p.quantity_prescribed || 0);
      map[name].scripts += 1;
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
  }, [prescriptions, startDate, endDate]);

  const hasFilters = !!(searchTerm || departmentFilter !== 'ALL' || paymentFilter !== 'ALL' || startDate || endDate);

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('ALL');
    setPaymentFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const money = (value: any) => `${businessCurrency} ${Number(value || 0).toLocaleString()}`;

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      if (!editOrder) return;
      if (!String(editOrder.test_name || '').trim()) throw new Error("Test name cannot be empty.");

      const cost = Number(editOrder.cost) || 0;
      const tax = Number(editOrder.tax_amount) || 0;

      const { error } = await supabase
        .from('medical_lab_orders')
        .update({
          lab_number: editOrder.lab_number,
          test_name: editOrder.test_name,
          department_name: editOrder.department_name,
          sample_type: editOrder.sample_type,
          cost,
          total_amount: cost,
          tax_amount: tax,
          payment_status: editOrder.payment_status,
          payment_method: editOrder.payment_method,
          requested_by: editOrder.requested_by,
          referral_facility: editOrder.referral_facility,
          clinical_details: editOrder.clinical_details
        })
        .eq('id', editOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record updated");
      setIsEditOpen(false);
      setEditOrder(null);
      queryClient.invalidateQueries({ queryKey: ['medical_lab_reports_data'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

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
      toast.success("Record deleted");
      setIsDeleteOpen(false);
      setDeleteOrder(null);
      setDeleteConfirmText('');
      queryClient.invalidateQueries({ queryKey: ['medical_lab_reports_data'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteKey = deleteOrder?.lab_number || shortId(deleteOrder?.id);
  const canDelete = deleteConfirmText.trim() === String(deleteKey);

  const filterSummaryLine = () => {
    const parts = [
      startDate || endDate ? `Dates: ${startDate || 'start'} to ${endDate || 'today'}` : 'Dates: all',
      `Department: ${departmentFilter === 'ALL' ? 'all' : departmentFilter}`,
      `Payment: ${paymentFilter === 'ALL' ? 'all' : paymentFilter}`,
      searchTerm ? `Search: ${searchTerm}` : ''
    ].filter(Boolean);
    return parts.join('  |  ');
  };

  const exportPdf = () => {
    if (!filteredOrders.length) {
      toast.error("Nothing to export");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || 'Laboratory').toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Laboratory activity report', 14, 28);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 34);
    doc.setFontSize(8);
    doc.text(filterSummaryLine(), 14, 40);
    doc.line(14, 44, 196, 44);

    autoTable(doc, {
      startY: 50,
      head: [['Collected', 'Tax', 'Net', 'Outstanding', 'Paid', 'Unpaid']],
      body: [[
        money(financialSummary.totalGross),
        money(financialSummary.totalTax),
        money(financialSummary.totalNet),
        money(financialSummary.outstanding),
        String(financialSummary.paidCount),
        String(financialSummary.pendingCount)
      ]],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 70) + 8,
      head: [['Requisition', 'Patient', 'Department', 'Test', `Fee (${businessCurrency})`, 'Payment']],
      body: filteredOrders.map((o: any) => [
        o.lab_number || shortId(o.id),
        o.anonymous_code ? 'Confidential' : (o.medical_patients?.full_name || 'Walk-in'),
        o.department_name || 'General',
        o.test_name || '',
        Number(o.total_amount ?? o.cost ?? 0).toLocaleString(),
        o.payment_status || 'pending'
      ]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'right' } }
    });

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 100) + 8,
      head: [['Department', 'Tests', 'Collected', 'Outstanding']],
      body: departmentAnalytics.map(d => [
        d.department,
        String(d.count),
        Number(d.revenue).toLocaleString(),
        Number(d.outstanding).toLocaleString()
      ]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    const y = ((doc as any).lastAutoTable?.finalY || 140) + 16;
    doc.setFontSize(9);
    doc.text('Prepared by: _____________________', 14, y);
    doc.text('Checked by: _____________________', 110, y);

    doc.save(`Laboratory_Report_${startDate || 'all'}_${endDate || 'all'}.pdf`);
  };

  const exportCsv = () => {
    if (!filteredOrders.length) {
      toast.error("Nothing to export");
      return;
    }

    const headers = ['Date', 'Requisition', 'Patient', 'Patient number', 'Department', 'Test', 'Requested by', 'Fee', 'Tax', 'Payment status', 'Payment method'];
    const escape = (cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

    const rows = filteredOrders.map((o: any) => [
      localDateKey(o.created_at),
      o.lab_number || shortId(o.id),
      o.anonymous_code ? 'Confidential' : (o.medical_patients?.full_name || 'Walk-in'),
      o.anonymous_code ? '' : (o.medical_patients?.patient_uid || ''),
      o.department_name || 'General',
      o.test_name || '',
      o.requested_by || '',
      Number(o.total_amount ?? o.cost ?? 0),
      Number(o.tax_amount ?? 0),
      o.payment_status || 'pending',
      o.payment_method || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.setAttribute('download', `Laboratory_Report_${startDate || 'all'}_${endDate || 'all'}.csv`);
    link.click();
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-16 pt-6 sm:space-y-6 xl:px-8">

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Laboratory reports</h1>
          <p className="mt-1 text-sm text-slate-500">{profile?.business_name || ''}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={exportCsv}
            className="h-10 rounded-lg border-slate-200 px-4 text-sm font-medium"
          >
            <FileSpreadsheet size={15} className="mr-2 text-slate-400" />
            CSV
          </Button>
          <Button
            onClick={exportPdf}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <FileText size={15} className="mr-2" />
            PDF report
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-slate-200 p-5 shadow-none">
        <div className="grid gap-4 lg:grid-cols-6">
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-xs font-medium text-slate-500">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Patient, lab number, test or clinician"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-10 rounded-lg border-slate-200 pl-9 pr-9 text-sm"
              />
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ALL">All departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Payment</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">From</Label>
            <Input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={e => setStartDate(e.target.value)}
              className="h-10 rounded-lg border-slate-200 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">To</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
              className="h-10 rounded-lg border-slate-200 text-sm"
            />
          </div>
        </div>

        {hasFilters ? (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              {filteredOrders.length} record{filteredOrders.length === 1 ? '' : 's'} match
            </p>
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-9 rounded-lg px-3 text-xs font-medium text-slate-500"
            >
              Clear filters
            </Button>
          </div>
        ) : null}
      </Card>

      {ordersFailed ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-900">
            Records could not be loaded. The figures below are not reliable — refresh the page.
          </p>
        </div>
      ) : null}

      {(labOrders?.length || 0) >= ROW_CAP ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-900">
            Showing the most recent {ROW_CAP.toLocaleString()} records only. Narrow the date range for a complete total.
          </p>
        </div>
      ) : null}

      <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(n+3)]:border-t lg:grid-cols-5 lg:[&>*:nth-child(n+3)]:border-t-0 sm:divide-x">
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Collected</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{money(financialSummary.totalGross)}</p>
          <p className="mt-0.5 text-xs text-slate-400">Paid requisitions</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Tax</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{money(financialSummary.totalTax)}</p>
          <p className="mt-0.5 text-xs text-slate-400">Included above</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
          <p className={cn(
            "mt-1.5 text-xl font-semibold tabular-nums",
            financialSummary.outstanding > 0 ? "text-amber-700" : "text-slate-900"
          )}>
            {money(financialSummary.outstanding)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{financialSummary.pendingCount} unpaid</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Requisitions</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{filteredOrders.length}</p>
          <p className="mt-0.5 text-xs text-slate-400">{financialSummary.paidCount} paid</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Critical results</p>
          <p className={cn(
            "mt-1.5 text-xl font-semibold tabular-nums",
            resultSummary.critical > 0 ? "text-red-600" : "text-slate-900"
          )}>
            {resultSummary.critical}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Of {resultSummary.total} results</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg bg-slate-100 p-1 sm:inline-flex sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="ledger" className="rounded-md px-5 text-xs font-medium">Requisitions</TabsTrigger>
          <TabsTrigger value="departments" className="rounded-md px-5 text-xs font-medium">Departments</TabsTrigger>
          <TabsTrigger value="tests" className="rounded-md px-5 text-xs font-medium">Tests</TabsTrigger>
          <TabsTrigger value="medicines" className="rounded-md px-5 text-xs font-medium">Medicines</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            {isOrdersLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                <p className="mt-3 text-sm text-slate-400">Loading</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="py-20 text-center text-sm text-slate-400">No records match these filters</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Date</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Requisition</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Patient</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Department</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Test</TableHead>
                        <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fee</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Payment</TableHead>
                        <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedOrders.map((o: any) => (
                        <TableRow key={o.id} className="border-b border-slate-100 last:border-0">
                          <TableCell className="px-5 py-3.5 text-sm text-slate-500">{localDateKey(o.created_at)}</TableCell>
                          <TableCell className="py-3.5">
                            <p className="font-mono text-sm text-slate-900">{o.lab_number || shortId(o.id)}</p>
                            {o.anonymous_code ? (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                <Lock size={10} /> Confidential
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <p className="text-sm text-slate-900">
                              {o.anonymous_code ? 'Confidential' : (o.medical_patients?.full_name || 'Walk-in')}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{o.requested_by || 'Self'}</p>
                          </TableCell>
                          <TableCell className="py-3.5 text-sm text-slate-600">{o.department_name || 'General'}</TableCell>
                          <TableCell className="max-w-[220px] py-3.5">
                            <p className="truncate text-sm text-slate-600">{o.test_name}</p>
                          </TableCell>
                          <TableCell className="py-3.5 text-right text-sm tabular-nums text-slate-900">
                            {Number(o.total_amount ?? o.cost ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                                o.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                              )}
                            >
                              {o.payment_status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => { setEditOrder({ ...o }); setIsEditOpen(true); }}
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
                                aria-label="Edit"
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                onClick={() => { setDeleteOrder(o); setDeleteConfirmText(''); setIsDeleteOpen(true); }}
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                aria-label="Delete"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                  {pagedOrders.map((o: any) => (
                    <div key={o.id} className="space-y-2.5 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {o.anonymous_code ? 'Confidential' : (o.medical_patients?.full_name || 'Walk-in')}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {o.lab_number || shortId(o.id)} · {localDateKey(o.created_at)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          {Number(o.total_amount ?? o.cost ?? 0).toLocaleString()}
                        </p>
                      </div>

                      <p className="text-sm text-slate-600">{o.test_name}</p>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                              o.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                            )}
                          >
                            {o.payment_status || 'pending'}
                          </Badge>
                          <span className="text-xs text-slate-400">{o.department_name || 'General'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => { setEditOrder({ ...o }); setIsEditOpen(true); }}
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400"
                            aria-label="Edit"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            onClick={() => { setDeleteOrder(o); setDeleteConfirmText(''); setIsDeleteOpen(true); }}
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400"
                            aria-label="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {filteredOrders.length > 0 ? (
            <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, filteredOrders.length)} of {filteredOrders.length}
              </p>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-slate-500">Rows</Label>
                  <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                    <SelectTrigger className="h-9 w-20 rounded-lg border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {PAGE_SIZES.map(size => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
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
        </TabsContent>

        <TabsContent value="departments">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            {departmentAnalytics.length === 0 ? (
              <p className="py-20 text-center text-sm text-slate-400">Nothing to show</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {departmentAnalytics.map(dept => (
                  <div key={dept.department} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{dept.department}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{dept.count} requisition{dept.count === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex gap-8">
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Collected</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                          {Number(dept.revenue).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
                        <p className={cn(
                          "mt-0.5 text-sm font-semibold tabular-nums",
                          dept.outstanding > 0 ? "text-amber-700" : "text-slate-500"
                        )}>
                          {Number(dept.outstanding).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card className="rounded-xl border-slate-200 p-5 shadow-none sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900">Most requested tests</h2>
            <p className="mt-1 text-sm text-slate-500">
              How often each test was ordered. This counts requests, not diagnoses.
            </p>

            <div className="mt-5 space-y-4">
              {testFrequency.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Nothing to show</p>
              ) : (
                testFrequency.map(trend => {
                  const percentage = Math.round((trend.count / (filteredOrders.length || 1)) * 100);
                  return (
                    <div key={trend.test} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-700">{trend.test}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {trend.count} · {percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {resultSummary.byInterpretation.length > 0 ? (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-900">Recorded results</h3>
                <p className="mt-1 text-sm text-slate-500">Interpretation entered by the laboratory.</p>
                <div className="mt-4 divide-y divide-slate-100">
                  {resultSummary.byInterpretation.map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <span className="text-sm tabular-nums text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="medicines">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Most prescribed medicines</h2>
              <p className="mt-0.5 text-xs text-slate-500">Units prescribed in the selected date range</p>
            </div>

            {medicineUsage.length === 0 ? (
              <p className="py-20 text-center text-sm text-slate-400">Nothing to show</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {medicineUsage.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-900">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.scripts} prescription{item.scripts === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                      {item.units.toLocaleString()} units
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6">
            <DialogTitle className="text-base font-semibold text-slate-900">Edit requisition</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">
              {editOrder?.lab_number || shortId(editOrder?.id)}
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Lab number</Label>
                <Input
                  value={editOrder?.lab_number || ''}
                  onChange={e => setEditOrder({ ...editOrder, lab_number: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Department</Label>
                <Select
                  value={editOrder?.department_name || ''}
                  onValueChange={v => setEditOrder({ ...editOrder, department_name: v })}
                >
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">
                  Test <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={editOrder?.test_name || ''}
                  onChange={e => setEditOrder({ ...editOrder, test_name: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Specimen</Label>
                <Input
                  value={editOrder?.sample_type || ''}
                  onChange={e => setEditOrder({ ...editOrder, sample_type: e.target.value })}
                  placeholder="Blood"
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Requested by</Label>
                <Input
                  value={editOrder?.requested_by || ''}
                  onChange={e => setEditOrder({ ...editOrder, requested_by: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">Referring facility</Label>
                <Input
                  value={editOrder?.referral_facility || ''}
                  onChange={e => setEditOrder({ ...editOrder, referral_facility: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Fee ({businessCurrency})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editOrder?.cost ?? 0}
                  onChange={e => setEditOrder({ ...editOrder, cost: Number(e.target.value) || 0 })}
                  className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Tax included ({businessCurrency})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editOrder?.tax_amount ?? 0}
                  onChange={e => setEditOrder({ ...editOrder, tax_amount: Number(e.target.value) || 0 })}
                  className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Payment status</Label>
                <Select
                  value={editOrder?.payment_status || 'pending'}
                  onValueChange={v => setEditOrder({ ...editOrder, payment_status: v })}
                >
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Payment method</Label>
                <Select
                  value={editOrder?.payment_method || ''}
                  onValueChange={v => setEditOrder({ ...editOrder, payment_method: v })}
                >
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-slate-500">Clinical details</Label>
                <Input
                  value={editOrder?.clinical_details || ''}
                  onChange={e => setEditOrder({ ...editOrder, clinical_details: e.target.value })}
                  className="h-11 rounded-lg border-slate-200 text-sm"
                />
              </div>
            </div>

            {editOrder?.payment_status === 'paid' ? (
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-sm text-amber-900">
                  This requisition is already paid. Changing the fee will not change what was collected or anything already posted to the ledger.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateOrderMutation.mutate()}
              disabled={updateOrderMutation.isPending}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {updateOrderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Delete requisition</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-5 py-6">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-900">{deleteOrder?.test_name}</p>
              <p className="mt-0.5 font-mono text-xs text-slate-500">{deleteKey}</p>
              <p className="mt-1 text-xs text-slate-500">
                {deleteOrder?.anonymous_code ? 'Confidential' : (deleteOrder?.medical_patients?.full_name || 'Walk-in')}
                {' · '}
                {money(deleteOrder?.total_amount ?? deleteOrder?.cost)}
              </p>
            </div>

            {deleteOrder?.payment_status === 'paid' ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />
                <p className="text-sm text-red-900">
                  This requisition was paid. Deleting it removes {money(deleteOrder?.total_amount ?? deleteOrder?.cost)} from your reported laboratory income while the money stays in the ledger.
                </p>
              </div>
            ) : null}

            <p className="text-sm text-slate-600">
              This cannot be undone. Type <span className="font-mono text-slate-900">{deleteKey}</span> to confirm.
            </p>

            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={String(deleteKey || '')}
              className="h-11 rounded-lg border-slate-200 font-mono text-sm"
            />
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteOrderMutation.mutate()}
              disabled={deleteOrderMutation.isPending || !canDelete}
              className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 sm:flex-none sm:px-6"
            >
              {deleteOrderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}