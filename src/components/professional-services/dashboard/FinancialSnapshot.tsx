'use client';

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

// --- EXPORTED INTERFACE ---
export interface RecentInvoice {
    id: string;
    invoice_uid: string;
    status: 'PAID' | 'DUE' | 'OVERDUE' | 'DRAFT' | string; // Loose string type for safety
    due_date: string | null;
    total: number;
    currency?: string;
    customers: { name: string; } | null;
}

const getStatusVariant = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
        case 'PAID': return 'default'; // standard/black
        case 'OVERDUE': return 'destructive'; // red
        case 'DUE': return 'secondary'; // gray/blueish
        case 'DRAFT': return 'outline';
        default: return 'outline';
    }
}

export function FinancialSnapshot({ invoices }: { invoices: RecentInvoice[] }) {
    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Financial Snapshot</CardTitle>
                        <CardDescription>Recent invoice activity and payment status.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                        <Link href="/dashboard/invoices">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[180px]">Client / Invoice #</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices && invoices.length > 0 ? (
                                invoices.map(invoice => (
                                    <TableRow key={invoice.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-slate-900">
                                                    {invoice.customers?.name || 'Unknown Client'}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    {invoice.invoice_uid}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium font-mono text-sm">
                                            {new Intl.NumberFormat('en-US', { 
                                                style: 'currency', 
                                                currency: invoice.currency || 'USD' 
                                            }).format(invoice.total)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={getStatusVariant(invoice.status)} className="text-[10px] uppercase tracking-wider font-bold">
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        No recent invoices found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}