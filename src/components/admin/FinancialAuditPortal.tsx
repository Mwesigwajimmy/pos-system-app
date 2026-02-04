"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Mail, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinancialAuditPortal() {
  const [auditData, setAuditData] = useState<any[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // createClient might create a new client on each render — memoize it for this component render lifecycle
  const supabase = useMemo(() => createClient(), []);

  // Fetch audit view once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchAudit = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('view_admin_financial_audit')
          .select('*');

        if (dbError) {
          throw dbError;
        }

        if (!cancelled) {
          setAuditData(data || []);
          // Remove any selected ids that no longer exist in the dataset
          const currentIds = new Set((data || []).map((r: any) => r.tenant_id));
          setSelectedTenants((prev) => prev.filter((id) => currentIds.has(id)));
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAudit();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const toggleTenantSelection = useCallback((tenantId: string, checked: boolean) => {
    setSelectedTenants((prev) =>
      checked ? Array.from(new Set([...prev, tenantId])) : prev.filter((id) => id !== tenantId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTenants.length === auditData.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(auditData.map((r) => r.tenant_id));
    }
  }, [auditData, selectedTenants.length]);

  const handleBulkMessage = useCallback(
    async (channel: 'EMAIL' | 'WHATSAPP') => {
      if (selectedTenants.length === 0) {
        alert('No tenants selected.');
        return;
      }

      const content = prompt(`Enter ${channel} content for ${selectedTenants.length} tenants:`);
      if (!content) return;

      setSending(true);
      setError(null);
      try {
        const recipients = auditData
          .filter((d) => selectedTenants.includes(d.tenant_id))
          .map((d) => ({ email: d.email, phone: d.phone }));

        const { error: fnError } = await supabase.functions.invoke('sovereign-broadcaster', {
          body: {
            action: 'send_bulk_comms',
            payload: {
              channel,
              content,
              recipients,
            },
          },
        });

        if (fnError) throw fnError;

        alert('Mass directive dispatched.');
      } catch (err: any) {
        setError(err?.message ?? String(err));
        console.error(err);
        alert('Failed to dispatch mass directive: ' + (err?.message ?? String(err)));
      } finally {
        setSending(false);
      }
    },
    [auditData, selectedTenants, supabase]
  );

  const formatUsd = (v: any) => {
    const n = Number(v ?? 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Financial Audit Terminal</h3>
          <p className="text-xs text-slate-500 font-bold uppercase">Expected vs. Actual Cash Flow</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Use DollarSign icon (kept import and made meaningful) */}
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <DollarSign size={16} />
            <div>
              <div className="text-[10px] uppercase font-black text-slate-500">Total Tenants</div>
              <div className="font-bold text-white">{auditData.length}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleBulkMessage('EMAIL')} disabled={sending} className="bg-blue-600 font-bold">
              <Mail size={16} className="mr-2" /> Email All
            </Button>
            <Button onClick={() => handleBulkMessage('WHATSAPP')} disabled={sending} className="bg-emerald-600 font-bold">
              <MessageSquare size={16} className="mr-2" /> WhatsApp All
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-900/60 text-red-200 font-bold">
          Error: {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={selectedTenants.length === auditData.length && auditData.length > 0}
              onChange={() => handleSelectAll()}
              className="rounded border-slate-800 bg-slate-950 text-blue-600"
            />
            <span className="font-bold text-xs uppercase">Select All</span>
          </label>

          <div className="text-xs text-slate-400">
            {selectedTenants.length} selected
          </div>
        </div>

        <div className="text-xs text-slate-400">
          {loading ? 'Loading…' : `Loaded ${auditData.length} tenants`}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {auditData.map((row: any) => {
          const checked = selectedTenants.includes(row.tenant_id);
          return (
            <div
              key={row.tenant_id}
              className="p-6 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <input
                  aria-label={`Select ${row.organization}`}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleTenantSelection(row.tenant_id, e.target.checked)}
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
                  <p className="font-mono text-slate-300 font-bold">${formatUsd(row.expected_monthly_usd)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Paid (30d)</p>
                  <p
                    className={`font-mono font-bold ${
                      Number(row.actually_paid_30d) >= Number(row.expected_monthly_usd)
                        ? 'text-emerald-400'
                        : 'text-red-500'
                    }`}
                  >
                    ${formatUsd(row.actually_paid_30d)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {Number(row.actually_paid_30d) < Number(row.expected_monthly_usd) ? (
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
          );
        })}
      </div>
    </div>
  );
}