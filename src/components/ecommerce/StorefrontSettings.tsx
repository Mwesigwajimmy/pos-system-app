'use client';

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

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
  Clock, Percent, Key, MapPin,
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

/* ═══════════════════════════════════════════════════════════════════════════
   Presentation primitives
   Uniform spacing, one type scale, no absolute overlays over text.
   ═══════════════════════════════════════════════════════════════════════════ */

const SECTION_TONE: Record<string, string> = {
  blue:    "bg-blue-50 text-blue-600 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  purple:  "bg-purple-50 text-purple-600 ring-purple-100",
  amber:   "bg-amber-50 text-amber-600 ring-amber-100",
  slate:   "bg-slate-100 text-slate-600 ring-slate-200",
};

/** Card shell for one settings section. */
function SectionCard({
  icon: Icon,
  tone = "slate",
  title,
  description,
  action,
  children,
}: {
  icon: React.ElementType;
  tone?: keyof typeof SECTION_TONE | string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
              SECTION_TONE[tone] ?? SECTION_TONE.slate
            )}
          >
            <Icon size={17} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0 sm:ml-4">{action}</div> : null}
      </header>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

/** Label + control + optional hint / error, in a consistent vertical rhythm. */
function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  trailing,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-[18px] items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </Label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Text input with a leading icon. Padding is matched to the icon box so
 *  the caret and placeholder never sit under the glyph. */
const IconInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ElementType; iconClass?: string }
>(function IconInput({ icon: Icon, iconClass, className, ...props }, ref) {
  return (
    <div className="relative">
      <Icon
        size={15}
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",
          iconClass
        )}
      />
      <Input
        ref={ref}
        {...props}
        className={cn("h-10 rounded-lg border-slate-200 pl-9 text-sm", className)}
      />
    </div>
  );
});

/** Selectable option tile. All colour classes arrive as complete strings so
 *  Tailwind can see them at build time. */
function OptionCard({
  selected,
  onClick,
  icon: Icon,
  iconBg,
  title,
  description,
  surface = "bg-white",
  borderIdle = "border-slate-200",
  borderActive = "border-slate-900",
  hoverBorder = "hover:border-slate-300",
  titleClass = "text-slate-900",
  descClass = "text-slate-500",
  checkClass = "text-slate-900",
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  iconBg: string;
  title: string;
  description: string;
  surface?: string;
  borderIdle?: string;
  borderActive?: string;
  hoverBorder?: string;
  titleClass?: string;
  descClass?: string;
  checkClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2",
        selected ? cn(surface, borderActive, "ring-1 ring-inset", borderActive.replace("border-", "ring-"))
                 : cn("bg-white", borderIdle, hoverBorder)
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg text-white", iconBg)}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <CheckCircle2
          size={16}
          className={cn(checkClass, "shrink-0 transition-opacity", selected ? "opacity-100" : "opacity-0")}
        />
      </div>
      <div className="space-y-1">
        <h3 className={cn("text-xs font-semibold leading-tight", selected ? titleClass : "text-slate-900")}>
          {title}
        </h3>
        <p className={cn("text-xs leading-relaxed", selected ? descClass : "text-slate-500")}>
          {description}
        </p>
      </div>
    </button>
  );
}

