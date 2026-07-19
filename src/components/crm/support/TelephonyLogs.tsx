'use client';

/**
 * --- BBU1 TELEPHONY FORENSIC REGISTRY ---
 * VERSION: v1.0 OMEGA (VOICE INTELLIGENCE WELD)
 * Use: Real-time monitoring of Aura's inbound/outbound voice handshakes.
 * Logic: Linked to crm_call_ledger for forensic transcript analysis.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { 
    PhoneIncoming, 
    PhoneOutgoing, 
    Play, 
    FileText, 
    Clock, 
    BrainCircuit, 
    MessageSquareQuote,
    Activity,
    ShieldAlert,
    ExternalLink,
    Volume2,
    Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function TelephonyLogs({ businessId }: { businessId: string }) {
    const supabase = createClient();

    const { data: calls, isLoading } = useQuery({
        queryKey: ['aura_call_ledger', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_call_ledger')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                                <Volume2 size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight">Voice Forensic Registry</CardTitle>
                                <CardDescription className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                                    Autonomous Receptionist Audio Stream & Transcripts
                                </CardDescription>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Airtime</p>
                            <p className="text-2xl font-mono font-bold text-white">
                                {calls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0)}s
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                                <TableRow className="h-14 border-slate-100">
                                    <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest">Signal</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Caller Identity</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Aura Insight</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Sentiment</TableHead>
                                    <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest">Audio Link</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-bold uppercase text-xs animate-pulse">Initializing Signal Stream...</TableCell></TableRow>
                                ) : calls?.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-bold uppercase text-xs">No voice packets discovered</TableCell></TableRow>
                                ) : (
                                    calls?.map((call) => (
                                        <TableRow key={call.id} className="hover:bg-slate-50/50 transition-all border-slate-50 h-24">
                                            <TableCell className="pl-8">
                                                <div className="flex flex-col gap-1.5">
                                                    {call.direction === 'inbound' ? (
                                                        <Badge className="bg-blue-100 text-blue-700 border-none px-3 py-1 font-black text-[9px] w-fit">
                                                            <PhoneIncoming size={10} className="mr-1.5" /> INBOUND
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-purple-100 text-purple-700 border-none px-3 py-1 font-black text-[9px] w-fit">
                                                            <PhoneOutgoing size={10} className="mr-1.5" /> OUTBOUND
                                                        </Badge>
                                                    )}
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center">
                                                        <Clock size={10} className="mr-1" /> {format(new Date(call.created_at), "HH:mm")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-sm tabular-nums">{call.caller_phone}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Verified Lead Signal</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-md">
                                                <div className="flex items-start gap-3">
                                                    <MessageSquareQuote size={14} className="text-blue-500 mt-1 shrink-0" />
                                                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                                        {call.summary || "Forensic transcript processing in progress..."}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={cn(
                                                    "rounded-lg font-black text-[9px] border-2",
                                                    call.ai_sentiment === 'interested' ? "border-emerald-200 text-emerald-700" :
                                                    call.ai_sentiment === 'aggressive' ? "border-red-200 text-red-700" : "border-slate-200 text-slate-500"
                                                )}>
                                                    {call.ai_sentiment?.toUpperCase() || 'NEUTRAL'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {call.recording_url && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-10 rounded-xl gap-2 font-bold text-xs border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => window.open(call.recording_url)}
                                                        >
                                                            <Play size={14} fill="currentColor" /> Play Recording
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400">
                                                        <Download size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}