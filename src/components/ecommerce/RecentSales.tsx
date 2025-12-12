import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// 1. Strict Type Definitions
export interface RecentOrder {
    id: string;
    customer_email: string;
    total_amount: number;
    currency: string;
    customer_name: string;
    customer_avatar?: string | null;
}

interface RecentSalesProps {
    orders: RecentOrder[];
}

// Helper: robust initial generator
const getInitials = (name: string) => {
    if (!name) return "GC"; // Guest Checkout
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

export function RecentSales({ orders }: RecentSalesProps) {
    return (
        <Card className="col-span-4 lg:col-span-3 h-full border-zinc-200 dark:border-zinc-800">
            <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                    You made {orders.length} verified sales recently.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {orders.length > 0 ? (
                    <div className="space-y-8">
                        {orders.map(order => {
                            return (
                                <div key={order.id} className="flex items-center">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={order.customer_avatar || undefined} alt={order.customer_name} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                            {getInitials(order.customer_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {order.customer_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                                            {order.customer_email}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium font-mono text-sm">
                                        +{new Intl.NumberFormat('en-US', { 
                                            style: 'currency', 
                                            currency: order.currency 
                                        }).format(order.total_amount)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex h-[200px] w-full items-center justify-center border-dashed border-2 rounded-md">
                        <p className="text-sm text-muted-foreground">No recent sales to display.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}