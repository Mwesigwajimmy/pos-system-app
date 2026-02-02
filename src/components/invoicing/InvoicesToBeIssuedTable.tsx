"use client";

import React, { useEffect, useState } from 'react';
import { Eye, Edit, Send, Loader2, AlertCircle, CheckCircle2, User, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  // Relational join from our audit
  customers: {
    name: string;
  }
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function InvoicesToBeIssuedTable({ tenantId, locale = 'en-UG' }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, total, currency, status, created_at,
          customers ( name )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['DRAFT', 'PENDING_APPROVAL'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data as any);
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchDrafts();
  }, [tenantId]);

  // --- THE AUTONOMOUS INTERCONNECT LOGIC ---
  const handleIssueInvoice = async (id: string) => {
    setIssuingId(id);
    try {
      // Logic: Changing status to 'ISSUED' fires the backend trigger 
      // we built (trg_enterprise_invoice_ledger) which handles the 1:1 Ledger entry.
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'ISSUED' })
        .eq('id', id);

      if (error) throw error;

      toast.success("Invoice Issued & Ledger Sealed Successfully");
      // Refresh list to remove the issued invoice
      await fetchDrafts();
    } catch (err: any) {
      toast.error(`Workflow Error: ${err.message}`);
    } finally {
      setIssuingId(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'UGX' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="animate-spin h-8 w-8 mb-2" />
        <p className="text-sm font-medium">Scanning for unissued drafts...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-5 font-bold text-slate-900 dark:text-slate-200 uppercase text-[10px] tracking-widest">Reference</th>
              <th className="px-6 py-5 font-bold text-slate-900 dark:text-slate-200 uppercase text-[10px] tracking-widest">Customer Entity</th>
              <th className="px-6 py-5 font-bold text-slate-900 dark:text-slate-200 uppercase text-[10px] tracking-widest text-right">Value</th>
              <th className="px-6 py-5 font-bold text-slate-900 dark:text-slate-200 uppercase text-[10px] tracking-widest">Workflow State</th>
              <th className="px-6 py-5 font-bold text-slate-900 dark:text-slate-200 uppercase text-[10px] tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition duration-150 group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-black text-blue-700 dark:text-blue-400 font-mono">
                            {invoice.invoice_number || 'DRAFT-ID-' + invoice.id.toString().substring(0,4)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                            Created: {new Date(invoice.created_at).toLocaleDateString()}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-slate-300" />
                        <span className="text-slate-900 dark:text-slate-200 font-bold">
                            {invoice.customers?.name || 'Walk-in Client'}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black font-mono text-slate-900 dark:text-white">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-tighter">
                        <Clock className="w-3 h-3 mr-1" /> {invoice.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/${locale}/invoicing/invoice/${invoice.id}`}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition"
                      >
                        <Eye size={18} />
                      </Link>
                      
                      <button 
                        onClick={() => handleIssueInvoice(invoice.id)}
                        disabled={issuingId === invoice.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                      >
                        {issuingId === invoice.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                        Issue Now
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-24">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-200" />
                    <p className="text-slate-500 font-bold text-lg">Queue Clear</p>
                    <p className="text-sm text-slate-400 mt-1">All invoices have been issued and synced to the ledger.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}