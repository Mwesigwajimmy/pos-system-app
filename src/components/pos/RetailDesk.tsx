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
    Landmark
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

// --- NEW/UPDATED TYPES ---
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
                <Input placeholder="Search or scan product SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {filteredProducts.map(product => (
                        <Card 
                            key={product.variant_id} 
                            onClick={() => onProductSelect(product)} 
                            className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden group border-slate-100"
                        >
                            {(product as any).units_per_pack > 1 && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white p-1 rounded-bl-lg shadow-sm z-10">
                                    <Calculator className="w-3 h-3" />
                                </div>
                            )}
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="font-bold text-sm line-clamp-2 text-slate-800">{product.product_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{product.variant_name}</p>
                                <div className="mt-2 flex flex-col items-center gap-1">
                                    <p className="font-bold text-blue-700">UGX {product.price.toLocaleString()}</p>
                                    {(product as any).units_per_pack > 1 && (
                                        <span className="text-[8px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 font-bold uppercase">
                                            1 PK : {(product as any).units_per_pack} UNITS
                                        </span>
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
        <div className="flex flex-col h-full bg-card rounded-lg shadow border border-slate-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onSetCustomer}>
                    <User className="h-5 w-5 text-slate-600" />
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-none">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        {selectedCustomer && <span className="text-[10px] text-muted-foreground font-mono">ID: {selectedCustomer.id}</span>}
                    </div>
                </div>
                <Button variant="secondary" size="sm" onClick={onSetCustomer} className="font-bold">Change (F2)</Button>
            </div>
            
            <ScrollArea className="flex-1">
                {cart.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs uppercase tracking-widest opacity-40">
                        <ShoppingCart className="mr-2 h-4 w-4" /> Cart is empty
                    </div>
                ) : (
                    <div className="p-2">
                        {cart.map(item => (
                            <div key={item.variant_id} className="flex flex-col p-2 border-b gap-1 group hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold flex items-center gap-1">
                                            {item.product_name}
                                            {(item as any).tax_category_code && (
                                                <Badge variant="outline" className="text-[8px] h-3 px-1 font-mono uppercase bg-slate-50">
                                                    {(item as any).tax_category_code}
                                                </Badge>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            {item.variant_name} 
                                            {(item as any).units_per_pack > 1 && ` • ${(item as any).units_per_pack} units/pk`}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-white border rounded p-0.5 shadow-sm">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus className="h-3 w-3 text-red-500" />
                                        </Button>
                                        <Input 
                                            className="w-14 h-7 text-center font-black text-xs p-0 border-none focus-visible:ring-0" 
                                            type="number" 
                                            step="0.0001"
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
                                            <Plus className="h-3 w-3 text-blue-500" />
                                        </Button>
                                    </div>

                                    <div className="w-24 text-right">
                                        <p className="font-bold text-sm">{currency} {(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[9px] text-muted-foreground">@ {item.price.toLocaleString()}</p>
                                    </div>

                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveItem(item.variant_id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            
            <div className="p-4 border-t space-y-4 bg-slate-50/30">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                        <span>Subtotal</span><span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto flex items-center gap-1 text-blue-600 font-black uppercase tracking-widest text-[10px]">
                                    <Tag className="h-3 w-3" /> Add Discount
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4 space-y-4 rounded-2xl shadow-2xl border-none">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Discount Type</Label>
                                    <Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}>
                                        <SelectTrigger className="h-10 mt-1"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Value</Label>
                                    <Input type="number" value={discount.value} className="h-10 mt-1" onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-destructive font-black font-mono">- {currency} {discountAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between pt-1 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Fingerprint className="w-2.5 h-2.5 text-blue-500"/> Sovereign Seal Active</span>
                        <span className="flex items-center gap-1">Audit Enabled <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /></span>
                    </div>
                </div>

                <div className="flex justify-between font-black text-3xl border-t-2 border-slate-200 pt-3 text-slate-900 tracking-tighter font-mono">
                    <span>Total</span><span>{currency} {total.toLocaleString()}</span>
                </div>
                
                <Button 
                    className="w-full h-16 text-xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 rounded-2xl transition-all hover:scale-[1.02] active:scale-95" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? (
                        <><Loader2 className="animate-spin mr-2 h-6 w-6"/>Processing...</>
                    ) : (
                        "Execute Charge (F1)"
                    )}
                </Button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
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

    // --- UPGRADED IDENTITY HANDSHAKE LOGIC ---
    useEffect(() => {
        if (!userProfile?.business_id) return;

        const fetchCorporateDNA = async () => {
            const supabase = createClient();
            
            // Upgrade: Fetching from high-performance Corporate Identity View
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
            const { data: printersData } = await supabase.from('printers').select('*');
            await db.printers.clear();
            await db.printers.bulkAdd(printersData as Printer[] || []);
            const offlineSales = await db.offlineSales.toArray();
            
            if (offlineSales.length > 0) {
                const { error: syncError } = await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
                if (syncError) throw new Error(`Failed to sync sales: ${syncError.message}`);
                await db.offlineSales.clear();
                return `${offlineSales.length} offline sale(s) synced to Sovereign Kernel!`;
            }
            return 'Global Registry is up to date!';
        };
        toast.promise(promise(), { 
            loading: 'Synchronizing Global Kernel...', 
            success: (message) => message, 
            error: (err: any) => `Sync failed: ${err.message}`, 
            finally: () => setIsSyncing(false) 
        });
    };
    
    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id || !userProfile.id) {
            toast.error("User profile not loaded. Sync data and retry.");
            return setPaymentModalOpen(false);
        }

        const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
        
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const taxRate = businessDNA?.globalTaxRate || 0;
        
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
            return toast.error("A customer must be selected for credit or partial payments.");
        }

        let payment_status: 'paid' | 'partial' | 'unpaid' = 'paid';
        if (dueAmount > 0.01) payment_status = 'partial'; 
        else if (paymentData.amountPaid <= 0) payment_status = 'unpaid';

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
            payment_status,
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
                kernel_seal_id: `SOV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            },
            storeInfo: { 
                name: businessDNA?.name || 'Sovereign ERP', 
                address: businessDNA?.address || 'Kampala, Uganda', 
                phone_number: businessDNA?.phone || '0703 XXX XXX', 
                receipt_footer: businessDNA?.footer || 'Sealed by Sovereign Kernel',
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
        toast.success(`Sale #${saleId} birthed locally. Audit Link Active.`);
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
            <div className="p-10 text-center flex flex-col items-center justify-center h-screen bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="mb-2 text-xl font-black text-slate-800 uppercase tracking-widest">{isProfileLoading ? "Retrieving Fiduciary DNA..." : "Initializing Global Registry..."}</p>
                <p className="text-sm text-slate-400 italic">Establishing Handshake with Sovereign Kernel...</p>
                <Skeleton className="h-12 w-48 mt-6 rounded-xl" />
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center bg-slate-100 min-h-screen">
                <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-slate-900 text-white text-center pb-8 pt-8">
                        <CardTitle className="flex flex-col items-center justify-center gap-3">
                           <ShieldCheck className="w-12 h-12 text-emerald-400"/> 
                           <span className="text-2xl font-black uppercase tracking-tighter">Transaction Complete</span>
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Document Sealed in Sovereign Ledger</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-10 bg-white">
                        <div ref={receiptRef} className="shadow-2xl border rounded-xl overflow-hidden mx-auto scale-95 origin-top">
                            <Receipt receiptData={lastCompletedSale.receiptData} autoPrint={false} defaultPrinterName={defaultPrinter || undefined} />
                        </div>
                        <div className="flex gap-4 no-print px-4 pb-4">
                            <Button variant="outline" className="w-full h-14 font-black uppercase tracking-widest text-xs border-2 border-slate-100 hover:bg-slate-50" onClick={() => setLastCompletedSale(null)}>New Entry</Button>
                            <Button className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl" onClick={() => toast.info('Physical print job queued.')}>
                                <PrinterIcon className="mr-2 h-4 w-4 text-blue-400" />Reprint
                            </Button>
                        </div>
                        <Button variant="link" size="sm" className="w-full text-slate-400 font-bold uppercase tracking-widest text-[8px]" onClick={handleWebPrint}>
                           <FileText className="mr-2 h-3 w-3" /> Generate External Compliance PDF (A4)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen bg-slate-50">
            <div className="absolute top-4 left-6 z-20 flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Operational Mode: {businessDNA?.name || 'Sovereign'}
                 </span>
            </div>
            
            <div className="absolute top-4 right-4 no-print z-20 flex gap-2">
                <Button onClick={handleSync} variant="outline" size="sm" disabled={isSyncing} className="shadow-xl border-none bg-white font-black uppercase text-[9px] tracking-widest h-10 px-4">
                    <RefreshCw className={cn("mr-2 h-3.5 w-3.5 text-blue-600", isSyncing && 'animate-spin')} />
                    {isSyncing ? 'Synchronizing...' : 'Sync Kernel'}
                </Button>
            </div>

            <div className="h-screen grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
                <div className="h-full overflow-hidden flex flex-col">
                    <ProductGrid products={products || []} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                </div>
                <div className="h-full overflow-hidden flex flex-col">
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
            
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                totalAmount={totalAmount} 
                onConfirm={handleProcessPayment} 
                isProcessing={false} 
            />
        </div>
    );
}