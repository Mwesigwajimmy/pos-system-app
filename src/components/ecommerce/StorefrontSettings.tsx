'use client';

/**
 * --- BBU1 SOVEREIGN STOREFRONT & MULTI-INDUSTRY TEMPLATE MANAGER ---
 * VERSION: v15.0 OMEGA (WEB STUDIO BLOCK BUILDER, LIVE MEDIA PREVIEWS & METADATA WELD)
 * JURISDICTION: Standard Retail, Real Estate, Hotel/Airbnb & Professional Services
 */

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

import { 
    Loader2, Palette, Globe, Search, ImagePlus, 
    Video, Camera, CheckCircle2, Copy, ExternalLink, 
    MessageSquare, Phone, Mail, Store, 
    ShieldCheck, Upload, Home, Hotel, 
    Briefcase, Layers, ShoppingBag, Wifi,
    Car, Utensils, Tv, KeyRound, Check, Film, Image, 
    Trash2, Sparkles, HelpCircle, Star, LayoutTemplate, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

import { updateStoreSettings, StoreSettingsFormValues } from "@/lib/ecommerce/actions/settings";

const supabase = createClient();

// HELPER: DETECT IF URL IS A VIDEO FILE
const isVideoUrl = (url?: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

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
    logoUrl: z.string().optional(),

    // REAL ESTATE FIELDS
    inspectionFee: z.string().optional(),
    agencyLicenseNo: z.string().optional(),
    inspectionTerms: z.string().optional(),

    // HOTEL / AIRBNB FIELDS
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    advanceDepositPct: z.string().optional(),
    cancellationPolicy: z.string().optional(),

    // SERVICES FIELDS
    consultationFee: z.string().optional(),
    defaultDuration: z.string().optional(),
    workingHours: z.string().optional(),

    // WEB STUDIO BLOCKS
    heroCtaText: z.string().optional(),
    heroCtaLink: z.string().optional(),
    aboutUsTitle: z.string().optional(),
    aboutUsBody: z.string().optional(),
    faqQuestion1: z.string().optional(),
    faqAnswer1: z.string().optional(),
    faqQuestion2: z.string().optional(),
    faqAnswer2: z.string().optional(),
    testimonialQuote: z.string().optional(),
    testimonialAuthor: z.string().optional(),
});

