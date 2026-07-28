'use client';

/**
 * --- BBU1 SOVEREIGN STOREFRONT & MULTI-PAGE WEBSITE STUDIO MANAGER ---
 * VERSION: v19.0 OMEGA (MULTI-PRODUCT MEDIA LINKER, CAMERA FIX & REACTIVE TEMPLATES)
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
    Car, Utensils, Tv, KeyRound, Check, Film, Image as ImageIcon, 
    Trash2, Sparkles, HelpCircle, Star, LayoutTemplate, Plus,
    Truck, MapPin, Zap, FileText, Sliders, Moon, Sun, Crown, Building2,
    CheckSquare, Square
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
    websiteTheme: z.enum(["MODERN_MINIMALIST", "DARK_SOVEREIGN", "LUXURY_GOLD", "CORPORATE_ENTERPRISE"]),
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

    // LOGISTICS & SHIPPING
    businessLocation: z.string().optional(),
    standardShippingFee: z.string().optional(),
    vipShippingFee: z.string().optional(),
    supportedDestinations: z.string().optional(),

    // REAL ESTATE
    inspectionFee: z.string().optional(),
    agencyLicenseNo: z.string().optional(),
    inspectionTerms: z.string().optional(),

    // HOTEL
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    advanceDepositPct: z.string().optional(),
    cancellationPolicy: z.string().optional(),

    // SERVICES
    consultationFee: z.string().optional(),
    defaultDuration: z.string().optional(),
    workingHours: z.string().optional(),

    // WEB STUDIO BLOCKS
    heroCtaText: z.string().optional(),
    heroCtaLink: z.string().optional(),
    aboutUsTitle: z.string().optional(),
    aboutUsBody: z.string().optional(),
    testimonialQuote: z.string().optional(),
    testimonialAuthor: z.string().optional(),
});

export function StorefrontSettings({ initialData }: { initialData?: any }) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductMedia, setIsUploadingProductMedia] = useState(false);

  // MULTI-PRODUCT SELECTION STATE (ALLOWS SELECTING MULTIPLE ITEMS AT ONCE)
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  // MULTI-PAGE BUILDER STATE
  const [customPages, setCustomPages] = useState<Array<{ id: string; title: string; slug: string; content: string }>>([
    { id: '1', title: 'About Us & Quality Guarantee', slug: 'about', content: 'Learn more about our business history, quality standards, and customer guarantees.' }
  ]);

  // DYNAMIC FAQ BUILDER STATE
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([
    { id: '1', question: 'How do I place an order or book an inspection?', answer: 'You can add items to your shopping bag for direct Mobile Money checkout or click the WhatsApp button to chat directly with our agent.' },
    { id: '2', question: 'What are your delivery or check-in terms?', answer: 'Orders are processed immediately upon payment confirmation. Delivery occurs within 24 hours.' }
  ]);

  // HOTEL AMENITIES TOGGLES STATE
  const [hotelAmenities, setHotelAmenities] = useState<Record<string, boolean>>({
    wifi: true, ac: true, breakfast: true, parking: true, pool: false, tv: true
  });

  // DATA: Fetch Profile
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

  // DATA: Fetch Saved Storefront Settings from DB
  const { data: savedConfig } = useQuery({
    queryKey: ['saved_storefront_settings_deep', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('business_id', activeBusinessId)
        .maybeSingle();

      if (data?.metadata?.faqs && Array.isArray(data.metadata.faqs)) {
        setFaqs(data.metadata.faqs);
      }
      if (data?.metadata?.custom_pages && Array.isArray(data.metadata.custom_pages)) {
        setCustomPages(data.metadata.custom_pages);
      }
      return data;
    }
  });

  // DATA: Fetch Product Variants for Media Linker
  const { data: productVariants } = useQuery({
    queryKey: ['variants_for_media_attach', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, primary_media_url, video_url, products(name)')
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
      websiteTheme: savedConfig?.metadata?.website_theme || 'MODERN_MINIMALIST',
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

      // LOGISTICS
      businessLocation: savedConfig?.metadata?.business_location || 'Kampala, Uganda',
      standardShippingFee: savedConfig?.metadata?.standard_shipping_fee || '10000',
      vipShippingFee: savedConfig?.metadata?.vip_shipping_fee || '25000',
      supportedDestinations: savedConfig?.metadata?.supported_destinations || 'East Africa, Europe, Asia, Global',

      // REAL ESTATE
      inspectionFee: savedConfig?.metadata?.inspection_fee || '50000',
      agencyLicenseNo: savedConfig?.metadata?.agency_license_no || '',
      inspectionTerms: savedConfig?.metadata?.inspection_terms || 'Inspection fee covers physical viewing guided by site agent.',

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
      aboutUsBody: savedConfig?.metadata?.about_us_body || 'We offer top tier quality products, verified property listings, and professional services.',
      testimonialQuote: savedConfig?.metadata?.testimonial_quote || 'Excellent service and super fast delivery. Highly recommended!',
      testimonialAuthor: savedConfig?.metadata?.testimonial_author || 'Verified Client',
    }
  });

  const activeSlug = form.watch("storeSlug") || defaultSlug;
  const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${activeSlug}` : `https://www.bbu1.com/store/${activeSlug}`;
  const selectedTemplate = form.watch("storefrontTemplate") || 'RETAIL';
  const selectedTheme = form.watch("websiteTheme") || 'MODERN_MINIMALIST';

  const bannerUrl = form.watch("bannerUrl");
  const logoUrl = form.watch("logoUrl");

  // MULTI-PRODUCT SELECTION TOGGLE HANDLER
  const toggleVariantSelection = (id: string) => {
    setSelectedVariantIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVariants = () => {
    if (!productVariants) return;
    if (selectedVariantIds.length === productVariants.length) {
      setSelectedVariantIds([]);
    } else {
      setSelectedVariantIds(productVariants.map((pv: any) => String(pv.id)));
    }
  };

  // FAQ HANDLERS
  const addFaqItem = () => setFaqs(prev => [...prev, { id: String(Date.now()), question: 'New Question?', answer: 'Answer details...' }]);
  const removeFaqItem = (id: string) => setFaqs(prev => prev.filter(f => f.id !== id));
  const handleFaqChange = (id: string, field: 'question' | 'answer', value: string) => setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));

  // MULTI-PAGE HANDLERS
  const addCustomPage = () => setCustomPages(prev => [...prev, { id: String(Date.now()), title: 'New Custom Page', slug: `page-${prev.length + 1}`, content: 'Enter custom page content here...' }]);
  const removeCustomPage = (id: string) => setCustomPages(prev => prev.filter(p => p.id !== id));
  const handleCustomPageChange = (id: string, field: 'title' | 'slug' | 'content', value: string) => setCustomPages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const copyStoreLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicStoreUrl);
      toast.success("Public Storefront Link Copied!");
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

      const { error: uploadErr } = await supabase.storage.from('inventory-assets').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('inventory-assets').getPublicUrl(filePath);

      form.setValue(targetField as any, publicUrl);
      toast.success(`${targetField === 'bannerUrl' ? 'Store Hero Banner' : 'Store Logo'} Uploaded!`);
    } catch (err: any) {
      toast.error(`Upload Failed: ${err.message}`);
    } finally {
      setIsUploadingBanner(false);
      setIsUploadingLogo(false);
    }
  };

  // MULTI-PRODUCT MEDIA ATTACHMENT UPLOADER (PHOTO AND/OR VIDEO WALKTHROUGH)
  const handleProductMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedVariantIds.length === 0) {
      return toast.error("Please select one or more products/properties first.");
    }

    setIsUploadingProductMedia(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeBusinessId}/media_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage.from('inventory-assets').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('inventory-assets').getPublicUrl(filePath);

      const isVideo = isVideoUrl(publicUrl);
      const updatePayload = isVideo 
        ? { video_url: publicUrl, updated_at: new Date().toISOString() }
        : { primary_media_url: publicUrl, updated_at: new Date().toISOString() };

      const { error: dbErr } = await supabase
        .from('product_variants')
        .update(updatePayload)
        .in('id', selectedVariantIds);

      if (dbErr) throw dbErr;

      toast.success(`Media Asset Attached to ${selectedVariantIds.length} Selected Item(s)!`);
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
                      website_theme: data.websiteTheme,
                      business_location: data.businessLocation,
                      standard_shipping_fee: data.standardShippingFee,
                      vip_shipping_fee: data.vipShippingFee,
                      supported_destinations: data.supportedDestinations,

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

                      hero_cta_text: data.heroCtaText,
                      hero_cta_link: data.heroCtaLink,
                      about_us_title: data.aboutUsTitle,
                      about_us_body: data.aboutUsBody,
                      testimonial_quote: data.testimonialQuote,
                      testimonial_author: data.testimonialAuthor,
                      faqs: faqs,
                      custom_pages: customPages
                    },
                    updated_at: new Date().toISOString()
                  })
                  .eq('business_id', activeBusinessId);
            }

            toast.success("Website Settings, Multi-Page Layout & Themes Sealed!");
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

        {/* 🎨 1. NATIVE BBU1 CUSTOM WEBSITE THEME SELECTOR */}
        <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                        <Palette size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Website Custom Design Theme</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Select a native enterprise design theme to transform the visual styling of your store</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* THEME 1: MODERN MINIMALIST */}
                    <button
                        type="button"
                        onClick={() => form.setValue("websiteTheme", "MODERN_MINIMALIST")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTheme === 'MODERN_MINIMALIST' ? "bg-blue-50/80 border-blue-600 shadow-lg scale-105" : "bg-white border-slate-200 hover:border-blue-300"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl"><Sun size={20}/></div>
                            {selectedTheme === 'MODERN_MINIMALIST' && <CheckCircle2 className="text-blue-600" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-sm uppercase">Modern Minimalist</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">Clean snow-white background, electric blue accents & modern cards.</p>
                        </div>
                    </button>

                    {/* THEME 2: DARK SOVEREIGN */}
                    <button
                        type="button"
                        onClick={() => form.setValue("websiteTheme", "DARK_SOVEREIGN")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTheme === 'DARK_SOVEREIGN' ? "bg-slate-900 text-white border-emerald-500 shadow-lg scale-105" : "bg-slate-900 text-white border-slate-800 hover:border-emerald-500/50"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-emerald-600 text-white rounded-2xl"><Moon size={20}/></div>
                            {selectedTheme === 'DARK_SOVEREIGN' && <CheckCircle2 className="text-emerald-400" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-white text-sm uppercase">Dark Sovereign</h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Deep OLED dark mode, emerald glow, and futuristic glass cards.</p>
                        </div>
                    </button>

                    {/* THEME 3: LUXURY GOLD */}
                    <button
                        type="button"
                        onClick={() => form.setValue("websiteTheme", "LUXURY_GOLD")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTheme === 'LUXURY_GOLD' ? "bg-amber-950 text-amber-100 border-amber-500 shadow-lg scale-105" : "bg-amber-950 text-amber-100 border-amber-900 hover:border-amber-600"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl"><Crown size={20}/></div>
                            {selectedTheme === 'LUXURY_GOLD' && <CheckCircle2 className="text-amber-400" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-amber-100 text-sm uppercase">Luxury Gold</h4>
                            <p className="text-[10px] text-amber-300/80 font-medium mt-1">Obsidian black with warm champagne gold accents and gold badges.</p>
                        </div>
                    </button>

                    {/* THEME 4: CORPORATE ENTERPRISE */}
                    <button
                        type="button"
                        onClick={() => form.setValue("websiteTheme", "CORPORATE_ENTERPRISE")}
                        className={cn(
                            "p-6 rounded-3xl border-2 text-left transition-all flex flex-col justify-between h-48 relative overflow-hidden",
                            selectedTheme === 'CORPORATE_ENTERPRISE' ? "bg-slate-100 border-slate-900 shadow-lg scale-105" : "bg-white border-slate-200 hover:border-slate-400"
                        )}
                    >
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-slate-900 text-white rounded-2xl"><Building2 size={20}/></div>
                            {selectedTheme === 'CORPORATE_ENTERPRISE' && <CheckCircle2 className="text-slate-900" size={20}/>}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-sm uppercase">Corporate Enterprise</h4>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">Navy blue & steel gray, crisp executive borders, and formal layout.</p>
                        </div>
                    </button>

                </div>
            </CardContent>
        </Card>

        {/* 📄 2. CUSTOM MULTI-PAGE WEBSITE BUILDER (+ ADD CUSTOM PAGE) */}
        <Card className="border-blue-200 bg-blue-50/10 shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-blue-900 text-white p-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl">
                            <FileText size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Custom Website Multi-Page Manager</CardTitle>
                            <CardDescription className="text-xs font-medium text-blue-200 mt-0.5">Create custom standalone pages for your public website (e.g. About, Shipping, Warranty)</CardDescription>
                        </div>
                    </div>

                    <Button type="button" onClick={addCustomPage} className="h-11 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg">
                        <Plus size={16} className="mr-1.5" /> Add Custom Page
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
                {customPages.map((page, idx) => (
                    <div key={page.id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 relative group">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-blue-100 text-blue-900 font-bold text-[10px] uppercase border-none">
                                Custom Page #{idx + 1}
                            </Badge>

                            {customPages.length > 1 && (
                                <Button type="button" onClick={() => removeCustomPage(page.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600">
                                    <Trash2 size={16} />
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Page Title</Label>
                                <Input 
                                    value={page.title} 
                                    onChange={e => handleCustomPageChange(page.id, 'title', e.target.value)} 
                                    placeholder="e.g. About Our Quality Guarantee" 
                                    className="h-11 rounded-xl font-bold border-slate-200 text-xs" 
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Page URL Slug</Label>
                                <Input 
                                    value={page.slug} 
                                    onChange={e => handleCustomPageChange(page.id, 'slug', e.target.value)} 
                                    placeholder="e.g. quality-guarantee" 
                                    className="h-11 rounded-xl font-mono text-xs border-slate-200" 
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Page Content / Article Body</Label>
                            <Textarea 
                                value={page.content} 
                                onChange={e => handleCustomPageChange(page.id, 'content', e.target.value)} 
                                placeholder="Enter page text, policy details, or company history..." 
                                className="rounded-xl border-slate-200 text-xs min-h-[90px]" 
                            />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>

        {/* 🚚 3. GLOBAL LOGISTICS & CUSTOM SHIPPING COST MANAGER */}
        <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <Truck size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Global Logistics & Delivery Options</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Define business physical location, supported shipping countries, Standard vs VIP Express rates</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Business Physical Address / Location</Label>
                        <Input {...form.register("businessLocation")} placeholder="e.g. Plot 12 Kampala Road, Uganda" className="h-12 rounded-2xl font-bold border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Supported Shipping Regions / Countries</Label>
                        <Input {...form.register("supportedDestinations")} placeholder="e.g. East Africa, Europe, Asia, Global" className="h-12 rounded-2xl font-bold border-slate-200" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                    <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Label className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                            <Truck size={14} className="text-blue-600" /> Standard Delivery Fee ({form.watch("currency")})
                        </Label>
                        <Input {...form.register("standardShippingFee")} placeholder="10000" className="h-12 rounded-xl font-black border-slate-200 bg-white" />
                    </div>

                    <div className="space-y-2 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                        <Label className="text-[10px] font-black uppercase text-purple-900 flex items-center gap-1.5">
                            <Zap size={14} className="text-purple-600" /> VIP Express Same-Day Delivery Fee ({form.watch("currency")})
                        </Label>
                        <Input {...form.register("vipShippingFee")} placeholder="25000" className="h-12 rounded-xl font-black border-purple-200 bg-white text-purple-950" />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 4. MULTI-INDUSTRY STOREFRONT TEMPLATE SELECTOR */}
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

        {/* 5. DYNAMIC FAQ BUILDER (+ PLUS BUTTON TO ADD UNLIMITED Q&A PAIRS) */}
        <Card className="border-amber-200 bg-amber-50/10 shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-amber-900 text-white p-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-600 text-white rounded-2xl">
                            <HelpCircle size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Dynamic FAQ Builder</CardTitle>
                            <CardDescription className="text-xs font-medium text-amber-200 mt-0.5">Add custom questions and answers for your customers</CardDescription>
                        </div>
                    </div>

                    <Button type="button" onClick={addFaqItem} className="h-11 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg">
                        <Plus size={16} className="mr-1.5" /> Add FAQ
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
                {faqs.map((faq, idx) => (
                    <div key={faq.id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 relative group">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-amber-100 text-amber-900 font-bold text-[10px] uppercase border-none">
                                FAQ Item #{idx + 1}
                            </Badge>

                            {faqs.length > 1 && (
                                <Button type="button" onClick={() => removeFaqItem(faq.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600">
                                    <Trash2 size={16} />
                                </Button>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Input 
                                value={faq.question} 
                                onChange={e => handleFaqChange(faq.id, 'question', e.target.value)} 
                                placeholder="e.g. What are your delivery terms?" 
                                className="h-11 rounded-xl font-bold border-slate-200 text-xs" 
                            />
                            <Textarea 
                                value={faq.answer} 
                                onChange={e => handleFaqChange(faq.id, 'answer', e.target.value)} 
                                placeholder="Explain terms..." 
                                className="rounded-xl border-slate-200 text-xs min-h-[70px]" 
                            />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>

        {/* 6. BRANDING & PUBLIC STORE SLUG */}
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
                                    {isVideoUrl(bannerUrl) ? <Film size={12} className="text-purple-400" /> : <ImageIcon size={12} className="text-blue-400" />}
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
                                    <ImageIcon size={12} className="text-emerald-400" /> Live Logo
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

        {/* 7. WHATSAPP & CONTACT DISPATCH NODES */}
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

        {/* 8. MULTI-PRODUCT / PROPERTY SPECIFIC MEDIA ATTACHMENT WITH INSTANT LIVE PREVIEWS */}
        <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 border border-purple-100">
                        <Video size={24} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Multi-Product / Property Media Linker</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">Select one or multiple product/property listings and attach custom photos or video walkthroughs in bulk</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Products / Listings for Media Attachment ({selectedVariantIds.length} Selected)</Label>
                        <Button type="button" onClick={toggleSelectAllVariants} variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-blue-600 uppercase">
                            {productVariants && selectedVariantIds.length === productVariants.length ? 'Deselect All' : 'Select All Items'}
                        </Button>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
                        {productVariants?.map((pv: any) => {
                            const isSelected = selectedVariantIds.includes(String(pv.id));
                            return (
                                <div 
                                    key={pv.id}
                                    onClick={() => toggleVariantSelection(String(pv.id))}
                                    className={cn(
                                        "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs font-bold transition-all",
                                        isSelected ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:border-purple-300"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400" />}
                                        <span>{pv.products?.name} ({pv.name})</span>
                                    </div>
                                    <span className={cn("font-mono text-[10px]", isSelected ? "text-purple-100" : "text-slate-400")}>
                                        SKU: {pv.sku || 'N/A'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <Label className="text-[10px] font-black uppercase text-purple-900 tracking-widest ml-1">Attach Photo or Video Walkthrough Clip</Label>
                    <div className="relative group">
                        <Input 
                            type="file" 
                            accept="image/*,video/*" 
                            onChange={handleProductMediaUpload} 
                            disabled={selectedVariantIds.length === 0 || isUploadingProductMedia}
                            className="hidden" 
                            id="product-video-upload" 
                        />
                        <label 
                            htmlFor="product-video-upload" 
                            className={cn(
                                "flex items-center justify-center gap-3 h-14 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                selectedVariantIds.length === 0 ? "opacity-50 pointer-events-none bg-slate-100 border-slate-200 text-slate-400" : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                            )}
                        >
                            {isUploadingProductMedia ? <Loader2 className="animate-spin h-5 w-5" /> : <Camera size={20} />}
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {isUploadingProductMedia ? "Attaching Media..." : `Attach Photo / Video to ${selectedVariantIds.length} Selected Item(s)`}
                            </span>
                        </label>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* 9. SEO & METADATA CARD */}
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

    </form>
  );
}