'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, OfflineSale } from '@/lib/db';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard'; 
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile'; 
import useDefaultPrinter from '@/hooks/useDefaultPrinter';
import { useSync } from '@/components/core/SyncProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    X, User, Plus, Minus, Printer as PrinterIcon, RefreshCw,
    FileText, Loader2, Tag, Calculator, CheckCircle2,
    ShieldAlert, Lock, Zap, KeyRound, CheckCircle, Barcode,
    Search, ShoppingCart, CreditCard, LayoutGrid, Rows3, ReceiptText,
    ChevronUp, ChevronDown
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CustomerSearchModal from '@/components/customers/CustomerSearchModal';
import PaymentModal from '@/components/pos/PaymentModal';
import { Receipt, ReceiptData } from '@/components/pos/Receipt';
import ProductSearch from '@/components/pos/ProductSearch';
import { createClient } from '@/lib/supabase/client'; 

// --- TYPES ---
interface CompletedSale {
    receiptData: ReceiptData;
}
interface Discount {
    type: 'fixed' | 'percentage';
    value: number;
}

type SearchResultProduct = { 
    variant_id: number; 
    product_name: string; 
    variant_name: string; 
    price: number; 
    sku: string;
    tax_category_code?: string;
    units_per_pack?: number;
};

