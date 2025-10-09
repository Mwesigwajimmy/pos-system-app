'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';

interface LiveSale { id: number; total_amount: number; created_at: string; }

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function LiveSalesFeed() {
    const [liveSales, setLiveSales] = useState<LiveSale[]>([]);
    
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('public:sales')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'sales' }, 
                (payload) => {
                    const newSale = payload.new as LiveSale;
                    // Add the new sale to the top of the list, and keep only the last 5
                    setLiveSales(currentSales => [newSale, ...currentSales].slice(0, 5));
                    toast.success(`New Sale #${newSale.id} processed!`);
                }
            )
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity/> Live Sales Feed</CardTitle></CardHeader>
            <CardContent>
                <AnimatePresence>
                    {liveSales.map(sale => (
                        <motion.div 
                            key={sale.id}
                            layout
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.5 }}
                            className="p-3 mb-2 border rounded-lg"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Sale #{sale.id}</span>
                                <span className="text-green-500 font-semibold">
                                    {formatCurrency(sale.total_amount)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {new Date(sale.created_at).toLocaleTimeString()}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {liveSales.length === 0 && <p className="text-center text-muted-foreground py-8">Waiting for new sales...</p>}
            </CardContent>
        </Card>
    );
}