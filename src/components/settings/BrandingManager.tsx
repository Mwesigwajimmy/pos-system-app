'use client';

import React, { useState, useEffect, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, UploadCloud, Palette, ShieldCheck, X, 
    Building2, User, Phone, Mail, MapPin, Hash, 
    Landmark, UserCheck, Send, AlertTriangle, Activity, Clock, CheckCircle2
} from 'lucide-react';

// UPGRADE: Identity Broadcast Handshake
import { useBranding } from '@/components/core/BrandingProvider';

// --- ENTERPRISE IDENTITY SCHEMA ---
const brandingSchema = z.object({
  primary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Hex required").or(z.literal('')),
  secondary_color: z.string().optional(),
  company_name_display: z.string().min(2, "Official company name required"),
  plot_number: z.string().optional(),
  po_box: z.string().optional(),
  official_email: z.string().email("Valid corporate email required").or(z.literal('')),
  official_phone: z.string().optional(),
  tin_number: z.string().optional(),
  ceo_name: z.string().optional(),
  ceo_role: z.string().optional(),
  payment_instructions: z.string().optional(),
  logo_file: z.any().optional()
});

type BrandingFormInput = z.infer<typeof brandingSchema>;

// --- Sub-Component: Identity Logo Engine ---
const LogoUploader = memo(() => {
    const { control, watch, setValue } = useFormContext<BrandingFormInput>();
    const [preview, setPreview] = useState<string | null>(null);
    const logoFile = watch('logo_file');
    
    useEffect(() => {
        if (!logoFile?.[0] || !(logoFile[0] instanceof File)) { 
            setPreview(null); 
            return; 
        }
        const url = URL.createObjectURL(logoFile[0]);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [logoFile]);

    return (
        <FormField control={control} name="logo_file" render={({ field: { onChange } }) => (
            <FormItem className="col-span-full">
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Corporate Identity Logo</FormLabel>
                <div className="relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-[3rem] border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer overflow-hidden bg-slate-50/50 shadow-inner">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => onChange(e.target.files)} />
                    {preview ? (
                        <div className="relative w-full h-full p-10 z-10">
                            <Image src={preview} alt="Logo Preview" layout="fill" objectFit="contain" className="p-4" />
                            <Button 
                                type="button"
                                size="icon" 
                                variant="destructive" 
                                className="absolute top-6 right-6 rounded-full h-12 w-12 shadow-2xl z-30 transform hover:scale-110 transition-all" 
                                onClick={(e) => { e.preventDefault(); setValue('logo_file', undefined, { shouldDirty: true }); }}
                            >
                                <X size={20}/>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 pointer-events-none">
                            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto text-blue-600 border border-slate-100">
                                <UploadCloud size={32}/>
                            </div>
                            <div>
                                <p className="text-base font-black text-slate-900 uppercase tracking-tighter">Broadcast Identity Logo</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">High-Res PNG, SVG or JPG • Max 2MB</p>
                            </div>
                        </div>
                    )}
                </div>
            </FormItem>
        )} />
    );
});

