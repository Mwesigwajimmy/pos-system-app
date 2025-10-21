'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, OfflineSale } from '@/lib/db';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard'; 
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile'; 
import useDefaultPrinter from '@/hooks/useDefaultPrinter';
import { useSync } from '@/components/core/SyncProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, User, Plus, Minus, Printer as PrinterIcon, RefreshCw, FileText, Loader2, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import CustomerSearchModal from '@/components/customers/CustomerSearchModal';
import PaymentModal from '@/components/pos/PaymentModal';
import { Receipt, ReceiptData } from '@/components/pos/Receipt';
import ProductSearch from '@/components/pos/ProductSearch';

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
};

const ProductGrid = ({ products, onProductSelect, disabled }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, disabled: boolean }) => {
    return (
        <div className={cn('flex flex-col h-full bg-card rounded-lg shadow-inner', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-4 border-b">
                <h3 className="font-semibold text-muted-foreground">Quick Add</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {products.map(product => (
                        <Card key={product.variant_id} onClick={() => onProductSelect(product)} className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <p className="font-bold text-sm line-clamp-2">{product.product_name}</p>
                                <p className="text-xs text-muted-foreground">{product.variant_name}</p>
                                <p className="mt-2 font-semibold">UGX {product.price.toLocaleString()}</p>
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
        <div className="flex flex-col h-full bg-card rounded-lg shadow-md">
            <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onSetCustomer}><User className="h-5 w-5" /><span className="font-bold text-lg">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span></div>
                <Button variant="secondary" size="sm" onClick={onSetCustomer}>Change (F2)</Button>
            </div>
            <ScrollArea className="flex-1 bg-muted/20">
                {cart.length === 0 ? <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">Your cart is empty. <br/> Use the search bar to add products.</div> : 
                    <div className="p-2">{cart.map(item => (
                        <div key={item.variant_id} className="flex items-center gap-2 p-2 border-b">
                            <div className="flex-1"><p className="text-sm font-semibold">{item.product_name} ({item.variant_name})</p><p className="text-xs text-muted-foreground">@ UGX {item.price.toLocaleString()}</p></div>
                            <div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button><span className="w-8 text-center font-bold text-lg">{item.quantity}</span><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button></div>
                            <p className="w-24 text-right font-bold">UGX {(item.price * item.quantity).toLocaleString()}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemoveItem(item.variant_id)}><X className="h-4 w-4" /></Button>
                        </div>
                    ))}</div>
                }
            </ScrollArea>
            <div className="p-4 border-t space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="link" size="sm" className="p-0 h-auto flex items-center gap-1 text-blue-600"><Tag className="h-3 w-3" /> Add Discount</Button></PopoverTrigger>
                            <PopoverContent className="w-64 p-4 space-y-4">
                                <div><Label>Discount Type</Label><Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed Amount (UGX)</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select></div>
                                <div><Label>Value</Label><Input type="number" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/></div>
                            </PopoverContent>
                        </Popover>
                        <span className="font-medium text-destructive">- UGX {discountAmount.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex justify-between font-bold text-2xl border-t pt-2"><span>Total</span><span>UGX {total.toLocaleString()}</span></div>
                <Button className="w-full h-16 text-xl font-bold" onClick={onCharge} disabled={cart.length === 0 || isProcessing}>{isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Processing...</> : "Charge (F1)"}</Button>
            </div>
        </div>
    );
};

export default function POSPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
    const receiptRef = useRef<HTMLDivElement>(null);

    const { isSyncing, triggerSync } = useSync();
    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();
    const products = useLiveQuery(() => db.products.orderBy('product_name').toArray(), []);
    
    const handleWebPrint = useReactToPrint({ content: () => receiptRef.current });

    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        setIsSaving(true);
        if (!userProfile?.business_id || !userProfile.id) {
            toast.error("User profile not loaded. Please sync data and try again.");
            setIsSaving(false);
            setPaymentModalOpen(false);
            return;
        }

        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const totalAmount = subtotal - discountAmount;
        const dueAmount = totalAmount - paymentData.amountPaid;

        if (dueAmount > 0.01 && !selectedCustomer) {
            toast.error("A customer must be selected for credit or partial payments.");
            setIsSaving(false);
            return;
        }

        let payment_status: 'paid' | 'partial' | 'unpaid' = 'paid';
        if (dueAmount > 0.01) payment_status = 'partial';
        else if (paymentData.amountPaid <= 0 && totalAmount > 0) payment_status = 'unpaid';

        const newSale: Omit<OfflineSale, 'id'> = {
            createdAt: new Date(),
            cartItems: cart,
            customerId: selectedCustomer?.id || null,
            paymentMethod: paymentData.paymentMethod,
            business_id: userProfile.business_id,
            user_id: userProfile.id,
            amount_paid: paymentData.amountPaid,
            payment_status,
            due_amount: dueAmount > 0 ? dueAmount : 0,
            discount_type: discount.value > 0 ? discount.type : null,
            discount_value: discount.value > 0 ? discount.value : null,
            discount_amount: discountAmount > 0 ? discountAmount : null,
        };
        
        const saleId = await db.offlineSales.add(newSale as OfflineSale);
        
        const receiptData: ReceiptData = {
            saleInfo: { 
                id: saleId, created_at: newSale.createdAt, payment_method: newSale.paymentMethod, 
                total_amount: totalAmount, amount_tendered: newSale.amount_paid, 
                change_due: newSale.amount_paid > totalAmount ? newSale.amount_paid - totalAmount : 0,
                subtotal, discount: discountAmount, amount_due: newSale.due_amount
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
        setIsSaving(false);
    };

    const handleAddToCart = (product: SellableProduct | SearchResultProduct) => {
        setCart(currentCart => { 
            const existing = currentCart.find(i => i.variant_id === product.variant_id); 
            if (existing) {
                return currentCart.map(i => i.variant_id === product.variant_id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [...currentCart, { ...product, quantity: 1, stock: 0 }]; 
        });
        toast.success(`Added: ${product.product_name}`);
    };

    const handleUpdateQuantity = (id: number, qty: number) => { 
        if (qty <= 0) { 
            handleRemoveItem(id); 
            return; 
        } 
        setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: qty } : i)); 
    };
    
    const handleRemoveItem = (id: number) => setCart(cart.filter(i => i.variant_id !== id));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.querySelector('[role="dialog"]')) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if ((e.key === 'F1' || (e.ctrlKey && e.key === ' ')) && cart.length > 0) { e.preventDefault(); setPaymentModalOpen(true); }
            if ((e.key === 'F2' || (e.ctrlKey && e.key === 'c'))) { e.preventDefault(); setCustomerModalOpen(true); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]);

    const totalAmount = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        return subtotal - discountAmount;
    }, [cart, discount]);
    
    const isLoading = (!products && !isSyncing) || isProfileLoading;

    if (isLoading) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center h-screen">
                <p className="mb-4 text-lg">{isProfileLoading ? "Loading user profile..." : "Loading local data..."}</p>
                <p className="mb-4 text-sm text-muted-foreground">If this is your first time or data is missing, please sync.</p>
                <Button onClick={triggerSync} disabled={isSyncing}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && 'animate-spin')} />
                    {isSyncing ? 'Syncing...' : 'Sync Data Now'}
                </Button>
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center bg-gray-100 min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader><CardTitle className="text-center">Sale Complete!</CardTitle><CardDescription className="text-center">Receipt is ready.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border rounded-md">
                            <Receipt 
                                ref={receiptRef} 
                                receiptData={lastCompletedSale.receiptData} 
                                autoPrint={true} 
                                defaultPrinterName={defaultPrinter ?? undefined} 
                            />
                        </div>
                        <div className="flex gap-4 no-print">
                            <Button variant="outline" className="w-full" onClick={() => setLastCompletedSale(null)}>New Sale</Button>
                            <Button className="w-full" onClick={() => toast.info('Reprint job sent.')}><PrinterIcon className="mr-2 h-4 w-4" />Reprint</Button>
                        </div>
                        <Button variant="link" size="sm" className="w-full" onClick={handleWebPrint}>
                            <FileText className="mr-2 h-4 w-4" />Print to A4 (Web Fallback)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="h-screen grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/40">
                <div className="flex flex-col gap-4 overflow-hidden">
                    <ProductSearch onProductSelect={handleAddToCart} />
                    <ProductGrid 
                        products={products?.slice(0, 12) || []}
                        onProductSelect={handleAddToCart} 
                        disabled={isSyncing} 
                    />
                </div>
                <CartDisplay 
                    cart={cart} 
                    onUpdateQuantity={handleUpdateQuantity} 
                    onRemoveItem={handleRemoveItem} 
                    selectedCustomer={selectedCustomer} 
                    onSetCustomer={() => setCustomerModalOpen(true)} 
                    onCharge={() => setPaymentModalOpen(true)} 
                    isProcessing={isSaving} 
                    discount={discount} 
                    setDiscount={setDiscount}
                />
            </div>
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
                isProcessing={isSaving} 
            />
        </>
    );
}