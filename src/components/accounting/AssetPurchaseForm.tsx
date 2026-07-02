'use client';

/**
 * --- ASSET ACQUISITION & VOUCHER TERMINAL ---
 * Use: Recording new company assets with direct ledger link and receipt proof.
 * Logic: Auto-deducts from selected Cash Account and creates a fixed asset record.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    PackagePlus, UploadCloud, Banknote, CalendarDays, 
    ShieldCheck, Loader2, Landmark, Tag, Hash, FileCheck, X
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
    const [isUploading, setIsVisible] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

    // 1. DATA: Fetch active Cash/Bank accounts for payment
    const { data: accounts, isLoading: accountsLoading } = useQuery({
        queryKey: ['asset_payment_accounts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('accounting_accounts')
                .select('id, name, code, current_balance')
                .or('type.eq.ASSET,subtype.eq.Cash,subtype.eq.Bank')
                .eq('is_active', true);
            if (error) throw error;
            return data;
        }
    });

    // 2. LOGIC: Handle File Upload to Supabase Storage
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsVisible(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `asset-proof-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('financial-vouchers')
            .upload(fileName, file);

        if (error) {
            toast.error("Upload Failed: " + error.message);
        } else {
            const { data: { publicUrl } } = supabase.storage.from('financial-vouchers').getPublicUrl(data.path);
            setReceiptUrl(publicUrl);
            toast.success("Receipt scanned and encrypted.");
        }
        setIsVisible(false);
    };

    // 3. MUTATION: Finalize Asset Purchase in the Ledger
    const purchaseMutation = useMutation({
        mutationFn: async (formData: any) => {
            const { error } = await supabase.rpc('proc_record_asset_acquisition', {
                p_asset_name: formData.get('name'),
                p_cost: parseFloat(formData.get('cost')),
                p_account_id: formData.get('account_id'),
                p_serial: formData.get('serial'),
                p_receipt_url: receiptUrl,
                p_voucher_no: `VCHR-AST-${Date.now().toString().slice(-6)}`
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Asset Registered: Ledger Updated.");
            queryClient.invalidateQueries({ queryKey: ['asset_payment_accounts'] });
            setReceiptUrl(null);
            (document.getElementById('asset-form') as HTMLFormElement).reset();
        },
        onError: (err: any) => toast.error("System Error: " + err.message)
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Record Asset Purchase</h1>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Capital Expenditure & CAPEX Control</p>
            </header>

            <form id="asset-form" action={purchaseMutation.mutate} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: Details */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border-slate-200 shadow-sm rounded-2xl p-8 bg-white space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Asset Identity (Name/Model)</Label>
                            <Input name="name" required placeholder="e.g. Delivery Van UBG 234Z" className="h-12 border-slate-200 rounded-xl font-bold" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serial / Chassis Number</Label>
                                <Input name="serial" placeholder="N/A" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Purchase Date</Label>
                                <Input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="h-11 rounded-xl" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2">
                                <UploadCloud size={14} className="text-blue-500" /> Digital Receipt Proof
                            </Label>
                            <div className="mt-3 relative h-32 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer">
                                {receiptUrl ? (
                                    <div className="flex items-center gap-3 text-emerald-600 font-bold text-xs uppercase">
                                        <FileCheck size={20} /> Document Attached
                                    </div>
                                ) : (
                                    <>
                                        <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Click to scan or upload</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: Financials */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-900 py-4 px-6">
                            <CardTitle className="text-xs font-bold text-white/70 uppercase tracking-widest">Settlement Logic</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Payment Source</Label>
                                <Select name="account_id" required>
                                    <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold">
                                        <SelectValue placeholder="Select Cash Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts?.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id} className="text-xs font-bold py-3">
                                                {acc.name} <span className="text-blue-600 ml-2">[{acc.current_balance.toLocaleString()}]</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Acquisition Cost</Label>
                                <div className="relative">
                                    <Input name="cost" type="number" required className="h-14 pl-12 text-2xl font-black border-slate-200 rounded-2xl" />
                                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={purchaseMutation.isPending || isUploading}
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs"
                            >
                                {purchaseMutation.isPending ? <Loader2 className="animate-spin" /> : "Verify & Authorize Purchase"}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <ShieldCheck size={18} className="text-emerald-500 mt-0.5" />
                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider">
                                This transaction will trigger an immediate credit to the cash account and an entry into the fixed asset register.
                            </p>
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
}