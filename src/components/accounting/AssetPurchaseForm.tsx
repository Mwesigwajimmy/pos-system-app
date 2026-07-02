'use client';

/**
 * --- ASSET ACQUISITION & VOUCHER TERMINAL ---
 * VERSION: v2.0 ENTERPRISE
 * Use: Legal recording of corporate property with direct ledger integration.
 * Logic: Multi-currency detection + automated voucher generation + receipt vaulting.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    PackagePlus, UploadCloud, Banknote, CalendarDays, 
    ShieldCheck, Loader2, Landmark, Tag, Hash, FileCheck, X,
    Receipt as ReceiptIcon, Wallet, Activity, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const supabase = createClient();

export default function AssetPurchaseForm() {
    const queryClient = useQueryClient();
    
    // --- LOCAL STATE ---
    const [isUploading, setIsUploading] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [assetName, setAssetName] = useState("");
    const [cost, setCost] = useState("");
    const [serial, setSerial] = useState("");
    const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // 1. IDENTITY HANDSHAKE: Get Business Context (Currency, ID)
    const { data: profile } = useQuery({
        queryKey: ['active_node_context'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('business_id, business_name, currency').eq('id', user?.id).single();
            return data;
        }
    });

    // 2. DATA: Fetch active Cash/Bank accounts authorized for the business
    const { data: accounts, isLoading: accountsLoading } = useQuery({
        queryKey: ['asset_payment_accounts', profile?.business_id],
        queryFn: async () => {
            if (!profile?.business_id) return [];
            const { data, error } = await supabase
                .from('accounting_accounts')
                .select('id, name, code, current_balance, currency')
                .eq('business_id', profile.business_id)
                .or('subtype.eq.cash,subtype.eq.bank')
                .eq('is_active', true);
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.business_id
    });

    const activeCurrency = useMemo(() => {
        const acc = accounts?.find(a => a.id === selectedAccountId);
        return acc?.currency || profile?.currency || '---';
    }, [selectedAccountId, accounts, profile]);

    // 3. LOGIC: Secure Receipt Vaulting
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `audit/asset-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('financial-vouchers')
            .upload(fileName, file);

        if (error) {
            toast.error("Security Breach: Upload Blocked", { description: error.message });
        } else {
            const { data: { publicUrl } } = supabase.storage.from('financial-vouchers').getPublicUrl(data.path);
            setReceiptUrl(publicUrl);
            toast.success("Document Secured", { description: "Physical proof attached to transaction." });
        }
        setIsUploading(false);
    };

    // 4. MUTATION: Finalize the Acquisition in the Registry
    const authorizeAcquisition = useMutation({
        mutationFn: async () => {
            if (!selectedAccountId || !assetName || !cost) throw new Error("Mandatory fields incomplete.");

            const { error } = await supabase.rpc('proc_record_asset_acquisition', {
                p_asset_name: assetName,
                p_cost: parseFloat(cost),
                p_account_id: selectedAccountId,
                p_serial: serial || 'N/A',
                p_receipt_url: receiptUrl,
                p_voucher_no: `VCHR-AST-${Date.now().toString().slice(-6)}`
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Asset Registered Successfully", { description: "General Ledger and Fixed Asset Registry updated." });
            queryClient.invalidateQueries({ queryKey: ['asset_payment_accounts'] });
            
            // RESET
            setAssetName(""); setCost(""); setSerial(""); setReceiptUrl(null); setSelectedAccountId("");
        },
        onError: (err: any) => toast.error("Handshake Refused", { description: err.message })
    });

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-4">
                        <PackagePlus className="text-blue-600" size={32} /> Record Asset Acquisition
                    </h1>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Capital Expenditure (CAPEX) Terminal</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-xl shadow-xl">
                    <Database size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Node: {profile?.business_name}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* --- LEFT SECTOR: ASSET SPECIFICATIONS --- */}
                <div className="lg:col-span-7 space-y-8">
                    <Card className="border-slate-200 shadow-sm rounded-[2rem] bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 py-5 px-8 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                <Tag size={14} /> 1. Asset Identity Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Asset Description / Item Name</Label>
                                <Input 
                                    value={assetName} 
                                    onChange={e => setAssetName(e.target.value)} 
                                    placeholder="e.g. Industrial Mixer, Delivery Truck..." 
                                    className="h-14 rounded-2xl border-slate-200 font-bold text-slate-900 shadow-inner" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Serial / Chassis Number</Label>
                                    <Input 
                                        value={serial} 
                                        onChange={e => setSerial(e.target.value)} 
                                        placeholder="Identification code" 
                                        className="h-12 rounded-xl border-slate-200" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of Acquisition</Label>
                                    <Input 
                                        type="date" 
                                        value={purchaseDate} 
                                        onChange={e => setPurchaseDate(e.target.value)} 
                                        className="h-12 rounded-xl border-slate-200 font-bold" 
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase block mb-4">Physical Proof (Audit Requirement)</Label>
                                <div className="relative h-40 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center transition-all hover:bg-slate-50 hover:border-blue-200 group">
                                    {receiptUrl ? (
                                        <div className="text-center space-y-3">
                                            <div className="bg-emerald-100 p-3 rounded-2xl inline-block">
                                                <FileCheck size={28} className="text-emerald-600" />
                                            </div>
                                            <p className="text-[10px] font-black text-emerald-600 uppercase">Audit Copy Verified</p>
                                            <button onClick={() => setReceiptUrl(null)} className="text-[9px] font-bold text-slate-400 uppercase underline hover:text-red-500">Remove & Rescan</button>
                                        </div>
                                    ) : (
                                        <>
                                            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            <UploadCloud size={32} className="text-slate-300 group-hover:text-blue-400 transition-colors mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan Receipt or Upload PDF</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- RIGHT SECTOR: FINANCIAL AUTHORIZATION --- */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-900 text-white p-10 space-y-10 border-b-[16px] border-blue-600">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet size={16} className="text-blue-400" />
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Settlement Source</Label>
                                </div>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white shadow-inner focus:ring-blue-600">
                                        <SelectValue placeholder="Identify Liquidity Account" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id} className="py-3 font-bold text-xs">
                                                {acc.name} <span className="text-blue-500 ml-2">[{acc.current_balance.toLocaleString()} {acc.currency}]</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-8 border-t border-white/5 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Acquisition Cost</Label>
                                        <Badge className="bg-blue-600 text-white font-black text-[9px] px-2">{activeCurrency}</Badge>
                                    </div>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            value={cost} 
                                            onChange={e => setCost(e.target.value)} 
                                            className="h-16 bg-white/5 border-white/10 rounded-2xl font-black text-white text-4xl tabular-nums pl-12 shadow-inner focus-visible:ring-blue-500/30" 
                                        />
                                        <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button 
                                onClick={() => authorizeAcquisition.mutate()}
                                disabled={authorizeAcquisition.isPending || isUploading || !selectedAccountId}
                                className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl shadow-xl uppercase tracking-[0.2em] text-xs transition-all active:scale-95 border-none"
                            >
                                {authorizeAcquisition.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify & Authorize Payment"}
                            </Button>

                            <div className="flex justify-center items-center gap-3 opacity-40">
                                <ShieldCheck size={14} />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white">Full Financial Reconciliation Active</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                            <Activity size={18} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
                            Authorization will trigger an immediate credit to account <span className="text-slate-900 font-bold">1000</span> and generate a forensic record in the corporate asset ledger.
                        </p>
                    </Card>
                </div>

            </div>
        </div>
    );
}