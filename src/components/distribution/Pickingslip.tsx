'use client';

/**
 * --- OFFICIAL WAREHOUSE PICKING SLIP ---
 * VERSION: v1.1 PROFESSIONAL (Build Fix)
 * Use: Official paper record for warehouse inventory collection and audit.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    FileText, 
    Printer, 
    Loader2, 
    Warehouse, 
    UserCheck, 
    MapPin, 
    Package,
    PenTool, // Swapped Signature for PenTool to fix the build error
    CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function Pickingslip({ manifestId, businessId }: { manifestId: string, businessId: string }) {
    const supabase = createClient();

    // 1. DATA FETCHING: Pulling manifest details from the secure database
    const { data: manifest, isLoading } = useQuery({
        queryKey: ['pickingslip_data', manifestId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('logistics_manifests')
                .select(`
                    *,
                    items:logistics_manifest_items (
                        id, quantity, picking_status,
                        product_variants ( name, sku, bin_location, aisle_number )
                    )
                `)
                .eq('id', manifestId)
                .single();
            if (error) throw error;
            return data;
        }
    });

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Preparing Official Document...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto">
            
            {/* PRINT UTILITY BAR */}
            <div className="flex justify-end print:hidden">
                <Button 
                    onClick={handlePrint}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest h-12 px-8 rounded-xl shadow-xl flex items-center gap-3 transition-all active:scale-95"
                >
                    <Printer size={18} /> Print Record
                </Button>
            </div>

            {/* PRINTABLE DOCUMENT AREA */}
            <div className="bg-white p-4 print:p-0">
                
                {/* 1. CORPORATE IDENTIFICATION */}
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-100 rounded-2xl">
                                <Warehouse className="text-slate-900" size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Picking Slip</h1>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Authorized Warehouse Directive</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Reference</p>
                            <p className="text-sm font-black text-slate-900">#{manifest?.shipment_ref || manifestId.substring(0,12).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="text-right space-y-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Generated</p>
                            <p className="text-md font-bold text-slate-900">{format(new Date(), 'do MMMM yyyy')}</p>
                        </div>
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <MapPin size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Facility: {businessId.substring(0,8).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                {/* 2. LOGISTICS PARAMETERS */}
                <div className="grid grid-cols-2 gap-12 py-12 border-b border-slate-100">
                    <div className="space-y-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} className="text-slate-300" /> Load Information
                        </p>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Shipment Type:</span>
                                <span className="font-bold text-slate-900 uppercase tracking-tight">{manifest?.shipment_type || 'General'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Security Seal:</span>
                                <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px] px-2 py-0.5 uppercase">{manifest?.status}</Badge>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <UserCheck size={14} className="text-slate-300" /> Dispatch Authority
                        </p>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Registry Status:</span>
                                <span className="font-bold text-slate-900 uppercase">Synchronized</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">System ID:</span>
                                <span className="font-bold text-slate-900 font-mono">{manifest?.seal_no || 'NOT_ASSIGNED'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. INVENTORY COLLECTION MATRIX */}
                <div className="py-12">
                    <Table className="border border-slate-200">
                        <TableHeader className="bg-slate-900">
                            <TableRow className="h-14 hover:bg-slate-900">
                                <TableHead className="w-24 text-center font-black text-white/60 text-[10px] uppercase tracking-wider">Aisle-Bin</TableHead>
                                <TableHead className="font-black text-white/60 text-[10px] uppercase tracking-wider pl-8">Material Identity & Specifications</TableHead>
                                <TableHead className="w-28 text-center font-black text-white/60 text-[10px] uppercase tracking-wider">Plan Qty</TableHead>
                                <TableHead className="w-28 text-center font-black text-white/60 text-[10px] uppercase tracking-wider">Actual Pick</TableHead>
                                <TableHead className="w-32 text-center font-black text-white/60 text-[10px] uppercase tracking-wider">Integrity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {manifest?.items?.map((item: any) => (
                                <TableRow key={item.id} className="border-b border-slate-100 h-20 transition-none hover:bg-transparent">
                                    <TableCell className="text-center">
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-1">
                                            <p className="text-xs font-black text-slate-900 leading-none">
                                                {item.product_variants?.aisle_number || '00'}-{item.product_variants?.bin_location || '00'}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="pl-8">
                                        <p className="text-sm font-bold text-slate-900 tracking-tight">{item.product_variants?.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SKU: {item.product_variants?.sku}</p>
                                    </TableCell>
                                    <TableCell className="text-center font-black text-slate-900 text-base">
                                        x{item.quantity}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="h-10 w-16 border-2 border-dashed border-slate-200 mx-auto rounded-xl bg-slate-50/30" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="h-4 w-4 border-2 border-slate-200 rounded-md" /> 
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Verified</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* 4. VERIFICATION SIGN-OFF */}
                <div className="grid grid-cols-2 gap-24 pt-16 mt-16 border-t-2 border-slate-100">
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 text-slate-400">
                            <PenTool size={18} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Warehouse Controller Signature</p>
                        </div>
                        <div className="h-px w-full bg-slate-900 mt-14" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Timestamp: __________________________</p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-center gap-3 text-slate-400">
                            <CheckCircle2 size={18} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Security Audit Verification</p>
                        </div>
                        <div className="h-px w-full bg-slate-900 mt-14" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Authorized Seal Area</p>
                    </div>
                </div>

                {/* 5. LEGAL FOOTER */}
                <div className="mt-40 pt-8 border-t border-slate-50 text-center flex flex-col items-center gap-3">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em] max-w-lg leading-relaxed">
                        This picking slip is a system-generated record. Any discrepancies in material quantity or condition must be reported to the dispatch hub immediately.
                    </p>
                    <div className="h-1 w-24 bg-blue-600 rounded-full opacity-50" />
                </div>

            </div>
        </div>
    );
}