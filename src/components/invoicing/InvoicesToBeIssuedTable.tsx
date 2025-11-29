"use client";

import React, { useEffect, useState } from 'react';
import { Eye, Edit, Send, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Props {
  tenantId: string;
  locale?: string;
}

export default function InvoicesToBeIssuedTable({ tenantId, locale = 'en-US' }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchDrafts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['DRAFT', 'PENDING_APPROVAL']) // The Logic for "To Be Issued"
        .order('created_at', { ascending: false });

      if (data) setInvoices(data as any);
      setLoading(false);
    };
    fetchDrafts();
  }, [tenantId, supabase]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Invoice #</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Created</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Customer</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition duration-150">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(invoice.created_at).toLocaleDateString(locale)}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-200 font-medium">{invoice.customer_name}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{formatCurrency(invoice.total, invoice.currency)}</td>
                  <td className="px-6 py-4">
                     <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                        {invoice.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition" title="Preview"><Eye size={16} /></button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-green-600 transition" title="Edit"><Edit size={16} /></button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-purple-600 transition" title="Issue Now"><Send size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">No invoices waiting to be issued.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}