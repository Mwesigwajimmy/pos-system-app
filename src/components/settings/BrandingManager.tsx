'use client';

import React, { useState, useEffect, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Loader2, UploadCloud, Palette, X,
    Building2, FileText, Globe, AlertTriangle, Trash2
} from 'lucide-react';

import { useBranding } from '@/components/core/BrandingProvider';
import { useBusiness } from '@/context/BusinessContext';

const brandingSchema = z.object({
  company_name_display: z.string().min(2, "Enter your business name"),
  primary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Use a colour code like #2563eb"),
  secondary_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Use a colour code like #2563eb").optional().nullable(),
  accent_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Use a colour code like #2563eb").optional().nullable(),
  document_text_color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "Use a colour code like #2563eb").optional().nullable(),
  watermark_opacity: z.coerce.number().min(0.01).max(0.3).default(0.05),

  plot_number: z.string().optional().nullable(),
  po_box: z.string().optional().nullable(),
  official_email: z.string().email("Enter a valid email").or(z.literal('')).optional().nullable(),
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

const SECTIONS = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'social', label: 'Social', icon: Globe },
];

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

function TextField({
    name,
    label,
    placeholder,
    hint,
    mono = false,
    wide = false,
    type = 'text',
    inputMode
}: {
    name: keyof BrandingFormInput;
    label: string;
    placeholder?: string;
    hint?: string;
    mono?: boolean;
    wide?: boolean;
    type?: string;
    inputMode?: any;
}) {
    const { control } = useFormContext<BrandingFormInput>();
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem className={cn("space-y-2", wide && "sm:col-span-2")}>
                <FormLabel className="text-xs font-medium text-slate-500">{label}</FormLabel>
                <FormControl>
                    <Input
                        {...field}
                        type={type}
                        inputMode={inputMode}
                        value={(field.value as string) || ''}
                        placeholder={placeholder}
                        className={cn("h-11 rounded-lg border-slate-200 text-sm", mono && "font-mono")}
                    />
                </FormControl>
                {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
                <FormMessage className="text-xs" />
            </FormItem>
        )} />
    );
}

function ColorField({ name, label }: { name: keyof BrandingFormInput; label: string }) {
    const { control } = useFormContext<BrandingFormInput>();
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500">{label}</FormLabel>
                <div className="flex gap-2">
                    <Input
                        {...field}
                        value={(field.value as string) || ''}
                        placeholder="#000000"
                        className="h-11 flex-1 rounded-lg border-slate-200 font-mono text-sm uppercase"
                    />
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                        <input
                            type="color"
                            value={(field.value as string) || '#000000'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="absolute inset-[-6px] h-[150%] w-[150%] cursor-pointer border-none p-0"
                            aria-label={label}
                        />
                    </div>
                </div>
                <FormMessage className="text-xs" />
            </FormItem>
        )} />
    );
}

