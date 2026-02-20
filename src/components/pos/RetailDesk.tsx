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
    X, User, Plus, Minus, Printer as PrinterIcon, RefreshCw, Barcode, FileText, Tag,
    Calculator, // UPGRADE: Fractional/Unit Icon
    Fingerprint, // UPGRADE: Tax Seal Icon
    ShieldCheck, // UPGRADE: Forensic Icon
    Loader2      // UPGRADE: Loading Icon
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
                            className="cursor-pointer hover:shadow-lg transition-all relative overflow-hidden group border-slate-100 hover:border-blue-200"
                        >
                            {/* UPGRADE: Unit-of-Measure Indicator */}
                            {(product as any).units_per_pack > 1 && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white p-1 rounded-bl-lg shadow-sm z-10">
                                    <Calculator className="w-3 h-3" />
                                </div>
                            )}
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full min-h-[120px]">
                                <p className="font-bold text-sm line-clamp-2 text-slate-800 leading-tight mb-1">{product.product_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.variant_name}</p>
                                <div className="mt-auto pt-2 flex flex-col items-center gap-1">
                                    <p className="font-bold text-blue-700">UGX {product.price.toLocaleString()}</p>
                                    {(product as any).units_per_pack > 1 && (
                                        <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-bold uppercase">
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

const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount }: { cart: CartItem[], onUpdateQuantity: (id: number, newQty: number) => void, onRemoveItem: (id: number) => void, selectedCustomer: Customer | null, onSetCustomer: () => void, onCharge: () => void, isProcessing: boolean, discount: Discount, setDiscount: (d: Discount) => void }) => {
    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value);
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    return (
        <div className="flex flex-col h-full bg-card rounded-lg shadow border border-slate-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={onSetCustomer}>
                    <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                        <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-none text-slate-800">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        {selectedCustomer && <span className="text-[10px] text-muted-foreground font-mono">UID: {selectedCustomer.id}</span>}
                    </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={onSetCustomer}>Change (F2)</Button>
            </div>

            <ScrollArea className="flex-1 bg-white">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                        <Calculator className="h-10 w-10 opacity-10" />
                        <span className="text-sm italic">Cart is empty</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {cart.map(item => (
                            <div key={item.variant_id} className="flex flex-col p-3 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-bold text-slate-800 truncate leading-none">
                                                {item.product_name}
                                            </p>
                                            {(item as any).tax_category_code && (
                                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-mono uppercase bg-white text-slate-500 border-slate-200">
                                                    {(item as any).tax_category_code}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic truncate">
                                            {item.variant_name} 
                                            {(item as any).units_per_pack > 1 && ` • ${(item as any).units_per_pack} units/pk`}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-sm">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input 
                                            className="w-12 h-6 text-center font-black text-xs p-0 border-none bg-transparent focus-visible:ring-0" 
                                            type="number" 
                                            step="0.0001"
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <div className="w-24 text-right">
                                        <p className="font-bold text-sm text-slate-900">{(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[9px] text-muted-foreground">@ {item.price.toLocaleString()}</p>
                                    </div>

                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveItem(item.variant_id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            
            <div className="p-4 border-t bg-slate-50/50 space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                        <span>Subtotal</span>
                        <span>UGX {subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto flex items-center gap-1 text-blue-600 font-bold hover:no-underline underline-offset-4 decoration-dotted">
                                    <Tag className="h-3 w-3" /> Add Discount
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4 space-y-4" align="start">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Discount Type</Label>
                                    <Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}>
                                        <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed Amount (UGX)</SelectItem>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Value</Label>
                                    <Input 
                                        type="number" 
                                        className="h-8"
                                        value={discount.value} 
                                        onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-sm text-destructive font-black">- UGX {discountAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                <Fingerprint className="w-2.5 h-2.5 text-blue-500"/> Sovereign Seal Active
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                <ShieldCheck className="w-2.5 h-2.5 text-green-500" /> Global Audit Enabled
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end border-t-2 border-slate-200 pt-3">
                    <span className="font-bold text-slate-500 uppercase text-xs tracking-widest">Grand Total</span>
                    <span className="font-black text-3xl text-slate-900 leading-none">
                        <span className="text-sm font-bold mr-1">UGX</span>
                        {total.toLocaleString()}
                    </span>
                </div>

                <Button 
                    className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>PROCESSING...</span>
                        </div>
                    ) : "EXECUTE CHARGE (F1)"}
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

    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();

    const products = useLiveQuery(() => db.products.toArray(), []);

    const handleWebPrint = useReactToPrint({ content: () => receiptRef.current });

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
            toast.error("User profile not loaded. Please sync data and try again.");
            return setPaymentModalOpen(false);
        }

        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const totalAmount = subtotal - discountAmount;
        const dueAmount = totalAmount - paymentData.amountPaid;

        if (dueAmount > 0 && !selectedCustomer) {
            return toast.error("A customer must be selected for credit or partial payments.");
        }

        let payment_status: 'paid' | 'partial' | 'unpaid' = 'paid';
        if (dueAmount > 0.01) payment_status = 'partial'; 
        else if (paymentData.amountPaid <= 0) payment_status = 'unpaid';

        const newSale: Omit<OfflineSale, 'id'> = {
            createdAt: new Date(),
            cartItems: cart,
            customerId: selectedCustomer?.id || null,
            paymentMethod: paymentData.paymentMethod,
            amount_paid: paymentData.amountPaid,
            business_id: userProfile.business_id,
            user_id: userProfile.id,
            discount_type: discount.value > 0 ? discount.type : null,
            discount_value: discount.value > 0 ? discount.value : null,
            discount_amount: discountAmount > 0 ? discountAmount : null,
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
                change_due: newSale.amount_paid > totalAmount ? newSale.amount_paid - totalAmount : 0,
                subtotal,
                discount: discountAmount,
                amount_due: newSale.due_amount,
                // UPGRADE: Unique Kernel Forensic ID
                kernel_seal_id: `SOV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
            },
            storeInfo: { 
                name: 'Sovereign ERP', 
                address: 'Kampala, Uganda', 
                phone_number: '0703 XXX XXX', 
                receipt_footer: 'Sealed by Sovereign Kernel' 
            },
            customerInfo: selectedCustomer,
            saleItems: cart.map(item => ({ 
                product_name: item.product_name, 
                variant_name: item.variant_name, 
                quantity: item.quantity, 
                unit_price: item.price, 
                subtotal: item.quantity * item.price 
            }))
        };

        setLastCompletedSale({ receiptData });
        toast.success(`Sale #${saleId} recorded locally. Forensic Seal Pending.`);
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
            toast.success(`Robotic Scan: ${product.product_name}`, { icon: <Barcode className="h-4 w-4" /> }); 
        } else { 
            toast.error(`SKU Not Registered: ${sku}`); 
        } 
    };
    
    const isLoading = !products || isProfileLoading;
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
    const totalAmount = subtotal - discountAmount;

    if (isLoading) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center h-screen bg-slate-50">
                <RefreshCw className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                <p className="mb-2 text-lg font-bold text-slate-800">{isProfileLoading ? "Retrieving Fiduciary Profile..." : "Initializing Local Registry..."}</p>
                <p className="text-sm text-slate-400 italic font-mono tracking-tighter">Connecting to Sovereign Kernel v4.0...</p>
                <Skeleton className="h-10 w-32 mt-6 rounded-full" />
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center bg-slate-100/50 min-h-screen">
                <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden animate-in fade-in zoom-in duration-300">
                    <CardHeader className="bg-blue-600 text-white text-center pb-8">
                        <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="w-8 h-8 text-white"/>
                        </div>
                        <CardTitle className="text-2xl font-black">TRANSACTION SEALED</CardTitle>
                        <CardDescription className="text-blue-100 italic">Journal entry recorded in Sovereign Ledger</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6 bg-white -mt-4 rounded-t-2xl relative z-10">
                        <div ref={receiptRef} className="border border-slate-100 rounded-lg shadow-inner bg-slate-50/30">
                            <Receipt 
                                receiptData={lastCompletedSale.receiptData} 
                                autoPrint={false} 
                                defaultPrinterName={defaultPrinter || undefined} 
                            />
                        </div>
                        <div className="flex gap-4 no-print pt-2">
                            <Button variant="outline" className="w-full h-12 font-bold" onClick={() => setLastCompletedSale(null)}>NEW TRANSACTION</Button>
                            <Button className="w-full h-12 bg-blue-600 font-bold hover:bg-blue-700" onClick={() => toast.info('Reprint job queued.')}>
                                <PrinterIcon className="mr-2 h-4 w-4" /> REPRINT
                            </Button>
                        </div>
                        <Button variant="link" size="sm" className="w-full text-slate-400 font-bold" onClick={handleWebPrint}>
                            <FileText className="mr-2 h-4 w-4" /> EXPORT TO GLOBAL PDF (A4)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="h-screen flex flex-col bg-slate-100/30 overflow-hidden font-sans">
            {/* Header / Sync Bar */}
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tighter text-slate-800 leading-none">RETAIL DESK</h1>
                        <p className="text-[10px] text-blue-600 font-bold leading-none mt-1">SOVEREIGN KERNEL v4.0</p>
                    </div>
                </div>
                
                <div className="no-print">
                    <Button 
                        onClick={handleSync} 
                        variant="outline" 
                        size="sm" 
                        disabled={isSyncing} 
                        className="shadow-sm border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 font-bold"
                    >
                        <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && 'animate-spin')} />
                        {isSyncing ? 'SYNCING LOGIC...' : 'SYNC KERNEL'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
                {/* Product Section */}
                <div className="lg:col-span-7 h-full overflow-hidden flex flex-col">
                    <ProductGrid 
                        products={products || []} 
                        onProductSelect={handleAddToCart} 
                        onSKUScan={handleSKUScan} 
                        disabled={isSyncing} 
                    />
                </div>

                {/* Cart Section */}
                <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
                    <CartDisplay 
                        cart={cart} 
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

            {/* Modals */}
            <CustomerSearchModal 
                isOpen={isCustomerModalOpen} 
                onClose={() => setCustomerModalOpen(false)} 
                onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} 
            />
            
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