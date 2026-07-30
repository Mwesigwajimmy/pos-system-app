'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

import {
  ShoppingBag, Search, Loader2,
  Store, MessageSquare, MapPin, Phone, Mail,
  Plus, Minus, Trash2, Home, Hotel, Briefcase,
  ArrowRight, Star, X, Truck, Zap, Film, ShieldCheck,
  Wifi, Utensils, Car, Tv, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const supabase = createClient();

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

interface CartItem {
  variant_id: number;
  product_name: string;
  price: number;
  quantity: number;
  media_url?: string | null;
  stock_quantity?: number;
}

type ThemeTokens = {
  isDark: boolean;
  page: string;
  header: string;
  surface: string;
  subtle: string;
  hairline: string;
  muted: string;
  accent: string;
  accentText: string;
  logo: string;
  outline: string;
  field: string;
  dialog: string;
};

const THEMES: Record<string, ThemeTokens> = {
  MODERN_MINIMALIST: {
    isDark: false,
    page: 'bg-slate-50 text-slate-900',
    header: 'bg-white/95 border-slate-200 text-slate-900',
    surface: 'bg-white border-slate-200',
    subtle: 'bg-slate-50',
    hairline: 'border-slate-200',
    muted: 'text-slate-500',
    accent: 'bg-slate-900 text-white hover:bg-slate-800',
    accentText: 'text-slate-900',
    logo: 'bg-slate-900 text-white',
    outline: 'border-slate-200 text-slate-700 hover:bg-slate-50',
    field: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
    dialog: 'bg-white text-slate-900',
  },
  DARK_SOVEREIGN: {
    isDark: true,
    page: 'bg-slate-950 text-slate-100',
    header: 'bg-slate-950/95 border-slate-800 text-slate-50',
    surface: 'bg-slate-900 border-slate-800',
    subtle: 'bg-slate-800/60',
    hairline: 'border-slate-800',
    muted: 'text-slate-400',
    accent: 'bg-emerald-600 text-white hover:bg-emerald-500',
    accentText: 'text-emerald-400',
    logo: 'bg-emerald-600 text-white',
    outline: 'border-slate-700 text-slate-200 hover:bg-slate-800',
    field: 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500',
    dialog: 'bg-slate-900 text-slate-100 border-slate-800',
  },
  LUXURY_GOLD: {
    isDark: true,
    page: 'bg-stone-950 text-stone-100',
    header: 'bg-stone-950/95 border-stone-800 text-stone-50',
    surface: 'bg-stone-900 border-stone-800',
    subtle: 'bg-stone-800/60',
    hairline: 'border-stone-800',
    muted: 'text-stone-400',
    accent: 'bg-amber-500 text-stone-950 hover:bg-amber-400',
    accentText: 'text-amber-400',
    logo: 'bg-amber-500 text-stone-950',
    outline: 'border-stone-700 text-stone-200 hover:bg-stone-800',
    field: 'bg-stone-900 border-stone-700 text-stone-100 placeholder:text-stone-500',
    dialog: 'bg-stone-900 text-stone-100 border-stone-800',
  },
  CORPORATE_ENTERPRISE: {
    isDark: false,
    page: 'bg-slate-100 text-slate-900',
    header: 'bg-white/95 border-slate-300 text-slate-900',
    surface: 'bg-white border-slate-300',
    subtle: 'bg-slate-50',
    hairline: 'border-slate-200',
    muted: 'text-slate-500',
    accent: 'bg-blue-700 text-white hover:bg-blue-800',
    accentText: 'text-blue-700',
    logo: 'bg-blue-700 text-white',
    outline: 'border-slate-300 text-slate-700 hover:bg-slate-50',
    field: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
    dialog: 'bg-white text-slate-900',
  },
};

const TEMPLATE_COPY: Record<string, { eyebrow: string; catalog: string; searchPlaceholder: string; unit?: string }> = {
  REAL_ESTATE_RENTALS: { eyebrow: 'Properties and rentals', catalog: 'Available properties', searchPlaceholder: 'Search properties', unit: 'per month' },
  HOTEL_AIRBNB: { eyebrow: 'Rooms and stays', catalog: 'Available rooms', searchPlaceholder: 'Search rooms', unit: 'per night' },
  SERVICES_BOOKING: { eyebrow: 'Services and bookings', catalog: 'Services', searchPlaceholder: 'Search services' },
  RETAIL: { eyebrow: 'Product catalog', catalog: 'Products', searchPlaceholder: 'Search products' },
};

export default function PublicStorefrontPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'store';

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CATALOG' | string>('CATALOG');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingOption, setShippingOption] = useState<'STANDARD' | 'VIP' | 'PICKUP'>('STANDARD');

  const { data: storeConfig, isLoading: isStoreLoading } = useQuery({
    queryKey: ['public_store_config', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('store_slug', slug.toLowerCase())
        .maybeSingle();

      if (data) return data;

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, name, currency, currency_code, whatsapp_number, official_email')
        .ilike('name', `%${slug}%`)
        .maybeSingle();

      if (tenantData) {
        return {
          business_id: tenantData.id,
          store_name: tenantData.name,
          store_slug: slug,
          storefront_template: 'RETAIL',
          currency_code: tenantData.currency_code || tenantData.currency || 'UGX',
          whatsapp_number: tenantData.whatsapp_number || '',
          official_email: tenantData.official_email || '',
          theme_color: '#2563eb'
        };
      }

      return null;
    }
  });

  const businessId = storeConfig?.business_id;
  const storeCurrency = storeConfig?.currency_code || 'UGX';
  const templateType = (storeConfig?.storefront_template || storeConfig?.template_type || 'RETAIL').toUpperCase();
  const metadata = storeConfig?.metadata || {};
  const websiteTheme = (metadata.website_theme || 'MODERN_MINIMALIST').toUpperCase();
  const theme = THEMES[websiteTheme] || THEMES.MODERN_MINIMALIST;
  const copy = TEMPLATE_COPY[templateType] || TEMPLATE_COPY.RETAIL;

  const hqLocationLabel = metadata.business_location || '';

  const { data: hqCoords } = useQuery({
    queryKey: ['store_hq_geocode', hqLocationLabel],
    enabled: !!hqLocationLabel,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(hqLocationLabel)}`);
        const data = await res.json();
        if (data && data[0]) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
      } catch (e) {
        return null;
      }
    }
  });

  const hqMapEmbedUrl = hqCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${hqCoords.lng - 0.008}%2C${hqCoords.lat - 0.005}%2C${hqCoords.lng + 0.008}%2C${hqCoords.lat + 0.005}&layer=mapnik&marker=${hqCoords.lat}%2C${hqCoords.lng}`
    : null;

  const standardFee = Number(metadata.standard_shipping_fee || 10000);
  const vipFee = Number(metadata.vip_shipping_fee || 25000);
  const activeShippingFee = shippingOption === 'PICKUP' ? 0 : shippingOption === 'VIP' ? vipFee : standardFee;

  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['public_store_catalog', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_public_storefront_catalog', {
        p_business_id: businessId
      });

      if (!error && data && data.length > 0) return data;

      const { data: directData } = await supabase
        .from('product_variants')
        .select(`
          id, product_id, name, sku, barcode, price, selling_price, online_price,
          stock_quantity, primary_media_url, video_url, online_description,
          products ( name, currency_code, description )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      return (directData || []).map((pv: any) => ({
        variant_id: pv.id,
        product_id: pv.product_id,
        product_name: `${pv.products?.name || ''} ${pv.name === 'Standard' ? '' : `(${pv.name})`}`.trim() || 'Catalog Item',
        sku: pv.sku,
        price: Number(pv.online_price || pv.selling_price || pv.price || 0),
        stock_quantity: Number(pv.stock_quantity || 0),
        primary_media_url: pv.primary_media_url,
        video_url: pv.video_url,
        online_description: pv.online_description || pv.products?.description || '',
        currency_code: pv.products?.currency_code || storeCurrency
      }));
    }
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p: any) =>
      p.product_name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((a, b) => a + b.quantity, 0), [cart]);
  const grandTotal = cartSubtotal + (cart.length > 0 ? activeShippingFee : 0);

  const money = (value: any) => `${storeCurrency} ${Number(value || 0).toLocaleString()}`;

  const addToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const stock = Number(product.stock_quantity ?? 0);

    setCart(prev => {
      const existing = prev.find(i => i.variant_id === product.variant_id);
      if (existing) {
        if (stock > 0 && existing.quantity >= stock) {
          toast.error(`Only ${stock} left in stock`);
          return prev;
        }
        return prev.map(i => i.variant_id === product.variant_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        variant_id: product.variant_id,
        product_name: product.product_name,
        price: Number(product.price || product.online_price || 0),
        quantity: 1,
        media_url: product.primary_media_url,
        stock_quantity: stock
      }];
    });

    toast.success("Added to bag");
  };

  const setQuantity = (variantId: number, quantity: number) => {
    setCart(prev => prev.map(i => i.variant_id === variantId ? { ...i, quantity: Math.max(1, quantity) } : i));
  };

  const removeFromCart = (variantId: number) => {
    setCart(prev => prev.filter(i => i.variant_id !== variantId));
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Your bag is empty.");
      if (!customerPhone.trim()) throw new Error("Enter your phone number.");
      if (shippingOption !== 'PICKUP' && !shippingAddress.trim()) throw new Error("Enter a delivery address.");

      const { data, error } = await supabase.rpc('fn_process_online_order_checkout', {
        p_business_id: businessId,
        p_customer_email: customerEmail || `${customerPhone}@guest.store`,
        p_shipping_address: { address: shippingAddress, phone: customerPhone, option: shippingOption, fee: activeShippingFee },
        p_payment_gateway: 'MTN_MOMO',
        p_items: cart.map(i => ({ variant_id: i.variant_id, quantity: i.quantity, price: i.price })),
        p_currency: storeCurrency
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.order_uid ? `Order ${data.order_uid} confirmed` : "Order confirmed");
      setCart([]);
      setIsCartOpen(false);
      setCustomerPhone('');
      setCustomerEmail('');
      setShippingAddress('');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const storePhone = String(storeConfig?.whatsapp_number || storeConfig?.support_phone || '').replace(/\D/g, '');

  const sendWhatsAppInquiry = (item?: any) => {
    const target = storePhone || '256700000000';
    let text = '';

    if (item) {
      const intro =
        templateType === 'REAL_ESTATE_RENTALS' ? 'I would like to view this property:' :
        templateType === 'HOTEL_AIRBNB' ? 'I would like to book this room:' :
        'I would like to ask about this item:';

      text = [
        `Hello ${storeConfig?.store_name},`,
        ``,
        intro,
        item.product_name,
        `Price: ${money(item.price)}`,
        item.sku ? `Ref: ${item.sku}` : ''
      ].filter(Boolean).join('\n');
    } else {
      if (cart.length === 0) {
        toast.error("Your bag is empty");
        return;
      }
      const lines = [
        `Hello ${storeConfig?.store_name},`,
        ``,
        `I would like to order:`,
        ...cart.map(i => `${i.product_name} x${i.quantity} — ${money(i.price * i.quantity)}`),
        ``,
        `Subtotal: ${money(cartSubtotal)}`,
        shippingOption === 'PICKUP' ? `Pickup at the store` : `Delivery: ${money(activeShippingFee)}`,
        `Total: ${money(grandTotal)}`,
        customerPhone ? `Phone: ${customerPhone}` : '',
        shippingOption === 'PICKUP' ? '' : `Address: ${shippingAddress || 'to be confirmed'}`
      ].filter(Boolean);
      text = lines.join('\n');
    }

    window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openWhatsAppDirect = () => {
    const target = storePhone || '256700000000';
    const text = `Hello ${storeConfig?.store_name}, I am contacting you from your online store.`;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isStoreLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-400">Loading store</p>
      </div>
    );
  }

  if (!storeConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-sm rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Store size={32} className="mx-auto mb-4 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900">Store not found</h2>
          <p className="mt-2 text-sm text-slate-500">
            There is no store at /store/{slug}.
          </p>
        </Card>
      </div>
    );
  }

  const customPages: any[] = Array.isArray(metadata.custom_pages) ? metadata.custom_pages : [];
  const activePage = customPages.find((p: any) => p.slug === activeTab);
  const hasContact = storePhone || storeConfig.official_email || hqLocationLabel;

  return (
    <div className={cn("min-h-screen antialiased", theme.page, cart.length > 0 ? "pb-32 sm:pb-20" : "pb-20")}>
      <Toaster position="top-center" />

      <header className={cn("sticky top-0 z-40 border-b backdrop-blur-md", theme.header)}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold", theme.logo)}>
                {storeConfig.logo_url ? (
                  <img src={storeConfig.logo_url} className="h-full w-full object-cover" alt="" />
                ) : (
                  storeConfig.store_name?.charAt(0) || 'S'
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-semibold tracking-tight">{storeConfig.store_name}</h1>
                <p className={cn("truncate text-[11px]", theme.muted)}>{copy.eyebrow}</p>
              </div>
            </div>

            <Button
              onClick={() => setIsCartOpen(true)}
              className={cn("hidden h-10 shrink-0 rounded-lg px-4 text-sm font-medium sm:flex", theme.accent)}
            >
              <ShoppingBag size={16} className="mr-2" />
              Bag
              {cartCount > 0 ? (
                <span className="ml-2 rounded-full bg-black/20 px-1.5 text-xs font-semibold">{cartCount}</span>
              ) : null}
            </Button>

            <Button
              onClick={() => setIsCartOpen(true)}
              className={cn("relative h-10 w-10 shrink-0 rounded-lg p-0 sm:hidden", theme.accent)}
              aria-label="Open bag"
            >
              <ShoppingBag size={16} />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Button>
          </div>

          {customPages.length > 0 ? (
            <div className={cn("flex flex-wrap items-center gap-1.5 border-t py-2", theme.hairline)}>
              <button
                onClick={() => setActiveTab('CATALOG')}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === 'CATALOG' ? theme.accent : cn(theme.muted, "hover:opacity-80")
                )}
              >
                Catalog
              </button>
              {customPages.map((p: any) => (
                <button
                  key={p.id || p.slug}
                  onClick={() => setActiveTab(p.slug)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === p.slug ? theme.accent : cn(theme.muted, "hover:opacity-80")
                  )}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 lg:px-8">
        {activeTab !== 'CATALOG' && activePage ? (
          <Card className={cn("space-y-5 rounded-2xl border p-6 sm:p-10", theme.surface)}>
            <h2 className="text-xl font-semibold tracking-tight">{activePage.title}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed opacity-90">{activePage.content}</p>
            <Button
              onClick={() => setActiveTab('CATALOG')}
              variant="outline"
              className={cn("h-10 rounded-lg px-5 text-sm font-medium", theme.outline)}
            >
              Back to catalog
            </Button>
          </Card>
        ) : (
          <>
            <section className="relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 px-5 py-8 text-white sm:min-h-[260px] sm:px-10 sm:py-12">
              {storeConfig.banner_url ? (
                isVideoUrl(storeConfig.banner_url) ? (
                  <video
                    src={storeConfig.banner_url}
                    autoPlay loop muted playsInline
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
                  />
                ) : (
                  <img src={storeConfig.banner_url} className="absolute inset-0 h-full w-full object-cover opacity-40" alt="" />
                )
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-slate-950/20" />

              <div className="relative z-10 max-w-2xl space-y-3">
                <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                  {storeConfig.store_name}
                </h2>
                {storeConfig.store_description ? (
                  <p className="max-w-xl text-sm leading-relaxed text-slate-200">{storeConfig.store_description}</p>
                ) : null}
                {metadata.hero_cta_text ? (
                  <div className="pt-1">
                    <a href={metadata.hero_cta_link || "#catalog"}>
                      <Button className={cn("h-11 rounded-lg px-5 text-sm font-medium", theme.accent)}>
                        {metadata.hero_cta_text}
                        <ArrowRight size={15} className="ml-2" />
                      </Button>
                    </a>
                  </div>
                ) : null}
              </div>
            </section>

            {templateType === 'REAL_ESTATE_RENTALS' && metadata.inspection_fee ? (
              <Card className={cn("flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between", theme.surface)}>
                <div className="flex items-start gap-3">
                  <Home size={18} className={cn("mt-0.5 shrink-0", theme.accentText)} />
                  <div>
                    <p className="text-sm font-medium">Property viewing</p>
                    <p className={cn("mt-0.5 text-xs leading-relaxed", theme.muted)}>
                      {metadata.inspection_terms || 'A site agent guides the viewing.'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold">{money(metadata.inspection_fee)}</span>
              </Card>
            ) : null}

            {templateType === 'HOTEL_AIRBNB' ? (
              <Card className={cn("space-y-4 rounded-2xl border p-5", theme.surface)}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Hotel size={18} className={cn("mt-0.5 shrink-0", theme.accentText)} />
                    <div>
                      <p className="text-sm font-medium">Check-in and check-out</p>
                      <p className={cn("mt-0.5 text-xs", theme.muted)}>
                        In from {metadata.check_in_time || '14:00'} · Out by {metadata.check_out_time || '10:00'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {metadata.advance_deposit_pct || '50'}% deposit
                  </span>
                </div>

                {metadata.hotel_amenities ? (
                  <div className={cn("flex flex-wrap gap-2 border-t pt-4", theme.hairline)}>
                    {metadata.hotel_amenities.wifi ? <Badge variant="secondary" className={cn("gap-1.5 rounded-md px-2.5 py-1 text-xs font-normal", theme.subtle)}><Wifi size={12} /> Wifi</Badge> : null}
                    {metadata.hotel_amenities.ac ? <Badge variant="secondary" className={cn("gap-1.5 rounded-md px-2.5 py-1 text-xs font-normal", theme.subtle)}><Zap size={12} /> Air conditioning</Badge> : null}
                    {metadata.hotel_amenities.breakfast ? <Badge variant="secondary" className={cn("gap-1.5 rounded-md px-2.5 py-1 text-xs font-normal", theme.subtle)}><Utensils size={12} /> Breakfast</Badge> : null}
                    {metadata.hotel_amenities.parking ? <Badge variant="secondary" className={cn("gap-1.5 rounded-md px-2.5 py-1 text-xs font-normal", theme.subtle)}><Car size={12} /> Parking</Badge> : null}
                    {metadata.hotel_amenities.tv ? <Badge variant="secondary" className={cn("gap-1.5 rounded-md px-2.5 py-1 text-xs font-normal", theme.subtle)}><Tv size={12} /> TV</Badge> : null}
                  </div>
                ) : null}
              </Card>
            ) : null}

            {templateType === 'SERVICES_BOOKING' && metadata.consultation_fee ? (
              <Card className={cn("flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between", theme.surface)}>
                <div className="flex items-start gap-3">
                  <Briefcase size={18} className={cn("mt-0.5 shrink-0", theme.accentText)} />
                  <div>
                    <p className="text-sm font-medium">Consultation</p>
                    <p className={cn("mt-0.5 text-xs", theme.muted)}>
                      {metadata.working_hours || 'Mon to Sat, 8:00 to 18:00'} · {metadata.default_duration || '60 mins'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold">{money(metadata.consultation_fee)}</span>
              </Card>
            ) : null}

            <section id="catalog" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">{copy.catalog}</h3>
                <div className="relative w-full sm:max-w-xs">
                  <Search className={cn("absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", theme.muted)} />
                  <Input
                    placeholder={copy.searchPlaceholder}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={cn("h-10 rounded-lg pl-10 pr-9 text-sm", theme.field)}
                  />
                  {searchTerm ? (
                    <button
                      onClick={() => setSearchTerm('')}
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2", theme.muted)}
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {isProductsLoading ? (
                  <div className="col-span-full py-20 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin opacity-40" />
                    <p className={cn("mt-3 text-sm", theme.muted)}>Loading</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <ShoppingBag size={28} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      {searchTerm ? 'Nothing matches that search' : 'Nothing listed yet'}
                    </p>
                    {searchTerm ? (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm('')}
                        className={cn("mt-5 h-9 rounded-lg px-4 text-xs font-medium", theme.outline)}
                      >
                        Clear search
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  filteredProducts.map((p: any) => {
                    const soldOut = Number(p.stock_quantity ?? 0) <= 0;
                    return (
                      <Card
                        key={p.variant_id}
                        onClick={() => setSelectedItem(p)}
                        className={cn("flex cursor-pointer flex-col overflow-hidden rounded-xl border shadow-none transition-colors", theme.surface)}
                      >
                        <div className="relative flex h-32 items-center justify-center overflow-hidden bg-slate-100 sm:h-44">
                          {p.primary_media_url ? (
                            isVideoUrl(p.primary_media_url) ? (
                              <video src={p.primary_media_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                            ) : (
                              <img src={p.primary_media_url} className="h-full w-full object-cover" alt={p.product_name} />
                            )
                          ) : (
                            <ShoppingBag size={32} className="text-slate-300" />
                          )}
                          {soldOut ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-xs font-semibold text-slate-700">
                              Out of stock
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-1 flex-col gap-1.5 p-3">
                          <h4 className="line-clamp-2 text-[13px] font-medium leading-snug">{p.product_name}</h4>
                          <p className="text-sm font-semibold">
                            {money(p.price)}
                            {copy.unit ? <span className={cn("ml-1 text-[11px] font-normal", theme.muted)}>{copy.unit}</span> : null}
                          </p>
                          {p.online_description ? (
                            <p className={cn("line-clamp-2 text-[12px] leading-relaxed", theme.muted)}>{p.online_description}</p>
                          ) : null}
                        </div>

                        <div className="p-3 pt-0">
                          <Button
                            disabled={soldOut}
                            onClick={(e) => addToCart(p, e)}
                            className={cn(
                              "h-9 w-full rounded-lg text-xs font-medium",
                              soldOut ? "cursor-not-allowed bg-slate-100 text-slate-400" : theme.accent
                            )}
                          >
                            {soldOut ? 'Out of stock' : 'Add to bag'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>

            {metadata.about_us_body ? (
              <Card className={cn("space-y-3 rounded-2xl border p-6 sm:p-8", theme.surface)}>
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                  {metadata.about_us_title || 'About us'}
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed opacity-90">{metadata.about_us_body}</p>
              </Card>
            ) : null}

            {metadata.testimonial_quote ? (
              <Card className={cn("space-y-3 rounded-2xl border p-6 sm:p-8", theme.surface)}>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="max-w-3xl text-base leading-relaxed">{metadata.testimonial_quote}</p>
                <p className={cn("text-xs font-medium", theme.muted)}>
                  {metadata.testimonial_author || 'Customer'}
                </p>
              </Card>
            ) : null}

            {Array.isArray(metadata.faqs) && metadata.faqs.length > 0 ? (
              <Card className={cn("rounded-2xl border p-6 sm:p-8", theme.surface)}>
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">Questions</h3>
                <div className={cn("mt-4 divide-y", theme.hairline)}>
                  {metadata.faqs.map((faq: any, idx: number) => (
                    <details key={faq.id || idx} className="group py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                        {faq.question}
                        <ChevronDown size={16} className={cn("shrink-0 transition-transform group-open:rotate-180", theme.muted)} />
                      </summary>
                      <p className={cn("mt-2 whitespace-pre-line text-sm leading-relaxed", theme.muted)}>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </Card>
            ) : null}

            {hasContact ? (
              <Card className={cn("overflow-hidden rounded-2xl border", theme.surface)}>
                <div className="grid md:grid-cols-2">
                  {hqMapEmbedUrl ? (
                    <iframe
                      title="Store location"
                      src={hqMapEmbedUrl}
                      className="h-48 w-full border-0 md:h-full md:min-h-[260px]"
                      loading="lazy"
                    />
                  ) : null}

                  <div className="space-y-5 p-6 sm:p-8">
                    <h3 className="text-base font-semibold tracking-tight sm:text-lg">Find us</h3>

                    {hqLocationLabel ? (
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className={cn("mt-0.5 shrink-0", theme.muted)} />
                        <div>
                          <p className="text-sm">{hqLocationLabel}</p>
                          {hqCoords ? (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${hqCoords.lat}&mlon=${hqCoords.lng}#map=17/${hqCoords.lat}/${hqCoords.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className={cn("mt-1 inline-block text-xs font-medium underline", theme.accentText)}
                            >
                              Get directions
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-start gap-3">
                      <Truck size={16} className={cn("mt-0.5 shrink-0", theme.muted)} />
                      <div>
                        <p className="text-sm">{metadata.supported_destinations || 'Local delivery'}</p>
                        <p className={cn("mt-0.5 text-xs", theme.muted)}>
                          Delivery from {money(standardFee)} · pickup free
                        </p>
                      </div>
                    </div>

                    {storePhone ? (
                      <div className="flex items-start gap-3">
                        <Phone size={16} className={cn("mt-0.5 shrink-0", theme.muted)} />
                        <a href={`tel:${storePhone}`} className="text-sm">{storeConfig.whatsapp_number || storePhone}</a>
                      </div>
                    ) : null}

                    {storeConfig.official_email ? (
                      <div className="flex items-start gap-3">
                        <Mail size={16} className={cn("mt-0.5 shrink-0", theme.muted)} />
                        <a href={`mailto:${storeConfig.official_email}`} className="break-all text-sm">
                          {storeConfig.official_email}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        )}
      </main>

      {cart.length > 0 ? (
        <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t p-3 sm:hidden", theme.surface)}>
          <Button
            onClick={() => setIsCartOpen(true)}
            className={cn("h-12 w-full justify-between rounded-lg px-4 text-sm font-medium", theme.accent)}
          >
            <span>{cartCount} item{cartCount === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-2">
              {money(cartSubtotal)}
              <ArrowRight size={16} />
            </span>
          </Button>
        </div>
      ) : null}

      <button
        onClick={openWhatsAppDirect}
        className={cn(
          "fixed right-4 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform active:scale-95",
          "h-12 w-12",
          cart.length > 0 ? "bottom-20 sm:bottom-5" : "bottom-5"
        )}
        aria-label="Chat on WhatsApp"
      >
        <MessageSquare size={20} />
      </button>

      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className={cn("max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-2xl", theme.dialog)}>
          {selectedItem && (
            <div>
              <div className="relative flex h-52 items-center justify-center overflow-hidden bg-slate-100 sm:h-64">
                {selectedItem.primary_media_url ? (
                  isVideoUrl(selectedItem.primary_media_url) ? (
                    <video src={selectedItem.primary_media_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={selectedItem.primary_media_url} className="h-full w-full object-cover" alt={selectedItem.product_name} />
                  )
                ) : (
                  <ShoppingBag size={48} className="text-slate-300" />
                )}
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-8">
                <div>
                  <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                    {selectedItem.product_name}
                  </DialogTitle>
                  <p className="mt-2 text-xl font-semibold">
                    {money(selectedItem.price)}
                    {copy.unit ? <span className={cn("ml-1.5 text-xs font-normal", theme.muted)}>{copy.unit}</span> : null}
                  </p>
                  {selectedItem.sku ? (
                    <p className={cn("mt-1 text-xs", theme.muted)}>Ref {selectedItem.sku}</p>
                  ) : null}
                </div>

                {selectedItem.video_url ? (
                  <div className="space-y-2">
                    <Label className={cn("flex items-center gap-1.5 text-xs font-medium", theme.muted)}>
                      <Film size={13} /> Video
                    </Label>
                    <video src={selectedItem.video_url} controls className="h-48 w-full rounded-lg bg-slate-900 object-cover" />
                  </div>
                ) : null}

                {selectedItem.online_description ? (
                  <div className={cn("space-y-2 border-t pt-5", theme.hairline)}>
                    <p className={cn("text-xs font-medium uppercase tracking-[0.14em]", theme.muted)}>Details</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed opacity-90">
                      {selectedItem.online_description}
                    </p>
                  </div>
                ) : null}

                <div className={cn("flex items-center gap-2.5 rounded-lg px-4 py-3", theme.subtle)}>
                  <ShieldCheck size={16} className={cn("shrink-0", theme.muted)} />
                  <span className="text-sm">
                    {Number(selectedItem.stock_quantity || 0)} in stock
                  </span>
                </div>
              </div>

              <div className={cn("flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:px-8", theme.hairline)}>
                <Button
                  disabled={Number(selectedItem.stock_quantity ?? 0) <= 0}
                  onClick={() => { addToCart(selectedItem); setSelectedItem(null); }}
                  className={cn("h-11 flex-1 rounded-lg text-sm font-medium", theme.accent)}
                >
                  <Plus size={15} className="mr-2" />
                  Add to bag
                </Button>
                <Button
                  onClick={() => sendWhatsAppInquiry(selectedItem)}
                  variant="outline"
                  className={cn("h-11 rounded-lg px-6 text-sm font-medium", theme.outline)}
                >
                  <MessageSquare size={15} className="mr-2 text-emerald-600" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className={cn("flex max-h-[92vh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md", theme.dialog)}>
          <div className={cn("border-b px-5 py-4", theme.hairline)}>
            <DialogTitle className="text-base font-semibold">Your bag</DialogTitle>
            <p className={cn("mt-0.5 text-sm", theme.muted)}>
              {cartCount} item{cartCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {cart.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag size={28} className="mx-auto mb-3 opacity-30" />
                <p className={cn("text-sm", theme.muted)}>Your bag is empty</p>
                <Button
                  variant="outline"
                  onClick={() => setIsCartOpen(false)}
                  className={cn("mt-5 h-9 rounded-lg px-4 text-xs font-medium", theme.outline)}
                >
                  Continue shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className={cn("divide-y", theme.hairline)}>
                  {cart.map(item => (
                    <div key={item.variant_id} className="flex items-start gap-3 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.product_name}</p>
                        <p className={cn("mt-0.5 text-xs", theme.muted)}>{money(item.price)} each</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className={cn("flex items-center gap-1 rounded-lg border", theme.hairline)}>
                            <button
                              onClick={() => setQuantity(item.variant_id, item.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center"
                              aria-label="Decrease"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                            <button
                              onClick={() => {
                                const stock = Number(item.stock_quantity || 0);
                                if (stock > 0 && item.quantity >= stock) {
                                  toast.error(`Only ${stock} left in stock`);
                                  return;
                                }
                                setQuantity(item.variant_id, item.quantity + 1);
                              }}
                              className="flex h-8 w-8 items-center justify-center"
                              aria-label="Increase"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.variant_id)}
                            className={cn("text-xs font-medium", theme.muted)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {money(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className={cn("text-xs font-medium", theme.muted)}>Delivery</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'PICKUP', label: 'Pickup', fee: 0 },
                      { id: 'STANDARD', label: 'Standard', fee: standardFee },
                      { id: 'VIP', label: 'Express', fee: vipFee },
                    ] as const).map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setShippingOption(option.id)}
                        className={cn(
                          "flex h-16 flex-col justify-center gap-1 rounded-lg border px-2 text-left transition-colors",
                          shippingOption === option.id
                            ? cn("border-2", theme.isDark ? "border-white" : "border-slate-900")
                            : theme.hairline
                        )}
                      >
                        <span className="text-xs font-medium">{option.label}</span>
                        <span className={cn("text-[11px]", theme.muted)}>
                          {option.fee === 0 ? 'Free' : money(option.fee)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn("space-y-2 border-t pt-4", theme.hairline)}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={theme.muted}>Subtotal</span>
                    <span className="tabular-nums">{money(cartSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={theme.muted}>Delivery</span>
                    <span className="tabular-nums">{activeShippingFee === 0 ? 'Free' : money(activeShippingFee)}</span>
                  </div>
                  <div className={cn("flex items-center justify-between border-t pt-2 text-base font-semibold", theme.hairline)}>
                    <span>Total</span>
                    <span className="tabular-nums">{money(grandTotal)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className={cn("text-xs font-medium", theme.muted)}>Phone number</Label>
                    <Input
                      inputMode="tel"
                      placeholder="0770000000"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className={cn("h-11 rounded-lg text-sm", theme.field)}
                    />
                  </div>

                  {shippingOption !== 'PICKUP' ? (
                    <div className="space-y-1.5">
                      <Label className={cn("text-xs font-medium", theme.muted)}>Delivery address</Label>
                      <Input
                        placeholder="Ntinda, Kampala"
                        value={shippingAddress}
                        onChange={e => setShippingAddress(e.target.value)}
                        className={cn("h-11 rounded-lg text-sm", theme.field)}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label className={cn("text-xs font-medium", theme.muted)}>Email (optional)</Label>
                    <Input
                      inputMode="email"
                      placeholder="you@example.com"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className={cn("h-11 rounded-lg text-sm", theme.field)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 ? (
            <DialogFooter className={cn("flex-col gap-2 border-t px-5 py-4", theme.hairline)}>
              <Button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className={cn("h-12 w-full rounded-lg text-sm font-medium", theme.accent)}
              >
                {checkoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Pay {money(grandTotal)}
              </Button>
              <Button
                onClick={() => sendWhatsAppInquiry()}
                variant="outline"
                className={cn("h-12 w-full rounded-lg text-sm font-medium", theme.outline)}
              >
                <MessageSquare size={15} className="mr-2 text-emerald-600" />
                Order on WhatsApp
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}