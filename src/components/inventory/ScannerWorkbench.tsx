'use client';

/**
 * --- BBU1 SOVEREIGN SCANNER WORKBENCH ---
 * VERSION: v2.6 OMEGA-ULTIMATUM (THE HARDWARE-SOFTWARE MARRIAGE)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Logistics
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. DYNAMIC IDENTITY: Fetches Business Name and Currency from Node Context.
 * 2. jsPDF WELD: Integrated vector-perfect label printing (50x25mm).
 * 3. NEURAL FEEDBACK: Hardware audio triggers for scan success/error.
 * 4. LEDGER INTEGRITY: Atomic RPC injection with Audit Master triggers.
 * 5. CAMERA BRIDGE: Real-time WASM-powered browser scanning (No external apps).
 */

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';
import { Html5Qrcode } from 'html5-qrcode'; // Enterprise-grade decoder
import { 
    Barcode, Loader2, PackageCheck, 
    Printer, History, CheckCircle2,
    Activity, ArrowDownToLine, ShieldCheck,
    Globe, Camera, XCircle, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const supabase = createClient();

export default function ScannerWorkbench({ businessId }: { businessId: string }) {
    // --- STATE MANAGEMENT ---
    const [isScanning, setIsScanning] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [sessionLog, setSessionLog] = useState<ScannedSessionItem[]>([]);
    const [dna, setDna] = useState<BusinessDNA | null>(null);
    
    // --- HARDWARE ENGINE REFS ---
    const scannerRef = useRef<Html5Qrcode | null>(null);

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
    }, [businessId]);

    // --- NEURAL CAMERA PROTOCOL ---
    const startCamera = async () => {
        setIsCameraActive(true);
        const html5QrCode = new Html5Qrcode("bbu1-neural-view");
        scannerRef.current = html5QrCode;

        const config = { 
            fps: 15, 
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0
        };

        try {
            await html5QrCode.start(
                { facingMode: "environment" }, // Standard for warehouse mobile devices
                config,
                (decodedText) => {
                    // Logic: Pause engine to avoid multiple triggers during sync
                    html5QrCode.pause();
                    executeDeepScan(decodedText);
                    setTimeout(() => { if (scannerRef.current?.isPaused()) html5QrCode.resume(); }, 2500);
                },
                () => {} // Silent non-detection
            );
        } catch (err) {
            toast.error("Hardware Refusal", { description: "Camera permission denied or hardware busy." });
            setIsCameraActive(false);
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (e) { console.error("Hardware Release Fault"); }
        }
        setIsCameraActive(false);
    };

    // --- HARDWARE KEYBOARD BRIDGE (For physical plug-in scanners) ---
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
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (scannerRef.current) stopCamera();
        };
    }, [businessId]);

    // --- SOVEREIGN PRINT ENGINE (jsPDF + BWIP-JS) ---
    const printSovereignLabel = async (item: ScannedSessionItem) => {
        const promise = async () => {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
            
            const canvas = document.createElement('canvas');
            bwipjs.toCanvas(canvas, {
                bcid: 'code128', text: item.sku,
                scale: 3, height: 10, includetext: true, textsize: 8,
            });

            const barcodeImg = canvas.toDataURL('image/png');

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

    // --- AUTHORITATIVE DEEP SCAN ENGINE ---
    const executeDeepScan = async (code: string) => {
        setIsScanning(true);
        
        // 1. NEURAL HANDSHAKE: Resolve identity across local and global registries
        const { data: handshake, error } = await supabase.rpc('fn_sovereign_barcode_handshake', {
            p_barcode: code,
            p_business_id: businessId
        });

        if (error || !handshake) {
            DeepAudioEngine.playError();
            toast.error("Identity Desync", { description: `Code ${code} unknown to Sovereign Registry.` });
            setIsScanning(false);
            return;
        }

        // 2. LOGIC ROUTING
        if (handshake.status === 'LOCAL_FOUND') {
            const item = handshake.data;
            const qtyToInject = Number(item.units_per_pack) || 1;

            // ATOMIC LEDGER INJECTION
            const { error: rpcError } = await supabase.rpc('process_enterprise_inbound_scan', {
                p_variant_id: item.variant_id,
                p_location_id: item.location_id,
                p_business_id: businessId,
                p_tenant_id: item.tenant_id,
                p_qty_to_add: qtyToInject,
                p_cost: item.cost_price
            });

            if (rpcError) {
                DeepAudioEngine.playError();
                toast.error("Ledger Handshake Refused");
            } else {
                DeepAudioEngine.playSuccess();
                const logEntry: ScannedSessionItem = {
                    variant_id: item.variant_id,
                    product_name: item.product_name,
                    variant_name: item.variant_name,
                    sku: item.sku,
                    price: item.cost_price, // Tracking value intake
                    qtyAdded: qtyToInject,
                    timestamp: new Date(),
                    location_id: item.location_id,
                    tenant_id: item.tenant_id
                };
                setSessionLog(prev => [logEntry, ...prev]);
                toast.success(`Node Reconciled: +${qtyToInject} ${item.product_name}`);
            }
        } 
        else if (handshake.status === 'GLOBAL_FOUND') {
            DeepAudioEngine.playError();
            toast.info("Global Asset Detected", { 
                description: `${handshake.data.product_name} is known. Redirect to Onboarding Registry.` 
            });
        } 
        else {
            DeepAudioEngine.playError();
            toast.warning("Identity Void", { description: `Barcode ${code} unknown to Global Brain.` });
        }
        
        setIsScanning(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 h-[calc(100vh-180px)]">
            
            {/* --- LEFT: HARDWARE ACTION ZONE --- */}
            <div className="lg:col-span-5 flex flex-col gap-6">
                <Card className="flex-1 border-dashed border-4 border-slate-100 bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden rounded-[2.5rem]">
                    
                    {/* CAMERA RENDERING NODE */}
                    <div id="bbu1-neural-view" className={cn(
                        "w-full h-full rounded-3xl overflow-hidden transition-opacity duration-500",
                        isCameraActive ? "opacity-100" : "opacity-0 absolute"
                    )} />

                    {!isCameraActive && (
                        <div className="animate-in fade-in duration-1000">
                            <Barcode size={120} strokeWidth={1} className={isScanning ? "animate-pulse text-blue-500" : "text-slate-700"} />
                            <div className="mt-8 space-y-2">
                                <h2 className="text-xl font-bold text-white uppercase tracking-widest">Scanner Node Idle</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] max-w-xs mx-auto">
                                    Ready for hardware handshake at {dna?.name || "Target Node"}
                                </p>
                            </div>
                        </div>
                    )}

                    {isScanning && !isCameraActive && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                            <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
                        </div>
                    )}

                    {/* HARDWARE TOGGLE PROTOCOL */}
                    <div className="absolute bottom-10">
                        <Button 
                            onClick={isCameraActive ? stopCamera : startCamera}
                            className={cn(
                                "h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all",
                                isCameraActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                            )}
                        >
                            {isCameraActive ? <><XCircle className="mr-3 h-4 w-4" /> Shutdown Camera</> : <><Camera className="mr-3 h-4 w-4" /> Activate Phone Scan</>}
                        </Button>
                    </div>
                </Card>

                <Card className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-xl flex justify-between items-center ring-1 ring-slate-100">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cycle Volume</p>
                        <h3 className="text-4xl font-black text-slate-900">{sessionLog.reduce((a, b) => a + b.qtyAdded, 0)} <span className="text-xs text-slate-300 font-bold">UNITS</span></h3>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                       <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                </Card>
            </div>

            {/* --- RIGHT: REAL-TIME LEDGER FEED --- */}
            <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <History className="h-4 w-4 text-slate-400" />
                        <h3 className="font-black uppercase text-[11px] tracking-widest text-slate-500">Live Logistics Handshake</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-blue-400" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">BBU1 GLOBAL SYNC ACTIVE</span>
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                    {sessionLog.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-32 space-y-6">
                            <ArrowDownToLine size={80} strokeWidth={1} />
                            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-center">Awaiting Entry</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessionLog.map((log, idx) => (
                                <div key={idx} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-[1.5rem] border border-transparent hover:border-blue-100 transition-all group animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-6">
                                        <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 border border-emerald-50">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-900 text-base uppercase tracking-tight">{log.product_name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-blue-500" /> {log.sku}</span>
                                                <span>•</span>
                                                <span>{log.timestamp.toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-10">
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-blue-600">+{log.qtyAdded}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Injected</p>
                                        </div>
                                        <Button 
                                            onClick={() => printSovereignLabel(log)}
                                            variant="secondary" 
                                            size="icon" 
                                            className="h-14 w-14 rounded-3xl bg-slate-900 text-white shadow-xl hover:bg-black transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Printer size={24} />
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