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
import { X, User, Plus, Minus, Printer as PrinterIcon, RefreshCw, Barcode, FileText, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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
            <ScrollArea className="flex-1"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">{filteredProducts.map(product => (<Card key={product.variant_id} onClick={() => onProductSelect(product)} className="cursor-pointer hover:shadow-lg transition-shadow"><CardContent className="p-4 flex flex-col items-center justify-center text-center"><p className="font-bold text-sm">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.variant_name}</p><p className="mt-2 font-semibold">UGX {product.price.toLocaleString()}</p></CardContent></Card>))}</div></ScrollArea>
        </div>
    );
};

const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount }: { cart: CartItem[], onUpdateQuantity: (id: number, newQty: number) => void, onRemoveItem: (id: number) => void, selectedCustomer: Customer | null, onSetCustomer: () => void, onCharge: () => void, isProcessing: boolean, discount: Discount, setDiscount: (d: Discount) => void }) => {
    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value); // Cannot discount more than the subtotal
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    return (
        <div className="flex flex-col h-full bg-card rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center"><div className="flex items-center gap-2 cursor-pointer" onClick={onSetCustomer}><User className="h-5 w-5" /><span className="font-bold">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span></div><Button variant="secondary" size="sm" onClick={onSetCustomer}>Change</Button></div>
            <ScrollArea className="flex-1">{cart.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground">Cart is empty</div> : <div className="p-2">{cart.map(item => (<div key={item.variant_id} className="flex items-center gap-2 p-2 border-b"><div className="flex-1"><p className="text-sm font-semibold">{item.product_name} ({item.variant_name})</p><p className="text-xs text-muted-foreground">@ UGX {item.price.toLocaleString()}</p></div><div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button><span className="w-6 text-center font-bold">{item.quantity}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button></div><p className="w-20 text-right font-bold">UGX {(item.price * item.quantity).toLocaleString()}</p><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.variant_id)}><X className="h-4 w-4" /></Button></div>))}</div>}</ScrollArea>
            
            <div className="p-4 border-t space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="link" size="sm" className="p-0 h-auto flex items-center gap-1"><Tag className="h-3 w-3" /> Discount</Button></PopoverTrigger>
                            <PopoverContent className="w-64 p-4 space-y-4">
                                <div><Label>Discount Type</Label><Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed Amount</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select></div>
                                <div><Label>Value</Label><Input type="number" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/></div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-destructive">- UGX {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span><span>UGX {total.toLocaleString()}</span>
                </div>
                <Button className="w-full h-16 text-xl" onClick={onCharge} disabled={cart.length === 0 || isProcessing}>{isProcessing ? "Processing..." : "Charge"}</Button>
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
                // IMPORTANT: The payload for sync_offline_sales needs to match the new table structure.
                // This might require updating your `sync_offline_sales` RPC function in Supabase.
                const { error: syncError } = await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
                if (syncError) throw new Error(`Failed to sync sales: ${syncError.message}`);
                await db.offlineSales.clear();
                return `${offlineSales.length} offline sale(s) synced successfully!`;
            }
            return 'Data is up to date!';
        };
        toast.promise(promise(), { loading: 'Syncing data...', success: (message) => message, error: (err: any) => `Sync failed: ${err.message}`, finally: () => setIsSyncing(false) });
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
        if (dueAmount > 0.01) payment_status = 'partial'; // Use a small threshold for float comparison
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
            },
            storeInfo: { name: 'UG-BizSuite', address: 'Kampala, Uganda', phone_number: '0703 XXX XXX', receipt_footer: 'Thank you for your business!' },
            customerInfo: selectedCustomer,
            saleItems: cart.map(item => ({ product_name: item.product_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.price, subtotal: item.quantity * item.price }))
        };

        setLastCompletedSale({ receiptData });
        toast.success(`Sale #${saleId} saved locally.`);
        setCart([]);
        setSelectedCustomer(null);
        setDiscount({ type: 'fixed', value: 0 });
        setPaymentModalOpen(false);
    };

    const handleAddToCart = (product: SellableProduct) => setCart(currentCart => { const existing = currentCart.find(i => i.variant_id === product.variant_id); return existing ? currentCart.map(i => i.variant_id === product.variant_id ? { ...i, quantity: i.quantity + 1 } : i) : [...currentCart, { ...product, quantity: 1 }]; });
    const handleUpdateQuantity = (id: number, qty: number) => { if (qty <= 0) { handleRemoveItem(id); return; } setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: qty } : i)); };
    const handleRemoveItem = (id: number) => setCart(cart.filter(i => i.variant_id !== id));
    const handleSKUScan = (sku: string) => { if (!products) return; const product = products.find(p => p.sku === sku); if (product) { handleAddToCart(product); toast.success(`Added: ${product.product_name}`); } else { toast.error(`SKU not found: ${sku}`); } };
    
    const isLoading = !products || isProfileLoading;
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
    const totalAmount = subtotal - discountAmount;

    if (isLoading) {
        return <div className="p-10 text-center flex flex-col items-center justify-center h-screen"><p className="mb-4 text-lg">{isProfileLoading ? "Loading user profile..." : "Loading local database..."}</p><Skeleton className="h-10 w-32" /></div>;
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center bg-gray-100 min-h-screen">
                <Card className="w-full max-w-md"><CardHeader><CardTitle className="text-center">Sale Complete!</CardTitle><CardDescription className="text-center">Receipt is ready.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div ref={receiptRef} className="border rounded-md">
                            <Receipt receiptData={lastCompletedSale.receiptData} autoPrint={false} defaultPrinterName={defaultPrinter || undefined} />
                        </div>
                        <div className="flex gap-4 no-print">
                            <Button variant="outline" className="w-full" onClick={() => setLastCompletedSale(null)}>New Sale</Button>
                            <Button className="w-full" onClick={() => toast.info('Reprint job sent.')}>
                                <PrinterIcon className="mr-2 h-4 w-4" />Reprint
                            </Button>
                        </div>
                        <Button variant="link" size="sm" className="w-full" onClick={handleWebPrint}><FileText className="mr-2 h-4 w-4" />Print to A4 (Web)</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <>
            <div className="absolute top-4 right-4 no-print z-10"><Button onClick={handleSync} variant="outline" size="sm" disabled={isSyncing}><RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && 'animate-spin')} />{isSyncing ? 'Syncing...' : 'Sync Data'}</Button></div>
            <div className="h-screen grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/40">
                <ProductGrid products={products || []} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
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
            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} />
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                totalAmount={totalAmount} 
                onConfirm={handleProcessPayment} 
                isProcessing={false} 
            />
        </>
    );
}