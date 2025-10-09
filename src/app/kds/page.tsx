'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimeAgo from 'react-timeago';
import toast from 'react-hot-toast';

interface KitchenOrder {
  id: number;
  created_at: string;
  notes: string | null;
  kitchen_items: { product_name: string; variant_name: string; quantity: number; }[];
}

export default function KDSPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const supabase = createClient();

  async function fetchInitialOrders() {
    const { data, error } = await supabase.rpc('get_active_kitchen_orders');
    if (error) {
      toast.error("Could not fetch kitchen orders.");
    } else {
      setOrders(data || []);
    }
  }

  useEffect(() => {
    fetchInitialOrders();

    const channel = supabase
      .channel('public:sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
        fetchInitialOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFulfillOrder = async (orderId: number) => {
    const { error } = await supabase.from('sales').update({ status: 'Fulfilled' }).eq('id', orderId);
    if (error) {
      toast.error(`Failed to fulfill order #${orderId}: ${error.message}`);
    } else {
      toast.success(`Order #${orderId} fulfilled!`);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-4 text-white">
      <h1 className="text-3xl font-bold text-center mb-4">Kitchen Display</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map(order => (
          <Card key={order.id} className="bg-gray-800 border-yellow-500">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Order #{order.id}</span>
                <span className="text-sm font-normal"><TimeAgo date={order.created_at} /></span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {order.kitchen_items.map((item, index) => (
                  <li key={index} className="flex items-center"><span className="font-bold text-lg mr-4">{item.quantity}x</span><div><p>{item.product_name}</p><p className="text-sm text-gray-400">{item.variant_name}</p></div></li>
                ))}
              </ul>
              {order.notes && <p className="text-yellow-400 border-t border-gray-700 pt-2">Notes: {order.notes}</p>}
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleFulfillOrder(order.id)}>Mark as Fulfilled</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}