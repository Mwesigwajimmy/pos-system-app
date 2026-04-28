"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, Mail, MessageSquare, AlertCircle, 
  CheckCircle2, Search, Filter, Loader2, SendHorizontal,
  ChevronRight, ArrowUpRight, TrendingUp, ShieldCheck, 
  Fingerprint, Landmark, Receipt
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

// Internal Libs
import { createClient } from '@/lib/supabase/client';

/**
 * DEEPLY DEFINED UTILITY: cn (Class Name Merger)
 * Defined locally to ensure zero external dependency issues.
 */
function cn(...inputs: (string | undefined | boolean | null | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (typeof input === 'string') return input;
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([_, value]) => value)
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}

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

  // 1. Data Fetching with Abort Controller logic (Untouched Logic)
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

  // 4. Bulk Actions Logic (Untouched Logic)
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

      setIsMsgModalOpen(false);
      setMessageContent('');
      setSelectedTenants(new Set());
      console.log('Success: Mass directive dispatched');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch messages');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-10 animate-in fade-in duration-1000 bg-[#f8fafc] p-10 rounded-[3rem] min-h-screen font-sans">
      
      {/* 1. TOP HEADER & KPI CARDS (CLEAN WHITE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                <TrendingUp size={18} className="text-blue-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 leading-none">Live Revenue Ledger</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
              AUDIT<span className="text-blue-600">_TERMINAL</span>
            </h1>
            <p className="text-slate-400 font-bold text-sm mt-3 flex items-center gap-2">
              <Landmark size={14} className="text-slate-300" />
              Institutional financial health monitoring and revenue synchronization.
            </p>
          </div>
          
          <div className="flex gap-16 mt-16">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Projected Pipeline</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black text-slate-300 tracking-tighter">$</span>
                <p className="text-4xl font-mono font-black text-slate-900 tracking-tight">{stats.totalExpected.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-16 w-[1px] bg-slate-100 self-center" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Leakage Points</p>
              <div className="flex items-center gap-3">
                <p className="text-4xl font-mono font-black text-red-500 tracking-tight">{stats.leakageCount}</p>
                <div className="px-3 py-1 bg-red-50 rounded-lg">
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Action Required</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 rounded-[3rem] p-12 text-white shadow-2xl shadow-blue-100 relative overflow-hidden flex flex-col justify-between group">
          <DollarSign className="absolute -right-8 -top-8 w-48 h-48 text-white/10 rotate-12 transition-transform duration-700 group-hover:rotate-0" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
                <Receipt size={16} className="text-blue-100" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">Mass Directives</p>
            </div>
            <div className="space-y-4">
              <Button 
                onClick={() => { setActiveChannel('EMAIL'); setIsMsgModalOpen(true); }}
                disabled={selectedTenants.size === 0}
                className="w-full h-16 bg-white text-blue-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-50 transition-all border-none shadow-lg active:scale-95"
              >
                <Mail size={16} className="mr-3" /> Email Selected ({selectedTenants.size})
              </Button>
              <Button 
                onClick={() => { setActiveChannel('WHATSAPP'); setIsMsgModalOpen(true); }}
                disabled={selectedTenants.size === 0}
                className="w-full h-16 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-black transition-all border-none shadow-lg active:scale-95"
              >
                <MessageSquare size={16} className="mr-3" /> WhatsApp Ping
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-8 relative z-10 opacity-70">
            <Fingerprint size={14} className="text-blue-200" />
            <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest">Authorized Dispatch Only</p>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER BAR (CLEAN WHITE) */}
      <div className="flex flex-col md:flex-row gap-5 items-center justify-between bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-[450px]">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <Input 
            placeholder="Search by organization, ID or administrator email..." 
            className="h-14 pl-14 bg-slate-50 border-none text-slate-900 font-bold placeholder:text-slate-300 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Checkbox 
              id="select-all"
              checked={selectedTenants.size === filteredData.length && filteredData.length > 0}
              onCheckedChange={toggleAll}
              className="w-5 h-5 rounded-md"
            />
            <label htmlFor="select-all" className="text-[10px] font-black uppercase text-slate-400 cursor-pointer tracking-[0.2em] leading-none">
              Select Visible
            </label>
          </div>
          <Button 
            variant="ghost" 
            onClick={fetchAudit} 
            className="h-14 px-6 text-slate-400 hover:text-blue-600 font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 transition-all rounded-2xl"
          >
            <Loader2 size={16} className={cn("mr-2", loading && "animate-spin")} /> Refresh Buffer
          </Button>
        </div>
      </div>

      {/* 3. THE AUDIT LEDGER LIST (ELITE UI) */}
      <div className="space-y-5">
        {loading ? (
           [...Array(5)].map((_, i) => (
            <div key={i} className="h-32 w-full bg-white animate-pulse rounded-[2.5rem] border border-slate-100" />
           ))
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
                <Filter size={48} className="text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">No records detected in current stream</p>
          </div>
        ) : (
          filteredData.map((row) => (
            <div
              key={row.tenant_id}
              className={cn(
                "group relative p-10 bg-white rounded-[3rem] border transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-10",
                selectedTenants.has(row.tenant_id) 
                    ? "border-blue-500 ring-8 ring-blue-500/5 shadow-xl" 
                    : "border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-lg hover:-translate-y-1"
              )}
            >
              <div className="flex items-center gap-10">
                <Checkbox 
                  checked={selectedTenants.has(row.tenant_id)}
                  onCheckedChange={() => toggleOne(row.tenant_id)}
                  className="w-6 h-6 rounded-lg border-2"
                />
                <div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    {row.organization}
                    <ArrowUpRight size={18} className="text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </h4>
                  <div className="flex items-center gap-5 mt-3">
                    <Badge className="text-[9px] uppercase font-black bg-slate-900 text-white border-none px-4 py-1.5 rounded-full tracking-widest">
                      {row.subscription_plan}
                    </Badge>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {row.user_count} Seats Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-20 ml-16 md:ml-0">
                <div className="min-w-[140px]">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 leading-none">Contractual</p>
                  <div className="flex items-baseline gap-1">
                      <span className="text-[10px] font-black text-slate-300">$</span>
                      <p className="font-mono text-slate-900 font-black text-xl leading-none">{row.expected_monthly_usd.toLocaleString()}</p>
                  </div>
                </div>
                <div className="min-w-[140px]">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 leading-none">Settled (30d)</p>
                  <div className="flex items-baseline gap-1">
                      <span className="text-[10px] font-black text-slate-300">$</span>
                      <p className={cn(
                        "font-mono font-black text-xl leading-none",
                        row.actually_paid_30d >= row.expected_monthly_usd ? "text-emerald-500" : "text-red-500"
                      )}>
                        {row.actually_paid_30d.toLocaleString()}
                      </p>
                  </div>
                </div>
                <div className="hidden lg:flex min-w-[200px] flex-col items-end">
                  {row.actually_paid_30d < row.expected_monthly_usd ? (
                    <div className="flex items-center gap-3 text-red-500 bg-red-50 px-5 py-2.5 rounded-2xl border border-red-100">
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Leakage Detected</span>
                      <AlertCircle size={16} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Fully Verified</span>
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. COMMUNICATIONS MODAL (ELITE CLEAN) */}
      <Dialog open={isMsgModalOpen} onOpenChange={setIsMsgModalOpen}>
        <DialogContent className="bg-white border-none rounded-[4rem] p-12 max-w-xl shadow-2xl animate-in zoom-in-95">
          <DialogHeader>
            <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <SendHorizontal size={24} className="text-blue-600" />
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">
              {activeChannel} DIRECTIVE
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold mt-4 leading-relaxed">
              Initiating mass dispatching to {selectedTenants.size} tenant(s). Payload will be synchronized via the Sovereign Audit Security Bridge.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-10">
            <Textarea 
              placeholder={`Construct the ${activeChannel} message directive...`}
              className="min-h-[250px] bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-slate-900 font-bold p-8 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner placeholder:text-slate-300"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsMsgModalOpen(false)} 
              className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] h-14 px-10 rounded-2xl hover:text-slate-900 transition-colors"
            >
              Abort Signal
            </Button>
            <Button 
              onClick={handleDispatch} 
              disabled={isProcessing || !messageContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] h-14 px-12 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin mr-3" /> : <SendHorizontal size={18} className="mr-3" />}
              Execute Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SYSTEM FOOTER */}
      <div className="flex items-center justify-between px-10 opacity-40">
          <div className="flex items-center gap-3">
              <ShieldCheck size={14} className="text-slate-900" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-900">Sovereign Audit v10.2</span>
          </div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Protocol Secured • Audit Handshake Active</p>
      </div>
    </div>
  );
}