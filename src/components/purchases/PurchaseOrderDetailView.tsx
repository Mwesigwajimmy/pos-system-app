'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Truck, CheckCircle, XCircle, Loader2, FileDown, 
    Landmark, ShieldCheck, Printer, Info 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// PDF Printing Engines
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
interface POItem { variant_id: number; product_name: string; sku?: string; quantity_ordered: number; quantity_received: number; unit_cost: number; }
interface PODetails { po: any; supplier: any; items: POItem[]; }
interface Location { id: number; name: string; }

const statusStyles: Record<string, string> = {
    Draft: "bg-slate-200 text-slate-800", 
    Ordered: "bg-blue-100 text-blue-800", 
    "Partially Received": "bg-amber-100 text-amber-800", 
    Received: "bg-green-100 text-green-800", 
    Billed: "bg-purple-100 text-purple-800",
};

// --- API Functions ---
const supabase = createClient();
async function fetchPODetails(poId: number): Promise<PODetails> { 
    const { data, error } = await supabase.rpc('get_purchase_order_details', { p_po_id: poId }); 
    if (error) throw error; 
    return data; 
}
async function fetchLocations(): Promise<Location[]> { 
    const { data, error } = await supabase.from('locations').select('id, name'); 
    if (error) throw error; 
    return data || []; 
}
async function updatePOStatus(vars: { poId: number; status: string; }) { 
    const { error } = await supabase.rpc('update_po_status', { p_po_id: vars.poId, p_new_status: vars.status }); 
    if (error) throw error; 
}
async function receiveStock(vars: { poId: number; locationId: number; items: any[]; }) { 
    const { error } = await supabase.rpc('receive_po_stock', { p_po_id: vars.poId, p_location_id: vars.locationId, p_received_items: vars.items }); 
    if (error) throw error; 
}

