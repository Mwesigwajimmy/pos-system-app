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
    Search, ShoppingCart, CreditCard
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
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Quick Selection</h3>
                <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600">
                    <Barcode size={14} /> SCANNER READY
                </div>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(product => (
                        <Card key={product.variant_id} onClick={() => onProductSelect(product)} className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden bg-white border-slate-100">
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

// --- CART DISPLAY ---
const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency = 'UGX' }: any) => {
    const subtotal = useMemo(() => cart.reduce((acc: any, item: any) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value);
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;
    
    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Cart Header */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={onSetCustomer}>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-blue-500 transition-colors">
                        <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-tight">
                            {selectedCustomer ? `ID: ${selectedCustomer.id}` : 'Guest Sale'}
                        </span>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="font-bold text-xs h-8 border-slate-200 shadow-sm" onClick={onSetCustomer}>Change (F2)</Button>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 bg-white">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 p-8 gap-4">
                        <ShoppingCart size={40} className="opacity-20" />
                        <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Cart is empty</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {cart.map((item: any) => (
                            <div key={item.variant_id} className="flex flex-col p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-2 group hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 truncate">{item.product_name}</p>
                                            {item.tax_category_code && (
                                                <Badge variant="outline" className="text-[9px] h-4 border-slate-200 text-slate-500 px-1 font-mono uppercase">
                                                    {item.tax_category_code}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                                            {item.variant_name} 
                                            {item.units_per_pack > 1 && ` • ${item.units_per_pack} Units`}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                                        <Input 
                                            className="w-12 h-7 text-center font-bold text-xs p-0 border-none bg-transparent" 
                                            type="number" 
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>

                                    <div className="w-24 text-right">
                                        <p className="font-bold text-sm text-slate-900">{(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400 font-medium italic">@ {item.price.toLocaleString()}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => onRemoveItem(item.variant_id)}><X className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Totals Section */}
            <div className="p-6 border-t bg-slate-50 space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                        <span>Subtotal</span>
                        <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-auto flex items-center gap-1.5 text-blue-600 font-bold hover:bg-transparent">
                                    <Tag className="h-3.5 w-3.5" /> Apply Discount
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-5 rounded-xl shadow-xl border-slate-200" align="start">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Discount Type</Label>
                                        <Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}>
                                            <SelectTrigger className="h-10"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fixed">Fixed ({currency})</SelectItem>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Value</Label>
                                        <Input type="number" className="h-10" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="font-bold text-red-600">-{currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Due</span>
                    <span className="font-bold text-3xl text-slate-900 tracking-tight leading-none">
                        <span className="text-sm font-bold text-slate-400 mr-1">{currency}</span>
                        {total.toLocaleString()}
                    </span>
                </div>

                <Button 
                    className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? (
                        <><Loader2 className="mr-2 h-6 w-6 animate-spin"/> Processing...</>
                    ) : (
                        <><CreditCard className="mr-3 h-6 w-6" /> Pay Now (F1)</>
                    )}
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
    const receiptRef = useRef<HTMLDivElement>(null);
    
    // Security States
    const [isLockedDown, setIsLockedDown] = useState(false);
    const [managerEmail, setManagerEmail] = useState("");
    const [managerPassword, setManagerPassword] = useState("");
    const [isVerifyingManager, setIsVerifyingManager] = useState(false);

    const { isSyncing, triggerSync } = useSync();
    const { data: userProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();
    const products = useLiveQuery(() => db.products.orderBy('product_name').toArray(), []);
    
    const handleWebPrint = useReactToPrint({ content: () => receiptRef.current });
    const supabase = createClient();

    // Security Channel Sync
    useEffect(() => {
        if (!userProfile?.id) return;
        const channel = supabase.channel('pos_security_sync')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'profiles', 
                filter: `id=eq.${userProfile.id}` 
            }, (payload) => {
                if (payload.new.is_active === false) {
                    setIsLockedDown(true);
                }
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userProfile?.id, supabase]);

    const handleManagerOverride = async () => {
        setIsVerifyingManager(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: managerEmail,
                password: managerPassword,
            });

            if (authError) throw new Error("Invalid credentials");

            const { data: managerProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single();

            if (managerProfile?.role !== 'admin' && managerProfile?.role !== 'manager') {
                throw new Error("Authorization denied: Manager status required.");
            }

            const { error: reactivateErr } = await supabase
                .from('profiles')
                .update({ is_active: true })
                .eq('id', userProfile?.id);

            if (reactivateErr) throw reactivateErr;

            setIsLockedDown(false);
            setManagerEmail("");
            setManagerPassword("");
            refetchProfile();
            toast.success("Terminal unlocked.");
        } catch (err: any) {
            toast.error(err.message || "Bypass failed.");
        } finally {
            setIsVerifyingManager(false);
        }
    };

    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id || !userProfile.id) return;

        setIsSaving(true);
        try {
            const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
            const totalAmount = subtotal - discountAmount;
            
            const taxRate = (userProfile as any).tax_rate || 0;
            const taxAmount = (totalAmount * taxRate) / (100 + taxRate); 
            const netAmount = totalAmount - taxAmount;

            const changeDue = paymentData.amountPaid > totalAmount ? paymentData.amountPaid - totalAmount : 0;
            const dueAmount = totalAmount - paymentData.amountPaid;

            if (dueAmount > 0.01 && !selectedCustomer) {
                throw new Error("Select a customer to process a partial payment.");
            }

            let payment_status: 'paid' | 'partial' | 'unpaid' = 'paid';
            if (dueAmount > 0.01) payment_status = 'partial';
            else if (paymentData.amountPaid <= 0 && totalAmount > 0) payment_status = 'unpaid';

            const receiptData = await db.transaction('rw', db.offlineSales, async () => {
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
                
                return {
                    saleInfo: { 
                        id: saleId, 
                        created_at: newSale.createdAt, 
                        payment_method: newSale.paymentMethod, 
                        total_amount: totalAmount, 
                        amount_tendered: paymentData.amountPaid, 
                        change_due: changeDue, 
                        subtotal, 
                        discount: discountAmount,
                        tax_amount: taxAmount, 
                        net_amount: netAmount, 
                        amount_due: dueAmount,
                        kernel_seal_id: `ID-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                    },
                    storeInfo: { 
                        name: userProfile.business_name || 'Store', 
                        address: (userProfile as any).address || '-', 
                        phone_number: (userProfile as any).phone_number || '-', 
                        receipt_footer: (userProfile as any).receipt_footer || 'Thank you for shopping!' 
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
            });
            
            setLastCompletedSale({ receiptData });
            toast.success(`Sale Complete. Change: UGX ${changeDue.toLocaleString()}`);
            setCart([]);
            setSelectedCustomer(null);
            setDiscount({ type: 'fixed', value: 0 });
            setPaymentModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Payment failed.");
        } finally {
            setIsSaving(false);
        }
    };

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

    const handleUpdateQuantity = (id: number, qty: number) => { 
        if (qty <= 0) { handleRemoveItem(id); return; } 
        setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: qty } : i)); 
    };
    
    const handleRemoveItem = (id: number) => {
        setCart(cart.filter(i => i.variant_id !== id));
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isLockedDown) return; 
            if (document.querySelector('[role="dialog"]')) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if (e.key === 'F1' && cart.length > 0) { e.preventDefault(); setPaymentModalOpen(true); }
            if (e.key === 'F2') { e.preventDefault(); setCustomerModalOpen(true); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, isLockedDown]);

    const totalAmount = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        return subtotal - discountAmount;
    }, [cart, discount]);
    
    const isLoading = (!products && !isSyncing) || isProfileLoading;

    // LOCKED TERMINAL UI
    if (isLockedDown || userProfile?.is_active === false) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-10 text-center space-y-8 animate-in fade-in duration-500">
                <div className="p-10 bg-white rounded-full border border-red-100 shadow-xl relative">
                    <Lock size={80} className="text-red-500" />
                    <div className="absolute top-6 right-6">
                        <ShieldAlert size={28} className="text-red-600" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900">Terminal Locked</h1>
                    <p className="max-w-md text-slate-500 font-medium mx-auto">This station has been suspended. Please provide manager credentials to continue.</p>
                </div>
                <Card className="w-full max-w-sm bg-white border-slate-200 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-2">
                            <KeyRound size={14}/> Manager Override
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6 pb-6">
                        <div className="space-y-1.5 text-left">
                            <Label className="text-[11px] font-bold text-slate-600 uppercase ml-1">Email</Label>
                            <Input type="email" placeholder="manager@example.com" className="h-11" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1.5 text-left">
                            <Label className="text-[11px] font-bold text-slate-600 uppercase ml-1">Password</Label>
                            <Input type="password" placeholder="••••••••" className="h-11" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} />
                        </div>
                        <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md" onClick={handleManagerOverride} disabled={isVerifyingManager || !managerEmail || !managerPassword}>
                            {isVerifyingManager ? <Loader2 className="animate-spin h-5 w-5 mr-2"/> : <Zap size={16} className="mr-2" />} Unlock Terminal
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center h-screen bg-white">
                <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Connecting to system...</p>
                <Button variant="ghost" size="sm" onClick={triggerSync} disabled={isSyncing} className="mt-4 text-slate-400">
                    Refresh Sync
                </Button>
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-screen bg-slate-50 animate-in zoom-in duration-300">
                <Card className="w-full max-w-md shadow-2xl border-none rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="bg-emerald-600 text-white p-10 text-center">
                        <CheckCircle className="mx-auto h-16 w-16 mb-4" />
                        <CardTitle className="uppercase font-bold text-2xl tracking-tight">Sale Completed</CardTitle>
                        <CardDescription className="text-emerald-100 font-semibold text-xs mt-1">Transaction recorded: {lastCompletedSale.receiptData.saleInfo.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-8 px-8 pb-8">
                        <div className="border border-slate-100 rounded-xl shadow-sm bg-white p-3">
                            <Receipt ref={receiptRef} receiptData={lastCompletedSale.receiptData} autoPrint={true} defaultPrinterName={defaultPrinter ?? undefined} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-12 font-bold uppercase text-xs rounded-xl border-slate-200" onClick={() => setLastCompletedSale(null)}>New Sale</Button>
                            <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs rounded-xl shadow-md" onClick={() => handleWebPrint()}><PrinterIcon className="mr-2 h-4 w-4" /> Print</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* System Status Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-3">
                     <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Terminal Active: {userProfile?.business_name || 'Loading...'}
                     </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button onClick={triggerSync} variant="outline" size="sm" disabled={isSyncing} className="h-9 px-4 border-slate-200 text-xs font-bold uppercase">
                        <RefreshCw className={cn("mr-2 h-3.5 w-3.5 text-blue-600", isSyncing && 'animate-spin')} />
                        {isSyncing ? 'Syncing...' : 'Sync Data'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden min-h-0">
                {/* Left Side: Search and Grid */}
                <div className="lg:col-span-7 flex flex-col gap-6 overflow-hidden min-h-0">
                    <div className="shrink-0">
                        <ProductSearch onProductSelect={handleAddToCart} />
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0">
                        <ProductGrid 
                            products={products?.slice(0, 24) || []}
                            onProductSelect={handleAddToCart} 
                            onSKUScan={handleSKUScan}
                            disabled={isSyncing} 
                        />
                    </div>
                </div>

                {/* Right Side: Cart */}
                <div className="lg:col-span-5 h-full overflow-hidden min-h-0">
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
                        currency={userProfile?.currency_symbol || 'UGX'}
                    />
                </div>
            </div>

            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={(c) => {setSelectedCustomer(c); setCustomerModalOpen(false);}} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} totalAmount={totalAmount} onConfirm={handleProcessPayment} isProcessing={isSaving} />
        </div>
    );
}

function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}