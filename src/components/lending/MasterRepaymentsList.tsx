'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Calendar, Filter, Phone, Download } from "lucide-react";
import RecordPaymentDialog from "./RecordPaymentDialog";

interface PaymentDue {
    loan_id: number; // Changed to number to match DB int4 id
    application_no: string;
    borrower_name: string;
    phone_number: string;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    balance_due: number;
    status: 'PENDING' | 'PARTIAL' | 'OVERDUE';
    officer_name: string;
}

// Enterprise fetcher with filtering params
async function fetchMasterSchedule(tenantId: string, filter: string) {
    const db = createClient();
    
    // In a real app, 'filter' would be passed to the RPC to reduce DB load
    const { data, error } = await db.rpc('get_master_repayment_schedule', { 
        p_tenant_id: tenantId,
        p_filter_type: filter // 'TODAY', 'WEEK', 'OVERDUE', 'ALL'
    });
    
    if (error) throw error;
    return data as PaymentDue[];
}

export function MasterRepaymentsList({ tenantId }: { tenantId: string }) {
    const [filter, setFilter] = React.useState('ALL');
    const [search, setSearch] = React.useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['master-repayments', tenantId, filter],
        queryFn: () => fetchMasterSchedule(tenantId, filter)
    });

    // Client-side search (Server side is better for huge datasets)
    const filteredData = data?.filter(item => 
        item.borrower_name.toLowerCase().includes(search.toLowerCase()) || 
        item.application_no.toLowerCase().includes(search.toLowerCase())
    );

    const totalDue = filteredData?.reduce((sum, item) => sum + item.balance_due, 0) || 0;

    return (
        <Card className="border-t-4 border-t-primary">
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary"/> Global Repayment Schedule
                        </CardTitle>
                        <CardDescription>
                            All pending installments across the portfolio. Total Due: 
                            <span className="font-bold text-primary ml-1">{formatCurrency(totalDue)}</span>
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                         <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-[160px]">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground"/>
                                <SelectValue placeholder="Filter Date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Upcoming</SelectItem>
                                <SelectItem value="TODAY">Due Today</SelectItem>
                                <SelectItem value="WEEK">Due This Week</SelectItem>
                                <SelectItem value="OVERDUE">Overdue / Arrears</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon">
                            <Download className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input 
                        placeholder="Search by Borrower Name or Loan Reference..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md"
                    />
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Loan Ref</TableHead>
                                <TableHead>Borrower Details</TableHead>
                                <TableHead className="text-right">Scheduled</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="text-right">Outstanding</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-primary"/></TableCell></TableRow>
                            ) : filteredData?.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No repayments found for this period.</TableCell></TableRow>
                            ) : (
                                filteredData?.map((item) => (
                                    <TableRow key={`${item.loan_id}-${item.due_date}`} className={item.status === 'OVERDUE' ? 'bg-red-50/50' : ''}>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {formatDate(item.due_date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {item.application_no}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{item.borrower_name}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3"/> {item.phone_number}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatCurrency(item.amount_due)}</TableCell>
                                        <TableCell className="text-right text-green-600">{formatCurrency(item.amount_paid)}</TableCell>
                                        <TableCell className="text-right font-bold text-slate-900">{formatCurrency(item.balance_due)}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'OVERDUE' ? 'destructive' : item.status === 'PARTIAL' ? 'outline' : 'secondary'}>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <RecordPaymentDialog 
                                                    applicationId={item.loan_id}
                                                    balance={item.balance_due}
                                                    suggestedAmount={item.balance_due}
                                                    tenantId={tenantId}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}