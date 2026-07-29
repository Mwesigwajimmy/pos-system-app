'use client';

import React, { useState, useMemo, useTransition } from "react";
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
  Megaphone, CreditCard, Scale, SlidersHorizontal, Package,
  ChevronDown, ChevronRight, X, Facebook, Instagram, Twitter,
  Youtube, Linkedin, BarChart3, Power,
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

  // Added: storefront presence
  announcementEnabled: z.boolean().optional(),
  announcementText: z.string().optional(),
  shareImageUrl: z.string().optional(),
  businessHours: z.string().optional(),
  storeOnline: z.boolean().optional(),
  storeClosedMessage: z.string().optional(),

  // Added: social profiles
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),

  // Added: checkout and delivery rules
  payMobileMoney: z.boolean().optional(),
  payAirtelMoney: z.boolean().optional(),
  payCashOnDelivery: z.boolean().optional(),
  payBankTransfer: z.boolean().optional(),
  payCard: z.boolean().optional(),
  minimumOrderValue: z.string().optional(),
  freeDeliveryThreshold: z.string().optional(),
  deliveryEstimate: z.string().optional(),
  orderConfirmationMessage: z.string().optional(),

  // Added: policies
  returnPolicy: z.string().optional(),
  termsConditions: z.string().optional(),
  privacyPolicy: z.string().optional(),

  // Added: advanced
  pricesIncludeTax: z.boolean().optional(),
  googleAnalyticsId: z.string().optional(),
  metaPixelId: z.string().optional(),
});

/* ═══════════════════════════════════════════════════════════════════════════
   Presentation primitives
   One type scale, one spacing rhythm, no absolute overlays over text.
   ═══════════════════════════════════════════════════════════════════════════ */

const SECTION_TONE: Record<string, string> = {
  blue:    "bg-blue-50 text-blue-600 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  purple:  "bg-purple-50 text-purple-600 ring-purple-100",
  amber:   "bg-amber-50 text-amber-600 ring-amber-100",
  slate:   "bg-slate-100 text-slate-600 ring-slate-200",
};

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
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0 sm:ml-4">{action}</div> : null}
      </header>
      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

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

