'use client';

/**
 * --- BBU1 SOVEREIGN ROBOTIC PHARMACY & DISPENSARY CONSOLE ---
 * VERSION: v12.5 OMEGA (DIRECT OTC BILLING & THERMAL LABEL PRINTING WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Health System
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

import { 
  Pill, CheckCircle2, ShoppingCart, Clock, 
  ShieldCheck, Loader2, Search, Plus, 
  Printer, FileText, AlertTriangle, User, 
  DollarSign, Activity, CreditCard, Lock, 
  PackageCheck, Sparkles, RefreshCw, Trash2,
  Building2, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PharmacyConsoleProps {
  tenantId: string;
}

const supabase = createClient();

export default function PharmacyConsole({ tenantId }: PharmacyConsoleProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // --- MODAL STATES ---
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isOtcModalOpen, setIsOtcModalOpen] = useState(false);

  // --- PAYMENT SELECTION STATE ---
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // --- OTC DIRECT SALE FORM STATE ---
  const [otcForm, setOtcForm] = useState({
    patient_name: 'Walk-in Client',
    variant_id: '',
    dosage_instruction: '1 tab 3x daily after meals x 5 days',
    quantity: 1,
    payment_method: 'Cash'
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

  // 2. DATA: Pull Pending Prescriptions
  const { data: pendingScripts, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pending_prescriptions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_prescriptions')
        .select(`
          *,
          medical_patients(full_name, patient_uid, gender),
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
        .update({ status: 'dispensed' })
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
          status: 'dispensed'
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
        payment_method: 'Cash'
      });
      queryClient.invalidateQueries({ queryKey: ['dispensed_prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharma_inventory_console'] });
    },
    onError: (e: any) => toast.error(`OTC Sale Failed: ${e.message}`)
  });

  // PRINT 50x25mm THERMAL PRESCRIPTION LABEL (jsPDF + BWIP-JS)
  const printThermalLabel = (script: any) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
      const drugName = script.product_variants?.products?.name || script.product_variants?.name || 'Medication';
      const patientName = script.medical_patients?.full_name || 'Walk-in Client';

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
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
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <Button onClick={() => printThermalLabel(s)} variant="outline" size="sm" className="h-11 px-4 font-bold border-slate-200 rounded-xl text-slate-700">
                          <Printer size={16} className="mr-1.5 text-blue-600" /> Label
                        </Button>

                        <Button 
                          onClick={() => { setSelectedScript(s); setIsDispenseModalOpen(true); }}
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
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-12">
                    <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Patient Subject</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Dispensed Medication</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Dosage Instructions</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Qty</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-500">Status</TableHead>
                    <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDispensedLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-emerald-600"/> Loading Dispensed Audit...</TableCell></TableRow>
                  ) : dispensedScripts?.map(s => (
                    <TableRow key={s.id} className="h-16">
                      <TableCell className="pl-8 font-bold text-slate-900">{s.medical_patients?.full_name || 'Walk-in Client'}</TableCell>
                      <TableCell className="font-bold text-blue-600 text-xs">{s.product_variants?.products?.name || s.product_variants?.name || 'Medication'}</TableCell>
                      <TableCell className="text-xs italic text-slate-600 font-medium">{s.dosage_instruction}</TableCell>
                      <TableCell className="font-bold text-xs">{s.quantity_prescribed}</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[9px] uppercase">DISPENSED & SEALED</Badge></TableCell>
                      <TableCell className="text-right pr-8">
                        <Button onClick={() => printThermalLabel(s)} variant="ghost" size="sm" className="h-8 px-3 font-bold rounded-lg text-slate-600">
                          <Printer size={14} className="mr-1 text-blue-600" /> Reprint Label
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PHARMACEUTICAL STOCK MONITOR */}
        <TabsContent value="stock">
          <Card className="border border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="px-8 py-6 bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-bold text-slate-900">Live Pharmaceutical Inventory Monitor</CardTitle>
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
                  {pharmaInventory?.map(p => (
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

          <div className="p-8 space-y-6 bg-white">
            <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Medication Fee</p>
              <h3 className="text-3xl font-black text-emerald-600">
                {businessCurrency} {(Number(selectedScript?.product_variants?.selling_price || selectedScript?.product_variants?.price || 0) * Number(selectedScript?.quantity_prescribed || 1)).toLocaleString()}
              </h3>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-400 uppercase">Payment Channel *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            <Button variant="ghost" onClick={() => setIsDispenseModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => dispenseMutation.mutate()} disabled={dispenseMutation.isPending} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
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

          <div className="p-8 space-y-6 bg-white">
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
                <Label className="text-[10px] font-bold uppercase text-slate-400">Payment Channel</Label>
                <Select value={otcForm.payment_method} onValueChange={v => setOtcForm({ ...otcForm, payment_method: v })}>
                  <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash" className="font-bold">Cash</SelectItem>
                    <SelectItem value="MTN MoMo" className="font-bold text-amber-600">MTN MoMo</SelectItem>
                    <SelectItem value="Airtel Money" className="font-bold text-rose-600">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Dosage / Usage Instruction</Label>
              <Input value={otcForm.dosage_instruction} onChange={e => setOtcForm({ ...otcForm, dosage_instruction: e.target.value })} className="h-11 rounded-xl font-bold" />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsOtcModalOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => processOtcDispenseMutation.mutate()} disabled={processOtcDispenseMutation.isPending} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {processOtcDispenseMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Complete OTC Dispense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}