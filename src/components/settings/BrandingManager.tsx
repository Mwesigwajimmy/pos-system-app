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
import { Loader2, UploadCloud, Palette, ShieldCheck, X, Building2, User, Phone, Mail, MapPin, Hash, Landmark, Signature } from 'lucide-react';

const brandingSchema = z.object({
  primary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Hex required").or(z.literal('')),
  secondary_color: z.string().optional(),
  company_name_display: z.string().min(2, "Required"),
  plot_number: z.string().optional(),
  po_box: z.string().optional(),
  official_email: z.string().email().or(z.literal('')),
  official_phone: z.string().optional(),
  tin_number: z.string().optional(),
  ceo_name: z.string().optional(),
  ceo_role: z.string().optional(),
  payment_instructions: z.string().optional(),
  logo_file: z.any().optional()
});

type BrandingFormInput = z.infer<typeof brandingSchema>;

const LogoUploader = memo(() => {
    const { control, watch, setValue } = useFormContext<BrandingFormInput>();
    const [preview, setPreview] = useState<string | null>(null);
    const logoFile = watch('logo_file');
    
    useEffect(() => {
        if (!logoFile?.[0]) { setPreview(null); return; }
        const url = URL.createObjectURL(logoFile[0]);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [logoFile]);

    return (
        <FormField control={control} name="logo_file" render={({ field: { onChange } }) => (
            <FormItem className="col-span-full">
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate Master Logo</FormLabel>
                <div className="relative group flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[2rem] border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-all cursor-pointer overflow-hidden">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => onChange(e.target.files)} />
                    {preview ? (
                        <div className="relative w-full h-full p-4">
                            <Image src={preview} alt="Logo" layout="fill" objectFit="contain" />
                            <Button size="icon" variant="destructive" className="absolute top-2 right-2 rounded-full h-8 w-8" onClick={() => setValue('logo_file', undefined)}><X size={14}/></Button>
                        </div>
                    ) : (
                        <div className="text-center"><UploadCloud className="mx-auto text-slate-400 mb-2"/><p className="text-sm font-bold text-slate-600">Click to upload logo</p></div>
                    )}
                </div>
            </FormItem>
        )} />
    );
});

export default function BrandingManager() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['brandingSettings'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_branding_settings').single();
            if (error) throw error;
            return data;
        }
    });

    const form = useForm<BrandingFormInput>({
        resolver: zodResolver(brandingSchema),
        defaultValues: { primary_color: '#1D4ED8', company_name_display: '' }
    });

    useEffect(() => {
        if (settings) form.reset(settings);
    }, [settings, form]);

    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let finalLogoUrl = settings?.logo_url || null;
            if (values.logo_file?.[0]) {
                const fileName = `corp-id-${Date.now()}.${values.logo_file[0].name.split('.').pop()}`;
                const { error: upErr } = await supabase.storage.from('branding-assets').upload(fileName, values.logo_file[0]);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('branding-assets').getPublicUrl(fileName);
                finalLogoUrl = publicUrl;
            }
            const { error } = await supabase.rpc('update_branding_settings', {
                p_logo_url: finalLogoUrl, p_primary_color: values.primary_color,
                p_secondary_color: values.secondary_color || null, p_company_name: values.company_name_display,
                p_plot: values.plot_number, p_pobox: values.po_box, p_email: values.official_email,
                p_phone: values.official_phone, p_tin: values.tin_number, p_ceo: values.ceo_name,
                p_role: values.ceo_role, p_payment: values.payment_instructions
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Corporate branding fully synchronized.");
            queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
        }
    });

    if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">Retrieving Identity Engine...</div>;

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((d) => handleSave(d))} className="space-y-10 animate-in fade-in duration-700">
                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5">
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/20"><Building2 size={36}/></div>
                            <div>
                                <CardTitle className="text-3xl font-black uppercase tracking-tight">Corporate Branding Hub</CardTitle>
                                <CardDescription className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Global Identity Broadcast Protocol</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <LogoUploader />
                            
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex gap-3"><Palette size={14}/> Visual Standards</h3>
                                <FormField control={form.control} name="company_name_display" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black uppercase">Official Display Name</FormLabel><FormControl><Input className="h-12 font-black rounded-xl" {...field} /></FormControl></FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="primary_color" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Primary Accent</FormLabel><FormControl><div className="relative"><Input className="h-12 pl-10 font-mono font-bold" {...field} /><div className="absolute left-3 top-3.5 w-5 h-5 rounded-md border" style={{backgroundColor: field.value}}/></div></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 pt-6 border-t border-slate-50">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex gap-3"><MapPin size={14}/> Stationery Details (Automatic for PDF)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="plot_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">Plot No / Address</FormLabel><FormControl><Input className="h-11 font-bold rounded-xl bg-slate-50" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="po_box" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">P.O. Box</FormLabel><FormControl><Input className="h-11 font-bold rounded-xl bg-slate-50" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="tin_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">TIN Number</FormLabel><FormControl><Input className="h-11 font-bold rounded-xl bg-slate-50 font-mono" {...field} /></FormControl></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="official_email" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">Contact Email</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-11 pl-10 font-bold rounded-xl" {...field} /></div></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="official_phone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">Support Phone</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-300"/><Input className="h-11 pl-10 font-bold rounded-xl" {...field} /></div></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="space-y-8 pt-6 border-t border-slate-50">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex gap-3"><Signature size={14}/> Document Signatory & Payment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="ceo_name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">Authorized Signatory Name</FormLabel><FormControl><Input className="h-11 font-black rounded-xl" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="ceo_role" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[10px] font-black">Official Designation</FormLabel><FormControl><Input className="h-11 font-black rounded-xl" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                                    <FormItem className="col-span-full"><FormLabel className="text-[10px] font-black">Disbursement Protocol (Bank/Momo)</FormLabel><FormControl><Textarea className="min-h-[100px] font-bold rounded-2xl border-slate-200" placeholder="Stanbic Bank A/C... / Airtel Merchant..." {...field} /></FormControl></FormItem>
                                )} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 p-8 border-t flex justify-between items-center">
                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"><ShieldCheck className="text-emerald-500" size={16}/> Identity Synchronized</div>
                        <Button type="submit" disabled={isPending || !form.formState.isDirty} className="h-14 px-14 font-black bg-blue-600 hover:bg-slate-900 shadow-2xl rounded-2xl transition-all uppercase tracking-widest">
                            {isPending ? <Loader2 className="animate-spin h-5 w-5 mr-3"/> : null} Update Global Identity
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </FormProvider>
    );
}