const LogoUploader = memo(({
    currentLogoUrl,
    isRemoved,
    onRemoveExisting,
    onRestoreExisting
}: {
    currentLogoUrl?: string | null;
    isRemoved: boolean;
    onRemoveExisting: () => void;
    onRestoreExisting: () => void;
}) => {
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

    const shown = preview || (isRemoved ? null : currentLogoUrl);

    const handleFile = (files: FileList | null, onChange: (v: any) => void) => {
        const file = files?.[0];
        if (!file) return;

        if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
            toast.error("Use a PNG, JPG, SVG or WebP file");
            return;
        }
        if (file.size > MAX_LOGO_BYTES) {
            toast.error("That file is larger than 2MB");
            return;
        }
        onChange(files);
        onRestoreExisting();
    };

    return (
        <FormField control={control} name="logo_file" render={({ field: { onChange } }) => (
            <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500">Logo</FormLabel>
                <div className="relative flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-white transition-colors hover:border-slate-300">
                    <input
                        type="file"
                        accept={ALLOWED_LOGO_TYPES.join(',')}
                        className="absolute inset-0 z-20 cursor-pointer opacity-0"
                        onChange={(e) => handleFile(e.target.files, onChange)}
                    />
                    {shown ? (
                        <img src={shown} alt="Logo" className="h-full w-full object-contain p-6" />
                    ) : (
                        <div className="space-y-2 text-center">
                            <UploadCloud size={20} className="mx-auto text-slate-400" />
                            <p className="text-sm text-slate-600">Upload a logo</p>
                            <p className="text-xs text-slate-400">PNG, JPG, SVG or WebP up to 2MB</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {preview ? (
                        <button
                            type="button"
                            onClick={() => setValue('logo_file', undefined, { shouldDirty: true })}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                            <X size={13} />
                            Cancel this upload
                        </button>
                    ) : currentLogoUrl && !isRemoved ? (
                        <button
                            type="button"
                            onClick={onRemoveExisting}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600"
                        >
                            <Trash2 size={13} />
                            Remove logo
                        </button>
                    ) : isRemoved ? (
                        <button
                            type="button"
                            onClick={onRestoreExisting}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                            Undo remove
                        </button>
                    ) : null}
                </div>
            </FormItem>
        )} />
    );
});

LogoUploader.displayName = 'LogoUploader';

function DocumentPreview({ logoUrl }: { logoUrl?: string | null }) {
    const { watch } = useFormContext<BrandingFormInput>();
    const values = watch();

    const accent = values.accent_color || values.primary_color || '#0f172a';
    const text = values.document_text_color || '#1e293b';

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-medium text-slate-500">Preview</p>
            </div>
            <div className="bg-white p-6" style={{ color: text }}>
                <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: accent }}>
                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold" style={{ color: accent }}>
                            {values.company_name_display || 'Your business name'}
                        </p>
                        <p className="mt-1 truncate text-xs opacity-70">
                            {[values.plot_number, values.po_box].filter(Boolean).join(' · ') || 'Address'}
                        </p>
                        <p className="truncate text-xs opacity-70">
                            {[values.official_phone, values.official_email].filter(Boolean).join(' · ') || 'Phone · Email'}
                        </p>
                    </div>
                    {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-10 w-20 shrink-0 object-contain" />
                    ) : null}
                </div>

                <p className="mt-4 text-sm font-semibold tracking-wide" style={{ color: accent }}>
                    {values.document_header || 'INVOICE'}
                </p>

                <div className="mt-3 space-y-1.5">
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-4/5 rounded bg-slate-100" />
                    <div className="h-2 w-2/3 rounded bg-slate-100" />
                </div>

                <div className="mt-5 border-t border-slate-100 pt-3 text-xs opacity-60">
                    {values.receipt_footer || 'Footer text appears here'}
                </div>
            </div>
        </div>
    );
}

