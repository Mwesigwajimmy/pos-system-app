import UnpaidInvoices from "@/components/rentals/UnpaidInvoices";

export default function InvoicesPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Unpaid Rent Invoices</h1>
            </div>
             <p className="text-sm text-muted-foreground">
                View all outstanding invoices and record payments as they are received.
            </p>
            <UnpaidInvoices />
        </div>
    );
}