/** Switch-style row for a boolean setting. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
    >
      <span className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
            <Icon size={14} />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-xs font-medium text-slate-900">{label}</span>
          {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
        </span>
      </span>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-slate-900" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

/** Compact multi-select chip. */
function CheckChip({
  label,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
        checked
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      )}
    >
      {checked
        ? <CheckCircle2 size={14} className="shrink-0" />
        : Icon
          ? <Icon size={14} className="shrink-0 text-slate-400" />
          : <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current opacity-40" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Selectable option tile. Colour classes arrive as complete strings so
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
        selected ? cn(surface, borderActive) : cn("bg-white", borderIdle, hoverBorder)
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

function MediaFrame({
  children,
  badge,
  onRemove,
  height = "h-36",
}: {
  children: React.ReactNode;
  badge?: React.ReactNode;
  onRemove: () => void;
  height?: string;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900", height)}>
      {children}
      {badge && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          {badge}
        </div>
      )}
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

function UploadTarget({
  id,
  busy,
  icon: Icon,
  label,
  disabled,
  tone = "slate",
  compact,
}: {
  id: string;
  busy: boolean;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  tone?: "slate" | "purple";
  compact?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-xs font-medium transition-colors",
        compact ? "h-10" : "h-11",
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

/* ── Section registry driving the tab navigation ──────────────────────────── */
const SECTIONS = [
  { id: "brand",     label: "Branding",   icon: Palette },
  { id: "contact",   label: "Contact",    icon: MessageSquare },
  { id: "theme",     label: "Appearance", icon: Sun },
  { id: "template",  label: "Template",   icon: Layers },
  { id: "catalog",   label: "Products",   icon: Package },
  { id: "logistics", label: "Delivery",   icon: Truck },
  { id: "payments",  label: "Payments",   icon: CreditCard },
  { id: "pages",     label: "Pages",      icon: FileText },
  { id: "faq",       label: "FAQs",       icon: HelpCircle },
  { id: "policies",  label: "Policies",   icon: Scale },
  { id: "seo",       label: "SEO",        icon: Search },
  { id: "advanced",  label: "Advanced",   icon: SlidersHorizontal },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ═══════════════════════════════════════════════════════════════════════════ */

export function StorefrontSettings({ initialData }: { initialData?: any }) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingShare, setIsUploadingShare] = useState(false);
  const [isUploadingProductMedia, setIsUploadingProductMedia] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  // Product manager UI state
  const [productSearch, setProductSearch] = useState("");
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState<{ onlineDescription: string; videoDescription: string }>({
    onlineDescription: "",
    videoDescription: "",
  });

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
      if (data?.metadata?.hotel_amenities) setHotelAmenities(prev => ({ ...prev, ...data.metadata.hotel_amenities }));
      return data;
    },
  });

  const { data: productVariants } = useQuery({
    queryKey: ['variants_for_media_attach', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, name, sku, primary_media_url, video_url, online_description, attributes, is_published_online, online_price, price, products(name)')
        .eq('business_id', activeBusinessId)
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  // Gallery for the variant currently expanded in the product manager.
  const { data: variantGallery } = useQuery({
    queryKey: ['variant_gallery', expandedVariantId],
    enabled: !!expandedVariantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_files')
        .select('id, file_url, file_type, uploaded_at')
        .eq('variant_id', expandedVariantId)
        .order('uploaded_at', { ascending: true });
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
      workingHours: savedConfig?.metadata?.working_hours || 'Mon - Sat: 8:00 AM - 6:00 PM',

      heroCtaText: savedConfig?.metadata?.hero_cta_text || 'Explore Catalog',
      heroCtaLink: savedConfig?.metadata?.hero_cta_link || '#catalog',
      aboutUsTitle: savedConfig?.metadata?.about_us_title || 'About Our Business',
      aboutUsBody: savedConfig?.metadata?.about_us_body || 'We offer top-tier quality products, verified property listings, and professional services.',
      testimonialQuote: savedConfig?.metadata?.testimonial_quote || '',
      testimonialAuthor: savedConfig?.metadata?.testimonial_author || '',

      // Added - storefront presence
      announcementEnabled: savedConfig?.metadata?.announcement_enabled ?? false,
      announcementText: savedConfig?.metadata?.announcement_text || '',
      shareImageUrl: savedConfig?.metadata?.share_image_url || '',
      businessHours: savedConfig?.metadata?.business_hours || 'Mon - Sat: 8:00 AM - 6:00 PM',
      storeOnline: savedConfig?.metadata?.store_online ?? true,
      storeClosedMessage: savedConfig?.metadata?.store_closed_message || 'We are currently closed. Orders will resume shortly.',

      // Added - social
      facebookUrl: savedConfig?.metadata?.facebook_url || '',
      instagramUrl: savedConfig?.metadata?.instagram_url || '',
      twitterUrl: savedConfig?.metadata?.twitter_url || '',
      tiktokUrl: savedConfig?.metadata?.tiktok_url || '',
      youtubeUrl: savedConfig?.metadata?.youtube_url || '',
      linkedinUrl: savedConfig?.metadata?.linkedin_url || '',

      // Added - checkout & delivery
      payMobileMoney: savedConfig?.metadata?.pay_mobile_money ?? true,
      payAirtelMoney: savedConfig?.metadata?.pay_airtel_money ?? true,
      payCashOnDelivery: savedConfig?.metadata?.pay_cash_on_delivery ?? true,
      payBankTransfer: savedConfig?.metadata?.pay_bank_transfer ?? false,
      payCard: savedConfig?.metadata?.pay_card ?? false,
      minimumOrderValue: savedConfig?.metadata?.minimum_order_value || '0',
      freeDeliveryThreshold: savedConfig?.metadata?.free_delivery_threshold || '0',
      deliveryEstimate: savedConfig?.metadata?.delivery_estimate || '1 - 3 business days',
      orderConfirmationMessage: savedConfig?.metadata?.order_confirmation_message || 'Thank you for your order. We will contact you on WhatsApp to confirm delivery.',

      // Added - policies
      returnPolicy: savedConfig?.metadata?.return_policy || '',
      termsConditions: savedConfig?.metadata?.terms_conditions || '',
      privacyPolicy: savedConfig?.metadata?.privacy_policy || '',

      // Added - advanced
      pricesIncludeTax: savedConfig?.metadata?.prices_include_tax ?? true,
      googleAnalyticsId: savedConfig?.metadata?.google_analytics_id || '',
      metaPixelId: savedConfig?.metadata?.meta_pixel_id || '',
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
  const shareImageUrl = form.watch("shareImageUrl");
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

  const handleStoreAssetUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'bannerUrl' | 'logoUrl' | 'shareImageUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeBusinessId) return;

    if (targetField === 'bannerUrl') setIsUploadingBanner(true);
    else if (targetField === 'logoUrl') setIsUploadingLogo(true);
    else setIsUploadingShare(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${activeBusinessId}/storefront_${targetField}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('inventory-assets').upload(filePath, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('inventory-assets').getPublicUrl(filePath);
      form.setValue(targetField as any, publicUrl);
      toast.success(
        `${targetField === 'bannerUrl' ? 'Hero banner' : targetField === 'logoUrl' ? 'Logo' : 'Share image'} uploaded successfully.`
      );
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingBanner(false);
      setIsUploadingLogo(false);
      setIsUploadingShare(false);
      e.target.value = '';
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
      e.target.value = '';
    }
  };

  /** Upload several images at once into one product's gallery (item_files). */
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>, variant: any) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeBusinessId) return;

    setIsUploadingGallery(true);
    try {
      const rows: any[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${activeBusinessId}/gallery_${variant.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage.from('inventory-assets').upload(filePath, file);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('inventory-assets').getPublicUrl(filePath);
        rows.push({
          business_id: activeBusinessId,
          variant_id: variant.id,
          product_id: variant.product_id ?? null,
          file_url: publicUrl,
          file_type: file.type.startsWith('video/') ? 'video' : 'image',
        });
      }

      const { error: insErr } = await supabase.from('item_files').insert(rows);
      if (insErr) throw insErr;

      toast.success(`${rows.length} file(s) added to the gallery.`);
      queryClient.invalidateQueries({ queryKey: ['variant_gallery', String(variant.id)] });
    } catch (err: any) {
      toast.error(`Gallery upload failed: ${err.message}`);
    } finally {
      setIsUploadingGallery(false);
      e.target.value = '';
    }
  };

  const removeGalleryFile = async (fileId: string, variantId: string) => {
    try {
      const { error } = await supabase.from('item_files').delete().eq('id', fileId);
      if (error) throw error;
      toast.success("Image removed from gallery.");
      queryClient.invalidateQueries({ queryKey: ['variant_gallery', variantId] });
    } catch (err: any) {
      toast.error(`Could not remove image: ${err.message}`);
    }
  };

  const setGalleryAsPrimary = async (url: string, variantId: string) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ primary_media_url: url, updated_at: new Date().toISOString() })
        .eq('id', variantId);
      if (error) throw error;
      toast.success("Main image updated.");
      queryClient.invalidateQueries({ queryKey: ['variants_for_media_attach'] });
    } catch (err: any) {
      toast.error(`Could not set main image: ${err.message}`);
    }
  };

  const clearVariantVideo = async (variantId: string) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ video_url: null, updated_at: new Date().toISOString() })
        .eq('id', variantId);
      if (error) throw error;
      toast.success("Video removed.");
      queryClient.invalidateQueries({ queryKey: ['variants_for_media_attach'] });
    } catch (err: any) {
      toast.error(`Could not remove video: ${err.message}`);
    }
  };

  /** Persist the storefront description and video caption for one variant. */
  const saveVariantDetails = async (variant: any) => {
    setIsSavingVariant(true);
    try {
      const nextAttributes = {
        ...(variant.attributes || {}),
        video_description: variantDraft.videoDescription,
      };
      const { error } = await supabase
        .from('product_variants')
        .update({
          online_description: variantDraft.onlineDescription,
          attributes: nextAttributes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variant.id);
      if (error) throw error;
      toast.success("Product details saved.");
      queryClient.invalidateQueries({ queryKey: ['variants_for_media_attach'] });
    } catch (err: any) {
      toast.error(`Could not save product details: ${err.message}`);
    } finally {
      setIsSavingVariant(false);
    }
  };

  const openVariantEditor = (pv: any) => {
    const id = String(pv.id);
    if (expandedVariantId === id) {
      setExpandedVariantId(null);
      return;
    }
    setExpandedVariantId(id);
    setVariantDraft({
      onlineDescription: pv.online_description || '',
      videoDescription: pv.attributes?.video_description || '',
    });
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
              support_email: data.supportEmail,
              support_phone: data.supportPhone,
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

                // Added - storefront presence
                announcement_enabled: data.announcementEnabled,
                announcement_text: data.announcementText,
                share_image_url: data.shareImageUrl,
                business_hours: data.businessHours,
                store_online: data.storeOnline,
                store_closed_message: data.storeClosedMessage,

                // Added - social
                facebook_url: data.facebookUrl,
                instagram_url: data.instagramUrl,
                twitter_url: data.twitterUrl,
                tiktok_url: data.tiktokUrl,
                youtube_url: data.youtubeUrl,
                linkedin_url: data.linkedinUrl,

                // Added - checkout & delivery
                pay_mobile_money: data.payMobileMoney,
                pay_airtel_money: data.payAirtelMoney,
                pay_cash_on_delivery: data.payCashOnDelivery,
                pay_bank_transfer: data.payBankTransfer,
                pay_card: data.payCard,
                minimum_order_value: data.minimumOrderValue,
                free_delivery_threshold: data.freeDeliveryThreshold,
                delivery_estimate: data.deliveryEstimate,
                order_confirmation_message: data.orderConfirmationMessage,

                // Added - policies
                return_policy: data.returnPolicy,
                terms_conditions: data.termsConditions,
                privacy_policy: data.privacyPolicy,

                // Added - advanced
                prices_include_tax: data.pricesIncludeTax,
                google_analytics_id: data.googleAnalyticsId,
                meta_pixel_id: data.metaPixelId,
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
  const bool = (name: string) => !!form.watch(name);
  const setBool = (name: string, v: boolean) => form.setValue(name as any, v, { shouldDirty: true });

  const inputBase = "h-10 rounded-lg border-slate-200 text-sm";
  const textareaBase = "rounded-lg border-slate-200 text-sm resize-none";

  const isVisible = (id: SectionId) => activeSection === id;

  const filteredVariants = useMemo(() => {
    if (!productVariants) return [];
    const q = productSearch.trim().toLowerCase();
    if (!q) return productVariants;
    return productVariants.filter((pv: any) =>
      `${pv.products?.name ?? ''} ${pv.name ?? ''} ${pv.sku ?? ''}`.toLowerCase().includes(q)
    );
  }, [productVariants, productSearch]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
      {/* ── Store header ────────────────────────────────────────────────────── */}
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
                <Badge
                  className={cn(
                    "border-0 px-2 py-0.5 text-[11px] font-medium",
                    bool("storeOnline") ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {bool("storeOnline") ? "Open" : "Closed"}
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

      {/* ── Section tabs — horizontal at every width ─────────────────────────── */}
      <nav
        aria-label="Settings sections"
        className="sticky top-0 z-20 -mx-1 mt-4 overflow-x-auto bg-slate-50/95 px-1 py-2 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-3 space-y-4">

        {/* ── 1. Branding ──────────────────────────────────────────────────── */}
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

                <div className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-700">Hero banner</Label>
                    {bannerUrl && (
                      <MediaFrame
                        onRemove={() => form.setValue("bannerUrl", "")}
                        badge={
                          <Badge className="pointer-events-none border-0 bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                            {isVideoUrl(bannerUrl)
                              ? <><Film size={11} className="mr-1" /> Video</>
                              : <><ImageIcon size={11} className="mr-1" /> Image</>}
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
                      label={bannerUrl ? "Replace banner" : "Upload banner"}
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

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-700">Share image</Label>
                    {shareImageUrl && (
                      <div className="group relative h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        <img src={shareImageUrl} alt="Share image preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => form.setValue("shareImageUrl", "")}
                          aria-label="Remove share image"
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/70 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleStoreAssetUpload(e, 'shareImageUrl')}
                      className="hidden"
                      id="store-share-upload"
                    />
                    <UploadTarget
                      id="store-share-upload"
                      busy={isUploadingShare}
                      icon={ImagePlus}
                      label={shareImageUrl ? "Replace share image" : "Upload share image"}
                    />
                    <p className="text-xs text-slate-400">Used when your link is shared on WhatsApp or social media.</p>
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
                  <Field label="Featured quote" htmlFor="testimonialQuote" hint="Use a real customer's words only.">
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

        {/* ── 2. Contact ───────────────────────────────────────────────────── */}
        {isVisible("contact") && (
          <>
            <SectionCard
              icon={MessageSquare}
              tone="emerald"
              title="Contact and order alerts"
              description="Where order and inspection notifications reach you."
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  <Field label="WhatsApp number" htmlFor="whatsappNumber" required hint="Order alerts are sent here.">
                    <IconInput id="whatsappNumber" icon={Phone} iconClass="text-emerald-500" placeholder="+256700000000" {...form.register("whatsappNumber")} />
                  </Field>
                  <Field label="Support email" htmlFor="supportEmail">
                    <IconInput id="supportEmail" icon={Mail} type="email" placeholder="orders@mybusiness.com" {...form.register("supportEmail")} />
                  </Field>
                  <Field label="Support phone" htmlFor="supportPhone">
                    <IconInput id="supportPhone" icon={Phone} placeholder="+256..." {...form.register("supportPhone")} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 sm:gap-5">
                  <Field label="Business address" htmlFor="businessLocationContact">
                    <IconInput id="businessLocationContact" icon={MapPin} placeholder="Plot 12 Kampala Road, Uganda" {...form.register("businessLocation")} />
                  </Field>
                  <Field label="Opening hours" htmlFor="businessHours" hint="Shown on your storefront contact section.">
                    <IconInput id="businessHours" icon={Clock} placeholder="Mon - Sat, 8:00 - 18:00" {...form.register("businessHours")} />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={Instagram}
              tone="purple"
              title="Social profiles"
              description="Links shown in your storefront footer. Leave blank to hide."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                <Field label="Facebook" htmlFor="facebookUrl">
                  <IconInput id="facebookUrl" icon={Facebook} placeholder="https://facebook.com/yourpage" {...form.register("facebookUrl")} />
                </Field>
                <Field label="Instagram" htmlFor="instagramUrl">
                  <IconInput id="instagramUrl" icon={Instagram} placeholder="https://instagram.com/yourhandle" {...form.register("instagramUrl")} />
                </Field>
                <Field label="X / Twitter" htmlFor="twitterUrl">
                  <IconInput id="twitterUrl" icon={Twitter} placeholder="https://x.com/yourhandle" {...form.register("twitterUrl")} />
                </Field>
                <Field label="TikTok" htmlFor="tiktokUrl">
                  <IconInput id="tiktokUrl" icon={Video} placeholder="https://tiktok.com/@yourhandle" {...form.register("tiktokUrl")} />
                </Field>
                <Field label="YouTube" htmlFor="youtubeUrl">
                  <IconInput id="youtubeUrl" icon={Youtube} placeholder="https://youtube.com/@yourchannel" {...form.register("youtubeUrl")} />
                </Field>
                <Field label="LinkedIn" htmlFor="linkedinUrl">
                  <IconInput id="linkedinUrl" icon={Linkedin} placeholder="https://linkedin.com/company/yourcompany" {...form.register("linkedinUrl")} />
                </Field>
              </div>
            </SectionCard>
          </>
        )}

        {/* ── 3. Appearance ────────────────────────────────────────────────── */}
        {isVisible("theme") && (
          <>
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
                  hoverBorder="hover:border-slate-400"
                  checkClass="text-slate-900"
                  title="Corporate"
                  description="Navy and steel grey with a structured formal layout."
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={Megaphone}
              tone="amber"
              title="Announcement bar"
              description="A single line pinned to the top of your storefront."
            >
              <div className="space-y-4">
                <ToggleRow
                  icon={Megaphone}
                  label="Show announcement bar"
                  description="Useful for promotions, holiday hours or delivery notices."
                  checked={bool("announcementEnabled")}
                  onChange={v => setBool("announcementEnabled", v)}
                />
                <Field label="Announcement text" htmlFor="announcementText">
                  <Input
                    id="announcementText"
                    {...form.register("announcementText")}
                    placeholder="Free delivery within Kampala this week."
                    className={inputBase}
                    disabled={!bool("announcementEnabled")}
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        )}

        {/* ── 4. Template ──────────────────────────────────────────────────── */}
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
              <SectionCard icon={Home} tone="emerald" title="Real estate settings" description="Applies to the property directory template.">
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
              <SectionCard icon={Hotel} tone="purple" title="Hotel settings" description="Applies to the hotel and guest house template.">
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
                        <CheckChip
                          key={key}
                          label={label}
                          checked={!!hotelAmenities[key]}
                          onChange={() => setHotelAmenities(prev => ({ ...prev, [key]: !prev[key] }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {selectedTemplate === 'SERVICES_BOOKING' && (
              <SectionCard icon={Briefcase} tone="amber" title="Services settings" description="Applies to the services and appointments template.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                  <Field label={`Consultation fee (${currency || 'UGX'})`} htmlFor="consultationFee">
                    <IconInput id="consultationFee" icon={DollarSign} placeholder="100000" {...form.register("consultationFee")} />
                  </Field>
                  <Field label="Session duration" htmlFor="defaultDuration">
                    <IconInput id="defaultDuration" icon={CalendarClock} placeholder="60 minutes" {...form.register("defaultDuration")} />
                  </Field>
                  <Field label="Working hours" htmlFor="workingHours">
                    <IconInput id="workingHours" icon={Clock} placeholder="Mon - Sat, 8:00 - 18:00" {...form.register("workingHours")} />
                  </Field>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ── 5. Products ──────────────────────────────────────────────────── */}
        {isVisible("catalog") && (
          <SectionCard
            icon={Package}
            tone="purple"
            title="Product media and descriptions"
            description="Search a product, open it to manage its gallery, video and storefront description."
          >
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search by product, variant or SKU"
                    className="h-10 rounded-lg border-slate-200 pl-9 pr-9 text-sm"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-slate-500">
                    {filteredVariants.length} shown / {selectedVariantIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAllVariants}
                    className="shrink-0 text-xs font-medium text-slate-600 underline-offset-2 transition-colors hover:text-slate-900 hover:underline"
                  >
                    {productVariants && selectedVariantIds.length === productVariants.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
              </div>

              <div className="max-h-[520px] space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                {filteredVariants.length > 0 ? (
                  filteredVariants.map((pv: any) => {
                    const id = String(pv.id);
                    const isSelected = selectedVariantIds.includes(id);
                    const isOpen = expandedVariantId === id;
                    return (
                      <div
                        key={pv.id}
                        className={cn(
                          "overflow-hidden rounded-lg border bg-white transition-colors",
                          isOpen ? "border-purple-300" : "border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-2 px-2 py-2">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`Select ${pv.products?.name} ${pv.name}`}
                            onClick={() => toggleVariantSelection(id)}
                            className={cn(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                              isSelected ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-slate-100"
                            )}
                          >
                            {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => openVariantEditor(pv)}
                            aria-expanded={isOpen}
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
                          >
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                              {pv.primary_media_url ? (
                                <img src={pv.primary_media_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon size={14} className="text-slate-300" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-slate-900">
                                {pv.products?.name} - {pv.name}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                <span className="font-mono">{pv.sku || 'No SKU'}</span>
                                {pv.video_url && <span className="text-purple-500">Video</span>}
                                {pv.is_published_online && <span className="text-emerald-600">Published</span>}
                              </span>
                            </span>
                            {isOpen
                              ? <ChevronDown size={15} className="shrink-0 text-slate-400" />
                              : <ChevronRight size={15} className="shrink-0 text-slate-400" />}
                          </button>
                        </div>

                        {isOpen && (
                          <div className="space-y-5 border-t border-slate-100 bg-slate-50/60 px-3 py-4 sm:px-4">
                            {/* Gallery — many images on one product */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <Label className="text-xs font-medium text-slate-700">Image gallery</Label>
                                <span className="text-[11px] text-slate-400">{(variantGallery?.length ?? 0)} file(s)</span>
                              </div>

                              {variantGallery && variantGallery.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                                  {variantGallery.map((f: any) => (
                                    <div key={f.id} className="group relative h-24 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                      {f.file_type === 'video' ? (
                                        <video src={f.file_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                                      ) : (
                                        <img src={f.file_url} alt="" className="h-full w-full object-cover" />
                                      )}
                                      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-slate-900/70 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() => setGalleryAsPrimary(f.file_url, id)}
                                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-white/20"
                                        >
                                          Set main
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeGalleryFile(f.id, id)}
                                          aria-label="Remove image"
                                          className="rounded px-1 py-0.5 text-white hover:bg-rose-600"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={e => handleGalleryUpload(e, pv)}
                                className="hidden"
                                id={`gallery-upload-${id}`}
                              />
                              <UploadTarget
                                id={`gallery-upload-${id}`}
                                busy={isUploadingGallery}
                                icon={ImagePlus}
                                tone="purple"
                                compact
                                label="Add images - you can pick several at once"
                              />
                            </div>

                            {/* Video + caption */}
                            <div className="space-y-2 border-t border-slate-200 pt-4">
                              <Label className="text-xs font-medium text-slate-700">Product video</Label>
                              {pv.video_url ? (
                                <MediaFrame
                                  height="h-40"
                                  onRemove={() => clearVariantVideo(id)}
                                  badge={
                                    <Badge className="pointer-events-none border-0 bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                                      <Film size={11} className="mr-1" /> Video
                                    </Badge>
                                  }
                                >
                                  <video src={pv.video_url} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                                </MediaFrame>
                              ) : (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                                  No video yet. Tick this product above, then use bulk attach to upload one.
                                </p>
                              )}

                              <Field label="Video description" htmlFor={`videoDesc-${id}`} hint="Shown beneath the video on the storefront.">
                                <Textarea
                                  id={`videoDesc-${id}`}
                                  value={variantDraft.videoDescription}
                                  onChange={e => setVariantDraft(d => ({ ...d, videoDescription: e.target.value }))}
                                  placeholder="What the video shows - a walkthrough, a demo, a close-up of the finish."
                                  className={cn(textareaBase, "min-h-[72px] bg-white")}
                                />
                              </Field>
                            </div>

                            {/* Product description */}
                            <div className="space-y-2 border-t border-slate-200 pt-4">
                              <Field
                                label="Product description"
                                htmlFor={`onlineDesc-${id}`}
                                hint="Shown on the public storefront in place of the internal name."
                              >
                                <Textarea
                                  id={`onlineDesc-${id}`}
                                  value={variantDraft.onlineDescription}
                                  onChange={e => setVariantDraft(d => ({ ...d, onlineDescription: e.target.value }))}
                                  placeholder="Materials, sizing, what is included, care instructions."
                                  className={cn(textareaBase, "min-h-[112px] bg-white")}
                                />
                              </Field>

                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setExpandedVariantId(null)}
                                  className="h-9 rounded-lg border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-white"
                                >
                                  Close
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => saveVariantDetails(pv)}
                                  disabled={isSavingVariant}
                                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
                                >
                                  {isSavingVariant
                                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                                    : "Save product details"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="py-10 text-center text-xs text-slate-400">
                    {productSearch ? "No products match your search." : "No products found for this business."}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-5">
                <Label className="text-xs font-medium text-slate-700">Bulk attach to selected products</Label>
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
                      ? "Attaching media..."
                      : selectedVariantIds.length === 0
                        ? "Select products above to enable bulk upload"
                        : `Attach one image or video to ${selectedVariantIds.length} product(s)`
                  }
                />
                <p className="text-xs text-slate-400">An image becomes the main picture, a video becomes the product video.</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── 6. Delivery ──────────────────────────────────────────────────── */}
        {isVisible("logistics") && (
          <SectionCard
            icon={Truck}
            tone="emerald"
            title="Delivery"
            description="Regions you serve, your rates and the delivery promise shown at checkout."
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
                    <Input id="standardShippingFee" {...form.register("standardShippingFee")} placeholder="10000" className={cn(inputBase, "bg-white font-mono")} />
                  </Field>
                </div>

                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                  <Field
                    label="Express same-day"
                    htmlFor="vipShippingFee"
                    hint={`Amount in ${currency || 'UGX'}.`}
                    trailing={<Zap size={13} className="text-purple-500" />}
                  >
                    <Input id="vipShippingFee" {...form.register("vipShippingFee")} placeholder="25000" className={cn(inputBase, "bg-white font-mono")} />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3 sm:gap-5">
                <Field label="Minimum order" htmlFor="minimumOrderValue" hint="0 means no minimum.">
                  <IconInput id="minimumOrderValue" icon={DollarSign} placeholder="0" className="font-mono" {...form.register("minimumOrderValue")} />
                </Field>
                <Field label="Free delivery above" htmlFor="freeDeliveryThreshold" hint="0 disables free delivery.">
                  <IconInput id="freeDeliveryThreshold" icon={Truck} placeholder="0" className="font-mono" {...form.register("freeDeliveryThreshold")} />
                </Field>
                <Field label="Delivery estimate" htmlFor="deliveryEstimate" hint="Shown at checkout.">
                  <IconInput id="deliveryEstimate" icon={CalendarClock} placeholder="1 - 3 business days" {...form.register("deliveryEstimate")} />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── 7. Payments ──────────────────────────────────────────────────── */}
        {isVisible("payments") && (
          <SectionCard
            icon={CreditCard}
            tone="emerald"
            title="Payment methods"
            description="What customers can choose at checkout, and what they see afterwards."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Accepted at checkout</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <CheckChip label="MTN Mobile Money" icon={Phone} checked={bool("payMobileMoney")} onChange={v => setBool("payMobileMoney", v)} />
                  <CheckChip label="Airtel Money" icon={Phone} checked={bool("payAirtelMoney")} onChange={v => setBool("payAirtelMoney", v)} />
                  <CheckChip label="Cash on delivery" icon={DollarSign} checked={bool("payCashOnDelivery")} onChange={v => setBool("payCashOnDelivery", v)} />
                  <CheckChip label="Bank transfer" icon={Building2} checked={bool("payBankTransfer")} onChange={v => setBool("payBankTransfer", v)} />
                  <CheckChip label="Card" icon={CreditCard} checked={bool("payCard")} onChange={v => setBool("payCard", v)} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <Field
                  label="Order confirmation message"
                  htmlFor="orderConfirmationMessage"
                  hint="Shown on screen and sent with the order confirmation."
                >
                  <Textarea
                    id="orderConfirmationMessage"
                    {...form.register("orderConfirmationMessage")}
                    placeholder="Thank you for your order. We will contact you on WhatsApp to confirm delivery."
                    className={cn(textareaBase, "min-h-[88px]")}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── 8. Pages ─────────────────────────────────────────────────────── */}
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

        {/* ── 9. FAQs ──────────────────────────────────────────────────────── */}
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

        {/* ── 10. Policies ─────────────────────────────────────────────────── */}
        {isVisible("policies") && (
          <SectionCard
            icon={Scale}
            tone="slate"
            title="Store policies"
            description="Linked in your storefront footer and shown at checkout."
          >
            <div className="space-y-5">
              <Field label="Returns and refunds" htmlFor="returnPolicy" hint="How long customers have, and what condition goods must be in.">
                <Textarea
                  id="returnPolicy"
                  {...form.register("returnPolicy")}
                  placeholder="Returns accepted within 7 days, unused and in original packaging."
                  className={cn(textareaBase, "min-h-[112px]")}
                />
              </Field>

              <Field label="Terms and conditions" htmlFor="termsConditions">
                <Textarea
                  id="termsConditions"
                  {...form.register("termsConditions")}
                  placeholder="The terms customers agree to when ordering from your store."
                  className={cn(textareaBase, "min-h-[112px]")}
                />
              </Field>

              <Field label="Privacy statement" htmlFor="privacyPolicy" hint="What customer data you collect and how it is used.">
                <Textarea
                  id="privacyPolicy"
                  {...form.register("privacyPolicy")}
                  placeholder="We collect your name, phone number and delivery address only to fulfil your order."
                  className={cn(textareaBase, "min-h-[112px]")}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── 11. SEO ──────────────────────────────────────────────────────── */}
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
                <Textarea id="seoDesc" {...form.register("seoDesc")} className={cn(textareaBase, "min-h-[96px]")} />
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <p className="mb-2 text-xs font-medium text-slate-500">Search result preview</p>
                <div className="rounded-md bg-white p-3">
                  <p className="truncate font-mono text-[11px] text-emerald-700">{publicStoreUrl}</p>
                  <p className="mt-1 truncate text-sm font-medium text-blue-700">
                    {form.watch("seoTitle") || "Your page title"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {form.watch("seoDesc") || "Your page description appears here."}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── 12. Advanced ─────────────────────────────────────────────────── */}
        {isVisible("advanced") && (
          <>
            <SectionCard
              icon={Power}
              tone="slate"
              title="Store availability"
              description="Temporarily stop taking orders without removing your storefront."
            >
              <div className="space-y-4">
                <ToggleRow
                  icon={Power}
                  label="Store is open"
                  description="Turn off to show a closed notice instead of the checkout button."
                  checked={bool("storeOnline")}
                  onChange={v => setBool("storeOnline", v)}
                />
                <Field label="Closed notice" htmlFor="storeClosedMessage">
                  <Textarea
                    id="storeClosedMessage"
                    {...form.register("storeClosedMessage")}
                    placeholder="We are currently closed. Orders will resume shortly."
                    className={cn(textareaBase, "min-h-[76px]")}
                    disabled={bool("storeOnline")}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={Scale}
              tone="slate"
              title="Pricing display"
              description="How prices are presented to customers."
            >
              <ToggleRow
                icon={Percent}
                label="Prices include tax"
                description="When on, the listed price is what the customer pays."
                checked={bool("pricesIncludeTax")}
                onChange={v => setBool("pricesIncludeTax", v)}
              />
            </SectionCard>

            <SectionCard
              icon={BarChart3}
              tone="slate"
              title="Analytics"
              description="Optional tracking for your storefront traffic."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <Field label="Google Analytics ID" htmlFor="googleAnalyticsId" hint="Example: G-XXXXXXXXXX">
                  <IconInput id="googleAnalyticsId" icon={BarChart3} placeholder="G-XXXXXXXXXX" className="font-mono" {...form.register("googleAnalyticsId")} />
                </Field>
                <Field label="Meta Pixel ID" htmlFor="metaPixelId" hint="Numeric ID from Meta Events Manager.">
                  <IconInput id="metaPixelId" icon={Facebook} placeholder="123456789012345" className="font-mono" {...form.register("metaPixelId")} />
                </Field>
              </div>
            </SectionCard>
          </>
        )}
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      {/* sticky and in flow, so it never sits on top of content.
          Right padding keeps the button clear of the floating sync / AI widgets. */}
      <div className="sticky bottom-0 z-30 mt-4 border-t border-slate-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pr-44 lg:pr-64">
          <p className="hidden text-xs text-slate-500 sm:block">
            Changes go live on your storefront as soon as you save.
          </p>
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 w-full rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><ShieldCheck className="mr-2 h-4 w-4" /> Save changes</>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}