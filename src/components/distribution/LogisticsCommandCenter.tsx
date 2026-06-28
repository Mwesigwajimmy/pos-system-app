'use client';

/**
 * --- LOGISTICS MANAGEMENT DASHBOARD ---
 * VERSION: v4.6 PROFESSIONAL
 * Use: Multi-Sector Shipment Tracking & Reporting
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
    const [businessProfile, setBusinessProfile] = useState({ name: "Authorized Business", currency: "UGX" });
    const supabase = createClient();

    // --- DATABASE SYNCHRONIZATION ---
    useEffect(() => {
        const fetchLogisticsData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Business Identity
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id, business_name')
                .eq('id', user.id).single();
            
            if (profile) {
                const { data: identity } = await supabase
                    .from('view_bbu1_corporate_identity')
                    .select('legal_name, currency_code')
                    .eq('business_id', profile.business_id).maybeSingle();
                
                setBusinessProfile({
                    name: identity?.legal_name || profile.business_name,
                    currency: identity?.currency_code || "UGX"
                });

                // 2. Fetch Shipment Manifests
                const { data: shipmentData, error } = await supabase
                    .from('logistics_manifests')
                    .select(`
                        *,
                        van_loads ( id, status, load_date ),
                        logistics_manifest_items ( count )
                    `)
                    .eq('business_id', profile.business_id)
                    .order('created_at', { ascending: false });
                
                if (error) {
                    toast.error("Connection Error", { description: "Could not retrieve shipment records." });
                } else if (shipmentData) {
                    setManifests(shipmentData);
                }
            }
            setIsLoading(false);
        };
        fetchLogisticsData();
    }, [supabase]);

    // --- FILTERING LOGIC ---
    const filteredManifests = useMemo(() => {
        return manifests.filter(m => {
            const matchesSearch = (m.seal_no?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                                 (m.shipment_ref?.toLowerCase() || "").includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [manifests, searchTerm]);

    const localShipments = useMemo(() => filteredManifests.filter(m => m.shipment_type === 'LOCAL'), [filteredManifests]);
    const internationalShipments = useMemo(() => filteredManifests.filter(m => m.shipment_type === 'INTERNATIONAL'), [filteredManifests]);

    // --- REPORT GENERATION (PDF) ---
    const generatePDFReport = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("LOGISTICS SHIPMENT LEDGER", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Business: ${businessProfile.name}`, 20, 35);
        doc.text(`Date: ${new Date().toLocaleString()}`, 20, 41);

        autoTable(doc, {
            startY: 50,
            head: [['Security Seal', 'Reference', 'Type', 'Status', 'Tax/Duty']],
            body: filteredManifests.map(m => [
                m.seal_no || 'Pending',
                m.shipment_ref || 'N/A',
                m.shipment_type,
                m.status,
                `${businessProfile.currency} ${m.est_tax_liability_local?.toLocaleString() || 0}`
            ]),
            headStyles: { fillColor: [51, 65, 85] }
        });

        doc.save(`Shipment-Report-${Date.now()}.pdf`);
    };

    // --- DATA EXPORT (CSV) ---
    const generateCSVExport = () => {
        const headers = ["Security_Seal", "Reference", "Type", "Status", "Date", "Liability"];
        const rows = filteredManifests.map(m => [
            m.seal_no, m.shipment_ref, m.shipment_type, m.status, m.created_at, m.est_tax_liability_local
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Logistics-Data-${Date.now()}.csv`;
        a.click();
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading Shipment Records...</p>
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-50/20 p-6 lg:p-10 space-y-10 animate-in fade-in duration-500">
            
            {/* --- HEADER SECTION --- */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Truck size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Logistics Management</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shipment Tracking</h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Monitor active deliveries and global cargo for <span className="text-slate-800 font-semibold">{businessProfile.name}</span>.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button onClick={generateCSVExport} variant="outline" className="h-11 px-5 rounded-xl bg-white border-slate-200 font-bold text-[10px] uppercase tracking-wider gap-2 hover:bg-slate-50">
                        <FileSpreadsheet size={15} className="text-emerald-600" /> Export CSV
                    </Button>
                    <Button onClick={generatePDFReport} variant="outline" className="h-11 px-5 rounded-xl bg-white border-slate-200 font-bold text-[10px] uppercase tracking-wider gap-2 hover:bg-slate-50">
                        <FileText size={15} className="text-blue-600" /> Export PDF
                    </Button>
                    <Button className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all" asChild>
                        <Link href="/distribution/dispatch">
                            <Plus size={16} className="mr-2" /> New Shipment
                        </Link>
                    </Button>
                </div>
            </header>

            {/* --- FILTER & TABS --- */}
            <Tabs defaultValue="all" className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm">
                    <TabsList className="bg-slate-50 p-1 rounded-xl h-12">
                        <TabsTrigger value="all" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            All ({manifests.length})
                        </TabsTrigger>
                        <TabsTrigger value="local" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                            Local
                        </TabsTrigger>
                        <TabsTrigger value="global" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600">
                            International
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-80 px-2">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                        <Input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Seal ID or Ref..." 
                            className="h-10 pl-10 rounded-xl bg-slate-50 border-none font-medium text-xs text-slate-700" 
                        />
                    </div>
                </div>

                {/* --- SHIPMENT FEED --- */}
                <div className="space-y-4">
                    {filteredManifests.length === 0 ? (
                        <div className="py-32 text-center space-y-3 opacity-40">
                            <Package size={48} className="mx-auto text-slate-300" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No shipments found</p>
                        </div>
                    ) : (
                        <TabsContent value="all" className="space-y-4 m-0">
                            {filteredManifests.map((m) => <ManifestCard key={m.id} manifest={m} profile={businessProfile} />)}
                        </TabsContent>
                    )}
                    
                    <TabsContent value="local" className="space-y-4 m-0">
                        {localShipments.map((m) => <ManifestCard key={m.id} manifest={m} profile={businessProfile} />)}
                    </TabsContent>

                    <TabsContent value="global" className="space-y-4 m-0">
                        {internationalShipments.map((m) => <ManifestCard key={m.id} manifest={m} profile={businessProfile} />)}
                    </TabsContent>
                </div>
            </Tabs>

            {/* --- FOOTER --- */}
            <footer className="pt-16 pb-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-4 opacity-30">
                    <div className="h-px w-16 bg-slate-300" />
                    <ShieldCheck size={18} className="text-slate-400" />
                    <div className="h-px w-16 bg-slate-300" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Secure Logistics Management System
                </p>
            </footer>
        </main>
    );
}

