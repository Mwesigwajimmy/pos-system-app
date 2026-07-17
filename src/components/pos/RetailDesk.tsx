'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildReceiptPdf } from '@/lib/receiptPdf';
import { db, OfflineSale, Printer } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { SellableProduct, CartItem, Customer } from '@/types/dashboard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core'; // NATIVE DETECTION

// --- DEEP HARDWARE IMPORT (THE OMEGA WELD) ---
import { DeepHardwareBridge } from '@/lib/hardware/DeepHardwareBridge';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine'; // AUDIO NERVOUS SYSTEM

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
    CheckCircle2,
    Share2, // NEW FOR DIGITAL HANDSHAKE
    LayoutGrid,
    Rows3,
    ReceiptText,
    CreditCard, // ICON FOR MOBILE PAY ACTION
    ChevronUp,
    ChevronDown
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

/**
 * --- DYNAMICS-STYLE PRODUCT GRID ---
 * UPGRADED: Independent internal scrolling zone.
 */
const ProductGrid = ({ products, onProductSelect, onSKUScan, disabled }: { products: SellableProduct[], onProductSelect: (product: SellableProduct) => void, onSKUScan: (sku: string) => void, disabled: boolean }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const inputRef = useRef<HTMLInputElement>(null);

    const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
    const [gridAtTop, setGridAtTop] = useState(true);
    const [gridAtBottom, setGridAtBottom] = useState(true);
    const updateGridScroll = useCallback(() => {
        if (!gridEl) return;
        setGridAtTop(gridEl.scrollTop <= 1);
        setGridAtBottom(gridEl.scrollTop >= gridEl.scrollHeight - gridEl.clientHeight - 1);
    }, [gridEl]);
    useEffect(() => {
        if (!gridEl) return;
        updateGridScroll();
        const ro = new ResizeObserver(updateGridScroll);
        ro.observe(gridEl);
        return () => ro.disconnect();
    }, [gridEl, updateGridScroll]);

    const filteredProducts = useMemo(() =>
        products.filter(p =>
            p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);

    // SCANNER LOGIC
    useEffect(() => {
        let barcode = '';
        let lastKeyTime = Date.now();
        const SCANNER_INPUT_TIMEOUT = 50; 

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' && document.activeElement !== inputRef.current) return;
            const currentTime = Date.now();
            if (currentTime - lastKeyTime > SCANNER_INPUT_TIMEOUT) barcode = '';
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
        <div className={cn('flex flex-col h-full bg-white rounded-2xl lg:shadow-sm border border-slate-100 overflow-hidden', disabled && 'opacity-50 pointer-events-none')}>
            <div className="p-3 border-b relative bg-slate-50/30 shrink-0 flex items-center gap-2">
                <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                    <Input
                        ref={inputRef}
                        placeholder="Scan or Search Inventory..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-slate-200 focus:ring-blue-500 font-medium"
                    />
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                        className={cn('h-9 w-9 rounded-lg flex items-center justify-center transition-colors', viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        aria-label="List view"
                        className={cn('h-9 w-9 rounded-lg flex items-center justify-center transition-colors', viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50')}
                    >
                        <Rows3 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {/* DEEP SCROLLING: This section scrolls while the search bar stays fixed */}
            <div className="relative flex-1 min-h-0">
                <ScrollArea viewportRef={setGridEl} onScroll={updateGridScroll} className="h-full w-full">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 p-4 lg:p-6 pb-40">
                            {filteredProducts.map(product => (
                                <Card
                                    key={product.variant_id}
                                    onClick={() => onProductSelect(product)}
                                    className="cursor-pointer hover:border-blue-400 hover:shadow-md active:scale-95 transition-all relative overflow-hidden group border-slate-100 rounded-xl min-h-[128px] lg:min-h-[150px]"
                                >
                                    <CardContent className="p-3 lg:p-4 h-full flex flex-col items-center justify-center text-center space-y-2">
                                        <div className="h-10 flex items-center justify-center">
                                            <p className="font-bold text-[12px] lg:text-[13px] leading-tight text-slate-800 line-clamp-2">{product.product_name}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-[8px] lg:text-[9px] uppercase tracking-tighter bg-slate-100 text-slate-500 border-none">
                                            {product.variant_name}
                                        </Badge>
                                        <p className="font-black text-blue-600 text-[12px] lg:text-sm mt-1">UGX {product.price.toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 pb-40">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.variant_id}
                                    type="button"
                                    onClick={() => onProductSelect(product)}
                                    className="w-full flex items-center justify-between gap-4 px-4 lg:px-6 py-3.5 hover:bg-blue-50/50 transition-colors text-left"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-800 truncate">{product.product_name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{product.variant_name} · {product.sku}</p>
                                    </div>
                                    <span className="font-black text-blue-600 text-sm shrink-0">UGX {product.price.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                {!gridAtTop && (
                    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                )}
                {!gridAtBottom && (
                    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * --- DYNAMICS-STYLE CART DISPLAY ---
 * MASTER FIX: Sovereign Sticky Footer logic implemented.
 */
const CartDisplay = ({ cart, onUpdateQuantity, onRemoveItem, selectedCustomer, onSetCustomer, onCharge, isProcessing, discount, setDiscount, currency }: { cart: CartItem[], onUpdateQuantity: (id: number, newQty: number) => void, onRemoveItem: (id: number) => void, selectedCustomer: Customer | null, onSetCustomer: () => void, onCharge: () => void, isProcessing: boolean, discount: Discount, setDiscount: (d: Discount) => void, currency: string }) => {
    const [itemsEl, setItemsEl] = useState<HTMLDivElement | null>(null);
    const [itemsAtTop, setItemsAtTop] = useState(true);
    const [itemsAtBottom, setItemsAtBottom] = useState(true);
    const updateItemsScroll = useCallback(() => {
        if (!itemsEl) return;
        setItemsAtTop(itemsEl.scrollTop <= 1);
        setItemsAtBottom(itemsEl.scrollTop >= itemsEl.scrollHeight - itemsEl.clientHeight - 1);
    }, [itemsEl]);
    useEffect(() => {
        if (!itemsEl) return;
        updateItemsScroll();
        const ro = new ResizeObserver(updateItemsScroll);
        ro.observe(itemsEl);
        return () => ro.disconnect();
    }, [itemsEl, updateItemsScroll]);

    useEffect(() => {
        if (itemsEl) itemsEl.scrollTo({ top: itemsEl.scrollHeight, behavior: 'smooth' });
    }, [cart.length, itemsEl]);

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const discountAmount = useMemo(() => {
        if (discount.type === 'percentage') return (subtotal * discount.value) / 100;
        return Math.min(subtotal, discount.value); 
    }, [subtotal, discount]);
    const total = subtotal - discountAmount;

    return (
        /* MASTER CONTAINER: h-full and flex-col locks the cart to the screen. */
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            
            {/* PINNED HEADER: shrink-0 keeps it at the top. Compact on mobile
                so the scrollable item list below gets more room. */}
            <div className="p-2.5 lg:p-5 border-b flex justify-between items-center bg-slate-900 text-white shrink-0 z-10">
                <div className="flex items-center gap-2 lg:gap-3 cursor-pointer min-w-0" onClick={onSetCustomer}>
                    <div className="bg-blue-600 p-1.5 lg:p-2 rounded-lg shrink-0">
                        <User className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-black text-[11px] lg:text-sm uppercase tracking-wider truncate max-w-[120px] lg:max-w-none">
                            {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                        </span>
                        <span className="hidden lg:block text-[9px] text-slate-400 font-bold uppercase tracking-widest">Standard Retail</span>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={onSetCustomer} className="bg-transparent border-slate-700 text-white hover:bg-slate-800 hover:text-white hover:border-slate-600 font-bold text-[9px] lg:text-[10px] uppercase h-7 lg:h-8 px-2.5 lg:px-3 shrink-0">
                    Change (F2)
                </Button>
            </div>

            {/* DEEP INTERNAL SCROLL AREA: Only this middle section moves. The
                footer below stays pinned via shrink-0 regardless of list length. */}
            <div className="relative flex-1 min-h-0">
            <ScrollArea viewportRef={setItemsEl} onScroll={updateItemsScroll} className="h-full bg-slate-50/30">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-300">
                        <ShoppingCart className="h-12 w-12 opacity-20" />
                        <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] opacity-30 text-center px-4">Awaiting Transaction Scan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 pb-20 lg:pb-10">
                        {cart.map(item => (
                            <div key={item.variant_id} className="p-3 lg:p-4 bg-white hover:bg-blue-50/30 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[13px] lg:text-sm font-black text-slate-800 leading-tight">{item.product_name}</p>
                                        <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase">{item.variant_name}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[13px] lg:text-sm font-black text-slate-900">{currency} {(item.price * item.quantity).toLocaleString()}</p>
                                        <p className="text-[9px] lg:text-[10px] text-slate-400 font-medium">@ {item.price.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8 hover:bg-white rounded-md" onClick={() => onUpdateQuantity(item.variant_id, item.quantity - 1)}>
                                            <Minus className="h-3 w-3 text-red-500" />
                                        </Button>
                                        <span className="w-8 lg:w-10 text-center font-black text-[11px] lg:text-xs">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8 hover:bg-white rounded-md" onClick={() => onUpdateQuantity(item.variant_id, item.quantity + 1)}>
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
            {!itemsAtTop && (
                <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                </div>
            )}
            {!itemsAtBottom && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 h-7 w-7 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </div>
            )}
            </div>

            {/* PINNED FOOTER: shrink-0. Compact summary-only on mobile — the
                fixed bottom nav already has a Pay button, so the big charge
                button here only renders at lg+ (avoids the redundant button
                that was getting visually covered by the fixed mobile nav). */}
            <div className="p-2.5 lg:p-6 border-t bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] space-y-1.5 lg:space-y-5 shrink-0 z-20">
                <div className="space-y-1 lg:space-y-3">
                    <div className="flex justify-between text-[10px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Subtotal</span><span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger render={<Button variant="link" className="p-0 h-auto text-blue-600 font-black uppercase text-[9px] lg:text-[10px] tracking-widest gap-1" />}>
                                <Tag className="h-3 w-3" /> Adjust Discount
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
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Value</Label>
                                    <Input type="number" value={discount.value} className="rounded-xl" onChange={(e) => setDiscount({ ...discount, value: Math.max(0, parseFloat(e.target.value) || 0) })}/>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <span className="text-red-500 font-black text-sm">- {currency} {discountAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-between items-baseline pt-1.5 lg:pt-4 border-t border-slate-100">
                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400">Balance Due</span>
                    <span className="text-lg lg:text-4xl font-black text-slate-900 tracking-tighter">
                        <span className="text-xs lg:sm mr-1">{currency}</span>
                        {total.toLocaleString()}
                    </span>
                </div>

                <Button
                    className="hidden lg:flex w-full h-14 lg:h-16 text-lg lg:text-xl font-black uppercase tracking-[0.2em] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 rounded-2xl transition-all active:scale-95"
                    onClick={onCharge}
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? <Loader2 className="animate-spin h-6 w-6"/> : "Finalize Charge"}
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
    const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0 });
    const [businessDNA, setBusinessDNA] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]); 

    const receiptRef = useRef<HTMLDivElement>(null);
    const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
    const { defaultPrinter } = useDefaultPrinter();
    const products = useLiveQuery(() => db.products.toArray(), []);
    const supabase = createClient();
    
    const handleWebPrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${lastCompletedSale?.receiptData.saleInfo.id ?? ''}`,
        onAfterPrint: () => toast.success('Print Job Completed Successfully')
    });

    useEffect(() => {
        if (!userProfile?.tenant_id) return;
        const fetchDevices = async () => {
            const { data } = await supabase
                .from('security_hardware_registry')
                .select('*')
                .eq('tenant_id', userProfile.tenant_id);
            if (data) setDevices(data);
        };
        fetchDevices();
    }, [userProfile?.tenant_id, supabase]);

    // Builds the receipt as a PDF straight from the sale data and either
    // shares it (mobile / supporting browsers) or downloads it directly.
    // The original approach rendered the on-screen <Receipt> to a PNG via
    // html2canvas, but html2canvas can't parse the oklch() colors Tailwind
    // v4's palette uses — it hangs indefinitely instead of ever producing an
    // image, so downloads never actually completed. jsPDF draws straight
    // into the PDF and never touches computed CSS, so it isn't affected.
    const handleDownloadReceipt = async () => {
        if (!lastCompletedSale) return;
        const promise = async () => {
            const doc = buildReceiptPdf(lastCompletedSale.receiptData);
            const fileName = `Receipt-${lastCompletedSale.receiptData.saleInfo.id}.pdf`;
            const blob = doc.output('blob');
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `Receipt: ${businessDNA?.name}`,
                        text: `Thank you for shopping at ${businessDNA?.name}. Transaction: #${lastCompletedSale.receiptData.saleInfo.id}`,
                        files: [file],
                    });
                    return "Share Protocol Initialized";
                } catch (e) {
                    if ((e as Error)?.name === 'AbortError') return "Share Cancelled";
                    // Fall through to direct download if sharing failed for any other reason.
                }
            }

            doc.save(fileName);
            return "Receipt downloaded";
        };
        toast.promise(promise(), { loading: 'Generating receipt...', success: (m: string) => m, error: (e: Error) => e.message });
    };

    useEffect(() => {
        if (!userProfile?.business_id) return;
        const fetchCorporateDNA = async () => {
            const { data: identities } = await supabase.from('view_bbu1_corporate_identity').select('*').eq('business_id', userProfile.business_id).limit(1);
            if (identities?.[0]) setBusinessDNA({
                name: identities[0].legal_name, currency: identities[0].currency_code || 'UGX',
                phone: identities[0].official_phone, address: identities[0].physical_address,
                footer: identities[0].receipt_footer, tax_number: identities[0].tin_number
            });
        };
        fetchCorporateDNA();
    }, [userProfile, supabase]);

    const handleSync = async () => {
        setIsSyncing(true);
        const promise = async () => {
            const { data: productsData } = await supabase.rpc('get_sellable_products');
            await db.products.clear(); await db.products.bulkAdd(productsData as SellableProduct[] || []);
            const { data: customersData } = await supabase.from('customers').select('*');
            await db.customers.clear(); await db.customers.bulkAdd(customersData as Customer[] || []);
            return 'Ledger Synchronized';
        };
        toast.promise(promise(), { loading: 'Syncing...', success: m => m, error: 'Sync Failed', finally: () => setIsSyncing(false) });
    };
    
    const handleAddToCart = (product: SellableProduct) => {
        setCart(current => { 
            const existingIndex = current.findIndex(i => i.variant_id === product.variant_id); 
            if (existingIndex > -1) {
                const newCart = [...current]; newCart[existingIndex].quantity += 1;
                return newCart;
            }
            return [...current, { ...product, quantity: 1 }]; 
        });
    };
    
    const handleSKUScan = (sku: string) => { 
        const product = products?.find(p => p.sku === sku); 
        if (product) { 
            DeepAudioEngine.playSuccess();
            handleAddToCart(product); 
            toast.success(`Added: ${product.product_name}`, { duration: 800 }); 
        } else { 
            DeepAudioEngine.playError();
            toast.error(`Invalid SKU: ${sku}`); 
        } 
    };

    const handleProcessPayment = async (paymentData: { paymentMethod: string; amountPaid: number; }) => {
        const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = discount.type === 'percentage' ? (subtotal * discount.value) / 100 : Math.min(subtotal, discount.value);
        const totalAmount = round(subtotal - discountAmount);
        
        const newSale: Omit<OfflineSale, 'id'> = {
            createdAt: new Date(), cartItems: cart, customerId: selectedCustomer?.id || null,
            paymentMethod: paymentData.paymentMethod, amount_paid: paymentData.amountPaid,
            business_id: userProfile?.business_id!, user_id: userProfile?.id!,
            discount_type: discount.value > 0 ? discount.type : null, discount_value: discount.value > 0 ? discount.value : null,
            discount_amount: round(discountAmount), tax_amount: 0,
            payment_status: paymentData.amountPaid >= totalAmount ? 'paid' : 'partial',
            due_amount: Math.max(0, totalAmount - paymentData.amountPaid), related_deal_id: null 
        };
        const saleId = await db.offlineSales.add(newSale as OfflineSale);

        DeepAudioEngine.playSuccess();
        setLastCompletedSale({ receiptData: {
            saleInfo: { id: saleId, created_at: newSale.createdAt, payment_method: newSale.paymentMethod, total_amount: totalAmount, amount_tendered: newSale.amount_paid, change_due: Math.max(0, paymentData.amountPaid - totalAmount), subtotal, discount: discountAmount, amount_due: newSale.due_amount, currency_code: businessDNA?.currency || 'UGX', total_tax: 0, kernel_seal_id: `BBU1-${saleId}`, related_deal_id: null },
            identity: { legal_name: businessDNA?.name, physical_address: businessDNA?.address, city: '', official_phone: businessDNA?.phone, receipt_footer: businessDNA?.footer, tin_number: businessDNA?.tax_number, currency_code: businessDNA?.currency, logo_url: '' },
            customer: selectedCustomer, items: cart.map(i => ({ name: i.product_name, qty: i.quantity, price: i.price, total: i.price * i.quantity }))
        }});
        setCart([]); setSelectedCustomer(null); setDiscount({ type: 'fixed', value: 0 }); setPaymentModalOpen(false);
        toast.success("Transaction Complete");
    };

    if (!products || isProfileLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Deploying Retail Desk...</p>
        </div>
    );

    if (lastCompletedSale) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 overflow-y-auto">
                <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl border-none overflow-hidden my-auto">
                    <CardHeader className="bg-emerald-600 text-white text-center py-10">
                        <CheckCircle2 className="h-16 w-16 text-white mx-auto mb-4" />
                        <CardTitle className="text-2xl font-black uppercase">Transaction Signed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6 bg-white">
                        <div className="border-2 border-dashed border-slate-100 p-2 rounded-2xl overflow-hidden">
                           <div ref={receiptRef}><Receipt receiptData={lastCompletedSale.receiptData} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-14 font-black uppercase rounded-2xl border-slate-200" onClick={() => handleWebPrint()}>
                                <PrinterIcon className="mr-2 h-4 w-4" /> Print
                            </Button>
                            <Button variant="outline" className="h-14 font-black uppercase rounded-2xl border-slate-200" onClick={handleDownloadReceipt}>
                                <Share2 className="mr-2 h-4 w-4" /> Download
                            </Button>
                        </div>
                        <Button className="w-full h-14 bg-blue-600 font-black uppercase rounded-2xl" onClick={() => setLastCompletedSale(null)}>NEW SALE</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        /* MASTER FIX: Lock the app height to the viewport. No overall page scrolling. */
        <div className="h-[100dvh] bg-slate-50 flex flex-col overflow-hidden relative touch-auto overscroll-none">
            {/* TOP BAR */}
            <div className="h-14 border-b bg-white flex items-center justify-between px-4 lg:px-8 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                        {businessDNA?.name} Terminal
                    </span>
                </div>
                <Button onClick={handleSync} variant="ghost" className="h-10 font-bold uppercase text-[10px] text-blue-600 gap-2">
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} /> 
                    <span className="hidden sm:inline">Sync</span>
                </Button>
            </div>

            {/* MAIN CONTENT AREA: Columns handle internal scrolling. */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
                
                {/* PRODUCT GRID SECTION. pb-28 on mobile gives the frame some
                    breathing room above the floating bottom nav (h-16,
                    floated bottom-5). */}
                <div className={cn(
                    "h-full lg:col-span-7 xl:col-span-7 p-3 pb-28 lg:p-5 overflow-hidden flex flex-col transition-all duration-300",
                    activeTab !== 'products' && 'hidden lg:flex'
                )}>
                    <ProductGrid products={products} onProductSelect={handleAddToCart} onSKUScan={handleSKUScan} disabled={isSyncing} />
                </div>

                {/* CART DISPLAY SECTION. pb-28 on mobile clears the floating
                    bottom nav (h-16, floated bottom-5) so the footer's
                    Balance Due line never sits underneath it. */}
                <div className={cn(
                    "h-full lg:col-span-5 xl:col-span-5 p-3 pb-28 lg:p-5 lg:pb-5 overflow-hidden flex flex-col transition-all duration-300",
                    activeTab !== 'cart' && 'hidden lg:flex'
                )}>
                    <CartDisplay 
                        cart={cart} currency={businessDNA?.currency || 'UGX'} 
                        onUpdateQuantity={(id, q) => q <= 0 ? setCart(cart.filter(i => i.variant_id !== id)) : setCart(cart.map(i => i.variant_id === id ? { ...i, quantity: q } : i))} 
                        onRemoveItem={id => setCart(cart.filter(i => i.variant_id !== id))} 
                        selectedCustomer={selectedCustomer} 
                        onSetCustomer={() => setCustomerModalOpen(true)} 
                        onCharge={() => setPaymentModalOpen(true)} 
                        isProcessing={false} discount={discount} setDiscount={setDiscount} 
                    />
                </div>
            </div>

            {/* MOBILE TRIPLE-BUTTON NAVIGATION — floating rounded pill with a
                soft blue glassmorphic tint, inset from the screen edges. The
                center Pay button is the only mobile pay action and always
                renders here. */}
            <div className="lg:hidden fixed bottom-5 left-4 right-4 h-16 bg-gradient-to-br from-blue-50/90 via-white/80 to-blue-100/70 backdrop-blur-2xl border border-blue-200/60 rounded-full shadow-2xl shadow-blue-900/10 flex items-center justify-around px-4 z-[110]">
                <button
                    onClick={() => setActiveTab('products')}
                    className={cn("flex flex-col items-center flex-1 py-2", activeTab === 'products' ? "text-blue-600 scale-105" : "text-slate-400")}
                >
                    <LayoutGrid className="h-5 w-5" />
                    <span className="text-[8px] font-black uppercase">Inventory</span>
                </button>

                {/* THE NEW "PAY NOW" CENTER BUTTON */}
                <button
                    disabled={cart.length === 0}
                    onClick={() => setPaymentModalOpen(true)}
                    className={cn(
                        "flex flex-col items-center justify-center bg-blue-600 text-white rounded-full h-12 w-20 shadow-lg active:scale-95 transition-all",
                        cart.length === 0 && "opacity-20 grayscale pointer-events-none"
                    )}
                >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-[8px] font-black uppercase mt-0.5">Pay</span>
                </button>

                <button
                    onClick={() => setActiveTab('cart')}
                    className={cn("flex flex-col items-center flex-1 py-2", activeTab === 'cart' ? "text-blue-600 scale-105" : "text-slate-400")}
                >
                    <div className="relative">
                        <ReceiptText className="h-5 w-5" />
                        {cart.length > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full border border-white" />}
                    </div>
                    <span className="text-[8px] font-black uppercase">Receipt ({cart.length})</span>
                </button>
            </div>
            
            <CustomerSearchModal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} onSelectCustomer={c => { setSelectedCustomer(c); setCustomerModalOpen(false); }} />
            <PaymentModal 
                isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} 
                totalAmount={cart.reduce((a, b) => a + (b.price * b.quantity), 0) - (discount.type === 'percentage' ? (cart.reduce((a, b) => a + (b.price * b.quantity), 0) * discount.value) / 100 : discount.value)} 
                onConfirm={handleProcessPayment} isProcessing={false} 
            />
        </div>
    );
}