'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Boxes, AlertTriangle } from 'lucide-react';

interface InventoryItem {
    id: string;
    item_name: string;
    sku: string;
    category: 'SIM' | 'DEVICE' | 'ROUTER';
    stock_quantity: number;
    reorder_level: number;
    price: number;
}

export default function InventoryPage() {
    const supabase = createClient();

    const { data: inventory, isLoading, isError, error } = useQuery({
        queryKey: ['telecomInventory'],
        queryFn: async (): Promise<InventoryItem[]> => {
            const { data, error } = await supabase.rpc('get_telecom_inventory');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    if (isError) { toast.error(`Failed to load inventory: ${error.message}`); }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sim & Device Inventory</h1>
                    <p className="text-muted-foreground">Track stock levels for physical telecom assets.</p>
                </div>
                <Button><Boxes className="mr-2 h-4 w-4"/> Add Stock</Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Current Stock</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Item Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {inventory?.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                        <TableCell className="font-medium">{item.item_name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-right">{item.price.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">{item.stock_quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {item.stock_quantity <= item.reorder_level ? 
                                                <Badge variant="destructive" className="flex items-center w-fit ml-auto"><AlertTriangle className="h-3 w-3 mr-1"/> Low Stock</Badge> : 
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">In Stock</Badge>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}