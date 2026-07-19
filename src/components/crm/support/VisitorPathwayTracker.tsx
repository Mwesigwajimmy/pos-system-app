'use client';

/**
 * --- BBU1 VISITOR PATHWAY TRACKER ---
 * VERSION: v1.0 OMEGA (REAL-TIME INTENT MONITOR)
 * Use: Deep monitoring of website visitors for proactive Aura engagement.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
    Globe, 
    Zap, 
    MousePointer2, 
    Timer, 
    MessageSquarePlus, 
    UserPlus, 
    Navigation,
    ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function VisitorPathwayTracker({ businessId }: { businessId: string }) {
    const supabase = createClient();

    const { data: visitors, isLoading } = useQuery({
        queryKey: ['live_visitors', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_visitor_logs')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('last_activity', { ascending: false });
            if (error) throw error;
            return data;
        },
        refetchInterval: 5000 // Real-time pulse every 5 seconds
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
                <div className="col-span-full h-64 flex items-center justify-center text-slate-400 font-bold uppercase text-xs animate-pulse">
                    Scanning Network Pathways...
                </div>
            ) : visitors?.length === 0 ? (
                <div className="col-span-full h-64 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Globe size={40} className="opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">No active signals detected on website</p>
                </div>
            ) : (
                visitors?.map((visitor) => (
                    <Card key={visitor.id} className="border-none shadow-xl bg-white rounded-3xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all group">
                        <CardContent className="p-6 space-y-5">
                            <div className="flex justify-between items-start">
                                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <MousePointer2 size={24} />
                                </div>
                                <div className="text-right">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1 font-black text-[9px]">
                                        LIVE SESSION
                                    </Badge>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                                        ID: {visitor.visitor_fingerprint.substring(0, 12)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Current Pathway</p>
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <Navigation size={14} className="text-blue-500" />
                                    <span className="text-xs font-bold text-slate-700 truncate">{visitor.current_pathway}</span>
                                    <ArrowUpRight size={14} className="ml-auto text-slate-300" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aura Intent Score</p>
                                    <span className="text-sm font-black text-blue-600">{visitor.intent_score}%</span>
                                </div>
                                <Progress value={visitor.intent_score} className="h-2 bg-slate-100" />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <Button className="flex-1 bg-slate-900 hover:bg-black text-white font-bold rounded-xl h-11 gap-2 text-xs">
                                    <MessageSquarePlus size={16} /> Intervene
                                </Button>
                                <Button variant="outline" className="flex-1 border-slate-200 font-bold rounded-xl h-11 text-xs text-slate-600 group-hover:border-blue-200">
                                    <UserPlus size={16} className="mr-2" /> Convert
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}