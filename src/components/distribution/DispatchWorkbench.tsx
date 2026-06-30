'use client';

/**
 * --- LOGISTICS DISPATCH MANAGER ---
 * VERSION: v4.7 ENTERPRISE (GPS TRACKER INTEGRATED)
 * Use: Shipping Management with Automatic Real-Time Tracking
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Truck, Package, QrCode, ShieldCheck, 
    Loader2, CheckCircle2, Navigation,
    ScanLine, ArrowRight, Printer, Download,
    FileSpreadsheet, History, ClipboardList,
    Globe, MapPin, Activity, Trash2, ShieldAlert,
    Building2, Briefcase, Warehouse, Weight, Search, Plus, UserCog,
    Wifi, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScannedManifestItem {
    variant_id: number; 
    product_name: string;
    sku: string;
    batch_number?: string;
    qty: number;
    units_per_pack: number;
    unit_weight_kg: number; 
}

interface CompanyInfo {
    name: string;
    currency: string;
    country: string; 
    business_id: string;
    tenant_id: string;
}

export default function DispatchWorkbench({ businessId }: { businessId: string }) {
    // --- STATE MANAGEMENT ---
    const [isScanning, setIsScanning] = useState(false);
    const [manifestItems, setManifestItems] = useState<ScannedManifestItem[]>([]);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]); 
    const [availableVehicles, setAvailableVehicles] = useState<any[]>([]); 
    
    // Legal Metadata State
    const [shipmentType, setShipmentType] = useState<'LOCAL' | 'INTERNATIONAL'>('LOCAL');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [destinationCountry, setDestinationCountry] = useState('');
    const [loadingBay, setLoadingBay] = useState(''); 
    
    const [company, setCompany] = useState<CompanyInfo | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isSealing, setIsSealing] = useState(false);
    const [sealedData, setSealedData] = useState<any>(null);
    const [isTrackerLive, setIsTrackerLive] = useState(false);
    
    const supabase = createClient();
    const trackingInterval = useRef<NodeJS.Timeout | null>(null);

    // --- CALCULATED LOAD METRICS ---
    const totalWeight = useMemo(() => {
        return manifestItems.reduce((acc, item) => acc + (item.qty * item.unit_weight_kg), 0);
    }, [manifestItems]);

    // --- FETCH SYSTEM DATA ---
    useEffect(() => {
        const fetchTerminalData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            const { data: identities } = await supabase
                .from('view_bbu1_corporate_identity')
                .select('legal_name, currency_code, tenant_id, country')
                .eq('business_id', businessId);
            
            if (identities && identities.length > 0) {
                const identity = identities.find(i => i.country !== null) || identities[0];
                setCompany({
                    name: identity.legal_name,
                    currency: identity.currency_code || 'UGX',
                    country: identity.country || 'Not Set',
                    business_id: businessId,
                    tenant_id: identity.tenant_id
                });
                setDestinationCountry(identity.country || '');
            }

            const { data: items } = await supabase.from('view_bbu1_scanner_master').select('*').eq('business_id', businessId);
            if (items) setAvailableProducts(items);

            const { data: fleet } = await supabase.from('vehicles').select('id, name').eq('business_id', businessId).eq('is_active', true);
            if (fleet) setAvailableVehicles(fleet);
        };
        fetchTerminalData();

        // Cleanup tracking on close
        return () => { if (trackingInterval.current) clearInterval(trackingInterval.current); };
    }, [businessId, supabase]);

    // --- AUTOMATIC BACKGROUND TRACKER (THE HEARTBEAT) ---
    useEffect(() => {
        if (sealedData && sealedData.vanLoad?.id) {
            setIsTrackerLive(true);
            
            // Start the heartbeat every 30 seconds
            trackingInterval.current = setInterval(() => {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    await supabase.from('logistics_transit_logs').insert({
                        business_id: businessId,
                        load_id: sealedData.vanLoad.id,
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                }, (err) => console.warn("GPS Signal Lost:", err.message), 
                { enableHighAccuracy: true });
            }, 30000); 
        }
    }, [sealedData, businessId, supabase]);

    // --- SCANNER INPUT HANDLING ---
    useEffect(() => {
        let buffer = '';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            if (e.key === 'Enter') {
                if (buffer.length > 2) processCodeEntry(buffer);
                buffer = '';
            } else if (e.key.length === 1) buffer += e.key;
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [businessId, manifestItems]);

    const processCodeEntry = async (code: string) => {
        setIsScanning(true);
        const { data: item, error } = await supabase
            .from('view_bbu1_scanner_master')
            .select('*')
            .or(`sku.eq.${code},barcode.eq.${code}`)
            .eq('business_id', businessId)
            .maybeSingle();

        if (!item || error) {
            DeepAudioEngine.playError();
            toast.error("Code Not Recognized");
            setIsScanning(false);
            return;
        }
        addItemToManifest(item);
        setIsScanning(false);
    };

    const addItemToManifest = (item: any) => {
        DeepAudioEngine.playSuccess();
        const multiplier = Number(item.units_per_pack) || 1;
        setManifestItems(prev => {
            const existing = prev.find(p => p.variant_id === item.variant_id);
            if (existing) {
                return prev.map(p => p.variant_id === item.variant_id ? { ...p, qty: p.qty + multiplier } : p);
            }
            return [...prev, { 
                variant_id: item.variant_id, product_name: item.product_name, sku: item.sku, 
                qty: multiplier, units_per_pack: multiplier, batch_number: item.batch_number,
                unit_weight_kg: Number(item.weight_kg) || 0 
            }];
        });
    };

    // --- DISPATCH AUTHORIZATION (THE LEGAL SEAL) ---
    const executeDispatchSeal = async () => {
        if (!selectedVehicleId || !loadingBay || !destinationCountry) {
            toast.error("Information Required", { description: "Assign Vehicle, Station, and Destination Country." });
            return;
        }

        setIsSealing(true);
        const securityID = `ID-SHIP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            // 1. Create Legal Manifest
            const { data: manifest, error: mError } = await supabase
                .from('logistics_manifests')
                .insert({
                    business_id: businessId,
                    seal_no: securityID,
                    digital_seal_hash: securityID,
                    status: 'sealed',
                    shipment_type: shipmentType,
                    shipment_ref: `REF-${Date.now()}`,
                    origin_country: company?.country, 
                    destination_country: destinationCountry, 
                    total_weight_kg: totalWeight, 
                    loading_bay_id: loadingBay,
                    created_by: currentUser?.id
                })
                .select().single();

            if (mError) {
                toast.error("System Error", { description: mError.message });
                setIsSealing(false);
                return;
            }

            // 2. Register Transit Record
            const { data: vanLoad, error: vError } = await supabase
                .from('van_loads')
                .insert({
                    business_id: businessId,
                    vehicle_id: parseInt(selectedVehicleId),
                    user_id: currentUser?.id,
                    manifest_id: manifest.id,
                    status: 'in-transit',
                    load_date: new Date().toISOString().split('T')[0],
                    loading_bay_id: loadingBay,
                    digital_seal_hash: securityID
                })
                .select().single();

            if (vError) {
                toast.error("Registry Failure", { description: vError.message });
                setIsSealing(false);
                return;
            }

            // 3. Map Items
            const itemsToInsert = manifestItems.map(i => ({
                manifest_id: manifest.id,
                product_variant_id: i.variant_id,
                quantity: i.qty,
                business_id: businessId
            }));

            await supabase.from('logistics_manifest_items').insert(itemsToInsert);

            setSealedData({ manifest, vanLoad, items: manifestItems, lat: latitude, lng: longitude, weight: totalWeight });
            DeepAudioEngine.playSuccess();
            toast.success("Dispatch Authorized", { description: "Automatic background tracking is now live." });
            setIsSealing(false);

        }, () => {
            toast.error("Location Access Needed", { description: "Enable GPS to authorize this shipment." });
            setIsSealing(false);
        });
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("OFFICIAL SHIPPING MANIFEST", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`COMPANY: ${company?.name}`, 20, 35);
        doc.text(`SECURITY ID: ${sealedData.manifest.seal_no}`, 20, 42);
        doc.text(`VEHICLE: ${availableVehicles.find(v => v.id.toString() === selectedVehicleId)?.name}`, 20, 49);

        autoTable(doc, {
            startY: 60,
            head: [['SKU', 'ITEM DESCRIPTION', 'QTY', 'WEIGHT', 'BATCH']],
            body: manifestItems.map(i => [
                i.sku, i.product_name, i.qty, `${(i.qty * i.unit_weight_kg).toFixed(1)} KG`, i.batch_number || '-'
            ]),
            headStyles: { fillColor: [51, 65, 85] }
        });
        doc.save(`Manifest-${sealedData.manifest.seal_no}.pdf`);
    };

    if (sealedData) {
        return (
            <Card className="max-w-2xl mx-auto p-12 text-center space-y-10 border border-slate-200 shadow-xl bg-white rounded-[2rem] animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
                    <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Shipment Finalized</h2>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Records locked and tracking is active.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-slate-50 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Load Status</p>
                        <p className="font-bold text-emerald-600 uppercase text-xs">In-Transit</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Load Weight</p>
                        <p className="font-bold text-slate-900 text-xs">{sealedData.weight.toLocaleString()} KG</p>
                    </div>
                    <div className="p-5 bg-blue-50 rounded-2xl text-left border border-blue-100">
                        <p className="text-[10px] font-semibold text-blue-400 uppercase mb-1">Live Tracking</p>
                        <p className="font-bold text-blue-600 uppercase text-xs flex items-center gap-2"><Wifi size={12} className="animate-pulse" /> Active</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Button onClick={downloadPDF} className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs shadow-md">
                       <Download size={18} className="mr-3" /> Download Official Manifest
                    </Button>
                    <Button variant="ghost" className="text-xs font-semibold uppercase text-slate-400" onClick={() => window.location.reload()}>
                        Start New Shipment
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-180px)] animate-in fade-in duration-700">
            
            {/* --- LEFT COLUMN: SETTINGS --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <Card className="p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <UserCog className="text-blue-600 h-5 w-5" />
                        <h3 className="font-bold uppercase text-xs tracking-wider text-slate-700">Shipment Details</h3>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assigned Vehicle</Label>
                            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl font-bold text-xs"><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                                <SelectContent>{availableVehicles.map((v) => (<SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Loading Station</Label>
                                <Input placeholder="Bay #" value={loadingBay} onChange={(e) => setLoadingBay(e.target.value)} className="h-11 rounded-xl text-xs font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</Label>
                                <Select value={shipmentType} onValueChange={(v: any) => setShipmentType(v)}>
                                    <SelectTrigger className="h-11 border-slate-200 rounded-xl font-bold text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="LOCAL">Local</SelectItem><SelectItem value="INTERNATIONAL">Global</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Destination Country</Label>
                            <Input placeholder="Country name" value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} className="h-11 rounded-xl text-xs font-bold" />
                        </div>
                    </div>
                </Card>

                <Card className="p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                    <div className="flex items-center gap-3"><Search className="text-slate-400 h-4 w-4" /><h3 className="font-bold uppercase text-xs text-slate-700">Product Search</h3></div>
                    <Select onValueChange={(v) => {
                        const item = availableProducts.find(p => p.variant_id.toString() === v);
                        if (item) addItemToManifest(item);
                    }}>
                        <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl font-bold text-xs"><SelectValue placeholder="Manual search..." /></SelectTrigger>
                        <SelectContent><ScrollArea className="h-60">{availableProducts.map((p) => (
                            <SelectItem key={p.variant_id} value={p.variant_id.toString()}><div className="flex flex-col text-left py-1"><span className="font-bold text-slate-800 text-xs">{p.product_name}</span><span className="text-[9px] text-slate-400 uppercase">SKU: {p.sku} • {p.weight_kg}KG</span></div></SelectItem>
                        ))}</ScrollArea></SelectContent>
                    </Select>
                </Card>

                <Button disabled={manifestItems.length === 0 || isSealing} onClick={executeDispatchSeal} className="h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[11px] shadow-lg transition-all active:scale-95 disabled:opacity-50">
                    {isSealing ? <Loader2 className="animate-spin h-5 w-5" /> : <div className="flex items-center gap-2"><ShieldCheck size={18}/> Authorize Dispatch</div>}
                </Button>
            </div>

            {/* --- RIGHT COLUMN: MANIFEST --- */}
            <Card className="lg:col-span-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"><ClipboardList className="text-blue-600 h-5 w-5" /></div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800 tracking-tight">Active Shipment Manifest</h3>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company: {company?.name}</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated Weight</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-end"><Weight size={14} className="text-blue-500" /> {totalWeight.toLocaleString()} KG</p>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8">
                    {manifestItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 py-32 space-y-5">
                            <QrCode size={48} strokeWidth={1.5} />
                            <p className="text-xs font-semibold uppercase tracking-widest text-center">Ready for input... <br /> Use Hardware Scanner or Manual Search.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {manifestItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-all shadow-sm group">
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 transition-colors"><Package size={22} /></div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-slate-800 text-sm">{item.product_name}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded">SKU: {item.sku}</span>
                                                <span className="font-bold text-slate-500">{item.unit_weight_kg} KG / Unit</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-8">
                                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-center min-w-[70px]">
                                            <span className="text-xl font-bold text-slate-900">x{item.qty}</span>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Quantity</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setManifestItems(manifestItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                
                <div className="px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center backdrop-blur-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={12} className="text-emerald-500" /> System Live • Database Synchronized</p>
                    <Badge variant="secondary" className="text-[10px] font-bold bg-white border-slate-200 text-slate-600 px-4">{manifestItems.length} Products Scanned</Badge>
                </div>
            </Card>
        </div>
    );
}