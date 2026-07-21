'use client';

/**
 * --- BBU1 DIRECT INCOME LEDGER ---
 * VERSION: v1.1 OMEGA (ENTERPRISE REGISTRY)
 * Use: Forensic oversight of all immediate cash sales and direct ledger postings.
 * Logic: Linked to public.view_direct_income_registry for real-time document retrieval.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";
import { 
    FileText, 
    UserCheck, 
    Landmark, 
    Search,
    ShieldCheck,
    History,
    Download,
    ArrowLeft,
    Loader2,
    Calendar,
    Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
    businessId: string;
    onBack: () => void; // Welded for seamless integration into Receivables
}

export default function DirectIncomeLedger({ businessId, onBack }: Props) {
    const supabase = createClient();
    const [search, setSearch] = React.useState("");

    // --- 1. DATA HANDSHAKE: REAL-TIME LEDGER PULL ---
    const { data: records, isLoading, isError } = useQuery({
        queryKey: ['direct_income_registry', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('view_direct_income_registry')
                .select('*')
                .eq('business_id', businessId);
            
            if (error) {
                console.error("[Ledger Forensic Fault]", error.message);
                throw error;
            }
            return data;
        }
    });

    // --- 2. FORENSIC SEARCH & FILTERING ---
    const filtered = React.useMemo(() => {
        if (!records) return [];
        return records.filter(r => 
            r.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
            r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            (r.recorded_by && r.recorded_by.toLowerCase().includes(search.toLowerCase()))
        );
    }, [records, search]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            
            {/* --- ACTION HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Button 
                    onClick={onBack} 
                    variant="ghost" 
                    className="group h-10 px-4 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold text-xs uppercase tracking-widest"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Aging Analysis
                </Button>
                
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-10 rounded-xl border-slate-200 gap-2 font-bold text-xs uppercase tracking-widest">
                        <Download size={16} className="text-slate-400" /> Export CSV
                    </Button>
                    <Button variant="outline" className="h-10 rounded-xl border-slate-200 gap-2 font-bold text-xs uppercase tracking-widest">
                        <FileText size={16} className="text-slate-400" /> Print Audit
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <History className="text-blue-400" /> Direct Income Ledger
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                                Forensic Repository of Immediate Settlement Documents
                            </CardDescription>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm text-right">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Total Registry Volume</p>
                            <p className="text-xl font-bold font-mono">
                                {isLoading ? "---" : filtered.length} <span className="text-[10px] text-slate-500 ml-1">ITEMS</span>
                            </p>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-8 space-y-6">
                    {/* Search & Intelligence Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                            <Input 
                                placeholder="Search Batch ID, Customer, or Agent..." 
                                className="pl-12 h-12 rounded-2xl bg-slate-50 border-none font-medium text-slate-900 shadow-inner focus-visible:ring-2 focus-visible:ring-blue-500/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                             <Badge variant="outline" className="h-10 px-4 rounded-xl border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-500 gap-2">
                                <Filter size={14}/> Filter: All Statuses
                             </Badge>
                        </div>
                    </div>

                    {/* Registry Table */}
                    <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-sm">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-slate-50/80 backdrop-blur-md">
                                    <TableRow className="h-14 border-b border-slate-100">
                                        <TableHead className="pl-8 font-black uppercase text-[10px] tracking-[0.15em] text-slate-500">Document ID</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-[0.15em] text-slate-500">Customer Identity</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-[0.15em] text-slate-500">Recording Agent</TableHead>
                                        <TableHead className="font-black uppercase text-[10px] tracking-[0.15em] text-slate-500">Deposit Target</TableHead>
                                        <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-[0.15em] text-slate-500">Settled Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Ledger...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <FileText size={48} />
                                                    <p className="text-sm font-black uppercase tracking-widest">No Direct Income Discovered</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.map((rec) => (
                                        <TableRow key={rec.id} className="h-24 hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none group">
                                            <TableCell className="pl-8">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-blue-600 text-sm tracking-tight">{rec.invoice_number}</span>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        <Calendar size={10}/> {format(new Date(rec.created_at), "dd MMM yyyy")}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-sm">{rec.customer_name}</span>
                                                    <span className="text-[9px] font-medium text-slate-400 uppercase">External Party</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-tight">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        <UserCheck size={16} />
                                                    </div>
                                                    {rec.recorded_by || 'Aura Autonomous'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                    <Landmark size={14} className="text-emerald-500" />
                                                    {rec.deposit_account || 'Master Clearing'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <span className="text-lg font-black text-slate-900 tabular-nums tracking-tighter">
                                                        {new Intl.NumberFormat().format(rec.total_amount)}
                                                    </span>
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[8px] h-5 px-3 rounded-full uppercase tracking-[0.1em]">
                                                        Confirmed
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
                
                {/* --- FORENSIC SEAL FOOTER --- */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 opacity-40">
                        <ShieldCheck size={18} className="text-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">
                            Digital Trust Protocol V2.1 • Audit Lock Active
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Real-time Ledger Sync
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    );
}