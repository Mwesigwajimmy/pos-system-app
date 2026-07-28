'use client';

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Loader2, Palette, Globe, Search, ImagePlus,
  Video, Camera, CheckCircle2, Copy, ExternalLink,
  MessageSquare, Phone, Mail, Store,
  ShieldCheck, Upload, Home, Hotel,
  Briefcase, Layers, ShoppingBag,
  Film, HelpCircle, Plus,
  Truck, Zap, FileText, Moon, Sun, Crown, Building2,
  CheckSquare, Square, Image as ImageIcon, Trash2,
  Clock, Percent, Key, ClipboardList, MapPin,
  CalendarClock, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { updateStoreSettings, StoreSettingsFormValues } from "@/lib/ecommerce/actions/settings";

const supabase = createClient();

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return ['.mp4', '.webm', '.mov', '.ogg'].some(ext => clean.endsWith(ext));
};

const formSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters"),
  storeSlug: z.string().min(2, "URL slug must be at least 2 characters"),
  storefrontTemplate: z.enum(["RETAIL", "REAL_ESTATE_RENTALS", "HOTEL_AIRBNB", "SERVICES_BOOKING"]),
  websiteTheme: z.enum(["MODERN_MINIMALIST", "DARK_SOVEREIGN", "LUXURY_GOLD", "CORPORATE_ENTERPRISE"]),
  themeColor: z.string().regex(/^#/, "Must be a valid hex color"),
  currency: z.string().length(3, "Must be a 3-letter ISO currency code"),
  seoTitle: z.string().max(80, "Maximum 80 characters"),
  seoDesc: z.string().max(200, "Maximum 200 characters"),
  whatsappNumber: z.string().optional(),
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
  storeDescription: z.string().optional(),
  bannerUrl: z.string().optional(),
  logoUrl: z.string().optional(),

  // Logistics
  businessLocation: z.string().optional(),
  standardShippingFee: z.string().optional(),
  vipShippingFee: z.string().optional(),
  supportedDestinations: z.string().optional(),

  // Real estate
  inspectionFee: z.string().optional(),
  agencyLicenseNo: z.string().optional(),
  inspectionTerms: z.string().optional(),

  // Hotel
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  advanceDepositPct: z.string().optional(),
  cancellationPolicy: z.string().optional(),

  // Services
  consultationFee: z.string().optional(),
  defaultDuration: z.string().optional(),
  workingHours: z.string().optional(),

  // Web studio
  heroCtaText: z.string().optional(),
  heroCtaLink: z.string().optional(),
  aboutUsTitle: z.string().optional(),
  aboutUsBody: z.string().optional(),
  testimonialQuote: z.string().optional(),
  testimonialAuthor: z.string().optional(),
});

// ── Shared section header component ──────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  iconClass,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <CardHeader className="border-b bg-white px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn("p-2.5 rounded-xl border", iconClass)}>
            <Icon size={20} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 tracking-normal">
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5 font-normal">
              {description}
            </CardDescription>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </CardHeader>
  );
}

// ── Shared field label ────────────────────────────────────────────────────────
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-600 mb-1 block">
      {children}
    </Label>
  );
}

