'use client';

/**
 * --- BBU1 SOVEREIGN STOREFRONT & MULTI-INDUSTRY TEMPLATE MANAGER ---
 * VERSION: v12.0 OMEGA (REAL ESTATE, HOTEL, RETAIL & WHATSAPP DISPATCH WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { 
    Loader2, Palette, Globe, Search, ImagePlus, 
    Video, Camera, CheckCircle2, Copy, ExternalLink, 
    MessageSquare, Phone, Mail, Share2, Store, 
    Plus, Check, UploadCloud, ShieldCheck, Sparkles,
    Upload, Link as LinkIcon, Building, Home, Hotel, 
    Briefcase, Layers, ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";

import { updateStoreSettings, StoreSettingsFormValues } from "@/lib/ecommerce/actions/settings";

const supabase = createClient();

// ENRICHED MULTI-INDUSTRY VALIDATION SCHEMA
const formSchema = z.object({
    storeName: z.string().min(3, "Store name required"),
    storeSlug: z.string().min(2, "Store URL slug required"),
    storefrontTemplate: z.enum(["RETAIL", "REAL_ESTATE_RENTALS", "HOTEL_AIRBNB", "SERVICES_BOOKING"]),
    themeColor: z.string().regex(/^#/, "Must be hex"),
    currency: z.string().length(3, "Must be 3 chars"),
    seoTitle: z.string().max(80, "Too long"),
    seoDesc: z.string().max(200, "Too long"),
    whatsappNumber: z.string().optional(),
    supportEmail: z.string().optional(),
    supportPhone: z.string().optional(),
    storeDescription: z.string().optional(),
    bannerUrl: z.string().optional(),
    logoUrl: z.string().optional()
});

interface SettingsProps {
    initialData?: StoreSettingsFormValues;
}

export function StorefrontSettings({ initialData }: SettingsProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // MEDIA UPLOAD STATES
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductMedia, setIsUploadingProductMedia] = useState(false);

  // PRODUCT / PROPERTY MEDIA LINKER STATES
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // 1. DATA: Identity Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_storefront_settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id, active_organization_slug, whatsapp_number').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const activeBusinessId = profile?.business_id;

  // 2. DATA: Pull Product / Property Variants for Dropdown Media Attachment
  const { data: productVariants } = useQuery({
    queryKey: ['variants_for_media_attach', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, primary_media_url, products(name)')
        .order('name');
      if (error) return [];
      return data || [];
    }
  });

  const defaultSlug = profile?.active_organization_slug || profile?.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my-store';

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: initialData?.storeName || profile?.business_name || 'My Web Storefront',
      storeSlug: (initialData as any)?.storeSlug || defaultSlug,
      storefrontTemplate: (initialData as any)?.storefrontTemplate || 'RETAIL',
      themeColor: initialData?.themeColor || '#2563eb',
      currency: initialData?.currency || profile?.currency || 'UGX',
      seoTitle: initialData?.seoTitle || `${profile?.business_name || 'Store'} | Official Digital Storefront`,
      seoDesc: initialData?.seoDesc || 'Browse authentic products & property listings online with direct checkout.',
      whatsappNumber: (initialData as any)?.whatsappNumber || profile?.whatsapp_number || '',
      supportEmail: (initialData as any)?.supportEmail || profile?.email || '',
      supportPhone: (initialData as any)?.supportPhone || profile?.phone_number || '',
      storeDescription: (initialData as any)?.storeDescription || 'Welcome to our official digital storefront.',
      bannerUrl: (initialData as any)?.bannerUrl || '',
      logoUrl: (initialData as any)?.logoUrl || ''
    }
  });

  const activeSlug = form.watch("storeSlug") || defaultSlug;
  const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${activeSlug}` : `https://www.bbu1.com/store/${activeSlug}`;
  const selectedTemplate = form.watch("storefrontTemplate") || 'RETAIL';

  // COPY STORE LINK
  const copyStoreLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicStoreUrl);
      toast.success("Public Storefront Link Copied!", {
        description: "Share this link on WhatsApp, Instagram or TikTok for customers to order or view listings."
      });
    }
  };

  // HANDLER: Store Banner / Logo Upload
  const handleStoreAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'bannerUrl' | 'logoUrl') => {
    const file = e.target.files?.[0];
    if (!file || !activeBusinessId) return;

    if (targetField === 'bannerUrl') setIsUploadingBanner(true);
    if (targetField === 'logoUrl') setIsUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeBusinessId}/storefront_${targetField}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('inventory-assets')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('inventory-assets')
        .getPublicUrl(filePath);

      form.setValue(targetField as any, publicUrl);
      toast.success(`${targetField === 'bannerUrl' ? 'Store Hero Banner' : 'Store Logo'} Uploaded!`);
    } catch (err: any) {
      toast.error(`Upload Failed: ${err.message}`);
    } finally {
      setIsUploadingBanner(false);
      setIsUploadingLogo(false);
    }
  };

  // HANDLER: Product / Property Media Linker
  const handleProductMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVariantId) {
      return toast.error("Please select a product variant or property first.");
    }

    setIsUploadingProductMedia(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeBusinessId}/media_${selectedVariantId}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('inventory-assets')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('inventory-assets')
        .getPublicUrl(filePath);

      const { error: dbErr } = await supabase
        .from('product_variants')
        .update({ primary_media_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', selectedVariantId);

      if (dbErr) throw dbErr;

      toast.success("Media Asset Linked to Selected Product/Property!");
      queryClient.invalidateQueries({ queryKey: ['variants_for_media_attach'] });
    } catch (err: any) {
      toast.error(`Media Attachment Failed: ${err.message}`);
    } finally {
      setIsUploadingProductMedia(false);
    }
  };

  // MAIN COMMIT STOREFRONT SETTINGS MUTATION
  const onSubmit = (data: StoreSettingsFormValues) => {
    startTransition(async () => {
        try {
            // 1. Execute Atomic RPC Database Update
            if (activeBusinessId) {
                await supabase.rpc('fn_save_storefront_template_config', {
                    p_business_id: activeBusinessId,
                    p_store_name: data.storeName,
                    p_store_slug: data.storeSlug,
                    p_template_type: (data as any).storefrontTemplate || 'RETAIL',
                    p_theme_color: data.themeColor,
                    p_currency: data.currency,
                    p_whatsapp_number: (data as any).whatsappNumber,
                    p_store_description: (data as any).storeDescription,
                    p_banner_url: (data as any).bannerUrl,
                    p_logo_url: (data as any).logoUrl,
                    p_seo_title: data.seoTitle,
                    p_seo_description: data.seoDesc
                });
            }

            // 2. Call Server Action
            await updateStoreSettings(data);

            toast.success("Storefront Template & URL Sealed!");
            queryClient.invalidateQueries({ queryKey: ['active_profile_storefront_settings'] });
        } catch (err: any) {
            toast.error(`Settings Save Error: ${err.message}`);
        }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500 pb-16">
        
        {/* PUBLIC STOREFRONT LINK HEADER CARD */}
        <Card className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl border-none relative overflow-hidden">
            <Store className="absolute -right-4 -bottom-4 w-40 h-40 text-blue-500/10 rotate-12" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-[10px] uppercase tracking-widest">
                        <Globe size={14} /> Public Shareable Storefront Link
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">{form.watch("storeName") || 'My E-Commerce Store'}</h3>
                    <p className="text-xs font-mono text-slate-400">{publicStoreUrl}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={copyStoreLink} variant="outline" className="h-12 px-6 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-bold text-xs rounded-2xl">
                        <Copy size={16} className="mr-2 text-blue-400" /> Copy Public Link
                    </Button>
                    <Button type="button" onClick={() => window.open(publicStoreUrl, '_blank')} className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xl shadow-blue-900/30">
                        <ExternalLink size={16} className="mr-2" /> Live Store Preview
                    </Button>
                </div>
            </div>
        </Card>

        {/* 1. MULTI-INDUSTRY STOREFRONT TEMPLATE SELECTOR */}
        <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
                        <Layers size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Select Industry Storefront Template</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Transform your public site from a retail shop into a real estate directory or booking site</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* TEMPLATE 1: RETAIL */}
                    <button
                        type="button"
                        onClick={() => form.setValue("storefrontTemplate", "RETAIL")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTemplate === 'RETAIL' ? "bg-blue-50/60 border-blue-600 shadow-lg scale-105" : "bg-white border-slate-200 hover:border-blue-300"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl"><ShoppingBag size={20}/></div>
                            {selectedTemplate === 'RETAIL' && <CheckCircle2 className="text-blue-600" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-sm uppercase">Standard Retail Store</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">E-commerce cart checkout, POS stock sync & instant receipts.</p>
                        </div>
                    </button>

                    {/* TEMPLATE 2: REAL ESTATE & RENTALS */}
                    <button
                        type="button"
                        onClick={() => form.setValue("storefrontTemplate", "REAL_ESTATE_RENTALS")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTemplate === 'REAL_ESTATE_RENTALS' ? "bg-emerald-50/60 border-emerald-600 shadow-lg scale-105" : "bg-white border-slate-200 hover:border-emerald-300"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-emerald-600 text-white rounded-2xl"><Home size={20}/></div>
                            {selectedTemplate === 'REAL_ESTATE_RENTALS' && <CheckCircle2 className="text-emerald-600" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-sm uppercase">Real Estate & Rentals</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">House/Apartment listings, inspection fee MoMo booking, WhatsApp chat.</p>
                        </div>
                    </button>

                    {/* TEMPLATE 3: HOTEL & AIRBNB */}
                    <button
                        type="button"
                        onClick={() => form.setValue("storefrontTemplate", "HOTEL_AIRBNB")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTemplate === 'HOTEL_AIRBNB' ? "bg-purple-50/60 border-purple-600 shadow-lg scale-105" : "bg-white border-slate-200 hover:border-purple-300"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-purple-600 text-white rounded-2xl"><Hotel size={20}/></div>
                            {selectedTemplate === 'HOTEL_AIRBNB' && <CheckCircle2 className="text-purple-600" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-sm uppercase">Hotel & Guest House</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">Nightly room rates, date reservations, amenities & MoMo deposits.</p>
                        </div>
                    </button>

                    {/* TEMPLATE 4: PROFESSIONAL SERVICES */}
                    <button
                        type="button"
                        onClick={() => form.setValue("storefrontTemplate", "SERVICES_BOOKING")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTemplate === 'SERVICES_BOOKING' ? "bg-amber-50/60 border-amber-600 shadow-lg scale-105" : "bg-white border-slate-200 hover:border-amber-300"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-amber-600 text-white rounded-2xl"><Briefcase size={20}/></div>
                            {selectedTemplate === 'SERVICES_BOOKING' && <CheckCircle2 className="text-amber-600" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-sm uppercase">Services & Appointments</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">Consultation fees, service packages, and appointment scheduling.</p>
                        </div>
                    </button>

                </div>
            </CardContent>
        </Card>

        <div className="grid gap-8">
            
            {/* 2. BRANDING & PUBLIC STORE SLUG */}
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
                            <Palette size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Branding & Storefront URL</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Customize your public URL slug, brand theme, banner, and store identity</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-8">
                    
                    {/* STORE NAME & PUBLIC SLUG */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="storeName" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Store / Business Title *</Label>
                            <Input id="storeName" {...form.register("storeName")} className="h-12 rounded-2xl font-bold border-slate-200" />
                            {form.formState.errors.storeName && (
                                <p className="text-xs text-rose-600 font-bold ml-1">{form.formState.errors.storeName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="storeSlug" className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Public Storefront URL Slug *</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 font-bold">bbu1.com/store/</span>
                                <Input id="storeSlug" {...form.register("storeSlug")} className="h-12 pl-36 rounded-2xl font-mono font-bold border-blue-200 bg-blue-50/20 text-blue-900" />
                            </div>
                        </div>
                    </div>

                    {/* CURRENCY & BRAND COLOR */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="currency" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Store Currency Code (ISO)</Label>
                            <Input id="currency" {...form.register("currency")} className="h-12 rounded-2xl font-black uppercase border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="themeColor" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Brand Accent Color</Label>
                            <div className="flex gap-3 items-center">
                                <div className="relative h-12 w-20 overflow-hidden rounded-2xl border shadow-sm shrink-0">
                                    <input
                                        type="color"
                                        id="themeColor"
                                        className="absolute -top-2 -left-2 h-16 w-24 cursor-pointer p-0 border-0"
                                        {...form.register("themeColor")}
                                    />
                                </div>
                                <Input 
                                    {...form.register("themeColor")} 
                                    className="h-12 font-mono uppercase font-bold rounded-2xl border-slate-200 flex-1" 
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* STOREFRONT BANNER & LOGO UPLOAD */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Store Hero Banner Image</Label>
                            <div className="relative group">
                                <Input type="file" accept="image/*" onChange={e => handleStoreAssetUpload(e, 'bannerUrl')} className="hidden" id="store-banner-upload" />
                                <label htmlFor="store-banner-upload" className="flex items-center justify-center gap-3 h-14 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl cursor-pointer bg-slate-50 transition-all">
                                    {isUploadingBanner ? <Loader2 className="animate-spin h-5 w-5 text-blue-600" /> : <Upload className="h-5 w-5 text-slate-400" />}
                                    <span className="text-xs font-bold uppercase text-slate-600">
                                        {form.watch("bannerUrl") ? "Banner Uploaded (Change)" : "Upload Store Hero Banner"}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Store Brand Logo</Label>
                            <div className="relative group">
                                <Input type="file" accept="image/*" onChange={e => handleStoreAssetUpload(e, 'logoUrl')} className="hidden" id="store-logo-upload" />
                                <label htmlFor="store-logo-upload" className="flex items-center justify-center gap-3 h-14 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl cursor-pointer bg-slate-50 transition-all">
                                    {isUploadingLogo ? <Loader2 className="animate-spin h-5 w-5 text-blue-600" /> : <ImagePlus className="h-5 w-5 text-slate-400" />}
                                    <span className="text-xs font-bold uppercase text-slate-600">
                                        {form.watch("logoUrl") ? "Logo Uploaded (Change)" : "Upload Brand Logo"}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* STORE DESCRIPTION */}
                    <div className="space-y-2">
                        <Label htmlFor="storeDescription" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Public Store Description & Brand Story</Label>
                        <Textarea 
                            id="storeDescription" 
                            {...form.register("storeDescription")} 
                            placeholder="Tell online customers about your business, quality guarantees, or rental booking policies..."
                            className="rounded-2xl border-slate-200 font-medium min-h-[100px]"
                        />
                    </div>

                </CardContent>
            </Card>

            {/* 3. WHATSAPP & CONTACT DISPATCH NODES */}
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">WhatsApp Order Dispatch & Communication</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Receive instant WhatsApp alerts whenever an online customer orders or requests a property inspection</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="space-y-2">
                            <Label htmlFor="whatsappNumber" className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1">WhatsApp Order Phone Number *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                <Input 
                                    id="whatsappNumber" 
                                    {...form.register("whatsappNumber")} 
                                    placeholder="e.g. +256700000000" 
                                    className="pl-10 h-12 rounded-2xl font-bold border-emerald-200 bg-emerald-50/10 text-emerald-900" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="supportEmail" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Customer Support Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input id="supportEmail" {...form.register("supportEmail")} placeholder="orders@mybusiness.com" className="pl-10 h-12 rounded-2xl font-medium border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="supportPhone" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Support Phone Helpline</Label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input id="supportPhone" {...form.register("supportPhone")} placeholder="+256..." className="pl-10 h-12 rounded-2xl font-bold border-slate-200" />
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* 4. PRODUCT / PROPERTY SPECIFIC MEDIA ATTACHMENT */}
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 border border-purple-100">
                            <Video size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Product / Property Media Linker</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Select any product or property listing and attach a custom photo or short video walkthrough</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        
                        {/* SELECT PRODUCT DROPDOWN */}
                        <div className="md:col-span-7 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Item / Property Listing *</Label>
                            <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                                <SelectTrigger className="h-12 rounded-2xl font-bold border-slate-200">
                                    <SelectValue placeholder="Select Product Variant or Property..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-64 rounded-xl">
                                    {productVariants?.map((pv: any) => (
                                        <SelectItem key={pv.id} value={String(pv.id)} className="font-bold py-2.5">
                                            {pv.products?.name} ({pv.name}) • SKU: {pv.sku || 'N/A'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* FILE UPLOAD BUTTON */}
                        <div className="md:col-span-5 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Attach Photo / Short Video Walkthrough</Label>
                            <div className="relative group">
                                <Input 
                                    type="file" 
                                    accept="image/*,video/*" 
                                    onChange={handleProductMediaUpload} 
                                    disabled={!selectedVariantId || isUploadingProductMedia}
                                    className="hidden" 
                                    id="product-video-upload" 
                                />
                                <label 
                                    htmlFor="product-video-upload" 
                                    className={cn(
                                        "flex items-center justify-center gap-3 h-12 px-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                        !selectedVariantId ? "opacity-50 pointer-events-none bg-slate-100 border-slate-200 text-slate-400" : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                    )}
                                >
                                    {isUploadingProductMedia ? <Loader2 className="animate-spin h-5 w-5" /> : <Camera size={18} />}
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {isUploadingProductMedia ? "Uploading..." : "Upload Photo / Video Clip"}
                                    </span>
                                </label>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* 5. SEO & METADATA CARD */}
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                 <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100">
                            <Search size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">SEO & Search Engine Metadata</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Optimize your web store for Google search indexing and social previews</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="seoTitle" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Meta Title</Label>
                        <Input id="seoTitle" {...form.register("seoTitle")} className="h-12 rounded-2xl font-bold border-slate-200" />
                        <p className="text-[10px] font-bold text-slate-400 text-right">
                            {form.watch("seoTitle")?.length || 0} / 80 characters
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="seoDesc" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Meta Description</Label>
                        <Textarea 
                            id="seoDesc" 
                            {...form.register("seoDesc")} 
                            className="resize-none min-h-[100px] rounded-2xl border-slate-200 font-medium"
                        />
                         <p className="text-[10px] font-bold text-slate-400 text-right">
                            {form.watch("seoDesc")?.length || 0} / 200 characters
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="bg-slate-50 p-8 border-t flex justify-end">
                    <Button type="submit" disabled={isPending} className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all">
                        {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                        {isPending ? "Sealing Settings..." : "Save Storefront Settings"}
                    </Button>
                </CardFooter>
            </Card>

        </div>
    </form>
  );
}