// --- PRODUCT GRID (DEEP UPGRADE: INTERNAL SCROLLING) ---
const ProductGrid = ({ products, onProductSelect, disabled, onSKUScan }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, disabled: boolean, onSKUScan: (sku: string) => void }) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
    const [gridAtTop, setGridAtTop] = useState(true);
    const [gridAtBottom, setGridAtBottom] = useState(true);
    const updateGridScroll = useCallback(() => {
        if (!gridEl) return;
        setGridAtTop(gridEl.scrollTop <= 1);
        setGridAtBottom(gridEl.scrollTop >= gridEl.scrollHeight - gridEl.clientHeight - 1);
    }, [gridEl]);
    useEffect(() => {
        if (!gridEl) return;
        updateGridScroll();
        const ro = new ResizeObserver(updateGridScroll);
        ro.observe(gridEl);
        return () => ro.disconnect();
    }, [gridEl, updateGridScroll]);

    useEffect(() => {
        let barcode = '';
        let lastKeyTime = new Date(0);
        const SCANNER_INPUT_TIMEOUT = 50;

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = new Date();
            if (currentTime.getTime() - lastKeyTime.getTime() > SCANNER_INPUT_TIMEOUT) barcode = '';
            if (e.key === 'Enter') {
                if (barcode) { onSKUScan(barcode); barcode = ''; }
            } else if (e.key.length === 1) {
                barcode += e.key;
            }
            lastKeyTime = currentTime;
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSKUScan]);

    return (
        <div className={cn('flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Quick Selection</h3>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            aria-label="Grid view"
                            className={cn('h-7 w-7 rounded-md flex items-center justify-center transition-colors', viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50')}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            aria-label="List view"
                            className={cn('h-7 w-7 rounded-md flex items-center justify-center transition-colors', viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50')}
                        >
                            <Rows3 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600">
                        <Barcode size={14} /> SCANNER READY
                    </div>
                </div>
            </div>
            {/* DEEP SCROLL AREA: flex-1 allows this middle section to grow and scroll independently */}
            <div className="relative flex-1 min-h-0">
                <ScrollArea viewportRef={setGridEl} onScroll={updateGridScroll} className="h-full w-full">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 pb-40 lg:pb-10">
                            {products.map(product => (
                                <Card key={product.variant_id} onClick={() => onProductSelect(product)} className="cursor-pointer hover:border-blue-400 hover:shadow-md active:scale-95 transition-all relative overflow-hidden bg-white border-slate-100 min-h-[140px]">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                        {(product as any).units_per_pack > 1 && (
                                            <div className="absolute top-0 right-0 p-1 bg-blue-600 text-white rounded-bl-lg">
                                                <Calculator className="w-3 h-3" />
                                            </div>
                                        )}
                                        <p className="font-bold text-sm text-slate-800 line-clamp-2">{product.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">{product.variant_name}</p>
                                        <p className="mt-3 font-bold text-blue-600">{(product.price || 0).toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 pb-40 lg:pb-10">
                            {products.map(product => (
                                <button
                                    key={product.variant_id}
                                    type="button"
                                    onClick={() => onProductSelect(product)}
                                    className="w-full flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-blue-50/50 transition-colors text-left"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-800 truncate">{product.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{product.variant_name}</p>
                                    </div>
                                    <span className="font-bold text-blue-600 shrink-0">{(product.price || 0).toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                {!gridAtTop && (
                    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                )}
                {!gridAtBottom && (
                    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- CART DISPLAY (DEEP UPGRADE: SOVEREIGN STICKY FOOTER) ---
const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency = 'UGX' }: any) => {
    const [itemsEl, setItemsEl] = useState<HTMLDivElement | null>(null);
    const [itemsAtTop, setItemsAtTop] = useState(true);
    const [itemsAtBottom, setItemsAtBottom] = useState(true);
    const updateItemsScroll = useCallback(() => {
        if (!itemsEl) return;
        setItemsAtTop(itemsEl.scrollTop <= 1);
        setItemsAtBottom(itemsEl.scrollTop >= itemsEl.scrollHeight - itemsEl.clientHeight - 1);
    }, [itemsEl]);
    useEffect(() => {
        if (!itemsEl) return;
        updateItemsScroll();
        const ro = new ResizeObserver(updateItemsScroll);
        ro.observe(itemsEl);
        return () => ro.disconnect();
    }, [itemsEl, updateItemsScroll]);

    const subtotal = useMemo(() => cart.reduce((acc: any, item: any) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value);
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    useEffect(() => {
        if (itemsEl) itemsEl.scrollTo({ top: itemsEl.scrollHeight, behavior: 'smooth' });
    }, [cart.length, itemsEl]);

    return (
        /* MASTER FIX: h-full and flex-col locks the cart container. Header/Footer shrink-0, Middle flex-1. */
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* PINNED HEADER (Does not move) */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-900 text-white shrink-0 z-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={onSetCustomer}>
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm truncate max-w-[150px]">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            {selectedCustomer ? `ID: ${selectedCustomer.id}` : 'Guest Sale'}
                        </span>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="font-bold text-[10px] h-8 bg-transparent border-slate-700 text-white hover:bg-slate-800 hover:text-white hover:border-slate-600" onClick={onSetCustomer}>Change (F2)</Button>
            </div>

            {/* SCROLLABLE ITEMS MIDDLE (Deep internal scroll). Footer below
                stays pinned via shrink-0 regardless of list length. */}
            <div className="relative flex-1 min-h-0">
            <ScrollArea viewportRef={setItemsEl} onScroll={updateItemsScroll} className="h-full bg-slate-50/20">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-300 p-8 gap-4">
                        <ShoppingCart size={40} className="opacity-20" />
                        <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Cart is empty</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3 pb-20 lg:pb-10">
                        {cart.map((item: any) => (
                            <div key={item.variant_id} className="flex flex-col p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-2 hover:bg-blue-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{item.variant_name}</p>
                                    </div>
                                    <div className="w-24 text-right shrink-0">
                                        <p className="font-bold text-sm text-slate-900">{(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}><Minus className="h-3 w-3 text-red-500" /></Button>
                                        <span className="w-8 text-center font-bold text-xs">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}><Plus className="h-3 w-3 text-blue-500" /></Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => onRemoveItem(item.variant_id)}><X className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            {!itemsAtTop && (
                <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                </div>
            )}
            {!itemsAtBottom && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </div>
            )}
            </div>

            {/* PINNED FOOTER (FIXED POSITION: Pay Now Button never moves) */}
            <div className="p-6 border-t bg-white space-y-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 pb-24 lg:pb-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                        <span>Subtotal</span>
                        <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger render={<Button variant="link" className="p-0 h-auto text-blue-600 font-bold text-[11px] gap-1" />}>
                                <Tag className="h-3 w-3" /> Adjust Discount
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-5 rounded-xl shadow-xl border-none">
                                <Label className="text-[10px] font-bold uppercase text-slate-400">Value</Label>
                                <Input type="number" className="mt-2 rounded-xl" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}/>
                            </PopoverContent>
                        </Popover>
                        <span className="font-bold text-red-600 text-sm">-{currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance Due</span>
                    <span className="font-bold text-3xl text-slate-900 tracking-tighter">
                        {currency} {total.toLocaleString()}
                    </span>
                </div>

                <Button 
                    className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl transition-all active:scale-95" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : "PAY NOW (F1)"}
                </Button>
            </div>
        </div>
    );
};

// --- MAIN POS PAGE ---
export default function POSPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
    const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
    
    const receiptRef = useRef<HTMLDivElement>(null);
    const { isSyncing, triggerSync } = useSync();
    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();
    const products = useLiveQuery(() => db.products.toArray(), []);
    const supabase = createClient();

    const handleWebPrint = useReactToPrint({ content: () => receiptRef.current });

    const handleAddToCart = (product: SellableProduct | SearchResultProduct) => {
        setCart(currentCart => { 
            const existing = currentCart.find(i => i.variant_id === product.variant_id); 
            if (existing) {
                return currentCart.map(i => i.variant_id === product.variant_id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [...currentCart, { ...product, quantity: 1, stock: 0 }]; 
        });
    };

    const handleSKUScan = (sku: string) => {
        const product = products?.find(p => p.sku === sku);
        if (product) {
            handleAddToCart(product);
            toast.success(`${product.product_name} added`);
        } else {
            toast.error(`Product not found: ${sku}`);
        }
    };

    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id || !userProfile.id) return;
        setIsSaving(true);
        try {
            const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
            const totalAmount = subtotal - discountAmount;
            
            const newSale: Omit<OfflineSale, 'id'> = {
                createdAt: new Date(), cartItems: cart, customerId: selectedCustomer?.id || null,
                paymentMethod: paymentData.paymentMethod, business_id: userProfile.business_id,
                user_id: userProfile.id, amount_paid: paymentData.amountPaid,
                payment_status: paymentData.amountPaid >= totalAmount ? 'paid' : 'partial',
                due_amount: Math.max(0, totalAmount - paymentData.amountPaid),
                discount_type: discount.value > 0 ? discount.type : null,
                discount_value: discount.value > 0 ? discount.value : null,
                discount_amount: discountAmount > 0 ? discountAmount : null,
            };
            
            const saleId = await db.offlineSales.add(newSale as OfflineSale);
            
            setLastCompletedSale({ receiptData: {
                saleInfo: { id: saleId, created_at: newSale.createdAt, payment_method: newSale.paymentMethod, total_amount: totalAmount, amount_tendered: paymentData.amountPaid, change_due: Math.max(0, paymentData.amountPaid - totalAmount), subtotal, discount: discountAmount, amount_due: newSale.due_amount, kernel_seal_id: `TXN-${saleId}` },
                storeInfo: { name: userProfile.business_name || 'Store', address: '-', phone_number: '-', receipt_footer: 'Thank you!' },
                customerInfo: selectedCustomer,
                saleItems: cart.map(item => ({ product_name: item.product_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.price, subtotal: item.quantity * item.price }))
            }});
            
            setCart([]); setSelectedCustomer(null); setDiscount({ type: 'fixed', value: 0 }); setPaymentModalOpen(false);
            toast.success("Sale Complete");
        } catch (error: any) {
            toast.error("Payment failed.");
        } finally { setIsSaving(false); }
    };

    if (isProfileLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    if (lastCompletedSale) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen bg-slate-100">
                <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden">
                    <CardHeader className="bg-emerald-600 text-white text-center py-10">
                        <CheckCircle className="mx-auto h-16 w-16 mb-4" />
                        <CardTitle className="uppercase font-black text-2xl tracking-widest">Sale Signed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 bg-white">
                        <div className="border border-dashed p-4 rounded-2xl scale-90 lg:scale-100">
                            <Receipt ref={receiptRef} receiptData={lastCompletedSale.receiptData} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pb-4">
                            <Button variant="outline" className="h-14 font-black rounded-2xl border-slate-200" onClick={() => setLastCompletedSale(null)}>New Sale</Button>
                            <Button className="h-14 bg-blue-600 hover:bg-blue-700 font-black rounded-2xl shadow-lg" onClick={() => handleWebPrint()}><PrinterIcon className="mr-2 h-4 w-4" /> Print</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        /* MASTER FIX: Lock the app height to the dynamic viewport. No overall page scrolling. */
        <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden relative overscroll-none">
            {/* Header */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-3">
                     <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate max-w-[150px] lg:max-w-none">
                        {userProfile?.business_name || 'Terminal Active'}
                     </span>
                </div>
                <Button onClick={triggerSync} variant="outline" size="sm" className="h-9 font-bold text-[10px] gap-2 border-slate-200 text-blue-600">
                    <RefreshCw className={cn("h-3 w-3", isSyncing && 'animate-spin')} />
                    {isSyncing ? 'SYNCING...' : 'SYNC DATA'}
                </Button>
            </div>

            {/* Layout Main: Locked Height columns */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
                {/* Inventory View */}
                <div className={cn("h-full lg:col-span-7 xl:col-span-8 p-4 lg:p-6 overflow-hidden flex flex-col transition-all duration-300", activeTab !== 'products' && 'hidden lg:flex')}>
                    <div className="mb-4 shrink-0"><ProductSearch onProductSelect={handleAddToCart} /></div>
                    <div className="flex-1 overflow-hidden min-h-0">
                        <ProductGrid products={products || []} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                    </div>
                </div>

                {/* Receipt View */}
                <div className={cn("h-full lg:col-span-5 xl:col-span-4 p-4 lg:p-6 overflow-hidden flex flex-col transition-all duration-300", activeTab !== 'cart' && 'hidden lg:flex')}>
                    <CartDisplay 
                        cart={cart} 
                        onUpdateQuantity={(id: number, q: number) => q <= 0 ? setCart(cart.filter(i => i.variant_id !== id)) : setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: q } : i))} 
                        onRemoveItem={(id: number) => setCart(cart.filter(i => i.variant_id !== id))} 
                        selectedCustomer={selectedCustomer} 
                        onSetCustomer={() => setCustomerModalOpen(true)} 
                        onCharge={() => setPaymentModalOpen(true)} 
                        isProcessing={isSaving} 
                        discount={discount} setDiscount={setDiscount}
                        currency={userProfile?.currency_symbol || 'UGX'}
                    />
                </div>
            </div>

            {/* MOBILE FLOATING PAY SUMMARY (Uber-Style Quick Bar) */}
            {cart.length > 0 && activeTab === 'products' && (
                <div className="lg:hidden fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5">
                    <Button 
                        onClick={() => setActiveTab('cart')}
                        className="w-full h-16 bg-blue-600 shadow-[0_10px_30px_rgba(37,99,235,0.4)] rounded-2xl flex items-center justify-between px-6 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <Badge className="bg-white text-blue-600 font-black h-7 w-7 flex items-center justify-center p-0 rounded-full border-none shadow-md">{cart.length}</Badge>
                            <span className="font-black uppercase text-[10px] tracking-widest text-white">Review Receipt</span>
                        </div>
                        <span className="font-black text-white text-lg">
                            {userProfile?.currency_symbol} {cart.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}
                        </span>
                    </Button>
                </div>
            )}

            {/* MOBILE BOTTOM NAVIGATION TABS (UPGRADED TO TRIPLE ACTION) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around z-[110] px-4">
                <button 
                    onClick={() => setActiveTab('products')} 
                    className={cn("flex flex-col items-center flex-1 py-2 transition-all", activeTab === 'products' ? "text-blue-600 scale-105" : "text-slate-400")}
                >
                    <LayoutGrid className="h-5 w-5" />
                    <span className="text-[9px] font-black uppercase mt-1">Inventory</span>
                </button>

                {/* THE NEW CENTER PAY BUTTON FOR MOBILE */}
                <button 
                    disabled={cart.length === 0}
                    onClick={() => setPaymentModalOpen(true)}
                    className={cn(
                        "flex flex-col items-center justify-center bg-blue-600 text-white rounded-xl h-12 w-20 shadow-lg active:scale-95 transition-all mb-2",
                        cart.length === 0 && "opacity-20 grayscale pointer-events-none"
                    )}
                >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-[8px] font-black uppercase mt-0.5">Pay</span>
                </button>

                <button 
                    onClick={() => setActiveTab('cart')} 
                    className={cn("flex flex-col items-center flex-1 py-2 transition-all", activeTab === 'cart' ? "text-blue-600 scale-105" : "text-slate-400")}
                >
                    <div className="relative">
                        <ReceiptText className="h-5 w-5" />
                        {cart.length > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full border border-white" />}
                    </div>
                    <span className="text-[9px] font-black uppercase mt-1">Receipt ({cart.length})</span>
                </button>
            </div>

            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} />
            <PaymentModal 
                isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} 
                totalAmount={cart.reduce((a, b) => a + (b.price * b.quantity), 0) - (discount.type === 'percentage' ? (cart.reduce((a, b) => a + (b.price * b.quantity), 0) * discount.value) / 100 : discount.value)} 
                onConfirm={handleProcessPayment} isProcessing={isSaving} 
            />
        </div>
    );
}