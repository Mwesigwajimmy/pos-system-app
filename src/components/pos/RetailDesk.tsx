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
    X, 
    User, 
    Plus, 
    Minus, 
    Printer as PrinterIcon, 
    RefreshCw, 
    Search, 
    FileText, 
    Tag,
    Calculator,   
    CheckCircle2,  
    Loader2,
    ShoppingCart,
    Trash2,
    Package,
    ChevronRight,
    ArrowLeft
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

// --- CHILD COMPONENTS ---

const ProductGrid = ({ 
    products, 
    onProductSelect, 
    onSKUScan, 
    disabled 
}: { 
    products: SellableProduct[], 
    onProductSelect: (product: SellableProduct) => void, 
    onSKUScan: (sku: string) => void, 
    disabled: boolean 
}) => {
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
        <div className={cn('flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-4 border-b bg-slate-50/50 relative">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                    placeholder="Search product name or scan SKU..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-11 h-12 bg-white border-slate-200 focus:ring-blue-600 rounded-lg shadow-sm" 
                />
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(product => (
                        <Card 
                            key={product.variant_id} 
                            onClick={() => onProductSelect(product)} 
                            className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden group border-slate-100 bg-white"
                        >
                            <CardContent className="p-4 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-1.5 bg-slate-50 rounded-md">
                                        <Package className="w-4 h-4 text-slate-400" />
                                    </div>
                                    {(product as any).units_per_pack > 1 && (
                                        <Badge variant="outline" className="text-[9px] border-blue-100 text-blue-600 bg-blue-50">
                                            Pack: {(product as any).units_per_pack}
                                        </Badge>
                                    )}
                                </div>
                                <p className="font-bold text-sm text-slate-800 line-clamp-2 mb-1">{product.product_name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight mb-4">{product.variant_name}</p>
                                <div className="mt-auto pt-2 border-t border-slate-50">
                                    <p className="font-bold text-blue-600 text-base">UGX {product.price.toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

const CartDisplay = ({ 
    cart, 
    onUpdateQuantity, 
    onRemoveItem, 
    selectedCustomer, 
    onSetCustomer, 
    onCharge, 
    isProcessing, 
    discount, 
    setDiscount, 
    currency 
}: { 
    cart: CartItem[], 
    onUpdateQuantity: (id: number, newQty: number) => void, 
    onRemoveItem: (id: number) => void, 
    selectedCustomer: Customer | null, 
    onSetCustomer: () => void, 
    onCharge: () => void, 
    isProcessing: boolean, 
    discount: Discount, 
    setDiscount: (d: Discount) => void, 
    currency: string 
}) => {
    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value); 
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Customer Header */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={onSetCustomer}>
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 group-hover:border-blue-400 transition-colors">
                        <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900 leading-none">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">
                            {selectedCustomer ? `Member ID: ${selectedCustomer.id}` : 'Guest Sale'}
                        </span>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={onSetCustomer} className="font-bold text-xs h-8 border-slate-200 hover:bg-white shadow-sm">
                    Find Customer
                </Button>
            </div>
            
            {/* Cart Items List */}
            <ScrollArea className="flex-1 bg-white">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-300 gap-3">
                        <ShoppingCart className="h-12 w-12 opacity-20" />
                        <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Cart is empty</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {cart.map(item => (
                            <div key={item.variant_id} className="flex flex-col p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm relative group">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-500 font-semibold uppercase">{item.variant_name}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input 
                                            className="w-12 h-7 text-center font-bold text-xs p-0 border-none bg-transparent" 
                                            type="number" 
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.variant_id, parseFloat(e.target.value) || 0)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <div className="w-24 text-right">
                                        <p className="font-bold text-sm text-slate-900">{currency} {(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">@ {item.price.toLocaleString()}</p>
                                    </div>

                                    <button 
                                        className="absolute -top-2 -right-2 bg-white border border-slate-200 p-1 rounded-full shadow-md text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                        onClick={() => onRemoveItem(item.variant_id)}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            
            {/* Totals Section */}
            <div className="p-6 border-t space-y-6 bg-slate-50">
                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                        <span>Subtotal</span>
                        <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600 font-bold uppercase text-[10px] hover:bg-transparent">
                                    <Tag className="h-3 w-3 mr-1.5" /> Apply Discount
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4 rounded-xl shadow-xl border-slate-200">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Discount Type</Label>
                                        <Select value={discount.type} onValueChange={(v: 'fixed' | 'percentage') => setDiscount({ ...discount, type: v })}>
                                            <SelectTrigger className="h-9"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Value</Label>
                                        <Input type="number" value={discount.value} className="h-9" onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-red-600 font-bold text-xs">-{currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Due</span>
                    <span className="text-4xl font-bold text-slate-900">
                        {currency} {total.toLocaleString()}
                    </span>
                </div>
                
                <Button 
                    className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50" 
                    onClick={onCharge} 
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? (
                        <><Loader2 className="animate-spin mr-3 h-6 w-6"/>Processing...</>
                    ) : (
                        "Collect Payment"
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
                name: tenantRes.data?.name || 'Store Name',
                phone: tenantRes.data?.phone || '-',
                tax_number: tenantRes.data?.tax_number || '-',
                currency: tenantRes.data?.currency_code || 'UGX',
                footer: tenantRes.data?.receipt_footer || 'Thank you for shopping with us.',
                address: locationRes.data?.address || '-',
                globalTaxRate: taxRes.data?.[0]?.rate_percentage || 0
            });
        };
        fetchDNA();
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
            return [...prev, { 
                variant_id: product.variant_id,
                product_name: product.product_name,
                variant_name: product.variant_name,
                price: product.price,
                quantity: 1,
                sku: product.sku
            }];
        });
    };

    const handleSKUScan = (sku: string) => {
        const product = products?.find(p => p.sku === sku);
        if (product) {
            handleAddToCart(product);
            toast.success(`${product.product_name} added`);
        } else {
            toast.error(`Product not found for SKU: ${sku}`);
        }
    };

    const handleUpdateQuantity = (id: number, newQty: number) => {
        if (newQty <= 0) return handleRemoveItem(id);
        setCart(prev => prev.map(item => item.variant_id === id ? { ...item, quantity: newQty } : item));
    };

    const handleRemoveItem = (id: number) => {
        setCart(prev => prev.filter(item => item.variant_id !== id));
    };

    const handleSync = async () => {
        if (!userProfile?.id) return;
        setIsSyncing(true);
        try {
            const supabase = createClient();
            const { data: productsData } = await supabase.rpc('get_sellable_products');
            await db.products.clear();
            await db.products.bulkAdd(productsData as SellableProduct[] || []);
            
            const { data: customersData } = await supabase.from('customers').select('*');
            await db.customers.clear();
            await db.customers.bulkAdd(customersData as Customer[] || []);
            
            const offlineSales = await db.offlineSales.where('user_id').equals(userProfile.id).toArray();
            if (offlineSales.length > 0) {
                const { error: syncError } = await supabase.rpc('sync_offline_sales', { sales_data: offlineSales });
                if (syncError) throw syncError;
                await db.offlineSales.where('user_id').equals(userProfile.id).delete();
            }
            toast.success('Data synchronized successfully');
        } catch (error: any) {
            toast.error(`Sync error: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };
    
    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        if (!userProfile?.business_id) return;

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
                total_with_tax: itemSubtotal + itemTax,
                tax_code: 'VAT'
            };
        });

        const totalTax = saleItemsWithTax.reduce((acc, item) => acc + item.tax_amount, 0);
        const totalAmount = round(subtotal - discountAmount + totalTax);
        const dueAmount = round(totalAmount - paymentData.amountPaid);

        if (dueAmount > 0.01 && !selectedCustomer) {
            return toast.error("Please select a customer for credit sales.");
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
        
        setLastCompletedSale({
            receiptData: {
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
                },
                storeInfo: { 
                    name: businessDNA?.name, 
                    address: businessDNA?.address, 
                    phone_number: businessDNA?.phone, 
                    receipt_footer: businessDNA?.footer,
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
            }
        });

        setCart([]);
        setSelectedCustomer(null);
        setDiscount({ type: 'fixed', value: 0 });
        setPaymentModalOpen(false);
    };

    const currentTotal = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const taxRate = businessDNA?.globalTaxRate || 0;
        const net = subtotal - discountAmount;
        return net + (net * (taxRate / 100));
    }, [cart, discount, businessDNA]);

    if (!products || isProfileLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading System</p>
            </div>
        );
    }

    if (lastCompletedSale) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-slate-50 animate-in fade-in duration-500">
                <div className="w-full max-w-lg space-y-8">
                    <Card className="shadow-xl border-none overflow-hidden rounded-2xl bg-white">
                        <CardHeader className="bg-emerald-600 text-white text-center py-10">
                           <CheckCircle2 className="w-16 h-16 text-white mx-auto mb-4"/>
                           <CardTitle className="text-2xl font-bold uppercase tracking-wide">Sale Complete</CardTitle>
                           <CardDescription className="text-emerald-100 font-semibold uppercase text-xs mt-1">Transaction recorded successfully</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div ref={receiptRef} className="rounded-lg overflow-hidden mx-auto border border-slate-100 shadow-sm bg-white p-4">
                                <Receipt receiptData={lastCompletedSale.receiptData} autoPrint={false} defaultPrinterName={defaultPrinter || undefined} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="h-12 rounded-xl font-bold uppercase text-xs border-slate-200" onClick={() => setLastCompletedSale(null)}>
                                    New Sale
                                </Button>
                                <Button className="h-12 rounded-xl bg-blue-600 text-white font-bold uppercase text-xs shadow-md" onClick={() => handleWebPrint()}>
                                    <PrinterIcon className="mr-2 h-4 w-4" /> Print Receipt
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen bg-slate-50">
            {/* Top Navigation */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                     <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Business: {businessDNA?.name || 'Loading...'}
                     </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button onClick={handleSync} variant="outline" size="sm" disabled={isSyncing} className="h-9 px-4 border-slate-200 font-bold text-xs uppercase tracking-tight">
                        <RefreshCw className={cn("mr-2 h-3.5 w-3.5 text-blue-600", isSyncing && 'animate-spin')} />
                        {isSyncing ? 'Syncing...' : 'Sync Data'}
                    </Button>
                </div>
            </div>

            <div className="h-[calc(100vh-56px)] grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
                {/* Product Search and Grid */}
                <div className="lg:col-span-7 h-full flex flex-col min-h-0">
                    <ProductGrid products={products || []} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                </div>

                {/* Cart Area */}
                <div className="lg:col-span-5 h-full flex flex-col min-h-0">
                    <CartDisplay 
                        cart={cart} 
                        currency={businessDNA?.currency || 'UGX'}
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
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} totalAmount={currentTotal} onConfirm={handleProcessPayment} isProcessing={false} />
        </div>
    );
}