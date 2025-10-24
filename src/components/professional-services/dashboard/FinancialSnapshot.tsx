import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export interface RecentInvoice {
    id: string;
    invoice_uid: string;
    status: 'PAID' | 'DUE' | 'OVERDUE';
    due_date: string;
    total: number;
    customers: { name: string; } | null;
}

const getStatusVariant = (status: RecentInvoice['status']) => {
    switch (status) {
        case 'PAID': return 'default';
        case 'OVERDUE': return 'destructive';
        case 'DUE':
        default: return 'secondary';
    }
}

export function FinancialSnapshot({ invoices }: { invoices: RecentInvoice[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Financial Snapshot</CardTitle>
                <CardDescription>Status of your most recent invoices.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {invoices.length > 0 ? (
                            invoices.map(invoice => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.customers?.name || 'N/A'}</TableCell>
                                    <TableCell>{format(new Date(invoice.due_date), 'PP')}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">No recent invoices found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}