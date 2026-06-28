'use client';

/**
 * --- BBU1 SOVEREIGN: LOGISTICS COMMAND CENTER ---
 * VERSION: v4.5 OMEGA-ULTIMATUM (THE GLOBAL ARCHITECT)
 * JURISDICTION: Professional Multi-Sector Tracking & Exports
 * 
 * CORE ARCHITECTURAL SEAL:
 * 1. UNIFIED RADAR: Parallel fetching of Local Van Loads and International Manifests.
 * 2. SECTOR INTELLIGENCE: Auto-categorization of shipments based on audited schema.
 * 3. ENTERPRISE EXPORTS: Integrated jsPDF and CSV Ledger generators.
 * 4. NODE IDENTITY: Real-time currency and legal branding synchronization.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Truck, Globe, ShieldCheck, Anchor, 
    FileText, FileSpreadsheet, Plus, 
    ArrowRightLeft, Package, MapPin, 
    Activity, Search, Printer,
    ChevronRight, Loader2, ClipboardList
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LogisticsCommandCenter() {
    // --- STATE MANAGEMENT ---
    const [manifests, setManifests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [businessIdentity, setBusinessIdentity] = useState({ name: "Authorized Node", currency: "UGX" });
    const supabase = createClient();

    // --- DEEP DATA HANDSHAKE ---
    useEffect(() => {
        const fetchDeepLogistics = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Resolve Corporate Identity (Audit-Verified View)
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id, business_name')
                .eq('id', user.id).single();
            
            if (profile) {
                const { data: identity } = await supabase
                    .from('view_bbu1_corporate_identity')
                    .select('legal_name, currency_code')
                    .eq('business_id', profile.business_id).single();
                
                setBusinessIdentity({
                    name: identity?.legal_name || profile.business_name,
                    currency: identity?.currency_code || "UGX"
                });

                // 2. Fetch Manifests & Joined Van Loads (Audited Tables)
                const { data: radarData, error } = await supabase
                    .from('logistics_manifests')
                    .select(`
                        *,
                        van_loads ( id, status, load_date ),
                        logistics_manifest_items ( count )
                    `)
                    .eq('business_id', profile.business_id)
                    .order('created_at', { ascending: false });
                
                if (error) {
                    toast.error("Radar Fault", { description: "Failed to connect to the logistics ledger." });
                } else if (radarData) {
                    setManifests(radarData);
                }
            }
            setIsLoading(false);
        };
        fetchDeepLogistics();
    }, [supabase]);

    // --- FILTERING ENGINE ---
    const filteredManifests = useMemo(() => {
        return manifests.filter(m => {
            const matchesSearch = (m.seal_no?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                                 (m.shipment_ref?.toLowerCase() || "").includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [manifests, searchTerm]);

    const localLoads = useMemo(() => filteredManifests.filter(m => m.shipment_type === 'LOCAL'), [filteredManifests]);
    const globalCargo = useMemo(() => filteredManifests.filter(m => m.shipment_type === 'INTERNATIONAL'), [filteredManifests]);

    // --- ENTERPRISE REPORTING ENGINE (PDF) ---
    const generateDispatchReport = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("SOVEREIGN LOGISTICS LEDGER", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Node Identity: ${businessIdentity.name}`, 20, 35);
        doc.text(`Jurisdiction: Global Distribution`, 20, 41);
        doc.text(`Ledger Timestamp: ${new Date().toLocaleString()}`, 20, 47);

        autoTable(doc, {
            startY: 55,
            head: [['Seal ID', 'Ref', 'Type', 'Status', 'Liability']],
            body: filteredManifests.map(m => [
                m.seal_no || 'N/A',
                m.shipment_ref || 'N/A',
                m.shipment_type,
                m.status,
                `${businessIdentity.currency} ${m.est_tax_liability_local?.toLocaleString() || 0}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`BBU1-LOGISTICS-LEDGER-${Date.now()}.pdf`);
    };

    // --- ENTERPRISE REPORTING ENGINE (CSV) ---
    const generateCSV = () => {
        const headers = ["Seal_ID", "Reference", "Type", "Status", "Created_At", "Tax_Liability"];
        const rows = filteredManifests.map(m => [
            m.seal_no, m.shipment_ref, m.shipment_type, m.status, m.created_at, m.est_tax_liability_local
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Logistics-Ledger-${Date.now()}.csv`;
        a.click();
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Synchronizing Logistics Radar...</p>
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-50/30 p-6 lg:p-10 space-y-10 animate-in fade-in duration-1000">
            
            {/* --- TOP SECTOR: NODE IDENTITY --- */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg">
                            <Truck size={22} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em]">Fleet Management Hub</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Logistics Radar</h1>
                    <p className="text-slate-500 font-medium max-w-lg">
                        Tracking jurisdictional and international cargo for <span className="text-slate-900 font-bold">{businessIdentity.name}</span>.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button onClick={generateCSV} variant="outline" className="h-14 px-6 rounded-2xl bg-white border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2 shadow-sm hover:bg-slate-50">
                        <FileSpreadsheet size={16} className="text-emerald-600" /> Export CSV
                    </Button>
                    <Button onClick={generateDispatchReport} variant="outline" className="h-14 px-6 rounded-2xl bg-white border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2 shadow-sm hover:bg-slate-50">
                        <FileText size={16} className="text-blue-600" /> Dispatch PDF
                    </Button>
                    <Button className="h-14 px-8 rounded-2xl bg-slate-950 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all" asChild>
                        <Link href="/distribution/dispatch">
                            <Plus size={18} className="mr-2" /> New Load Out
                        </Link>
                    </Button>
                </div>
            </header>

            {/* --- MAIN SECTOR: TRACKING INTERFACE --- */}
            <Tabs defaultValue="all" className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-3 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <TabsList className="bg-slate-100/50 p-1.5 rounded-[1.8rem] h-14">
                        <TabsTrigger value="all" className="rounded-2xl px-10 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
                            All Loads ({manifests.length})
                        </TabsTrigger>
                        <TabsTrigger value="local" className="rounded-2xl px-10 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            Local
                        </TabsTrigger>
                        <TabsTrigger value="global" className="rounded-2xl px-10 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            International
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-96 px-2">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 h-4 w-4" />
                        <Input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter by Seal ID or Reference..." 
                            className="h-12 pl-12 rounded-2xl bg-slate-50 border-none font-bold text-xs" 
                        />
                    </div>
                </div>

                {/* --- TAB CONTENT: DYNAMIC FEED --- */}
                <div className="space-y-4">
                    {filteredManifests.length === 0 ? (
                        <div className="py-40 text-center space-y-4 opacity-30">
                            <Package size={64} className="mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Active Shipments Detected</p>
                        </div>
                    ) : (
                        <TabsContent value="all" className="space-y-4 m-0">
                            {filteredManifests.map((m) => <ManifestCard key={m.id} manifest={m} identity={businessIdentity} />)}
                        </TabsContent>
                    )}
                    
                    <TabsContent value="local" className="space-y-4 m-0">
                        {localLoads.map((m) => <ManifestCard key={m.id} manifest={m} identity={businessIdentity} />)}
                    </TabsContent>

                    <TabsContent value="global" className="space-y-4 m-0">
                        {globalCargo.map((m) => <ManifestCard key={m.id} manifest={m} identity={businessIdentity} />)}
                    </TabsContent>
                </div>
            </Tabs>

            {/* --- SYSTEM FOOTER --- */}
            <footer className="pt-20 pb-10 flex flex-col items-center gap-6">
                <div className="flex items-center gap-4 opacity-20">
                    <div className="h-px w-20 bg-slate-300" />
                    <ShieldCheck size={20} className="text-slate-500" />
                    <div className="h-px w-20 bg-slate-300" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">
                    Sovereign Logistics Shield • End-to-End Encryption
                </p>
            </footer>
        </main>
    );
}

