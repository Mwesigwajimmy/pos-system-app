'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    ClipboardList, MapPin, Package, Printer, 
    CheckCircle2, Loader2, Warehouse, ArrowLeft 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function PicklistManager({ manifestId, businessId }: { manifestId: string, businessId: string }) {
    const supabase = createClient();

    const { data: manifest, isLoading } = useQuery({
        queryKey: ['picklist_manifest', manifestId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('logistics_manifests')
                .select(`
                    *,
                    items:logistics_manifest_items (
                        id, quantity, picking_status,
                        product_variants ( name, sku, bin_location, aisle_number )
                    )
                `)
                .eq('id', manifestId)
                .single();
            if (error) throw error;
            return data;
        }
    });

    // Enterprise Logic: Sort items by Aisle and Bin to minimize walking time
    const sortedItems = useMemo(() => {
        if (!manifest?.items) return [];
        return [...manifest.items].sort((a, b) => {
            const aisleA = a.product_variants?.aisle_number || '';
            const aisleB = b.product_variants?.aisle_number || '';
            return aisleA.localeCompare(aisleB) || (a.product_variants?.bin_location || '').localeCompare(b.product_variants?.bin_location || '');
        });
    }, [manifest]);

    const generatePickingSlipPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text("OFFICIAL WAREHOUSE PICKING SLIP", 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Manifest Ref: ${manifest.shipment_ref}`, 20, 35);
        doc.text(`Date: ${format(new Date(), 'PPP')}`, 20, 41);
        doc.text(`Dispatcher ID: ${businessId.substring(0, 8).toUpperCase()}`, 20, 47);

        autoTable(doc, {
            startY: 55,
            head: [['AISLE', 'BIN', 'SKU', 'DESCRIPTION', 'QTY', 'PICKED']],
            body: sortedItems.map(i => [
                i.product_variants?.aisle_number || '-',
                i.product_variants?.bin_location || '-',
                i.product_variants?.sku,
                i.product_variants?.name,
                i.quantity,
                '[   ]'
            ]),
            headStyles: { fillColor: [51, 65, 85] },
            theme: 'grid'
        });

        doc.save(`PICKSLIP-${manifest.shipment_ref}.pdf`);
    };

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto">
            <header className="flex justify-between items-end border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Warehouse size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Internal Logistics</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Picking Directive</h1>
                    <p className="text-sm text-slate-500 font-medium">Route-optimized inventory collection for manifest <span className="font-bold text-slate-700">#{manifest?.shipment_ref}</span></p>
                </div>
                <Button onClick={generatePickingSlipPDF} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest h-12 px-8 rounded-xl shadow-lg">
                    <Printer size={16} className="mr-2" /> Print Official Slip
                </Button>
            </header>

            <div className="grid grid-cols-1 gap-4">
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50 h-14">
                            <TableRow>
                                <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Warehouse Location</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500">Item Specification</TableHead>
                                <TableHead className="w-32 text-center font-bold text-[10px] uppercase text-slate-500">Target Qty</TableHead>
                                <TableHead className="w-32 text-right pr-8 font-bold text-[10px] uppercase text-slate-500">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 border-b last:border-none transition-colors">
                                    <TableCell className="pl-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-center min-w-[70px]">
                                                <p className="text-[10px] font-black leading-none">{item.product_variants?.aisle_number || '00'}</p>
                                                <p className="text-[8px] font-bold uppercase mt-1">Aisle</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-white">Bin: {item.product_variants?.bin_location || 'N/A'}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-bold text-slate-800">{item.product_variants?.name}</p>
                                        <p className="text-[10px] font-medium text-slate-400">SKU: {item.product_variants?.sku}</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-xl font-bold text-slate-900">x{item.quantity}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <Badge className={`${item.picking_status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} border-none font-bold text-[9px] uppercase px-3 py-1`}>
                                            {item.picking_status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}