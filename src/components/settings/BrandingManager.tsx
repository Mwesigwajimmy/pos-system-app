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
import { Label } from '@/components/ui/label'; // Fix: Added missing import
import { 
    Loader2, UploadCloud, Palette, ShieldCheck, X, 
    Building2, User, Phone, Mail, MapPin, Hash, 
    Landmark, UserCheck, Send, AlertTriangle, Activity, Clock, CheckCircle2
} from 'lucide-react';

// Identity Broadcast Handshake
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
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company Logo</FormLabel>
                <div className="relative group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer overflow-hidden bg-slate-50/50 shadow-sm">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => onChange(e.target.files)} />
                    {preview ? (
                        <div className="relative w-full h-full p-6 z-10">
                            <Image src={preview} alt="Logo Preview" layout="fill" objectFit="contain" className="p-2" />
                            <Button 
                                type="button"
                                size="icon" 
                                variant="destructive" 
                                className="absolute top-4 right-4 rounded-full h-8 w-8 shadow-md z-30" 
                                onClick={(e) => { e.preventDefault(); setValue('logo_file', undefined, { shouldDirty: true }); }}
                            >
                                <X size={14}/>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-3 pointer-events-none">
                            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto text-blue-600 border border-slate-100">
                                <UploadCloud size={24}/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Upload Corporate Logo</p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">PNG, SVG or JPG (Max 2MB)</p>
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
    const { refreshBranding } = useBranding();

    // 1. DATA FETCHING (Logic Intact)
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

    // 2. DATA MUTATION (Logic Intact)
    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let finalLogoUrl = settings?.logo_url || null;
            
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
            await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
            await queryClient.invalidateQueries({ queryKey: ['bbu1_corporate_identity'] });
            refreshBranding();
            toast.success("Branding settings updated successfully");
        },
        onError: (err: any) => {
            toast.error(`Update Failure: ${err.message}`);
        }
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                Loading business profile...
            </p>
        </div>
    );

    if (isError) return (
        <div className="max-w-xl mx-auto my-20 p-8 text-center bg-red-50 rounded-xl border border-red-100 shadow-sm">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-red-900">Failed to load branding</h3>
            <p className="text-red-600 text-sm mt-2 font-medium">
                {error?.message || "Internal database connection error."}
            </p>
        </div>
    );

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((d) => handleSave(d))} className="max-w-6xl mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-500 pb-20">
                <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-white border-b border-slate-100 p-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
                                    <Palette size={28} />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Branding & Identity</CardTitle>
                                    <CardDescription className="text-sm text-slate-500 mt-1">
                                        Configure your company visual standards and official documentation details.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Sync Active</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 space-y-12">
                        {/* VISUAL STANDARDS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <LogoUploader />
                            
                            <div className="space-y-8 p-8 bg-slate-50/50 rounded-xl border border-slate-100 shadow-inner">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Palette size={16} className="text-blue-500"/> 1. Visual Standards
                                </h3>
                                <div className="space-y-6">
                                    <FormField control={form.control} name="company_name_display" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-600">Official Display Name</FormLabel>
                                            <FormControl>
                                                <Input className="h-11 rounded-lg border-slate-200 text-sm font-medium focus:border-blue-500 transition-all bg-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="primary_color" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-slate-600">Brand Primary Hex Code</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <Input className="h-11 pl-10 font-mono font-bold rounded-lg border-slate-200 text-sm bg-white" {...field} />
                                                    {field.value && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded border border-slate-200" style={{backgroundColor: field.value}}/>
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
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <MapPin size={16} className="text-blue-500"/> 2. Office & Registration Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="plot_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">Physical Address</FormLabel><FormControl><Input className="h-11 rounded-lg bg-white border-slate-200 text-sm" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="po_box" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">P.O. Box</FormLabel><FormControl><Input className="h-11 rounded-lg bg-white border-slate-200 text-sm" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="tin_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">Tax ID (TIN)</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200 font-mono text-sm" {...field} /></FormControl></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="official_email" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">Corporate Email</FormLabel><FormControl><Input className="h-11 rounded-lg bg-white border-slate-200 text-sm" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="official_phone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">Contact Phone</FormLabel><FormControl><Input className="h-11 rounded-lg bg-white border-slate-200 text-sm" {...field} /></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        {/* SIGNATORY & PAYMENT SECTION */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <UserCheck size={16} className="text-blue-500"/> 3. Authorization & Settlement
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="ceo_name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">Authorized Official Name</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200 text-sm font-medium" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="ceo_role" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-slate-600">Official Designation</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200 text-sm bg-slate-50/30" placeholder="e.g. Managing Director" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                                    <FormItem className="col-span-full">
                                        <FormLabel className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                            <Landmark size={14} className="text-blue-500"/> 4. Payment Instructions (Appears on Invoices)
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea className="min-h-[140px] rounded-lg border-slate-200 p-4 text-sm bg-slate-50/30 focus:bg-white transition-all leading-relaxed" placeholder="Specify Bank, Account Number, Branch details..." {...field} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* FOOTER PROTOCOL */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 ml-1">Default Document Footer</Label>
                            <div className="relative">
                                <ReceiptIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300"/>
                                <Input name="receipt_footer" value={form.watch('receipt_footer') || ''} onChange={e => form.setValue('receipt_footer', e.target.value)} className="h-14 pl-12 rounded-xl border-blue-100 bg-blue-50/10 text-sm font-medium text-slate-600" placeholder="e.g. Thank you for your business." />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                            <ShieldCheck size={18} className="text-slate-300" />
                            Data Synced Securely
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isPending || !form.formState.isDirty} 
                            className="bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold px-10 h-11 rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                            {isPending ? (
                                <><Loader2 className="animate-spin h-4 w-4"/> Updating...</>
                            ) : (
                                <><Send size={16} /> Save Branding Settings</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {/* COMPLIANCE FOOTER */}
                <div className="flex justify-center items-center gap-4 py-8 opacity-30">
                    <div className="h-[1px] w-20 bg-slate-300" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        System Identity Manager • Version 5.2
                    </p>
                    <div className="h-[1px] w-20 bg-slate-300" />
                </div>
            </form>
        </FormProvider>
    );
}