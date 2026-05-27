'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, OfflineSale, Printer } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';
import { toast } from 'sonner';
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
    X, 
    User, 
    Plus, 
    Minus, 
    Printer as PrinterIcon, 
    RefreshCw, 
    Barcode, 
    FileText, 
    Tag,
    Calculator,   
    Fingerprint,  
    ShieldCheck,  
    Loader2,
    Trash2,
    ShoppingCart,
    CheckCircle2
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

// --- DYNAMICS-STYLE PRODUCT GRID ---
const ProductGrid = ({ products, onProductSelect, onSKUScan, disabled }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, onSKUScan: (sku: string) => void, disabled: boolean }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);

    // DYNAMICS LOGIC: Global Scanner Listener
    useEffect(() => {
        let barcode = '';
        let lastKeyTime = Date.now();
        const SCANNER_INPUT_TIMEOUT = 50; // High speed for pro scanners

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in a specific input that isn't search
            if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== inputRef.current) return;

            const currentTime = Date.now();
            if (currentTime - lastKeyTime > SCANNER_INPUT_TIMEOUT) {
                barcode = '';
            }
            
            if (e.key === 'Enter') {
                if (barcode.length > 2) {
                    onSKUScan(barcode);
                    barcode = '';
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                barcode += e.key;
            }
            lastKeyTime = currentTime;
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSKUScan]);

    return (
        <div className={cn('flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-4 border-b relative bg-slate-50/30">
                <Barcode className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                <Input 
                    ref={inputRef}
                    placeholder="Scan Barcode or Search (Dynamics Mode Active)..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-10 h-12 rounded-xl border-slate-200 focus:ring-blue-500 font-medium" 
                />
            </div>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                    {filteredProducts.map(product => (
                        <Card 
                            key={product.variant_id} 
                            onClick={() => onProductSelect(product)} 
                            className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden group border-slate-100 rounded-xl"
                        >
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                                <div className="h-10 flex items-center justify-center">
                                    <p className="font-bold text-[13px] leading-tight text-slate-800 line-clamp-2">{product.product_name}</p>
                                </div>
                                <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter bg-slate-100 text-slate-500 border-none">
                                    {product.variant_name}
                                </Badge>
                                <p className="font-black text-blue-600 text-sm mt-1">UGX {product.price.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

// --- DYNAMICS-STYLE CART DISPLAY ---
const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency }: { cart: CartItem[], onUpdateQuantity: (id: number, newQty: number) => void, onRemoveItem: (id: number) => void, selectedCustomer: Customer | null, onSetCustomer: () => void, onCharge: () => void, isProcessing: boolean, discount: Discount, setDiscount: (d: Discount) => void, currency: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Dynamics Logic: Auto-scroll to bottom on new item scan
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [cart.length]);

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value); 
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Header: Customer Info */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-3 cursor-pointer" onClick={onSetCustomer}>
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-wider">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedCustomer ? `ID: ${selectedCustomer.id}` : 'Standard Retail'}</span>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={onSetCustomer} className="bg-transparent border-slate-700 text-white hover:bg-slate-800 font-bold text-[10px] uppercase">
                    Change (F2)
                </Button>
            </div>
            
            {/* Cart Body */}
            <ScrollArea ref={scrollRef} className="flex-1 bg-slate-50/30">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 py-20">
                        <ShoppingCart className="h-16 w-16 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Awaiting Transaction Scan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {cart.map(item => (
                            <div key={item.variant_id} className="p-4 bg-white hover:bg-blue-50/30 transition-colors animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-black text-slate-800 leading-tight">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.variant_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">{currency} {(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">@ {item.price.toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white rounded-md" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus className="h-3 w-3 text-red-500" />
                                        </Button>
                                        <span className="w-10 text-center font-black text-xs">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white rounded-md" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
                                            <Plus className="h-3 w-3 text-blue-500" />
                                        </Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => onRemoveItem(item.variant_id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            
            {/* Cart Footer: Dynamics-style Totals */}
            <div className="p-6 border-t bg-white space-y-5">
                <div className="space-y-3">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span><span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-blue-600 font-black uppercase text-[10px] tracking-widest gap-1">
                                    <Tag className="h-3 w-3" /> Adjust Discount
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4 rounded-2xl border-none shadow-2xl space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Discount Logic</Label>
                                    <Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}>
                                        <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Rate</Label>
                                    <Input type="number" value={discount.value} className="rounded-xl" onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-red-500 font-black text-sm">- {currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-baseline pt-4 border-t border-slate-100">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Balance Due</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">
                        <span className="text-sm mr-1">{currency}</span>
                        {total.toLocaleString()}
                    </span>
                </div>
                
                <Button 
                    className="w-full h-16 text-xl font-black uppercase tracking-[0.2em] bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-200 rounded-2xl transition-all" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin h-6 w-6"/> : "Finalize Charge (F1)"}
                </Button>
            </div>
        </div>
    );
};

// --- MAIN RETAIL DESK COMPONENT ---
export default function RetailDesk() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
    const [businessDNA, setBusinessDNA] = useState<any>(null);

    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();
    const products = useLiveQuery(() => db.products.toArray(), []);
    const handleWebPrint = useReactToPrint({ content: () => receiptRef.current });

    // --- Corporate Identity Sync ---
    useEffect(() => {
        if (!userProfile?.business_id) return;
        const fetchCorporateDNA = async () => {
            const supabase = createClient();
            const { data: corpIdentity } = await supabase.from('view_bbu1_corporate_identity').select('*').eq('business_id', userProfile.business_id).single();
            const { data: taxRes } = await supabase.from('tax_configurations').select('rate_percentage').eq('business_id', userProfile.business_id).eq('is_active', true).limit(1);
            if (corpIdentity) {
                setBusinessDNA({
                    name: corpIdentity.legal_name || 'Business Account',
                    phone: corpIdentity.official_phone || 'N/A',
                    tax_number: corpIdentity.tin_number || '',
                    currency: corpIdentity.currency_code || 'UGX',
                    footer: corpIdentity.receipt_footer || 'Thank you for your business!',
                    address: corpIdentity.physical_address || 'Operational HQ',
                    globalTaxRate: taxRes?.[0]?.rate_percentage || 0
                });
            }
        };
        fetchCorporateDNA();
    }, [userProfile]);

    const handleSync = async () => {
        setIsSyncing(true);
        const promise = async () => {
            const supabase = createClient();
            const { data: productsData } = await supabase.rpc('get_sellable_products');
            await db.products.clear();
            await db.products.bulkAdd(productsData as SellableProduct[] || []);
            const { data: customersData } = await supabase.from('customers').select('*');
            await db.customers.clear();
            await db.customers.bulkAdd(customersData as Customer[] || []);
            const offlineSales = await db.offlineSales.toArray();
            if (offlineSales.length > 0) {
                await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
                await db.offlineSales.clear();
            }
            return 'Global Nodes Synchronized!';
        };
        toast.promise(promise(), { loading: 'Syncing Ledger...', success: m => m, error: 'Sync Failed', finally: () => setIsSyncing(false) });
    };
    
    // --- Dynamics Core: The Scanning & Incrementing Logic ---
    const handleAddToCart = (product: SellableProduct) => {
        setCart(currentCart => { 
            const existingIndex = currentCart.findIndex(i => i.variant_id === product.variant_id); 
            if (existingIndex > -1) {
                const newCart = [...currentCart];
                newCart[existingIndex].quantity += 1;
                return newCart;
            }
            return [...currentCart, { ...product, quantity: 1 }]; 
        });
    };
    
    const handleSKUScan = (sku: string) => { 
        const product = products?.find(p => p.sku === sku); 
        if (product) { 
            handleAddToCart(product); 
            // Dynamics-style sensory feedback:
            const audio = new Audio('/beep.mp3'); 
            audio.play().catch(() => {}); // Play beep sound
            toast.success(`Scanned: ${product.product_name}`, { duration: 1000 });
        } else { 
            toast.error(`Invalid SKU: ${sku}`); 
        } 
    };

    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const totalAmount = round(subtotal - discountAmount);
        
        const newSale: Omit<OfflineSale, 'id'> = {
            createdAt: new Date(),
            cartItems: cart,
            customerId: selectedCustomer?.id || null,
            paymentMethod: paymentData.paymentMethod,
            amount_paid: paymentData.amountPaid,
            business_id: userProfile?.business_id!,
            user_id: userProfile?.id!,
            discount_type: discount.value > 0 ? discount.type : null,
            discount_value: discount.value > 0 ? discount.value : null,
            discount_amount: round(discountAmount),
            tax_amount: 0,
            payment_status: paymentData.amountPaid >= totalAmount ? 'paid' : 'partial',
            due_amount: Math.max(0, totalAmount - paymentData.amountPaid),
        };

        const saleId = await db.offlineSales.add(newSale as OfflineSale);
        
        const receiptData: ReceiptData = {
            saleInfo: { 
                id: saleId, created_at: newSale.createdAt, payment_method: newSale.paymentMethod, total_amount: totalAmount, amount_tendered: newSale.amount_paid, change_due: Math.max(0, paymentData.amountPaid - totalAmount), subtotal, discount: discountAmount, amount_due: newSale.due_amount, currency_code: businessDNA?.currency || 'UGX', total_tax: 0, kernel_seal_id: `TRAN-${saleId}`
            },
            storeInfo: { 
                name: businessDNA?.name, address: businessDNA?.address, phone_number: businessDNA?.phone, receipt_footer: businessDNA?.footer, tax_number: businessDNA?.tax_number
            },
            customerInfo: selectedCustomer,
            saleItems: cart.map(item => ({ product_name: item.product_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.price, subtotal: item.price * item.quantity, tax_amount: 0, tax_code: 'VAT' }))
        };

        setLastCompletedSale({ receiptData });
        setCart([]); setSelectedCustomer(null); setDiscount({ type: 'fixed', value: 0 }); setPaymentModalOpen(false);
    };

    if (!products || isProfileLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Calibrating Retail Desk...</p>
        </div>
    );

    if (lastCompletedSale) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
                <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white text-center py-10">
                        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-black uppercase">Sale Authorized</CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px]">Document Sealed in Local Database</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 bg-white">
                        <div ref={receiptRef} className="border-2 border-dashed border-slate-100 p-2 rounded-2xl">
                           <Receipt receiptData={lastCompletedSale.receiptData} autoPrint={false} />
                        </div>
                        <Button className="w-full h-14 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl" onClick={() => setLastCompletedSale(null)}>New Transaction</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Top Operational bar */}
            <div className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{businessDNA?.name} Terminal #01</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleSync} variant="ghost" className="h-10 font-bold uppercase text-[10px] text-blue-600 gap-2">
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} /> {isSyncing ? "Syncing..." : "Sync Ledger"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
                <div className="lg:col-span-7 xl:col-span-8 p-6 overflow-hidden flex flex-col">
                    <ProductGrid products={products} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                </div>
                <div className="lg:col-span-5 xl:col-span-4 p-6 overflow-hidden flex flex-col">
                    <CartDisplay 
                        cart={cart} currency={businessDNA?.currency || 'UGX'} onUpdateQuantity={(id, q) => q <= 0 ? setCart(cart.filter(i => i.variant_id !== id)) : setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: q } : i))} 
                        onRemoveItem={id => setCart(cart.filter(i => i.variant_id !== id))} selectedCustomer={selectedCustomer} onSetCustomer={() => setCustomerModalOpen(true)} onCharge={() => setPaymentModalOpen(true)} isProcessing={false} discount={discount} setDiscount={setDiscount} 
                    />
                </div>
            </div>
            
            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={c => { setSelectedCustomer(c); setCustomerModalOpen(false); }} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} totalAmount={cart.reduce((a, b) => a + (b.price * b.quantity), 0) - (discount.type === 'percentage' ? (cart.reduce((a, b) => a + (b.price * b.quantity), 0) * discount.value) / 100 : discount.value)} onConfirm={handleProcessPayment} isProcessing={false} />
        </div>
    );
}