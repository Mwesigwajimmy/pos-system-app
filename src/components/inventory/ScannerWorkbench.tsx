'use client';

/**
 * --- BBU1 SOVEREIGN SCANNER WORKBENCH ---
 * VERSION: v2.5 OMEGA-ULTIMATUM (THE HARDWARE-SOFTWARE MARRIAGE)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Logistics
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. DYNAMIC IDENTITY: Fetches Business Name and Currency from Node Context.
 * 2. jsPDF WELD: Integrated vector-perfect label printing (50x25mm).
 * 3. NEURAL FEEDBACK: Hardware audio triggers for scan success/error.
 * 4. LEDGER INTEGRITY: Atomic RPC injection with Audit Master triggers.
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';
import { 
    Barcode, Loader2, PackageCheck, 
    Printer, History, CheckCircle2,
    Activity, ArrowDownToLine, ShieldCheck,
    Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ScannedSessionItem {
    variant_id: number;
    product_name: string;
    variant_name: string;
    sku: string;
    price: number;
    qtyAdded: number;
    timestamp: Date;
    location_id: string;
    tenant_id: string;
}

interface BusinessDNA {
    name: string;
    currency: string;
    location_name: string;
}

export default function ScannerWorkbench({ businessId }: { businessId: string }) {
    // --- STATE MANAGEMENT ---
    const [isScanning, setIsScanning] = useState(false);
    const [sessionLog, setSessionLog] = useState<ScannedSessionItem[]>([]);
    const [dna, setDna] = useState<BusinessDNA | null>(null);
    const supabase = createClient();

    // --- IDENTITY ANCHOR: Fetch Dynamic Business Details ---
    useEffect(() => {
        const fetchNodeIdentity = async () => {
            const { data: identities } = await supabase
                .from('view_bbu1_corporate_identity')
                .select('legal_name, currency_code')
                .eq('business_id', businessId)
                .maybeSingle();

            if (identities) {
                setDna({
                    name: identities.legal_name,
                    currency: identities.currency_code || 'UGX',
                    location_name: "Primary Node"
                });
            }
        };
        fetchNodeIdentity();
    }, [businessId, supabase]);

    // --- HARDWARE SCANNER BRIDGE ---
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime > 50) buffer = '';
            
            if (e.key === 'Enter') {
                if (buffer.length > 2) executeDeepScan(buffer);
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
            lastKeyTime = now;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [businessId]);

    // --- SOVEREIGN PRINT ENGINE (jsPDF + BWIP-JS) ---
    const printSovereignLabel = async (item: ScannedSessionItem) => {
        const promise = async () => {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
            
            // Create Barcode Canvas
            const canvas = document.createElement('canvas');
            bwipjs.toCanvas(canvas, {
                bcid: 'code128', text: item.sku,
                scale: 3, height: 10, includetext: true, textsize: 8,
            });

            const barcodeImg = canvas.toDataURL('image/png');

            // Draw Label
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6);
            doc.text((dna?.name || "BBU1 NODE").toUpperCase(), 25, 4, { align: 'center' });
            
            doc.setFontSize(9);
            doc.text(item.product_name.toUpperCase().substring(0, 22), 25, 8, { align: 'center' });
            
            doc.setFontSize(7);
            doc.text(item.variant_name.toUpperCase(), 25, 11, { align: 'center' });
            
            doc.addImage(barcodeImg, 'PNG', 5, 12, 40, 8);
            
            doc.setLineWidth(0.1);
            doc.line(5, 21, 45, 21);
            
            doc.setFontSize(10);
            doc.text(`${dna?.currency} ${item.price.toLocaleString()}`, 25, 24, { align: 'center' });

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        };

        toast.promise(promise(), {
            loading: 'Generating High-Precision Label...',
            success: 'Label Sent to Hardware Bridge',
            error: 'Hardware Print Failure'
        });
    };

    // --- INVENTORY INJECTION LOGIC ---
    const executeDeepScan = async (code: string) => {
        setIsScanning(true);
        
        // 1. NEURAL MAP: Identify item by SKU or Barcode
        const { data: item, error } = await supabase
            .from('view_bbu1_scanner_master')
            .select('*')
            .or(`sku.eq.${code},barcode.eq.${code}`)
            .eq('business_id', businessId)
            .maybeSingle();

        if (error || !item) {
            DeepAudioEngine.playError();
            toast.error(`Identity Desync: Code ${code} not found in this Node.`);
            setIsScanning(false);
            return;
        }

        // 2. MULTIPLIER: Use Packaging Logic (Box vs Single)
        const qtyToInject = Number(item.units_per_pack) || 1;

        // 3. ATOMIC RPC INJECTION
        const { error: rpcError } = await supabase.rpc('process_enterprise_inbound_scan', {
            p_variant_id: item.variant_id,
            p_location_id: item.location_id,
            p_business_id: businessId,
            p_tenant_id: item.tenant_id,
            p_qty_to_add: qtyToInject,
            p_cost: item.cost_price
        });

        if (rpcError) {
            toast.error("Database Link Refused Stock Injection");
        } else {
            DeepAudioEngine.playSuccess();
            const logEntry: ScannedSessionItem = {
                variant_id: item.variant_id,
                product_name: item.product_name,
                variant_name: item.variant_name,
                sku: item.sku,
                price: item.selling_price,
                qtyAdded: qtyToInject,
                timestamp: new Date(),
                location_id: item.location_id,
                tenant_id: item.tenant_id
            };
            setSessionLog(prev => [logEntry, ...prev]);
            toast.success(`Node Updated: +${qtyToInject} ${item.product_name}`);
        }
        setIsScanning(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 h-[calc(100vh-180px)]">
            
            {/* --- LEFT: HARDWARE ACTION ZONE --- */}
            <div className="lg:col-span-5 flex flex-col gap-6">
                <Card className="flex-1 border-dashed border-4 border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center p-12 text-center relative">
                    <Barcode size={140} strokeWidth={1} className={isScanning ? "animate-pulse text-blue-600" : "text-slate-300"} />
                    <div className="mt-8 space-y-2">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Workbench Live</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-xs mx-auto">
                            Awaiting hardware scan to anchor stock to {dna?.name || "Target Node"}
                        </p>
                    </div>

                    {isScanning && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                            <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
                        </div>
                    )}
                </Card>

                <Card className="p-6 bg-slate-950 text-white rounded-3xl border-none shadow-2xl flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Session Volume</p>
                        <h3 className="text-4xl font-black">{sessionLog.reduce((a, b) => a + b.qtyAdded, 0)} <span className="text-xs text-slate-400">Units</span></h3>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl">
                       <Activity className="h-6 w-6 text-blue-400 animate-pulse" />
                    </div>
                </Card>
            </div>

            {/* --- RIGHT: REAL-TIME LEDGER FEED --- */}
            <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <History className="h-4 w-4 text-slate-400" />
                        <h3 className="font-black uppercase text-[11px] tracking-widest text-slate-600">Sovereign Injection Feed</h3>
                    </div>
                    <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                        Node: {businessId.substring(0, 8)}
                    </Badge>
                </div>

                <ScrollArea className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {sessionLog.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-32 space-y-4">
                            <ArrowDownToLine size={64} strokeWidth={1} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-center">Awaiting Logistics Handshake</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessionLog.map((log, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-900 text-[15px]">{log.product_name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1"><ShieldCheck size={10} /> {log.sku}</span>
                                                <span>•</span>
                                                <span>{log.timestamp.toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-blue-600">+{log.qtyAdded}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confirmed</p>
                                        </div>
                                        <Button 
                                            onClick={() => printSovereignLabel(log)}
                                            variant="secondary" 
                                            size="icon" 
                                            className="h-12 w-12 rounded-2xl bg-white shadow-sm hover:bg-slate-950 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Printer size={20} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}