"use client";

import React, { useState } from 'react';
import { Landmark, Receipt, X, Save, Loader2, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unpaidInvoices: any[];
  bankAccounts: any[]; // Filtered by Code 1000 in parent
  businessId: string;
}

export default function PaymentRegistry({ isOpen, onClose, unpaidInvoices, bankAccounts, businessId }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    invoiceId: '',
    accountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER'
  });

  const handleSettlement = async () => {
    if (!form.invoiceId || !form.accountId || !form.amount) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('payments').insert({
        business_id: businessId,
        invoice_id: parseInt(form.invoiceId),
        account_id: form.accountId,
        amount: parseFloat(form.amount),
        payment_date: form.date,
        method: form.method
      });

      if (error) throw error;

      toast.success("Invoice Settlement Complete");
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Settlement Registry</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Direct Ledger Handshake</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Target Invoice (Unpaid Balance)</Label>
              <select 
                value={form.invoiceId}
                onChange={(e) => setForm({...form, invoiceId: e.target.value})}
                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none transition-all"
              >
                <option value="">Select Invoice...</option>
                {unpaidInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.customer_name} (Bal: {inv.balance_due.toLocaleString()} {inv.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Recipient Account (Code 1000)</Label>
              <select 
                value={form.accountId}
                onChange={(e) => setForm({...form, accountId: e.target.value})}
                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none transition-all"
              >
                <option value="">Select Bank/Cash Account...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount Received</Label>
                 <Input 
                   type="number" 
                   value={form.amount}
                   onChange={(e) => setForm({...form, amount: e.target.value})}
                   className="h-12 border-2 border-slate-100 rounded-xl font-mono font-bold text-lg" 
                   placeholder="0.00"
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Date</Label>
                 <Input 
                   type="date" 
                   value={form.date}
                   onChange={(e) => setForm({...form, date: e.target.value})}
                   className="h-12 border-2 border-slate-100 rounded-xl font-bold" 
                 />
               </div>
            </div>
          </div>

          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
             <ArrowUpRight className="text-emerald-600 mt-1 shrink-0" size={18} />
             <p className="text-[11px] text-emerald-900 font-bold leading-relaxed uppercase tracking-tight">
               Recording this settlement will automatically decrease Account 1210 (Receivables) and increase the selected Asset account in the General Ledger.
             </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 font-black uppercase text-[10px] tracking-widest text-slate-400">Abort</Button>
          <Button 
            onClick={handleSettlement}
            disabled={isSubmitting}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Commit Settlement'}
          </Button>
        </div>
      </div>
    </div>
  );
}