'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Pill, Loader2, Search, Plus, Printer, FileText,
  AlertTriangle, Trash2, RefreshCw, PackageCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PharmacyConsoleProps {
  tenantId: string;
}

const supabase = createClient();

const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank', 'Insurance'];

const LOW_STOCK_THRESHOLD = 10;
const CASH_ACCOUNT_CODE = '1000';
const REVENUE_ACCOUNT_CODE = '4000';
const JOURNAL_CODE = 'GEN';

const emptyOtcForm = {
  patient_name: '',
  variant_id: '',
  dosage_instruction: '',
  quantity: 1,
  payment_method: 'Cash',
  batch_number: '',
  insurance_claim_ref: '',
  amount_tendered: ''
};

const newId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function PharmacyConsole({ tenantId }: PharmacyConsoleProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isOtcModalOpen, setIsOtcModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [attendantName, setAttendantName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [insuranceClaimRef, setInsuranceClaimRef] = useState('');
  const [idVerified, setIdVerified] = useState(false);
  const [allergyAcknowledged, setAllergyAcknowledged] = useState(false);

  const [voidReason, setVoidReason] = useState('');
  const [otcForm, setOtcForm] = useState({ ...emptyOtcForm });
  const [otcSearch, setOtcSearch] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['active_profile_pharmacy', tenantId],
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

  useEffect(() => {
    if (profile?.full_name && !attendantName) {
      setAttendantName(profile.full_name);
    }
  }, [profile, attendantName]);

  const { data: pendingScripts, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pending_prescriptions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_prescriptions')
        .select(`
          *,
          medical_patients(full_name, patient_uid, gender, allergies),
          product_variants(id, name, sku, price, selling_price, cost_price, stock_quantity, products(name))
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });

  const { data: dispensedScripts, isLoading: isDispensedLoading } = useQuery({
    queryKey: ['dispensed_prescriptions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_prescriptions')
        .select(`
          *,
          medical_patients(full_name, patient_uid),
          product_variants(id, name, sku, price, selling_price, products(name))
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'dispensed')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId
  });

  const { data: pharmaInventory } = useQuery({
    queryKey: ['pharma_inventory_console', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, price, selling_price, cost_price, stock_quantity, products(name)')
        .eq('business_id', activeBusinessId)
        .eq('is_active', true)
        .order('name');
      if (error) return [];
      return data || [];
    }
  });

  const money = (value: any) => `${businessCurrency} ${Number(value || 0).toLocaleString()}`;

  const drugNameOf = (row: any) =>
    row?.product_variants?.products?.name || row?.product_variants?.name || 'Medication';

  const patientNameOf = (row: any) =>
    row?.medical_patients?.full_name || row?.walk_in_patient_name || 'Walk-in';

  const filteredPending = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = pendingScripts || [];
    if (!term) return list;
    return list.filter(s =>
      (s.medical_patients?.full_name || '').toLowerCase().includes(term) ||
      (s.product_variants?.products?.name || '').toLowerCase().includes(term) ||
      (s.product_variants?.name || '').toLowerCase().includes(term) ||
      (s.dosage_instruction || '').toLowerCase().includes(term)
    );
  }, [pendingScripts, searchTerm]);

  const filteredStock = useMemo(() => {
    const term = stockSearchTerm.trim().toLowerCase();
    const list = pharmaInventory || [];
    if (!term) return list;
    return list.filter((p: any) =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.products?.name || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term)
    );
  }, [pharmaInventory, stockSearchTerm]);

  const filteredOtcInventory = useMemo(() => {
    const term = otcSearch.trim().toLowerCase();
    const list = pharmaInventory || [];
    if (!term) return list.slice(0, 50);
    return list.filter((p: any) =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.products?.name || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }, [pharmaInventory, otcSearch]);

  const lowStockCount = useMemo(
    () => (pharmaInventory || []).filter((p: any) => Number(p.stock_quantity ?? 0) <= LOW_STOCK_THRESHOLD).length,
    [pharmaInventory]
  );

  const todaysDispensedValue = useMemo(() => {
    const list = dispensedScripts || [];
    const todayStr = new Date().toDateString();
    return list
      .filter(s => new Date(s.created_at).toDateString() === todayStr)
      .reduce((sum, s) => {
        const price = Number(s.product_variants?.selling_price || s.product_variants?.price || 0);
        return sum + price * Number(s.quantity_prescribed || 1);
      }, 0);
  }, [dispensedScripts]);

  const dispenseTotal = useMemo(() => {
    const drugPrice = Number(selectedScript?.product_variants?.selling_price || selectedScript?.product_variants?.price || 0);
    return drugPrice * Number(selectedScript?.quantity_prescribed || 1);
  }, [selectedScript]);

  const dispenseChangeDue = useMemo(() => {
    const tendered = Number(amountTendered);
    if (!amountTendered || Number.isNaN(tendered)) return null;
    return tendered - dispenseTotal;
  }, [amountTendered, dispenseTotal]);

  const patientAllergies: string[] = Array.isArray(selectedScript?.medical_patients?.allergies)
    ? selectedScript.medical_patients.allergies
    : [];

  const dispenseStockShort = selectedScript
    ? Number(selectedScript.product_variants?.stock_quantity ?? 0) < Number(selectedScript.quantity_prescribed || 1)
    : false;

  const canConfirmDispense =
    idVerified &&
    attendantName.trim().length > 0 &&
    (patientAllergies.length === 0 || allergyAcknowledged) &&
    !dispenseStockShort &&
    (paymentMethod !== 'Insurance' || insuranceClaimRef.trim().length > 0);

  const otcSelectedVariant = useMemo(
    () => (pharmaInventory || []).find((p: any) => String(p.id) === otcForm.variant_id),
    [pharmaInventory, otcForm.variant_id]
  );

  const otcTotal = useMemo(
    () => Number(otcSelectedVariant?.selling_price || otcSelectedVariant?.price || 0) * Number(otcForm.quantity || 0),
    [otcSelectedVariant, otcForm.quantity]
  );

  const otcStockShort = otcSelectedVariant
    ? Number(otcForm.quantity || 0) > Number(otcSelectedVariant.stock_quantity ?? 0)
    : false;

  const otcChangeDue = useMemo(() => {
    const tendered = Number(otcForm.amount_tendered);
    if (!otcForm.amount_tendered || Number.isNaN(tendered)) return null;
    return tendered - otcTotal;
  }, [otcForm.amount_tendered, otcTotal]);

  const canConfirmOtc =
    attendantName.trim().length > 0 &&
    !!otcForm.variant_id &&
    Number(otcForm.quantity) > 0 &&
    !otcStockShort &&
    (otcForm.payment_method !== 'Insurance' || otcForm.insurance_claim_ref.trim().length > 0);

  const resolveLedgerAccounts = async () => {
    const [cashRes, revRes, journalRes] = await Promise.all([
      supabase.from('accounting_accounts').select('id').eq('business_id', activeBusinessId).eq('code', CASH_ACCOUNT_CODE).maybeSingle(),
      supabase.from('accounting_accounts').select('id').eq('business_id', activeBusinessId).eq('code', REVENUE_ACCOUNT_CODE).maybeSingle(),
      supabase.from('accounting_journals').select('id').eq('business_id', activeBusinessId).eq('code', JOURNAL_CODE).maybeSingle(),
    ]);

    const cashId = cashRes.data?.id;
    const revenueId = revRes.data?.id;
    const journalId = journalRes.data?.id;

    if (!cashId || !revenueId || !journalId) {
      const missing = [
        !cashId ? `cash account ${CASH_ACCOUNT_CODE}` : '',
        !revenueId ? `revenue account ${REVENUE_ACCOUNT_CODE}` : '',
        !journalId ? `journal ${JOURNAL_CODE}` : ''
      ].filter(Boolean).join(', ');
      throw new Error(`Cannot record this sale: ${missing} is not set up in your chart of accounts. Nothing was dispensed.`);
    }

    return { cashId, revenueId, journalId };
  };

  const postSaleToLedger = async ({
    cashId,
    revenueId,
    journalId,
    amount,
    reference,
    description,
    inflowLabel,
    revenueLabel
  }: any) => {
    const txId = newId();

    const { error: txErr } = await supabase.from('accounting_transactions').insert([{
      id: txId,
      business_id: activeBusinessId,
      journal_id: journalId,
      date: new Date().toISOString().split('T')[0],
      reference,
      description,
      state: 'posted',
      currency: businessCurrency
    }]);
    if (txErr) throw new Error(`Dispensed, but the sale was not recorded in the ledger: ${txErr.message}`);

    const { error: entryErr } = await supabase.from('accounting_journal_entries').insert([
      { business_id: activeBusinessId, transaction_id: txId, account_id: cashId, debit: amount, credit: 0, description: inflowLabel },
      { business_id: activeBusinessId, transaction_id: txId, account_id: revenueId, debit: 0, credit: amount, description: revenueLabel }
    ]);
    if (entryErr) throw new Error(`Dispensed, but the ledger entries failed: ${entryErr.message}`);
  };

  const dispenseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScript) throw new Error("No prescription selected.");

      const variantId = selectedScript.variant_id;
      const qtyPrescribed = Number(selectedScript.quantity_prescribed || 1);
      const drugPrice = Number(selectedScript.product_variants?.selling_price || selectedScript.product_variants?.price || 0);
      const totalCost = drugPrice * qtyPrescribed;

      const accounts = totalCost > 0 ? await resolveLedgerAccounts() : null;

      const { error: scriptErr } = await supabase
        .from('medical_prescriptions')
        .update({
          status: 'dispensed',
          dispensed_by: attendantName || null,
          batch_number: batchNumber || null,
          insurance_claim_ref: paymentMethod === 'Insurance' ? insuranceClaimRef : null
        })
        .eq('id', selectedScript.id);

      if (scriptErr) throw scriptErr;

      if (variantId) {
        const { error: stockErr } = await supabase.rpc('process_stock_adjustment_v2', {
          p_variant_id: variantId,
          p_qty_change: -Math.abs(qtyPrescribed),
          p_reason: 'Pharmacy dispensing'
        });
        if (stockErr) {
          throw new Error(`Marked as dispensed, but stock was NOT deducted: ${stockErr.message}. Adjust stock manually.`);
        }
      }

      if (accounts && totalCost > 0) {
        await postSaleToLedger({
          ...accounts,
          amount: totalCost,
          reference: `PHARM-RCT-${Date.now().toString().slice(-6)}`,
          description: `Pharmacy dispensing (${paymentMethod})`,
          inflowLabel: 'Pharmacy cash inflow',
          revenueLabel: 'Medication sales revenue'
        });
      }
    },
    onSuccess: () => {
      toast.success("Dispensed");
      setIsDispenseModalOpen(false);
      resetDispenseSafetyState();
      queryClient.invalidateQueries({ queryKey: ['pending_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    },
    onError: (e: any) => {
      toast.error(e.message, { duration: 12000 });
      queryClient.invalidateQueries({ queryKey: ['pending_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    }
  });

  const processOtcDispenseMutation = useMutation({
    mutationFn: async () => {
      if (!otcForm.variant_id) throw new Error("Select a medication.");
      if (Number(otcForm.quantity) <= 0) throw new Error("Quantity must be more than zero.");

      const selectedVariant = (pharmaInventory || []).find((p: any) => String(p.id) === otcForm.variant_id);
      if (!selectedVariant) throw new Error("That medication was not found.");

      const totalCost = Number(selectedVariant.selling_price || selectedVariant.price || 0) * Number(otcForm.quantity);
      const accounts = totalCost > 0 ? await resolveLedgerAccounts() : null;

      const { error: scriptErr } = await supabase
        .from('medical_prescriptions')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          variant_id: Number(otcForm.variant_id),
          dosage_instruction: otcForm.dosage_instruction,
          quantity_prescribed: Number(otcForm.quantity),
          status: 'dispensed',
          walk_in_patient_name: otcForm.patient_name || 'Walk-in',
          dispensed_by: attendantName || null,
          batch_number: otcForm.batch_number || null,
          insurance_claim_ref: otcForm.payment_method === 'Insurance' ? otcForm.insurance_claim_ref : null
        }])
        .select()
        .single();

      if (scriptErr) throw scriptErr;

      const { error: stockErr } = await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: Number(otcForm.variant_id),
        p_qty_change: -Math.abs(Number(otcForm.quantity)),
        p_reason: 'Over the counter sale'
      });
      if (stockErr) {
        throw new Error(`Sale recorded, but stock was NOT deducted: ${stockErr.message}. Adjust stock manually.`);
      }

      if (accounts && totalCost > 0) {
        await postSaleToLedger({
          ...accounts,
          amount: totalCost,
          reference: `OTC-RCT-${Date.now().toString().slice(-6)}`,
          description: `Over the counter sale (${otcForm.payment_method})`,
          inflowLabel: 'Pharmacy cash inflow',
          revenueLabel: 'Medication sales revenue'
        });
      }
    },
    onSuccess: () => {
      toast.success("Sale recorded");
      setIsOtcModalOpen(false);
      setOtcForm({ ...emptyOtcForm });
      setOtcSearch('');
      queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    },
    onError: (e: any) => {
      toast.error(e.message, { duration: 12000 });
      queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    }
  });

  const voidPrescriptionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScript) throw new Error("No prescription selected.");
      if (!voidReason.trim()) throw new Error("Enter a reason.");

      const { error } = await supabase
        .from('medical_prescriptions')
        .update({
          status: 'void',
          void_reason: voidReason,
          voided_by: attendantName || null
        })
        .eq('id', selectedScript.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prescription voided");
      setIsVoidModalOpen(false);
      setVoidReason('');
      queryClient.invalidateQueries({ queryKey: ['pending_prescriptions'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  function resetDispenseSafetyState() {
    setPaymentMethod('Cash');
    setBatchNumber('');
    setAmountTendered('');
    setInsuranceClaimRef('');
    setIdVerified(false);
    setAllergyAcknowledged(false);
  }

  function openDispenseModal(script: any) {
    setSelectedScript(script);
    resetDispenseSafetyState();
    setIsDispenseModalOpen(true);
  }

  function openVoidModal(script: any) {
    setSelectedScript(script);
    setVoidReason('');
    setIsVoidModalOpen(true);
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['pending_prescriptions'] });
    queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
    queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
  }

  const printThermalLabel = (script: any) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
      const drugName = String(drugNameOf(script));
      const patientName = String(patientNameOf(script));
      const instructions = String(script?.dosage_instruction || '');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text((profile?.business_name || 'Pharmacy').toUpperCase(), 25, 4, { align: 'center' });

      doc.setFontSize(8);
      doc.text(drugName.toUpperCase().substring(0, 22), 25, 8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(patientName.substring(0, 24), 25, 12, { align: 'center' });
      doc.text(instructions.substring(0, 28) || 'See prescription', 25, 16, { align: 'center' });
      doc.text(`Qty ${script?.quantity_prescribed ?? ''} · ${new Date().toLocaleDateString()}`, 25, 20, { align: 'center' });

      doc.setFontSize(5);
      doc.text('Keep out of reach of children', 25, 23, { align: 'center' });

      window.open(URL.createObjectURL(doc.output('blob')), '_blank');
    } catch (err: any) {
      toast.error("Could not create the label");
    }
  };

  const printFullReceipt = (script: any) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const drugName = drugNameOf(script);
      const patientName = patientNameOf(script);
      const drugPrice = Number(script?.product_variants?.selling_price || script?.product_variants?.price || 0);
      const totalCost = drugPrice * Number(script?.quantity_prescribed || 1);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text((profile?.business_name || 'Pharmacy').toUpperCase(), 74, 14, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Dispensing receipt', 74, 20, { align: 'center' });
      doc.text(new Date(script?.created_at || Date.now()).toLocaleString(), 74, 25, { align: 'center' });
      doc.line(10, 29, 138, 29);

      autoTable(doc, {
        startY: 34,
        head: [['Patient', 'Patient number', 'Dispensed by']],
        body: [[
          patientName,
          script?.medical_patients?.patient_uid || 'Walk-in',
          script?.dispensed_by || 'Not recorded'
        ]],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
      });

      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 50) + 6,
        head: [['Medication', 'Batch', 'Qty', `Unit (${businessCurrency})`, `Total (${businessCurrency})`]],
        body: [[
          drugName,
          script?.batch_number || 'Not recorded',
          String(script?.quantity_prescribed ?? ''),
          drugPrice.toLocaleString(),
          totalCost.toLocaleString()
        ]],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
      });

      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 70) + 6,
        head: [['Instructions']],
        body: [[script?.dosage_instruction || 'Not recorded']],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
      });

      doc.save(`Receipt_${script?.medical_patients?.patient_uid || 'OTC'}_${Date.now()}.pdf`);
    } catch (err: any) {
      toast.error("Could not create the receipt");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-16 pt-6 sm:space-y-6 xl:px-8">

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Pharmacy</h1>
          <p className="mt-1 text-sm text-slate-500">{profile?.business_name || ''}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="h-10 rounded-lg border-slate-200 px-4 text-sm font-medium"
          >
            <RefreshCw size={15} className="mr-2 text-slate-400" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsOtcModalOpen(true)}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus size={15} className="mr-2" />
            Counter sale
          </Button>
        </div>
      </div>

      <div className="grid divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Waiting</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{pendingScripts?.length || 0}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Dispensed today</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{money(todaysDispensedValue)}</p>
          <p className="mt-0.5 text-xs text-slate-400">From the last 50 records</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Low stock</p>
          <p className={cn(
            "mt-1.5 text-xl font-semibold tabular-nums",
            lowStockCount > 0 ? "text-amber-700" : "text-slate-900"
          )}>
            {lowStockCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{LOW_STOCK_THRESHOLD} or fewer left</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-lg bg-slate-100 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="pending" className="rounded-md px-5 text-xs font-medium">
            Waiting ({pendingScripts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="dispensed" className="rounded-md px-5 text-xs font-medium">
            History
          </TabsTrigger>
          <TabsTrigger value="stock" className="rounded-md px-5 text-xs font-medium">
            Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search patient or medication"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 rounded-lg border-slate-200 pl-9 text-sm"
            />
          </div>

          {isPendingLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-400">Loading</p>
            </div>
          ) : filteredPending.length === 0 ? (
            <Card className="rounded-xl border-slate-200 py-20 text-center shadow-none">
              <PackageCheck size={28} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-400">Nothing waiting</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPending.map(s => {
                const availableStock = Number(s.product_variants?.stock_quantity ?? 0);
                const qty = Number(s.quantity_prescribed || 1);
                const drugPrice = Number(s.product_variants?.selling_price || s.product_variants?.price || 0);
                const scriptAllergies: string[] = Array.isArray(s.medical_patients?.allergies) ? s.medical_patients.allergies : [];
                const short = availableStock < qty;

                return (
                  <Card key={s.id} className="rounded-xl border-slate-200 p-4 shadow-none sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {s.medical_patients?.full_name || 'Walk-in'}
                          </p>
                          {s.medical_patients?.patient_uid ? (
                            <span className="font-mono text-xs text-slate-400">{s.medical_patients.patient_uid}</span>
                          ) : null}
                        </div>

                        <p className="text-sm text-slate-600">
                          {drugNameOf(s)}
                          <span className="ml-1.5 text-slate-400">({s.product_variants?.name})</span>
                        </p>

                        <p className="text-sm text-slate-500">{s.dosage_instruction}</p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Qty {qty}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              short ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {availableStock} in stock
                          </Badge>
                          <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {money(drugPrice * qty)}
                          </Badge>
                          {scriptAllergies.length > 0 ? (
                            <Badge className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              <AlertTriangle size={11} className="mr-1" />
                              Allergies on file
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={() => printThermalLabel(s)}
                          variant="outline"
                          className="h-10 rounded-lg border-slate-200 px-4 text-sm font-medium"
                        >
                          <Printer size={14} className="mr-2 text-slate-400" />
                          Label
                        </Button>
                        <Button
                          onClick={() => openVoidModal(s)}
                          variant="outline"
                          className="h-10 rounded-lg border-slate-200 px-4 text-sm font-medium text-slate-500"
                        >
                          <Trash2 size={14} className="mr-2" />
                          Void
                        </Button>
                        <Button
                          onClick={() => openDispenseModal(s)}
                          className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          Dispense
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dispensed">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            {isDispensedLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : !dispensedScripts?.length ? (
              <p className="py-20 text-center text-sm text-slate-400">Nothing dispensed yet</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Patient</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Medication</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Batch</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Dispensed by</TableHead>
                        <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Qty</TableHead>
                        <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Print</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispensedScripts.map(s => (
                        <TableRow key={s.id} className="border-b border-slate-100 last:border-0">
                          <TableCell className="px-5 py-3.5 text-sm text-slate-900">{patientNameOf(s)}</TableCell>
                          <TableCell className="py-3.5 text-sm text-slate-600">{drugNameOf(s)}</TableCell>
                          <TableCell className="py-3.5 font-mono text-sm text-slate-500">{s.batch_number || '—'}</TableCell>
                          <TableCell className="py-3.5 text-sm text-slate-600">{s.dispensed_by || '—'}</TableCell>
                          <TableCell className="py-3.5 text-right text-sm tabular-nums text-slate-900">{s.quantity_prescribed}</TableCell>
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => printThermalLabel(s)}
                                variant="outline"
                                className="h-8 rounded-lg border-slate-200 px-3 text-xs font-medium"
                              >
                                <Printer size={12} className="mr-1.5 text-slate-400" />
                                Label
                              </Button>
                              <Button
                                onClick={() => printFullReceipt(s)}
                                variant="outline"
                                className="h-8 rounded-lg border-slate-200 px-3 text-xs font-medium"
                              >
                                <FileText size={12} className="mr-1.5 text-slate-400" />
                                Receipt
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                  {dispensedScripts.map(s => (
                    <div key={s.id} className="space-y-2.5 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{patientNameOf(s)}</p>
                          <p className="truncate text-xs text-slate-400">{drugNameOf(s)}</p>
                        </div>
                        <p className="shrink-0 text-sm tabular-nums text-slate-600">×{s.quantity_prescribed}</p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {s.batch_number ? `Batch ${s.batch_number} · ` : ''}
                        {s.dispensed_by || 'Dispenser not recorded'}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => printThermalLabel(s)}
                          variant="outline"
                          className="h-9 flex-1 rounded-lg border-slate-200 text-xs font-medium"
                        >
                          Label
                        </Button>
                        <Button
                          onClick={() => printFullReceipt(s)}
                          variant="outline"
                          className="h-9 flex-1 rounded-lg border-slate-200 text-xs font-medium"
                        >
                          Receipt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search medication or SKU"
              value={stockSearchTerm}
              onChange={e => setStockSearchTerm(e.target.value)}
              className="h-10 rounded-lg border-slate-200 pl-9 text-sm"
            />
          </div>

          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none">
            {filteredStock.length === 0 ? (
              <p className="py-20 text-center text-sm text-slate-400">No medication found</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 hover:bg-transparent">
                        <TableHead className="h-11 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Medication</TableHead>
                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">SKU</TableHead>
                        <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Price</TableHead>
                        <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">In stock</TableHead>
                        <TableHead className="h-11 px-5 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStock.map((p: any) => {
                        const stock = Number(p.stock_quantity ?? 0);
                        return (
                          <TableRow key={p.id} className="border-b border-slate-100 last:border-0">
                            <TableCell className="px-5 py-3.5 text-sm text-slate-900">
                              {p.products?.name || p.name}
                              <span className="ml-1.5 text-slate-400">({p.name})</span>
                            </TableCell>
                            <TableCell className="py-3.5 font-mono text-sm text-slate-500">{p.sku || '—'}</TableCell>
                            <TableCell className="py-3.5 text-right text-sm tabular-nums text-slate-900">
                              {Number(p.selling_price || p.price || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-3.5 text-right text-sm tabular-nums text-slate-900">
                              {stock.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-right">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "rounded-md px-2 py-0.5 text-xs font-medium",
                                  stock > LOW_STOCK_THRESHOLD ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"
                                )}
                              >
                                {stock > LOW_STOCK_THRESHOLD ? 'In stock' : stock === 0 ? 'Out of stock' : 'Low'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                  {filteredStock.map((p: any) => {
                    const stock = Number(p.stock_quantity ?? 0);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-900">{p.products?.name || p.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {p.sku || '—'} · {Number(p.selling_price || p.price || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums text-slate-900">{stock}</p>
                          {stock <= LOW_STOCK_THRESHOLD ? (
                            <p className="text-xs text-amber-700">{stock === 0 ? 'Out' : 'Low'}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDispenseModalOpen} onOpenChange={setIsDispenseModalOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Dispense</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">
              {selectedScript ? `${drugNameOf(selectedScript)} · ${patientNameOf(selectedScript)}` : ''}
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Amount due</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{money(dispenseTotal)}</p>
            </div>

            {patientAllergies.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                  <p className="text-sm text-red-900">
                    Allergies on file: <span className="font-medium">{patientAllergies.join(', ')}</span>
                  </p>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox
                    checked={allergyAcknowledged}
                    onCheckedChange={(v) => setAllergyAcknowledged(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-red-900">
                    I have checked this medication against the allergies listed
                  </span>
                </label>
              </div>
            ) : null}

            {dispenseStockShort ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-sm text-amber-900">
                  Only {Number(selectedScript?.product_variants?.stock_quantity ?? 0)} in stock but{' '}
                  {selectedScript?.quantity_prescribed} prescribed. Restock before dispensing.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">
                Dispensed by <span className="text-red-600">*</span>
              </Label>
              <Input
                value={attendantName}
                onChange={e => setAttendantName(e.target.value)}
                placeholder="Full name"
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Batch number</Label>
              <Input
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                placeholder="LOT-2026-A114"
                className="h-11 rounded-lg border-slate-200 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'Insurance' ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">
                  Claim reference <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={insuranceClaimRef}
                  onChange={e => setInsuranceClaimRef(e.target.value)}
                  placeholder="Approval or claim number"
                  className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                />
              </div>
            ) : null}

            {paymentMethod === 'Cash' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Cash received</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={amountTendered}
                    onChange={e => setAmountTendered(e.target.value)}
                    placeholder="0"
                    className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Change</Label>
                  <div className={cn(
                    "flex h-11 items-center rounded-lg border px-3 text-sm tabular-nums",
                    dispenseChangeDue !== null && dispenseChangeDue < 0
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  )}>
                    {dispenseChangeDue !== null ? money(dispenseChangeDue) : '—'}
                  </div>
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-4 py-3">
              <Checkbox
                checked={idVerified}
                onCheckedChange={(v) => setIdVerified(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-600">
                I confirmed who I am handing this medication to
                <span className="text-red-600"> *</span>
              </span>
            </label>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsDispenseModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => dispenseMutation.mutate()}
              disabled={dispenseMutation.isPending || !canConfirmDispense}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {dispenseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Dispense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOtcModalOpen} onOpenChange={setIsOtcModalOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Counter sale</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">Medication sold without a prescription</p>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Customer name</Label>
              <Input
                placeholder="Leave blank for walk-in"
                value={otcForm.patient_name}
                onChange={e => setOtcForm({ ...otcForm, patient_name: e.target.value })}
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">
                Medication <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search medication"
                  value={otcSearch}
                  onChange={e => setOtcSearch(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 pl-9 text-sm"
                />
              </div>
              <Select value={otcForm.variant_id} onValueChange={id => setOtcForm({ ...otcForm, variant_id: id })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                  <SelectValue placeholder="Select medication" />
                </SelectTrigger>
                <SelectContent className="max-h-72 rounded-lg">
                  {filteredOtcInventory.length ? (
                    filteredOtcInventory.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.products?.name || p.name}
                        <span className="ml-2 text-xs text-slate-400">
                          {Number(p.stock_quantity ?? 0)} left
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-400">No medication found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Quantity</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={otcForm.quantity}
                  onChange={e => setOtcForm({ ...otcForm, quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Batch number</Label>
                <Input
                  value={otcForm.batch_number}
                  onChange={e => setOtcForm({ ...otcForm, batch_number: e.target.value })}
                  placeholder="LOT-2026-A114"
                  className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                />
              </div>
            </div>

            {otcStockShort ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-sm text-amber-900">
                  Only {Number(otcSelectedVariant?.stock_quantity ?? 0)} left in stock.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Instructions</Label>
              <Input
                placeholder="1 tablet three times a day after meals"
                value={otcForm.dosage_instruction}
                onChange={e => setOtcForm({ ...otcForm, dosage_instruction: e.target.value })}
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">
                Sold by <span className="text-red-600">*</span>
              </Label>
              <Input
                value={attendantName}
                onChange={e => setAttendantName(e.target.value)}
                placeholder="Full name"
                className="h-11 rounded-lg border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Payment method</Label>
              <Select value={otcForm.payment_method} onValueChange={v => setOtcForm({ ...otcForm, payment_method: v })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {otcForm.payment_method === 'Insurance' ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">
                  Claim reference <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={otcForm.insurance_claim_ref}
                  onChange={e => setOtcForm({ ...otcForm, insurance_claim_ref: e.target.value })}
                  placeholder="Approval or claim number"
                  className="h-11 rounded-lg border-slate-200 font-mono text-sm"
                />
              </div>
            ) : null}

            {otcForm.payment_method === 'Cash' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Cash received</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={otcForm.amount_tendered}
                    onChange={e => setOtcForm({ ...otcForm, amount_tendered: e.target.value })}
                    placeholder="0"
                    className="h-11 rounded-lg border-slate-200 text-sm tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Change</Label>
                  <div className={cn(
                    "flex h-11 items-center rounded-lg border px-3 text-sm tabular-nums",
                    otcChangeDue !== null && otcChangeDue < 0
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  )}>
                    {otcChangeDue !== null ? money(otcChangeDue) : '—'}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-semibold tabular-nums text-slate-900">{money(otcTotal)}</span>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsOtcModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => processOtcDispenseMutation.mutate()}
              disabled={processOtcDispenseMutation.isPending || !canConfirmOtc}
              className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
            >
              {processOtcDispenseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Complete sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Void prescription</DialogTitle>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {selectedScript ? `${drugNameOf(selectedScript)} · ${patientNameOf(selectedScript)}` : ''}
            </p>
          </DialogHeader>

          <div className="space-y-4 px-5 py-6">
            <p className="text-sm text-slate-600">
              This removes the prescription from the queue. No stock is deducted and no sale is recorded. The reason is kept on the record.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">
                Reason <span className="text-red-600">*</span>
              </Label>
              <Textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Duplicate order, patient declined, prescribing error"
                className="min-h-[90px] resize-none rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4">
            <Button
              variant="ghost"
              onClick={() => setIsVoidModalOpen(false)}
              className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => voidPrescriptionMutation.mutate()}
              disabled={voidPrescriptionMutation.isPending || !voidReason.trim()}
              className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 sm:flex-none sm:px-6"
            >
              {voidPrescriptionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}