/** Grey panel used by the FAQ and custom-page repeaters. */
function RepeaterItem({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** Media preview frame with a remove control that never covers the image centre. */
function MediaFrame({
  children,
  badge,
  onRemove,
}: {
  children: React.ReactNode;
  badge: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="group relative h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
      {children}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        {badge}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove media"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/70 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-rose-600 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/** Dashed upload target. */
function UploadTarget({
  id,
  busy,
  icon: Icon,
  label,
  disabled,
  tone = "slate",
}: {
  id: string;
  busy: boolean;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  tone?: "slate" | "purple";
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-medium transition-colors",
        disabled
          ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
          : tone === "purple"
            ? "border-purple-200 bg-purple-50/60 text-purple-700 hover:bg-purple-50"
            : "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-slate-100"
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      <span className="truncate">{label}</span>
    </label>
  );
}

/* ── Section registry driving the side / tab navigation ──────────────────── */
const SECTIONS = [
  { id: "brand",     label: "Branding",   icon: Palette },
  { id: "contact",   label: "Contact",    icon: MessageSquare },
  { id: "theme",     label: "Appearance", icon: Sun },
  { id: "template",  label: "Template",   icon: Layers },
  { id: "logistics", label: "Delivery",   icon: Truck },
  { id: "pages",     label: "Pages",      icon: FileText },
  { id: "faq",       label: "FAQs",       icon: HelpCircle },
  { id: "media",     label: "Media",      icon: Video },
  { id: "seo",       label: "SEO",        icon: Search },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ═══════════════════════════════════════════════════════════════════════════ */

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

  // UI-only: which settings section is on screen.
  const [activeSection, setActiveSection] = useState<SectionId>("brand");

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
  const currency = form.watch("currency");

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

  const errors = form.formState.errors as Record<string, any>;
  const err = (name: string) => errors?.[name]?.message as string | undefined;

  const inputBase = "h-10 rounded-lg border-slate-200 text-sm";
  const textareaBase = "rounded-lg border-slate-200 text-sm resize-none";

  const isVisible = (id: SectionId) => activeSection === id;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto w-full max-w-[1400px]">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Store size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-slate-900">
                  {form.watch("storeName") || "My Store"}
                </h1>
                <Badge className="border-0 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Live
                </Badge>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Globe size={12} className="shrink-0" />
                <span className="truncate font-mono">{publicStoreUrl}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyStoreLink}
              className="h-9 flex-1 rounded-lg border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 lg:flex-none"
            >
              <Copy size={14} className="mr-1.5" /> Copy link
            </Button>
            <Button
              type="button"
              onClick={() => window.open(publicStoreUrl, '_blank', 'noopener,noreferrer')}
              className="h-9 flex-1 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 lg:flex-none"
            >
              <ExternalLink size={14} className="mr-1.5" /> Preview store
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body: nav + content ─────────────────────────────────────────────── */}
      <div className="mt-4 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-5">
        {/* Mobile / tablet: horizontal tabs */}
        <nav
          aria-label="Settings sections"
          className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-max gap-1.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(id)}
                  aria-current={isVisible(id) ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors",
                    isVisible(id)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop: sticky sidebar */}
        <nav aria-label="Settings sections" className="hidden lg:sticky lg:top-4 lg:block">
          <ul className="space-y-0.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(id)}
                  aria-current={isVisible(id) ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                    isVisible(id)
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Content column ────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">

          {/* ── 1. Branding & identity ──────────────────────────────────────── */}
          {isVisible("brand") && (
            <>
              <SectionCard
                icon={Palette}
                tone="blue"
                title="Branding and store identity"
                description="Store name, public address, logo, hero banner and brand colour."
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="Store name" htmlFor="storeName" required error={err("storeName")}>
                      <Input id="storeName" {...form.register("storeName")} className={inputBase} />
                    </Field>

                    <Field
                      label="Public address"
                      htmlFor="storeSlug"
                      required
                      error={err("storeSlug")}
                      hint="Lowercase letters, numbers and hyphens."
                    >
                      {/* Prefix sits in its own box — it can never overlap the input text. */}
                      <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900/10">
                        <span className="hidden select-none items-center border-r border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-500 sm:inline-flex">
                          bbu1.com/store/
                        </span>
                        <Input
                          id="storeSlug"
                          {...form.register("storeSlug")}
                          className="h-full flex-1 rounded-none border-0 bg-white font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="Currency code" htmlFor="currency" hint="Three-letter ISO 4217 code." error={err("currency")}>
                      <Input
                        id="currency"
                        {...form.register("currency")}
                        maxLength={3}
                        className={cn(inputBase, "font-mono uppercase tracking-widest")}
                      />
                    </Field>

                    <Field label="Brand colour" htmlFor="themeColorText" error={err("themeColor")}>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="themeColor"
                          className="relative h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200"
                          style={{ backgroundColor: form.watch("themeColor") || "#2563eb" }}
                        >
                          <input
                            type="color"
                            id="themeColor"
                            aria-label="Pick brand colour"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            {...form.register("themeColor")}
                          />
                        </label>
                        <Input
                          id="themeColorText"
                          {...form.register("themeColor")}
                          placeholder="#2563eb"
                          className={cn(inputBase, "flex-1 font-mono uppercase")}
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-700">Hero banner</Label>
                      {bannerUrl && (
                        <MediaFrame
                          onRemove={() => form.setValue("bannerUrl", "")}
                          badge={
                            <Badge className="pointer-events-none border-0 bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                              {isVideoUrl(bannerUrl) ? (
                                <><Film size={11} className="mr-1" /> Video</>
                              ) : (
                                <><ImageIcon size={11} className="mr-1" /> Image</>
                              )}
                            </Badge>
                          }
                        >
                          {isVideoUrl(bannerUrl) ? (
                            <video src={bannerUrl} autoPlay loop muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          ) : (
                            <img src={bannerUrl} alt="Hero banner preview" className="h-full w-full object-cover" />
                          )}
                        </MediaFrame>
                      )}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={e => handleStoreAssetUpload(e, 'bannerUrl')}
                        className="hidden"
                        id="store-banner-upload"
                      />
                      <UploadTarget
                        id="store-banner-upload"
                        busy={isUploadingBanner}
                        icon={Upload}
                        label={bannerUrl ? "Replace banner" : "Upload banner — image or video"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-700">Store logo</Label>
                      {logoUrl && (
                        <div className="group relative flex h-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <img src={logoUrl} alt="Brand logo preview" className="max-h-full max-w-full object-contain" />
                          <button
                            type="button"
                            onClick={() => form.setValue("logoUrl", "")}
                            aria-label="Remove logo"
                            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/70 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleStoreAssetUpload(e, 'logoUrl')}
                        className="hidden"
                        id="store-logo-upload"
                      />
                      <UploadTarget
                        id="store-logo-upload"
                        busy={isUploadingLogo}
                        icon={ImagePlus}
                        label={logoUrl ? "Replace logo" : "Upload logo"}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <Field label="Store description" htmlFor="storeDescription" hint="Shown near the top of your public storefront.">
                      <Textarea
                        id="storeDescription"
                        {...form.register("storeDescription")}
                        placeholder="Tell customers about your business, quality guarantees or booking policies."
                        className={cn(textareaBase, "min-h-[96px]")}
                      />
                    </Field>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                icon={FileText}
                tone="blue"
                title="Homepage content"
                description="The call to action, about section and featured quote on your storefront."
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="Button label" htmlFor="heroCtaText">
                      <Input id="heroCtaText" {...form.register("heroCtaText")} placeholder="Explore catalog" className={inputBase} />
                    </Field>
                    <Field label="Button link" htmlFor="heroCtaLink">
                      <Input id="heroCtaLink" {...form.register("heroCtaLink")} placeholder="#catalog" className={cn(inputBase, "font-mono")} />
                    </Field>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <Field label="About section heading" htmlFor="aboutUsTitle">
                      <Input id="aboutUsTitle" {...form.register("aboutUsTitle")} placeholder="About our business" className={inputBase} />
                    </Field>
                    <Field label="About section body" htmlFor="aboutUsBody">
                      <Textarea
                        id="aboutUsBody"
                        {...form.register("aboutUsBody")}
                        placeholder="Describe your story, mission and what sets you apart."
                        className={cn(textareaBase, "min-h-[88px]")}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 sm:gap-5">
                    <Field label="Featured quote" htmlFor="testimonialQuote">
                      <Textarea
                        id="testimonialQuote"
                        {...form.register("testimonialQuote")}
                        placeholder="A short line from a real customer."
                        className={cn(textareaBase, "min-h-[80px]")}
                      />
                    </Field>
                    <Field label="Attributed to" htmlFor="testimonialAuthor">
                      <Input id="testimonialAuthor" {...form.register("testimonialAuthor")} placeholder="Customer name" className={inputBase} />
                    </Field>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── 2. Contact ──────────────────────────────────────────────────── */}
          {isVisible("contact") && (
            <SectionCard
              icon={MessageSquare}
              tone="emerald"
              title="Contact and order alerts"
              description="Where order and inspection notifications reach you."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                <Field label="WhatsApp number" htmlFor="whatsappNumber" required hint="Order alerts are sent here.">
                  <IconInput
                    id="whatsappNumber"
                    icon={Phone}
                    iconClass="text-emerald-500"
                    placeholder="+256700000000"
                    {...form.register("whatsappNumber")}
                  />
                </Field>

                <Field label="Support email" htmlFor="supportEmail">
                  <IconInput
                    id="supportEmail"
                    icon={Mail}
                    type="email"
                    placeholder="orders@mybusiness.com"
                    {...form.register("supportEmail")}
                  />
                </Field>

                <Field label="Support phone" htmlFor="supportPhone">
                  <IconInput
                    id="supportPhone"
                    icon={Phone}
                    placeholder="+256..."
                    {...form.register("supportPhone")}
                  />
                </Field>
              </div>
            </SectionCard>
          )}

          {/* ── 3. Appearance ───────────────────────────────────────────────── */}
          {isVisible("theme") && (
            <SectionCard
              icon={Sun}
              tone="purple"
              title="Appearance"
              description="The visual theme applied to your public storefront."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OptionCard
                  selected={selectedTheme === 'MODERN_MINIMALIST'}
                  onClick={() => form.setValue("websiteTheme", "MODERN_MINIMALIST")}
                  icon={Sun}
                  iconBg="bg-blue-600"
                  surface="bg-blue-50/70"
                  borderActive="border-blue-600"
                  borderIdle="border-slate-200"
                  hoverBorder="hover:border-blue-300"
                  checkClass="text-blue-600"
                  title="Modern minimalist"
                  description="Clean white canvas with blue accents and card layouts."
                />
                <OptionCard
                  selected={selectedTheme === 'DARK_SOVEREIGN'}
                  onClick={() => form.setValue("websiteTheme", "DARK_SOVEREIGN")}
                  icon={Moon}
                  iconBg="bg-emerald-600"
                  surface="bg-slate-900"
                  borderActive="border-emerald-500"
                  borderIdle="border-slate-200"
                  hoverBorder="hover:border-emerald-300"
                  checkClass="text-emerald-400"
                  titleClass="text-white"
                  descClass="text-slate-400"
                  title="Dark"
                  description="Deep dark mode with emerald accents and glass cards."
                />
                <OptionCard
                  selected={selectedTheme === 'LUXURY_GOLD'}
                  onClick={() => form.setValue("websiteTheme", "LUXURY_GOLD")}
                  icon={Crown}
                  iconBg="bg-amber-500"
                  surface="bg-amber-950"
                  borderActive="border-amber-500"
                  borderIdle="border-slate-200"
                  hoverBorder="hover:border-amber-300"
                  checkClass="text-amber-400"
                  titleClass="text-amber-100"
                  descClass="text-amber-200/80"
                  title="Luxury gold"
                  description="Obsidian black with champagne gold and premium badges."
                />
                <OptionCard
                  selected={selectedTheme === 'CORPORATE_ENTERPRISE'}
                  onClick={() => form.setValue("websiteTheme", "CORPORATE_ENTERPRISE")}
                  icon={Building2}
                  iconBg="bg-slate-900"
                  surface="bg-slate-100"
                  borderActive="border-slate-900"
                  borderIdle="border-slate-200"
                  hoverBorder="hover:border-slate-400"
                  checkClass="text-slate-900"
                  title="Corporate"
                  description="Navy and steel grey with a structured formal layout."
                />
              </div>
            </SectionCard>
          )}

          {/* ── 4. Industry template ────────────────────────────────────────── */}
          {isVisible("template") && (
            <>
              <SectionCard
                icon={Layers}
                tone="blue"
                title="Industry template"
                description="Switch between a retail shop, property directory, hotel page or services studio."
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <OptionCard
                    selected={selectedTemplate === 'RETAIL'}
                    onClick={() => form.setValue("storefrontTemplate", "RETAIL")}
                    icon={ShoppingBag}
                    iconBg="bg-blue-600"
                    surface="bg-blue-50/70"
                    borderActive="border-blue-600"
                    hoverBorder="hover:border-blue-300"
                    checkClass="text-blue-600"
                    title="Retail"
                    description="Cart checkout, stock sync and digital receipts."
                  />
                  <OptionCard
                    selected={selectedTemplate === 'REAL_ESTATE_RENTALS'}
                    onClick={() => form.setValue("storefrontTemplate", "REAL_ESTATE_RENTALS")}
                    icon={Home}
                    iconBg="bg-emerald-600"
                    surface="bg-emerald-50/70"
                    borderActive="border-emerald-600"
                    hoverBorder="hover:border-emerald-300"
                    checkClass="text-emerald-600"
                    title="Real estate"
                    description="Listings, inspection fees and WhatsApp enquiries."
                  />
                  <OptionCard
                    selected={selectedTemplate === 'HOTEL_AIRBNB'}
                    onClick={() => form.setValue("storefrontTemplate", "HOTEL_AIRBNB")}
                    icon={Hotel}
                    iconBg="bg-purple-600"
                    surface="bg-purple-50/70"
                    borderActive="border-purple-600"
                    hoverBorder="hover:border-purple-300"
                    checkClass="text-purple-600"
                    title="Hotel"
                    description="Nightly rates, date reservations and deposits."
                  />
                  <OptionCard
                    selected={selectedTemplate === 'SERVICES_BOOKING'}
                    onClick={() => form.setValue("storefrontTemplate", "SERVICES_BOOKING")}
                    icon={Briefcase}
                    iconBg="bg-amber-600"
                    surface="bg-amber-50/70"
                    borderActive="border-amber-600"
                    hoverBorder="hover:border-amber-300"
                    checkClass="text-amber-600"
                    title="Services"
                    description="Consultation fees, packages and appointments."
                  />
                </div>
              </SectionCard>

              {selectedTemplate === 'REAL_ESTATE_RENTALS' && (
                <SectionCard
                  icon={Home}
                  tone="emerald"
                  title="Real estate settings"
                  description="Applies to the property directory template."
                >
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                      <Field label={`Inspection fee (${currency || 'UGX'})`} htmlFor="inspectionFee">
                        <IconInput id="inspectionFee" icon={DollarSign} placeholder="50000" {...form.register("inspectionFee")} />
                      </Field>
                      <Field label="Agency licence number" htmlFor="agencyLicenseNo">
                        <IconInput id="agencyLicenseNo" icon={Key} placeholder="RE-UG-2024-001" className="font-mono" {...form.register("agencyLicenseNo")} />
                      </Field>
                    </div>
                    <Field label="Inspection terms" htmlFor="inspectionTerms">
                      <Textarea
                        id="inspectionTerms"
                        {...form.register("inspectionTerms")}
                        placeholder="What the inspection fee covers, viewing policy and agent contact terms."
                        className={cn(textareaBase, "min-h-[88px]")}
                      />
                    </Field>
                  </div>
                </SectionCard>
              )}

              {selectedTemplate === 'HOTEL_AIRBNB' && (
                <SectionCard
                  icon={Hotel}
                  tone="purple"
                  title="Hotel settings"
                  description="Applies to the hotel and guest house template."
                >
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                      <Field label="Check-in time" htmlFor="checkInTime">
                        <IconInput id="checkInTime" icon={Clock} type="time" className="font-mono" {...form.register("checkInTime")} />
                      </Field>
                      <Field label="Check-out time" htmlFor="checkOutTime">
                        <IconInput id="checkOutTime" icon={Clock} type="time" className="font-mono" {...form.register("checkOutTime")} />
                      </Field>
                      <Field label="Advance deposit (%)" htmlFor="advanceDepositPct">
                        <IconInput id="advanceDepositPct" icon={Percent} placeholder="50" className="font-mono" {...form.register("advanceDepositPct")} />
                      </Field>
                    </div>

                    <Field label="Cancellation policy" htmlFor="cancellationPolicy">
                      <Textarea
                        id="cancellationPolicy"
                        {...form.register("cancellationPolicy")}
                        placeholder="Your refund and cancellation terms."
                        className={cn(textareaBase, "min-h-[80px]")}
                      />
                    </Field>

                    <div className="space-y-2 border-t border-slate-100 pt-5">
                      <Label className="text-xs font-medium text-slate-700">Available amenities</Label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                            aria-pressed={!!hotelAmenities[key]}
                            onClick={() => setHotelAmenities(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={cn(
                              "flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
                              hotelAmenities[key]
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"
                            )}
                          >
                            {hotelAmenities[key]
                              ? <CheckCircle2 size={14} className="shrink-0" />
                              : <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current opacity-40" />}
                            <span className="truncate">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {selectedTemplate === 'SERVICES_BOOKING' && (
                <SectionCard
                  icon={Briefcase}
                  tone="amber"
                  title="Services settings"
                  description="Applies to the services and appointments template."
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                    <Field label={`Consultation fee (${currency || 'UGX'})`} htmlFor="consultationFee">
                      <IconInput id="consultationFee" icon={DollarSign} placeholder="100000" {...form.register("consultationFee")} />
                    </Field>
                    <Field label="Session duration" htmlFor="defaultDuration">
                      <IconInput id="defaultDuration" icon={CalendarClock} placeholder="60 minutes" {...form.register("defaultDuration")} />
                    </Field>
                    <Field label="Working hours" htmlFor="workingHours">
                      <IconInput id="workingHours" icon={Clock} placeholder="Mon – Sat, 8:00 – 18:00" {...form.register("workingHours")} />
                    </Field>
                  </div>
                </SectionCard>
              )}
            </>
          )}

          {/* ── 5. Delivery ─────────────────────────────────────────────────── */}
          {isVisible("logistics") && (
            <SectionCard
              icon={Truck}
              tone="emerald"
              title="Delivery"
              description="Your location, the regions you serve and your shipping rates."
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="Business address" htmlFor="businessLocation">
                    <IconInput id="businessLocation" icon={MapPin} placeholder="Plot 12 Kampala Road, Uganda" {...form.register("businessLocation")} />
                  </Field>
                  <Field label="Regions served" htmlFor="supportedDestinations">
                    <IconInput id="supportedDestinations" icon={Globe} placeholder="East Africa, Europe, Global" {...form.register("supportedDestinations")} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 sm:gap-5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <Field
                      label="Standard delivery"
                      htmlFor="standardShippingFee"
                      hint={`Amount in ${currency || 'UGX'}.`}
                      trailing={<Truck size={13} className="text-slate-400" />}
                    >
                      <Input
                        id="standardShippingFee"
                        {...form.register("standardShippingFee")}
                        placeholder="10000"
                        className={cn(inputBase, "bg-white font-mono")}
                      />
                    </Field>
                  </div>

                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                    <Field
                      label="Express same-day"
                      htmlFor="vipShippingFee"
                      hint={`Amount in ${currency || 'UGX'}.`}
                      trailing={<Zap size={13} className="text-purple-500" />}
                    >
                      <Input
                        id="vipShippingFee"
                        {...form.register("vipShippingFee")}
                        placeholder="25000"
                        className={cn(inputBase, "bg-white font-mono")}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── 6. Custom pages ─────────────────────────────────────────────── */}
          {isVisible("pages") && (
            <SectionCard
              icon={FileText}
              tone="blue"
              title="Custom pages"
              description="Standalone pages such as About, Shipping policy or Warranty."
              action={
                <Button
                  type="button"
                  onClick={addCustomPage}
                  className="h-9 w-full rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 sm:w-auto"
                >
                  <Plus size={14} className="mr-1.5" /> Add page
                </Button>
              }
            >
              <div className="space-y-3">
                {customPages.map((page, idx) => (
                  <RepeaterItem
                    key={page.id}
                    label={`Page ${idx + 1}`}
                    onRemove={customPages.length > 1 ? () => removeCustomPage(page.id) : undefined}
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Page title">
                          <Input
                            value={page.title}
                            onChange={e => handleCustomPageChange(page.id, 'title', e.target.value)}
                            placeholder="Quality guarantee"
                            className={cn(inputBase, "bg-white")}
                          />
                        </Field>
                        <Field label="Page address">
                          <Input
                            value={page.slug}
                            onChange={e => handleCustomPageChange(page.id, 'slug', e.target.value)}
                            placeholder="quality-guarantee"
                            className={cn(inputBase, "bg-white font-mono")}
                          />
                        </Field>
                      </div>
                      <Field label="Page content">
                        <Textarea
                          value={page.content}
                          onChange={e => handleCustomPageChange(page.id, 'content', e.target.value)}
                          placeholder="Page text, policy details or company history."
                          className={cn(textareaBase, "min-h-[88px] bg-white")}
                        />
                      </Field>
                    </div>
                  </RepeaterItem>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── 7. FAQs ─────────────────────────────────────────────────────── */}
          {isVisible("faq") && (
            <SectionCard
              icon={HelpCircle}
              tone="amber"
              title="Frequently asked questions"
              description="Questions and answers shown on your public storefront."
              action={
                <Button
                  type="button"
                  onClick={addFaqItem}
                  className="h-9 w-full rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 sm:w-auto"
                >
                  <Plus size={14} className="mr-1.5" /> Add question
                </Button>
              }
            >
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <RepeaterItem
                    key={faq.id}
                    label={`Question ${idx + 1}`}
                    onRemove={faqs.length > 1 ? () => removeFaqItem(faq.id) : undefined}
                  >
                    <div className="space-y-4">
                      <Field label="Question">
                        <Input
                          value={faq.question}
                          onChange={e => handleFaqChange(faq.id, 'question', e.target.value)}
                          placeholder="What are your delivery terms?"
                          className={cn(inputBase, "bg-white")}
                        />
                      </Field>
                      <Field label="Answer">
                        <Textarea
                          value={faq.answer}
                          onChange={e => handleFaqChange(faq.id, 'answer', e.target.value)}
                          placeholder="Explain your policy or process clearly."
                          className={cn(textareaBase, "min-h-[76px] bg-white")}
                        />
                      </Field>
                    </div>
                  </RepeaterItem>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── 8. Media ────────────────────────────────────────────────────── */}
          {isVisible("media") && (
            <SectionCard
              icon={Video}
              tone="purple"
              title="Product media"
              description="Select listings and attach photos or video walkthroughs in bulk."
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-medium text-slate-700">
                      {selectedVariantIds.length} selected
                    </Label>
                    <button
                      type="button"
                      onClick={toggleSelectAllVariants}
                      className="text-xs font-medium text-slate-600 underline-offset-2 transition-colors hover:text-slate-900 hover:underline"
                    >
                      {productVariants && selectedVariantIds.length === productVariants.length ? 'Clear selection' : 'Select all'}
                    </button>
                  </div>

                  <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                    {productVariants && productVariants.length > 0 ? (
                      productVariants.map((pv: any) => {
                        const isSelected = selectedVariantIds.includes(String(pv.id));
                        return (
                          <button
                            key={pv.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => toggleVariantSelection(String(pv.id))}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-xs font-medium transition-colors",
                              isSelected
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-purple-300"
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {isSelected
                                ? <CheckSquare size={14} className="shrink-0" />
                                : <Square size={14} className="shrink-0 text-slate-400" />}
                              <span className="truncate">{pv.products?.name} — {pv.name}</span>
                            </span>
                            <span className={cn("shrink-0 font-mono text-[11px]", isSelected ? "text-purple-100" : "text-slate-400")}>
                              {pv.sku || 'No SKU'}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="py-8 text-center text-xs text-slate-400">
                        No products found for this business.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-700">Attach media</Label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleProductMediaUpload}
                    disabled={selectedVariantIds.length === 0 || isUploadingProductMedia}
                    className="hidden"
                    id="product-video-upload"
                  />
                  <UploadTarget
                    id="product-video-upload"
                    busy={isUploadingProductMedia}
                    icon={Camera}
                    tone="purple"
                    disabled={selectedVariantIds.length === 0}
                    label={
                      isUploadingProductMedia
                        ? "Attaching media…"
                        : selectedVariantIds.length === 0
                          ? "Select items above to enable upload"
                          : `Attach to ${selectedVariantIds.length} selected item(s)`
                    }
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── 9. SEO ──────────────────────────────────────────────────────── */}
          {isVisible("seo") && (
            <SectionCard
              icon={Search}
              tone="amber"
              title="Search and sharing"
              description="How your storefront appears in search results and shared links."
            >
              <div className="space-y-5">
                <Field
                  label="Page title"
                  htmlFor="seoTitle"
                  error={err("seoTitle")}
                  trailing={
                    <span className={cn(
                      "font-mono text-xs tabular-nums",
                      (form.watch("seoTitle")?.length || 0) > 70 ? "text-amber-600" : "text-slate-400"
                    )}>
                      {form.watch("seoTitle")?.length || 0}/80
                    </span>
                  }
                >
                  <Input id="seoTitle" {...form.register("seoTitle")} className={inputBase} />
                </Field>

                <Field
                  label="Page description"
                  htmlFor="seoDesc"
                  error={err("seoDesc")}
                  trailing={
                    <span className={cn(
                      "font-mono text-xs tabular-nums",
                      (form.watch("seoDesc")?.length || 0) > 160 ? "text-amber-600" : "text-slate-400"
                    )}>
                      {form.watch("seoDesc")?.length || 0}/200
                    </span>
                  }
                >
                  <Textarea
                    id="seoDesc"
                    {...form.register("seoDesc")}
                    className={cn(textareaBase, "min-h-[96px]")}
                  />
                </Field>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      {/* sticky, not fixed: it stays in flow, so it can never sit on top of content */}
      <div className="sticky bottom-0 z-30 mt-4 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col gap-2 px-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="hidden text-xs text-slate-500 sm:block">
            Changes go live on your storefront as soon as you save.
          </p>
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 w-full rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><ShieldCheck className="mr-2 h-4 w-4" /> Save changes</>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}