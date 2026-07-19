'use client';

/**
 * --- BBU1 AURA KNOWLEDGE GAP LEDGER ---
 * VERSION: v1.0 OMEGA (NEURAL TRAINING ENGINE)
 * Use: Identifies unanswered client inquiries for C-Suite knowledge injection.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { BrainCircuit, Zap, AlertCircle, CheckCircle2, MoreVertical, MessageSquarePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function KnowledgeGapLedger({ businessId }: { businessId: string }) {
    const supabase = createClient();

    const { data: gaps } = useQuery({
        queryKey: ['aura_knowledge_gaps', businessId],
        queryFn: async () => {
            const { data } = await supabase
                .from('aura_knowledge_gaps')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });
            return data;
        }
    });

    return (
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <BrainCircuit className="text-blue-600" /> Neural Blind Spots
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Unresolved Client Inquiries Detected by Aura</p>
                </div>
                <Badge className="bg-red-50 text-red-700 border-none font-black text-xs px-4 py-1">
                    {gaps?.filter(g => !g.is_resolved).length} Critical Gaps
                </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {gaps?.map((gap) => (
                    <div key={gap.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex gap-6 items-center">
                            <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                <AlertCircle size={24} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900">"{gap.raw_question}"</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                    Detected at: {new Date(gap.created_at).toLocaleString()} • Context: {gap.context_at_time || 'General Inquiry'}
                                </p>
                            </div>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-6 gap-2">
                            <MessageSquarePlus size={16} /> Inject Answer
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}