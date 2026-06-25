'use client';

/**
 * --- BBU1 SOVEREIGN BRANDING MANAGER ---
 * VERSION: v20.0 OMEGA-ULTIMATUM (THE APEX IDENTITY WELD)
 * JURISDICTION: Corporate Identity / Multi-Tenant / Global Standards
 * 
 * CORE ARCHITECTURAL FIXES & UPGRADES:
 * 1. GLOBAL DOCUMENT HEADER: Integrated forensic control for top-level document subjects.
 * 2. QUAD-COLOR MATRIX: Added Secondary, Accent (Company Name), and Document Text colors.
 * 3. WATERMARK ENGINE: Added dynamic opacity control for the corporate seal background.
 * 4. SCHEMA ALIGNMENT: Expanded validation to include Header, Colors, and Opacity.
 * 5. ZERO-ITALICS POLICY: Strictly clean, bold, enterprise typography for command centers.
 * 6. VALIDATION TELEMETRY: Detailed console logging for any structural identity failures.
 */

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
import { Label } from '@/components/ui/label'; 
import { 
    Loader2, UploadCloud, Palette, ShieldCheck, X, 
    Building2, User, Phone, Mail, MapPin, Hash, 
    Landmark, UserCheck, Send, AlertTriangle, Activity, Clock, CheckCircle2,
    Receipt as ReceiptIcon, Layers, Monitor, Sliders, Type, Award, Droplets
} from 'lucide-react';

import { useBranding } from '@/components/core/BrandingProvider';
import { useBusiness } from '@/context/BusinessContext';

// --- 1. FULL ENTERPRISE IDENTITY SCHEMA ---
const brandingSchema = z.object({
  company_name_display: z.string().min(2, "OFFICIAL COMPANY NAME REQUIRED"),
  primary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "HEX REQUIRED"),
  secondary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "HEX REQUIRED"),
  accent_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "HEX REQUIRED"),
  document_text_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "HEX REQUIRED"),
  watermark_opacity: z.coerce.number().min(0.01).max(0.5).default(0.05),
  
  plot_number: z.string().optional().nullable(),
  po_box: z.string().optional().nullable(),
  official_email: z.string().email("VALID CORPORATE EMAIL REQUIRED").or(z.literal('')).optional().nullable(),
  official_phone: z.string().optional().nullable(),
  tin_number: z.string().optional().nullable(),
  ceo_name: z.string().optional().nullable(),
  ceo_role: z.string().optional().nullable(),
  payment_instructions: z.string().optional().nullable(),
  document_header: z.string().optional().nullable(), // ✅ ADDED HEADER
  receipt_footer: z.string().optional().nullable(),   // ✅ ALIGNED FOOTER
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
                <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">CORPORATE IDENTITY MARK (LOGO)</FormLabel>
                <div className="relative group flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-[2.5rem] border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 transition-all cursor-pointer overflow-hidden bg-slate-50/50 shadow-inner">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => onChange(e.target.files)} />
                    {preview ? (
                        <div className="relative w-full h-full p-16 z-10 bg-white">
                            <Image src={preview} alt="Logo Preview" layout="fill" objectFit="contain" className="p-8" />
                            <Button 
                                type="button"
                                size="icon" 
                                variant="destructive" 
                                className="absolute top-8 right-8 rounded-full h-12 w-12 shadow-2xl z-30" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    setValue('logo_file', undefined, { shouldDirty: true }); 
                                }}
                            >
                                <X size={24}/>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-5 pointer-events-none">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto text-blue-600 border border-slate-50 group-hover:scale-110 transition-transform">
                                <UploadCloud size={40}/>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Upload identity DNA</p>
                                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">PNG, SVG or JPG (Max 2MB)</p>
                            </div>
                        </div>
                    )}
                </div>
            </FormItem>
        )} />
    );
});

