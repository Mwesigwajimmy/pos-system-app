'use client';

/**
 * --- BBU1 SOVEREIGN PUBLIC CUSTOMER STOREFRONT ---
 * VERSION: v15.0 OMEGA (WEB STUDIO BLOCK ENGINE, DYNAMIC INDUSTRY BADGES & ITEM SPECS OVERLAY)
 * JURISDICTION: Standard Retail, Real Estate & Rentals, Hotel & Airbnb, Services Booking
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
  Car, Tv, KeyRound, Building2, Check, Film, Quote
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

  // ITEM DETAIL SPECS MODAL STATE
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // CHECKOUT FORM STATE
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentGateway, setPaymentGateway] = useState('MTN_MOMO');

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
          stock_quantity, primary_media_url, online_description,
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

  // CART CALCULATIONS
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

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
        p_shipping_address: { address: shippingAddress, phone: customerPhone },
        p_payment_gateway: paymentGateway,
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

  // WHATSAPP DIRECT ORDER/INQUIRY DISPATCH
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
      text += `\n*Total Amount:* ${storeCurrency} ${cartTotal.toLocaleString()}\n`;
      text += `*Phone:* ${customerPhone || 'N/A'}\n`;
      text += `*Location:* ${shippingAddress || 'Store Pickup'}`;
    }

    window.open(`https://wa.me/${whatsappNo.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isStoreLoading) return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Digital Storefront...</p>
    </div>
  );

  if (!storeConfig) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <Card className="max-w-md p-10 rounded-[2.5rem] shadow-2xl border-none bg-white">
        <Store size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-900 uppercase">Store Not Found</h2>
        <p className="text-xs text-slate-500 font-medium mt-2">The web store at <strong className="font-mono text-blue-600">/store/{slug}</strong> is currently offline or unconfigured.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <Toaster position="top-center" />

      {/* DYNAMIC HEADER BASED ON TEMPLATE */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg overflow-hidden">
              {storeConfig.logo_url ? (
                <img src={storeConfig.logo_url} className="h-full w-full object-cover" alt="logo" />
              ) : (
                storeConfig.store_name?.charAt(0) || 'S'
              )}
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">{storeConfig.store_name}</h1>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                {templateType === 'REAL_ESTATE_RENTALS' && <Home size={10} />}
                {templateType === 'HOTEL_AIRBNB' && <Hotel size={10} />}
                {templateType === 'SERVICES_BOOKING' && <Briefcase size={10} />}
                {templateType === 'RETAIL' && <CheckCircle2 size={10} />}
                Verified {templateType.replace('_', ' ')} Portal
              </p>
            </div>
          </div>

          <Button onClick={() => setIsCartOpen(true)} className="relative h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg">
            <ShoppingBag size={18} className="mr-2" />
            <span>Bag</span>
            {cart.length > 0 && (
              <Badge className="ml-2 bg-white text-blue-600 font-black text-xs px-2 py-0.5 rounded-full">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-12">
        
        {/* 🎬 DYNAMIC HERO BANNER BLOCK (SUPPORTS AUTO-PLAYING VIDEO OR PHOTO BACKGROUND) */}
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[280px]">
          {storeConfig.banner_url && (
            isVideoUrl(storeConfig.banner_url) ? (
              <video 
                src={storeConfig.banner_url} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" 
              />
            ) : (
              <img src={storeConfig.banner_url} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="banner" />
            )
          )}
          
          <div className="relative z-10 space-y-3">
            <Badge className="bg-blue-600 text-white font-bold text-[9px] uppercase px-3 py-1 border-none shadow-md">
              {templateType === 'REAL_ESTATE_RENTALS' ? 'Property Directory & Rental Listings' : 
               templateType === 'HOTEL_AIRBNB' ? 'Guest House & Suite Reservations' : 
               templateType === 'SERVICES_BOOKING' ? 'Professional Services & Appointments' : 
               'Official Digital Product Catalog'}
            </Badge>

            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{storeConfig.store_name}</h2>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
              {storeConfig.store_description || "Browse authentic listings & catalog items with direct booking."}
            </p>

            {/* CALL TO ACTION BUTTON */}
            {metadata.hero_cta_text && (
              <div className="pt-2">
                <a href={metadata.hero_cta_link || "#catalog"}>
                  <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-900/40">
                    {metadata.hero_cta_text} <ArrowRight size={16} className="ml-2" />
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ⚡ DYNAMIC INDUSTRY HIGHLIGHT BADGES PANEL */}
        {templateType === 'REAL_ESTATE_RENTALS' && metadata.inspection_fee && (
          <div className="p-6 bg-emerald-950 text-emerald-100 rounded-3xl border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <Home size={28} className="text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-black text-sm uppercase">Property Inspection Booking Node</h4>
                <p className="text-xs font-medium text-emerald-300">{metadata.inspection_terms || 'Inspection fee covers physical viewing guided by authorized site agent.'}</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-black text-xs uppercase px-4 py-2 border-none shrink-0">
              Inspection Fee: {storeCurrency} {Number(metadata.inspection_fee).toLocaleString()}
            </Badge>
          </div>
        )}

        {templateType === 'HOTEL_AIRBNB' && (
          <div className="p-6 bg-purple-950 text-purple-100 rounded-3xl border border-purple-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-800 pb-4">
              <div className="flex items-center gap-3">
                <Hotel size={28} className="text-purple-400 shrink-0" />
                <div>
                  <h4 className="font-black text-sm uppercase">Guest House & Suite Policies</h4>
                  <p className="text-xs font-medium text-purple-300">Check-In: <strong>{metadata.check_in_time || '14:00'}</strong> • Check-Out: <strong>{metadata.check_out_time || '10:00'}</strong></p>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white font-black text-xs uppercase px-4 py-2 border-none shrink-0">
                Deposit Required: {metadata.advance_deposit_pct || '50'}% MoMo
              </Badge>
            </div>

            {/* FEATURED AMENITIES */}
            {metadata.hotel_amenities && (
              <div className="flex flex-wrap gap-3">
                {metadata.hotel_amenities.wifi && <Badge variant="outline" className="border-purple-700 text-purple-200 font-bold text-xs"><Wifi size={12} className="mr-1.5"/> Free High-Speed WiFi</Badge>}
                {metadata.hotel_amenities.ac && <Badge variant="outline" className="border-purple-700 text-purple-200 font-bold text-xs"><Utensils size={12} className="mr-1.5"/> Air Conditioned</Badge>}
                {metadata.hotel_amenities.breakfast && <Badge variant="outline" className="border-purple-700 text-purple-200 font-bold text-xs"><Utensils size={12} className="mr-1.5"/> Breakfast Included</Badge>}
                {metadata.hotel_amenities.parking && <Badge variant="outline" className="border-purple-700 text-purple-200 font-bold text-xs"><Car size={12} className="mr-1.5"/> Secure Parking</Badge>}
                {metadata.hotel_amenities.tv && <Badge variant="outline" className="border-purple-700 text-purple-200 font-bold text-xs"><Tv size={12} className="mr-1.5"/> Smart Satellite TV</Badge>}
              </div>
            )}
          </div>
        )}

        {templateType === 'SERVICES_BOOKING' && metadata.consultation_fee && (
          <div className="p-6 bg-amber-950 text-amber-100 rounded-3xl border border-amber-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <Briefcase size={28} className="text-amber-400 shrink-0" />
              <div>
                <h4 className="font-black text-sm uppercase">Professional Consultation Node</h4>
                <p className="text-xs font-medium text-amber-300">Hours: <strong>{metadata.working_hours || 'Mon - Sat: 8:00 AM - 6:00 PM'}</strong> • Duration: <strong>{metadata.default_duration || '60 Mins'}</strong></p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white font-black text-xs uppercase px-4 py-2 border-none shrink-0">
              Consultation Fee: {storeCurrency} {Number(metadata.consultation_fee).toLocaleString()}
            </Badge>
          </div>
        )}

        {/* SEARCH BAR & CATALOG HEADER */}
        <div id="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {templateType === 'REAL_ESTATE_RENTALS' ? 'Available Properties & Listings' : 
               templateType === 'HOTEL_AIRBNB' ? 'Available Rooms & Suites' : 
               templateType === 'SERVICES_BOOKING' ? 'Service Packages & Consultations' : 
               'Product Catalog'}
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={
                  templateType === 'REAL_ESTATE_RENTALS' ? "Search properties..." :
                  templateType === 'HOTEL_AIRBNB' ? "Search rooms..." :
                  "Search catalog..."
                }
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-11 h-11 rounded-2xl font-bold bg-white border-slate-200 shadow-sm"
              />
            </div>
          </div>

          {/* CATALOG / LISTINGS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {isProductsLoading ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600" /> Loading Catalog...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs">No active listings found on this store.</div>
            ) : (
              filteredProducts.map((p: any) => (
                <Card 
                  key={p.variant_id} 
                  onClick={() => setSelectedItem(p)}
                  className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all bg-white flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {p.primary_media_url ? (
                        isVideoUrl(p.primary_media_url) ? (
                          <video src={p.primary_media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={p.primary_media_url} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" alt={p.product_name} />
                        )
                      ) : (
                        <ShoppingBag size={48} className="text-slate-300 opacity-40" />
                      )}
                      
                      <Badge className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white font-bold text-[9px] uppercase border-none px-2.5 py-1">
                        {templateType === 'REAL_ESTATE_RENTALS' ? 'Listing' : templateType === 'HOTEL_AIRBNB' ? 'Room' : 'Available'}
                      </Badge>
                    </div>

                    <div className="p-6 space-y-2">
                      <h3 className="font-black text-slate-900 text-sm uppercase leading-snug group-hover:text-blue-600 transition-colors">{p.product_name}</h3>
                      <p className="text-lg font-black text-blue-600">
                        {storeCurrency} {Number(p.price).toLocaleString()}
                        {templateType === 'HOTEL_AIRBNB' && <span className="text-[10px] text-slate-400 font-normal"> / Night</span>}
                        {templateType === 'REAL_ESTATE_RENTALS' && <span className="text-[10px] text-slate-400 font-normal"> / Mo</span>}
                      </p>
                      {p.online_description && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-2">{p.online_description}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex gap-2">
                    <Button onClick={(e) => addToCart(p, e)} className="flex-1 h-11 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs uppercase shadow-md">
                      <Plus size={16} className="mr-1" /> Add
                    </Button>
                    <Button onClick={(e) => { e.stopPropagation(); setSelectedItem(p); }} variant="outline" className="h-11 px-3 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl">
                      <Info size={16} />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 📖 WEB STUDIO BLOCK 1: BRAND STORY & ABOUT US SECTION */}
        {metadata.about_us_body && (
          <Card className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Globe size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {metadata.about_us_title || 'About Our Business'}
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 whitespace-pre-line">
              {metadata.about_us_body}
            </p>
          </Card>
        )}

        {/* ⭐ WEB STUDIO BLOCK 2: VERIFIED CLIENT TESTIMONIALS */}
        {metadata.testimonial_quote && (
          <Card className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden space-y-4">
            <Quote className="absolute -right-4 -bottom-4 w-40 h-40 text-blue-500/10 rotate-12" />
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={18} className="fill-amber-400" />
              <Star size={18} className="fill-amber-400" />
              <Star size={18} className="fill-amber-400" />
              <Star size={18} className="fill-amber-400" />
              <Star size={18} className="fill-amber-400" />
              <span className="text-xs font-bold text-slate-400 ml-2">Verified Client Review</span>
            </div>
            <p className="text-lg font-bold italic text-slate-100 max-w-3xl leading-relaxed">
              "{metadata.testimonial_quote}"
            </p>
            <p className="text-xs font-black uppercase text-blue-400 tracking-wider">
              — {metadata.testimonial_author || 'Verified Customer'}
            </p>
          </Card>
        )}

        {/* ❓ WEB STUDIO BLOCK 3: FREQUENTLY ASKED QUESTIONS (FAQ) */}
        {(metadata.faq_question_1 || metadata.faq_question_2) && (
          <Card className="bg-white border-slate-200 shadow-xl rounded-[2.5rem] p-10 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Frequently Asked Questions</h3>
                <p className="text-xs text-slate-400 font-medium">Clear answers regarding orders, inspections, and booking terms.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {metadata.faq_question_1 && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-600" />
                    {metadata.faq_question_1}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{metadata.faq_answer_1}</p>
                </div>
              )}

              {metadata.faq_question_2 && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-600" />
                    {metadata.faq_question_2}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{metadata.faq_answer_2}</p>
                </div>
              )}
            </div>
          </Card>
        )}

      </main>

      {/* RICH ITEM SPECS & DESCRIPTION OVERLAY MODAL */}
      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <div>
              {/* MEDIA HERO */}
              <div className="h-64 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {selectedItem.primary_media_url ? (
                  isVideoUrl(selectedItem.primary_media_url) ? (
                    <video src={selectedItem.primary_media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={selectedItem.primary_media_url} className="w-full h-full object-cover" alt={selectedItem.product_name} />
                  )
                ) : (
                  <ShoppingBag size={64} className="text-slate-600" />
                )}
                <Badge className="absolute top-4 left-4 bg-blue-600 text-white font-black text-xs uppercase px-3 py-1">
                  {templateType.replace('_', ' ')}
                </Badge>
              </div>

              {/* DETAILS CONTENT */}
              <div className="p-8 space-y-6">
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedItem.product_name}</h2>
                  <p className="text-2xl font-black text-blue-600">
                    {storeCurrency} {Number(selectedItem.price).toLocaleString()}
                    {templateType === 'HOTEL_AIRBNB' && <span className="text-xs text-slate-400 font-normal"> / Night</span>}
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-400 uppercase">SKU / Ref: {selectedItem.sku || 'N/A'}</p>
                </div>

                {/* DESCRIPTION & SPECS */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Full Specifications & Description</h4>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {selectedItem.online_description || "No specific detailed description provided for this item."}
                  </p>
                </div>

                {/* STOCK & READY STATUS */}
                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                  <span>Available Stock: <strong>{selectedItem.stock_quantity || 0} Units</strong></span>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
                <Button onClick={() => { addToCart(selectedItem); setSelectedItem(null); }} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl uppercase text-xs shadow-xl">
                  <Plus size={16} className="mr-2" /> Add to Bag & Checkout
                </Button>

                <Button onClick={() => sendWhatsAppInquiry(selectedItem)} variant="outline" className="h-12 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl uppercase text-xs px-6">
                  <MessageSquare size={16} className="mr-2" /> WhatsApp Inquiry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CHECKOUT CART DRAWER MODAL */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-blue-400" size={24} />
              <DialogTitle className="text-lg font-black uppercase tracking-wider">Your Shopping Bag</DialogTitle>
            </div>
            <Badge className="bg-blue-600 text-white font-bold text-xs">{cart.length} Items</Badge>
          </div>

          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-white">
            {cart.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-10 uppercase">Your shopping bag is empty.</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.variant_id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{item.product_name}</p>
                      <p className="text-[10px] font-bold text-blue-600">{storeCurrency} {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                      <button onClick={() => setCart(prev => prev.map(i => i.variant_id === item.variant_id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}><Minus size={12} /></button>
                      <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                      <button onClick={() => setCart(prev => prev.map(i => i.variant_id === item.variant_id ? { ...i, quantity: i.quantity + 1 } : i))}><Plus size={12} /></button>
                    </div>
                  </div>
                ))}

                <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Payable</span>
                  <span className="text-xl font-black text-emerald-400">{storeCurrency} {cartTotal.toLocaleString()}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Your Phone Number (For Mobile Money / Delivery) *</Label>
                    <Input placeholder="e.g. 0770000000" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-11 rounded-xl font-bold text-xs border-slate-200" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Delivery Address / Location</Label>
                    <Input placeholder="e.g. Ntinda, Kampala / Store Pickup" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} className="h-11 rounded-xl font-bold text-xs border-slate-200" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex flex-col gap-3">
            <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending || cart.length === 0} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl uppercase text-xs shadow-xl">
              {checkoutMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : `Pay ${storeCurrency} ${cartTotal.toLocaleString()} & Complete Order`}
            </Button>

            <Button onClick={() => sendWhatsAppInquiry()} disabled={cart.length === 0} variant="outline" className="w-full h-12 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl uppercase text-xs">
              <MessageSquare size={16} className="mr-2" /> Order Directly on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}