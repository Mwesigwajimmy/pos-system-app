'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    ClipboardList, MapPin, Package, CheckCircle2, 
    User, AlertCircle, Loader2, Search, Printer 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function Picklist({ manifestId, businessId }: { manifestId: string, businessId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // FETCH: Pull items joined with their Warehouse Bin Locations
    const { data: items, isLoading } = useQuery({
        queryKey: ['picklist', manifestId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('logistics_manifest_items')
                .select(`
                    id, quantity, picked_qty, picking_status,
                    product_variants (
                        name, sku, bin_location, aisle_number
                    )
                `)
                .eq('manifest_id', manifestId);
            if (error) throw error;
            return data;
        }
    });

    // MUTATION: Update Picking Status (Chain of Custody)
    const pickItem = useMutation({
        mutationFn: async ({ itemId, qty }: { itemId: string, qty: number }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('logistics_manifest_items')
                .update({ 
                    picked_qty: qty, 
                    picking_status: 'completed',
                    picked_by: user?.id 
                })
                .eq('id', itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['picklist'] });
            toast.success("Inventory secured and picked.");
        }
    });

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <header className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Picklist</h2>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Manifest Ref: {manifestId.substring(0,8)}</p>
                </div>
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest border-slate-200">
                    <Printer size={16} /> Print Picking Slip
                </Button>
            </header>

            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="h-12">
                            <TableHead className="w-40 font-bold text-[10px] uppercase text-slate-500 pl-6">Location (Aisle/Bin)</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500">Product Specification</TableHead>
                            <TableHead className="w-32 text-center font-bold text-[10px] uppercase text-slate-500">Target Qty</TableHead>
                            <TableHead className="w-48 text-right pr-6 font-bold text-[10px] uppercase text-slate-500">Execution</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items?.map((item: any) => (
                            <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-none">
                                <TableCell className="pl-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex flex-col items-center justify-center text-blue-600 border border-blue-100">
                                            <span className="text-[10px] font-black leading-none">{item.product_variants?.aisle_number || 'N/A'}</span>
                                            <span className="text-[8px] font-bold uppercase mt-0.5">Aisle</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Bin: {item.product_variants?.bin_location || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm font-semibold text-slate-800">{item.product_variants?.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: {item.product_variants?.sku}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="text-lg font-bold text-slate-900">x{item.quantity}</span>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    {item.picking_status === 'completed' ? (
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] uppercase px-3 py-1">Picked & Verified</Badge>
                                    ) : (
                                        <Button 
                                            onClick={() => pickItem.mutate({ itemId: item.id, qty: item.quantity })}
                                            className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-md"
                                        >
                                            Confirm Pick
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}