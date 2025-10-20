// src/components/settings/BrandingManager.tsx
'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, UploadCloud, Palette, AlertTriangle, X } from 'lucide-react';

// --- 1. Schema, Types, and the Logic Hook ---

// Type definition for the data as it exists in your database.
interface BrandingSettings {
  logo_url: string | null;
  primary_color: string | null;
}

// Zod schema for powerful, declarative form validation.
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

const brandingSchema = z.object({
  // Ensures the color is a valid hex code, providing a clear error message if not.
  primary_color: z.string()
    .regex(/^#([0-9a-f]{3}){1,2}$/i, "Must be a valid hex color code (e.g., #RRGGBB)")
    .or(z.literal('')), // Allows the field to be empty.
  
  // Validates the logo file for size and type before any upload attempt.
  logo_file: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 2MB.`)
    .refine((files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type), ".jpg, .jpeg, .png, .svg, and .webp files are accepted.")
});

type BrandingFormInput = z.infer<typeof brandingSchema>;

/**
 * Custom Hook: useBrandingManager
 * This encapsulates ALL logic related to branding settings.
 */
const useBrandingManager = () => {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // 1. DATA FETCHING: Get the current branding settings.
    const { data: currentSettings, isLoading, isError, error } = useQuery<BrandingSettings>({
        queryKey: ['brandingSettings'],
        queryFn: async (): Promise<BrandingSettings> => {
            const { data, error } = await supabase
                .rpc('get_branding_settings', {})
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return (data as BrandingSettings) || { logo_url: null, primary_color: null };
        }
    });

    // 2. FORM INITIALIZATION
    const form = useForm<BrandingFormInput>({
        resolver: zodResolver(brandingSchema),
        defaultValues: { primary_color: '', logo_file: undefined },
    });

    useEffect(() => {
        if (currentSettings) {
            form.reset({
                primary_color: currentSettings.primary_color || '',
                logo_file: undefined,
            });
        }
    }, [currentSettings, form]);

    // 3. DATA MUTATION
    const { mutate: updateBranding, isPending: isUpdating } = useMutation({
        mutationFn: async (values: BrandingFormInput) => {
            let newLogoUrl = currentSettings?.logo_url || null;
            const newLogoFile = values.logo_file?.[0];

            if (newLogoFile) {
                const fileExt = newLogoFile.name.split('.').pop();
                const filePath = `public/logo-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('branding-assets').upload(filePath, newLogoFile);
                if (uploadError) throw new Error(`Logo Upload Failed: ${uploadError.message}`);

                const { data: { publicUrl } } = supabase.storage.from('branding-assets').getPublicUrl(filePath);
                newLogoUrl = publicUrl;

                if (currentSettings?.logo_url) {
                    const oldLogoPath = currentSettings.logo_url.split('/branding-assets/')[1];
                    await supabase.storage.from('branding-assets').remove([oldLogoPath]);
                }
            }
            
            const { error: rpcError } = await supabase.rpc('update_branding_settings', {
                p_logo_url: newLogoUrl,
                p_primary_color: values.primary_color || null,
            });
            if (rpcError) throw rpcError;
        },
        onSuccess: () => {
            toast.success("Branding updated successfully!");
            queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
        },
        onError: (err) => {
            toast.error(`Update failed: ${err.message}`);
        }
    });
    
    // 4. RETURN VALUES
    return {
        form,
        onSubmit: form.handleSubmit((formData) => updateBranding(formData)),
        currentSettings,
        isLoading,
        isUpdating,
        isError,
        error
    };
};

// --- 2. UI Sub-components ---

const BrandingFormSkeleton = memo(() => (
    <Card>
        <CardHeader><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3 mt-2" /></CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-32 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
        </CardContent>
        <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
    </Card>
));
BrandingFormSkeleton.displayName = 'BrandingFormSkeleton';

const LogoUploader = memo(() => {
    const { control, watch } = useForm<BrandingFormInput>();
    const [preview, setPreview] = useState<string | null>(null);
    const selectedFile = watch('logo_file')?.[0];
    
    useEffect(() => {
        if (!selectedFile) {
            setPreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    return (
        <FormField
            control={control}
            name="logo_file"
            render={({ field: { onChange }, fieldState }) => (
                <FormItem>
                    <FormLabel>Company Logo</FormLabel>
                    <FormControl>
                        <label className={cn( "relative flex flex-col items-center justify-center w-full h-32 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent", fieldState.error && "border-destructive" )}>
                            <input type="file" className="hidden" accept={ACCEPTED_IMAGE_TYPES.join(",")} onChange={(e) => onChange(e.target.files)} />
                            {preview ? (
                                <>
                                    <Image src={preview} alt="Logo preview" layout="fill" objectFit="contain" className="p-2" />
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10" onClick={() => onChange(null)}><X className="h-4 w-4" /></Button>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground"><UploadCloud className="w-8 h-8 mx-auto mb-2" /><p>Click or drag & drop</p><p className="text-xs">SVG, PNG, JPG (max. 2MB)</p></div>
                            )}
                        </label>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
});
LogoUploader.displayName = 'LogoUploader';

const ColorInput = memo(() => (
    <FormField
        control={useForm<BrandingFormInput>().control}
        name="primary_color"
        render={({ field }) => (
            <FormItem>
                <FormLabel>Primary Color</FormLabel>
                <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                        <Input placeholder="#1D4ED8" className="pl-9 font-mono" {...field} />
                    </FormControl>
                    {field.value && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md border" style={{ backgroundColor: field.value }} />}
                </div>
                <FormMessage />
            </FormItem>
        )}
    />
));
ColorInput.displayName = 'ColorInput';

// --- 3. The Main Component ---

export default function BrandingManager() {
    const { form, onSubmit, isLoading, isUpdating, isError, error } = useBrandingManager();

    if (isLoading) return <BrandingFormSkeleton />;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <h3 className="text-xl font-semibold">Failed to Load Settings</h3>
                {/* <-- FINAL FIX APPLIED HERE */}
                <p>{error?.message}</p>
            </div>
        );
    }
    
    return (
        <FormProvider {...form}>
            <form onSubmit={onSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance Settings</CardTitle>
                        <CardDescription>Changes will be reflected across the app for all users.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <LogoUploader />
                        <ColorInput />
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isUpdating || !form.formState.isDirty}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </FormProvider>
    );
}