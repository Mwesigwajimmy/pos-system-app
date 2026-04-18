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
import { 
    Loader2, UploadCloud, Palette, ShieldCheck, X, 
    Building2, User, Phone, Mail, MapPin, Hash, 
    Landmark, UserCheck, AlertTriangle 
} from 'lucide-react';

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
                <div className="relative group flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-[2.5rem] border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer overflow-hidden bg-slate-50/50 shadow-inner">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => onChange(e.target.files)} />
                    {preview ? (
                        <div className="relative w-full h-full p-8 z-10">
                            <Image src={preview} alt="Logo Preview" layout="fill" objectFit="contain" className="p-4" />
                            <Button 
                                type="button"
                                size="icon" 
                                variant="destructive" 
                                className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-2xl z-30" 
                                onClick={(e) => { e.preventDefault(); setValue('logo_file', undefined, { shouldDirty: true }); }}
                            >
                                <X size={18}/>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-3 pointer-events-none">
                            <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto text-blue-600">
                                <UploadCloud size={28}/>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900 uppercase">Broadcast Identity Logo</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">SVG, PNG or JPG • Max 2MB</p>
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

    // 2. DATA: ATOMIC SYNCHRONIZATION
    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let finalLogoUrl = settings?.logo_url || null;
            
            // Handle new file upload to Supabase Storage
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
        onSuccess: () => {
            toast.success("Corporate Identity Synchronized Globally");
            queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
        },
        onError: (err: any) => {
            toast.error(`Sync Failure: ${err.message}`);
        }
    });

    if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Waking Identity Engine...</div>;

    if (isError) return (
        <div className="p-20 text-center bg-red-50 rounded-[3rem] border border-red-100">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-xl font-black text-red-900 uppercase">Ledger Handshake Failed</h3>
            <p className="text-red-500 font-bold text-xs mt-2 uppercase tracking-widest">{error?.message}</p>
        </div>
    );

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((d) => handleSave(d))} className="space-y-10 animate-in fade-in duration-1000">
                <Card className="border-none shadow-2xl rounded-[3.5rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-blue-600 rounded-3xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform"><Building2 size={40}/></div>
                                <div>
                                    <CardTitle className="text-4xl font-black uppercase tracking-tighter">Identity Broadcast Hub</CardTitle>
                                    <CardDescription className="text-blue-400 font-black uppercase tracking-[0.4em] text-[10px] mt-2 italic">Official BBU1 Sovereign Configuration</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-6 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ledger Real-Time Sync</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-12 space-y-14">
                        {/* VISUAL IDENTITY SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <LogoUploader />
                            
                            <div className="space-y-8 p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100 shadow-inner">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                                    <Palette size={16} className="text-blue-600"/> 1. Master Visual Standards
                                </h3>
                                <FormField control={form.control} name="company_name_display" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-1">Official Company Display Name</FormLabel>
                                        <FormControl><Input className="h-14 font-black rounded-2xl border-slate-200 text-lg shadow-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="primary_color" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-1">Brand Accent Color</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <Palette className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                                <Input className="h-14 pl-12 font-mono font-black rounded-2xl border-slate-200 text-lg" {...field} />
                                                {field.value && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl border-2 border-white shadow-xl" style={{backgroundColor: field.value}}/>}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* STATIONERY DNA SECTION */}
                        <div className="space-y-8 pt-8 border-t border-slate-100">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                                <MapPin size={16} className="text-blue-600"/> 2. Corporate Stationery DNA (Automated)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <FormField control={form.control} name="plot_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">Plot No / Physical Address</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-12 pl-10 font-bold rounded-xl bg-slate-50 border-slate-200" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="po_box" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">P.O. Box</FormLabel><FormControl><div className="relative"><Landmark className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-12 pl-10 font-bold rounded-xl bg-slate-50 border-slate-200" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="tin_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">Company TIN Identifier</FormLabel><FormControl><div className="relative"><Hash className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-12 pl-10 font-black rounded-xl bg-slate-50 border-slate-200 font-mono" {...field} /></div></FormControl></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="official_email" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">Contact Email Address</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-12 pl-10 font-bold rounded-xl bg-white" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="official_phone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">Support Telephone Contact</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-12 pl-10 font-bold rounded-xl bg-white" {...field} /></div></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        {/* SIGNATORY PROTOCOL SECTION */}
                        <div className="space-y-8 pt-8 border-t border-slate-100">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                                <UserCheck size={16} className="text-blue-600"/> 3. Formal Signatory & Disbursement Protocol
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="ceo_name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">Authorized Representative Name</FormLabel><FormControl><div className="relative"><User className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-12 pl-10 font-black rounded-xl border-slate-200 shadow-sm" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="ceo_role" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase ml-1">Official Document Designation</FormLabel><FormControl><Input className="h-12 font-black rounded-xl border-slate-200" placeholder="e.g. Managing Director" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                                    <FormItem className="col-span-full">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest ml-1">Disbursement Specifications (Bank/Cheque/MoMo)</FormLabel>
                                        <FormControl><Textarea className="min-h-[120px] font-bold rounded-[1.5rem] border-slate-200 p-6 text-xs bg-slate-50 focus:bg-white transition-all shadow-inner" placeholder="All cheques payable to... / Stanbic Bank A/C: 903..." {...field} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-900 p-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-4 text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">
                            <ShieldCheck className="text-emerald-500 animate-pulse" size={24}/> Identity Broadcast Session Secure
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isPending || !form.formState.isDirty} 
                            className="h-16 px-20 font-black bg-blue-600 hover:bg-white hover:text-blue-600 shadow-[0_20px_50px_rgba(59,130,246,0.4)] rounded-2xl transition-all uppercase tracking-[0.2em] text-sm group active:scale-95"
                        >
                            {isPending ? (
                                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                            ) : (
                                <Send className="mr-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                            )}
                            Broadcast Identity Settings
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </FormProvider>
    );
}