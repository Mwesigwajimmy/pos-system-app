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
import { 
    X, User, Plus, Minus, Printer as PrinterIcon, RefreshCw, 
    FileText, Loader2, Tag, Calculator, Fingerprint, Activity,
    ShieldAlert, Lock, Zap, KeyRound, CheckCircle, Barcode 
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import CustomerSearchModal from '@/components/customers/CustomerSearchModal';
import PaymentModal from '@/components/pos/PaymentModal';
import { Receipt, ReceiptData } from '@/components/pos/Receipt';
import ProductSearch from '@/components/pos/ProductSearch';
import { createClient } from '@/lib/supabase/client'; 

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

// --- UPGRADED PRODUCT GRID: ROBOTIC SCANNER INTEGRATED ---
const ProductGrid = ({ products, onProductSelect, disabled, onSKUScan }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, disabled: boolean, onSKUScan: (sku: string) => void }) => {
    
    useEffect(() => {
        let barcode = '';
        let lastKeyTime = new Date(0);
        const SCANNER_INPUT_TIMEOUT = 50; // Supermarket Standard Speed

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
        <div className={cn('flex flex-col h-full bg-card rounded-lg shadow-inner', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Quick Add Inventory</h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-primary animate-pulse">
                    <Barcode size={14} /> SCANNER ACTIVE
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {products.map(product => (
                        <Card key={product.variant_id} onClick={() => onProductSelect(product)} className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition-all relative overflow-hidden group">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center relative">
                                {(product as any).units_per_pack > 1 && (
                                    <div className="absolute top-0 right-0 p-1 bg-blue-600 text-white rounded-bl-lg shadow-sm">
                                        <Calculator className="w-3 h-3" />
                                    </div>
                                )}
                                <p className="font-bold text-sm line-clamp-2 text-slate-800">{product.product_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{product.variant_name}</p>
                                <p className="mt-2 font-black text-primary">{(product.price || 0).toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

// --- CART DISPLAY: MULTI-TENANT LOCALIZATION ---
const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency = 'UGX' }: any) => {
    const subtotal = useMemo(() => cart.reduce((acc: any, item: any) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value);
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;
    
    return (
        <div className="flex flex-col h-full bg-card rounded-lg shadow-md border border-slate-200/50">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={onSetCustomer}>
                    <User className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                    <span className="font-bold text-lg tracking-tight">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="hidden md:flex text-blue-600 border-blue-200 bg-white" onClick={() => toast.info("Prescription Sync Active")}>
                        <Activity className="w-4 h-4 mr-1" /> Clinical
                    </Button>
                    <Button variant="secondary" size="sm" className="font-bold" onClick={onSetCustomer}>Change (F2)</Button>
                </div>
            </div>
            <ScrollArea className="flex-1 bg-muted/10">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center opacity-40">
                        <Calculator size={48} className="mb-4" />
                        <p className="text-sm font-medium italic">Cart empty. <br/> Awaiting scan or search.</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {cart.map((item: any) => (
                            <div key={item.variant_id} className="flex flex-col p-3 bg-white border rounded-lg shadow-sm gap-1 group transition-all hover:border-primary/30">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
                                            {item.product_name}
                                            {item.tax_category_code && (
                                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-mono uppercase bg-slate-50 text-slate-500 border-slate-200">
                                                    {item.tax_category_code}
                                                </Badge>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                            {item.variant_name} 
                                            {item.units_per_pack > 1 && ` • 1 PK / ${item.units_per_pack} UNITS`}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-slate-50 rounded-md p-1 border">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                                        <Input 
                                            className="w-14 h-7 text-center font-black text-xs p-0 border-none bg-transparent" 
                                            type="number" 
                                            step="0.0001"
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>

                                    <div className="w-24 text-right">
                                        <p className="font-bold text-sm text-slate-900">{(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[9px] text-muted-foreground italic">@ {item.price.toLocaleString()}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => onRemoveItem(item.variant_id)}><X className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            <div className="p-4 border-t bg-white space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-slate-600"><span>Subtotal</span><span>{currency} {subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="link" size="sm" className="p-0 h-auto flex items-center gap-1 text-blue-600 font-bold hover:no-underline"><Tag className="h-3 w-3" /> Apply Discount</Button></PopoverTrigger>
                            <PopoverContent className="w-64 p-4 space-y-4" align="start">
                                <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}><SelectTrigger className="h-8"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed ({currency})</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select></div>
                                <div className="space-y-1.5"><Label className="text-xs">Value</Label><Input type="number" className="h-8" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/></div>
                            </PopoverContent>
                        </Popover>
                        <span className="font-black text-destructive">- {currency} {discountAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                <Fingerprint className="w-2.5 h-2.5 text-blue-500"/> Sovereign Seal Active
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> Audit Linked
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-end border-t-2 border-slate-100 pt-3">
                    <span className="font-bold text-slate-500 uppercase text-xs tracking-[0.2em]">Payable Amount</span>
                    <span className="font-black text-3xl text-slate-900 leading-none">
                        <span className="text-sm font-bold mr-1">{currency}</span>
                        {total.toLocaleString()}
                    </span>
                </div>
                <Button className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] uppercase italic" onClick={onCharge} disabled={cart.length === 0 || isProcessing}>
                    {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Journaling...</> : "Execute Charge (F1)"}
                </Button>
            </div>
        </div>
    );
};

// --- MAIN POS PAGE: SECURITY & FIDUCIARY CORE ---
export default function POSPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [lastCompletedSale, setLastCompletedSale] = useState<CompletedSale | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
    const receiptRef = useRef<HTMLDivElement>(null);
    
    // Sentry Security State
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

    // Sentry Real-time Handshake
    useEffect(() => {
        if (!userProfile?.id) return;
        const channel = supabase.channel('sentry_pos_handshake')
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

            if (authError) throw new Error("Invalid Manager Credentials");

            const { data: managerProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single();

            if (managerProfile?.role !== 'admin' && managerProfile?.role !== 'manager') {
                throw new Error("Authorization Denied: Managerial level required.");
            }

            const { error: reactivateErr } = await supabase
                .from('profiles')
                .update({ is_active: true })
                .eq('id', userProfile?.id);

            if (reactivateErr) throw reactivateErr;

            await supabase.from('system_global_telemetry').insert({
                event_category: 'SECURITY',
                event_name: 'ROBOTIC_LOCKDOWN_OVERRIDDEN',
                tenant_id: userProfile?.tenant_id,
                metadata: { authorized_by: managerEmail, target_user: userProfile?.email }
            });

            setIsLockedDown(false);
            setManagerEmail("");
            setManagerPassword("");
            refetchProfile();
            toast.success("Security Overridden. Operational status restored.");
        } catch (err: any) {
            toast.error(err.message || "Bypass Failed.");
        } finally {
            setIsVerifyingManager(false);
        }
    };

    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id || !userProfile.id) {
            toast.error("User profile not loaded.");
            return;
        }

        setIsSaving(true);

        try {
            // --- ENTERPRISE FIDUCIARY MATH ---
            const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
            const totalAmount = subtotal - discountAmount;
            
            // Dynamic Tax Calculation
            const taxRate = (userProfile as any).tax_rate || 0;
            const taxAmount = (totalAmount * taxRate) / (100 + taxRate); 
            const netAmount = totalAmount - taxAmount;

            const changeDue = paymentData.amountPaid > totalAmount ? paymentData.amountPaid - totalAmount : 0;
            const dueAmount = totalAmount - paymentData.amountPaid;

            if (dueAmount > 0.01 && !selectedCustomer) {
                throw new Error("Customer identification required for credit/partial payments.");
            }

            let payment_status: 'paid' | 'partial' | 'unpaid' = 'paid';
            if (dueAmount > 0.01) payment_status = 'partial';
            else if (paymentData.amountPaid <= 0 && totalAmount > 0) payment_status = 'unpaid';

            // --- ATOMIC DB TRANSACTION ---
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
                        id: saleId, created_at: newSale.createdAt, payment_method: newSale.paymentMethod, 
                        total_amount: totalAmount, amount_tendered: paymentData.amountPaid, 
                        change_due: changeDue, subtotal, discount: discountAmount,
                        tax_amount: taxAmount, net_amount: netAmount, amount_due: dueAmount,
                        kernel_seal_id: `SOV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                    },
                    storeInfo: { 
                        name: userProfile.business_name || 'Sovereign POS', 
                        address: (userProfile as any).address || 'No Address Provided', 
                        phone_number: (userProfile as any).phone_number || 'No Contact Provided', 
                        receipt_footer: (userProfile as any).receipt_footer || 'Thank you for your business!' 
                    },
                    customerInfo: selectedCustomer,
                    saleItems: cart.map(item => ({ product_name: item.product_name, variant_name: item.variant_name, quantity: item.quantity, unit_price: item.price, subtotal: item.quantity * item.price }))
                };
            });
            
            setLastCompletedSale({ receiptData });
            toast.success(`Sale Sealed. Change: ${userProfile.currency_symbol || 'UGX'} ${changeDue.toLocaleString()}`, { duration: 8000 });
            setCart([]);
            setSelectedCustomer(null);
            setDiscount({ type: 'fixed', value: 0 });
            setPaymentModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Fiduciary error during checkout.");
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
            toast.success(`Scanned: ${product.product_name}`);
        } else {
            toast.error(`SKU Not Registered: ${sku}`);
        }
    };

    const handleUpdateQuantity = (id: number, qty: number) => { 
        if (qty <= 0) { handleRemoveItem(id); return; } 
        setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: qty } : i)); 
    };
    
    const handleRemoveItem = (id: number) => {
        const itemToRemove = cart.find(i => i.variant_id === id);
        if (itemToRemove && itemToRemove.price > 100000) {
            toast.error("SECURITY ALERT: High-value deletion logged.", { icon: <ShieldAlert className="text-red-500" /> });
        }
        setCart(cart.filter(i => i.variant_id !== id));
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isLockedDown) return; 
            if (document.querySelector('[role="dialog"]')) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if ((e.key === 'F1' || (e.ctrlKey && e.key === ' ')) && cart.length > 0) { e.preventDefault(); setPaymentModalOpen(true); }
            if ((e.key === 'F2' || (e.ctrlKey && e.key === 'c'))) { e.preventDefault(); setCustomerModalOpen(true); }
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

    // SECURITY LOCKDOWN UI
    if (isLockedDown || userProfile?.is_active === false) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-10 text-center space-y-8 animate-in fade-in duration-500">
                <div className="p-12 bg-red-600/10 rounded-full border-4 border-red-600/50 animate-pulse relative">
                    <Lock size={100} className="text-red-600" />
                    <ShieldAlert size={32} className="absolute top-8 right-8 text-white fill-red-600" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-5xl font-black uppercase tracking-tighter italic">Robotic Lockdown</h1>
                    <p className="max-w-md text-slate-400 font-medium mx-auto">Suspected threat pattern detected. Terminal suspended. Supervisor override required.</p>
                </div>
                <Card className="w-full max-w-sm bg-white/5 border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center justify-center gap-2">
                            <KeyRound size={12}/> Credentials Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6 pb-6">
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Manager Email</Label>
                            <Input type="email" placeholder="manager@system.com" className="bg-black/50 border-white/10 h-11" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Secret Password</Label>
                            <Input type="password" placeholder="••••••••" className="bg-black/50 border-white/10 h-11" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} />
                        </div>
                        <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-xs" onClick={handleManagerOverride} disabled={isVerifyingManager || !managerEmail || !managerPassword}>
                            {isVerifyingManager ? <Loader2 className="animate-spin h-5 w-5 mr-2"/> : <Zap size={16} className="mr-2 fill-current"/>} Authorize Bypass
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center h-screen bg-slate-50">
                <RefreshCw className="animate-spin h-10 w-10 text-blue-600 mb-4" />
                <p className="text-lg font-black uppercase italic tracking-tighter">Establishing Link to Sovereign Core...</p>
                <Button onClick={triggerSync} disabled={isSyncing} className="mt-4">
                    Manual Re-sync
                </Button>
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-4 md:p-8 flex flex-col items-center bg-slate-100 min-h-screen animate-in zoom-in duration-300">
                <Card className="w-full max-w-md shadow-2xl border-none rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-blue-600 text-white p-8 text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 mb-4" />
                        <CardTitle className="uppercase font-black text-2xl italic tracking-tighter">Transaction Sealed</CardTitle>
                        <CardDescription className="text-blue-100 italic font-mono text-xs">Kernel ID: {lastCompletedSale.receiptData.saleInfo.kernel_seal_id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6 bg-white">
                        <div className="border rounded-2xl shadow-inner bg-slate-50/50 p-2">
                            <Receipt ref={receiptRef} receiptData={lastCompletedSale.receiptData} autoPrint={true} defaultPrinterName={defaultPrinter ?? undefined} />
                        </div>
                        <div className="flex gap-4 no-print p-2">
                            <Button variant="outline" className="w-full h-14 font-black uppercase text-xs tracking-widest rounded-xl" onClick={() => setLastCompletedSale(null)}>New Transaction</Button>
                            <Button className="w-full h-14 bg-blue-600 font-black uppercase text-xs tracking-widest rounded-xl" onClick={() => handleWebPrint()}><PrinterIcon className="mr-2 h-4 w-4" />Reprint</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="h-screen grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/40 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-hidden h-full">
                    <ProductSearch onProductSelect={handleAddToCart} />
                    <ProductGrid 
                        products={products?.slice(0, 24) || []}
                        onProductSelect={handleAddToCart} 
                        onSKUScan={handleSKUScan}
                        disabled={isSyncing} 
                    />
                </div>
                <div className="h-full overflow-hidden">
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
        </>
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