export default function BrandingManager() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { refreshBranding } = useBranding();
    const { profile, isLoading: isIdentityLoading } = useBusiness();

    const { data: settings, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['brandingSettings'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_branding_settings').single();
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.business_id && profile?.is_ready,
        retry: 2
    });

    const form = useForm<BrandingFormInput>({
        resolver: zodResolver(brandingSchema),
        defaultValues: { 
            primary_color: '#2563eb', 
            secondary_color: '#0f172a',
            accent_color: '#1d4ed8',
            document_text_color: '#0f172a',
            watermark_opacity: 0.05,
            company_name_display: '',
            ceo_role: 'CHIEF EXECUTIVE OFFICER',
            document_header: '',
            receipt_footer: ''
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

    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let finalLogoUrl = settings?.logo_url || null;
            
            if (values.logo_file?.[0] && values.logo_file[0] instanceof File) {
                const file = values.logo_file[0];
                const fileName = `corp-id-${Date.now()}.${file.name.split('.').pop()}`;
                const { error: upErr } = await supabase.storage.from('branding-assets').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('branding-assets').getPublicUrl(fileName);
                finalLogoUrl = publicUrl;
            }

            // ✅ UPDATE RPC WITH ALL FORENSIC FIELDS
            const { error } = await supabase.rpc('update_branding_settings', {
                p_logo_url: finalLogoUrl, 
                p_primary_color: values.primary_color,
                p_secondary_color: values.secondary_color,
                p_accent_color: values.accent_color,
                p_doc_text_color: values.document_text_color,
                p_watermark_opacity: values.watermark_opacity,
                p_company_name: values.company_name_display,
                p_plot: values.plot_number || '', 
                p_pobox: values.po_box || '', 
                p_email: values.official_email || '',
                p_phone: values.official_phone || '', 
                p_tin: values.tin_number || '', 
                p_ceo: values.ceo_name || '',
                p_role: values.ceo_role || '', 
                p_payment: values.payment_instructions || '',
                p_header: values.document_header || '', // ✅ HEADER WELDED
                p_footer: values.receipt_footer || ''   // ✅ FOOTER WELDED
            });
            
            if (error) throw error;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
            await queryClient.invalidateQueries({ queryKey: ['bbu1_corporate_identity'] });
            refreshBranding();
            toast.success("Identity Vault Updated: Sovereign DNA Aligned.");
        },
        onError: (err: any) => {
            toast.error(`Sync Failure: ${err.message}`);
        }
    });

    // 🛡️ FORENSIC LOGGING
    const onInvalid = (errors: any) => {
        console.warn("[SOVEREIGN] Branding Validation Failure:", errors);
        toast.error("Form incomplete. Check required corporate fields.");
    };

    if (isLoading || isIdentityLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Resolving Sovereign Identity...</p>
        </div>
    );

    if (isError) return (
        <div className="max-w-xl mx-auto my-20 p-12 text-center bg-red-50 rounded-[2rem] border border-red-100 shadow-sm">
            <AlertTriangle className="mx-auto text-red-500 mb-6" size={56} />
            <h3 className="text-2xl font-black uppercase text-red-900 tracking-tight">Identity Breach</h3>
            <p className="text-red-600 text-xs mt-3 font-bold uppercase tracking-widest">{error?.message}</p>
            <Button className="mt-8 rounded-xl px-10 h-12 font-black uppercase tracking-widest" variant="outline" onClick={() => refetch()}>Retry Handshake</Button>
        </div>
    );

    return (
        <FormProvider {...form}>
            <form 
                onSubmit={form.handleSubmit((d) => handleSave(d), onInvalid)} 
                className="max-w-[1300px] mx-auto py-16 px-10 space-y-16 animate-in fade-in duration-700 pb-56"
            >
                {/* 1. MASTER CORPORATE IDENTITY HUB */}
                <div className="space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-10">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                                <Palette size={32} />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Branding architect</h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Visual Node Configuration Terminal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 px-5 py-2.5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Operational node: {profile?.business_name}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                        <div className="lg:col-span-7">
                            <LogoUploader />
                        </div>
                        
                        <div className="lg:col-span-5 bg-slate-900 text-white rounded-[3.5rem] p-12 shadow-2xl border-b-[12px] border-blue-600 space-y-10">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-400 border-l-4 border-blue-600 pl-4">Visual DNA Matrix</h3>
                            
                            <div className="space-y-8">
                                <FormField control={form.control} name="company_name_display" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Official display name</FormLabel>
                                        <FormControl><Input className="h-14 bg-white/5 border-white/10 rounded-2xl font-black uppercase text-sm focus:ring-blue-600 focus:border-blue-600" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField control={form.control} name="primary_color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">UI Primary DNA</FormLabel>
                                            <div className="relative group">
                                                <Input className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl font-mono text-[11px] font-black group-hover:border-blue-500" {...field} />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-white/20 shadow-md" style={{backgroundColor: field.value}}/>
                                            </div>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="secondary_color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">UI Secondary DNA</FormLabel>
                                            <div className="relative group">
                                                <Input className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl font-mono text-[11px] font-black group-hover:border-blue-500" {...field} />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border border-white/20 shadow-md" style={{backgroundColor: field.value}}/>
                                            </div>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <FormField control={form.control} name="accent_color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-blue-400 ml-1">Header Accent DNA</FormLabel>
                                            <div className="relative group">
                                                <Input className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl font-mono text-[11px] font-black group-hover:border-blue-500" {...field} />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg shadow-inner" style={{backgroundColor: field.value}}/>
                                            </div>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="document_text_color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Document Text DNA</FormLabel>
                                            <div className="relative group">
                                                <Input className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl font-mono text-[11px] font-black group-hover:border-blue-500" {...field} />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg shadow-inner" style={{backgroundColor: field.value}}/>
                                            </div>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <div className="flex justify-between items-center mb-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Background seal opacity</Label>
                                        <Badge className="bg-blue-600 text-white font-black border-none uppercase text-[9px]">{(form.watch("watermark_opacity") * 100).toFixed(0)}% Visibility</Badge>
                                    </div>
                                    <Input 
                                        type="range" 
                                        step="0.01" 
                                        min="0.01" 
                                        max="0.30" 
                                        {...form.register("watermark_opacity")} 
                                        className="h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. OPERATIONAL NODE REGISTRY */}
                <div className="space-y-8 pt-16 border-t border-slate-100">
                    <div className="flex items-center gap-5">
                        <Building2 className="text-slate-400" size={32} />
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Operational node registry</h2>
                    </div>
                    
                    <Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden p-12 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-10 group">
                        <FormField control={form.control} name="plot_number" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Physical address</FormLabel>
                                <FormControl><Input className="h-14 bg-white border-slate-200 rounded-2xl font-black uppercase text-xs hover:border-blue-500 transition-all" {...field} value={field.value || ''}/></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="po_box" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">P.O. Box</FormLabel>
                                <FormControl><Input className="h-14 bg-white border-slate-200 rounded-2xl font-black uppercase text-xs hover:border-blue-500 transition-all" {...field} value={field.value || ''}/></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="tin_number" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tax ID (TIN)</FormLabel>
                                <FormControl><Input className="h-14 bg-white border-slate-200 rounded-2xl font-black text-xs hover:border-blue-500 transition-all tracking-[0.2em]" {...field} value={field.value || ''}/></FormControl>
                            </FormItem>
                        )} />
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <FormField control={form.control} name="official_email" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Corporate node email</FormLabel>
                                <FormControl><Input className="h-14 bg-white border-slate-100 rounded-2xl font-black text-xs hover:border-blue-500 transition-all" {...field} value={field.value || ''}/></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="official_phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Registry phone</FormLabel>
                                <FormControl><Input className="h-14 bg-white border-slate-100 rounded-2xl font-black text-xs hover:border-blue-500 transition-all" {...field} value={field.value || ''}/></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* 3. AUTHORIZATION & FORENSIC SIGNATURES */}
                <div className="space-y-8 pt-16 border-t border-slate-100">
                    <div className="flex items-center gap-5">
                        <ShieldCheck className="text-emerald-500" size={32} />
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Authorization & Forensic signatures</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Card className="rounded-[3rem] border-slate-100 shadow-sm p-12 bg-slate-50/50 space-y-10">
                            <FormField control={form.control} name="ceo_name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Authorized official name</FormLabel>
                                    <FormControl><Input className="h-14 bg-white rounded-2xl border-slate-200 font-black uppercase text-xs focus:ring-blue-600" {...field} value={field.value || ''}/></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="ceo_role" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Signatory designation</FormLabel>
                                    <FormControl><Input className="h-14 bg-white rounded-2xl border-slate-200 font-black uppercase text-xs" {...field} value={field.value || ''}/></FormControl>
                                </FormItem>
                            )} />
                        </Card>
                        
                        <Card className="rounded-[3rem] border-slate-100 shadow-sm p-12 bg-slate-50/50 flex flex-col justify-center space-y-10">
                            {/* DOCUMENT HEADER WELD */}
                            <FormField control={form.control} name="document_header" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Global Document Header</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Award className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-300 group-hover:text-blue-600 transition-colors" size={24} />
                                            <Input className="h-20 pl-16 bg-white border-blue-100 rounded-3xl font-black uppercase text-xs shadow-2xl shadow-blue-600/5 focus:ring-blue-600" {...field} value={field.value || ''} />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )} />

                            {/* DOCUMENT FOOTER WELD */}
                            <FormField control={form.control} name="receipt_footer" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Global Ledger Footer</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <ReceiptIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-600 transition-colors" size={24} />
                                            <Input className="h-20 pl-16 bg-white border-slate-200 rounded-3xl font-black uppercase text-xs shadow-lg shadow-blue-500/5 focus:ring-slate-900" {...field} value={field.value || ''} />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )} />
                        </Card>
                    </div>

                    <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                        <FormItem className="col-span-full pt-6">
                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3 ml-1">
                                <Landmark size={16} className="text-blue-500"/> Settlement & Payment Protocols
                            </FormLabel>
                            <FormControl><Textarea className="min-h-[160px] rounded-[2rem] border-slate-100 p-8 text-xs font-black uppercase tracking-widest bg-slate-50/30 shadow-inner" {...field} value={field.value || ''} /></FormControl>
                        </FormItem>
                    )} />
                </div>

                {/* SOVEREIGN COMMAND CONSOLE (FIXED BAR) */}
                <div className="fixed bottom-0 left-0 right-0 p-10 bg-white/90 backdrop-blur-3xl border-t border-slate-100 flex items-center justify-between z-[250] shadow-[0_-40px_80px_rgba(0,0,0,0.08)] px-24">
                    <div className="flex items-center gap-6">
                        <div className="h-5 w-5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Node Status: Online</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Jurisdiction Authenticated: {profile?.country}</span>
                        </div>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isPending || !form.formState.isDirty} 
                        className="bg-blue-600 hover:bg-blue-700 h-20 px-24 rounded-[2rem] font-black uppercase tracking-[0.5em] text-sm shadow-2xl shadow-blue-600/40 transition-all active:scale-95 border-none text-white"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="animate-spin mr-5 h-7 w-7"/> 
                                Synchronizing DNA...
                            </>
                        ) : (
                            <>
                                <Send size={28} className="mr-6" /> 
                                Finalize identity protocol
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}