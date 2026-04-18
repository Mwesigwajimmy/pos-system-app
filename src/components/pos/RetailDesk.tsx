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
    ArrowLeft, ShieldCheck, MapPin, Smartphone
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

// --- CHILD COMPONENT: PRODUCT GRID ---
const ProductGrid = ({ products, onProductSelect, onSKUScan, disabled }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredProducts = useMemo(() =>
        products.filter((p: any) =>
            p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);

    return (
        <div className={cn('flex flex-col h-full bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden', disabled && 'opacity-50')}>
            <div className="p-6 border-b bg-slate-50/50 relative">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Search product or scan barcode..." 
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
                                <p className="font-black text-slate-900 leading-tight mb-1">{product.product_name}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">{product.variant_name}</p>
                                <div className="mt-auto pt-4 border-t border-slate-50">
                                    <p className="font-black text-blue-600 text-lg">UGX {product.price.toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
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
    const [identity, setIdentity] = useState<any>(null);

    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();

    const products = useLiveQuery(() => db.products.toArray(), []);
    
    // --- PROFESSIONAL PRINT TRIGGER ---
    const handleWebPrint = useReactToPrint({ 
        content: () => receiptRef.current,
        documentTitle: 'BBU1_Fiscal_Receipt',
        onAfterPrint: () => setLastCompletedSale(null)
    });

    // --- 1. SOVEREIGN IDENTITY HANDSHAKE ---
    useEffect(() => {
        if (!userProfile?.business_id) return;

        const fetchCorporateDNA = async () => {
            const supabase = createClient();
            // Fetch from our high-performance Neural View
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

    const handleSKUScan = (sku: string) => {
        const product = products?.find(p => p.sku === sku);
        if (product) {
            handleAddToCart(product);
            toast.success(`${product.product_name} added`);
        }
    };

    // --- 2. MASTER PAYMENT & FISCALIZATION LOGIC ---
    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id || !identity) return;

        const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const taxRate = identity.globalTaxRate || 0;
        
        const totalTax = round((subtotal - discountAmount) * (taxRate / 100));
        const totalAmount = round(subtotal - discountAmount + totalTax);
        const dueAmount = round(totalAmount - paymentData.amountPaid);

        if (dueAmount > 0.01 && !selectedCustomer) {
            return toast.error("CREDIT PROTOCOL: Customer selection required for balance arrears.");
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

        // Save to local database (Dexie) for offline resilience
        const localSaleId = await db.offlineSales.add(salePayload as OfflineSale);
        
        // Prepare professional data for the Receipt Component
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
                    currency_code: identity.currency_code,
                    total_tax: totalTax,
                    kernel_seal_id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                },
                identity: {
                    legal_name: identity.legal_name,
                    tin_number: identity.tin_number,
                    physical_address: identity.physical_address,
                    official_phone: identity.official_phone,
                    official_email: identity.official_email,
                    logo_url: identity.logo_url,
                    receipt_footer: identity.receipt_footer,
                    currency_code: identity.currency_code,
                    plot_number: identity.plot_number,
                    po_box: identity.po_box
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

    if (isProfileLoading) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-slate-300">WAKING POS CORE...</div>;

    // --- 3. SUCCESS STATE: THE AUDIT VIEW ---
    if (lastCompletedSale) {
        return (
            <div className="p-10 flex flex-col items-center justify-center min-h-screen bg-slate-900 animate-in zoom-in duration-500">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center space-y-4">
                        <div className="h-20 w-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 className="w-10 h-10 text-white"/>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Sale Protocol Sealed</h2>
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
                            Dismiss and New Sale
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen bg-[#F8FAFC]">
            {/* TOP BAR IDENTITY */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-6">
                     <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {identity?.legal_name || 'AUTHENTICATING...'}
                        </span>
                     </div>
                     <Badge variant="outline" className="font-black text-[9px] px-3 border-blue-100 text-blue-600">
                        {identity?.currency_code} SYSTEM ACTIVE
                     </Badge>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-4 italic">
                        <MapPin size={10} className="inline mr-1" /> {identity?.physical_address}
                    </p>
                    <Button onClick={() => {}} variant="outline" className="h-10 px-6 border-slate-200 font-black text-xs rounded-xl shadow-sm">
                        <RefreshCw className="mr-2 h-4 w-4 text-blue-600" /> SYNC LOCAL DATA
                    </Button>
                </div>
            </div>

            <div className="h-[calc(100vh-72px)] grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 overflow-hidden">
                {/* Product Search and Grid */}
                <div className="lg:col-span-7 h-full flex flex-col min-h-0 animate-in slide-in-from-left-4 duration-700">
                    <ProductGrid products={products || []} onProductSelect={handleAddToCart} disabled={isSyncing} />
                </div>

                {/* Cart Area */}
                <div className="lg:col-span-5 h-full flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-700">
                    <CartDisplay 
                        cart={cart} 
                        currency={identity?.currency_code || 'UGX'}
                        onUpdateQuantity={(id, qty) => {
                            if(qty <= 0) setCart(prev => prev.filter(i => i.variant_id !== id));
                            else setCart(prev => prev.map(i => i.variant_id === id ? {...i, quantity: qty} : i));
                        }} 
                        onRemoveItem={(id) => setCart(prev => prev.filter(i => i.variant_id !== id))} 
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
                totalAmount={cart.reduce((s, i) => s + (i.price * i.quantity), 0) - (discount.type === 'percentage' ? (cart.reduce((s, i) => s + (i.price * i.quantity), 0) * discount.value) / 100 : discount.value)} 
                onConfirm={handleProcessPayment} 
                isProcessing={false} 
            />
        </div>
    );
}