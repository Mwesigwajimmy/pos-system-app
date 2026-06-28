'use client';

/**
 * --- LOGISTICS DISPATCH MANAGER ---
 * VERSION: v4.1 PROFESSIONAL
 * Use: Management of Local and International Shipping
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Truck, Package, QrCode, ShieldCheck, 
    Loader2, CheckCircle2, Navigation,
    ScanLine, ArrowRight, Printer, Download,
    FileSpreadsheet, History, ClipboardList,
    Globe, MapPin, Activity, ShieldAlert,
    Building2, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScannedManifestItem {
    variant_id: number; 
    product_name: string;
    sku: string;
    batch_number?: string;
    qty: number;
    units_per_pack: number;
}

interface CompanyInfo {
    name: string;
    currency: string;
    business_id: string;
    tenant_id: string;
}

export default function DispatchWorkbench({ businessId }: { businessId: string }) {
    // --- STATE MANAGEMENT ---
    const [isScanning, setIsScanning] = useState(false);
    const [manifestItems, setManifestItems] = useState<ScannedManifestItem[]>([]);
    const [shipmentType, setShipmentType] = useState<'LOCAL' | 'INTERNATIONAL'>('LOCAL');
    const [company, setCompany] = useState<CompanyInfo | null>(null);
    const [isSealing, setIsSealing] = useState(false);
    const [sealedData, setSealedData] = useState<any>(null);
    
    const supabase = createClient();

    // --- FETCH COMPANY INFORMATION ---
    useEffect(() => {
        const fetchCompanyData = async () => {
            const { data } = await supabase
                .from('view_bbu1_corporate_identity')
                .select('legal_name, currency_code, tenant_id')
                .eq('business_id', businessId)
                .maybeSingle();
            
            if (data) {
                setCompany({
                    name: data.legal_name,
                    currency: data.currency_code || 'UGX',
                    business_id: businessId,
                    tenant_id: data.tenant_id
                });
            }
        };
        fetchCompanyData();
    }, [businessId, supabase]);

    // --- SCANNER INPUT BUFFER ---
    useEffect(() => {
        let buffer = '';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            if (e.key === 'Enter') {
                if (buffer.length > 2) processDispatchScan(buffer);
                buffer = '';
            } else if (e.key.length === 1) buffer += e.key;
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [businessId, manifestItems]);

    const processDispatchScan = async (code: string) => {
        setIsScanning(true);
        const { data: item, error } = await supabase
            .from('view_bbu1_scanner_master')
            .select('*')
            .or(`sku.eq.${code},barcode.eq.${code}`)
            .eq('business_id', businessId)
            .maybeSingle();

        if (!item || error) {
            DeepAudioEngine.playError();
            toast.error("Item Not Found", { description: `The code ${code} is not recognized in the system.` });
            setIsScanning(false);
            return;
        }

        DeepAudioEngine.playSuccess();
        const multiplier = Number(item.units_per_pack) || 1;

        setManifestItems(prev => {
            const existing = prev.find(p => p.variant_id === item.variant_id);
            if (existing) {
                return prev.map(p => p.variant_id === item.variant_id ? { ...p, qty: p.qty + multiplier } : p);
            }
            return [...prev, { 
                variant_id: item.variant_id, 
                product_name: item.product_name, 
                sku: item.sku, 
                qty: multiplier,
                units_per_pack: multiplier,
                batch_number: item.batch_number 
            }];
        });
        toast.success(`Scanned: ${item.product_name} (+${multiplier})`);
        setIsScanning(false);
    };

    // --- DISPATCH CONFIRMATION PROTOCOL ---
    const executeDispatchSeal = async () => {
        setIsSealing(true);
        const securityID = `ID-SHIP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // 1. Capture Location for Verification
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            // 2. Create Shipment Manifest
            const { data: manifest, error: mError } = await supabase
                .from('logistics_manifests')
                .insert({
                    business_id: businessId,
                    seal_no: securityID,
                    status: 'sealed',
                    shipment_type: shipmentType,
                    shipment_ref: `REF-${Date.now()}`,
                    created_at: new Date().toISOString()
                })
                .select().single();

            if (mError) {
                toast.error("Database Error", { description: "The system could not save the manifest." });
                setIsSealing(false);
                return;
            }

            // 3. Register Load
            const { data: vanLoad } = await supabase
                .from('van_loads')
                .insert({
                    business_id: businessId,
                    manifest_id: manifest.id,
                    status: 'in-transit',
                    load_date: new Date().toISOString()
                })
                .select().single();

            // 4. Map Items to Manifest
            const itemsToInsert = manifestItems.map(i => ({
                manifest_id: manifest.id,
                product_variant_id: i.variant_id,
                quantity: i.qty
            }));

            await supabase.from('logistics_manifest_items').insert(itemsToInsert);

            setSealedData({ manifest, vanLoad, items: manifestItems, lat: latitude, lng: longitude });
            DeepAudioEngine.playSuccess();
            toast.success("Dispatch Confirmed", { description: `Shipping ID ${securityID} has been registered.` });
            setIsSealing(false);

        }, () => {
            toast.error("Location Required", { description: "Please enable GPS to authorize this dispatch." });
            setIsSealing(false);
        });
    };

    // --- DATA EXPORTS ---
    const exportCSV = () => {
        const headers = ["SKU", "Product Name", "Quantity", "Batch Number"];
        const rows = manifestItems.map(i => [i.sku, i.product_name, i.qty, i.batch_number || 'N/A']);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Shipping-Manifest-${Date.now()}.csv`;
        a.click();
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("SHIPPING MANIFEST", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`COMPANY: ${company?.name}`, 20, 35);
        doc.text(`SECURITY ID: ${sealedData.manifest.seal_no}`, 20, 42);
        doc.text(`SHIPMENT TYPE: ${shipmentType}`, 20, 49);
        doc.text(`LOCATION ORIGIN: ${sealedData.lat}, ${sealedData.lng}`, 20, 56);

        autoTable(doc, {
            startY: 65,
            head: [['SKU', 'ITEM DESCRIPTION', 'QTY', 'BATCH']],
            body: manifestItems.map(i => [i.sku, i.product_name, i.qty, i.batch_number || '-']),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [51, 65, 85] }
        });

        doc.save(`Manifest-${sealedData.manifest.seal_no}.pdf`);
    };

    if (sealedData) {
        return (
            <Card className="max-w-2xl mx-auto p-12 text-center space-y-10 border border-slate-200 shadow-xl bg-white rounded-[2rem] animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={48} className="text-emerald-600" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Dispatch Confirmed</h2>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Shipping records successfully updated</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Status</p>
                        <p className="font-bold text-emerald-600 uppercase">In-Transit</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Security ID</p>
                        <p className="font-bold text-slate-900 truncate">{sealedData.manifest.seal_no}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Load Ref</p>
                        <p className="font-bold text-slate-900">REF-{sealedData.vanLoad.id}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Button onClick={downloadPDF} className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs shadow-md">
                       <Download size={18} className="mr-3" /> Download Shipping Manifest (PDF)
                    </Button>
                    <Button variant="ghost" className="text-xs font-semibold uppercase text-slate-400" onClick={() => { setManifestItems([]); setSealedData(null); }}>
                        Start New Shipment
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-[calc(100vh-180px)] animate-in fade-in duration-700">
            
            {/* --- LEFT COLUMN: SETTINGS & SCANNER --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <Card className="p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <Activity className="text-blue-600 h-5 w-5" />
                        <h3 className="font-bold uppercase text-xs tracking-wider text-slate-700">Shipment Settings</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Delivery Region</p>
                            <Select value={shipmentType} onValueChange={(v: any) => setShipmentType(v)}>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold text-xs tracking-tight">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOCAL">Local Delivery</SelectItem>
                                    <SelectItem value="INTERNATIONAL">International Export</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>

                <Card className="flex-1 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-10 text-center relative rounded-[2rem]">
                    {shipmentType === 'LOCAL' ? <Truck size={80} className="text-slate-300" /> : <Globe size={80} className="text-slate-300" />}
                    <div className="mt-6 space-y-2">
                        <h2 className="text-xl font-bold text-slate-800">Ready to Scan</h2>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest max-w-[200px] mx-auto">
                            Scan items to add them to the shipment for {company?.name || "Target Node"}
                        </p>
                    </div>
                    {isScanning && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-[2rem]">
                            <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
                        </div>
                    )}
                </Card>

                <Button 
                    disabled={manifestItems.length === 0 || isSealing}
                    onClick={executeDispatchSeal}
                    className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSealing ? <Loader2 className="animate-spin" /> : "Confirm Dispatch"}
                </Button>
            </div>

            {/* --- RIGHT COLUMN: SHIPPING LIST --- */}
            <Card className="lg:col-span-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"><ClipboardList className="text-blue-600 h-5 w-5" /></div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800">Shipment Items</h3>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{shipmentType} Manifest</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={exportCSV} variant="outline" size="sm" className="h-10 px-5 rounded-xl border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all">
                            <FileSpreadsheet size={14} className="mr-2 text-emerald-600" /> Export CSV
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8">
                    {manifestItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 py-32 space-y-4">
                            <QrCode size={60} />
                            <p className="text-xs font-semibold uppercase tracking-widest text-center">No items scanned yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {manifestItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-all shadow-sm group">
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                            <Package size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-800 text-sm">{item.product_name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px]">SKU: {item.sku}</span>
                                                {item.batch_number && <span className="flex items-center gap-1"><History size={10} /> Batch: {item.batch_number}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <div>
                                            <span className="text-2xl font-bold text-slate-900 tracking-tight">x{item.qty}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Quantity</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Ready • Records Sync Active</p>
                    <Badge variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-500">{manifestItems.length} Total Unique Items</Badge>
                </div>
            </Card>
        </div>
    );
}