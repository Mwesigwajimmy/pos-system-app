// src/components/management/LivePosMonitor.tsx
// FINAL, CORRECTED VERSION

'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, Activity } from 'lucide-react';

type LiveSaleFeedItem = {
    sale_id: number;
    created_at: string;
    employee_name: string;
    customer_name: string;
    total_amount: number;
    item_count: number;
};

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

async function fetchLiveFeed(): Promise<LiveSaleFeedItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_live_pos_feed');
    if (error) {
        throw new Error(`Failed to fetch live feed: ${error.message}`);
    }
    return data || [];
}

export default function LivePosMonitor() {
    const queryClient = useQueryClient();
    const [highlightedRow, setHighlightedRow] = useState<number | null>(null);

    const { data: sales, isLoading, isError, error } = useQuery({
        queryKey: ['livePosFeed'],
        queryFn: fetchLiveFeed,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('public:sales')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sales' },
                (payload) => {
                    toast.success(`New Sale #${payload.new.id} from the POS!`);
                    setHighlightedRow(payload.new.id);
                    queryClient.invalidateQueries({ queryKey: ['livePosFeed'] });
                    
                    // Remove highlight after a few seconds
                    setTimeout(() => setHighlightedRow(null), 3000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Connecting to live feed...</p>
                </div>
            );
        }

        if (isError) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-destructive">
                    <AlertTriangle className="h-8 w-8 mb-4" />
                    <p className="font-bold">Connection Error</p>
                    <p className="text-sm">{error.message}</p>
                </div>
            );
        }

        if (!sales || sales.length === 0) {
            return (
                <div className="p-12 text-center text-muted-foreground">
                    <p>No sales have been made recently. Waiting for new activity from the POS...</p>
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Sale ID</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                </TableHeader>
                {/* FIX IS HERE: We map directly inside the TableBody */}
                <TableBody>
                    {sales.map((sale) => (
                        <motion.tr
                            key={sale.sale_id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className={`transition-colors duration-1000 ${highlightedRow === sale.sale_id ? 'bg-green-100 dark:bg-green-900/50' : ''}`}
                        >
                            <TableCell>{formatDistanceToNow(new Date(sale.created_at), { addSuffix: true })}</TableCell>
                            <TableCell>#{sale.sale_id}</TableCell>
                            <TableCell>{sale.employee_name || 'N/A'}</TableCell>
                            <TableCell>{sale.customer_name}</TableCell>
                            <TableCell><Badge variant="secondary">{sale.item_count}</Badge></TableCell>
                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(sale.total_amount)}</TableCell>
                        </motion.tr>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Activity className="text-primary"/>Real-Time Sales Monitor</CardTitle>
                        <CardDescription>
                            You are viewing a live feed of all sales transactions as they happen across your business.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-green-600">Live</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
}