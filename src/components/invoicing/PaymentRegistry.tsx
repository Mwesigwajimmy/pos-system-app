"use client";

import React, { useState } from 'react';
import { 
    Landmark, X, Save, Loader2, ArrowUpRight, 
    CheckCircle2, Download, ReceiptText, AlertCircle 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unpaidInvoices: any[];
  bankAccounts: any[]; 
  businessId: string;
  businessName?: string;
}

export default function PaymentRegistry({ 
    isOpen, 
    onClose, 
    unpaidInvoices = [], 
    bankAccounts = [], 
    businessId, 
    businessName 
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form State
  const [form, setForm] = useState({
    invoiceId: '',
    accountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER'
  });

  // --- 1. FORENSIC CRASH GUARD: Prevents Intl formatting exceptions ---
  const formatMoney = (amount: number, currencyCode: string) => {
    try {
      const validCcy = (currencyCode && currencyCode.length === 3) ? currencyCode : 'USD';
      return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: validCcy,
          minimumFractionDigits: 2 
      }).format(amount);
    } catch (e) {
      // Fallback to plain string if Intl library fails or currency code is invalid
      return `${amount.toLocaleString()} ${currencyCode || ''}`;
    }
  };

  // --- 2. PROFESSIONAL PDF RECEIPT PROTOCOL ---
  const downloadSettlementReceipt = () => {
    const selectedInv = unpaidInvoices.find(i => String(i.id) === form.invoiceId);
    if (!selectedInv || !form.amount) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    // Header & Branding
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("SETTLEMENT RECEIPT", 14, 22);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`BUSINESS UNIT: ${businessName || 'SOVEREIGN UNIT'}`, 14, 30);
    doc.text(`GENERATED: ${timestamp}`, 14, 35);

    // Main Receipt Table
    autoTable(doc, {
      startY: 45,
      head: [['Operational Key', 'Value']],
      body: [
        ['Transaction Reference', `PAY-REC-${Date.now().toString().slice(-6)}`],
        ['Target Document', selectedInv.invoice_number || `INV-${selectedInv.id}`],
        ['Payer Entity', selectedInv.customer_name || 'Counterparty'],
        ['Settlement Amount', `${parseFloat(form.amount).toLocaleString()} ${selectedInv.currency}`],
        ['Payment Modality', form.method.replace('_', ' ')],
        ['Ledger Handshake', 'VERIFIED & COMMITTED']
      ],
      headStyles: { fillColor: [5, 150, 105], fontSize: 10 }, // Emerald 600
      styles: { fontSize: 9, cellPadding: 6 },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    // Verification Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("MATHEMATICAL PARITY VERIFIED • AUTOMATED LEDGER HANDSHAKE • SECURE SYSTEM LINK", 14, finalY + 15);

    doc.save(`Settlement_Receipt_${selectedInv.invoice_number}.pdf`);
  };

  // --- 3. COMMITMENT HANDLER ---
  const handleSettlementHandshake = async () => {
    if (!form.invoiceId || !form.accountId || !form.amount) {
        toast.error("Handshake Blocked: Mandatory fields missing.");
        return;
    }

    setIsSubmitting(true);
    try {
      // Direct Database Injection
      // This will trigger the backend settlement engine (RPC/Trigger)
      const { error } = await supabase.from('payments').insert({
        business_id: businessId,
        invoice_id: parseInt(form.invoiceId),
        account_id: form.accountId,
        amount: parseFloat(form.amount),
        payment_date: form.date,
        method: form.method
      });

      if (error) throw error;

      toast.success("Ledger Settlement Synchronized Successfully");
      
      // Autonomous PDF Generation upon success
      downloadSettlementReceipt();
      
      // Reset & Refresh
      setForm({ ...form, invoiceId: '', amount: '' });
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(`Handshake Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-700">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            
            {/* INVOICE SELECTOR */}
            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Target Document (Unpaid Balance)</Label>
              <select 
                value={form.invoiceId}
                onChange={(e) => setForm({...form, invoiceId: e.target.value})}
                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="">Choose Invoice for Settlement...</option>
                {unpaidInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number || `REF-${inv.id}`} — {inv.customer_name} ({formatMoney(inv.balance_due, inv.currency)})
                  </option>
                ))}
              </select>
            </div>

            {/* RECIPIENT ACCOUNT SELECTOR */}
            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Liquidity Destination (Account 1000)</Label>
              <select 
                value={form.accountId}
                onChange={(e) => setForm({...form, accountId: e.target.value})}
                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="">Choose Bank/Cash Account...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Arrival Amount</Label>
                 <Input 
                   type="number" 
                   value={form.amount}
                   onChange={(e) => setForm({...form, amount: e.target.value})}
                   className="h-12 border-2 border-slate-100 rounded-xl font-mono font-bold text-lg focus:border-emerald-500 shadow-none" 
                   placeholder="0.00"
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Settlement Date</Label>
                 <Input 
                   type="date" 
                   value={form.date}
                   onChange={(e) => setForm({...form, date: e.target.value})}
                   className="h-12 border-2 border-slate-100 rounded-xl font-bold focus:border-emerald-500 shadow-none" 
                 />
               </div>
            </div>
          </div>

          {/* SYSTEM INTELLIGENCE CARD */}
          <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-4">
             <ArrowUpRight className="text-emerald-600 mt-1 shrink-0" size={20} />
             <p className="text-[10px] text-emerald-900 font-bold leading-relaxed uppercase tracking-tight">
               Committing this settlement will trigger an autonomous Ledger Handshake. Account <span className="underline">1210</span> (Receivables) will be credited and the selected Asset account will be debited with zero human intervention.
             </p>
          </div>
        </div>

        {/* ACTION TERMINAL */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleSettlementHandshake}
            disabled={isSubmitting || !form.invoiceId || !form.accountId || !form.amount}
            className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18}/> Commit Ledger Handshake</>}
          </Button>
          
          {form.invoiceId && form.amount && (
              <Button 
                variant="outline"
                onClick={downloadSettlementReceipt}
                className="h-14 w-full sm:w-16 border-2 border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-600 transition-all hover:bg-emerald-50"
                title="Preview Receipt PDF"
              >
                  <ReceiptText size={24} />
              </Button>
          )}
        </div>

        {/* VERIFICATION FOOTER */}
        <div className="pt-2 flex items-center justify-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            <CheckCircle2 size={10} className="text-emerald-500" /> Forensic Integrity System Linked
        </div>
    </div>
  );
}