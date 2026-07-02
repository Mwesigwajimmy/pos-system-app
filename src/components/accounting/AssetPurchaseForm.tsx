'use client';

/**
 * --- ASSET PURCHASE MANAGEMENT ---
 * VERSION: v2.5 PROFESSIONAL
 * Use: Recording business equipment and property with direct ledger integration.
 * Logic: Multi-currency support + automated vouchers + receipt document storage.
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const supabase = createClient();

export default function AssetPurchaseForm() {
    const queryClient = useQueryClient();
    
    // --- FORM STATE ---
    const [isUploading, setIsUploading] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [assetName, setAssetName] = useState("");
    const [cost, setCost] = useState("");
    const [serial, setSerial] = useState("");
    const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // 1. IDENTITY: Get Business Profile and Currency
    const { data: profile } = useQuery({
        queryKey: ['business_profile_context'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('business_id, business_name, currency').eq('id', user?.id).single();
            return data;
        }
    });

    // 2. DATA: Fetch authorized Bank/Cash accounts for this business
    const { data: accounts } = useQuery({
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

    // 3. STORAGE: Secure Document Upload to 'receipts' bucket
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `assets/receipt-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('receipts') 
            .upload(fileName, file);

        if (error) {
            toast.error("Upload Error", { description: error.message });
        } else {
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(data.path);
            setReceiptUrl(publicUrl);
            toast.success("Document uploaded successfully.");
        }
        setIsUploading(false);
    };

    // 4. ACTION: Finalize the Purchase in the Records
    const authorizePurchase = useMutation({
        mutationFn: async () => {
            if (!selectedAccountId || !assetName || !cost) {
                throw new Error("Please complete all required fields.");
            }

            const { error } = await supabase.rpc('proc_record_asset_acquisition', {
                p_asset_name: assetName,
                p_cost: parseFloat(cost),
                p_account_id: selectedAccountId,
                p_serial: serial || 'N/A',
                p_receipt_url: receiptUrl,
                p_voucher_no: `V-ASSET-${Date.now().toString().slice(-6)}`
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Purchase Recorded", { description: "The asset has been added to your business records." });
            queryClient.invalidateQueries({ queryKey: ['asset_payment_accounts'] });
            
            // Clear form
            setAssetName(""); setCost(""); setSerial(""); setReceiptUrl(null); setSelectedAccountId("");
        },
        onError: (err: any) => toast.error("System Error", { description: err.message })
    });

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            
            {/* PAGE HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <PackagePlus className="text-blue-600" size={28} /> Record Asset Purchase
                    </h1>
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Enterprise Capital Expenditure Management</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{profile?.business_name}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* 1. ASSET SPECIFICATIONS SECTION */}
                <div className="lg:col-span-7 space-y-8">
                    <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 py-4 px-8 border-b border-slate-100">
                            <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                <Tag size={14} /> 1. Asset Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Asset Name / Description</Label>
                                <Input 
                                    value={assetName} 
                                    onChange={e => setAssetName(e.target.value)} 
                                    placeholder="e.g. Office Computer, Delivery Vehicle, Generator..." 
                                    className="h-12 rounded-xl border-slate-200 font-semibold text-slate-900 shadow-sm" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Serial Number</Label>
                                    <Input 
                                        value={serial} 
                                        onChange={e => setSerial(e.target.value)} 
                                        placeholder="Manufacturer ID" 
                                        className="h-12 rounded-xl border-slate-200" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Date of Purchase</Label>
                                    <Input 
                                        type="date" 
                                        value={purchaseDate} 
                                        onChange={e => setPurchaseDate(e.target.value)} 
                                        className="h-12 rounded-xl border-slate-200 font-bold" 
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50">
                                <Label className="text-[11px] font-bold text-slate-500 uppercase block mb-4">Upload Receipt Copy</Label>
                                <div className="relative h-40 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center transition-all hover:bg-slate-50 hover:border-blue-300 group">
                                    {receiptUrl ? (
                                        <div className="text-center space-y-2">
                                            <div className="bg-emerald-100 p-3 rounded-xl inline-block">
                                                <FileCheck size={24} className="text-emerald-600" />
                                            </div>
                                            <p className="text-[10px] font-bold text-emerald-700 uppercase">Document Attached</p>
                                            <button onClick={() => setReceiptUrl(null)} className="text-[9px] font-bold text-slate-400 underline hover:text-red-500">Remove</button>
                                        </div>
                                    ) : (
                                        <>
                                            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            <UploadCloud size={32} className="text-slate-300 mb-2 group-hover:text-blue-500" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select PDF or Image file</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. FINANCIAL SETTLEMENT SECTION */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white p-10 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet size={16} className="text-blue-400" />
                                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Payment Account</Label>
                                </div>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white focus:ring-blue-600">
                                        <SelectValue placeholder="Identify Payment Source" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none">
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id} className="py-3 font-bold text-xs uppercase">
                                                {acc.name} <span className="text-blue-400 ml-2">[{acc.current_balance.toLocaleString()} {acc.currency}]</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-8 border-t border-white/5 space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Amount Paid</Label>
                                    <Badge className="bg-blue-600 text-white font-bold text-[10px] uppercase border-none">{activeCurrency}</Badge>
                                </div>
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        value={cost} 
                                        onChange={e => setCost(e.target.value)} 
                                        className="h-16 bg-white/5 border-white/10 rounded-2xl font-bold text-white text-4xl tabular-nums pl-12 shadow-inner focus-visible:ring-0" 
                                    />
                                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10" size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button 
                                onClick={() => authorizePurchase.mutate()}
                                disabled={authorizePurchase.isPending || isUploading || !selectedAccountId}
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 border-none uppercase tracking-widest text-xs"
                            >
                                {authorizePurchase.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Verify & Save Purchase"}
                            </Button>

                            <div className="flex justify-center items-center gap-3 opacity-30">
                                <ShieldCheck size={14} />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white">Financial Reconciliation Active</span>
                            </div>
                        </div>
                    </Card>

                    {/* INFORMATION FOOTNOTE */}
                    <Card className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-50">
                            <Activity size={18} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
                            Authorization will trigger an immediate debit entry to your fixed asset register and a credit entry to the selected cash account.
                        </p>
                    </Card>
                </div>

            </div>
        </div>
    );
}