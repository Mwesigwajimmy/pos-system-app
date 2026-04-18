'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, OfflineSale } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

// --- HOOKS ---
import { useUserProfile } from '@/hooks/useUserProfile';
import useDefaultPrinter from '@/hooks/useDefaultPrinter';

// --- UI COMPONENTS ---
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    X, User, Plus, Minus, Printer as PrinterIcon, RefreshCw, 
    Search, FileText, Tag, Calculator, CheckCircle2, 
    Loader2, ShoppingCart, Trash2, Package, ChevronRight, 
    ArrowLeft, ShieldCheck, MapPin, Smartphone, CreditCard
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge'; 

// --- MODULE COMPONENTS ---
import CustomerSearchModal from '@/components/customers/CustomerSearchModal';
import PaymentModal from '@/components/pos/PaymentModal';
import { Receipt, ReceiptData } from '@/components/pos/Receipt';

// --- TYPES ---
interface CompletedSale {
    receiptData: ReceiptData;
}
interface Discount {
    type: 'fixed' | 'percentage';
    value: number;
}

// --- UTILITY: HIGHLIGHT SEARCH TERMS ---
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <span key={i} className="text-blue-600 font-black">{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

// --- CHILD COMPONENT: PRODUCT GRID ---
const ProductGrid = ({ products, onProductSelect, disabled, isModalOpen }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredProducts = useMemo(() =>
        products.filter((p: any) =>
            p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);

    return (
        <div className={cn(
            'flex flex-col h-full bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden transition-all',
            disabled && 'opacity-50 pointer-events-none',
            // FIX: Lower z-index when modal is open so the search bar doesn't overlap
            isModalOpen ? 'z-0' : 'z-10'
        )}>
            <div className="p-6 border-b bg-slate-50/50 relative">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Search product name or scan SKU..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-14 h-14 bg-white border-slate-200 rounded-2xl font-bold text-lg" 
                />
            </div>
            <ScrollArea className="flex-1 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product: any) => (
                        <Card 
                            key={product.variant_id} 
                            onClick={() => onProductSelect(product)} 
                            className="cursor-pointer hover:border-blue-500 hover:shadow-2xl transition-all border-slate-100 group rounded-3xl"
                        >
                            <CardContent className="p-5 flex flex-col h-full">
                                <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4 group-hover:bg-blue-50 transition-colors">
                                    <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                                </div>
                                <p className="font-black text-slate-900 leading-tight mb-1">
                                    <HighlightText text={product.product_name} highlight={searchTerm} />
                                </p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">
                                    {product.variant_name} • <span className="text-blue-500">#{product.sku?.substring(0, 8)}</span>
                                </p>
                                <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <p className="font-black text-blue-600 text-lg">UGX {product.price.toLocaleString()}</p>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

// --- CHILD COMPONENT: CART DISPLAY (WITH FIXED BUTTON & SCROLLABLE LIST) ---
const CartDisplay = ({ cart, currency, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, discount, setDiscount }: any) => {
    const subtotal = cart.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : discount.value;
    const total = Math.max(0, subtotal - discountAmount);

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden">
            {/* 1. STATIC HEADER */}
            <div className="p-6 bg-slate-50/50 border-b">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 leading-none">
                                {selectedCustomer?.name || 'Walk-in Customer'}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {selectedCustomer ? 'ACCOUNT SALE' : 'GUEST SALE'}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={onSetCustomer} className="h-9 px-4 rounded-xl font-black text-[10px] uppercase">
                        Change (F2)
                    </Button>
                </div>
            </div>

            {/* 2. SCROLLABLE ITEMS AREA */}
            <ScrollArea className="flex-1 px-6">
                <div className="py-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                            <ShoppingCart size={64} className="mb-4" />
                            <p className="font-black uppercase tracking-widest text-sm">Empty Basket</p>
                        </div>
                    ) : (
                        cart.map((item: any) => (
                            <div key={item.variant_id} className="flex items-center justify-between group animate-in fade-in slide-in-from-right-2">
                                <div className="flex-1">
                                    <p className="font-black text-slate-800 text-sm leading-tight">{item.product_name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.variant_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-slate-100 rounded-xl px-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus size={12} />
                                        </Button>
                                        <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
                                            <Plus size={12} />
                                        </Button>
                                    </div>
                                    <div className="text-right w-24">
                                        <p className="font-black text-slate-900 text-sm">{ (item.price * item.quantity).toLocaleString() }</p>
                                        <p className="text-[9px] font-bold text-slate-400">@ {item.price.toLocaleString()}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.variant_id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                        <X size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* 3. STATIC FOOTER WITH CHARGE BUTTON */}
            <div className="p-8 border-t bg-slate-50/50 space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-500 font-black text-sm">
                        <button className="flex items-center gap-2 hover:underline" onClick={() => {}}>
                            <Tag size={14} /> Apply Discount
                        </button>
                        <span>-{currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="pt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                    <span className="text-slate-400 font-black uppercase text-xs">Total Due</span>
                    <div className="text-right">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">
                            <span className="text-sm mr-2">{currency}</span>
                            {total.toLocaleString()}
                        </p>
                    </div>
                </div>

                <Button 
                    onClick={onCharge}
                    disabled={cart.length === 0}
                    className="w-full h-20 bg-blue-600 hover:bg-slate-900 text-white rounded-3xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 group"
                >
                    <CreditCard className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="text-xl font-black uppercase tracking-tighter">Pay Now (F1)</span>
                </Button>
            </div>
        </div>
    );
};

// --- MAIN CONTROLLER: RETAIL DESK ---
export default function RetailDesk() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
    
    // Default initial identity to avoid 'undefined' errors during first render
    const [identity, setIdentity] = useState<any>({ currency_code: 'UGX' });

    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();

    const products = useLiveQuery(() => db.products.toArray(), []);
    
    // --- PROFESSIONAL PRINT TRIGGER ---
    const handleWebPrint = useReactToPrint({ 
        content: () => receiptRef.current,
        documentTitle: 'Retail_Fiscal_Receipt',
        onAfterPrint: () => setLastCompletedSale(null)
    });

    // --- 1. CORPORATE IDENTITY HANDSHAKE ---
    useEffect(() => {
        if (!userProfile?.business_id) return;

        const fetchCorporateDNA = async () => {
            const supabase = createClient();
            const { data: corpIdentity } = await supabase
                .from('view_bbu1_corporate_identity')
                .select('*')
                .eq('business_id', userProfile.business_id)
                .single();

            const { data: taxRes } = await supabase
                .from('tax_configurations')
                .select('rate_percentage')
                .eq('business_id', userProfile.business_id)
                .eq('is_active', true)
                .limit(1);

            if (corpIdentity) {
                setIdentity({
                    ...corpIdentity,
                    // FIX: Ensure currency_code is never undefined
                    currency_code: corpIdentity.currency_code || 'UGX',
                    globalTaxRate: taxRes?.[0]?.rate_percentage || 0
                });
            }
        };
        fetchCorporateDNA();
    }, [userProfile]);

    const handleAddToCart = (product: SellableProduct) => {
        setCart(prev => {
            const existing = prev.find(item => item.variant_id === product.variant_id);
            if (existing) {
                return prev.map(item => item.variant_id === product.variant_id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    // --- 2. MASTER PAYMENT & FISCALIZATION LOGIC ---
    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id || !identity) {
            return toast.error("System Identity not initialized.");
        }

        const currentCurrency = identity.currency_code;
        const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const taxRate = identity.globalTaxRate || 0;
        
        const totalTax = round((subtotal - discountAmount) * (taxRate / 100));
        const totalAmount = round(subtotal - discountAmount + totalTax);
        const dueAmount = round(totalAmount - paymentData.amountPaid);

        if (dueAmount > 0.01 && !selectedCustomer) {
            return toast.error("CREDIT PROTOCOL: Customer required for balance arrears.");
        }

        const salePayload: Omit<OfflineSale, 'id'> = {
            createdAt: new Date(),
            cartItems: cart,
            customerId: selectedCustomer?.id || null,
            paymentMethod: paymentData.paymentMethod,
            amount_paid: paymentData.amountPaid,
            business_id: userProfile.business_id,
            user_id: userProfile.id,
            discount_amount: round(discountAmount),
            tax_amount: totalTax,
            payment_status: dueAmount > 0.01 ? 'partial' : 'paid',
            due_amount: dueAmount > 0 ? dueAmount : 0,
        };

        const localSaleId = await db.offlineSales.add(salePayload as OfflineSale);
        
        setLastCompletedSale({
            receiptData: {
                saleInfo: { 
                    id: localSaleId, 
                    created_at: salePayload.createdAt, 
                    payment_method: salePayload.paymentMethod, 
                    total_amount: totalAmount, 
                    amount_tendered: salePayload.amount_paid,
                    change_due: salePayload.amount_paid > totalAmount ? round(salePayload.amount_paid - totalAmount) : 0,
                    subtotal: round(subtotal),
                    discount: round(discountAmount),
                    amount_due: salePayload.due_amount,
                    currency_code: currentCurrency,
                    total_tax: totalTax,
                    kernel_seal_id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                },
                identity: {
                    ...identity,
                    currency_code: currentCurrency
                },
                customer: selectedCustomer,
                items: cart.map(i => ({ 
                    name: i.product_name, 
                    qty: i.quantity, 
                    price: i.price, 
                    total: i.price * i.quantity 
                }))
            }
        });

        setCart([]);
        setSelectedCustomer(null);
        setDiscount({ type: 'fixed', value: 0 });
        setPaymentModalOpen(false);
        toast.success("FISCAL SESSION SEALED");
    };

    if (isProfileLoading) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-slate-300 uppercase tracking-widest">Waking Retail Core...</div>;

    // --- SUCCESS VIEW: FISCAL RECEIPT ---
    if (lastCompletedSale) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-slate-900 animate-in zoom-in duration-500">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center space-y-4">
                        <div className="h-20 w-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 className="w-10 h-10 text-white"/>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Transaction Complete</h2>
                    </div>

                    <div className="bg-white rounded-[3rem] p-1 shadow-2xl">
                        <div ref={receiptRef} className="bg-white rounded-[2.8rem] overflow-hidden">
                            <Receipt 
                                receiptData={lastCompletedSale.receiptData} 
                                autoPrint={false} 
                                defaultPrinterName={defaultPrinter || undefined} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <Button 
                            onClick={handleWebPrint}
                            className="h-20 bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black text-xl rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-4 group"
                        >
                            <PrinterIcon className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                            EXECUTE PRINT
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="text-slate-400 font-black uppercase tracking-[0.3em] hover:text-white"
                            onClick={() => setLastCompletedSale(null)}
                        >
                            Start New Session
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen bg-[#F8FAFC]">
            {/* TOP IDENTITY NAVIGATION */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
                <div className="flex items-center gap-6">
                     <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {identity?.legal_name || 'INITIALIZING...'}
                        </span>
                     </div>
                     <Badge variant="outline" className="font-black text-[9px] px-3 border-blue-100 text-blue-600 uppercase">
                        {identity?.currency_code || 'UGX'} System Active
                     </Badge>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-4">
                        <MapPin size={10} className="inline mr-1 text-blue-500" /> {identity?.physical_address || 'Main Office'}
                    </p>
                    <Button onClick={() => {}} variant="outline" className="h-10 px-6 border-slate-200 font-black text-xs rounded-xl shadow-sm hover:bg-slate-50 transition-all">
                        <RefreshCw className="mr-2 h-4 w-4 text-blue-600" /> SYNC LOCAL DATA
                    </Button>
                </div>
            </div>

            <div className="h-[calc(100vh-72px)] grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 overflow-hidden">
                {/* 1. PRODUCT GRID AREA */}
                <div className="lg:col-span-7 h-full flex flex-col min-h-0 animate-in slide-in-from-left-4 duration-700">
                    <ProductGrid 
                        products={products || []} 
                        onProductSelect={handleAddToCart} 
                        disabled={isSyncing} 
                        isModalOpen={isPaymentModalOpen}
                    />
                </div>

                {/* 2. TRANSACTION CART AREA */}
                <div className="lg:col-span-5 h-full flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-700">
                    <CartDisplay 
                        cart={cart} 
                        currency={identity?.currency_code || 'UGX'}
                        onUpdateQuantity={(id: string, qty: number) => {
                            if(qty <= 0) setCart(prev => prev.filter(i => i.variant_id !== id));
                            else setCart(prev => prev.map(i => i.variant_id === id ? {...i, quantity: qty} : i));
                        }} 
                        onRemoveItem={(id: string) => setCart(prev => prev.filter(i => i.variant_id !== id))} 
                        selectedCustomer={selectedCustomer} 
                        onSetCustomer={() => setCustomerModalOpen(true)} 
                        onCharge={() => setPaymentModalOpen(true)} 
                        discount={discount}
                        setDiscount={setDiscount} 
                    />
                </div>
            </div>
            
            {/* MODALS */}
            <CustomerSearchModal 
                isOpen={isCustomerModalOpen} 
                onClose={() => setCustomerModalOpen(false)} 
                onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} 
            />
            
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                currency={identity?.currency_code || 'UGX'}
                totalAmount={cart.reduce((s, i) => s + (i.price * i.quantity), 0) - (discount.type === 'percentage' ? (cart.reduce((s, i) => s + (i.price * i.quantity), 0) * discount.value) / 100 : discount.value)} 
                onConfirm={handleProcessPayment} 
                isProcessing={false} 
            />
        </div>
    );
}