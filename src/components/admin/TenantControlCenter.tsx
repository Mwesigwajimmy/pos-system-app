"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, ShieldAlert, CreditCard, Send, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TenantControlCenter() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('tenants')
        .select('*, profiles(count)')
        .order('next_payment_date', { ascending: true });

      if (dbError) throw dbError;
      setTenants(data || []);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const filtered = useMemo(() => {
    if (!query) return tenants;
    const q = query.toLowerCase();
    return tenants.filter((t) =>
      (t.name ?? '').toLowerCase().includes(q) ||
      (t.business_type ?? '').toLowerCase().includes(q) ||
      (t.subscription_plan ?? '').toLowerCase().includes(q)
    );
  }, [tenants, query]);

  const sendMessage = useCallback(async (tid: string) => {
    const msg = prompt("Enter update/message for this tenant:");
    if (!msg) return;

    try {
      const { error } = await supabase.from('system_broadcasts').insert({
        target_tenant_id: tid,
        title: 'Architect Update',
        content: msg,
      });

      if (error) throw error;
      alert("Message Dispatched via Sovereign Bridge.");
      // Optionally refresh tenant list or status after sending
      loadTenants();
    } catch (err: any) {
      console.error(err);
      alert("Failed to dispatch message: " + (err?.message ?? String(err)));
    }
  }, [supabase, loadTenants]);

  const freezeAccount = useCallback(async (tid: string, name?: string) => {
    const ok = window.confirm(`Freeze account for ${name ?? tid}? This will immediately block tenant activity.`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('tenants').update({ status: 'frozen' }).eq('id', tid);
      if (error) throw error;
      alert('Tenant account frozen.');
      loadTenants();
    } catch (err: any) {
      console.error(err);
      alert("Failed to freeze account: " + (err?.message ?? String(err)));
    }
  }, [supabase, loadTenants]);

  return (
    <div className="bg-slate-900/40 rounded-[2rem] border border-white/5 p-8 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black uppercase flex items-center gap-2">
          <ShieldAlert className="text-red-500" /> Active Tenant Control
        </h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="text-slate-400" />
            <Input
              placeholder="Search tenants, plan, type..."
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
              className="w-64 bg-black/30 text-sm"
            />
          </div>
          <Button onClick={loadTenants} className="bg-blue-600">Refresh</Button>
        </div>
      </div>

      {loading && <div className="text-slate-400 mb-4">Loading tenants…</div>}
      {error && <div className="text-red-300 bg-red-900/10 p-3 rounded mb-4">{error}</div>}

      <div className="space-y-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between p-6 bg-black/40 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className={`h-3 w-3 rounded-full ${new Date(t.next_payment_date) < new Date() ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <div>
                <p className="font-black text-white uppercase">{t.name}</p>
                <p className="text-[10px] text-slate-500">
                  Next Pay: {t.next_payment_date ? new Date(t.next_payment_date).toLocaleDateString() : 'Unknown'} • {t.business_type}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" onClick={() => sendMessage(t.id)} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white">
                <Mail size={14} className="mr-2" /> Dispatch Message
              </Button>

              <Button size="sm" variant="ghost" onClick={() => freezeAccount(t.id, t.name)} className="bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white">
                <ShieldAlert size={14} className="mr-2" /> Freeze Account
              </Button>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <CreditCard size={14} className="text-slate-400" />
                <p className="text-sm font-black text-white">${t.last_payment_amount ?? '0'}</p>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase italic">Plan: {t.subscription_plan}</span>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-600 py-10 italic">No tenants match your search.</p>
        )}
      </div>
    </div>
  );
}