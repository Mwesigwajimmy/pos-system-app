'use client';

/**
 * --- BBU1 SOVEREIGN ROBOTIC PHARMACY & DISPENSARY CONSOLE ---
 * VERSION: v13.0 OMEGA (SAFETY-GATED DISPENSING + VOID LEDGER + FACILITY NAV)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Health System
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import bwipjs from 'bwip-js';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Pill, CheckCircle2, Clock,
  Loader2, Search, Plus,
  Printer, FileText, AlertTriangle, User,
  DollarSign, Activity, Lock,
  PackageCheck, RefreshCw, Trash2,
  Building2, ShieldAlert, ChevronRight, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PharmacyConsoleProps {
  tenantId: string;
}

const supabase = createClient();

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash Payment', color: '' },
  { value: 'MTN MoMo', label: 'MTN Mobile Money', color: 'text-amber-600' },
  { value: 'Airtel Money', label: 'Airtel Money', color: 'text-rose-600' },
  { value: 'Bank', label: 'Bank Transfer', color: '' },
  { value: 'Insurance', label: 'Insurance Claim', color: '' },
];

export default function PharmacyConsole({ tenantId }: PharmacyConsoleProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // --- MODAL STATES ---
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isOtcModalOpen, setIsOtcModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  // --- PAYMENT SELECTION STATE (Dispense modal) ---
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // --- SHARED DISPENSING SAFETY / AUDIT STATE ---
  const [attendantName, setAttendantName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [insuranceClaimRef, setInsuranceClaimRef] = useState('');
  const [idVerified, setIdVerified] = useState(false);
  const [allergyAcknowledged, setAllergyAcknowledged] = useState(false);

  // --- VOID FORM STATE ---
  const [voidReason, setVoidReason] = useState('');

  // --- OTC DIRECT SALE FORM STATE ---
  const [otcForm, setOtcForm] = useState({
    patient_name: 'Walk-in Client',
    variant_id: '',
    dosage_instruction: '1 tab 3x daily after meals x 5 days',
    quantity: 1,
    payment_method: 'Cash',
    batch_number: '',
    insurance_claim_ref: '',
    amount_tendered: ''
  });

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_pharmacy', tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id || tenantId;

  // Prefill the attending pharmacist name from the signed-in profile
  useEffect(() => {
    if (profile?.full_name && !attendantName) {
      setAttendantName(profile.full_name);
    }
  }, [profile]);

  // 2. DATA: Pull Pending Prescriptions (now includes patient allergies for the dispensing safety check)
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

  // 3. DATA: Pull Dispensed Prescriptions History
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

  // 4. DATA: Pull Pharmaceutical Inventory (For OTC & Stock Check)
  const { data: pharmaInventory } = useQuery({
    queryKey: ['pharma_inventory_console', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, price, selling_price, cost_price, stock_quantity, products(name)')
        .eq('is_active', true)
        .order('name');
      if (error) return [];
      return data || [];
    }
  });

  // FILTERED PENDING PRESCRIPTIONS
  const filteredPending = useMemo(() => {
    if (!pendingScripts) return [];
    return pendingScripts.filter(s =>
      s.medical_patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.product_variants?.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.dosage_instruction?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingScripts, searchTerm]);

  // FILTERED STOCK LIST
  const filteredStock = useMemo(() => {
    if (!pharmaInventory) return [];
    return pharmaInventory.filter(p =>
      p.name?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      p.products?.name?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(stockSearchTerm.toLowerCase())
    );
  }, [pharmaInventory, stockSearchTerm]);

  // QUICK HEADER METRICS (derived client-side, no new backend calls)
  const lowStockCount = useMemo(() => pharmaInventory?.filter(p => (p.stock_quantity ?? 0) <= 10).length || 0, [pharmaInventory]);
  const todaysRevenue = useMemo(() => {
    if (!dispensedScripts) return 0;
    const todayStr = new Date().toDateString();
    return dispensedScripts
      .filter(s => new Date(s.created_at).toDateString() === todayStr)
      .reduce((sum, s) => {
        const price = Number(s.product_variants?.selling_price || s.product_variants?.price || 0);
        return sum + price * Number(s.quantity_prescribed || 1);
      }, 0);
  }, [dispensedScripts]);

  // DERIVED: Dispense modal totals & safety gate state
  const dispenseTotal = useMemo(() => {
    const drugPrice = Number(selectedScript?.product_variants?.selling_price || selectedScript?.product_variants?.price || 0);
    return drugPrice * Number(selectedScript?.quantity_prescribed || 1);
  }, [selectedScript]);

  const dispenseChangeDue = useMemo(() => {
    const tendered = Number(amountTendered);
    if (!amountTendered || isNaN(tendered)) return null;
    return tendered - dispenseTotal;
  }, [amountTendered, dispenseTotal]);

  const patientAllergies: string[] = selectedScript?.medical_patients?.allergies || [];
  const dispenseStockShort = selectedScript ? (selectedScript.product_variants?.stock_quantity ?? 0) < Number(selectedScript.quantity_prescribed || 1) : false;

  const canConfirmDispense = idVerified
    && attendantName.trim().length > 0
    && (patientAllergies.length === 0 || allergyAcknowledged)
    && !dispenseStockShort
    && (paymentMethod !== 'Insurance' || insuranceClaimRef.trim().length > 0);

  // OTC derived state
  const otcSelectedVariant = useMemo(() => pharmaInventory?.find(p => String(p.id) === otcForm.variant_id), [pharmaInventory, otcForm.variant_id]);
  const otcTotal = useMemo(() => Number(otcSelectedVariant?.selling_price || otcSelectedVariant?.price || 0) * Number(otcForm.quantity || 0), [otcSelectedVariant, otcForm.quantity]);
  const otcStockShort = otcSelectedVariant ? Number(otcForm.quantity || 0) > (otcSelectedVariant.stock_quantity ?? 0) : false;
  const otcChangeDue = useMemo(() => {
    const tendered = Number(otcForm.amount_tendered);
    if (!otcForm.amount_tendered || isNaN(tendered)) return null;
    return tendered - otcTotal;
  }, [otcForm.amount_tendered, otcTotal]);

  const canConfirmOtc = attendantName.trim().length > 0
    && !!otcForm.variant_id
    && !otcStockShort
    && (otcForm.payment_method !== 'Insurance' || otcForm.insurance_claim_ref.trim().length > 0);

  // MUTATION 1: Dispense & Deduct Stock + Post Direct Revenue Ledger Handshake
  const dispenseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScript) throw new Error("No prescription selected.");

      const variantId = selectedScript.variant_id;
      const qtyPrescribed = Number(selectedScript.quantity_prescribed || 1);
      const drugPrice = Number(selectedScript.product_variants?.selling_price || selectedScript.product_variants?.price || 0);
      const totalCost = drugPrice * qtyPrescribed;

      // 1. Update Prescription Status to Dispensed
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

      // 2. Deduct Inventory Stock via process_stock_adjustment_v2
      if (variantId) {
        await supabase.rpc('process_stock_adjustment_v2', {
          p_variant_id: variantId,
          p_qty_change: -Math.abs(qtyPrescribed),
          p_reason: 'Sync: Pharmacy Dispensing'
        });
      }

      // 3. Post Accounting Transaction to General Ledger
      if (totalCost > 0) {
        const v_receipt_no = `PHARM-RCT-${Date.now().toString().slice(-6)}`;
        const { data: v_cash_acc } = await supabase.from('accounting_accounts').select('id').eq('business_id', activeBusinessId).eq('code', '1000').maybeSingle();
        const { data: v_rev_acc } = await supabase.from('accounting_accounts').select('id').eq('business_id', activeBusinessId).eq('code', '4000').maybeSingle();
        const { data: v_j_id } = await supabase.from('accounting_journals').select('id').eq('business_id', activeBusinessId).eq('code', 'GEN').maybeSingle();

        if (v_j_id?.id && v_cash_acc?.id && v_rev_acc?.id) {
          const v_tx_id = crypto.randomUUID();
          await supabase.from('accounting_transactions').insert([{
            id: v_tx_id,
            business_id: activeBusinessId,
            journal_id: v_j_id.id,
            date: new Date().toISOString().split('T')[0],
            reference: v_receipt_no,
            description: `Pharmaceutical Dispensing Revenue (${paymentMethod})`,
            state: 'posted',
            currency: businessCurrency
          }]);

          await supabase.from('accounting_journal_entries').insert([
            { business_id: activeBusinessId, transaction_id: v_tx_id, account_id: v_cash_acc.id, debit: totalCost, credit: 0, description: 'Pharmacy Cash Inflow' },
            { business_id: activeBusinessId, transaction_id: v_tx_id, account_id: v_rev_acc.id, debit: 0, credit: totalCost, description: 'Medication Sales Revenue Recognized' }
          ]);
        }
      }
    },
    onSuccess: () => {
      toast.success("Prescription Dispensed & Inventory Reconciled!");
      setIsDispenseModalOpen(false);
      resetDispenseSafetyState();
      queryClient.invalidateQueries({ queryKey: ['pending_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    },
    onError: (e: any) => toast.error(`Dispensing Failed: ${e.message}`)
  });

  // MUTATION 2: Process Direct Over-The-Counter (OTC) Walk-in Dispense
  const processOtcDispenseMutation = useMutation({
    mutationFn: async () => {
      if (!otcForm.variant_id) throw new Error("Please select a medication.");
      if (otcForm.quantity <= 0) throw new Error("Quantity must be greater than zero.");

      const selectedVariant = pharmaInventory?.find(p => String(p.id) === otcForm.variant_id);
      if (!selectedVariant) throw new Error("Selected medication not found.");

      const totalCost = Number(selectedVariant.selling_price || selectedVariant.price || 0) * otcForm.quantity;

      // 1. Insert Prescription Record
      const { data: newScript, error: scriptErr } = await supabase
        .from('medical_prescriptions')
        .insert([{
          tenant_id: tenantId,
          business_id: activeBusinessId,
          variant_id: Number(otcForm.variant_id),
          dosage_instruction: otcForm.dosage_instruction,
          quantity_prescribed: otcForm.quantity,
          status: 'dispensed',
          walk_in_patient_name: otcForm.patient_name || null,
          dispensed_by: attendantName || null,
          batch_number: otcForm.batch_number || null,
          insurance_claim_ref: otcForm.payment_method === 'Insurance' ? otcForm.insurance_claim_ref : null
        }])
        .select()
        .single();

      if (scriptErr) throw scriptErr;

      // 2. Deduct Inventory Stock
      await supabase.rpc('process_stock_adjustment_v2', {
        p_variant_id: Number(otcForm.variant_id),
        p_qty_change: -Math.abs(otcForm.quantity),
        p_reason: 'Sync: OTC Pharmacy Dispensing'
      });

      // 3. Post Accounting Transaction to General Ledger
      if (totalCost > 0) {
        const v_receipt_no = `OTC-RCT-${Date.now().toString().slice(-6)}`;
        const { data: v_cash_acc } = await supabase.from('accounting_accounts').select('id').eq('business_id', activeBusinessId).eq('code', '1000').maybeSingle();
        const { data: v_rev_acc } = await supabase.from('accounting_accounts').select('id').eq('business_id', activeBusinessId).eq('code', '4000').maybeSingle();
        const { data: v_j_id } = await supabase.from('accounting_journals').select('id').eq('business_id', activeBusinessId).eq('code', 'GEN').maybeSingle();

        if (v_j_id?.id && v_cash_acc?.id && v_rev_acc?.id) {
          const v_tx_id = crypto.randomUUID();
          await supabase.from('accounting_transactions').insert([{
            id: v_tx_id,
            business_id: activeBusinessId,
            journal_id: v_j_id.id,
            date: new Date().toISOString().split('T')[0],
            reference: v_receipt_no,
            description: `OTC Direct Medication Sale (${otcForm.payment_method})`,
            state: 'posted',
            currency: businessCurrency
          }]);

          await supabase.from('accounting_journal_entries').insert([
            { business_id: activeBusinessId, transaction_id: v_tx_id, account_id: v_cash_acc.id, debit: totalCost, credit: 0, description: 'OTC Cash Inflow' },
            { business_id: activeBusinessId, transaction_id: v_tx_id, account_id: v_rev_acc.id, debit: 0, credit: totalCost, description: 'OTC Revenue Recognized' }
          ]);
        }
      }
    },
    onSuccess: () => {
      toast.success("OTC Direct Sale Dispensed & Sealed!");
      setIsOtcModalOpen(false);
      setOtcForm({
        patient_name: 'Walk-in Client',
        variant_id: '',
        dosage_instruction: '1 tab 3x daily after meals x 5 days',
        quantity: 1,
        payment_method: 'Cash',
        batch_number: '',
        insurance_claim_ref: '',
        amount_tendered: ''
      });
      queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    },
    onError: (e: any) => toast.error(`OTC Sale Failed: ${e.message}`)
  });

  // MUTATION 3: Void a Pending Prescription (new — additive, does not alter the dispensing mutations above)
  const voidPrescriptionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScript) throw new Error("No prescription selected.");
      if (!voidReason.trim()) throw new Error("A void reason is required for the audit trail.");

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
      toast.success("Prescription Voided & Logged");
      setIsVoidModalOpen(false);
      setVoidReason('');
      queryClient.invalidateQueries({ queryKey: ['pending_prescriptions'] });
    },
    onError: (e: any) => toast.error(`Void Failed: ${e.message}`)
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
    toast.success("Dispensary Queue Refreshed");
  }

  // PRINT 50x25mm THERMAL PRESCRIPTION LABEL (jsPDF + BWIP-JS)
  const printThermalLabel = (script: any) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
      const drugName = script.product_variants?.products?.name || script.product_variants?.name || 'Medication';
      const patientName = script.medical_patients?.full_name || script.walk_in_patient_name || 'Walk-in Client';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text((profile?.business_name || "BBU1 PHARMACY").toUpperCase(), 25, 4, { align: 'center' });

      doc.setFontSize(8);
      doc.text(drugName.toUpperCase().substring(0, 22), 25, 8, { align: 'center' });

      doc.setFontSize(6);
      doc.text(`Patient: ${patientName.substring(0, 20)}`, 25, 12, { align: 'center' });
      doc.text(`Instructions: ${script.dosage_instruction.substring(0, 25)}`, 25, 16, { align: 'center' });
      doc.text(`Qty: ${script.quantity_prescribed} | Date: ${new Date().toLocaleDateString()}`, 25, 20, { align: 'center' });

      doc.setFontSize(5);
      doc.text("Keep out of reach of children", 25, 23, { align: 'center' });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("Thermal Label Sent to Printer!");
    } catch (err: any) {
      toast.error(`Print Failed: ${err.message}`);
    }
  };

  // PRINT FULL A5 RECEIPT (jsPDF + autoTable) — new, separate from the thermal label above
  const printFullReceipt = (script: any) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const drugName = script.product_variants?.products?.name || script.product_variants?.name || 'Medication';
      const patientName = script.medical_patients?.full_name || script.walk_in_patient_name || 'Walk-in Client';
      const drugPrice = Number(script.product_variants?.selling_price || script.product_variants?.price || 0);
      const totalCost = drugPrice * Number(script.quantity_prescribed || 1);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text((profile?.business_name || "BBU1 MEDICAL CENTER").toUpperCase(), 74, 14, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("PHARMACY DISPENSING RECEIPT", 74, 20, { align: 'center' });
      doc.text(`Date: ${new Date(script.created_at || Date.now()).toLocaleString()}`, 74, 25, { align: 'center' });
      doc.line(10, 29, 138, 29);

      autoTable(doc, {
        startY: 34,
        head: [['Patient', 'UID', 'Dispensed By']],
        body: [[patientName, script.medical_patients?.patient_uid || 'WALK-IN', script.dispensed_by || attendantName || 'N/A']],
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 }
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Medication', 'Batch No.', 'Qty', `Unit (${businessCurrency})`, `Total (${businessCurrency})`]],
        body: [[drugName, script.batch_number || 'N/A', String(script.quantity_prescribed), drugPrice.toLocaleString(), totalCost.toLocaleString()]],
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 }
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Instructions']],
        body: [[script.dosage_instruction]],
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 }
      });

      doc.setFontSize(7);
      doc.text("This is a system-generated receipt. Retain for insurance / accounting purposes.", 74, (doc as any).lastAutoTable.finalY + 10, { align: 'center' });

      doc.save(`Receipt_${script.medical_patients?.patient_uid || 'OTC'}_${Date.now()}.pdf`);
      toast.success("Full Receipt Generated!");
    } catch (err: any) {
      toast.error(`Receipt Generation Failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/50">

      {/* ---------------------------------------------------------------- */}
      {/* FACILITY NAVIGATION BAR — persistent utility bar for context switching */}
      {/* ---------------------------------------------------------------- */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shrink-0">
              <Building2 size={16} className="text-white" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 text-sm">
              <span className="font-bold text-white truncate max-w-[160px]">
                {profile?.business_name || 'Clinical Facility'}
              </span>
              <ChevronRight size={14} className="text-slate-600 shrink-0" />
              <span className="text-slate-400 font-medium hidden sm:inline">Pharmacy</span>
              <ChevronRight size={14} className="text-slate-600 shrink-0 hidden sm:inline" />
              <span className="text-slate-200 font-semibold">Dispensary Console</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleRefresh} className="hidden md:flex h-8 items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>

            <button className="hidden md:flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-900 hover:text-white transition-colors">
              <Bell size={15} />
            </button>

            <div className="flex items-center gap-2 rounded-md bg-slate-900 py-1 pl-1 pr-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700">
                <User size={12} className="text-slate-300" />
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden lg:inline max-w-[140px] truncate">
                {attendantName || 'Pharmacist'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in duration-500 p-6 lg:p-8 pb-20">

        {/* 1. TOP HEADER & METRICS */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
              <Pill size={16} /> Pharmaceutical Dispensing Node
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Robotic Dispensary Console</h1>
            <p className="text-sm font-medium text-slate-500">Facility: {profile?.business_name || 'Central Pharmacy Terminal'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* QUICK METRICS */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <DollarSign size={16} className="text-emerald-600" />
              <div>
                <p className="text-[9px] font-black uppercase text-emerald-700 tracking-wide">Today's Revenue</p>
                <p className="text-sm font-black text-emerald-900">{businessCurrency} {todaysRevenue.toLocaleString()}</p>
              </div>
            </div>
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-2xl">
                <AlertTriangle size={16} className="text-rose-600" />
                <div>
                  <p className="text-[9px] font-black uppercase text-rose-700 tracking-wide">Low Stock Items</p>
                  <p className="text-sm font-black text-rose-900">{lowStockCount} Medications</p>
                </div>
              </div>
            )}

            <Button onClick={() => setIsOtcModalOpen(true)} className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200">
              <Plus size={18} className="mr-2" /> Direct OTC Dispense
            </Button>
          </div>
        </div>

        {/* 2. TABS & FILTER NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 max-w-md w-full shadow-inner">
            <TabsTrigger value="pending" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
              <Clock size={16} className="mr-2 text-amber-600" /> Pending ({pendingScripts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="dispensed" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
              <CheckCircle2 size={16} className="mr-2 text-emerald-600" /> History ({dispensedScripts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
              <Activity size={16} className="mr-2 text-blue-600" /> Stock
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PENDING PRESCRIPTIONS */}
          <TabsContent value="pending">
            <Card className="border border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="px-8 py-6 bg-slate-50/50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Pill className="text-emerald-600" size={20} /> Active Clinical Prescriptions Queue
                  </CardTitle>
                  <CardDescription className="text-xs">Real-time dispensing queue sent directly from doctor encounters</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search patient or medication..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-10 rounded-xl" />
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {isPendingLoading ? (
                  <div className="py-20 text-center"><Loader2 className="animate-spin inline mr-2 text-emerald-600"/> Synchronizing Dispensary Ledger...</div>
                ) : filteredPending?.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-bold uppercase tracking-widest text-xs">
                    <PackageCheck size={48} className="mx-auto mb-3 opacity-30" /> No Pending Prescriptions Queue
                  </div>
                ) : (
                  filteredPending?.map(s => {
                    const drugName = s.product_variants?.products?.name || s.product_variants?.name || 'Prescribed Medication';
                    const availableStock = s.product_variants?.stock_quantity ?? 0;
                    const drugPrice = Number(s.product_variants?.selling_price || s.product_variants?.price || 0);
                    const totalPrice = drugPrice * Number(s.quantity_prescribed || 1);
                    const scriptAllergies: string[] = s.medical_patients?.allergies || [];

                    return (
                      <div key={s.id} className="p-6 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all bg-white shadow-sm">
                        <div className="flex items-start gap-5">
                          <div className="p-4 bg-emerald-100 rounded-2xl text-emerald-700 shrink-0 border border-emerald-200">
                            <Pill size={24} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-base">{s.medical_patients?.full_name || 'Walk-in Subject'}</h4>
                            <p className="text-xs font-black text-blue-600 uppercase">{drugName} <span className="text-slate-400 font-normal">({s.product_variants?.name})</span></p>
                            <p className="text-xs text-slate-600 font-medium italic">"{s.dosage_instruction}"</p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-200">
                                Prescribed Qty: {s.quantity_prescribed}
                              </Badge>
                              <Badge className={cn("border-none text-[10px] font-bold uppercase px-2.5 py-0.5", availableStock >= s.quantity_prescribed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                                Store Stock: {availableStock} {availableStock < s.quantity_prescribed && 'LOW STOCK'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100 uppercase font-bold">
                                Est. Fee: {businessCurrency} {totalPrice.toLocaleString()}
                              </Badge>
                              {scriptAllergies.length > 0 && (
                                <Badge className="bg-rose-600 text-white border-none text-[10px] font-bold uppercase px-2.5 py-0.5 animate-pulse">
                                  <ShieldAlert size={11} className="mr-1" /> Allergy on File
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <Button onClick={() => printThermalLabel(s)} variant="outline" size="sm" className="h-11 px-4 font-bold border-slate-200 rounded-xl text-slate-700">
                            <Printer size={16} className="mr-1.5 text-blue-600" /> Label
                          </Button>

                          <Button onClick={() => openVoidModal(s)} variant="ghost" size="icon" className="h-11 w-11 text-slate-400 hover:text-rose-600 rounded-xl">
                            <Trash2 size={16} />
                          </Button>

                          <Button
                            onClick={() => openDispenseModal(s)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-emerald-100"
                          >
                            <CheckCircle2 className="mr-2" size={18} /> DISPENSE & COLLECT
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: DISPENSED HISTORY */}
          <TabsContent value="dispensed">
            <Card className="border border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="px-8 py-6 bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-bold text-slate-900">Dispensed Medication Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-12">
                        <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Patient Subject</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-500">Dispensed Medication</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-500">Batch No.</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-500">Dispensed By</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-500">Qty</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-500">Status</TableHead>
                        <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDispensedLoading ? (
                        <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-emerald-600"/> Loading Dispensed Audit...</TableCell></TableRow>
                      ) : dispensedScripts?.map(s => (
                        <TableRow key={s.id} className="h-16">
                          <TableCell className="pl-8 font-bold text-slate-900">{s.medical_patients?.full_name || s.walk_in_patient_name || 'Walk-in Client'}</TableCell>
                          <TableCell className="font-bold text-blue-600 text-xs">{s.product_variants?.products?.name || s.product_variants?.name || 'Medication'}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-500">{s.batch_number || 'N/A'}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-600">{s.dispensed_by || 'N/A'}</TableCell>
                          <TableCell className="font-bold text-xs">{s.quantity_prescribed}</TableCell>
                          <TableCell><Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[9px] uppercase">DISPENSED & SEALED</Badge></TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-1">
                              <Button onClick={() => printThermalLabel(s)} variant="ghost" size="sm" className="h-8 px-3 font-bold rounded-lg text-slate-600">
                                <Printer size={14} className="mr-1 text-blue-600" /> Label
                              </Button>
                              <Button onClick={() => printFullReceipt(s)} variant="ghost" size="sm" className="h-8 px-3 font-bold rounded-lg text-slate-600">
                                <FileText size={14} className="mr-1 text-emerald-600" /> Receipt
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

          {/* TAB 3: PHARMACEUTICAL STOCK MONITOR */}
          <TabsContent value="stock">
            <Card className="border border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="px-8 py-6 bg-slate-50/50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg font-bold text-slate-900">Live Pharmaceutical Inventory Monitor</CardTitle>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search medication or SKU..." value={stockSearchTerm} onChange={e => setStockSearchTerm(e.target.value)} className="pl-10 h-10 rounded-xl" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-12">
                      <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Medication Designation</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">SKU / Code</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Unit Rate ({businessCurrency})</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Available Stock</TableHead>
                      <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500 pr-8">Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs font-bold text-slate-400">No medications match this search.</TableCell></TableRow>
                    ) : filteredStock?.map(p => (
                      <TableRow key={p.id} className="h-16">
                        <TableCell className="pl-8 font-bold text-slate-900">{p.products?.name || p.name} ({p.name})</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-400 uppercase">{p.sku}</TableCell>
                        <TableCell className="text-right font-black text-sm">{Number(p.selling_price || p.price).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-black text-sm text-blue-600">{p.stock_quantity?.toLocaleString()}</TableCell>
                        <TableCell className="text-center pr-8">
                          <Badge className={cn("border-none text-[9px] font-bold uppercase px-3 py-1", p.stock_quantity > 10 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                            {p.stock_quantity > 10 ? 'HEALTHY' : 'LOW STOCK'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: CONFIRM DISPENSING & COLLECT PAYMENT */}
      {/* ==================================================================== */}
      <Dialog open={isDispenseModalOpen} onOpenChange={setIsDispenseModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Dispense & Collect Payment</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">
              {selectedScript?.medical_patients?.full_name || 'Walk-in Client'}
            </DialogDescription>
          </div>

          <ScrollArea className="max-h-[70vh] bg-white">
            <div className="p-8 space-y-5">
              <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Medication Fee</p>
                <h3 className="text-3xl font-black text-emerald-600">
                  {businessCurrency} {dispenseTotal.toLocaleString()}
                </h3>
              </div>

              {/* ALLERGY SAFETY WARNING */}
              {patientAllergies.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-xs font-bold text-rose-900">
                      Patient has known allergies on file: <span className="uppercase">{patientAllergies.join(', ')}</span>. Confirm this medication is safe before dispensing.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 pl-1 cursor-pointer">
                    <Checkbox checked={allergyAcknowledged} onCheckedChange={(v: boolean) => setAllergyAcknowledged(!!v)} />
                    <span className="text-[11px] font-bold text-rose-800">I have verified this medication does not conflict with the listed allergies</span>
                  </label>
                </div>
              )}

              {/* STOCK SHORTFALL WARNING */}
              {dispenseStockShort && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-900">
                    Available stock ({selectedScript?.product_variants?.stock_quantity ?? 0}) is below the prescribed quantity ({selectedScript?.quantity_prescribed}). Restock before dispensing.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Dispensing Pharmacist *</Label>
                <Input value={attendantName} onChange={e => setAttendantName(e.target.value)} placeholder="Full name of dispensing pharmacist" className="h-11 rounded-xl font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Batch / Lot Number</Label>
                <Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g. LOT-2026-A114" className="h-11 rounded-xl font-mono font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase">Payment Channel *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value} className={cn("font-bold", m.color)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'Insurance' && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase">Insurance Claim / Approval Ref *</Label>
                  <Input value={insuranceClaimRef} onChange={e => setInsuranceClaimRef(e.target.value)} placeholder="Approval or claim reference number" className="h-11 rounded-xl font-mono font-bold" />
                </div>
              )}

              {paymentMethod === 'Cash' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Amount Tendered</Label>
                    <Input type="number" value={amountTendered} onChange={e => setAmountTendered(e.target.value)} placeholder="0" className="h-11 rounded-xl font-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase">Change Due</Label>
                    <div className={cn("h-11 rounded-xl flex items-center px-3 font-black text-sm", dispenseChangeDue !== null && dispenseChangeDue < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-700")}>
                      {dispenseChangeDue !== null ? `${businessCurrency} ${dispenseChangeDue.toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={idVerified} onCheckedChange={(v: boolean) => setIdVerified(!!v)} />
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><Lock size={12} /> Patient identity verified before dispensing *</span>
                </label>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsDispenseModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => dispenseMutation.mutate()} disabled={dispenseMutation.isPending || !canConfirmDispense} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1 disabled:opacity-40">
              {dispenseMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Confirm Dispense & Collect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: DIRECT OVER-THE-COUNTER (OTC) WALK-IN DISPENSE */}
      {/* ==================================================================== */}
      <Dialog open={isOtcModalOpen} onOpenChange={setIsOtcModalOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest">Direct OTC Walk-in Dispense</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">Dispense medication directly without doctor encounter</DialogDescription>
          </div>

          <ScrollArea className="max-h-[70vh] bg-white">
            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Client Identity / Name</Label>
                <Input placeholder="e.g. Walk-in Client" value={otcForm.patient_name} onChange={e => setOtcForm({ ...otcForm, patient_name: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Select Medication *</Label>
                <Select value={otcForm.variant_id} onValueChange={id => setOtcForm({ ...otcForm, variant_id: id })}>
                  <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
                    <SelectValue placeholder="Select Drug..." />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Quantity</Label>
                  <Input type="number" value={otcForm.quantity} onChange={e => setOtcForm({ ...otcForm, quantity: Number(e.target.value) })} className="h-11 rounded-xl font-bold text-blue-600" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Batch / Lot Number</Label>
                  <Input value={otcForm.batch_number} onChange={e => setOtcForm({ ...otcForm, batch_number: e.target.value })} placeholder="e.g. LOT-2026-A114" className="h-11 rounded-xl font-mono font-bold" />
                </div>
              </div>

              {otcStockShort && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-900">Requested quantity exceeds available stock ({otcSelectedVariant?.stock_quantity ?? 0} units left).</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Dispensing Pharmacist *</Label>
                <Input value={attendantName} onChange={e => setAttendantName(e.target.value)} placeholder="Full name of dispensing pharmacist" className="h-11 rounded-xl font-bold" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Channel</Label>
                <Select value={otcForm.payment_method} onValueChange={v => setOtcForm({ ...otcForm, payment_method: v })}>
                  <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value} className={cn("font-bold", m.color)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {otcForm.payment_method === 'Insurance' && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Insurance Claim / Approval Ref *</Label>
                  <Input value={otcForm.insurance_claim_ref} onChange={e => setOtcForm({ ...otcForm, insurance_claim_ref: e.target.value })} placeholder="Approval or claim reference number" className="h-11 rounded-xl font-mono font-bold" />
                </div>
              )}

              {otcForm.payment_method === 'Cash' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Amount Tendered</Label>
                    <Input type="number" value={otcForm.amount_tendered} onChange={e => setOtcForm({ ...otcForm, amount_tendered: e.target.value })} placeholder="0" className="h-11 rounded-xl font-black" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Change Due</Label>
                    <div className={cn("h-11 rounded-xl flex items-center px-3 font-black text-sm", otcChangeDue !== null && otcChangeDue < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-700")}>
                      {otcChangeDue !== null ? `${businessCurrency} ${otcChangeDue.toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Dosage / Usage Instruction</Label>
                <Input value={otcForm.dosage_instruction} onChange={e => setOtcForm({ ...otcForm, dosage_instruction: e.target.value })} className="h-11 rounded-xl font-bold" />
              </div>

              {otcTotal > 0 && (
                <div className="text-center py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Due</p>
                  <h3 className="text-2xl font-black text-emerald-600">{businessCurrency} {otcTotal.toLocaleString()}</h3>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsOtcModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => processOtcDispenseMutation.mutate()} disabled={processOtcDispenseMutation.isPending || !canConfirmOtc} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1 disabled:opacity-40">
              {processOtcDispenseMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Complete OTC Dispense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3: VOID A PENDING PRESCRIPTION */}
      {/* ==================================================================== */}
      <Dialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-rose-600 p-8 text-white text-center">
            <DialogTitle className="text-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Trash2 size={18} /> Void Prescription
            </DialogTitle>
            <DialogDescription className="text-rose-100 text-xs mt-1 uppercase font-medium">
              {selectedScript?.medical_patients?.full_name || 'Walk-in Client'} • {selectedScript?.product_variants?.name}
            </DialogDescription>
          </div>

          <div className="p-8 space-y-4 bg-white">
            <p className="text-xs font-medium text-slate-600">
              Voiding removes this prescription from the active dispensing queue without deducting stock or posting revenue. This action is logged for audit purposes.
            </p>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Reason for Void *</Label>
              <Textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="e.g. Duplicate order, patient declined, prescribing error..." className="min-h-[88px] rounded-2xl font-medium resize-none" />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsVoidModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => voidPrescriptionMutation.mutate()} disabled={voidPrescriptionMutation.isPending || !voidReason.trim()} className="h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1 disabled:opacity-40">
              {voidPrescriptionMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}