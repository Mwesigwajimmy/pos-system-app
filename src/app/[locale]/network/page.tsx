'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

import {
  Search, Globe, Store, ShoppingBag, Home,
  Hotel, ExternalLink, MessageSquare,
  ShieldCheck, Loader2, Building2,
  Layers, Zap, MapPin, UtensilsCrossed, Stethoscope, ShoppingCart, User,
  Crosshair, X, ChevronRight, Minus, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const supabase = createClient();

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

const CATEGORY_TABS = [
  { key: 'ALL', filter: 'ALL', label: 'All', icon: Layers },
  { key: 'RETAIL', filter: 'RETAIL', label: 'Shops', icon: ShoppingCart },
  { key: 'FOOD', filter: 'SERVICES_BOOKING', label: 'Food', icon: UtensilsCrossed },
  { key: 'RENTALS', filter: 'REAL_ESTATE_RENTALS', label: 'Rentals', icon: Home },
  { key: 'HOTELS', filter: 'HOTEL_AIRBNB', label: 'Hotels', icon: Hotel },
  { key: 'HEALTH', filter: 'SERVICES_BOOKING', label: 'Health', icon: Stethoscope },
];

interface PinnedLocation {
  label: string;
  city: string;
  lat: number;
  lng: number;
  detail?: string;
}

const money = (currency: string, value: any) =>
  `${currency || 'UGX'} ${Number(value || 0).toLocaleString()}`;

const mapUrl = (lat?: number, lng?: number) =>
  lat != null && lng != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.006}%2C${lat - 0.004}%2C${lng + 0.006}%2C${lat + 0.004}&layer=mapnik&marker=${lat}%2C${lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=-30%2C-40%2C60%2C55&layer=mapnik`;

function buildAddress(address: any) {
  const street = address.road || address.pedestrian || address.residential || '';
  const area = address.neighbourhood || address.suburb || address.quarter || address.city_district || address.village || '';
  const city = address.city || address.town || address.municipality || address.county || address.state || '';
  const country = address.country || '';

  const parts = [street, area, city].filter(Boolean);
  const unique = parts.filter((part, i) => parts.indexOf(part) === i);

  return {
    label: unique.join(', ') || city || 'Selected location',
    city: city || area || '',
    detail: [area, city, country].filter(Boolean).filter((p, i, arr) => arr.indexOf(p) === i).join(' · '),
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<PinnedLocation> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    if (data?.address) {
      const built = buildAddress(data.address);
      return { ...built, lat, lng };
    }
  } catch (e) {
    // falls through to the backup lookup
  }

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision || '';
    const area = data.localityInfo?.administrative?.slice(-1)?.[0]?.name || '';
    return {
      label: [area, city].filter(Boolean).join(', ') || 'Selected location',
      city,
      detail: [city, data.countryName].filter(Boolean).join(' · '),
      lat,
      lng,
    };
  } catch (e) {
    return { label: 'Selected location', city: '', lat, lng };
  }
}

async function searchAddresses(query: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`
  );
  const data = await res.json();
  return (data || []).map((row: any) => {
    const built = buildAddress(row.address || {});
    return {
      label: built.label,
      city: built.city,
      detail: row.display_name as string,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lon),
    } as PinnedLocation;
  });
}