export function StorefrontSettings({ initialData }: { initialData?: any }) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductMedia, setIsUploadingProductMedia] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  // HOTEL AMENITIES TOGGLES STATE
  const [hotelAmenities, setHotelAmenities] = useState<Record<string, boolean>>({
    wifi: true,
    ac: true,
    breakfast: true,
    parking: true,
    pool: false,
    tv: true
  });

  // 1. DATA: Fetch Profile
  const { data: profile } = useQuery({
    queryKey: ['active_profile_storefront_settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('profiles')
        .select('*, business_name, currency, business_id, active_organization_slug, whatsapp_number')
        .eq('id', user?.id)
        .limit(1)
        .single();
      return data;
    }
  });

  const activeBusinessId = profile?.business_id;

  // 2. DATA: Fetch Saved Storefront Settings from DB
  const { data: savedConfig } = useQuery({
    queryKey: ['saved_storefront_settings_deep', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('business_id', activeBusinessId)
        .maybeSingle();
      return data;
    }
  });

  // 3. DATA: Fetch Variants for media linker
  const { data: productVariants } = useQuery({
    queryKey: ['variants_for_media_attach', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, primary_media_url, products(name)')
        .eq('business_id', activeBusinessId)
        .order('name');
      if (error) return [];
      return data || [];
    }
  });

  const defaultSlug = savedConfig?.store_slug || profile?.active_organization_slug || profile?.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my-store';

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    values: {
      storeName: savedConfig?.store_name || profile?.business_name || 'My Web Storefront',
      storeSlug: savedConfig?.store_slug || defaultSlug,
      storefrontTemplate: savedConfig?.storefront_template || savedConfig?.template_type || 'RETAIL',
      themeColor: savedConfig?.theme_color || '#2563eb',
      currency: savedConfig?.currency_code || profile?.currency || 'UGX',
      seoTitle: savedConfig?.seo_title || `${profile?.business_name || 'Store'} | Official Digital Storefront`,
      seoDesc: savedConfig?.seo_description || 'Browse authentic listings & catalog items online with direct checkout.',
      whatsappNumber: savedConfig?.whatsapp_number || profile?.whatsapp_number || '',
      supportEmail: savedConfig?.support_email || profile?.email || '',
      supportPhone: savedConfig?.support_phone || profile?.phone_number || '',
      storeDescription: savedConfig?.store_description || 'Welcome to our official digital storefront.',
      bannerUrl: savedConfig?.banner_url || '',
      logoUrl: savedConfig?.logo_url || '',

      // REAL ESTATE
      inspectionFee: savedConfig?.metadata?.inspection_fee || '50000',
      agencyLicenseNo: savedConfig?.metadata?.agency_license_no || '',
      inspectionTerms: savedConfig?.metadata?.inspection_terms || 'Inspection fee covers physical viewing guided by authorized site agent.',

      // HOTEL
      checkInTime: savedConfig?.metadata?.check_in_time || '14:00',
      checkOutTime: savedConfig?.metadata?.check_out_time || '10:00',
      advanceDepositPct: savedConfig?.metadata?.advance_deposit_pct || '50',
      cancellationPolicy: savedConfig?.metadata?.cancellation_policy || 'Full refund if cancelled 48 hours prior to check-in.',

      // SERVICES
      consultationFee: savedConfig?.metadata?.consultation_fee || '100000',
      defaultDuration: savedConfig?.metadata?.default_duration || '60 Mins',
      workingHours: savedConfig?.metadata?.working_hours || 'Mon - Sat: 8:00 AM - 6:00 PM',

      // WEB STUDIO
      heroCtaText: savedConfig?.metadata?.hero_cta_text || 'Explore Catalog',
      heroCtaLink: savedConfig?.metadata?.hero_cta_link || '#catalog',
      aboutUsTitle: savedConfig?.metadata?.about_us_title || 'About Our Business',
      aboutUsBody: savedConfig?.metadata?.about_us_body || 'We are dedicated to offering top tier quality products, verified property listings, and professional services to our valued clients.',
      faqQuestion1: savedConfig?.metadata?.faq_question_1 || 'How do I place an order or book an inspection?',
      faqAnswer1: savedConfig?.metadata?.faq_answer_1 || 'You can add items to your shopping bag for direct Mobile Money checkout or click the WhatsApp button to chat directly with our agent.',
      faqQuestion2: savedConfig?.metadata?.faq_question_2 || 'What are your delivery or check-in terms?',
      faqAnswer2: savedConfig?.metadata?.faq_answer_2 || 'Orders are processed immediately upon payment confirmation. Delivery occurs within 24 hours.',
      testimonialQuote: savedConfig?.metadata?.testimonial_quote || 'Excellent service and super fast delivery. Highly recommended!',
      testimonialAuthor: savedConfig?.metadata?.testimonial_author || 'Verified Client',
    }
  });

  const activeSlug = form.watch("storeSlug") || defaultSlug;
  const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${activeSlug}` : `https://www.bbu1.com/store/${activeSlug}`;
  const selectedTemplate = form.watch("storefrontTemplate") || 'RETAIL';

  const bannerUrl = form.watch("bannerUrl");
  const logoUrl = form.watch("logoUrl");

  const selectedVariant = productVariants?.find((pv: any) => String(pv.id) === String(selectedVariantId));

  const copyStoreLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicStoreUrl);
      toast.success("Public Storefront Link Copied!", {
        description: "Share this link on WhatsApp, Instagram or TikTok for customers to order or view listings."
      });
    }
  };

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

  const onSubmit = (data: any) => {
    startTransition(async () => {
        try {
            if (activeBusinessId) {
                await supabase.rpc('fn_save_storefront_template_config', {
                    p_business_id: activeBusinessId,
                    p_store_name: data.storeName,
                    p_store_slug: data.storeSlug,
                    p_template_type: data.storefrontTemplate || 'RETAIL',
                    p_theme_color: data.themeColor,
                    p_currency: data.currency,
                    p_whatsapp_number: data.whatsappNumber,
                    p_store_description: data.storeDescription,
                    p_banner_url: data.bannerUrl,
                    p_logo_url: data.logoUrl,
                    p_seo_title: data.seoTitle,
                    p_seo_description: data.seoDesc
                });

                await supabase
                  .from('storefront_settings')
                  .update({
                    metadata: {
                      inspection_fee: data.inspectionFee,
                      agency_license_no: data.agencyLicenseNo,
                      inspection_terms: data.inspectionTerms,
                      check_in_time: data.checkInTime,
                      check_out_time: data.checkOutTime,
                      advance_deposit_pct: data.advanceDepositPct,
                      cancellation_policy: data.cancellationPolicy,
                      consultation_fee: data.consultationFee,
                      default_duration: data.defaultDuration,
                      working_hours: data.workingHours,
                      hotel_amenities: hotelAmenities,

                      // WEB STUDIO BLOCKS
                      hero_cta_text: data.heroCtaText,
                      hero_cta_link: data.heroCtaLink,
                      about_us_title: data.aboutUsTitle,
                      about_us_body: data.aboutUsBody,
                      faq_question_1: data.faqQuestion1,
                      faq_answer_1: data.faqAnswer1,
                      faq_question_2: data.faqQuestion2,
                      faq_answer_2: data.faqAnswer2,
                      testimonial_quote: data.testimonialQuote,
                      testimonial_author: data.testimonialAuthor,
                    },
                    updated_at: new Date().toISOString()
                  })
                  .eq('business_id', activeBusinessId);
            }

            toast.success("Storefront Template, Web Studio Blocks & Custom Settings Sealed!");
            queryClient.invalidateQueries({ queryKey: ['saved_storefront_settings_deep'] });
            queryClient.invalidateQueries({ queryKey: ['public_store_config'] });
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

        {/* DYNAMIC INDUSTRY-SPECIFIC CUSTOM CONFIGURATION PANEL */}
        {selectedTemplate === 'REAL_ESTATE_RENTALS' && (
            <Card className="border-emerald-200 bg-emerald-50/20 shadow-xl rounded-[2.5rem] overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="bg-emerald-100/50 border-b border-emerald-200 p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                            <Home size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-emerald-950 uppercase tracking-tight">Real Estate & Rental Directory Config</CardTitle>
                            <CardDescription className="text-xs font-medium text-emerald-800 mt-0.5">Customize inspection fees, agency licensing, and property booking disclaimers</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-emerald-900 tracking-widest ml-1">Property Inspection Booking Fee ({form.watch("currency")})</Label>
                            <Input {...form.register("inspectionFee")} placeholder="50000" className="h-12 rounded-2xl font-black border-emerald-200 bg-white text-emerald-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-emerald-900 tracking-widest ml-1">Agency / Broker License No.</Label>
                            <Input {...form.register("agencyLicenseNo")} placeholder="e.g. RE-UG-2026-99" className="h-12 rounded-2xl font-bold border-emerald-200 bg-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-emerald-900 tracking-widest ml-1">Inspection Terms & Site Visit Disclaimer</Label>
                        <Textarea {...form.register("inspectionTerms")} placeholder="Explain property visit terms..." className="rounded-2xl border-emerald-200 font-medium bg-white min-h-[90px]" />
                    </div>
                </CardContent>
            </Card>
        )}

        {selectedTemplate === 'HOTEL_AIRBNB' && (
            <Card className="border-purple-200 bg-purple-50/20 shadow-xl rounded-[2.5rem] overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="bg-purple-100/50 border-b border-purple-200 p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 text-white rounded-2xl">
                            <Hotel size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-purple-950 uppercase tracking-tight">Hotel & Guest House Reservation Config</CardTitle>
                            <CardDescription className="text-xs font-medium text-purple-800 mt-0.5">Configure check-in times, deposit rules, and room amenity highlights</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Standard Check-In Time</Label>
                            <Input {...form.register("checkInTime")} placeholder="14:00" className="h-12 rounded-2xl font-bold border-purple-200 bg-white text-purple-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Standard Check-Out Time</Label>
                            <Input {...form.register("checkOutTime")} placeholder="10:00" className="h-12 rounded-2xl font-bold border-purple-200 bg-white text-purple-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Advance MoMo Deposit (%)</Label>
                            <Input {...form.register("advanceDepositPct")} placeholder="50" className="h-12 rounded-2xl font-black border-purple-200 bg-white text-purple-950" />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Featured Amenities (Shown on Room Listings)</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {[
                              { id: 'wifi', label: 'Free WiFi', icon: Wifi },
                              { id: 'ac', label: 'Air Con', icon: Utensils },
                              { id: 'breakfast', label: 'Breakfast', icon: Utensils },
                              { id: 'parking', label: 'Parking', icon: Car },
                              { id: 'tv', label: 'Smart TV', icon: Tv },
                              { id: 'pool', label: 'Swimming Pool', icon: KeyRound },
                            ].map(amenity => (
                              <button
                                key={amenity.id}
                                type="button"
                                onClick={() => setHotelAmenities(prev => ({ ...prev, [amenity.id]: !prev[amenity.id] }))}
                                className={cn(
                                  "p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all",
                                  hotelAmenities[amenity.id] ? "bg-purple-600 text-white border-purple-600 shadow-md" : "bg-white text-slate-600 border-purple-200 hover:border-purple-400"
                                )}
                              >
                                <span>{amenity.label}</span>
                                {hotelAmenities[amenity.id] && <Check size={14} />}
                              </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Reservation & Cancellation Policy</Label>
                        <Textarea {...form.register("cancellationPolicy")} placeholder="Explain cancellation terms..." className="rounded-2xl border-purple-200 font-medium bg-white min-h-[80px]" />
                    </div>
                </CardContent>
            </Card>
        )}

        {selectedTemplate === 'SERVICES_BOOKING' && (
            <Card className="border-amber-200 bg-amber-50/20 shadow-xl rounded-[2.5rem] overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="bg-amber-100/50 border-b border-amber-200 p-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-600 text-white rounded-2xl">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-amber-950 uppercase tracking-tight">Services & Appointments Config</CardTitle>
                            <CardDescription className="text-xs font-medium text-amber-800 mt-0.5">Configure consultation fees, default duration, and operating hours</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-amber-900 tracking-widest ml-1">Consultation Base Fee ({form.watch("currency")})</Label>
                            <Input {...form.register("consultationFee")} placeholder="100000" className="h-12 rounded-2xl font-black border-amber-200 bg-white text-amber-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-amber-900 tracking-widest ml-1">Default Service Duration</Label>
                            <Input {...form.register("defaultDuration")} placeholder="e.g. 60 Mins" className="h-12 rounded-2xl font-bold border-amber-200 bg-white text-amber-950" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-amber-900 tracking-widest ml-1">Operating Hours & Service Availability</Label>
                        <Input {...form.register("workingHours")} placeholder="Mon - Sat: 8:00 AM - 6:00 PM" className="h-12 rounded-2xl font-medium border-amber-200 bg-white text-amber-950" />
                    </div>
                </CardContent>
            </Card>
        )}

        {/* 🎨 SOVEREIGN WEB STUDIO BUILDER (DYNAMIC CONTENT BLOCKS) */}
        <Card className="border-blue-200 bg-blue-50/10 shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-blue-900 text-white p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white">
                        <LayoutTemplate size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Sovereign Web Studio Block Builder</CardTitle>
                        <CardDescription className="text-xs font-medium text-blue-200 mt-0.5">Customize your public website sections, Call-to-Actions, About Us story, FAQs & Testimonials</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
                {/* 1. HERO CTA BUTTON BUILDER */}
                <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Sparkles size={14} className="text-blue-600" /> Hero Section Call-To-Action (CTA)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">CTA Button Text</Label>
                            <Input {...form.register("heroCtaText")} placeholder="Explore Catalog" className="h-12 rounded-2xl font-bold border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">CTA Target Link</Label>
                            <Input {...form.register("heroCtaLink")} placeholder="#catalog or https://..." className="h-12 rounded-2xl font-bold border-slate-200 font-mono" />
                        </div>
                    </div>
                </div>

                {/* 2. ABOUT US & BRAND STORY BLOCK */}
                <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Globe size={14} className="text-blue-600" /> Brand Story & About Us Section
                    </h4>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Section Title</Label>
                            <Input {...form.register("aboutUsTitle")} placeholder="About Our Business" className="h-12 rounded-2xl font-bold border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Section Content Body</Label>
                            <Textarea {...form.register("aboutUsBody")} placeholder="Describe your business background and mission..." className="rounded-2xl border-slate-200 font-medium min-h-[90px]" />
                        </div>
                    </div>
                </div>

                {/* 3. CUSTOM FAQ ACCORDION BUILDER */}
                <div className="space-y-4 border-b border-slate-100 pb-6">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <HelpCircle size={14} className="text-blue-600" /> Frequently Asked Questions (FAQ)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <Label className="text-[10px] font-black uppercase text-blue-600">FAQ Item #1</Label>
                            <Input {...form.register("faqQuestion1")} placeholder="Question 1..." className="h-10 rounded-xl font-bold bg-white" />
                            <Textarea {...form.register("faqAnswer1")} placeholder="Answer 1..." className="rounded-xl bg-white font-medium text-xs min-h-[70px]" />
                        </div>
                        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <Label className="text-[10px] font-black uppercase text-blue-600">FAQ Item #2</Label>
                            <Input {...form.register("faqQuestion2")} placeholder="Question 2..." className="h-10 rounded-xl font-bold bg-white" />
                            <Textarea {...form.register("faqAnswer2")} placeholder="Answer 2..." className="rounded-xl bg-white font-medium text-xs min-h-[70px]" />
                        </div>
                    </div>
                </div>

                {/* 4. CLIENT TESTIMONIALS BLOCK */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Star size={14} className="text-amber-500 fill-amber-500" /> Client Testimonial Highlight
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Client Quote</Label>
                            <Input {...form.register("testimonialQuote")} placeholder="Excellent quality and fast service!" className="h-12 rounded-2xl font-bold border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Client Name / Designation</Label>
                            <Input {...form.register("testimonialAuthor")} placeholder="Verified Customer" className="h-12 rounded-2xl font-bold border-slate-200" />
                        </div>
                    </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Store Hero Banner (Image or Short Video)</Label>
                            
                            {bannerUrl && (
                                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 h-36 flex items-center justify-center group">
                                    {isVideoUrl(bannerUrl) ? (
                                        <video 
                                            src={bannerUrl} 
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <img 
                                            src={bannerUrl} 
                                            className="w-full h-full object-cover" 
                                            alt="Hero Banner Preview" 
                                        />
                                    )}
                                    <Badge className="absolute top-3 left-3 bg-slate-900/80 text-white font-bold text-[9px] uppercase backdrop-blur-md border-none flex items-center gap-1">
                                        {isVideoUrl(bannerUrl) ? <Film size={12} className="text-purple-400" /> : <Image size={12} className="text-blue-400" />}
                                        Live {isVideoUrl(bannerUrl) ? 'Video' : 'Image'} Preview
                                    </Badge>

                                    <Button 
                                        type="button" 
                                        onClick={() => form.setValue("bannerUrl", "")} 
                                        variant="destructive" 
                                        size="icon" 
                                        className="absolute top-3 right-3 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            )}

                            <div className="relative group">
                                <Input type="file" accept="image/*,video/*" onChange={e => handleStoreAssetUpload(e, 'bannerUrl')} className="hidden" id="store-banner-upload" />
                                <label htmlFor="store-banner-upload" className="flex items-center justify-center gap-3 h-14 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl cursor-pointer bg-slate-50 transition-all">
                                    {isUploadingBanner ? <Loader2 className="animate-spin h-5 w-5 text-blue-600" /> : <Upload className="h-5 w-5 text-slate-400" />}
                                    <span className="text-xs font-bold uppercase text-slate-600">
                                        {bannerUrl ? "Replace Hero Banner (Photo / Video)" : "Upload Hero Banner (Photo / Short Video)"}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Store Brand Logo</Label>
                            
                            {logoUrl && (
                                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 p-2 h-36 flex items-center justify-center group">
                                    <img src={logoUrl} className="max-h-full max-w-full object-contain rounded-xl" alt="Brand Logo Preview" />
                                    <Badge className="absolute top-3 left-3 bg-slate-900/80 text-white font-bold text-[9px] uppercase backdrop-blur-md border-none flex items-center gap-1">
                                        <Image size={12} className="text-emerald-400" /> Live Logo
                                    </Badge>
                                    <Button 
                                        type="button" 
                                        onClick={() => form.setValue("logoUrl", "")} 
                                        variant="destructive" 
                                        size="icon" 
                                        className="absolute top-3 right-3 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            )}

                            <div className="relative group">
                                <Input type="file" accept="image/*" onChange={e => handleStoreAssetUpload(e, 'logoUrl')} className="hidden" id="store-logo-upload" />
                                <label htmlFor="store-logo-upload" className="flex items-center justify-center gap-3 h-14 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl cursor-pointer bg-slate-50 transition-all">
                                    {isUploadingLogo ? <Loader2 className="animate-spin h-5 w-5 text-blue-600" /> : <ImagePlus className="h-5 w-5 text-slate-400" />}
                                    <span className="text-xs font-bold uppercase text-slate-600">
                                        {logoUrl ? "Replace Brand Logo" : "Upload Brand Logo"}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

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

            {/* 4. PRODUCT / PROPERTY SPECIFIC MEDIA ATTACHMENT WITH INSTANT LIVE PREVIEWS */}
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
                    {selectedVariant?.primary_media_url && (
                        <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-center gap-4 animate-in fade-in duration-300">
                            <div className="h-20 w-20 rounded-xl overflow-hidden border border-purple-200 shrink-0 bg-slate-900 flex items-center justify-center relative">
                                {isVideoUrl(selectedVariant.primary_media_url) ? (
                                    <video 
                                        src={selectedVariant.primary_media_url} 
                                        autoPlay 
                                        loop 
                                        muted 
                                        playsInline 
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <img 
                                        src={selectedVariant.primary_media_url} 
                                        className="w-full h-full object-cover" 
                                        alt="Attached Item Media" 
                                    />
                                )}
                            </div>
                            <div>
                                <Badge className="bg-purple-600 text-white font-bold text-[9px] uppercase px-2 py-0.5 border-none mb-1">
                                    {isVideoUrl(selectedVariant.primary_media_url) ? 'Video Clip Attached' : 'Photo Attached'}
                                </Badge>
                                <p className="text-xs font-black text-slate-900">{selectedVariant.products?.name} ({selectedVariant.name})</p>
                                <p className="text-[10px] font-mono text-slate-400">SKU: {selectedVariant.sku || 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
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