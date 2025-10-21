import UnpaidInvoices from "@/components/rentals/UnpaidInvoices";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InvoicesPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Page Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Rent Invoices</h1>
                <p className="text-sm text-muted-foreground">
                    A centralized place to view outstanding invoices and record payments as they are received.
                </p>
            </div>

            {/* Unpaid Invoices Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Outstanding Invoices</CardTitle>
                    <CardDescription>
                        The table below lists all rent invoices that are currently unpaid.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UnpaidInvoices />
                </CardContent>
            </Card>
        </div>
    );
}