'use client';

/**
 * BRANDING & IDENTITY MANAGER
 * A professional, clean interface for managing corporate visual standards.
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
import { Separator } from '@/components/ui/separator';
import { 
    Loader2, UploadCloud, Palette, ShieldCheck, X, 
    Building2, Phone, Mail, MapPin, Landmark, 
    UserCheck, Send, AlertTriangle, Receipt as ReceiptIcon,
    Twitter, Instagram, Facebook, Linkedin, Globe, Award, Type
} from 'lucide-react';

import { useBranding } from '@/components/core/BrandingProvider';
import { useBusiness } from '@/context/BusinessContext';

// --- VALIDATION SCHEMA ---
const brandingSchema = z.object({
  company_name_display: z.string().min(2, "Company name is required"),
  primary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Invalid color code"),
  secondary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Invalid color code").optional().nullable(),
  accent_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Invalid color code").optional().nullable(),
  document_text_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Invalid color code").optional().nullable(),
  watermark_opacity: z.coerce.number().min(0.01).max(0.3).default(0.05),
  
  plot_number: z.string().optional().nullable(),
  po_box: z.string().optional().nullable(),
  official_email: z.string().email("Invalid email address").or(z.literal('')).optional().nullable(),
  official_phone: z.string().optional().nullable(),
  tin_number: z.string().optional().nullable(),
  ceo_name: z.string().optional().nullable(),
  ceo_role: z.string().optional().nullable(),
  payment_instructions: z.string().optional().nullable(),
  document_header: z.string().optional().nullable(),
  receipt_footer: z.string().optional().nullable(),
  
  twitter_handle: z.string().optional().nullable(),
  instagram_handle: z.string().optional().nullable(),
  facebook_url: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  
  logo_file: z.any().optional()
});

type BrandingFormInput = z.infer<typeof brandingSchema>;

// --- Helper: Clean Color Picker Component ---
const ColorPickerField = ({ name, label, icon: Icon }: { name: keyof BrandingFormInput, label: string, icon: any }) => {
    const { control } = useFormContext<BrandingFormInput>();
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-2">
                    <Icon size={14} className="text-slate-400" /> {label}
                </FormLabel>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input 
                            {...field} 
                            value={field.value as string || ''} 
                            className="h-10 pl-3 font-mono text-xs uppercase border-slate-200" 
                            placeholder="#000000"
                        />
                    </div>
                    <div className="relative w-10 h-10 shrink-0 border border-slate-200 rounded-md overflow-hidden shadow-sm">
                        <input 
                            type="color" 
                            value={field.value as string || '#000000'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="absolute inset-[-5px] w-[150%] h-[150%] cursor-pointer border-none p-0"
                        />
                    </div>
                </div>
            </FormItem>
        )} />
    );
};

// --- Sub-Component: Clean Logo Uploader ---
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
                <FormLabel className="text-[11px] font-bold uppercase text-slate-500">Business Logo</FormLabel>
                <div className="relative group flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl border-slate-200 hover:border-blue-400 hover:bg-slate-50/50 transition-all cursor-pointer overflow-hidden bg-white shadow-sm">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => onChange(e.target.files)} />
                    {preview ? (
                        <div className="relative w-full h-full p-6 z-10 flex items-center justify-center">
                            <Image src={preview} alt="Logo Preview" layout="fill" objectFit="contain" className="p-4" />
                            <Button 
                                type="button"
                                size="icon" 
                                variant="destructive" 
                                className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-sm z-30" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    setValue('logo_file', undefined, { shouldDirty: true }); 
                                }}
                            >
                                <X size={16}/>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
                                <UploadCloud size={20}/>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-600">Click to upload logo</p>
                                <p className="text-[10px] text-slate-400">SVG, PNG or JPG (Max 2MB)</p>
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
            document_text_color: '#1e293b',
            watermark_opacity: 0.05,
            company_name_display: '',
            ceo_role: 'Director',
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
                const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
                const { error: upErr } = await supabase.storage.from('branding-assets').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('branding-assets').getPublicUrl(fileName);
                finalLogoUrl = publicUrl;
            }

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
                p_header: values.document_header || '',
                p_footer: values.receipt_footer || '',
                p_twitter: values.twitter_handle || '',
                p_instagram: values.instagram_handle || '',
                p_facebook: values.facebook_url || '',
                p_linkedin: values.linkedin_url || ''
            });
            
            if (error) throw error;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
            refreshBranding();
            toast.success("Settings saved successfully.");
        },
        onError: (err: any) => {
            toast.error(`Error saving settings: ${err.message}`);
        }
    });

    if (isLoading || isIdentityLoading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Loading Settings...</span>
        </div>
    );

    if (isError) return (
        <div className="max-w-md mx-auto my-20 p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <AlertTriangle className="mx-auto text-amber-500 mb-4" size={40} />
            <h3 className="text-lg font-bold text-slate-900">Unable to load settings</h3>
            <p className="text-slate-500 text-sm mt-2">{error?.message}</p>
            <Button variant="outline" className="mt-6" onClick={() => refetch()}>Try Again</Button>
        </div>
    );

    return (
        <FormProvider {...form}>
            <form 
                onSubmit={form.handleSubmit((d) => handleSave(d))} 
                className="max-w-5xl mx-auto py-12 px-6 space-y-10 animate-in fade-in duration-500 pb-32"
            >
                {/* PAGE HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Brand Settings</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage your business identity, colors, and document layout.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <ShieldCheck size={16} className="text-blue-600" />
                        <span className="text-xs font-bold text-blue-700">{profile?.business_name}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: VISUALS */}
                    <div className="lg:col-span-1 space-y-8">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Palette size={16} className="text-blue-500"/> Logo & Theme
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <LogoUploader />
                                <Separator />
                                <div className="grid grid-cols-1 gap-4">
                                    <ColorPickerField name="primary_color" label="Primary Theme Color" icon={Palette} />
                                    <ColorPickerField name="accent_color" label="Heading Accent" icon={Type} />
                                    <ColorPickerField name="document_text_color" label="Main Text Color" icon={Type} />
                                </div>
                                <div className="pt-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <Label className="text-[11px] font-bold uppercase text-slate-500">Logo Watermark Opacity</Label>
                                        <Badge variant="secondary" className="text-[10px]">{(form.watch("watermark_opacity") * 100).toFixed(0)}%</Badge>
                                    </div>
                                    <Input 
                                        type="range" 
                                        step="0.01" min="0.01" max="0.30" 
                                        {...form.register("watermark_opacity")} 
                                        className="h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 border-none" 
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Globe size={16} className="text-blue-500"/> Social Presence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <FormField control={form.control} name="twitter_handle" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><Twitter size={14} /> X (Twitter)</FormLabel>
                                    <FormControl><Input className="h-9 text-xs" placeholder="@handle" {...field} value={field.value || ''} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="instagram_handle" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><Instagram size={14} /> Instagram</FormLabel>
                                    <FormControl><Input className="h-9 text-xs" placeholder="@handle" {...field} value={field.value || ''} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="linkedin_url" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><Linkedin size={14} /> LinkedIn</FormLabel>
                                    <FormControl><Input className="h-9 text-xs" placeholder="Profile URL" {...field} value={field.value || ''} /></FormControl></FormItem>
                                )} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: INFO & DOCUMENTS */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Building2 size={16} className="text-blue-500"/> Business Registration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="company_name_display" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Official Business Name</FormLabel>
                                    <FormControl><Input className="h-10 text-sm font-medium border-slate-200" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="plot_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Physical Address / Plot</FormLabel>
                                    <FormControl><Input className="h-10 text-xs border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="po_box" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">P.O. Box</FormLabel>
                                    <FormControl><Input className="h-10 text-xs border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="official_email" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Official Email</FormLabel>
                                    <FormControl><Input className="h-10 text-xs border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="official_phone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Phone Number</FormLabel>
                                    <FormControl><Input className="h-10 text-xs border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="tin_number" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Tax ID (TIN)</FormLabel>
                                    <FormControl><Input className="h-10 text-xs font-mono tracking-wider border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Award size={16} className="text-blue-500"/> Document Customization
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="ceo_name" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Authorized Official</FormLabel>
                                        <FormControl><Input className="h-10 text-sm border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="ceo_role" render={({ field }) => (
                                        <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Job Title / Designation</FormLabel>
                                        <FormControl><Input className="h-10 text-sm border-slate-200" {...field} value={field.value || ''}/></FormControl></FormItem>
                                    )} />
                                </div>
                                
                                <FormField control={form.control} name="document_header" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Standard Document Header</FormLabel>
                                    <FormControl><Input className="h-12 text-xs border-slate-200 font-medium" placeholder="e.g. OFFICIAL INVOICE" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />

                                <FormField control={form.control} name="receipt_footer" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Default Receipt Footer</FormLabel>
                                    <FormControl><Input className="h-12 text-xs border-slate-200" placeholder="e.g. Thank you for your business" {...field} value={field.value || ''}/></FormControl></FormItem>
                                )} />

                                <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                                    <FormItem><FormLabel className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><Landmark size={14}/> Bank / Payment Instructions</FormLabel>
                                    <FormControl><Textarea className="min-h-[120px] text-xs border-slate-200 p-4 leading-relaxed" placeholder="Enter bank account details or payment terms..." {...field} value={field.value || ''} /></FormControl></FormItem>
                                )} />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-between z-[100] shadow-xl">
                    <div className="hidden md:flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Active Business Profile: {profile?.business_name}</span>
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isPending || !form.formState.isDirty} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-12 rounded-lg transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="animate-spin h-4 w-4"/> 
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <Send size={18} /> 
                                Save Branding Settings
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}