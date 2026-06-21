'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    Search, ShoppingCart, CreditCard, LayoutGrid, ReceiptText
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

// --- PRODUCT GRID ---
const ProductGrid = ({ products, onProductSelect, disabled, onSKUScan }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, disabled: boolean, onSKUScan: (sku: string) => void }) => {
    
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
                <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600">
                    <Barcode size={14} /> SCANNER READY
                </div>
            </div>
            <ScrollArea className="flex-1 w-full">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 pb-32">
                    {products.map(product => (
                        <Card key={product.variant_id} onClick={() => onProductSelect(product)} className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden bg-white border-slate-100 min-h-[140px]">
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
            </ScrollArea>
        </div>
    );
};

// --- CART DISPLAY (UPDATED WITH STICKY FOOTER) ---
const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency = 'UGX' }: any) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const subtotal = useMemo(() => cart.reduce((acc: any, item: any) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value);
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    // Auto-scroll to bottom when item added
    useEffect(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
    }, [cart.length]);
    
    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* PINNED HEADER */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
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
                <Button variant="outline" size="sm" className="font-bold text-[10px] h-8 bg-transparent border-slate-700 text-white" onClick={onSetCustomer}>Change (F2)</Button>
            </div>

            {/* SCROLLABLE ITEMS */}
            <ScrollArea ref={scrollRef} className="flex-1 bg-white">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-slate-300 p-8 gap-4">
                        <ShoppingCart size={40} className="opacity-20" />
                        <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Cart is empty</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3 pb-10">
                        {cart.map((item: any) => (
                            <div key={item.variant_id} className="flex flex-col p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-2 hover:bg-slate-50 transition-colors">
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

            {/* PINNED FOOTER (FIXED) */}
            <div className="p-6 border-t bg-white space-y-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10">
                <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                        <span>Subtotal</span>
                        <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-blue-600 font-bold text-[11px] gap-1">
                                    <Tag className="h-3 w-3" /> Apply Discount
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-5 rounded-xl shadow-xl">
                                <Label className="text-[10px] font-bold uppercase text-slate-400">Discount Value</Label>
                                <Input type="number" className="mt-2" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}/>
                            </PopoverContent>
                        </Popover>
                        <span className="font-bold text-red-600 text-sm">-{currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Due</span>
                    <span className="font-bold text-3xl text-slate-900 tracking-tighter">
                        {currency} {total.toLocaleString()}
                    </span>
                </div>

                <Button 
                    className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl transition-all" 
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

    if (isProfileLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (lastCompletedSale) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen bg-slate-50">
                <Card className="w-full max-w-md shadow-2xl">
                    <CardHeader className="bg-emerald-600 text-white text-center rounded-t-xl py-10">
                        <CheckCircle className="mx-auto h-16 w-16 mb-4" />
                        <CardTitle className="uppercase font-bold text-2xl">Sale Completed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="border p-4 rounded-xl scale-90">
                            <Receipt ref={receiptRef} receiptData={lastCompletedSale.receiptData} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-12 font-bold" onClick={() => setLastCompletedSale(null)}>New Sale</Button>
                            <Button className="h-12 bg-blue-600 font-bold" onClick={() => handleWebPrint()}><PrinterIcon className="mr-2 h-4 w-4" /> Print</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden relative overscroll-none">
            {/* Header */}
            <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-3">
                     <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {userProfile?.business_name || 'Terminal Active'}
                     </span>
                </div>
                <Button onClick={triggerSync} variant="outline" size="sm" className="h-9 font-bold text-[10px]">
                    <RefreshCw className={cn("mr-2 h-3 w-3", isSyncing && 'animate-spin')} />
                    SYNC DATA
                </Button>
            </div>

            {/* Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
                {/* Product Section */}
                <div className={cn("h-full lg:col-span-7 xl:col-span-8 p-4 lg:p-6 overflow-hidden flex flex-col transition-all", activeTab !== 'products' && 'hidden lg:flex')}>
                    <div className="mb-4"><ProductSearch onProductSelect={handleAddToCart} /></div>
                    <ProductGrid products={products || []} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                </div>

                {/* Cart Section */}
                <div className={cn("h-full lg:col-span-5 xl:col-span-4 p-4 lg:p-6 overflow-hidden flex flex-col transition-all", activeTab !== 'cart' && 'hidden lg:flex')}>
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

            {/* MOBILE FLOATING PAY SUMMARY */}
            {cart.length > 0 && activeTab === 'products' && (
                <div className="lg:hidden fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4">
                    <Button 
                        onClick={() => setActiveTab('cart')}
                        className="w-full h-16 bg-blue-600 shadow-2xl rounded-2xl flex items-center justify-between px-6 border-b-4 border-blue-800"
                    >
                        <div className="flex items-center gap-3">
                            <Badge className="bg-white text-blue-600 font-bold h-7 w-7 flex items-center justify-center p-0 rounded-full border-none">{cart.length}</Badge>
                            <span className="font-bold uppercase text-[10px] text-white">Review Receipt</span>
                        </div>
                        <span className="font-bold text-white text-lg">
                            {userProfile?.currency_symbol} {cart.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}
                        </span>
                    </Button>
                </div>
            )}

            {/* MOBILE BOTTOM TABS */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around z-[110]">
                <button onClick={() => setActiveTab('products')} className={cn("flex flex-col items-center flex-1 py-2", activeTab === 'products' ? "text-blue-600" : "text-slate-400")}>
                    <LayoutGrid className="h-5 w-5" /><span className="text-[9px] font-bold uppercase mt-1">Inventory</span>
                </button>
                <button onClick={() => setActiveTab('cart')} className={cn("flex flex-col items-center flex-1 py-2", activeTab === 'cart' ? "text-blue-600" : "text-slate-400")}>
                    <div className="relative">
                        <ReceiptText className="h-5 w-5" />
                        {cart.length > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full border border-white" />}
                    </div>
                    <span className="text-[9px] font-bold uppercase mt-1">Receipt ({cart.length})</span>
                </button>
            </div>

            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} totalAmount={cart.reduce((a, b) => a + (b.price * b.quantity), 0) - (discount.type === 'percentage' ? (cart.reduce((a, b) => a + (b.price * b.quantity), 0) * discount.value) / 100 : discount.value)} onConfirm={handleProcessPayment} isProcessing={isSaving} />
        </div>
    );
}