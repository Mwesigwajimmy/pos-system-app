'use client';

/**
 * --- BBU1 SOVEREIGN PUBLIC CUSTOMER STOREFRONT ---
 * VERSION: v10.0 OMEGA (PUBLIC CHECKOUT & PHYSICAL STOCK DEDUCTION)
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';

import { 
  ShoppingBag, Search, CheckCircle2, Loader2, 
  Store, MessageSquare, CreditCard, Smartphone, 
  MapPin, Phone, Mail, ArrowRight, ShieldCheck, 
  X, Plus, Minus, Lock, Sparkles, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const supabase = createClient();

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

  // CHECKOUT FORM STATE
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentGateway, setPaymentGateway] = useState('MTN_MOMO');

  // 1. DATA: Fetch Storefront Settings by Slug
  const { data: storeConfig, isLoading: isStoreLoading } = useQuery({
    queryKey: ['public_store_config', slug],
    queryFn: async () => {
      // Try storefront_settings table by slug
      const { data, error } = await supabase
        .from('storefront_settings')
        .select('*')
        .eq('store_slug', slug.toLowerCase())
        .maybeSingle();

      if (data) return data;

      // Fallback: Check tenants by storefront_slug
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, name, currency, currency_code, whatsapp_number, official_email')
        .or(`storefront_slug.eq.${slug.toLowerCase()},name.ilike.%${slug}%`)
        .maybeSingle();

      if (tenantData) {
        return {
          business_id: tenantData.id,
          store_name: tenantData.name,
          store_slug: slug,
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

  // 2. DATA: Fetch Published Public Products Catalog
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['public_store_catalog', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      // Call public catalog RPC
      const { data, error } = await supabase.rpc('fn_get_public_storefront_catalog', {
        p_business_id: businessId
      });

      if (!error && data && data.length > 0) return data;

      // Fallback: Query product_variants directly
      const { data: directData } = await supabase
        .from('product_variants')
        .select(`
          id, product_id, name, sku, barcode, price, selling_price, online_price,
          stock_quantity, primary_media_url,
          products ( name, currency_code )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      return (directData || []).map((pv: any) => ({
        variant_id: pv.id,
        product_id: pv.product_id,
        product_name: `${pv.products?.name || ''} ${pv.name === 'Standard' ? '' : `(${pv.name})`}`.trim() || 'Product Asset',
        sku: pv.sku,
        price: Number(pv.online_price || pv.selling_price || pv.price || 0),
        stock_quantity: Number(pv.stock_quantity || 0),
        primary_media_url: pv.primary_media_url,
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

  const addToCart = (product: any) => {
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

  // CHECKOUT MUTATION: DEDUCTS PHYSICAL WAREHOUSE STOCK & POSTS GL REVENUE
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Shopping bag is empty.");
      if (!customerPhone.trim()) throw new Error("Please enter your mobile phone number for delivery & payment.");

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
      toast.success(`Order #${data?.order_uid || 'SEALED'} Confirmed! Stock Reconciled.`);
      setCart([]);
      setIsCartOpen(false);
      setCustomerPhone('');
      setCustomerEmail('');
      setShippingAddress('');
    },
    onError: (err: any) => toast.error(`Checkout Failed: ${err.message}`)
  });

  // WHATSAPP DIRECT ORDER CHECKOUT
  const orderViaWhatsApp = () => {
    if (cart.length === 0) return toast.error("Your cart is empty.");
    const whatsappNo = storeConfig?.whatsapp_number || storeConfig?.support_phone || '256700000000';
    
    let text = `Hello *${storeConfig?.store_name || 'Store'}*!\n\nI would like to place an order:\n`;
    cart.forEach(item => {
      text += `• ${item.product_name} x${item.quantity} - ${storeCurrency} ${(item.price * item.quantity).toLocaleString()}\n`;
    });
    text += `\n*Total Amount:* ${storeCurrency} ${cartTotal.toLocaleString()}\n`;
    text += `*Customer Phone:* ${customerPhone || 'N/A'}\n`;
    text += `*Delivery Location:* ${shippingAddress || 'Store Pickup'}`;

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

      {/* NAV HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg">
              {storeConfig.store_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">{storeConfig.store_name}</h1>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} /> Verified Storefront Node
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
      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-8">
        
        {/* HERO BANNER */}
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px]">
          {storeConfig.banner_url && (
            <img src={storeConfig.banner_url} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="banner" />
          )}
          <div className="relative z-10 space-y-2">
            <Badge className="bg-blue-600 text-white font-bold text-[9px] uppercase px-3 py-1 border-none">
              Official Digital Catalog
            </Badge>
            <h2 className="text-3xl font-black uppercase tracking-tight">{storeConfig.store_name}</h2>
            <p className="text-xs text-slate-300 font-medium max-w-xl">{storeConfig.store_description || "Browse authentic catalog items with instant delivery."}</p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search items by name or code..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-11 h-12 rounded-2xl font-bold bg-white border-slate-200 shadow-sm"
          />
        </div>

        {/* PRODUCTS CATALOG GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isProductsLoading ? (
            <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600" /> Loading Catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs">No products currently displayed on store.</div>
          ) : (
            filteredProducts.map((p: any) => (
              <Card key={p.variant_id} className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all bg-white flex flex-col justify-between">
                <div>
                  <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {p.primary_media_url ? (
                      <img src={p.primary_media_url} className="w-full h-full object-cover" alt={p.product_name} />
                    ) : (
                      <ShoppingBag size={48} className="text-slate-300 opacity-40" />
                    )}
                  </div>
                  <div className="p-6 space-y-2">
                    <h3 className="font-black text-slate-900 text-sm uppercase leading-snug">{p.product_name}</h3>
                    <p className="text-lg font-black text-blue-600">{storeCurrency} {Number(p.price).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Button onClick={() => addToCart(p)} className="w-full h-11 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs uppercase shadow-md">
                    <Plus size={16} className="mr-2" /> Add to Cart
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

      </main>

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

            <Button onClick={orderViaWhatsApp} disabled={cart.length === 0} variant="outline" className="w-full h-12 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl uppercase text-xs">
              <MessageSquare size={16} className="mr-2" /> Order Directly on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}