function LocationPicker({
  open,
  onOpenChange,
  pinned,
  merchantHubs,
  activeCity,
  onApply,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinned: PinnedLocation | null;
  merchantHubs: string[];
  activeCity: string;
  onApply: (location: PinnedLocation) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<PinnedLocation | null>(pinned);
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<PinnedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(pinned);
      setQueryText('');
      setResults([]);
    }
  }, [open, pinned]);

  useEffect(() => {
    const term = queryText.trim();
    if (term.length < 3) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchAddresses(term);
        if (!cancelled) setResults(found);
      } catch (e) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [queryText]);

  const detectGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location detection");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const resolved = await reverseGeocode(latitude, longitude);
        setDraft(resolved);
        setResults([]);
        setQueryText('');
        setIsDetecting(false);
      },
      () => {
        setIsDetecting(false);
        toast.error("Location access was blocked. Search for your area instead.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <div className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-base font-semibold text-slate-900">Set your location</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-slate-500">
            We use this to show what is available near you
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            <iframe
              key={draft ? `${draft.lat}-${draft.lng}` : 'world'}
              title="Map"
              src={mapUrl(draft?.lat, draft?.lng)}
              className="h-44 w-full border-0 sm:h-52"
              loading="lazy"
            />
            <Button
              onClick={detectGpsLocation}
              disabled={isDetecting}
              className="absolute bottom-3 right-3 h-9 rounded-lg bg-white px-3 text-xs font-medium text-slate-900 shadow-md hover:bg-slate-50"
            >
              {isDetecting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Crosshair size={14} className="mr-2" />}
              Use my location
            </Button>
          </div>

          {draft ? (
            <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <MapPin size={16} className="mt-0.5 shrink-0 text-slate-900" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{draft.label}</p>
                {draft.detail ? <p className="truncate text-xs text-slate-500">{draft.detail}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Search an area, street or landmark</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Kabalagala, Ntinda, Garden City"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 pl-9 text-sm"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                ) : null}
              </div>
            </div>

            {results.length > 0 ? (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {results.map((result, i) => (
                  <button
                    key={`${result.lat}-${result.lng}-${i}`}
                    onClick={() => {
                      setDraft(result);
                      setResults([]);
                      setQueryText('');
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-900">{result.label}</span>
                      <span className="block truncate text-xs text-slate-400">{result.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {merchantHubs.length > 0 ? (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Label className="text-xs font-medium text-slate-500">Areas with sellers</Label>
                <div className="flex flex-wrap gap-2">
                  {merchantHubs.map(hub => (
                    <button
                      key={hub}
                      onClick={async () => {
                        const found = await searchAddresses(hub);
                        onApply(found[0] || { label: hub, city: hub, lat: 0, lng: 0 });
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        activeCity === hub
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {hub}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4">
          <Button
            variant="ghost"
            onClick={() => { onClear(); onOpenChange(false); }}
            className="h-11 rounded-lg text-sm font-medium text-slate-500"
          >
            Show all areas
          </Button>
          <Button
            disabled={!draft}
            onClick={() => draft && onApply(draft)}
            className="h-11 flex-1 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 sm:flex-none sm:px-6"
          >
            Use this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GlobalNetworkSuperAppPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const [pinnedLocation, setPinnedLocation] = useState<PinnedLocation | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [b2bOrderItem, setB2bOrderItem] = useState<any | null>(null);
  const [b2bQuantity, setB2bQuantity] = useState<number>(10);

  const industryFilter = CATEGORY_TABS.find(t => t.key === activeTab)?.filter || 'ALL';

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
        toast.error("Listings could not load. Pull to refresh or try again.");
        return [];
      }
      return data || [];
    }
  });

  const items = networkItems || [];

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    items.forEach((item: any) => {
      if (item.business_location) locs.add(item.business_location.trim());
    });
    return Array.from(locs);
  }, [items]);

  const applyLocation = (location: PinnedLocation) => {
    setPinnedLocation(location);
    setSelectedLocation(location.city || location.label);
    setIsLocationModalOpen(false);
    toast.success(`Showing sellers near ${location.city || location.label}`);
  };

  const clearLocation = () => {
    setPinnedLocation(null);
    setSelectedLocation('ALL');
  };

  const b2bTradeMutation = useMutation({
    mutationFn: async () => {
      if (!buyerBusinessId) {
        throw new Error("Log in as a business owner to place wholesale orders.");
      }
      if (!b2bOrderItem) throw new Error("No item selected.");

      if (buyerBusinessId === b2bOrderItem.business_id) {
        throw new Error("This is your own store.");
      }

      if (b2bQuantity < Number(b2bOrderItem.min_b2b_qty || 1)) {
        throw new Error(`The minimum order is ${b2bOrderItem.min_b2b_qty || 1} units.`);
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
      toast.success(`Order placed. Reference ${data?.b2b_trade_uid || ''}`);
      setB2bOrderItem(null);
      queryClient.invalidateQueries({ queryKey: ['global_bbu1_network_superapp'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const sendWhatsAppInquiry = (item: any) => {
    const lines = [
      `Hello ${item.business_name},`,
      ``,
      `I saw this on the BBU1 Network:`,
      `${item.product_name}`,
      `Price: ${money(item.currency_code, item.online_price)}`,
      item.business_location ? `Location: ${item.business_location}` : '',
      ``,
      `Is it available?`
    ].filter(Boolean);

    const phone = String(item.business_phone || item.whatsapp_number || '').replace(/\D/g, '');
    const base = phone ? `https://wa.me/${phone}` : `https://wa.me/`;
    window.open(`${base}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const b2bUnitPrice = Number(b2bOrderItem?.wholesale_price || b2bOrderItem?.online_price || 0);
  const b2bMinQty = Number(b2bOrderItem?.min_b2b_qty || 1);
  const b2bStock = Number(b2bOrderItem?.stock_quantity || 0);
  const b2bBelowMin = b2bQuantity < b2bMinQty;
  const b2bOverStock = b2bStock > 0 && b2bQuantity > b2bStock;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 antialiased">
      <Toaster position="top-center" />

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Globe size={16} />
              </div>
              <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-slate-900">
                BBU1 Network
              </span>
            </div>

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden min-w-0 max-w-sm flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:bg-slate-50 md:flex"
            >
              <MapPin size={15} className="shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium leading-none text-slate-400">Delivering to</span>
                <span className="block truncate text-[13px] font-medium leading-tight text-slate-900">
                  {pinnedLocation?.label || 'All areas'}
                </span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-slate-400" />
            </button>

            <div className="shrink-0">
              {profile ? (
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                  <Building2 size={14} className="text-slate-500" />
                  <span className="hidden max-w-[140px] truncate text-xs font-medium text-slate-700 sm:block">
                    {profile.business_name}
                  </span>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="outline" className="h-9 rounded-lg border-slate-200 px-3 text-xs font-medium">
                    <User size={15} className="sm:mr-1.5" />
                    <span className="hidden sm:inline">Log in</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left md:hidden"
          >
            <MapPin size={15} className="shrink-0 text-slate-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium leading-none text-slate-400">Delivering to</span>
              <span className="block truncate text-[13px] font-medium leading-tight text-slate-900">
                {pinnedLocation?.label || 'All areas'}
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-slate-400" />
          </button>

          <div className="pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search food, shops, homes or hotels"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50 pl-10 text-sm focus-visible:bg-white"
              />
              {searchInput ? (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <section>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {CATEGORY_TABS.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveTab(cat.key)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-colors",
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  <Icon size={20} className={isActive ? "text-white" : "text-slate-500"} />
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {pinnedLocation ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-stretch">
              <iframe
                key={`${pinnedLocation.lat}-${pinnedLocation.lng}`}
                title="Your location"
                src={mapUrl(pinnedLocation.lat, pinnedLocation.lng)}
                className="h-24 w-28 shrink-0 border-0 sm:h-28 sm:w-44"
                loading="lazy"
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Your location</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{pinnedLocation.label}</p>
                  {pinnedLocation.detail ? (
                    <p className="truncate text-xs text-slate-500">{pinnedLocation.detail}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="h-8 rounded-lg border-slate-200 px-3 text-xs font-medium"
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={clearLocation}
                    className="h-8 rounded-lg px-3 text-xs font-medium text-slate-500"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">
            {isLoading ? 'Loading' : `${items.length} listing${items.length === 1 ? '' : 's'}`}
            {selectedLocation !== 'ALL' ? ` in ${selectedLocation}` : ''}
          </h2>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            <div className="col-span-full py-24 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-400">Loading listings</p>
            </div>
          ) : items.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <ShoppingBag size={28} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Nothing here yet</p>
              <p className="mt-1 text-sm text-slate-400">Try another category or widen your area</p>
              {selectedLocation !== 'ALL' ? (
                <Button
                  variant="outline"
                  onClick={clearLocation}
                  className="mt-5 h-9 rounded-lg border-slate-200 px-4 text-xs font-medium"
                >
                  Show all areas
                </Button>
              ) : null}
            </div>
          ) : (
            items.map((item: any) => {
              const isOwnItem = buyerBusinessId && buyerBusinessId === item.business_id;
              const hasWholesale = item.wholesale_price && item.wholesale_price < item.online_price;

              return (
                <Card
                  key={`${item.business_id}-${item.variant_id}`}
                  onClick={() => setSelectedItem(item)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none transition-colors hover:border-slate-300"
                >
                  <div className="relative flex h-32 items-center justify-center overflow-hidden bg-slate-100 sm:h-40">
                    {item.primary_media_url ? (
                      isVideoUrl(item.primary_media_url) ? (
                        <video src={item.primary_media_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        <img src={item.primary_media_url} className="h-full w-full object-cover" alt={item.product_name} />
                      )
                    ) : (
                      <ShoppingBag size={32} className="text-slate-300" />
                    )}

                    {item.business_location ? (
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        <MapPin size={9} />
                        {item.business_location}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="truncate text-[11px] text-slate-400">{item.business_name}</p>
                    <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-slate-900">
                      {item.product_name}
                    </h3>
                    <p className="text-sm font-semibold text-slate-900">
                      {money(item.currency_code, item.online_price)}
                    </p>
                    {hasWholesale ? (
                      <p className="text-[11px] font-medium text-emerald-700">
                        Wholesale {money(item.currency_code, item.wholesale_price)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 p-3 pt-0">
                    <div className="flex gap-2">
                      <Link
                        href={`/store/${item.store_slug}`}
                        onClick={e => e.stopPropagation()}
                        className="flex-1"
                      >
                        <Button variant="outline" className="h-9 w-full rounded-lg border-slate-200 text-xs font-medium">
                          <Store size={13} className="mr-1.5 text-slate-500" />
                          Store
                        </Button>
                      </Link>
                      <Button
                        onClick={(e) => { e.stopPropagation(); sendWhatsAppInquiry(item); }}
                        variant="outline"
                        className="h-9 w-9 shrink-0 rounded-lg border-slate-200 p-0"
                        aria-label="Ask on WhatsApp"
                      >
                        <MessageSquare size={14} className="text-emerald-600" />
                      </Button>
                    </div>

                    <Button
                      disabled={!!isOwnItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!buyerBusinessId) {
                          toast.error("Log in as a business owner to order wholesale");
                          return;
                        }
                        setB2bOrderItem(item);
                        setB2bQuantity(Number(item.min_b2b_qty || 10));
                      }}
                      className={cn(
                        "h-9 w-full rounded-lg text-xs font-medium",
                        isOwnItem
                          ? "cursor-not-allowed bg-slate-100 text-slate-400"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {isOwnItem ? "Your store" : "Order wholesale"}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </section>
      </main>

      <LocationPicker
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        pinned={pinnedLocation}
        merchantHubs={availableLocations}
        activeCity={selectedLocation}
        onApply={applyLocation}
        onClear={clearLocation}
      />

      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-2xl">
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

              <div className="space-y-5 px-5 py-5 sm:px-7">
                <div>
                  <p className="text-sm text-slate-500">{selectedItem.business_name}</p>
                  <DialogTitle className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    {selectedItem.product_name}
                  </DialogTitle>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-xl font-semibold text-slate-900">
                      {money(selectedItem.currency_code, selectedItem.online_price)}
                    </span>
                    {selectedItem.business_location ? (
                      <Badge variant="secondary" className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <MapPin size={11} className="mr-1" />
                        {selectedItem.business_location}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {selectedItem.online_description ? (
                  <div className="space-y-2 border-t border-slate-100 pt-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Details</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {selectedItem.online_description}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:px-7">
                <Link href={`/store/${selectedItem.store_slug}`} className="flex-1">
                  <Button className="h-11 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800">
                    <ExternalLink size={15} className="mr-2" />
                    Visit store
                  </Button>
                </Link>
                <Button
                  onClick={() => sendWhatsAppInquiry(selectedItem)}
                  variant="outline"
                  className="h-11 rounded-lg border-slate-200 px-6 text-sm font-medium"
                >
                  <MessageSquare size={15} className="mr-2 text-emerald-600" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!b2bOrderItem} onOpenChange={open => { if (!open) setB2bOrderItem(null); }}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-0 sm:max-w-md">
          {b2bOrderItem && (
            <div>
              <div className="border-b border-slate-200 px-5 py-4">
                <DialogTitle className="text-base font-semibold text-slate-900">Wholesale order</DialogTitle>
                <DialogDescription className="mt-0.5 text-sm text-slate-500">
                  From {b2bOrderItem.business_name}
                </DialogDescription>
              </div>

              <div className="space-y-5 px-5 py-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{b2bOrderItem.product_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {money(b2bOrderItem.currency_code, b2bUnitPrice)} per unit
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {b2bStock} unit{b2bStock === 1 ? '' : 's'} in stock · minimum order {b2bMinQty}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setB2bQuantity(q => Math.max(1, q - 1))}
                      className="h-11 w-11 shrink-0 rounded-lg border-slate-200 p-0"
                      aria-label="Decrease"
                    >
                      <Minus size={15} />
                    </Button>
                    <Input
                      type="number"
                      min={b2bMinQty}
                      value={b2bQuantity}
                      onChange={e => setB2bQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="h-11 rounded-lg border-slate-200 text-center text-base font-medium tabular-nums"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setB2bQuantity(q => q + 1)}
                      className="h-11 w-11 shrink-0 rounded-lg border-slate-200 p-0"
                      aria-label="Increase"
                    >
                      <Plus size={15} />
                    </Button>
                  </div>
                  {b2bBelowMin ? (
                    <p className="text-xs text-red-600">Minimum order is {b2bMinQty} units</p>
                  ) : null}
                  {b2bOverStock ? (
                    <p className="text-xs text-red-600">Only {b2bStock} units are in stock</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">
                    {money(b2bOrderItem.currency_code, b2bQuantity * b2bUnitPrice)}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    A purchase order is created for your business and the stock is added to your inventory.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-slate-200 px-5 py-4">
                <Button
                  variant="ghost"
                  onClick={() => setB2bOrderItem(null)}
                  className="h-11 rounded-lg text-sm font-medium text-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => b2bTradeMutation.mutate()}
                  disabled={b2bTradeMutation.isPending || b2bBelowMin || b2bOverStock}
                  className="h-11 flex-1 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {b2bTradeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Place order
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}