export default function BrandingManager() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { refreshBranding } = useBranding();
    const { profile, isLoading: isIdentityLoading } = useBusiness();

    const [activeSection, setActiveSection] = useState('appearance');
    const [logoRemoved, setLogoRemoved] = useState(false);

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
            form.reset({ ...settings, logo_file: undefined });
            setLogoRemoved(false);
        }
    }, [settings, form]);

    const { mutate: handleSave, isPending } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let finalLogoUrl = logoRemoved ? null : (settings?.logo_url || null);

            if (values.logo_file?.[0] && values.logo_file[0] instanceof File) {
                const file = values.logo_file[0];
                const extension = file.name.split('.').pop();
                const fileName = `logo-${profile?.business_id || 'business'}-${Date.now()}.${extension}`;
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
            setLogoRemoved(false);
            toast.success("Branding saved");
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    if (isLoading || isIdentityLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="mx-auto my-24 w-full max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center">
                <AlertTriangle className="mx-auto mb-4 h-7 w-7 text-amber-500" />
                <h3 className="text-base font-semibold text-slate-900">Branding could not load</h3>
                <p className="mt-2 text-sm text-slate-500">{error?.message}</p>
                <Button onClick={() => refetch()} className="mt-6 h-10 rounded-lg px-6">Try again</Button>
            </div>
        );
    }

    const isDirty = form.formState.isDirty || logoRemoved;
    const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label || '';
    const previewLogo = logoRemoved ? null : settings?.logo_url;
    const watermark = Number(form.watch("watermark_opacity")) || 0;

    return (
        <FormProvider {...form}>
            <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 xl:px-8">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Branding</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {profile?.business_name || 'How your business appears on documents'}
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
                    <nav className="hidden lg:block">
                        <div className="sticky top-6 space-y-0.5">
                            {SECTIONS.map(section => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setActiveSection(section.id)}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                            isActive
                                                ? "bg-slate-100 font-medium text-slate-900"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <Icon size={15} className={isActive ? "text-slate-900" : "text-slate-400"} />
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="lg:hidden">
                        <Label className="text-xs font-medium text-slate-500">Section</Label>
                        <Select value={activeSection} onValueChange={setActiveSection}>
                            <SelectTrigger className="mt-2 h-11 rounded-lg border-slate-200 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                {SECTIONS.map(section => (
                                    <SelectItem key={section.id} value={section.id}>{section.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <form onSubmit={form.handleSubmit((d) => handleSave(d))} className="min-w-0 space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                                <h2 className="text-sm font-semibold text-slate-900">{activeLabel}</h2>
                            </div>

                            <div className="px-5 py-6 sm:px-6">
                                {activeSection === 'appearance' && (
                                    <div className="space-y-6">
                                        <LogoUploader
                                            currentLogoUrl={settings?.logo_url}
                                            isRemoved={logoRemoved}
                                            onRemoveExisting={() => setLogoRemoved(true)}
                                            onRestoreExisting={() => setLogoRemoved(false)}
                                        />

                                        <div className="grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
                                            <ColorField name="primary_color" label="Primary" />
                                            <ColorField name="secondary_color" label="Secondary" />
                                            <ColorField name="accent_color" label="Headings" />
                                            <ColorField name="document_text_color" label="Body text" />
                                        </div>

                                        <div className="space-y-2 border-t border-slate-200 pt-6">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium text-slate-500">Watermark strength</Label>
                                                <span className="text-xs tabular-nums text-slate-500">
                                                    {(watermark * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <Input
                                                type="range"
                                                step="0.01"
                                                min="0.01"
                                                max="0.30"
                                                {...form.register("watermark_opacity")}
                                                className="h-2 cursor-pointer appearance-none rounded-lg border-none bg-slate-100 p-0 accent-slate-900"
                                            />
                                            <p className="text-xs text-slate-400">
                                                How faintly your logo shows behind document text.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'business' && (
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <TextField name="company_name_display" label="Business name" wide />
                                        <TextField name="plot_number" label="Physical address" />
                                        <TextField name="po_box" label="P.O. Box" />
                                        <TextField name="official_email" label="Email" type="email" inputMode="email" />
                                        <TextField name="official_phone" label="Phone" type="tel" inputMode="tel" />
                                        <TextField name="tin_number" label="Tax number (TIN)" mono />
                                    </div>
                                )}

                                {activeSection === 'documents' && (
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <TextField name="ceo_name" label="Signatory name" />
                                        <TextField name="ceo_role" label="Title" />
                                        <TextField
                                            name="document_header"
                                            label="Document heading"
                                            placeholder="INVOICE"
                                            hint="Sits at the top of invoices and quotes."
                                            wide
                                        />
                                        <TextField
                                            name="receipt_footer"
                                            label="Receipt footer"
                                            placeholder="Thank you for your business"
                                            wide
                                        />
                                        <FormField control={form.control} name="payment_instructions" render={({ field }) => (
                                            <FormItem className="space-y-2 sm:col-span-2">
                                                <FormLabel className="text-xs font-medium text-slate-500">Payment instructions</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        value={field.value || ''}
                                                        placeholder="Bank name, account number, mobile money details"
                                                        className="min-h-[120px] rounded-lg border-slate-200 p-4 text-sm leading-relaxed"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                )}

                                {activeSection === 'social' && (
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <TextField name="twitter_handle" label="X" placeholder="@handle" />
                                        <TextField name="instagram_handle" label="Instagram" placeholder="@handle" />
                                        <TextField name="facebook_url" label="Facebook" placeholder="facebook.com/yourpage" />
                                        <TextField name="linkedin_url" label="LinkedIn" placeholder="linkedin.com/company/you" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {(activeSection === 'appearance' || activeSection === 'documents') ? (
                            <DocumentPreview logoUrl={previewLogo} />
                        ) : null}

                        <div className={cn(
                            "sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 transition-colors",
                            isDirty ? "border-slate-300 shadow-lg" : "border-slate-200"
                        )}>
                            <p className="text-sm text-slate-500">
                                {isDirty ? 'You have unsaved changes' : 'All changes saved'}
                            </p>
                            <Button
                                type="submit"
                                disabled={isPending || !isDirty}
                                className="h-10 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </FormProvider>
    );
}