// --- Receive Stock Dialog Component ---
const ReceiveStockDialog = ({ po, items, onClose }: { po: any; items: POItem[]; onClose: () => void; }) => {
    const queryClient = useQueryClient();
    const [locationId, setLocationId] = useState<string | undefined>();
    const [receivedQuantities, setReceivedQuantities] = useState<Record<number, number>>(() => 
        items.reduce((acc, item) => ({ ...acc, [item.variant_id]: item.quantity_ordered - item.quantity_received }), {})
    );

    const { data: locations, isLoading: isLoadingLocations } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

    const mutation = useMutation({
        mutationFn: receiveStock,
        onSuccess: () => {
            toast.success("Inventory updated and ledger entry posted to Account 1200.");
            queryClient.invalidateQueries({ queryKey: ['poDetails', po.id] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Receiving failed: ${err.message}`),
    });

    const handleQuantityChange = (variantId: number, value: number) => {
        const item = items.find(i => i.variant_id === variantId);
        const maxReceivable = item!.quantity_ordered - item!.quantity_received;
        const newQty = Math.max(0, Math.min(value, maxReceivable));
        setReceivedQuantities(prev => ({ ...prev, [variantId]: newQty }));
    };

    const handleSubmit = () => {
        if (!locationId) return toast.error("Please select a destination warehouse.");
        const itemsToReceive = Object.entries(receivedQuantities)
            .map(([variant_id, quantity]) => ({ variant_id: Number(variant_id), quantity_received: quantity }))
            .filter(item => item.quantity_received > 0);
        
        if(itemsToReceive.length === 0) return toast.error("Enter a valid quantity.");
        mutation.mutate({ poId: po.id, locationId: Number(locationId), items: itemsToReceive });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        Authorize Stock Inflow: PO #{po.id}
                    </DialogTitle>
                    <DialogDescription>Confirm the arrival of goods. This will trigger a General Ledger reconciliation.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <strong>Note:</strong> Upon confirmation, the system will autonomously calculate the value of these items and debit your <strong>Inventory Asset Account (1200)</strong>.
                        </p>
                    </div>
                    <div className="max-w-xs space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-500">Destination Warehouse</Label>
                        <Select onValueChange={setLocationId} disabled={isLoadingLocations}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select location..."/></SelectTrigger>
                            <SelectContent>{locations?.map(loc => <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <Table className="border rounded-md">
                        <TableHeader className="bg-muted/50"><TableRow><TableHead>Product</TableHead><TableHead className="text-center">Ordered</TableHead><TableHead className="text-center">Received</TableHead><TableHead className="text-right">Receiving Now</TableHead></TableRow></TableHeader>
                        <TableBody>{items.map(item => (
                            <TableRow key={item.variant_id}>
                                <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                                <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                                <TableCell className="text-center text-slate-400">{item.quantity_received}</TableCell>
                                <TableCell className="text-right"><Input type="number" value={receivedQuantities[item.variant_id] || 0} onChange={e => handleQuantityChange(item.variant_id, Number(e.target.value))} className="w-24 ml-auto h-9 font-mono text-center"/></TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </div>
                <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 rounded-b-lg">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending} className="px-8 shadow-lg">
                        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Verify & Post to Ledger
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// --- Main View Component ---
export default function PurchaseOrderDetailView({ initialData, poId }: { initialData: PODetails, poId: number }) {
    const queryClient = useQueryClient();
    const [isReceiving, setIsReceiving] = useState(false);
    const { data } = useQuery({ queryKey: ['poDetails', poId], queryFn: () => fetchPODetails(poId), initialData });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: data?.po?.currency || 'UGX' }).format(val);
    };

    const statusMutation = useMutation({
        mutationFn: updatePOStatus,
        onSuccess: (_, vars) => {
            toast.success(`PO status updated: ${vars.status}`);
            queryClient.invalidateQueries({ queryKey: ['poDetails', poId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
        },
        onError: (err: Error) => toast.error(err.message),
    });

    // --- PROFESSIONAL COMMERCIAL PO PDF ENGINE ---
    const handlePrintPO = () => {
        const doc = new jsPDF();
        const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');

        // Header Section
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("COMMERCIAL PURCHASE ORDER", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`PO Reference: #PO-${data.po.id}`, 14, 30);
        doc.text(`Date Issued: ${format(new Date(data.po.order_date), 'PPP')}`, 14, 35);

        // Body Meta Box
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 42, 196, 42);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("BILL TO / SHIP TO:", 14, 52);
        doc.setFont("helvetica", "normal");
        doc.text("Authorized Business Entity", 14, 59);
        doc.text("GADS Certified Ledger ID: 1200", 14, 65);

        doc.setFont("helvetica", "bold");
        doc.text("SUPPLIER:", 120, 52);
        doc.setFont("helvetica", "normal");
        doc.text(data.supplier.name, 120, 59);
        doc.text(`Current Status: ${data.po.status}`, 120, 65);

        // Table
        autoTable(doc, {
            startY: 75,
            head: [['SKU', 'Item Description', 'Ordered', 'Unit Cost', 'Net Total']],
            body: data.items.map(item => [
                item.sku || 'N/A',
                item.product_name,
                item.quantity_ordered,
                new Intl.NumberFormat().format(item.unit_cost),
                new Intl.NumberFormat().format(item.quantity_ordered * item.unit_cost)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL VALUE:`, 120, finalY + 5);
        doc.text(`${data.po.currency || 'UGX'} ${new Intl.NumberFormat().format(totalCost)}`, 196, finalY + 5, { align: 'right' });

        // Audit Trail Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Digital Audit Reference: PO-SYNC-${data.po.id}`, 14, finalY + 25);
        doc.text("This document is autonomously synchronized with the Master General Ledger.", 14, finalY + 30);
        doc.text("Verification Status: POSTED", 14, finalY + 35);

        doc.save(`PurchaseOrder_${data.po.id}.pdf`);
        toast.success("Commercial PO Document Generated");
    };

    const { po, supplier, items } = data;
    const totalCost = useMemo(() => items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0), [items]);

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-none">
                <CardHeader className="bg-muted/30 pb-8 rounded-t-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Landmark className="h-6 w-6 text-primary" />
                                <CardTitle className="text-3xl font-black tracking-tighter uppercase">Purchase Order #{po.id}</CardTitle>
                            </div>
                            <CardDescription className="text-base">
                                Supplier: <strong className="text-slate-900">{supplier.name}</strong> | Issued: {format(new Date(po.order_date), "PPP")}
                            </CardDescription>
                            <div className="flex items-center gap-2">
                                <Badge className={cn("px-3 py-1 text-xs font-bold uppercase", statusStyles[po.status])}>{po.status}</Badge>
                                {(po.status === 'Received' || po.status === 'Billed') && (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase">
                                        <ShieldCheck className="h-3 w-3" /> Ledger Postings Active
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" className="h-11 shadow-sm border-primary/20 hover:bg-white" onClick={handlePrintPO}>
                                <Printer className="mr-2 h-4 w-4 text-slate-400" /> Download Document
                            </Button>
                            {po.status === 'Draft' && <>
                                <Button variant="destructive" className="h-11" onClick={() => statusMutation.mutate({ poId: po.id, status: 'Cancelled' })}><XCircle className="mr-2 h-4 w-4"/> Cancel Order</Button>
                                <Button className="h-11 shadow-xl px-8" onClick={() => statusMutation.mutate({ poId: po.id, status: 'Ordered' })}><CheckCircle className="mr-2 h-4 w-4"/> Confirm Order</Button>
                            </>}
                            {(po.status === 'Ordered' || po.status === 'Partially Received') &&
                                <Button className="h-11 px-8 shadow-xl bg-primary" onClick={() => setIsReceiving(true)}><Truck className="mr-2 h-4 w-4"/> Start Receiving Stock</Button>
                            }
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-8">
                    <Table className="border rounded-xl">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-bold text-slate-700 uppercase text-xs">Product Details</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 uppercase text-xs">Ordered</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 uppercase text-xs">Received</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 uppercase text-xs">Unit Cost</TableHead>
                                <TableHead className="text-right pr-6 font-bold text-slate-700 uppercase text-xs">Total (Net)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.variant_id} className="hover:bg-primary/5 transition-colors">
                                    <TableCell className="py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{item.product_name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-mono">{item.sku || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-medium">{item.quantity_ordered}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-mono">{item.quantity_received}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">{formatCurrency(item.unit_cost)}</TableCell>
                                    <TableCell className="text-right pr-6 font-bold text-slate-900 font-mono">{formatCurrency(item.quantity_ordered * item.unit_cost)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex flex-col items-end gap-1 p-8 bg-slate-50/50 border-t rounded-b-xl">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="text-sm uppercase font-bold tracking-tighter">Gross Order Value:</span>
                        <span className="text-lg font-mono">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-900">
                        <span className="text-base font-black uppercase tracking-tighter">Total Liability:</span>
                        <span className="text-3xl font-black font-mono text-primary">{formatCurrency(totalCost)}</span>
                    </div>
                </CardFooter>
            </Card>
            
            {isReceiving && <ReceiveStockDialog po={po} items={items} onClose={() => setIsReceiving(false)} />}
        </div>
    );
}