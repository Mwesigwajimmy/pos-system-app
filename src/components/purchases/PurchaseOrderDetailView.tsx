// src/components/purchases/PurchaseOrderDetailView.tsx
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
import { Truck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface POItem { variant_id: number; product_name: string; quantity_ordered: number; quantity_received: number; unit_cost: number; }
interface PODetails { po: any; supplier: any; items: POItem[]; }
interface Location { id: number; name: string; }

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

const statusStyles: Record<string, string> = {
    Draft: "bg-gray-200 text-gray-800", Ordered: "bg-blue-100 text-blue-800", "Partially Received": "bg-yellow-100 text-yellow-800", Received: "bg-green-100 text-green-800", Billed: "bg-purple-100 text-purple-800",
};

// --- API Functions ---
const supabase = createClient();
async function fetchPODetails(poId: number): Promise<PODetails> { const { data, error } = await supabase.rpc('get_purchase_order_details', { p_po_id: poId }); if (error) throw error; return data; }
async function fetchLocations(): Promise<Location[]> { const { data, error } = await supabase.from('locations').select('id, name'); if (error) throw error; return data || []; }
async function updatePOStatus(vars: { poId: number; status: string; }) { const { error } = await supabase.rpc('update_po_status', { p_po_id: vars.poId, p_new_status: vars.status }); if (error) throw error; }
async function receiveStock(vars: { poId: number; locationId: number; items: any[]; }) { const { error } = await supabase.rpc('receive_po_stock', { p_po_id: vars.poId, p_location_id: vars.locationId, p_received_items: vars.items }); if (error) throw error; }

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
            toast.success("Stock received successfully and inventory has been updated.");
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
        
        if(itemsToReceive.length === 0) return toast.error("Please enter a quantity for at least one item.");

        mutation.mutate({ poId: po.id, locationId: Number(locationId), items: itemsToReceive });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Receive Stock for PO #{po.id}</DialogTitle>
                    <DialogDescription>Select a location and confirm the quantities being received.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="max-w-xs"><Label>Destination Warehouse</Label>
                        <Select onValueChange={setLocationId} disabled={isLoadingLocations}><SelectTrigger><SelectValue placeholder="Select location..."/></SelectTrigger>
                            <SelectContent>{locations?.map(loc => <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <Table>
                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Ordered</TableHead><TableHead>Received</TableHead><TableHead>Receiving Now</TableHead></TableRow></TableHeader>
                        <TableBody>{items.map(item => (
                            <TableRow key={item.variant_id}>
                                <TableCell>{item.product_name}</TableCell>
                                <TableCell>{item.quantity_ordered}</TableCell>
                                <TableCell>{item.quantity_received}</TableCell>
                                <TableCell><Input type="number" value={receivedQuantities[item.variant_id] || 0} onChange={e => handleQuantityChange(item.variant_id, Number(e.target.value))} className="w-24"/></TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Receiving
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

    const statusMutation = useMutation({
        mutationFn: updatePOStatus,
        onSuccess: (_, vars) => {
            toast.success(`PO status updated to "${vars.status}"`);
            queryClient.invalidateQueries({ queryKey: ['poDetails', poId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const { po, supplier, items } = data;
    const totalCost = useMemo(() => items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0), [items]);

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Purchase Order #{po.id}</CardTitle>
                            <CardDescription>From: <strong>{supplier.name}</strong> | Order Date: {format(new Date(po.order_date), "PPP")}</CardDescription>
                            <Badge className={cn("capitalize mt-2", statusStyles[po.status])}>{po.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                            {po.status === 'Draft' && <>
                                <Button variant="outline" onClick={() => statusMutation.mutate({ poId: po.id, status: 'Cancelled' })}><XCircle className="mr-2 h-4 w-4"/>Cancel Order</Button>
                                <Button onClick={() => statusMutation.mutate({ poId: po.id, status: 'Ordered' })}><CheckCircle className="mr-2 h-4 w-4"/>Mark as Ordered</Button>
                            </>}
                            {(po.status === 'Ordered' || po.status === 'Partially Received') &&
                                <Button onClick={() => setIsReceiving(true)}><Truck className="mr-2 h-4 w-4"/>Receive Stock</Button>
                            }
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty Ordered</TableHead><TableHead>Qty Received</TableHead><TableHead>Unit Cost</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                        <TableBody>{items.map(item => (
                            <TableRow key={item.variant_id}>
                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                <TableCell>{item.quantity_ordered}</TableCell>
                                <TableCell>{item.quantity_received}</TableCell>
                                <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.quantity_ordered * item.unit_cost)}</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex justify-end font-bold text-xl">
                    Total Order Value: &nbsp; {formatCurrency(totalCost)}
                </CardFooter>
            </Card>
            
            {isReceiving && <ReceiveStockDialog po={po} items={items} onClose={() => setIsReceiving(false)} />}
        </>
    );
}