// --- SUB-COMPONENT: SHIPMENT CARD ---
const ManifestCard = ({ manifest, profile }: { manifest: any, profile: any }) => (
    <Card className="group border border-slate-100 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row items-center p-6 gap-6">
                
                {/* ICON */}
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-slate-50 group-hover:bg-blue-50 transition-colors border border-slate-100/50">
                    {manifest.shipment_type === 'INTERNATIONAL' ? <Globe size={24} className="text-emerald-500" /> : <Truck size={24} className="text-blue-500" />}
                    <span className="mt-2 text-[8px] font-bold uppercase text-slate-400">
                        {manifest.shipment_type === 'INTERNATIONAL' ? 'Global' : 'Local'}
                    </span>
                </div>

                {/* INFO */}
                <div className="flex-1 space-y-1 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                        <h4 className="text-md font-bold text-slate-900 uppercase tracking-tight">
                            {manifest.seal_no || 'Verification Pending'}
                        </h4>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 font-bold text-[8px] uppercase px-2 border-none rounded-md">
                            {manifest.status}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ClipboardList size={11} /> Ref: {manifest.shipment_ref}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin size={11} /> {manifest.destination_country || 'Internal Route'}</span>
                    </div>
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-2 gap-8 px-8 border-x border-slate-100 hidden md:grid">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gross Weight</p>
                        <p className="text-sm font-bold text-slate-700">{manifest.gross_weight_kg || 0} KG</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tax/Duty Liability</p>
                        <p className="text-sm font-bold text-emerald-600">
                            {profile.currency} {manifest.est_tax_liability_local?.toLocaleString() || 0}
                        </p>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-blue-600">
                        <Printer size={16} />
                    </Button>
                    <Button className="h-11 px-6 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-all">
                        Details <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
);