// --- Main Identity Hub ---
export default function BrandingManager() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { refreshBranding } = useBranding(); // Access global identity refresh protocol

    // 1. DATA: NEURAL FETCH
    const { data: settings, isLoading, isError, error } = useQuery({
        queryKey: ['brandingSettings'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_branding_settings').single();
            if (error) throw error;
            return data;
        }
    });

    const form = useForm<BrandingFormInput>({
        resolver: zodResolver(brandingSchema),
        defaultValues: { 
            primary_color: '#1D4ED8', 
            company_name_display: '',
            ceo_role: 'Chief Executive Officer'
        }
    });

    useEffect(() => {
        if (settings) {
            form.reset({
                ...settings,
                logo_file: undefined
            });
        }
    }, [settings, form]);

    // 2. DATA: ATOMIC SYNCHRONIZATION & BROADCAST
    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let finalLogoUrl = settings?.logo_url || null;
            
            // Handle logo storage lifecycle
            if (values.logo_file?.[0] && values.logo_file[0] instanceof File) {
                const file = values.logo_file[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `corp-id-${Date.now()}.${fileExt}`;
                
                const { error: upErr } = await supabase.storage.from('branding-assets').upload(fileName, file);
                if (upErr) throw upErr;
                
                const { data: { publicUrl } } = supabase.storage.from('branding-assets').getPublicUrl(fileName);
                finalLogoUrl = publicUrl;
            }

            const { error } = await supabase.rpc('update_branding_settings', {
                p_logo_url: finalLogoUrl, 
                p_primary_color: values.primary_color,
                p_secondary_color: values.secondary_color || null, 
                p_company_name: values.company_name_display,
                p_plot: values.plot_number || '', 
                p_pobox: values.po_box || '', 
                p_email: values.official_email || '',
                p_phone: values.official_phone || '', 
                p_tin: values.tin_number || '', 
                p_ceo: values.ceo_name || '',
                p_role: values.ceo_role || '', 
                p_payment: values.payment_instructions || ''
            });
            
            if (error) throw error;
        },
        onSuccess: async () => {
            // THE SOVEREIGN WELD: Force the system to recognize new identity immediately
            await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
            await queryClient.invalidateQueries({ queryKey: ['bbu1_corporate_identity'] });
            
            // Trigger the global context to refresh Sidebar and Headers
            refreshBranding();
            
            toast.success("Corporate Identity Synchronized Globally");
        },
        onError: (err: any) => {
            toast.error(`Sync Failure: ${err.message}`);
        }
    });

    if (isLoading) return (
        <div className="p-32 text-center flex flex-col items-center gap-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="font-black text-slate-300 uppercase tracking-[0.5em] text-sm animate-pulse">
                Waking BBU1 Identity Engine...
            </p>
        </div>
    );

    if (isError) return (
        <div className="p-20 text-center bg-red-50 rounded-[4rem] border border-red-100 max-w-4xl mx-auto shadow-2xl">
            <AlertTriangle className="mx-auto text-red-500 mb-6" size={64} />
            <h3 className="text-2xl font-black text-red-900 uppercase tracking-tighter italic">Neural Ledger Handshake Failed</h3>
            <p className="text-red-600 font-bold text-sm mt-3 uppercase tracking-widest leading-relaxed">
                {error?.message || "Internal Protocol Error: Check DB Configuration"}
            </p>
        </div>
    );

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((d) => handleSave(d))} className="space-y-12 animate-in fade-in duration-1000 max-w-[1400px] mx-auto pb-32">
                <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] rounded-[4rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white p-14 border-b border-white/5 relative">
                        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
                            <ShieldCheck size={240} />
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                            <div className="flex items-center gap-10">
                                <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-all duration-700">
                                    <Building2 size={56} className="text-white"/>
                                </div>
                                <div>
                                    <CardTitle className="text-5xl font-black uppercase tracking-tighter italic leading-none">Identity Terminal</CardTitle>
                                    <div className="flex items-center gap-4 mt-5">
                                        <Badge className="bg-blue-500/20 text-blue-400 border-none font-black text-[12px] tracking-[0.4em] px-6 py-2 uppercase rounded-full">BBU1_SOVEREIGN_HUB</Badge>
                                        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-widest">
                                            <Clock size={14}/> SYSTEM_SYNC_v5.2
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 px-8 py-3 bg-white/5 rounded-[2rem] backdrop-blur-3xl border border-white/10 shadow-inner">
                                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">Ledger Real-Time Connection</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-16 space-y-20 bg-white">
                        {/* VISUAL STANDARDS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            <LogoUploader />
                            
                            <div className="space-y-10 p-12 bg-slate-50/50 rounded-[3.5rem] border border-slate-100 shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Palette size={120} />
                                </div>
                                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-4 relative z-10">
                                    <Palette size={18} className="text-blue-600"/> 1. Master Visual Standards
                                </h3>
                                <div className="space-y-8 relative z-10">
                                    <FormField control={form.control} name="company_name_display" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-500">Official Registered Display Name</FormLabel>
                                            <FormControl>
                                                <Input className="h-16 font-black rounded-[1.25rem] border-slate-200 text-xl shadow-sm focus:border-blue-600 transition-all bg-white px-8" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="primary_color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-500">Brand Primary Accent Hex</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Palette className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                                                    <Input className="h-16 pl-16 font-mono font-black rounded-[1.25rem] border-slate-200 text-2xl shadow-sm bg-white" {...field} />
                                                    {field.value && (
                                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl border-4 border-white shadow-2xl" style={{backgroundColor: field.value}}/>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        {/* STATIONERY DNA SECTION */}
                        <div className="space-y-10 pt-10 border-t border-slate-100">
                            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-5">
                                <MapPin size={22} className="text-blue-600"/> 2. Corporate Stationery Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <FormField control={form.control} name="plot_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-slate-500">Plot / Street Address</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-5 top-5 h-5 w-5 text-slate-300"/><Input className="h-16 pl-14 font-bold rounded-2xl bg-slate-50 border-slate-200 shadow-inner px-8" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="po_box" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-slate-500">P.O. Box Protocol</FormLabel><FormControl><div className="relative"><Landmark className="absolute left-5 top-5 h-5 w-5 text-slate-300"/><Input className="h-16 pl-14 font-bold rounded-2xl bg-slate-50 border-slate-200 shadow-inner px-8" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="tin_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-orange-600">Company TIN Identifier</FormLabel><FormControl><div className="relative"><Hash className="absolute left-5 top-5 h-5 w-5 text-slate-300"/><Input className="h-16 pl-14 font-black rounded-2xl bg-slate-50 border-slate-200 font-mono text-xl" {...field} /></div></FormControl></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <FormField control={form.control} name="official_email" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-slate-500">Official Email</FormLabel><FormControl><div className="relative"><Mail className="absolute left-5 top-5 h-5 w-5 text-slate-300"/><Input className="h-16 pl-14 font-bold rounded-2xl bg-white border-slate-200 shadow-sm" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="official_phone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-slate-500">Support Phone</FormLabel><FormControl><div className="relative"><Phone className="absolute left-5 top-5 h-5 w-5 text-slate-300"/><Input className="h-16 pl-14 font-bold rounded-2xl bg-white border-slate-200 shadow-sm" {...field} /></div></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        {/* SIGNATORY & PAYMENT SECTION */}
                        <div className="space-y-10 pt-10 border-t border-slate-100">
                            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-5">
                                <UserCheck size={22} className="text-blue-600"/> 3. Formal Signatory & Disbursement
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <FormField control={form.control} name="ceo_name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-slate-500">Authorized Signatory Name</FormLabel><FormControl><div className="relative"><User className="absolute left-5 top-5 h-5 w-5 text-slate-300"/><Input className="h-16 pl-14 font-black rounded-2xl border-slate-200 shadow-sm text-lg" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="ceo_role" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-2 text-slate-500">Official Executive Role</FormLabel><FormControl><Input className="h-16 px-8 font-black rounded-2xl border-slate-200 text-lg bg-slate-50/50" placeholder="e.g. Managing Director" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                                    <FormItem className="col-span-full">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-3 flex items-center gap-3 text-blue-600">
                                            <Landmark size={14}/> 4. Global Disbursement Specifications (Appears on Quotes/Invoices)
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea className="min-h-[180px] font-bold rounded-[3rem] border-slate-200 p-10 text-sm bg-slate-50 focus:bg-white shadow-inner transition-all leading-relaxed" placeholder="Clearly specify Bank Name, Branch Code, Account Numbers, and Mobile Money Merchant identifiers..." {...field} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* FOOTER PROTOCOL */}
                        <div className="space-y-6 pt-10 border-t border-slate-100">
                            <Label className="text-[11px] font-black uppercase tracking-[0.4em] ml-3 text-blue-500">Master Fiscal Document Footer</Label>
                            <div className="relative group">
                                <ReceiptIcon className="absolute left-8 top-10 h-8 w-8 text-blue-300 group-focus-within:text-blue-600 transition-colors"/>
                                <Input name="receipt_footer" value={form.watch('receipt_footer') || ''} onChange={e => form.setValue('receipt_footer', e.target.value)} className="h-28 pl-20 italic font-bold text-slate-600 rounded-[2.5rem] border-blue-100 bg-blue-50/20 text-2xl shadow-inner border-2" placeholder="Thank you for choosing Sovereign ERP." />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50 p-14 border-t flex flex-col sm:flex-row items-center justify-between gap-12">
                        <div className="flex items-center gap-6 text-[12px] font-black text-slate-500 uppercase tracking-[0.5em]">
                            <div className="h-16 w-16 rounded-[2rem] bg-blue-100 flex items-center justify-center border border-blue-200 shadow-2xl">
                                <ShieldCheck className="text-blue-600 h-8 w-8" />
                            </div>
                            Sovereign Identity Sync Active
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isPending || !form.formState.isDirty} 
                            className="h-24 px-32 font-black bg-slate-900 hover:bg-blue-600 text-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.6)] rounded-[2.5rem] transition-all uppercase tracking-[0.3em] text-xl transform hover:scale-105 active:scale-95 group"
                        >
                            {isPending ? (
                                <><Loader2 className="animate-spin mr-5 h-10 w-10"/> BROADCASTING...</>
                            ) : (
                                <div className="flex items-center gap-6">
                                    <Send className="h-8 w-8 group-hover:translate-x-3 transition-transform" />
                                    Broadcast Identity Settings
                                </div>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* COMPLIANCE FOOTER */}
                <div className="flex justify-center items-center gap-10 opacity-30 py-10">
                    <div className="h-[1px] w-40 bg-slate-300" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.8em]">
                        BBU1 SOVEREIGN ENGINE • IDENTITY HUB v5.2
                    </p>
                    <div className="h-[1px] w-40 bg-slate-300" />
                </div>
            </form>
        </FormProvider>
    );
}