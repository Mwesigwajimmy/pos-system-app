'use client';

/**
 * --- BBU1 SOVEREIGN GLOBAL NETWORK SUPER-APP ---
 * VERSION: v18.0 OMEGA (GLOVO-STYLE CATEGORY TILES, LOCATION DISCOVERY & B2B WHOLESALE)
 * JURISDICTION: Supermarket, Restaurants, Real Estate, Hotels & Professional Services
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

import { 
  Search, Globe, Store, ShoppingBag, Home, 
  Hotel, Briefcase, ExternalLink, MessageSquare, 
  ShieldCheck, Loader2, Sparkles, Building2, Tag, 
  Layers, Zap, PackageCheck, ArrowRight, CheckCircle2, Lock,
  MapPin, UtensilsCrossed, Stethoscope, ShoppingCart, User, ChevronDown
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

export default function GlobalNetworkSuperAppPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  // MODAL STATES
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [b2bOrderItem, setB2bOrderItem] = useState<any | null>(null);
  const [b2bQuantity, setB2bQuantity] = useState<number>(10);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <Toaster position="top-center" />

      {/* GLOVO-STYLE HEADER BAR WITH LOCATION SELECTOR */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg">
              <Globe size={20} />
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">BBU1 Network</h1>
              
              {/* LOCATION SELECTOR */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                <MapPin size={12} className="text-emerald-400 shrink-0" />
                <span>Deliver to:</span>
                <select 
                  value={selectedLocation} 
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="bg-slate-800 text-emerald-400 font-bold text-xs rounded-lg px-2 py-0.5 border border-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Cities / Global</option>
                  <option value="Kampala">Kampala, Uganda</option>
                  <option value="Ntinda">Ntinda, Kampala</option>
                  <option value="Entebbe">Entebbe, Uganda</option>
                  <option value="Jinja">Jinja, Uganda</option>
                  <option value="Nairobi">Nairobi, Kenya</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <Badge className="bg-slate-800 text-blue-400 border border-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Building2 size={12} /> {profile.business_name}
              </Badge>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="h-11 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 font-bold text-xs rounded-xl">
                  <User size={14} className="mr-1.5" /> Login / Register
                </Button>
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-10">

        {/* HERO BANNER */}
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px]">
          <Store className="absolute -right-6 -bottom-6 w-48 h-48 text-blue-500/10 rotate-12" />
          <div className="relative z-10 space-y-2">
            <Badge className="bg-blue-600 text-white font-bold text-[9px] uppercase px-3 py-1 border-none">
              BBU1 Sovereign Super-App
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Order Anything Near You</h2>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
              Explore products, restaurant meals, real estate rentals, hotel stays, and professional services from verified businesses across BBU1.
            </p>
          </div>
        </div>

        {/* GLOVO-STYLE VISUAL CATEGORY HUBS GRID */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Explore Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { id: 'ALL', label: 'All Items', icon: Layers, color: 'bg-blue-600' },
              { id: 'RETAIL', label: 'Supermarkets & Retail', icon: ShoppingCart, color: 'bg-emerald-600' },
              { id: 'SERVICES_BOOKING', label: 'Kitchens & Services', icon: UtensilsCrossed, color: 'bg-amber-600' },
              { id: 'REAL_ESTATE_RENTALS', label: 'Real Estate & Rentals', icon: Home, color: 'bg-teal-600' },
              { id: 'HOTEL_AIRBNB', label: 'Hotels & Airbnb', icon: Hotel, color: 'bg-purple-600' },
              { id: 'SERVICES_BOOKING', label: 'Pharmacies & Health', icon: Stethoscope, color: 'bg-rose-600' },
            ].map(cat => {
              const Icon = cat.icon;
              const isActive = industryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setIndustryFilter(cat.id)}
                  className={cn(
                    "p-5 rounded-3xl border text-left transition-all flex flex-col justify-between h-32 relative overflow-hidden group",
                    isActive 
                      ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105" 
                      : "bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:shadow-md"
                  )}
                >
                  <div className={cn("p-2.5 rounded-2xl w-fit text-white shadow-md", cat.color)}>
                    <Icon size={18} />
                  </div>
                  <span className="font-black text-xs uppercase leading-tight group-hover:text-blue-500 transition-colors">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search items, restaurants, houses, hotels, or stores..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-11 h-12 rounded-2xl font-bold bg-white border-slate-200 shadow-sm"
            />
          </div>
        </div>

        {/* MARKETPLACE SUPER-APP GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="animate-spin inline mr-2 text-blue-600" /> 
              Scanning BBU1 Sovereign Network Catalog...
            </div>
          ) : networkItems.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs">
              No matching listings found in this location or category.
            </div>
          ) : (
            networkItems.map((item: any) => {
              const isOwnItem = buyerBusinessId && buyerBusinessId === item.business_id;

              return (
                <Card 
                  key={`${item.business_id}-${item.variant_id}`}
                  onClick={() => setSelectedItem(item)}
                  className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all bg-white flex flex-col justify-between cursor-pointer group relative"
                >
                  <div>
                    <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {item.primary_media_url ? (
                        isVideoUrl(item.primary_media_url) ? (
                          <video src={item.primary_media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.primary_media_url} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" alt={item.product_name} />
                        )
                      ) : (
                        <ShoppingBag size={48} className="text-slate-300 opacity-40" />
                      )}

                      <Badge className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white font-bold text-[9px] uppercase border-none px-2.5 py-1 flex items-center gap-1 shadow-md">
                        <Building2 size={10} className="text-blue-400" />
                        {item.business_name}
                      </Badge>

                      {item.business_location && (
                        <Badge className="absolute bottom-3 left-3 bg-slate-900/80 text-emerald-400 font-bold text-[9px] uppercase backdrop-blur-md border-none flex items-center gap-1">
                          <MapPin size={10} />
                          {item.business_location}
                        </Badge>
                      )}
                    </div>

                    <div className="p-6 space-y-2">
                      <h3 className="font-black text-slate-900 text-sm uppercase leading-snug group-hover:text-blue-600 transition-colors">
                        {item.product_name}
                      </h3>

                      <div className="flex flex-col gap-0.5">
                        <p className="text-lg font-black text-blue-600">
                          {item.currency_code} {Number(item.online_price).toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-medium"> (Retail)</span>
                        </p>
                        
                        {item.wholesale_price && item.wholesale_price < item.online_price && (
                          <p className="text-xs font-black text-emerald-600 uppercase flex items-center gap-1">
                            <Zap size={12} /> B2B Rate: {item.currency_code} {Number(item.wholesale_price).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {item.online_description && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-2">{item.online_description}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link 
                        href={`/store/${item.store_slug}`} 
                        onClick={e => e.stopPropagation()}
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full h-10 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl text-xs uppercase">
                          <Store size={14} className="mr-1 text-blue-600" /> Visit Store
                        </Button>
                      </Link>

                      <Button 
                        onClick={(e) => { e.stopPropagation(); sendWhatsAppB2BInquiry(item); }}
                        className="h-10 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                      >
                        <MessageSquare size={16} />
                      </Button>
                    </div>

                    {/* B2B WHOLESALE BUTTON FOR MERCHANTS */}
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
                        "w-full h-10 font-black uppercase text-xs rounded-xl tracking-wider shadow-sm transition-all",
                        isOwnItem 
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none" 
                          : "bg-slate-900 hover:bg-black text-white"
                      )}
                    >
                      <Zap size={14} className="mr-1.5 text-emerald-400" />
                      {isOwnItem ? "Your Store" : "B2B Wholesale Order"}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

      </main>

      {/* 1. DETAIL SPECS & DUAL MEDIA OVERLAY MODAL */}
      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl max-h-[90vh] overflow-y-auto text-slate-900">
          {selectedItem && (
            <div>
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
                  Sold by {selectedItem.business_name}
                </Badge>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedItem.product_name}</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-2xl font-black text-blue-600">
                      {selectedItem.currency_code} {Number(selectedItem.online_price).toLocaleString()}
                    </p>
                    <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs uppercase border-none px-3 py-1">
                      Location: {selectedItem.business_location || 'Kampala, Uganda'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Specifications & Description</h4>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                    {selectedItem.online_description || "No specific detailed description provided for this item."}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
                <Link href={`/store/${selectedItem.store_slug}`} className="flex-1">
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl uppercase text-xs shadow-xl">
                    <ExternalLink size={16} className="mr-2" /> Open Seller's Storefront
                  </Button>
                </Link>

                <Button 
                  onClick={() => sendWhatsAppB2BInquiry(selectedItem)}
                  variant="outline" 
                  className="h-12 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl uppercase text-xs px-6"
                >
                  <MessageSquare size={16} className="mr-2" /> WhatsApp Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. B2B IN-SYSTEM WHOLESALE PURCHASE MODAL */}
      <Dialog open={!!b2bOrderItem} onOpenChange={open => { if (!open) setB2bOrderItem(null); }}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl text-slate-900">
          {b2bOrderItem && (
            <div>
              <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
                <Building2 size={40} className="mx-auto mb-2 text-emerald-400" />
                <DialogTitle className="text-xl font-black uppercase tracking-wider">B2B Wholesale Order</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">
                  Direct In-System Stock Transfer from <strong className="text-blue-400">{b2bOrderItem.business_name}</strong>
                </DialogDescription>
              </div>

              <div className="p-8 space-y-6 bg-white">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-xs font-black uppercase text-slate-900">{b2bOrderItem.product_name}</p>
                  <p className="text-xs font-bold text-emerald-600">
                    Wholesale Unit Price: {b2bOrderItem.currency_code} {Number(b2bOrderItem.wholesale_price || b2bOrderItem.online_price).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Available Stock at Seller: {b2bOrderItem.stock_quantity || 0} Units
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Order Quantity (Units) *</Label>
                  <Input 
                    type="number" 
                    min={Number(b2bOrderItem.min_b2b_qty || 1)}
                    value={b2bQuantity} 
                    onChange={e => setB2bQuantity(Math.max(1, Number(e.target.value)))} 
                    className="h-12 border-slate-200 rounded-2xl font-black text-xl text-slate-900" 
                  />
                  <p className="text-[10px] font-bold text-slate-400 text-right">
                    Min Quantity: {b2bOrderItem.min_b2b_qty || 1} Units
                  </p>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total B2B Cost</span>
                  <span className="text-xl font-black text-emerald-400">
                    {b2bOrderItem.currency_code} {(b2bQuantity * Number(b2bOrderItem.wholesale_price || b2bOrderItem.online_price)).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-blue-900">
                  <ShieldCheck size={18} className="shrink-0 text-blue-600 mt-0.5" />
                  <p className="text-[11px] font-medium leading-snug">
                    Confirming this order automatically generates a <strong>Purchase Order</strong> for your business and receives <strong>{b2bQuantity} units</strong> directly into your inventory!
                  </p>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button variant="ghost" onClick={() => setB2bOrderItem(null)} className="h-12 font-bold uppercase text-xs text-slate-400">
                  Cancel
                </Button>
                <Button 
                  onClick={() => b2bTradeMutation.mutate()} 
                  disabled={b2bTradeMutation.isPending} 
                  className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl uppercase text-xs flex-1"
                >
                  {b2bTradeMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Confirm B2B Wholesale Purchase"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}