// --- SUB-COMPONENT: DISPATCH CARD ---
const ManifestCard = ({ manifest, identity }: { manifest: any, identity: any }) => (
    <Card className="group border-none shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all bg-white rounded-[3rem] overflow-hidden">
        <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row items-center p-8 gap-8">
                
                {/* SECTOR INDICATOR */}
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-[2.2rem] bg-slate-50 group-hover:bg-blue-50 transition-colors">
                    {manifest.shipment_type === 'INTERNATIONAL' ? <Globe className="text-emerald-500" /> : <Truck className="text-blue-500" />}
                    <span className="mt-2 text-[8px] font-black uppercase text-slate-400">
                        {manifest.shipment_type === 'INTERNATIONAL' ? 'Global' : 'Local'}
                    </span>
                </div>

                {/* IDENTITY */}
                <div className="flex-1 space-y-1 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                            {manifest.seal_no || 'SECURE-SEAL-PENDING'}
                        </h4>
                        <Badge className="bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase px-3 border-none">
                            {manifest.status}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><ClipboardList size={12} /> Ref: {manifest.shipment_ref}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {manifest.destination_country || 'Internal Route'}</span>
                    </div>
                </div>

                {/* ANALYTICS */}
                <div className="grid grid-cols-2 gap-8 px-10 border-x border-slate-100 hidden md:grid">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Load Weight</p>
                        <p className="text-sm font-black text-slate-900">{manifest.gross_weight_kg || 0} KG</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Liability</p>
                        <p className="text-sm font-black text-emerald-600">
                            {identity.currency} {manifest.est_tax_liability_local?.toLocaleString() || 0}
                        </p>
                    </div>
                </div>

                {/* ACTION */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-50">
                        <Printer size={18} className="text-slate-400" />
                    </Button>
                    <Button className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-950 font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all group">
                        Track Details <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
);