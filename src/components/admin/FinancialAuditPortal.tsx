"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  DollarSign, Mail, MessageSquare, AlertCircle, 
  CheckCircle2, Search, Filter, Loader2, SendHorizontal,
  ChevronRight
} from 'lucide-react';

// Standard Shadcn/UI or similar component library imports
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// --- Types ---
interface AuditRecord {
  tenant_id: string;
  organization: string;
  subscription_plan: string;
  user_count: number;
  expected_monthly_usd: number;
  actually_paid_30d: number;
  email: string;
  phone: string;
}

type CommunicationChannel = 'EMAIL' | 'WHATSAPP';

export default function FinancialAuditPortal() {
  // State Management
  const [auditData, setAuditData] = useState<AuditRecord[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action State
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<CommunicationChannel | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // 1. Data Fetching with Abort Controller logic
  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('view_admin_financial_audit')
        .select('*')
        .order('expected_monthly_usd', { ascending: false });

      if (dbError) throw dbError;
      setAuditData(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit data');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // 2. Computed Values
  const filteredData = useMemo(() => {
    return auditData.filter(d => 
      d.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [auditData, searchQuery]);

  const stats = useMemo(() => {
    const totalExpected = auditData.reduce((acc, curr) => acc + curr.expected_monthly_usd, 0);
    const totalActual = auditData.reduce((acc, curr) => acc + curr.actually_paid_30d, 0);
    const leakageCount = auditData.filter(d => d.actually_paid_30d < d.expected_monthly_usd).length;
    return { totalExpected, totalActual, leakageCount };
  }, [auditData]);

  // 3. Selection Handlers
  const toggleAll = () => {
    if (selectedTenants.size === filteredData.length) {
      setSelectedTenants(new Set());
    } else {
      setSelectedTenants(new Set(filteredData.map(d => d.tenant_id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedTenants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTenants(next);
  };

  // 4. Bulk Actions Logic
  const handleDispatch = async () => {
    if (!activeChannel || !messageContent.trim()) return;
    
    setIsProcessing(true);
    try {
      const recipients = auditData
        .filter((d) => selectedTenants.has(d.tenant_id))
        .map((d) => ({ 
          email: d.email, 
          phone: d.phone, 
          org: d.organization 
        }));

      const { error: fnError } = await supabase.functions.invoke('sovereign-broadcaster', {
        body: {
          action: 'send_bulk_comms',
          payload: {
            channel: activeChannel,
            content: messageContent,
            recipients,
          },
        },
      });

      if (fnError) throw fnError;

      // Reset UI on success
      setIsMsgModalOpen(false);
      setMessageContent('');
      setSelectedTenants(new Set());
      // In production, use a proper Toast library here (e.g., sonner)
      console.log('Success: Mass directive dispatched');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch messages');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header & High-Level Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Live Financial Matrix</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">
              AUDIT<span className="text-blue-600">_TERMINAL</span>
            </h1>
          </div>
          
          <div className="flex gap-8 mt-8">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Pipeline</p>
              <p className="text-2xl font-mono font-bold text-white">${stats.totalExpected.toLocaleString()}</p>
            </div>
            <div className="h-10 w-[1px] bg-white/10 self-end" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Leakage (Tenants)</p>
              <p className="text-2xl font-mono font-bold text-red-500">{stats.leakageCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden group">
          <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-4">Quick Actions</p>
          <div className="space-y-3 relative z-10">
            <Button 
              onClick={() => { setActiveChannel('EMAIL'); setIsMsgModalOpen(true); }}
              disabled={selectedTenants.size === 0}
              className="w-full bg-white text-blue-600 font-bold hover:bg-slate-100 transition-all"
            >
              <Mail size={16} className="mr-2" /> Email Selected ({selectedTenants.size})
            </Button>
            <Button 
              onClick={() => { setActiveChannel('WHATSAPP'); setIsMsgModalOpen(true); }}
              disabled={selectedTenants.size === 0}
              className="w-full bg-slate-950 text-white font-bold hover:bg-black transition-all"
            >
              <MessageSquare size={16} className="mr-2" /> WhatsApp Crisis Ping
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-white/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <Input 
            placeholder="Search organizations or emails..." 
            className="pl-10 bg-black/40 border-white/10 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-lg border border-white/5">
            <Checkbox 
              id="select-all"
              checked={selectedTenants.size === filteredData.length && filteredData.length > 0}
              onCheckedChange={toggleAll}
            />
            <label htmlFor="select-all" className="text-[10px] font-black uppercase text-slate-400 cursor-pointer">
              Select Visible
            </label>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAudit} className="text-slate-400 hover:text-white">
            <Loader2 size={14} className={cn("mr-2", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {/* Audit List */}
      <div className="space-y-3">
        {loading ? (
           [...Array(5)].map((_, i) => (
            <div key={i} className="h-24 w-full bg-slate-900/50 animate-pulse rounded-2xl border border-white/5" />
           ))
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
            <Filter size={40} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold italic">No matching records found in the current buffer.</p>
          </div>
        ) : (
          filteredData.map((row) => (
            <div
              key={row.tenant_id}
              className={cn(
                "group relative p-6 bg-slate-900/40 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6",
                selectedTenants.has(row.tenant_id) ? "border-blue-500/50 bg-blue-500/5" : "border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center gap-6">
                <Checkbox 
                  checked={selectedTenants.has(row.tenant_id)}
                  onCheckedChange={() => toggleOne(row.tenant_id)}
                />
                <div>
                  <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    {row.organization}
                    <ChevronRight size={14} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-[9px] uppercase font-black bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {row.subscription_plan}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      {row.user_count} Seats Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12 ml-10 md:ml-0">
                <div className="min-w-[100px]">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Contractual</p>
                  <p className="font-mono text-white font-bold">${row.expected_monthly_usd.toLocaleString()}</p>
                </div>
                <div className="min-w-[100px]">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Settled (30d)</p>
                  <p className={cn(
                    "font-mono font-bold",
                    row.actually_paid_30d >= row.expected_monthly_usd ? "text-emerald-400" : "text-red-500"
                  )}>
                    ${row.actually_paid_30d.toLocaleString()}
                  </p>
                </div>
                <div className="hidden lg:block min-w-[140px] text-right">
                  {row.actually_paid_30d < row.expected_monthly_usd ? (
                    <span className="inline-flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase italic animate-in slide-in-from-right-4">
                      <AlertCircle size={12} /> Leakage Found
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase">
                      <CheckCircle2 size={12} /> Healthy
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Communications Modal (Replacing Prompt) */}
      <Dialog open={isMsgModalOpen} onOpenChange={setIsMsgModalOpen}>
        <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter italic">
              Dispatch {activeChannel} Directive
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              You are sending a mass communication to {selectedTenants.size} tenant(s). This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea 
              placeholder={`Enter the ${activeChannel} message content...`}
              className="min-h-[150px] bg-black/40 border-white/10 text-white focus:ring-blue-600"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMsgModalOpen(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button 
              onClick={handleDispatch} 
              disabled={isProcessing || !messageContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <SendHorizontal size={16} className="mr-2" />}
              Execute Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Utility helper
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}