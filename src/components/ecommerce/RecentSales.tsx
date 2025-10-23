import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Define the shape of the order prop
interface Order {
    id: string;
    customer_email: string;
    total_amount: number;
    customers: {
        name: string | null;
    } | null;
}

interface RecentSalesProps {
    orders: Order[];
}

// Helper to generate initials from a name
const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('');
};

export function RecentSales({ orders }: RecentSalesProps) {
    return (
        <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                    You made {orders.length} sales this month.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {orders.length > 0 ? (
                    <div className="space-y-8">
                        {orders.map(order => {
                            const customerName = order.customers?.name || order.customer_email;
                            const fallbackInitials = getInitials(customerName);

                            return (
                                <div key={order.id} className="flex items-center">
                                    <Avatar className="h-9 w-9">
                                        {/* In a real app, you would have a customer profile picture URL */}
                                        {/* <AvatarImage src="/avatars/01.png" alt="Avatar" /> */}
                                        <AvatarFallback>{fallbackInitials}</AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {customerName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {order.customer_email}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total_amount)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex h-[200px] w-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">No recent sales to display.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}