// src/components/accounting/BillsDataTable.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Loader2, DollarSign, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// UI Component Imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// --- Data Types and API Functions ---

interface Bill {
    id: number;
    supplier_name: string;
    bill_date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    status: 'draft' | 'awaiting_payment' | 'paid' | 'partial';
}

interface Account {
    id: number;
    name: string;
}

async function fetchBills(): Promise<Bill[]> {
    const { data, error } = await createClient().rpc('get_all_bills');
    if (error) throw error;
    return data || [];
}

async function fetchPaymentAccounts(): Promise<Account[]> {
    const { data, error } = await createClient().from('accounts').select('id, name').eq('type', 'ASSET').filter('is_bank_account', 'eq', true);
    if (error) throw error;
    return data || [];
}

async function recordBillPayment(vars: { billId: number; amount: number; accountId: number }) {
    const { error } = await createClient().rpc('record_bill_payment', {
        p_bill_id: vars.billId,
        p_amount_paid: vars.amount,
        p_payment_account_id: vars.accountId
    });
    if (error) throw error;
}

// --- Helper Functions and Constants ---

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;
const statusStyles: Record<Bill['status'], string> = {
    draft: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    awaiting_payment: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    partial: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    paid: "bg-green-100 text-green-800 hover:bg-green-200"
};

// --- Sub-Components ---

const RecordPaymentDialog = ({ bill, onClose }: { bill: Bill; onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState<number>(bill.total_amount - bill.amount_paid);
    const [accountId, setAccountId] = useState<string | undefined>();
    const { data: accounts, isLoading: isLoadingAccounts } = useQuery({ queryKey: ['paymentAccounts'], queryFn: fetchPaymentAccounts });

    const mutation = useMutation({
        mutationFn: recordBillPayment,
        onSuccess: () => {
            toast.success('Payment recorded successfully!');
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Payment failed: ${err.message}`),
    });

    const handleSubmit = () => {
        if (!accountId || amount <= 0) {
            return toast.error("Please select a payment account and enter a valid amount.");
        }
        mutation.mutate({ billId: bill.id, amount, accountId: Number(accountId) });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for Bill #{bill.id}</DialogTitle>
                    <DialogDescription>
                        Supplier: {bill.supplier_name} | Amount Due: {formatCurrency(bill.total_amount - bill.amount_paid)}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="payment-account">Payment Account</Label>
                        <Select onValueChange={setAccountId} value={accountId}>
                            <SelectTrigger id="payment-account" disabled={isLoadingAccounts}>
                                <SelectValue placeholder="Select account..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts?.map(acc => <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="amount">Amount Paid (UGX)</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} max={bill.total_amount - bill.amount_paid} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Data Table Component ---

export default function BillsDataTable() {
    const { data: bills = [], isLoading } = useQuery({ queryKey: ['bills'], queryFn: fetchBills });
    const [payingBill, setPayingBill] = useState<Bill | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const columns: ColumnDef<Bill>[] = [
        { accessorKey: "id", header: "Bill #", cell: ({ row }) => <span className="font-medium">#{row.original.id}</span> },
        {
            accessorKey: "supplier_name",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Supplier <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
        },
        { accessorKey: "due_date", header: "Due Date", cell: ({ row }) => format(new Date(row.original.due_date), 'dd MMM, yyyy') },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge className={cn("capitalize", statusStyles[row.original.status])}>
                    {row.original.status.replace('_', ' ')}
                </Badge>
            )
        },
        {
            accessorKey: "total_amount",
            header: () => <div className="text-right">Amount Due</div>,
            cell: ({ row }) => {
                const amountDue = row.original.total_amount - row.original.amount_paid;
                return <div className="text-right font-medium">{formatCurrency(amountDue)}</div>;
            }
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {row.original.status !== 'paid' && (
                                <DropdownMenuItem onClick={() => setPayingBill(row.original)}>
                                    <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: bills,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: { sorting, columnFilters },
    });

    return (
        <>
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter by supplier..."
                    value={(table.getColumn("supplier_name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) => table.getColumn("supplier_name")?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading bills...</TableCell></TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No outstanding bills found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            </div>
            {payingBill && <RecordPaymentDialog bill={payingBill} onClose={() => setPayingBill(null)} />}
        </>
    );
}