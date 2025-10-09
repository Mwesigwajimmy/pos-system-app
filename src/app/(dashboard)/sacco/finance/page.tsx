// src/app/(dashboard)/sacco/finance/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

// --- Type Definitions ---
interface FinancialRecord { id: bigint; description: string; amount: number; transaction_date: string; }

// --- Async Functions ---
async function fetchRecords(table: 'sacco_revenue' | 'sacco_expenses') {
    const supabase = createClient();
    const { data, error } = await supabase.from(table).select('*').order('transaction_date', { ascending: false });
    if (error) throw error;
    return data;
}
async function addRecord(vars: { table: 'sacco_revenue' | 'sacco_expenses'; description: string; amount: number; date: string; }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user!.id).single();
    
    const { error } = await supabase.from(vars.table).insert({
        business_id: profile!.business_id,
        description: vars.description,
        amount: vars.amount,
        transaction_date: vars.date,
    });
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

const FinancialTable = ({ data, isLoading }: { data: FinancialRecord[] | undefined, isLoading: boolean }) => (
    <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
        <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading records...</TableCell></TableRow>}
            {data?.map(record => (
                <TableRow key={record.id.toString()}>
                    <TableCell>{format(new Date(record.transaction_date), "PPP")}</TableCell>
                    <TableCell>{record.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(record.amount)}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);

export default function FinancialLedgerPage() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState<'revenue' | 'expenses'>('revenue');
    const queryClient = useQueryClient();

    const { data: revenue, isLoading: isLoadingRevenue } = useQuery({ queryKey: ['saccoRevenue'], queryFn: () => fetchRecords('sacco_revenue') });
    const { data: expenses, isLoading: isLoadingExpenses } = useQuery({ queryKey: ['saccoExpenses'], queryFn: () => fetchRecords('sacco_expenses') });

    const mutation = useMutation({
        mutationFn: addRecord,
        onSuccess: () => {
            toast.success("Record added successfully!");
            queryClient.invalidateQueries({ queryKey: ['saccoRevenue'] });
            queryClient.invalidateQueries({ queryKey: ['saccoExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['saccoFinancialSummary'] });
            setIsOpen(false);
        },
        onError: (error: any) => toast.error(`Failed: ${error.message}`),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutation.mutate({
            table: currentTab === 'revenue' ? 'sacco_revenue' : 'sacco_expenses',
            description: formData.get('description') as string,
            amount: Number(formData.get('amount')),
            date: formData.get('date') as string,
        });
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Financial Ledger</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>Add New Record</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New {currentTab === 'revenue' ? 'Revenue' : 'Expense'} Record</DialogTitle>
                            <DialogDescription>Log an income or expense transaction for the organization.</DialogDescription>
                        </DialogHeader>
                        <form id="recordForm" onSubmit={handleSubmit} className="space-y-4 py-4">
                            <Label>Description</Label><Input name="description" required />
                            <Label>Amount (UGX)</Label><Input name="amount" type="number" required />
                            <Label>Transaction Date</Label><Input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
                        </form>
                        <DialogFooter><Button form="recordForm" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Record"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Tabs defaultValue="revenue" onValueChange={(value) => setCurrentTab(value as any)}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>
                <TabsContent value="revenue">
                    <FinancialTable data={revenue} isLoading={isLoadingRevenue} />
                </TabsContent>
                <TabsContent value="expenses">
                    <FinancialTable data={expenses} isLoading={isLoadingExpenses} />
                </TabsContent>
            </Tabs>
        </div>
    );
}