"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Mail, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinancialAuditPortal() {
  const [auditData, setAuditData] = useState<any[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchAudit = async () => {
      const { data } = await supabase.from('view_admin_financial_audit').select('*');
      setAuditData(data || []);
    };
    fetchAudit();
  }, []);

  const handleBulkMessage = async (channel: 'EMAIL' | 'WHATSAPP') => {
    const content = prompt(`Enter ${channel} content for ${selectedTenants.length} tenants:`);
    if (!content) return;

    // Call the Edge Function
    const { error } = await supabase.functions.invoke('sovereign-broadcaster', {
      body: { 
        action: 'send_bulk_comms', 
        payload: { 
          channel, 
          content,
          recipients: auditData.filter(d => selectedTenants.includes(d.tenant_id)).map(d => ({ email: d.email, phone: d.phone }))
        } 
      }
    });

    if (!error) alert("Mass directive dispatched.");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5">
         <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Financial Audit Terminal</h3>
            <p className="text-xs text-slate-500 font-bold uppercase">Expected vs. Actual Cash Flow</p>
         </div>
         <div className="flex gap-2">
            <Button onClick={() => handleBulkMessage('EMAIL')} className="bg-blue-600 font-bold"><Mail size={16} className="mr-2"/> Email All</Button>
            <Button onClick={() => handleBulkMessage('WHATSAPP')} className="bg-emerald-600 font-bold"><MessageSquare size={16} className="mr-2"/> WhatsApp All</Button>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {auditData.map((row) => (
          <div key={row.tenant_id} className="p-6 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
             <div className="flex items-center gap-4">
                <input 
                  type="checkbox" 
                  onChange={(e) => e.target.checked 
                    ? setSelectedTenants([...selectedTenants, row.tenant_id]) 
                    : setSelectedTenants(selectedTenants.filter(id => id !== row.tenant_id))
                  }
                  className="rounded border-slate-800 bg-slate-950 text-blue-600"
                />
                <div>
                   <p className="font-black text-white uppercase tracking-tight">{row.organization}</p>
                   <p className="text-[10px] text-slate-500">Plan: {row.subscription_plan} • {row.user_count} Users</p>
                </div>
             </div>

             <div className="flex gap-12">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Expected</p>
                    <p className="font-mono text-slate-300 font-bold">${row.expected_monthly_usd}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Paid (30d)</p>
                    <p className={`font-mono font-bold ${row.actually_paid_30d >= row.expected_monthly_usd ? 'text-emerald-400' : 'text-red-500'}`}>
                        ${row.actually_paid_30d}
                    </p>
                </div>
             </div>

             <div className="text-right">
                {row.actually_paid_30d < row.expected_monthly_usd ? (
                  <div className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase italic animate-pulse">
                     <AlertCircle size={10} /> Leakage Detected
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase">
                     <CheckCircle2 size={10} /> Account Solid
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}