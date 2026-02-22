'use client';

import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, Send, Trash2, ShieldCheck, ShoppingCart, 
    Loader2, Box, ArrowRightLeft, UserCheck 
} from 'lucide-react';
import { toast } from 'sonner';

interface AgenticDraftsPanelProps {
  businessId: string;
}

export default function AgenticDraftsPanel({ businessId }: AgenticDraftsPanelProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Fetching Logic with Strict Tenancy Guard
  const { data: drafts, isLoading } = useQuery({
    queryKey: ['agenticDrafts', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_drafts')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId
  });

  // 2. Real-time Synchronization (Kernel v10.2 Feature)
  // Ensures drafts pop up immediately as stock falls low
  useEffect(() => {
    const channel = supabase
      .channel('agentic_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'communication_drafts',
        filter: `business_id=eq.${businessId}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['agenticDrafts', businessId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId, queryClient, supabase]);

  // 3. Handshake Execution (Approve)
  const approveMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('communication_drafts')
        .update({ status: 'sent', approved_at: new Date().toISOString() })
        .eq('id', draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agentic Handshake Executed", {
        description: "Procurement request dispatched to supplier.",
        icon: <ShieldCheck className="text-emerald-500" />
      });
    }
  });

  // 4. Dismiss Logic
  const dismissMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('communication_drafts')
        .update({ status: 'dismissed' })
        .eq('id', draftId);
      if (error) throw error;
    },
    onSuccess: () => {
        toast.info("Suggestion dismissed.");
    }
  });

  if (isLoading) return (
    <div className="space-y-4">
        <div className="h-12 w-full bg-slate-100 animate-pulse rounded-lg" />
        <div className="h-48 w-full bg-slate-50 animate-pulse rounded-lg border border-dashed" />
    </div>
  );

  return (
    <Card className="border-emerald-200 shadow-2xl shadow-emerald-500/5 overflow-hidden">
      <CardHeader className="bg-emerald-50/40 border-b pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="text-emerald-900 text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg shadow-lg">
                <Zap size={20} className="fill-white text-white animate-pulse" />
              </div>
              Agentic Sourcing Orchestrator
            </CardTitle>
            <CardDescription className="text-emerald-700/70 font-bold uppercase text-[10px] tracking-widest">
              Autonomous Inventory Intelligence Link
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
             <div className="bg-white border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-600 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                SYSTEM LIVE
             </div>
             <Badge className="bg-emerald-600 border-none px-4 py-1 font-mono tracking-tighter">KERNEL v10.2.4</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-[240px] font-bold text-[10px] uppercase text-slate-400">Pillar / Subject</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-400">Agentic Draft Content</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-slate-400">Trigger Origin</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-400">Operational Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                        <Box size={48} className="mb-4" />
                        <p className="font-black text-sm uppercase tracking-widest">Inventory Levels Healthy</p>
                        <p className="text-xs">No autonomous sourcing required.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                drafts?.map(draft => (
                  <TableRow key={draft.id} className="group hover:bg-emerald-50/40 transition-all border-b">
                    <TableCell className="font-black text-slate-800 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-md group-hover:bg-white transition-colors">
                           <ShoppingCart size={14} className="text-emerald-600" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs leading-tight">{draft.subject}</span>
                            <span className="text-[9px] text-slate-400 font-mono mt-1">Ref: {draft.id.substring(0,8).toUpperCase()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-sm leading-relaxed italic">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        "{draft.body}"
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-[9px] border-emerald-200 text-emerald-700 bg-emerald-50">
                             LOW_STOCK_TRIGGER
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(draft.created_at!).toLocaleTimeString()}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => dismissMutation.mutate(draft.id)}
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => approveMutation.mutate(draft.id)}
                          disabled={approveMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 h-10 shadow-lg shadow-emerald-200"
                        >
                          {approveMutation.isPending ? <Loader2 className="animate-spin" /> : <UserCheck size={16} className="mr-2" />}
                          Execute Sourcing
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}