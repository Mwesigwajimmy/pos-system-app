import React, { Suspense } from 'react';
import { 
  MessageSquare, Zap, Bot, ShieldCheck, Fingerprint, Loader2, Activity 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnifiedCommsHub from "@/components/management/UnifiedCommsHub";
import AgenticDraftsPanel from "@/components/procurement/AgenticDraftsPanel";
import { Badge } from "@/components/ui/badge";

export default async function CommsCommandPage() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-8 max-w-[1600px] animate-in fade-in duration-700">
      <div className="flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Fingerprint className="w-10 h-10 text-primary" />
              Comms Command
            </h1>
            <p className="text-slate-500 max-w-2xl font-medium">
              Autonomous Communication Hub. Managing real-time supplier handshakes, 
              agentic reorder suggestions, and multi-channel encrypted threads.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg">
                <Zap size={14} className="text-emerald-400 fill-current animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Autonomous Handshake: ACTIVE</span>
             </div>
             <p className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">
                Kernel Interface v10.2.4-stable
             </p>
          </div>
        </div>

        {/* AI Agent Status Banner */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-4">
           <div className="bg-white p-2 rounded-lg shadow-sm">
              <Bot size={24} className="text-primary" />
           </div>
           <div className="text-sm">
              <span className="font-bold text-primary block uppercase text-[10px] tracking-widest">AI Agent Status</span>
              <p className="text-slate-600">The <strong>Sourcing Orchestrator</strong> is currently monitoring active stock variants for reorder thresholds.</p>
           </div>
           <Badge variant="outline" className="ml-auto border-primary/20 text-primary bg-white flex gap-2 py-1 px-3">
              <Activity size={12} className="animate-spin" />
              Scanning Real-time
           </Badge>
        </div>

        <Tabs defaultValue="live_hub" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-12">
              <TabsTrigger value="live_hub" className="rounded-lg font-bold flex gap-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <MessageSquare size={16} /> Live Comms Hub
              </TabsTrigger>
              <TabsTrigger value="agentic_drafts" className="rounded-lg font-bold flex gap-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Zap size={16} className="text-emerald-500" /> Agentic Suggestions
              </TabsTrigger>
            </TabsList>
            
            <div className="hidden md:flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
               <ShieldCheck size={14} className="text-emerald-500" /> 
               Encrypted Protocol: TLS 1.3
            </div>
          </div>

          <TabsContent value="live_hub" className="outline-none">
            <Suspense fallback={<div className="h-[80vh] w-full bg-slate-50 animate-pulse rounded-xl border border-slate-100" />}>
              <UnifiedCommsHub />
            </Suspense>
          </TabsContent>

          <TabsContent value="agentic_drafts" className="outline-none">
            <Suspense fallback={<div className="h-[60vh] w-full bg-slate-50 animate-pulse rounded-xl" />}>
              <div className="grid gap-6">
                <AgenticDraftsPanel />
                <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center space-y-2 opacity-50">
                   <Zap size={32} className="mx-auto text-slate-200" />
                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Agentic Sourcing History (24h)</p>
                   <p className="text-[10px] text-slate-300">Suggestions are auto-purged after approval to maintain Ledger Parity.</p>
                </div>
              </div>
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}