// ── Template option card ──────────────────────────────────────────────────────
function TemplateCard({
  selected,
  onClick,
  icon: Icon,
  iconBg,
  checkColor,
  cardClass,
  title,
  description,
  titleClass,
  descClass,
  borderActive,
  borderIdle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  iconBg: string;
  checkColor: string;
  cardClass: string;
  title: string;
  description: string;
  titleClass?: string;
  descClass?: string;
  borderActive: string;
  borderIdle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between h-44 relative overflow-hidden",
        selected ? `${cardClass} ${borderActive} shadow-md` : `bg-white ${borderIdle} hover:${borderActive}`
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn("p-2.5 rounded-xl text-white", iconBg)}>
          <Icon size={18} />
        </div>
        {selected && <CheckCircle2 className={checkColor} size={18} />}
      </div>
      <div className="space-y-1">
        <h4 className={cn("font-semibold text-sm", titleClass || "text-slate-900")}>{title}</h4>
        <p className={cn("text-[11px] leading-relaxed", descClass || "text-slate-500")}>{description}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function StorefrontSettings({ initialData }: { initialData?: any }) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingProductMedia, setIsUploadingProductMedia] = useState(false);

  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const [customPages, setCustomPages] = useState<Array<{ id: string; title: string; slug: string; content: string }>>([
    { id: '1', title: 'About Us & Quality Guarantee', slug: 'about', content: 'Learn more about our business history, quality standards, and customer guarantees.' },
  ]);

  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([
    { id: '1', question: 'How do I place an order or book an inspection?', answer: 'You can add items to your shopping bag for direct Mobile Money checkout, or click the WhatsApp button to chat with our agent.' },
    { id: '2', question: 'What are your delivery or check-in terms?', answer: 'Orders are processed immediately upon payment confirmation. Delivery occurs within 24 hours.' },
  ]);

  const [hotelAmenities, setHotelAmenities] = useState<Record<string, boolean>>({
    wifi: true, ac: true, breakfast: true, parking: true, pool: false, tv: true,
  });

  // ── Data fetching ───────────────────────────────────────────────────────────
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
    },
  });

  const activeBusinessId = profile?.business_id;

  const { data: savedConfig } = useQuery({
    queryKey: ['saved_storefront_settings_deep', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('business_id', activeBusinessId)
        .maybeSingle();

      if (data?.metadata?.faqs && Array.isArray(data.metadata.faqs)) setFaqs(data.metadata.faqs);
      if (data?.metadata?.custom_pages && Array.isArray(data.metadata.custom_pages)) setCustomPages(data.metadata.custom_pages);
      return data;
    },
  });

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
    },
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
      seoDesc: savedConfig?.seo_description || 'Browse authentic listings and catalog items online with direct checkout.',
      whatsappNumber: savedConfig?.whatsapp_number || profile?.whatsapp_number || '',
      supportEmail: savedConfig?.support_email || profile?.email || '',
      supportPhone: savedConfig?.support_phone || profile?.phone_number || '',
      storeDescription: savedConfig?.store_description || 'Welcome to our official digital storefront.',
      bannerUrl: savedConfig?.banner_url || '',
      logoUrl: savedConfig?.logo_url || '',

      businessLocation: savedConfig?.metadata?.business_location || 'Kampala, Uganda',
      standardShippingFee: savedConfig?.metadata?.standard_shipping_fee || '10000',
      vipShippingFee: savedConfig?.metadata?.vip_shipping_fee || '25000',
      supportedDestinations: savedConfig?.metadata?.supported_destinations || 'East Africa, Europe, Asia, Global',

      inspectionFee: savedConfig?.metadata?.inspection_fee || '50000',
      agencyLicenseNo: savedConfig?.metadata?.agency_license_no || '',
      inspectionTerms: savedConfig?.metadata?.inspection_terms || 'Inspection fee covers physical viewing guided by a site agent.',

      checkInTime: savedConfig?.metadata?.check_in_time || '14:00',
      checkOutTime: savedConfig?.metadata?.check_out_time || '10:00',
      advanceDepositPct: savedConfig?.metadata?.advance_deposit_pct || '50',
      cancellationPolicy: savedConfig?.metadata?.cancellation_policy || 'Full refund if cancelled 48 hours prior to check-in.',

      consultationFee: savedConfig?.metadata?.consultation_fee || '100000',
      defaultDuration: savedConfig?.metadata?.default_duration || '60 minutes',
      workingHours: savedConfig?.metadata?.working_hours || 'Mon – Sat: 8:00 AM – 6:00 PM',

      heroCtaText: savedConfig?.metadata?.hero_cta_text || 'Explore Catalog',
      heroCtaLink: savedConfig?.metadata?.hero_cta_link || '#catalog',
      aboutUsTitle: savedConfig?.metadata?.about_us_title || 'About Our Business',
      aboutUsBody: savedConfig?.metadata?.about_us_body || 'We offer top-tier quality products, verified property listings, and professional services.',
      testimonialQuote: savedConfig?.metadata?.testimonial_quote || 'Excellent service and super fast delivery. Highly recommended!',
      testimonialAuthor: savedConfig?.metadata?.testimonial_author || 'Verified Client',
    },
  });

  const activeSlug = form.watch("storeSlug") || defaultSlug;
  const publicStoreUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/store/${activeSlug}`
    : `https://www.bbu1.com/store/${activeSlug}`;

  const selectedTemplate = form.watch("storefrontTemplate") || 'RETAIL';
  const selectedTheme = form.watch("websiteTheme") || 'MODERN_MINIMALIST';
  const bannerUrl = form.watch("bannerUrl");
  const logoUrl = form.watch("logoUrl");

  // ── Handlers ────────────────────────────────────────────────────────────────
  const toggleVariantSelection = (id: string) =>
    setSelectedVariantIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAllVariants = () => {
    if (!productVariants) return;
    setSelectedVariantIds(
      selectedVariantIds.length === productVariants.length ? [] : productVariants.map((pv: any) => String(pv.id))
    );
  };

  const addFaqItem = () =>
    setFaqs(prev => [...prev, { id: String(Date.now()), question: 'New question?', answer: 'Answer details here.' }]);
  const removeFaqItem = (id: string) =>
    setFaqs(prev => prev.filter(f => f.id !== id));
  const handleFaqChange = (id: string, field: 'question' | 'answer', value: string) =>
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));

  const addCustomPage = () =>
    setCustomPages(prev => [...prev, { id: String(Date.now()), title: 'New Page', slug: `page-${prev.length + 1}`, content: 'Enter page content here.' }]);
  const removeCustomPage = (id: string) =>
    setCustomPages(prev => prev.filter(p => p.id !== id));
  const handleCustomPageChange = (id: string, field: 'title' | 'slug' | 'content', value: string) =>
    setCustomPages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const copyStoreLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicStoreUrl);
      toast.success("Storefront link copied to clipboard.");
    }
  };

  const handleStoreAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'bannerUrl' | 'logoUrl') => {
    const file = e.target.files?.[0];
    if (!file || !activeBusinessId) return;

    if (targetField === 'bannerUrl') setIsUploadingBanner(true);
    else setIsUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeBusinessId}/storefront_${targetField}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('inventory-assets').upload(filePath, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('inventory-assets').getPublicUrl(filePath);
      form.setValue(targetField as any, publicUrl);
      toast.success(`${targetField === 'bannerUrl' ? 'Hero banner' : 'Logo'} uploaded successfully.`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingBanner(false);
      setIsUploadingLogo(false);
    }
  };

  const handleProductMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedVariantIds.length === 0) {
      return toast.error("Select one or more products before attaching media.");
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
      toast.success(`Media attached to ${selectedVariantIds.length} item(s).`);
      queryClient.invalidateQueries({ queryKey: ['variants_for_media_attach'] });
    } catch (err: any) {
      toast.error(`Media attachment failed: ${err.message}`);
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
            p_seo_description: data.seoDesc,
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
                custom_pages: customPages,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('business_id', activeBusinessId);
        }

        toast.success("Storefront settings saved successfully.");
        queryClient.invalidateQueries({ queryKey: ['saved_storefront_settings_deep'] });
        queryClient.invalidateQueries({ queryKey: ['public_store_config'] });
      } catch (err: any) {
        toast.error(`Could not save settings: ${err.message}`);
      }
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-28 animate-in fade-in duration-300">

      {/* ── Live storefront link banner ────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden shadow-xl">
        <Store className="absolute -right-6 -bottom-6 w-36 h-36 text-white/5 rotate-12 pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <p className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
            <Globe size={13} /> Public storefront link
          </p>
          <h3 className="text-xl font-bold text-white">{form.watch("storeName") || 'My Store'}</h3>
          <p className="text-xs font-mono text-slate-400 select-all">{publicStoreUrl}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <Button type="button" onClick={copyStoreLink} variant="outline"
            className="h-10 px-5 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs rounded-xl font-medium">
            <Copy size={14} className="mr-2 text-blue-400" /> Copy link
          </Button>
          <Button type="button" onClick={() => window.open(publicStoreUrl, '_blank')}
            className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-medium shadow-lg shadow-blue-900/30">
            <ExternalLink size={14} className="mr-2" /> Preview store
          </Button>
        </div>
      </div>

      {/* ── 1. Branding & identity ─────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Palette}
          iconClass="bg-blue-50 text-blue-600 border-blue-100"
          title="Branding & store identity"
          description="Set your store name, public URL, logo, hero banner, and brand colours."
        />
        <CardContent className="p-8 space-y-8">

          {/* Store name + slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="storeName">Store / business name <span className="text-rose-500">*</span></FieldLabel>
              <Input id="storeName" {...form.register("storeName")} className="h-11 rounded-xl border-slate-200 font-medium" />
              {form.formState.errors.storeName && (
                <p className="text-xs text-rose-600">{form.formState.errors.storeName.message as string}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="storeSlug">
                Public URL slug <span className="text-rose-500">*</span>
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none select-none">
                  bbu1.com/store/
                </span>
                <Input
                  id="storeSlug"
                  {...form.register("storeSlug")}
                  className="h-11 pl-[7.5rem] rounded-xl font-mono border-blue-200 bg-blue-50/30 text-blue-900 text-sm"
                />
              </div>
              {form.formState.errors.storeSlug && (
                <p className="text-xs text-rose-600">{form.formState.errors.storeSlug.message as string}</p>
              )}
            </div>
          </div>

          {/* Currency + accent colour */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="currency">Currency code (ISO 4217)</FieldLabel>
              <Input
                id="currency"
                {...form.register("currency")}
                maxLength={3}
                className="h-11 rounded-xl border-slate-200 font-mono font-bold uppercase tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="themeColor">Brand accent colour</FieldLabel>
              <div className="flex gap-3 items-center">
                <div className="relative h-11 w-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                  <input
                    type="color"
                    id="themeColor"
                    className="absolute -top-2 -left-2 h-16 w-20 cursor-pointer border-0 p-0"
                    {...form.register("themeColor")}
                  />
                </div>
                <Input
                  {...form.register("themeColor")}
                  placeholder="#2563eb"
                  className="h-11 font-mono uppercase rounded-xl border-slate-200 flex-1"
                />
              </div>
            </div>
          </div>

          {/* Hero banner + logo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">

            {/* Banner */}
            <div className="space-y-3">
              <FieldLabel>Hero banner — image or short video</FieldLabel>
              {bannerUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-36 group">
                  {isVideoUrl(bannerUrl) ? (
                    <video src={bannerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={bannerUrl} className="w-full h-full object-cover" alt="Hero banner preview" />
                  )}
                  <Badge className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] border-none backdrop-blur-sm flex items-center gap-1">
                    {isVideoUrl(bannerUrl) ? <Film size={11} className="text-purple-300" /> : <ImageIcon size={11} className="text-blue-300" />}
                    {isVideoUrl(bannerUrl) ? 'Video preview' : 'Image preview'}
                  </Badge>
                  <Button
                    type="button"
                    onClick={() => form.setValue("bannerUrl", "")}
                    variant="destructive"
                    size="icon"
                    className="absolute top-2.5 right-2.5 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
              <input type="file" accept="image/*,video/*" onChange={e => handleStoreAssetUpload(e, 'bannerUrl')} className="hidden" id="store-banner-upload" />
              <label htmlFor="store-banner-upload"
                className="flex items-center justify-center gap-2.5 h-12 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all text-xs font-medium text-slate-600 hover:text-blue-700">
                {isUploadingBanner ? <Loader2 className="animate-spin h-4 w-4 text-blue-500" /> : <Upload className="h-4 w-4 text-slate-400" />}
                {bannerUrl ? "Replace hero banner" : "Upload hero banner (photo or video)"}
              </label>
            </div>

            {/* Logo */}
            <div className="space-y-3">
              <FieldLabel>Store logo</FieldLabel>
              {logoUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 h-36 flex items-center justify-center group">
                  <img src={logoUrl} className="max-h-full max-w-full object-contain rounded-lg" alt="Brand logo preview" />
                  <Badge className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] border-none backdrop-blur-sm flex items-center gap-1">
                    <ImageIcon size={11} className="text-emerald-300" /> Logo preview
                  </Badge>
                  <Button
                    type="button"
                    onClick={() => form.setValue("logoUrl", "")}
                    variant="destructive"
                    size="icon"
                    className="absolute top-2.5 right-2.5 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={e => handleStoreAssetUpload(e, 'logoUrl')} className="hidden" id="store-logo-upload" />
              <label htmlFor="store-logo-upload"
                className="flex items-center justify-center gap-2.5 h-12 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all text-xs font-medium text-slate-600 hover:text-blue-700">
                {isUploadingLogo ? <Loader2 className="animate-spin h-4 w-4 text-blue-500" /> : <ImagePlus className="h-4 w-4 text-slate-400" />}
                {logoUrl ? "Replace logo" : "Upload brand logo"}
              </label>
            </div>
          </div>

          {/* Store description */}
          <div className="space-y-1.5">
            <FieldLabel htmlFor="storeDescription">Public store description & brand story</FieldLabel>
            <Textarea
              id="storeDescription"
              {...form.register("storeDescription")}
              placeholder="Tell customers about your business, quality guarantees, or booking policies..."
              className="rounded-xl border-slate-200 text-sm min-h-[100px] resize-none"
            />
          </div>

          {/* Website CTA block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="heroCtaText">Hero banner button label</FieldLabel>
              <Input id="heroCtaText" {...form.register("heroCtaText")} placeholder="e.g. Explore Catalog" className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="heroCtaLink">Hero banner button link</FieldLabel>
              <Input id="heroCtaLink" {...form.register("heroCtaLink")} placeholder="e.g. #catalog or https://..." className="h-11 rounded-xl border-slate-200 font-mono text-sm" />
            </div>
          </div>

          {/* About us block */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="aboutUsTitle">About us section — heading</FieldLabel>
              <Input id="aboutUsTitle" {...form.register("aboutUsTitle")} placeholder="e.g. About Our Business" className="h-11 rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="aboutUsBody">About us section — body text</FieldLabel>
              <Textarea
                id="aboutUsBody"
                {...form.register("aboutUsBody")}
                placeholder="Describe your story, mission, and what sets you apart..."
                className="rounded-xl border-slate-200 text-sm min-h-[90px] resize-none"
              />
            </div>
          </div>

          {/* Testimonial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="testimonialQuote">Featured testimonial</FieldLabel>
              <Textarea
                id="testimonialQuote"
                {...form.register("testimonialQuote")}
                placeholder="e.g. Excellent service and super fast delivery..."
                className="rounded-xl border-slate-200 text-sm min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="testimonialAuthor">Testimonial author</FieldLabel>
              <Input id="testimonialAuthor" {...form.register("testimonialAuthor")} placeholder="e.g. Verified Client" className="h-11 rounded-xl border-slate-200" />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── 2. Contact & WhatsApp dispatch ────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={MessageSquare}
          iconClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          title="WhatsApp & contact dispatch"
          description="Receive instant WhatsApp alerts when customers place orders or request inspections."
        />
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="space-y-1.5">
              <FieldLabel htmlFor="whatsappNumber">WhatsApp order number <span className="text-rose-500">*</span></FieldLabel>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 pointer-events-none" />
                <Input
                  id="whatsappNumber"
                  {...form.register("whatsappNumber")}
                  placeholder="+256700000000"
                  className="pl-9 h-11 rounded-xl border-emerald-200 bg-emerald-50/20 text-emerald-900 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="supportEmail">Support email address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="supportEmail"
                  {...form.register("supportEmail")}
                  type="email"
                  placeholder="orders@mybusiness.com"
                  className="pl-9 h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="supportPhone">Support phone helpline</FieldLabel>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="supportPhone"
                  {...form.register("supportPhone")}
                  placeholder="+256..."
                  className="pl-9 h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── 3. Website design theme ───────────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Palette}
          iconClass="bg-purple-50 text-purple-600 border-purple-100"
          title="Website design theme"
          description="Choose a visual theme that transforms the look and feel of your public storefront."
        />
        <CardContent className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <TemplateCard
              selected={selectedTheme === 'MODERN_MINIMALIST'}
              onClick={() => form.setValue("websiteTheme", "MODERN_MINIMALIST")}
              icon={Sun}
              iconBg="bg-blue-600"
              checkColor="text-blue-600"
              cardClass="bg-blue-50/70"
              borderActive="border-blue-600"
              borderIdle="border-slate-200 hover:border-blue-300"
              title="Modern Minimalist"
              description="Clean white canvas, electric blue accents, and modern card layouts."
            />

            <TemplateCard
              selected={selectedTheme === 'DARK_SOVEREIGN'}
              onClick={() => form.setValue("websiteTheme", "DARK_SOVEREIGN")}
              icon={Moon}
              iconBg="bg-emerald-600"
              checkColor="text-emerald-400"
              cardClass="bg-slate-900"
              borderActive="border-emerald-500"
              borderIdle="border-slate-800 hover:border-emerald-500/50"
              title="Dark Sovereign"
              description="Deep OLED dark mode, emerald glow accents, and futuristic glass cards."
              titleClass="text-white"
              descClass="text-slate-400"
            />

            <TemplateCard
              selected={selectedTheme === 'LUXURY_GOLD'}
              onClick={() => form.setValue("websiteTheme", "LUXURY_GOLD")}
              icon={Crown}
              iconBg="bg-amber-500"
              checkColor="text-amber-400"
              cardClass="bg-amber-950"
              borderActive="border-amber-500"
              borderIdle="border-amber-900 hover:border-amber-600"
              title="Luxury Gold"
              description="Obsidian black with champagne gold accents and premium badge styling."
              titleClass="text-amber-100"
              descClass="text-amber-300/80"
            />

            <TemplateCard
              selected={selectedTheme === 'CORPORATE_ENTERPRISE'}
              onClick={() => form.setValue("websiteTheme", "CORPORATE_ENTERPRISE")}
              icon={Building2}
              iconBg="bg-slate-900"
              checkColor="text-slate-900"
              cardClass="bg-slate-100"
              borderActive="border-slate-900"
              borderIdle="border-slate-200 hover:border-slate-400"
              title="Corporate Enterprise"
              description="Navy and steel grey, crisp executive borders, and a structured formal layout."
            />

          </div>
        </CardContent>
      </Card>

      {/* ── 4. Industry storefront template ──────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Layers}
          iconClass="bg-blue-50 text-blue-600 border-blue-100"
          title="Industry storefront template"
          description="Switch your public site between a retail shop, property directory, hotel booking page, or professional services studio."
        />
        <CardContent className="p-8 space-y-8">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <TemplateCard
              selected={selectedTemplate === 'RETAIL'}
              onClick={() => form.setValue("storefrontTemplate", "RETAIL")}
              icon={ShoppingBag}
              iconBg="bg-blue-600"
              checkColor="text-blue-600"
              cardClass="bg-blue-50/60"
              borderActive="border-blue-600"
              borderIdle="border-slate-200 hover:border-blue-300"
              title="Standard retail"
              description="E-commerce cart checkout, POS stock sync, and instant digital receipts."
            />

            <TemplateCard
              selected={selectedTemplate === 'REAL_ESTATE_RENTALS'}
              onClick={() => form.setValue("storefrontTemplate", "REAL_ESTATE_RENTALS")}
              icon={Home}
              iconBg="bg-emerald-600"
              checkColor="text-emerald-600"
              cardClass="bg-emerald-50/60"
              borderActive="border-emerald-600"
              borderIdle="border-slate-200 hover:border-emerald-300"
              title="Real estate & rentals"
              description="Property listings, inspection fee Mobile Money booking, and WhatsApp chat."
            />

            <TemplateCard
              selected={selectedTemplate === 'HOTEL_AIRBNB'}
              onClick={() => form.setValue("storefrontTemplate", "HOTEL_AIRBNB")}
              icon={Hotel}
              iconBg="bg-purple-600"
              checkColor="text-purple-600"
              cardClass="bg-purple-50/60"
              borderActive="border-purple-600"
              borderIdle="border-slate-200 hover:border-purple-300"
              title="Hotel & guest house"
              description="Nightly room rates, date reservations, amenity showcase, and MoMo deposits."
            />

            <TemplateCard
              selected={selectedTemplate === 'SERVICES_BOOKING'}
              onClick={() => form.setValue("storefrontTemplate", "SERVICES_BOOKING")}
              icon={Briefcase}
              iconBg="bg-amber-600"
              checkColor="text-amber-600"
              cardClass="bg-amber-50/60"
              borderActive="border-amber-600"
              borderIdle="border-slate-200 hover:border-amber-300"
              title="Services & appointments"
              description="Consultation fees, service packages, and appointment scheduling."
            />

          </div>

          {/* ── Conditional: Real estate fields ── */}
          {selectedTemplate === 'REAL_ESTATE_RENTALS' && (
            <div className="border-t border-slate-100 pt-6 space-y-5">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Home size={15} className="text-emerald-600" /> Real estate configuration
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="inspectionFee">Inspection fee ({form.watch("currency")})</FieldLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="inspectionFee" {...form.register("inspectionFee")} placeholder="50000" className="pl-9 h-11 rounded-xl border-slate-200" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="agencyLicenseNo">Agency license number</FieldLabel>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="agencyLicenseNo" {...form.register("agencyLicenseNo")} placeholder="e.g. RE-UG-2024-001" className="pl-9 h-11 rounded-xl border-slate-200 font-mono" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="inspectionTerms">Inspection terms & conditions</FieldLabel>
                <Textarea
                  id="inspectionTerms"
                  {...form.register("inspectionTerms")}
                  placeholder="Describe what the inspection fee covers, viewing policies, and agent contact terms..."
                  className="rounded-xl border-slate-200 text-sm min-h-[90px] resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Conditional: Hotel fields ── */}
          {selectedTemplate === 'HOTEL_AIRBNB' && (
            <div className="border-t border-slate-100 pt-6 space-y-5">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Hotel size={15} className="text-purple-600" /> Hotel & accommodation settings
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="checkInTime">Check-in time</FieldLabel>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="checkInTime" {...form.register("checkInTime")} type="time" className="pl-9 h-11 rounded-xl border-slate-200 font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="checkOutTime">Check-out time</FieldLabel>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="checkOutTime" {...form.register("checkOutTime")} type="time" className="pl-9 h-11 rounded-xl border-slate-200 font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="advanceDepositPct">Advance deposit (%)</FieldLabel>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="advanceDepositPct" {...form.register("advanceDepositPct")} placeholder="50" className="pl-9 h-11 rounded-xl border-slate-200 font-mono" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="cancellationPolicy">Cancellation policy</FieldLabel>
                <Textarea
                  id="cancellationPolicy"
                  {...form.register("cancellationPolicy")}
                  placeholder="Describe your refund and cancellation policy..."
                  className="rounded-xl border-slate-200 text-sm min-h-[80px] resize-none"
                />
              </div>

              {/* Amenity toggles */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-600">Available amenities</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'wifi', label: 'Wi-Fi' },
                    { key: 'ac', label: 'Air conditioning' },
                    { key: 'breakfast', label: 'Breakfast included' },
                    { key: 'parking', label: 'Parking' },
                    { key: 'pool', label: 'Swimming pool' },
                    { key: 'tv', label: 'Television' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setHotelAmenities(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all",
                        hotelAmenities[key]
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-purple-300"
                      )}
                    >
                      {hotelAmenities[key] ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-40" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Conditional: Services fields ── */}
          {selectedTemplate === 'SERVICES_BOOKING' && (
            <div className="border-t border-slate-100 pt-6 space-y-5">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Briefcase size={15} className="text-amber-600" /> Services & booking configuration
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="consultationFee">Consultation fee ({form.watch("currency")})</FieldLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="consultationFee" {...form.register("consultationFee")} placeholder="100000" className="pl-9 h-11 rounded-xl border-slate-200" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="defaultDuration">Default session duration</FieldLabel>
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="defaultDuration" {...form.register("defaultDuration")} placeholder="60 minutes" className="pl-9 h-11 rounded-xl border-slate-200" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="workingHours">Working hours</FieldLabel>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input id="workingHours" {...form.register("workingHours")} placeholder="Mon – Sat: 8:00 AM – 6:00 PM" className="pl-9 h-11 rounded-xl border-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* ── 5. Logistics & delivery ───────────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Truck}
          iconClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          title="Logistics & delivery options"
          description="Set your business location, supported regions, and standard versus express shipping rates."
        />
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="businessLocation">Business physical address</FieldLabel>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input id="businessLocation" {...form.register("businessLocation")} placeholder="e.g. Plot 12 Kampala Road, Uganda" className="pl-9 h-11 rounded-xl border-slate-200" />
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="supportedDestinations">Supported shipping regions</FieldLabel>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input id="supportedDestinations" {...form.register("supportedDestinations")} placeholder="e.g. East Africa, Europe, Global" className="pl-9 h-11 rounded-xl border-slate-200" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <FieldLabel htmlFor="standardShippingFee">
                <span className="flex items-center gap-1.5">
                  <Truck size={13} className="text-blue-500" /> Standard delivery fee ({form.watch("currency")})
                </span>
              </FieldLabel>
              <Input id="standardShippingFee" {...form.register("standardShippingFee")} placeholder="10000" className="h-11 rounded-xl border-slate-200 bg-white font-mono font-semibold" />
            </div>
            <div className="p-5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1.5">
              <FieldLabel htmlFor="vipShippingFee">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <Zap size={13} className="text-purple-500" /> VIP express same-day fee ({form.watch("currency")})
                </span>
              </FieldLabel>
              <Input id="vipShippingFee" {...form.register("vipShippingFee")} placeholder="25000" className="h-11 rounded-xl border-purple-200 bg-white font-mono font-semibold text-purple-900" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Custom multi-page website builder ─────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={FileText}
          iconClass="bg-blue-50 text-blue-600 border-blue-100"
          title="Custom website pages"
          description="Create standalone pages on your public website such as About, Shipping Policy, or Warranty."
          action={
            <Button type="button" onClick={addCustomPage}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-medium shadow-sm">
              <Plus size={14} className="mr-1.5" /> Add page
            </Button>
          }
        />
        <CardContent className="p-8 space-y-5">
          {customPages.map((page, idx) => (
            <div key={page.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Page {idx + 1}</span>
                {customPages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCustomPage(page.id)}
                    className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel>Page title</FieldLabel>
                  <Input
                    value={page.title}
                    onChange={e => handleCustomPageChange(page.id, 'title', e.target.value)}
                    placeholder="e.g. Quality Guarantee"
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>URL slug</FieldLabel>
                  <Input
                    value={page.slug}
                    onChange={e => handleCustomPageChange(page.id, 'slug', e.target.value)}
                    placeholder="e.g. quality-guarantee"
                    className="h-10 rounded-xl border-slate-200 bg-white font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Page content / article body</FieldLabel>
                <Textarea
                  value={page.content}
                  onChange={e => handleCustomPageChange(page.id, 'content', e.target.value)}
                  placeholder="Enter page text, policy details, or company history..."
                  className="rounded-xl border-slate-200 bg-white text-sm min-h-[90px] resize-none"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── 7. FAQ builder ────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={HelpCircle}
          iconClass="bg-amber-50 text-amber-600 border-amber-100"
          title="Frequently asked questions"
          description="Add custom questions and answers displayed on your public storefront."
          action={
            <Button type="button" onClick={addFaqItem}
              className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-xl font-medium shadow-sm">
              <Plus size={14} className="mr-1.5" /> Add FAQ
            </Button>
          }
        />
        <CardContent className="p-8 space-y-5">
          {faqs.map((faq, idx) => (
            <div key={faq.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">FAQ {idx + 1}</span>
                {faqs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFaqItem(faq.id)}
                    className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Question</FieldLabel>
                <Input
                  value={faq.question}
                  onChange={e => handleFaqChange(faq.id, 'question', e.target.value)}
                  placeholder="e.g. What are your delivery terms?"
                  className="h-10 rounded-xl border-slate-200 bg-white text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Answer</FieldLabel>
                <Textarea
                  value={faq.answer}
                  onChange={e => handleFaqChange(faq.id, 'answer', e.target.value)}
                  placeholder="Explain your policy or process clearly..."
                  className="rounded-xl border-slate-200 bg-white text-sm min-h-[70px] resize-none"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── 8. Product / property media linker ───────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Video}
          iconClass="bg-purple-50 text-purple-600 border-purple-100"
          title="Product & property media linker"
          description="Select one or more listings and attach photos or video walkthroughs in bulk."
        />
        <CardContent className="p-8 space-y-6">

          {/* Selection list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel>{selectedVariantIds.length} item(s) selected</FieldLabel>
              <button
                type="button"
                onClick={toggleSelectAllVariants}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {productVariants && selectedVariantIds.length === productVariants.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-3 space-y-1.5">
              {productVariants && productVariants.length > 0 ? (
                productVariants.map((pv: any) => {
                  const isSelected = selectedVariantIds.includes(String(pv.id));
                  return (
                    <div
                      key={pv.id}
                      onClick={() => toggleVariantSelection(String(pv.id))}
                      className={cn(
                        "px-3 py-2.5 rounded-lg border flex items-center justify-between cursor-pointer text-xs font-medium transition-all",
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-purple-300"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} className="text-slate-400" />}
                        <span>{pv.products?.name} — {pv.name}</span>
                      </div>
                      <span className={cn("font-mono text-[11px]", isSelected ? "text-purple-100" : "text-slate-400")}>
                        {pv.sku || 'No SKU'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No product variants found for this business.</p>
              )}
            </div>
          </div>

          {/* Upload trigger */}
          <div className="space-y-1.5">
            <FieldLabel>Attach photo or video walkthrough</FieldLabel>
            <input
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
                "flex items-center justify-center gap-3 h-12 border-2 border-dashed rounded-xl cursor-pointer transition-all text-xs font-medium",
                selectedVariantIds.length === 0
                  ? "opacity-50 pointer-events-none bg-slate-100 border-slate-200 text-slate-400"
                  : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              )}
            >
              {isUploadingProductMedia ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Camera size={16} />
              )}
              {isUploadingProductMedia
                ? "Attaching media..."
                : selectedVariantIds.length === 0
                ? "Select items above to enable upload"
                : `Attach photo or video to ${selectedVariantIds.length} selected item(s)`}
            </label>
          </div>

        </CardContent>
      </Card>

      {/* ── 9. SEO & metadata ─────────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Search}
          iconClass="bg-amber-50 text-amber-600 border-amber-100"
          title="SEO & search engine metadata"
          description="Optimise your storefront for Google search indexing and social media link previews."
        />
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="seoTitle">Meta title</FieldLabel>
              <span className={cn("text-xs font-mono", (form.watch("seoTitle")?.length || 0) > 70 ? "text-amber-600" : "text-slate-400")}>
                {form.watch("seoTitle")?.length || 0} / 80
              </span>
            </div>
            <Input id="seoTitle" {...form.register("seoTitle")} className="h-11 rounded-xl border-slate-200 font-medium" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="seoDesc">Meta description</FieldLabel>
              <span className={cn("text-xs font-mono", (form.watch("seoDesc")?.length || 0) > 160 ? "text-amber-600" : "text-slate-400")}>
                {form.watch("seoDesc")?.length || 0} / 200
              </span>
            </div>
            <Textarea
              id="seoDesc"
              {...form.register("seoDesc")}
              className="rounded-xl border-slate-200 text-sm min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Sticky save footer ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="text-xs text-slate-500 hidden sm:block">
          Changes are saved to your storefront immediately upon confirmation.
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 px-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all ml-auto"
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><ShieldCheck className="mr-2 h-4 w-4" /> Save storefront settings</>
          )}
        </Button>
      </div>

    </form>
  );
}