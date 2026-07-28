'use client';

/**
 * --- BBU1 SOVEREIGN GLOBAL COMMUNITY MARKETPLACE ---
 * VERSION: v13.0 OMEGA (CROSS-BUSINESS DISCOVERY & B2B IN-SYSTEM WHOLESALE ENGINE)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
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
  Layers, Zap, PackageCheck, ArrowRight, CheckCircle2, Lock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const supabase = createClient();

export default function GlobalMarketplacePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('ALL');

  // MODAL STATES
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [b2bOrderItem, setB2bOrderItem] = useState<any | null>(null);
  const [b2bQuantity, setB2bQuantity] = useState<number>(10);

  // 1. DATA: Get Current Logged-In User Profile & Business Context
  const { data: profile } = useQuery({
    queryKey: ['active_profile_marketplace'],
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
    queryKey: ['global_bbu1_marketplace', searchTerm, industryFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_global_bbu1_marketplace', {
        p_search_query: searchTerm,
        p_industry_filter: industryFilter,
        p_limit: 60,
        p_offset: 0
      });

      if (error) {
        toast.error(`Marketplace Fetch Error: ${error.message}`);
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
          buyer_variant_id: null, // Automatic inventory mapping
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
      queryClient.invalidateQueries({ queryKey: ['global_bbu1_marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['online_products_managed'] });
    },
    onError: (err: any) => toast.error(`B2B Trade Failed: ${err.message}`)
  });

  const sendWhatsAppB2BInquiry = (item: any) => {
    const text = `Hello *${item.business_name}*!\n\nI saw your listing on the *BBU1 Global Network Marketplace*:\n📦 *${item.product_name}*\nPrice: ${item.currency_code} ${Number(item.online_price).toLocaleString()}\nWholesale Rate: ${item.currency_code} ${Number(item.wholesale_price).toLocaleString()}\nRef SKU: ${item.sku || 'N/A'}\n\nI would like to place a B2B order or inquire about availability.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <Toaster position="top-center" />

      {/* GLOBAL NETWORK HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg">
              <Globe size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">BBU1 Global Marketplace</h1>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} /> Unified Cross-Business Network
              </p>
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
                  Merchant Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">

        {/* HERO BANNER */}
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[200px]">
          <Store className="absolute -right-6 -bottom-6 w-48 h-48 text-blue-500/10 rotate-12" />
          <div className="relative z-10 space-y-2">
            <Badge className="bg-blue-600 text-white font-bold text-[9px] uppercase px-3 py-1 border-none">
              Cross-Business Ecosystem & B2B Trading
            </Badge>
            <h2 className="text-3xl font-black uppercase tracking-tight">Sovereign Business Community Directory</h2>
            <p className="text-xs text-slate-300 font-medium max-w-xl">
              Discover verified products, real estate listings, hotel stays, and professional services. Buy retail or place bulk B2B wholesale orders directly from fellow BBU1 merchants.
            </p>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH & INDUSTRY TABS */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search products, houses, hotels, or merchant names..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-11 h-12 rounded-2xl font-bold bg-white border-slate-200 shadow-sm"
            />
          </div>

          {/* FILTER TABS */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Listings', icon: Layers },
              { id: 'RETAIL', label: 'Retail & Goods', icon: ShoppingBag },
              { id: 'REAL_ESTATE_RENTALS', label: 'Real Estate & Rentals', icon: Home },
              { id: 'HOTEL_AIRBNB', label: 'Hotels & Airbnb', icon: Hotel },
              { id: 'SERVICES_BOOKING', label: 'Services & Consultations', icon: Briefcase }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = industryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setIndustryFilter(tab.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border",
                    isActive 
                      ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MARKETPLACE GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="animate-spin inline mr-2 text-blue-600" /> 
              Scanning BBU1 Sovereign Network Catalog...
            </div>
          ) : networkItems.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs">
              No matching listings found in the global community catalog.
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
                        <img src={item.primary_media_url} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" alt={item.product_name} />
                      ) : (
                        <ShoppingBag size={48} className="text-slate-300 opacity-40" />
                      )}

                      <Badge className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white font-bold text-[9px] uppercase border-none px-2.5 py-1 flex items-center gap-1 shadow-md">
                        <Building2 size={10} className="text-blue-400" />
                        {item.business_name}
                      </Badge>

                      {isOwnItem && (
                        <Badge className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-black text-[9px] uppercase border-none px-2 py-0.5 shadow-md">
                          Your Store
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
                        
                        <p className="text-xs font-black text-emerald-600 uppercase flex items-center gap-1">
                          <Zap size={12} /> B2B Wholesale: {item.currency_code} {Number(item.wholesale_price || item.online_price).toLocaleString()}
                        </p>
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
                          <Store size={14} className="mr-1 text-blue-600" /> Store
                        </Button>
                      </Link>

                      <Button 
                        onClick={(e) => { e.stopPropagation(); sendWhatsAppB2BInquiry(item); }}
                        className="h-10 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                      >
                        <MessageSquare size={16} />
                      </Button>
                    </div>

                    {/* B2B WHOLESALE ACTION BUTTON */}
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
                        "w-full h-11 font-black uppercase text-xs rounded-xl tracking-wider shadow-md transition-all",
                        isOwnItem 
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none" 
                          : "bg-slate-900 hover:bg-black text-white"
                      )}
                    >
                      <Zap size={14} className="mr-1.5 text-emerald-400" />
                      {isOwnItem ? "Your Listing" : "B2B Wholesale Order"}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

      </main>

      {/* 1. DETAIL SPECS MODAL */}
      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <div>
              <div className="h-64 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                {selectedItem.primary_media_url ? (
                  <img src={selectedItem.primary_media_url} className="w-full h-full object-cover" alt={selectedItem.product_name} />
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
                      B2B Rate: {selectedItem.currency_code} {Number(selectedItem.wholesale_price || selectedItem.online_price).toLocaleString()}
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
                  onClick={() => {
                    if (!buyerBusinessId) return toast.error("Log in as a merchant to place B2B wholesale orders.");
                    setB2bOrderItem(selectedItem);
                    setB2bQuantity(Number(selectedItem.min_b2b_qty || 10));
                    setSelectedItem(null);
                  }}
                  variant="outline" 
                  className="h-12 border-slate-900 bg-slate-900 text-white hover:bg-black font-bold rounded-2xl uppercase text-xs px-6"
                >
                  <Zap size={16} className="mr-2 text-emerald-400" /> B2B Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. B2B IN-SYSTEM WHOLESALE PURCHASE MODAL */}
      <Dialog open={!!b2bOrderItem} onOpenChange={open => { if (!open) setB2bOrderItem(null); }}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
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