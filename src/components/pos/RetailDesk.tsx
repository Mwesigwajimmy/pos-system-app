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
    Landmark,
    Trash2
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

// --- CHILD COMPONENTS ---

const ProductGrid = ({ products, onProductSelect, onSKUScan, disabled }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, onSKUScan: (sku: string) => void, disabled: boolean }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredProducts = useMemo(() =>
        products.filter(p =>
            p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);

    useEffect(() => {
        let barcode = '';
        let lastKeyTime = new Date(0);
        const SCANNER_INPUT_TIMEOUT = 100;

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
        <div className={cn('flex flex-col h-full bg-card rounded-lg shadow', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-4 border-b relative">
                <Barcode className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search or scan product SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11" />
            </div>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {filteredProducts.map(product => (
                        <Card 
                            key={product.variant_id} 
                            onClick={() => onProductSelect(product)} 
                            className="cursor-pointer hover:shadow-xl transition-all relative overflow-hidden group border-slate-100"
                        >
                            {(product as any).units_per_pack > 1 && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white p-1 rounded-bl-lg shadow-sm z-10">
                                    <Calculator className="w-3 h-3" />
                                </div>
                            )}
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="font-black text-sm line-clamp-2 text-slate-800 uppercase tracking-tighter">{product.product_name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{product.variant_name}</p>
                                <div className="mt-3">
                                    <p className="font-black text-blue-700 text-base">UGX {product.price.toLocaleString()}</p>
                                    {(product as any).units_per_pack > 1 && (
                                        <Badge variant="outline" className="text-[8px] mt-1 border-blue-200 text-blue-500 font-black">
                                            PACK: {(product as any).units_per_pack} UNITS
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency }: { cart: CartItem[], onUpdateQuantity: (id: number, newQty: number) => void, onRemoveItem: (id: number) => void, selectedCustomer: Customer | null, onSetCustomer: () => void, onCharge: () => void, isProcessing: boolean, discount: Discount, setDiscount: (d: Discount) => void, currency: string }) => {
    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value); 
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    return (
        <div className="flex flex-col h-full bg-card rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3 cursor-pointer" onClick={onSetCustomer}>
                    <div className="p-2 bg-white rounded-full shadow-sm border">
                        <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xs uppercase tracking-widest leading-none">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        <span className="text-[9px] text-slate-400 font-mono mt-1">{selectedCustomer ? `ID: ${selectedCustomer.id}` : 'ANONYMOUS SALE'}</span>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={onSetCustomer} className="font-black text-[10px] uppercase border-slate-300">Switch (F2)</Button>
            </div>
            
            <ScrollArea className="flex-1 bg-white">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                        <ShoppingCart className="h-16 w-16 opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Registry Empty</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {cart.map(item => (
                            <div key={item.variant_id} className="flex flex-col p-4 rounded-2xl border border-slate-100 gap-2 group hover:bg-slate-50 transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.variant_name}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-white border rounded-lg p-1 shadow-inner">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input 
                                            className="w-16 h-8 text-center font-black text-sm p-0 border-none focus-visible:ring-0 bg-transparent" 
                                            type="number" 
                                            step="0.001"
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="w-28 text-right">
                                        <p className="font-black text-sm font-mono">{currency} {(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">@ {item.price.toLocaleString()}</p>
                                    </div>

                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveItem(item.variant_id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            
            <div className="p-6 border-t space-y-6 bg-slate-50/50">
                <div className="space-y-3">
                    <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest">
                        <span>Gross Subtotal</span><span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 font-black uppercase tracking-widest text-[10px]">
                                    <Tag className="h-3 w-3 mr-1.5" /> Adjust Pricing
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-6 rounded-3xl shadow-2xl border-none animate-in zoom-in-95">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Deduction Method</Label>
                                        <Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}>
                                            <SelectTrigger className="h-11 mt-2 rounded-xl"><SelectValue/></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="fixed">Fixed Value</SelectItem>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Deduction Value</Label>
                                        <Input type="number" value={discount.value} className="h-11 mt-2 rounded-xl font-mono" onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-red-600 font-black font-mono">- {currency} {discountAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between pt-4 text-[9px] text-slate-300 font-black uppercase tracking-tighter border-t border-slate-200">
                        <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3 text-blue-400"/> Sovereign Seal Active</span>
                        <span className="flex items-center gap-1">Audit Enabled <ShieldCheck className="w-3 h-3 text-emerald-400" /></span>
                    </div>
                </div>

                <div className="flex justify-between font-black text-4xl text-slate-900 tracking-tighter font-mono">
                    <span>Total</span><span>{currency} {total.toLocaleString()}</span>
                </div>
                
                <Button 
                    className="w-full h-20 text-2xl font-black uppercase tracking-[0.2em] bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-200 rounded-[1.5rem] transition-all hover:scale-[1.02] active:scale-95" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? (
                        <><Loader2 className="animate-spin mr-3 h-8 w-8"/>Executing...</>
                    ) : (
                        "Charge"
                    )}
                </Button>
            </div>
        </div>
    );
};

// --- MAIN CONTROLLER ---
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

    // GRASSROOT FETCH: Pulls the professional identity for the current session
    useEffect(() => {
        if (!userProfile?.business_id) return;

        const fetchDNA = async () => {
            const supabase = createClient();
            
            const [tenantRes, locationRes, taxRes] = await Promise.all([
                supabase.from('tenants').select('name, phone, tax_number, currency_code, receipt_footer').eq('id', userProfile.business_id).single(),
                supabase.from('locations').select('address').eq('business_id', userProfile.business_id).eq('is_primary', true).single(),
                supabase.from('tax_configurations').select('rate_percentage').eq('business_id', userProfile.business_id).eq('is_active', true).limit(1)
            ]);

            setBusinessDNA({
                name: tenantRes.data?.name || 'Authorized Entity',
                phone: tenantRes.data?.phone || 'UNREGISTERED',
                tax_number: tenantRes.data?.tax_number || 'NONE',
                currency: tenantRes.data?.currency_code || 'UGX',
                footer: tenantRes.data?.receipt_footer || 'BBU1 Sovereign Ledger Verified',
                address: locationRes.data?.address || 'NO PHYSICAL ADDRESS RECORDED',
                globalTaxRate: taxRes.data?.[0]?.rate_percentage || 0
            });
        };
        fetchDNA();
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
                const { error: syncError } = await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
                if (syncError) throw new Error(syncError.message);
                await db.offlineSales.clear();
                return `${offlineSales.length} Ledger entries sealed successfully.`;
            }
            return 'Kernel Registry Synchronized.';
        };
        toast.promise(promise(), { 
            loading: 'Establishing Neural Sync...', 
            success: (message) => message, 
            error: (err: any) => `Sync Exception: ${err.message}`, 
            finally: () => setIsSyncing(false) 
        });
    };
    
    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id) {
            toast.error("Handshake Expired. Re-authenticating...");
            return setPaymentModalOpen(false);
        }

        // GRASSROOT MATH: Forcing 2-Decimal Parity with Backend Kernel
        const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
        
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const taxRate = businessDNA?.globalTaxRate || 0;
        
        // Caculate itemized tax for professional receipts
        const saleItemsWithTax = cart.map(item => {
            const itemSubtotal = round(item.price * item.quantity);
            const itemTax = round(itemSubtotal * (taxRate / 100));
            return {
                ...item,
                tax_rate: taxRate,
                tax_amount: itemTax,
                subtotal: itemSubtotal,
                total_with_tax: itemSubtotal + itemTax
            };
        });

        const totalTax = saleItemsWithTax.reduce((acc, item) => acc + item.tax_amount, 0);
        const totalAmount = round(subtotal - discountAmount + totalTax);
        const dueAmount = round(totalAmount - paymentData.amountPaid);

        if (dueAmount > 0.01 && !selectedCustomer) {
            return toast.error("Credit authorization requires customer identification.");
        }

        const newSale: Omit<OfflineSale, 'id'> = {
            createdAt: new Date(),
            cartItems: saleItemsWithTax,
            customerId: selectedCustomer?.id || null,
            paymentMethod: paymentData.paymentMethod,
            amount_paid: paymentData.amountPaid,
            business_id: userProfile.business_id,
            user_id: userProfile.id,
            discount_type: discount.value > 0 ? discount.type : null,
            discount_value: discount.value > 0 ? discount.value : null,
            discount_amount: round(discountAmount),
            tax_amount: round(totalTax),
            payment_status: dueAmount > 0.01 ? 'partial' : 'paid',
            due_amount: dueAmount > 0 ? dueAmount : 0,
        };

        const saleId = await db.offlineSales.add(newSale as OfflineSale);
        
        const receiptData: ReceiptData = {
            saleInfo: { 
                id: saleId, 
                created_at: newSale.createdAt, 
                payment_method: newSale.paymentMethod, 
                total_amount: totalAmount, 
                amount_tendered: newSale.amount_paid,
                change_due: newSale.amount_paid > totalAmount ? round(newSale.amount_paid - totalAmount) : 0,
                subtotal: round(subtotal),
                discount: round(discountAmount),
                amount_due: newSale.due_amount,
                currency_code: businessDNA?.currency || 'UGX',
                total_tax: round(totalTax),
                kernel_seal_id: `SOV-${Math.random().toString(36).substr(2, 5).toUpperCase()}${saleId}`
            },
            storeInfo: { 
                name: businessDNA?.name || 'Sovereign Business', 
                address: businessDNA?.address || 'NO PHYSICAL ADDRESS RECORDED', 
                phone_number: businessDNA?.phone || 'NO CONTACT RECORDED', 
                receipt_footer: businessDNA?.footer || 'Thank you for your business!',
                tax_number: businessDNA?.tax_number
            },
            customerInfo: selectedCustomer,
            saleItems: saleItemsWithTax.map(item => ({ 
                product_name: item.product_name, 
                variant_name: item.variant_name, 
                quantity: item.quantity, 
                unit_price: item.price, 
                subtotal: item.subtotal,
                tax_amount: item.tax_amount,
                tax_code: 'VAT'
            }))
        };

        setLastCompletedSale({ receiptData });
        toast.success(`Entry #${saleId} sealed in Local Ledger.`);
        setCart([]);
        setSelectedCustomer(null);
        setDiscount({ type: 'fixed', value: 0 });
        setPaymentModalOpen(false);
    };

    const handleAddToCart = (product: SellableProduct) => setCart(currentCart => { 
        const existing = currentCart.find(i => i.variant_id === product.variant_id); 
        return existing ? currentCart.map(i => i.variant_id === product.variant_id ? { ...i, quantity: i.quantity + 1 } : i) : [...currentCart, { ...product, quantity: 1 }]; 
    });
    
    const handleUpdateQuantity = (id: number, qty: number) => { 
        if (qty <= 0) { handleRemoveItem(id); return; } 
        setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: qty } : i)); 
    };
    
    const handleRemoveItem = (id: number) => setCart(cart.filter(i => i.variant_id !== id));
    
    const handleSKUScan = (sku: string) => { 
        if (!products) return; 
        const product = products.find(p => p.sku === sku); 
        if (product) { 
            handleAddToCart(product); 
            toast.success(`Forensic Scan: ${product.product_name}`); 
        } else { 
            toast.error(`SKU Invalid: ${sku}`); 
        } 
    };
    
    const isLoading = !products || isProfileLoading;
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
    const totalAmount = subtotal - discountAmount;
    const activeCurrency = businessDNA?.currency || 'UGX';

    if (isLoading) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
                <Loader2 className="h-20 w-20 animate-spin text-blue-500 mb-8" />
                <p className="text-2xl font-black uppercase tracking-[0.4em] animate-pulse">Initializing Kernel</p>
                <p className="text-xs text-slate-500 mt-4 italic">Establishing Sovereign Handshake...</p>
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-12 flex flex-col items-center bg-slate-50 min-h-screen">
                <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden rounded-[3rem] bg-white ring-1 ring-slate-100">
                    <CardHeader className="bg-slate-900 text-white text-center pb-10 pt-12">
                        <CardTitle className="flex flex-col items-center justify-center gap-4">
                           <div className="p-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20">
                             <ShieldCheck className="w-12 h-12 text-white"/>
                           </div>
                           <span className="text-3xl font-black uppercase tracking-widest">Sealed</span>
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Document #{(lastCompletedSale.receiptData.saleInfo.id as any)?.toString().padStart(8,'0')} immutable in Ledger</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-10 pt-12 pb-12">
                        <div ref={receiptRef} className="shadow-2xl rounded-xl overflow-hidden mx-auto border scale-110 mb-10 mt-6 bg-white">
                            <Receipt receiptData={lastCompletedSale.receiptData} autoPrint={false} defaultPrinterName={defaultPrinter || undefined} />
                        </div>
                        <div className="flex gap-4 no-print px-8">
                            <Button variant="outline" className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-slate-100 hover:bg-slate-50" onClick={() => setLastCompletedSale(null)}>New Entry</Button>
                            <Button className="w-full h-16 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-2xl" onClick={() => toast.info('Queueing print engine...')}>
                                <PrinterIcon className="mr-2 h-5 w-5" />Reprint
                            </Button>
                        </div>
                        <button onClick={handleWebPrint} className="w-full text-slate-300 font-bold uppercase tracking-widest text-[9px] hover:text-blue-500 transition-colors">
                           Export Forensic Compliance Document (A4)
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen bg-slate-50 font-sans">
            <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
                 <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40" />
                 <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                    EMPIRE: {businessDNA?.name || 'Authenticating...'}
                 </span>
            </div>
            
            <div className="absolute top-4 right-6 no-print z-20">
                <Button onClick={handleSync} variant="outline" size="sm" disabled={isSyncing} className="shadow-2xl border-none bg-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl hover:scale-105 transition-all">
                    <RefreshCw className={cn("mr-2 h-4 w-4 text-blue-600", isSyncing && 'animate-spin')} />
                    {isSyncing ? 'Neural Sync...' : 'Sync Kernel'}
                </Button>
            </div>

            <div className="h-screen grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
                <div className="lg:col-span-7 h-full overflow-hidden flex flex-col">
                    <ProductGrid products={products || []} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                </div>
                <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
                    <CartDisplay 
                        cart={cart} 
                        currency={activeCurrency}
                        onUpdateQuantity={handleUpdateQuantity} 
                        onRemoveItem={handleRemoveItem} 
                        selectedCustomer={selectedCustomer} 
                        onSetCustomer={() => setCustomerModalOpen(true)} 
                        onCharge={() => setPaymentModalOpen(true)} 
                        isProcessing={false}
                        discount={discount}
                        setDiscount={setDiscount} 
                    />
                </div>
            </div>
            
            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} totalAmount={totalAmount} onConfirm={handleProcessPayment} isProcessing={false} />
        </div>
    );
}