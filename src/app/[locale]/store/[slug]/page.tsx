'use client';

/**
 * --- BBU1 SOVEREIGN PUBLIC CUSTOMER STOREFRONT ---
 * VERSION: v19.0 OMEGA (DYNAMIC THEME ENGINE, MULTI-PAGE NAV, VIP SHIPPING & DUAL MEDIA)
 * JURISDICTION: Standard Retail, Real Estate & Rentals, Hotel & Airbnb, Services Booking
 *
 * LAYOUT / UI PASS NOTES:
 * - All data logic (Supabase queries, RPC fallbacks, cart math, checkout mutation, WhatsApp
 *   deep links, theme resolution) is untouched — only className/JSX structure changed.
 * - The four website themes (MODERN_MINIMALIST, DARK_SOVEREIGN, LUXURY_GOLD,
 *   CORPORATE_ENTERPRISE) are preserved and still switch the exact same way; their token
 *   values were refined so each still reads as distinct but disciplined, not "shouty".
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

import {
  ShoppingBag, Search, CheckCircle2, Loader2,
  Store, MessageSquare, MapPin, Phone, Mail,
  Plus, Minus, Sparkles, Home, Hotel, Briefcase,
  Eye, Info, Calendar, ShieldCheck, X, Share2, Star,
  HelpCircle, ArrowRight, Globe, Clock, Wifi, Utensils,
  Car, Tv, KeyRound, Building2, Check, Film, Quote,
  Truck, Zap, FileText, Crown, Moon, Sun, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const supabase = createClient();

// HELPER: DETECT IF URL IS A VIDEO FILE
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
}

export default function PublicStorefrontPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'store';

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ACTIVE PAGE TAB STATE (FOR MULTI-PAGE WEBSITES)
  const [activeTab, setActiveTab] = useState<'CATALOG' | string>('CATALOG');

  // ITEM DETAIL SPECS MODAL STATE
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // CHECKOUT FORM & SHIPPING COST STATE
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingOption, setShippingOption] = useState<'STANDARD' | 'VIP'>('STANDARD');

  // 1. DATA: Fetch Storefront Settings by Slug
  const { data: storeConfig, isLoading: isStoreLoading } = useQuery({
    queryKey: ['public_store_config', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('store_slug', slug.toLowerCase())
        .maybeSingle();

      if (data) return data;

      // Fallback lookup by business name
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

  // DYNAMIC WEBSITE THEME RESOLUTION
  const websiteTheme = (metadata.website_theme || 'MODERN_MINIMALIST').toUpperCase();

  // HQ LOCATION LABEL (used both in the panel text and to resolve the map pin below)
  const hqLocationLabel = metadata.business_location || 'Kampala, Uganda';

  // ADDITIVE, READ-ONLY QUERY (new — does not touch any existing query/mutation):
  // resolves the store's HQ address into coordinates via OpenStreetMap's free Nominatim
  // API so the Location panel can show a real pin instead of just a text label.
  const { data: hqCoords, isLoading: isHqGeocoding } = useQuery({
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
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${hqCoords.lng - 0.01}%2C${hqCoords.lat - 0.01}%2C${hqCoords.lng + 0.01}%2C${hqCoords.lat + 0.01}&layer=mapnik&marker=${hqCoords.lat}%2C${hqCoords.lng}`
    : null;

  // SHIPPING RATES
  const standardFee = Number(metadata.standard_shipping_fee || 10000);
  const vipFee = Number(metadata.vip_shipping_fee || 25000);
  const activeShippingFee = shippingOption === 'VIP' ? vipFee : standardFee;

  // 2. DATA: Fetch Published Public Products Catalog
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['public_store_catalog', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_public_storefront_catalog', {
        p_business_id: businessId
      });

      if (!error && data && data.length > 0) return data;

      // Direct fallback
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

  // FILTERED PRODUCTS
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) =>
      p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // CART & SHIPPING GRAND TOTAL CALCULATIONS
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const grandTotal = cartSubtotal + (cart.length > 0 ? activeShippingFee : 0);

  const addToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(i => i.variant_id === product.variant_id);
      if (existing) {
        return prev.map(i => i.variant_id === product.variant_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        variant_id: product.variant_id,
        product_name: product.product_name,
        price: Number(product.price || product.online_price || 0),
        quantity: 1,
        media_url: product.primary_media_url
      }];
    });
    toast.success(`Added ${product.product_name} to bag`);
  };

  // CHECKOUT MUTATION
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Shopping bag is empty.");
      if (!customerPhone.trim()) throw new Error("Please enter your phone number for delivery & payment.");

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
      toast.success(`Order #${data?.order_uid || 'SEALED'} Confirmed!`);
      setCart([]);
      setIsCartOpen(false);
      setCustomerPhone('');
      setCustomerEmail('');
      setShippingAddress('');
    },
    onError: (err: any) => toast.error(`Checkout Failed: ${err.message}`)
  });

  // WHATSAPP DIRECT DISPATCH
  const sendWhatsAppInquiry = (item?: any) => {
    const whatsappNo = storeConfig?.whatsapp_number || storeConfig?.support_phone || '256700000000';
    let text = '';

    if (item) {
      if (templateType === 'REAL_ESTATE_RENTALS') {
        text = `Hello *${storeConfig?.store_name}*!\n\nI am interested in inspecting/booking this property:\n🏠 *${item.product_name}*\nPrice/Rate: ${storeCurrency} ${Number(item.price).toLocaleString()}\nSKU: ${item.sku || 'N/A'}`;
      } else if (templateType === 'HOTEL_AIRBNB') {
        text = `Hello *${storeConfig?.store_name}*!\n\nI would like to reserve dates for:\n🏨 *${item.product_name}*\nNightly Rate: ${storeCurrency} ${Number(item.price).toLocaleString()}`;
      } else {
        text = `Hello *${storeConfig?.store_name}*!\n\nI am inquiring about:\n📦 *${item.product_name}*\nPrice: ${storeCurrency} ${Number(item.price).toLocaleString()}`;
      }
    } else {
      if (cart.length === 0) return toast.error("Your cart is empty.");
      text = `Hello *${storeConfig?.store_name}*!\n\nI would like to place an order:\n`;
      cart.forEach(i => {
        text += `• ${i.product_name} x${i.quantity} - ${storeCurrency} ${(i.price * i.quantity).toLocaleString()}\n`;
      });
      text += `\n*Subtotal:* ${storeCurrency} ${cartSubtotal.toLocaleString()}\n`;
      text += `*Shipping (${shippingOption}):* ${storeCurrency} ${activeShippingFee.toLocaleString()}\n`;
      text += `*Grand Total:* ${storeCurrency} ${grandTotal.toLocaleString()}\n`;
      text += `*Phone:* ${customerPhone || 'N/A'}\n`;
      text += `*Delivery Location:* ${shippingAddress || 'Store Pickup'}`;
    }

    window.open(`https://wa.me/${whatsappNo.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const openWhatsAppDirect = () => {
    const whatsappNo = storeConfig?.whatsapp_number || storeConfig?.support_phone || '256700000000';
    const text = `Hello *${storeConfig?.store_name}*!\n\nI am contacting you directly from your official web storefront.`;
    window.open(`https://wa.me/${whatsappNo.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isStoreLoading) return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-xs font-medium tracking-wide text-slate-400">Loading storefront…</p>
    </div>
  );

  if (!storeConfig) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <Card className="max-w-md p-10 rounded-2xl border border-slate-200 bg-white">
        <Store size={40} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900">Store not found</h2>
        <p className="text-sm text-slate-500 mt-2">
          The storefront at <strong className="font-mono text-blue-600">/store/{slug}</strong> is currently offline or unconfigured.
        </p>
      </Card>
    </div>
  );

  // THEME TOKEN RESOLUTION — same switch logic as before, refined values only
  const pageBgClass =
    websiteTheme === 'DARK_SOVEREIGN' ? "bg-slate-950 text-slate-100" :
    websiteTheme === 'LUXURY_GOLD' ? "bg-stone-950 text-amber-50" :
    websiteTheme === 'CORPORATE_ENTERPRISE' ? "bg-slate-100 text-slate-900" :
    "bg-slate-50 text-slate-900"; // MODERN_MINIMALIST

  const cardStyleClass =
    websiteTheme === 'DARK_SOVEREIGN' ? "bg-slate-900 border-slate-800 text-white rounded-xl hover:border-emerald-800" :
    websiteTheme === 'LUXURY_GOLD' ? "bg-stone-900 border-amber-900/40 text-amber-50 rounded-xl hover:border-amber-700/70" :
    websiteTheme === 'CORPORATE_ENTERPRISE' ? "bg-white border-slate-300 rounded-lg shadow-sm hover:shadow-md" :
    "bg-white border-slate-200 rounded-xl shadow-none hover:shadow-md"; // MODERN_MINIMALIST

  const priceColorClass =
    websiteTheme === 'DARK_SOVEREIGN' ? "text-emerald-400" :
    websiteTheme === 'LUXURY_GOLD' ? "text-amber-400" :
    "text-blue-600";

  const accentBtnClass =
    websiteTheme === 'LUXURY_GOLD' ? "bg-amber-500 hover:bg-amber-600 text-slate-950" :
    websiteTheme === 'DARK_SOVEREIGN' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
    "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <div className={cn("min-h-screen font-sans antialiased pb-20 relative transition-colors duration-300", pageBgClass)}>
      <Toaster position="top-center" />

      {/* ============================= HEADER ============================= */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center font-semibold text-sm overflow-hidden",
                websiteTheme === 'LUXURY_GOLD' ? "bg-amber-500 text-slate-950" :
                websiteTheme === 'DARK_SOVEREIGN' ? "bg-emerald-600 text-white" :
                "bg-blue-600 text-white"
              )}>
                {storeConfig.logo_url ? (
                  <img src={storeConfig.logo_url} className="h-full w-full object-cover" alt="logo" />
                ) : (
                  storeConfig.store_name?.charAt(0) || 'S'
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold tracking-tight truncate">{storeConfig.store_name}</h1>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 truncate">
                  {websiteTheme === 'LUXURY_GOLD' && <Crown size={10} className="text-amber-400 shrink-0" />}
                  {websiteTheme === 'DARK_SOVEREIGN' && <Moon size={10} className="text-emerald-400 shrink-0" />}
                  Verified {templateType.replace('_', ' ').toLowerCase()} portal
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsCartOpen(true)}
              className={cn("relative h-10 px-4 font-medium rounded-lg shrink-0", accentBtnClass)}
            >
              <ShoppingBag size={16} className="mr-2" />
              <span className="hidden sm:inline">Bag</span>
              {cart.length > 0 && (
                <Badge className="ml-2 bg-white text-slate-900 font-semibold text-[11px] px-1.5 py-0 rounded-full">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* MULTI-PAGE NAVIGATION TABS (IF CUSTOM PAGES EXIST) */}
          {metadata.custom_pages && Array.isArray(metadata.custom_pages) && metadata.custom_pages.length > 0 && (
            <div className="border-t border-slate-800/70 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
                <button
                  onClick={() => setActiveTab('CATALOG')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
                    activeTab === 'CATALOG' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  Catalog
                </button>

                {metadata.custom_pages.map((p: any) => (
                  <button
                    key={p.id || p.slug}
                    onClick={() => setActiveTab(p.slug)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0",
                      activeTab === p.slug ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ============================= MAIN ============================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8 sm:space-y-10">

        {/* CUSTOM PAGE CONTENT */}
        {activeTab !== 'CATALOG' ? (
          <Card className={cn("p-6 sm:p-10 space-y-5 border", cardStyleClass)}>
            <div className="flex items-center gap-3 border-b border-slate-800/20 pb-4">
              <FileText size={22} className="text-blue-500 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {metadata.custom_pages.find((p: any) => p.slug === activeTab)?.title}
              </h2>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line opacity-90">
              {metadata.custom_pages.find((p: any) => p.slug === activeTab)?.content}
            </p>
            <Button onClick={() => setActiveTab('CATALOG')} variant="outline" className="h-10 px-5 rounded-lg font-medium text-sm">
              ← Back to catalog
            </Button>
          </Card>
        ) : (
          <>
            {/* HERO BANNER — supports video or photo background */}
            <section className="relative overflow-hidden rounded-2xl bg-slate-900 text-white px-6 py-10 sm:px-10 sm:py-14 min-h-[220px] flex flex-col justify-end">
              {storeConfig.banner_url && (
                isVideoUrl(storeConfig.banner_url) ? (
                  <video
                    src={storeConfig.banner_url}
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                  />
                ) : (
                  <img src={storeConfig.banner_url} className="absolute inset-0 w-full h-full object-cover opacity-25" alt="banner" />
                )
              )}

              <div className="relative z-10 max-w-2xl space-y-3">
                <Badge className={cn(
                  "font-medium text-[11px] px-2.5 py-1 rounded-md border-none text-white",
                  websiteTheme === 'LUXURY_GOLD' ? "bg-amber-500 text-slate-950" : "bg-white/10 text-blue-300"
                )}>
                  {templateType === 'REAL_ESTATE_RENTALS' ? 'Property directory & rental listings' :
                   templateType === 'HOTEL_AIRBNB' ? 'Guest house & suite reservations' :
                   templateType === 'SERVICES_BOOKING' ? 'Professional services & appointments' :
                   'Official product catalog'}
                </Badge>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">{storeConfig.store_name}</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  {storeConfig.store_description || "Browse authentic listings and catalog items with direct booking."}
                </p>

                {metadata.hero_cta_text && (
                  <div className="pt-1">
                    <a href={metadata.hero_cta_link || "#catalog"}>
                      <Button className={cn("h-11 px-5 font-medium text-sm rounded-lg", accentBtnClass)}>
                        {metadata.hero_cta_text} <ArrowRight size={15} className="ml-2" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* LOCATION & SHIPPING PANEL — now with a real map pin, not just a text label */}
            <section className={cn("rounded-2xl border overflow-hidden", cardStyleClass)}>
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MapPin size={20} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-medium uppercase tracking-wide opacity-60">Headquarters</h4>
                    <p className="text-sm font-semibold truncate">{hqLocationLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-slate-800/20 pt-4 sm:pt-0 sm:pl-8">
                  <Truck size={20} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-medium uppercase tracking-wide opacity-60">Delivers to</h4>
                    <p className="text-sm font-semibold text-emerald-500 truncate">{metadata.supported_destinations || 'East Africa, Europe, Asia, Global'}</p>
                  </div>
                </div>
              </div>

              {/* MAP PIN PREVIEW */}
              <div className="border-t border-slate-800/20">
                {isHqGeocoding ? (
                  <div className="h-40 sm:h-48 flex items-center justify-center gap-2 text-sm opacity-60 bg-black/5">
                    <Loader2 className="animate-spin" size={16} /> Locating on the map…
                  </div>
                ) : hqMapEmbedUrl ? (
                  <div>
                    <iframe
                      title="Headquarters map"
                      src={hqMapEmbedUrl}
                      className="w-full h-40 sm:h-52 border-0 grayscale-[15%]"
                      loading="lazy"
                    />
                    <div className="px-4 sm:px-6 py-2.5 bg-black/5 flex items-center justify-between gap-2">
                      <span className="text-[11.5px] opacity-60 truncate">
                        Pinned at {hqCoords?.lat.toFixed(5)}, {hqCoords?.lng.toFixed(5)}
                      </span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${hqCoords?.lat}&mlon=${hqCoords?.lng}#map=17/${hqCoords?.lat}/${hqCoords?.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11.5px] font-medium text-blue-500 hover:underline shrink-0"
                      >
                        Open full map
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-xs opacity-50 bg-black/5">
                    Map preview unavailable for this location
                  </div>
                )}
              </div>
            </section>

            {/* INDUSTRY-SPECIFIC HIGHLIGHT PANELS */}
            {templateType === 'REAL_ESTATE_RENTALS' && metadata.inspection_fee && (
              <section className="p-5 sm:p-6 bg-emerald-950 text-emerald-100 rounded-2xl border border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Home size={22} className="text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold">Property inspection booking</h4>
                    <p className="text-xs text-emerald-300 mt-0.5">{metadata.inspection_terms || 'Inspection fee covers a physical viewing guided by an authorized site agent.'}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-medium text-xs px-3 py-1.5 border-none shrink-0 w-fit">
                  Fee: {storeCurrency} {Number(metadata.inspection_fee).toLocaleString()}
                </Badge>
              </section>
            )}

            {templateType === 'HOTEL_AIRBNB' && (
              <section className="p-5 sm:p-6 bg-purple-950 text-purple-100 rounded-2xl border border-purple-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900 pb-4">
                  <div className="flex items-center gap-3">
                    <Hotel size={22} className="text-purple-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold">Guest house policies</h4>
                      <p className="text-xs text-purple-300 mt-0.5">Check-in <strong>{metadata.check_in_time || '14:00'}</strong> · Check-out <strong>{metadata.check_out_time || '10:00'}</strong></p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white font-medium text-xs px-3 py-1.5 border-none shrink-0 w-fit">
                    Deposit: {metadata.advance_deposit_pct || '50'}% MoMo
                  </Badge>
                </div>

                {metadata.hotel_amenities && (
                  <div className="flex flex-wrap gap-2">
                    {metadata.hotel_amenities.wifi && <Badge variant="outline" className="border-purple-800 text-purple-200 font-normal text-xs"><Wifi size={12} className="mr-1.5"/> Free wifi</Badge>}
                    {metadata.hotel_amenities.ac && <Badge variant="outline" className="border-purple-800 text-purple-200 font-normal text-xs"><Utensils size={12} className="mr-1.5"/> Air conditioned</Badge>}
                    {metadata.hotel_amenities.breakfast && <Badge variant="outline" className="border-purple-800 text-purple-200 font-normal text-xs"><Utensils size={12} className="mr-1.5"/> Breakfast included</Badge>}
                    {metadata.hotel_amenities.parking && <Badge variant="outline" className="border-purple-800 text-purple-200 font-normal text-xs"><Car size={12} className="mr-1.5"/> Secure parking</Badge>}
                    {metadata.hotel_amenities.tv && <Badge variant="outline" className="border-purple-800 text-purple-200 font-normal text-xs"><Tv size={12} className="mr-1.5"/> Smart TV</Badge>}
                  </div>
                )}
              </section>
            )}

            {templateType === 'SERVICES_BOOKING' && metadata.consultation_fee && (
              <section className="p-5 sm:p-6 bg-amber-950 text-amber-100 rounded-2xl border border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Briefcase size={22} className="text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold">Professional consultation</h4>
                    <p className="text-xs text-amber-300 mt-0.5">{metadata.working_hours || 'Mon – Sat: 8:00 AM – 6:00 PM'} · {metadata.default_duration || '60 mins'}</p>
                  </div>
                </div>
                <Badge className="bg-amber-600 text-white font-medium text-xs px-3 py-1.5 border-none shrink-0 w-fit">
                  Fee: {storeCurrency} {Number(metadata.consultation_fee).toLocaleString()}
                </Badge>
              </section>
            )}

            {/* SEARCH BAR & CATALOG HEADER */}
            <section id="catalog" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight">
                  {templateType === 'REAL_ESTATE_RENTALS' ? 'Available properties & listings' :
                   templateType === 'HOTEL_AIRBNB' ? 'Available rooms & suites' :
                   templateType === 'SERVICES_BOOKING' ? 'Service packages & consultations' :
                   'Product catalog'}
                </h3>

                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={
                      templateType === 'REAL_ESTATE_RENTALS' ? "Search properties…" :
                      templateType === 'HOTEL_AIRBNB' ? "Search rooms…" :
                      "Search catalog…"
                    }
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 rounded-lg bg-white border-slate-200 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* CATALOG / LISTINGS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {isProductsLoading ? (
                  <div className="col-span-full py-20 text-center opacity-70">
                    <Loader2 className="animate-spin inline mr-2" size={16} />
                    <span className="text-sm font-medium">Loading catalog…</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full py-20 text-center opacity-60">
                    <ShoppingBag size={30} className="mx-auto mb-3" />
                    <p className="text-sm font-medium">No active listings found on this store.</p>
                  </div>
                ) : (
                  filteredProducts.map((p: any) => (
                    <Card
                      key={p.variant_id}
                      onClick={() => setSelectedItem(p)}
                      className={cn("overflow-hidden flex flex-col justify-between cursor-pointer group border transition-all", cardStyleClass)}
                    >
                      <div>
                        <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                          {p.primary_media_url ? (
                            isVideoUrl(p.primary_media_url) ? (
                              <video src={p.primary_media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={p.primary_media_url} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" alt={p.product_name} />
                            )
                          ) : (
                            <ShoppingBag size={40} className="text-slate-600" />
                          )}

                          <span className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-md">
                            {templateType === 'REAL_ESTATE_RENTALS' ? 'Listing' : templateType === 'HOTEL_AIRBNB' ? 'Room' : 'Available'}
                          </span>
                        </div>

                        <div className="p-4 space-y-1.5">
                          <h3 className="font-semibold text-[13.5px] leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors">{p.product_name}</h3>
                          <p className={cn("text-base font-semibold", priceColorClass)}>
                            {storeCurrency} {Number(p.price).toLocaleString()}
                            {templateType === 'HOTEL_AIRBNB' && <span className="text-[11px] opacity-60 font-normal"> / night</span>}
                            {templateType === 'REAL_ESTATE_RENTALS' && <span className="text-[11px] opacity-60 font-normal"> / mo</span>}
                          </p>
                          {p.online_description && (
                            <p className="text-[12.5px] opacity-70 line-clamp-2">{p.online_description}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 pt-0 flex gap-2">
                        <Button onClick={(e) => addToCart(p, e)} className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-[12.5px]">
                          <Plus size={14} className="mr-1.5" /> Add
                        </Button>
                        <Button onClick={(e) => { e.stopPropagation(); setSelectedItem(p); }} variant="outline" className="h-9 px-3 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg">
                          <Info size={15} />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </section>

            {/* ABOUT US SECTION */}
            {metadata.about_us_body && (
              <Card className={cn("p-6 sm:p-10 space-y-4 border", cardStyleClass)}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
                    <Globe size={20} />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {metadata.about_us_title || 'About our business'}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line opacity-90">
                  {metadata.about_us_body}
                </p>
              </Card>
            )}

            {/* TESTIMONIAL */}
            {metadata.testimonial_quote && (
              <Card className={cn("p-6 sm:p-10 relative overflow-hidden space-y-4 border", cardStyleClass)}>
                <Quote className="absolute -right-2 -bottom-2 w-32 h-32 text-blue-500/5" />
                <div className="flex items-center gap-1 text-amber-400 relative z-10">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-amber-400" />)}
                  <span className="text-xs font-medium opacity-60 ml-2">Verified client review</span>
                </div>
                <p className="text-base sm:text-lg font-medium italic max-w-3xl leading-relaxed relative z-10">
                  "{metadata.testimonial_quote}"
                </p>
                <p className="text-xs font-medium text-blue-400 relative z-10">
                  — {metadata.testimonial_author || 'Verified customer'}
                </p>
              </Card>
            )}

            {/* FAQS */}
            {metadata.faqs && Array.isArray(metadata.faqs) && metadata.faqs.length > 0 && (
              <Card className={cn("p-6 sm:p-10 space-y-5 border", cardStyleClass)}>
                <div className="flex items-center gap-3 border-b border-slate-800/20 pb-4">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">Frequently asked questions</h3>
                    <p className="text-xs opacity-60 mt-0.5">Answers on orders, delivery, and service policies.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {metadata.faqs.map((faq: any, idx: number) => (
                    <div key={faq.id || idx} className="p-4 bg-black/5 rounded-xl border border-black/5 space-y-1.5">
                      <h4 className="text-[13px] font-semibold flex items-center gap-2">
                        <Sparkles size={13} className="text-blue-500 shrink-0" />
                        {faq.question}
                      </h4>
                      <p className="text-xs opacity-75 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* FLOATING WHATSAPP CHAT BUTTON */}
      <button
        onClick={openWhatsAppDirect}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        title="Chat on WhatsApp"
      >
        <MessageSquare size={24} />
      </button>

      {/* ================= ITEM SPECS & DUAL MEDIA MODAL ================= */}
      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden bg-white border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-900">
          {selectedItem && (
            <div>
              <div className="h-56 sm:h-64 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {selectedItem.primary_media_url ? (
                  isVideoUrl(selectedItem.primary_media_url) ? (
                    <video src={selectedItem.primary_media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={selectedItem.primary_media_url} className="w-full h-full object-cover" alt={selectedItem.product_name} />
                  )
                ) : (
                  <ShoppingBag size={56} className="text-slate-600" />
                )}

                <span className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-md">
                  {templateType.replace('_', ' ')}
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-1.5 border-b border-slate-100 pb-5">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{selectedItem.product_name}</h2>
                  <p className="text-xl sm:text-2xl font-semibold text-blue-600">
                    {storeCurrency} {Number(selectedItem.price).toLocaleString()}
                    {templateType === 'HOTEL_AIRBNB' && <span className="text-xs text-slate-400 font-normal"> / night</span>}
                  </p>
                  <p className="text-xs font-mono text-slate-400">SKU / Ref: {selectedItem.sku || 'N/A'}</p>
                </div>

                {selectedItem.video_url && (
                  <div className="space-y-2 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <Label className="text-[11px] font-medium text-purple-900 flex items-center gap-1.5">
                      <Film size={13} className="text-purple-600" /> Video walkthrough
                    </Label>
                    <div className="h-44 sm:h-48 w-full rounded-lg overflow-hidden bg-slate-900 border border-purple-200">
                      <video src={selectedItem.video_url} controls autoPlay loop muted className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Specifications & description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedItem.online_description || "No specific detailed description provided for this item."}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <ShieldCheck className="text-blue-600 shrink-0" size={18} />
                  <span>Available stock: <strong>{selectedItem.stock_quantity || 0} units</strong></span>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => { addToCart(selectedItem); setSelectedItem(null); }} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm">
                  <Plus size={15} className="mr-2" /> Add to bag
                </Button>

                <Button onClick={() => sendWhatsAppInquiry(selectedItem)} variant="outline" className="h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg text-sm px-6">
                  <MessageSquare size={15} className="mr-2" /> WhatsApp inquiry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= CHECKOUT CART DRAWER ================= */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-900">
          <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="text-blue-400" size={20} />
              <DialogTitle className="text-base font-semibold">Your shopping bag</DialogTitle>
            </div>
            <Badge className="bg-blue-600 text-white font-medium text-xs">{cart.length} items</Badge>
          </div>

          <div className="px-6 py-5 space-y-5">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Your shopping bag is empty.</p>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.variant_id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-[13px] text-slate-900 truncate">{item.product_name}</p>
                        <p className="text-[11.5px] font-medium text-blue-600">{storeCurrency} {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                        <button onClick={() => setCart(prev => prev.map(i => i.variant_id === item.variant_id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}><Minus size={13} /></button>
                        <span className="font-semibold text-xs w-4 text-center">{item.quantity}</span>
                        <button onClick={() => setCart(prev => prev.map(i => i.variant_id === item.variant_id ? { ...i, quantity: i.quantity + 1 } : i))}><Plus size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <Label className="text-[11px] font-medium text-slate-500">Shipping speed</Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShippingOption('STANDARD')}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col justify-between h-[72px] transition-colors",
                        shippingOption === 'STANDARD' ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                      )}
                    >
                      <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5"><Truck size={13} className="text-blue-600"/> Standard</span>
                      <span className="text-[11.5px] font-medium text-blue-600">{storeCurrency} {standardFee.toLocaleString()}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShippingOption('VIP')}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col justify-between h-[72px] transition-colors",
                        shippingOption === 'VIP' ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-white"
                      )}
                    >
                      <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5"><Zap size={13} className="text-purple-600"/> VIP express</span>
                      <span className="text-[11.5px] font-medium text-purple-600">{storeCurrency} {vipFee.toLocaleString()}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400">Total (incl. delivery)</span>
                  <span className="text-lg font-semibold text-emerald-400">{storeCurrency} {grandTotal.toLocaleString()}</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">Phone number (for mobile money / delivery)</Label>
                    <Input placeholder="e.g. 0770000000" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-10 rounded-lg text-sm border-slate-200" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">Delivery address / destination city</Label>
                    <Input placeholder="e.g. Ntinda, Kampala — or store pickup" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} className="h-10 rounded-lg text-sm border-slate-200" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
            <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending || cart.length === 0} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm">
              {checkoutMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : `Pay ${storeCurrency} ${grandTotal.toLocaleString()} & complete order`}
            </Button>

            <Button onClick={() => sendWhatsAppInquiry()} disabled={cart.length === 0} variant="outline" className="w-full h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg text-sm">
              <MessageSquare size={15} className="mr-2" /> Order directly on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}