'use client';

/**
 * --- BBU1 SOVEREIGN GLOBAL NETWORK SUPER-APP ---
 * VERSION: v20.0 OMEGA (GPS GEOLOCATION, DYNAMIC LOCATION ENGINE & B2B WHOLESALE)
 * JURISDICTION: Supermarket, Restaurants, Real Estate, Hotels & Professional Services
 *
 * LAYOUT / UI PASS NOTES:
 * - All data logic (Supabase queries, mutations, RPC calls, WhatsApp deep link) is untouched.
 * - Two small additive pieces of state were introduced ONLY to support the new map preview
 *   you asked for (precise pin instead of a plain "Kampala, Uganda" label):
 *     1. `coords` — captures { lat, lng } inside the existing GPS success callback.
 *     2. `geocodeCustomLocation()` — a new, separate helper that resolves a typed address
 *        to coordinates via OpenStreetMap's free Nominatim API, so the "Set" button can also
 *        drop an accurate pin. Your original detectGpsLocation/B2B/query logic is unchanged.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

import {
  Search, Globe, Store, ShoppingBag, Home,
  Hotel, Briefcase, ExternalLink, MessageSquare,
  ShieldCheck, Loader2, Sparkles, Building2, Tag,
  Layers, Zap, PackageCheck, ArrowRight, CheckCircle2, Lock,
  MapPin, UtensilsCrossed, Stethoscope, ShoppingCart, User,
  Navigation, Crosshair, Compass, Check, X, ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const supabase = createClient();

const isVideoUrl = (url?: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All items', icon: Layers },
  { id: 'RETAIL', label: 'Supermarkets & retail', icon: ShoppingCart },
  { id: 'SERVICES_BOOKING', label: 'Kitchens & services', icon: UtensilsCrossed },
  { id: 'REAL_ESTATE_RENTALS', label: 'Real estate & rentals', icon: Home },
  { id: 'HOTEL_AIRBNB', label: 'Hotels & Airbnb', icon: Hotel },
  { id: 'SERVICES_BOOKING', label: 'Pharmacies & health', icon: Stethoscope },
];

export default function GlobalNetworkSuperAppPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('ALL');

  // DYNAMIC LOCATION ENGINE STATE (GPS & DYNAMIC ADDRESS)
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [userLocationLabel, setUserLocationLabel] = useState('Global / All locations');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [customLocationSearch, setCustomLocationSearch] = useState('');

  // MAP PREVIEW STATE (additive only — used purely to render the pin on the map)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // MODAL STATES
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [b2bOrderItem, setB2bOrderItem] = useState<any | null>(null);
  const [b2bQuantity, setB2bQuantity] = useState<number>(10);

  // 1. DATA: Get Current User Profile & Business Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_network_superapp'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*, business_name, currency, business_id')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    }
  });

  const buyerBusinessId = profile?.business_id;

  // 2. DATA: Fetch Cross-Business Marketplace Items via RPC
  const { data: networkItems, isLoading } = useQuery({
    queryKey: ['global_bbu1_network_superapp', searchTerm, industryFilter, selectedLocation],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_global_bbu1_marketplace', {
        p_search_query: searchTerm,
        p_industry_filter: industryFilter,
        p_location_filter: selectedLocation,
        p_limit: 60,
        p_offset: 0
      });

      if (error) {
        toast.error(`Super-App Network Error: ${error.message}`);
        return [];
      }
      return data || [];
    }
  });

  // DYNAMICALLY EXTRACT UNIQUE STORE LOCATIONS FROM DB RESULTS
  const availableLocations = useMemo(() => {
    if (!networkItems) return [];
    const locs = new Set<string>();
    networkItems.forEach((item: any) => {
      if (item.business_location) locs.add(item.business_location.trim());
    });
    return Array.from(locs);
  }, [networkItems]);

  // DEVICE GPS SATELLITE GEOLOCATION HANDLER
  const detectGpsLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser.");
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await res.json();

          const city = data.city || data.locality || data.principalSubdivision || "Current Location";
          const country = data.countryName || "";
          const detectedLoc = country ? `${city}, ${country}` : city;

          setSelectedLocation(city);
          setUserLocationLabel(detectedLoc);
          toast.success(`GPS Location Locked: ${detectedLoc}`);
          setIsLocationModalOpen(false);
        } catch (e) {
          setUserLocationLabel("GPS Location Detected");
          toast.success("GPS Coordinates Locked!");
        } finally {
          setIsDetectingGps(false);
        }
      },
      (error) => {
        setIsDetectingGps(false);
        toast.error("Location permission denied. Please search your city manually.");
      }
    );
  };

  // ADDITIVE HELPER (new, does not alter any existing function): resolves a typed address
  // into coordinates so the map can drop an accurate pin for manual searches too.
  const geocodeCustomLocation = async (query: string) => {
    if (!query.trim()) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data[0]) {
        setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      }
    } catch (e) {
      // Silent fail — the text filter still gets applied below regardless of the map pin.
    } finally {
      setIsGeocoding(false);
    }
  };

  // 3. MUTATION: B2B IN-SYSTEM WHOLESALE TRADE EXECUTION
  const b2bTradeMutation = useMutation({
    mutationFn: async () => {
      if (!buyerBusinessId) {
        throw new Error("You must be logged in as a business owner to place B2B wholesale orders.");
      }
      if (!b2bOrderItem) throw new Error("No item selected for B2B trade.");

      if (buyerBusinessId === b2bOrderItem.business_id) {
        throw new Error("You cannot place a B2B wholesale order with your own store!");
      }

      if (b2bQuantity < Number(b2bOrderItem.min_b2b_qty || 1)) {
        throw new Error(`Minimum order quantity for this item is ${b2bOrderItem.min_b2b_qty || 1} units.`);
      }

      const { data, error } = await supabase.rpc('fn_process_b2b_wholesale_order', {
        p_buyer_business_id: buyerBusinessId,
        p_seller_business_id: b2bOrderItem.business_id,
        p_items: [{
          seller_variant_id: b2bOrderItem.variant_id,
          buyer_variant_id: null,
          product_name: b2bOrderItem.product_name,
          quantity: b2bQuantity,
          wholesale_price: Number(b2bOrderItem.wholesale_price || b2bOrderItem.online_price)
        }],
        p_payment_method: 'IN_SYSTEM_B2B_CREDIT',
        p_currency: b2bOrderItem.currency_code || 'UGX'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`B2B Trade Sealed! Ref #${data?.b2b_trade_uid}`, {
        description: `Stock automatically transferred to your inventory and Purchase Order logged!`
      });
      setB2bOrderItem(null);
      queryClient.invalidateQueries({ queryKey: ['global_bbu1_network_superapp'] });
    },
    onError: (err: any) => toast.error(`B2B Trade Failed: ${err.message}`)
  });

  const sendWhatsAppB2BInquiry = (item: any) => {
    const text = `Hello *${item.business_name}*!\n\nI saw your listing on the *BBU1 Network Super-App*:\n📦 *${item.product_name}*\nPrice: ${item.currency_code} ${Number(item.online_price).toLocaleString()}\nWholesale Rate: ${item.currency_code} ${Number(item.wholesale_price).toLocaleString()}\nLocation: ${item.business_location || 'N/A'}\n\nI would like to place an order or inquire about availability.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const mapEmbedUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01}%2C${coords.lat - 0.01}%2C${coords.lng + 0.01}%2C${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=-30%2C-40%2C60%2C55&layer=mapnik`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased pb-20">
      <Toaster position="top-center" />

      {/* ============================= HEADER ============================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">

            {/* Brand */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 shrink-0 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                <Globe size={18} />
              </div>
              <span className="hidden sm:block text-[15px] font-semibold text-slate-900 tracking-tight whitespace-nowrap">
                BBU1 Network
              </span>
            </div>

            {/* Location trigger — center on desktop, compact on mobile */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex-1 max-w-xs sm:max-w-sm mx-1 flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors text-left min-w-0"
            >
              <MapPin size={15} className="shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium text-slate-400 leading-none">Deliver to</span>
                <span className="block text-[13px] font-semibold text-slate-900 leading-tight truncate">{userLocationLabel}</span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-slate-400" />
            </button>

            {/* Account */}
            <div className="shrink-0">
              {profile ? (
                <Badge className="bg-slate-900 text-white border-none font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <Building2 size={12} />
                  <span className="hidden sm:inline">{profile.business_name}</span>
                </Badge>
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="h-10 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg px-3">
                    <User size={15} className="sm:mr-1.5" />
                    <span className="hidden sm:inline">Log in</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Search — its own row so it always gets full width, on every breakpoint */}
          <div className="pb-3 sm:pb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products, restaurants, homes, hotels or stores…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-lg bg-slate-50 border-slate-200 focus-visible:bg-white text-sm"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ============================= MAIN ============================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8 sm:space-y-10">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-900 text-white px-6 py-10 sm:px-10 sm:py-12">
          <Store className="absolute -right-4 -bottom-8 w-40 h-40 sm:w-56 sm:h-56 text-white/5" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <Badge className="bg-white/10 text-blue-300 border-none font-medium text-[11px] px-2.5 py-1 rounded-md">
              BBU1 Sovereign Super-App
            </Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
              Order anything, near you
            </h1>
            <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed max-w-xl">
              Browse products, restaurant meals, real estate rentals, hotel stays and professional
              services from verified businesses across the BBU1 network.
            </p>
          </div>
        </section>

        {/* CATEGORIES — horizontal scroll on mobile, grid from md up */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Browse categories</h2>
          <div className="flex md:grid md:grid-cols-6 gap-3 overflow-x-auto md:overflow-visible pb-1 -mx-1 px-1 snap-x snap-mandatory md:snap-none scrollbar-none">
            {CATEGORY_TABS.map((cat, i) => {
              const Icon = cat.icon;
              const isActive = industryFilter === cat.id && (i !== 5 || industryFilter === cat.id);
              return (
                <button
                  key={`${cat.id}-${i}`}
                  onClick={() => setIndustryFilter(cat.id)}
                  className={cn(
                    "shrink-0 w-[136px] md:w-auto snap-start p-4 rounded-xl border text-left transition-colors flex flex-col justify-between h-[104px]",
                    industryFilter === cat.id
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-900 hover:border-slate-300"
                  )}
                >
                  <Icon size={18} className={industryFilter === cat.id ? "text-blue-300" : "text-slate-500"} />
                  <span className="font-medium text-[12.5px] leading-snug">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* RESULTS HEADER */}
        <section className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {isLoading ? 'Loading listings' : `${networkItems?.length || 0} listings`}
          </h2>
          {selectedLocation !== 'ALL' && (
            <button
              onClick={() => { setSelectedLocation('ALL'); setUserLocationLabel('Global / All locations'); }}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              Clear location filter <X size={12} />
            </button>
          )}
        </section>

        {/* MARKETPLACE GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading ? (
            <div className="col-span-full py-24 text-center text-slate-400">
              <Loader2 className="animate-spin inline mr-2" size={18} />
              <span className="text-sm font-medium">Scanning the BBU1 network catalog…</span>
            </div>
          ) : networkItems.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <ShoppingBag size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No listings match this location or category yet.</p>
            </div>
          ) : (
            networkItems.map((item: any) => {
              const isOwnItem = buyerBusinessId && buyerBusinessId === item.business_id;

              return (
                <Card
                  key={`${item.business_id}-${item.variant_id}`}
                  onClick={() => setSelectedItem(item)}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-none hover:shadow-md hover:border-slate-300 transition-all bg-white flex flex-col cursor-pointer group"
                >
                  <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {item.primary_media_url ? (
                      isVideoUrl(item.primary_media_url) ? (
                        <video src={item.primary_media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.primary_media_url} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" alt={item.product_name} />
                      )
                    ) : (
                      <ShoppingBag size={40} className="text-slate-300" />
                    )}

                    <span className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                      <Building2 size={11} className="text-blue-300" />
                      {item.business_name}
                    </span>

                    {item.business_location && (
                      <span className="absolute bottom-2.5 left-2.5 bg-white/95 text-slate-700 text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                        <MapPin size={11} className="text-emerald-600" />
                        {item.business_location}
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h3 className="font-semibold text-slate-900 text-[13.5px] leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                      {item.product_name}
                    </h3>

                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-semibold text-slate-900">
                        {item.currency_code} {Number(item.online_price).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400">retail</span>
                    </div>

                    {item.wholesale_price && item.wholesale_price < item.online_price && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1 w-fit">
                        <Zap size={11} /> B2B {item.currency_code} {Number(item.wholesale_price).toLocaleString()}
                      </span>
                    )}

                    {item.online_description && (
                      <p className="text-[12.5px] text-slate-500 line-clamp-2">{item.online_description}</p>
                    )}
                  </div>

                  <div className="p-4 pt-0 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/store/${item.store_slug}`}
                        onClick={e => e.stopPropagation()}
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-[12.5px]">
                          <Store size={13} className="mr-1.5 text-slate-500" /> Visit store
                        </Button>
                      </Link>

                      <Button
                        onClick={(e) => { e.stopPropagation(); sendWhatsAppB2BInquiry(item); }}
                        className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                        title="WhatsApp inquiry"
                      >
                        <MessageSquare size={15} />
                      </Button>
                    </div>

                    <Button
                      disabled={isOwnItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!buyerBusinessId) {
                          return toast.error("Please log in as a business owner to place B2B wholesale orders.");
                        }
                        setB2bOrderItem(item);
                        setB2bQuantity(Number(item.min_b2b_qty || 10));
                      }}
                      className={cn(
                        "w-full h-9 font-medium text-[12.5px] rounded-lg transition-colors",
                        isOwnItem
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      )}
                    >
                      <Zap size={13} className="mr-1.5 text-emerald-400" />
                      {isOwnItem ? "Your store" : "B2B wholesale order"}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </section>
      </main>

      {/* ================= DYNAMIC GPS & CITY LOCATION PICKER MODAL ================= */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden bg-white border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-900">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">Set your delivery location</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 mt-0.5">
              Detect your precise GPS position, or search any city or address worldwide.
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* MAP PREVIEW — shows an exact pin once we have coordinates, not just a city name */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                key={coords ? `${coords.lat}-${coords.lng}` : 'world'}
                title="Location preview map"
                src={mapEmbedUrl}
                className="w-full h-48 sm:h-56 border-0"
                loading="lazy"
              />
              <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11.5px] text-slate-500 truncate">
                  {coords
                    ? `Pinned at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                    : 'No pin yet — detect GPS or search below'}
                </span>
                {coords && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] font-medium text-blue-600 hover:underline shrink-0"
                  >
                    Open full map
                  </a>
                )}
              </div>
            </div>

            {/* GPS DETECT BUTTON */}
            <Button
              onClick={detectGpsLocation}
              disabled={isDetectingGps}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg flex items-center justify-center gap-2"
            >
              {isDetectingGps ? <Loader2 className="animate-spin h-4 w-4" /> : <Crosshair size={16} />}
              {isDetectingGps ? "Locking GPS position…" : "Detect my precise GPS location"}
            </Button>

            <div className="relative flex items-center justify-center">
              <span className="bg-white px-3 text-[11px] font-medium text-slate-400 z-10">or search a city / address</span>
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            </div>

            {/* CUSTOM LOCATION INPUT */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-slate-500">City, address or landmark</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Kampala, London, Nairobi, Dubai…"
                  value={customLocationSearch}
                  onChange={e => setCustomLocationSearch(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 text-sm flex-1"
                />
                <Button
                  onClick={async () => {
                    if (!customLocationSearch.trim()) return;
                    await geocodeCustomLocation(customLocationSearch.trim());
                    setSelectedLocation(customLocationSearch.trim());
                    setUserLocationLabel(customLocationSearch.trim());
                    setIsLocationModalOpen(false);
                    toast.success(`Filter set to ${customLocationSearch}`);
                  }}
                  disabled={isGeocoding}
                  className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm"
                >
                  {isGeocoding ? <Loader2 className="animate-spin h-4 w-4" /> : "Set"}
                </Button>
              </div>
            </div>

            {/* DYNAMICALLY DISCOVERED CITIES FROM DB */}
            {availableLocations.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <Label className="text-[11px] font-medium text-slate-500">Registered merchant hubs</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedLocation('ALL');
                      setUserLocationLabel('Global / All locations');
                      setIsLocationModalOpen(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      selectedLocation === 'ALL' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    All locations
                  </button>

                  {availableLocations.map(loc => (
                    <button
                      key={loc}
                      onClick={async () => {
                        setSelectedLocation(loc);
                        setUserLocationLabel(loc);
                        setIsLocationModalOpen(false);
                        toast.success(`Location set to ${loc}`);
                        geocodeCustomLocation(loc);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1",
                        selectedLocation === loc ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <MapPin size={10} />
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsLocationModalOpen(false)} className="h-10 font-medium text-sm text-slate-500">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= 1. DETAIL SPECS & DUAL MEDIA OVERLAY MODAL ================= */}
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
                  Sold by {selectedItem.business_name}
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2 border-b border-slate-100 pb-5">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">{selectedItem.product_name}</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-900">
                      {selectedItem.currency_code} {Number(selectedItem.online_price).toLocaleString()}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium text-xs px-2.5 py-1">
                      {selectedItem.business_location || 'Location unavailable'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Specifications & description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                    {selectedItem.online_description || "No specific detailed description provided for this item."}
                  </p>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <Link href={`/store/${selectedItem.store_slug}`} className="flex-1">
                  <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm">
                    <ExternalLink size={15} className="mr-2" /> Open seller's storefront
                  </Button>
                </Link>

                <Button
                  onClick={() => sendWhatsAppB2BInquiry(selectedItem)}
                  variant="outline"
                  className="h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg text-sm px-6"
                >
                  <MessageSquare size={15} className="mr-2" /> WhatsApp order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= 2. B2B IN-SYSTEM WHOLESALE PURCHASE MODAL ================= */}
      <Dialog open={!!b2bOrderItem} onOpenChange={open => { if (!open) setB2bOrderItem(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white border border-slate-200 text-slate-900">
          {b2bOrderItem && (
            <div>
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 size={17} className="text-slate-500" /> B2B wholesale order
                </DialogTitle>
                <DialogDescription className="text-[13px] text-slate-500 mt-0.5">
                  Direct in-system stock transfer from <strong className="text-slate-700">{b2bOrderItem.business_name}</strong>
                </DialogDescription>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[13.5px] font-semibold text-slate-900">{b2bOrderItem.product_name}</p>
                  <p className="text-[13px] font-medium text-emerald-700">
                    Wholesale unit price: {b2bOrderItem.currency_code} {Number(b2bOrderItem.wholesale_price || b2bOrderItem.online_price).toLocaleString()}
                  </p>
                  <p className="text-[11.5px] text-slate-400">
                    Available stock at seller: {b2bOrderItem.stock_quantity || 0} units
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-slate-500">Order quantity (units)</Label>
                  <Input
                    type="number"
                    min={Number(b2bOrderItem.min_b2b_qty || 1)}
                    value={b2bQuantity}
                    onChange={e => setB2bQuantity(Math.max(1, Number(e.target.value)))}
                    className="h-12 border-slate-200 rounded-lg font-semibold text-lg text-slate-900"
                  />
                  <p className="text-[11.5px] text-slate-400 text-right">
                    Minimum quantity: {b2bOrderItem.min_b2b_qty || 1} units
                  </p>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400">Total B2B cost</span>
                  <span className="text-lg font-semibold text-emerald-400">
                    {b2bOrderItem.currency_code} {(b2bQuantity * Number(b2bOrderItem.wholesale_price || b2bOrderItem.online_price)).toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-blue-900">
                  <ShieldCheck size={17} className="shrink-0 text-blue-600 mt-0.5" />
                  <p className="text-[12px] leading-snug">
                    Confirming this order automatically generates a purchase order for your business and
                    receives <strong>{b2bQuantity} units</strong> directly into your inventory.
                  </p>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <Button variant="ghost" onClick={() => setB2bOrderItem(null)} className="h-11 font-medium text-sm text-slate-500">
                  Cancel
                </Button>
                <Button
                  onClick={() => b2bTradeMutation.mutate()}
                  disabled={b2bTradeMutation.isPending}
                  className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex-1"
                >
                  {b2bTradeMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : "Confirm B2B wholesale purchase"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}