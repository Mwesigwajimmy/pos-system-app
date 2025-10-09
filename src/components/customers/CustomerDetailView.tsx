'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, ArrowUpDown, Edit, Mail, Award, ShoppingBag, TrendingUp, FileText, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Your latest data structure
interface SaleHistory { id: number; created_at: string; total_amount: number; payment_method: string; }
interface CustomerDetails { customer: { name: string; email: string; phone_number: string; loyalty_points: number; }; purchase_history: SaleHistory[] | null; }

// Your latest fetch function
async function fetchCustomerDetails(customerId: number): Promise<CustomerDetails> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_customer_details', { p_customer_id: customerId });
    if (error) throw new Error(error.message);
    return data;
}

// Your currency format
const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  </div>
);

const columns: ColumnDef<SaleHistory>[] = [
  { accessorKey: 'id', header: 'Sale ID', cell: ({ row }) => `#${row.original.id}` },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Date<ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
    cell: ({ row }) => format(new Date(row.original.created_at), 'dd MMM, yyyy HH:mm'),
  },
  {
    accessorKey: 'payment_method',
    header: 'Payment Method',
    cell: ({ row }) => <Badge variant="outline">{row.original.payment_method}</Badge>,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'total_amount',
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.total_amount)}</div>,
  },
];

const PurchaseHistoryTable = ({ data }: { data: SaleHistory[] }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const paymentMethods = useMemo(() => Array.from(new Set(data.map(d => d.payment_method))), [data]);
  
  const table = useReactTable({
    data, columns, state: { sorting, columnFilters },
    onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Select value={(table.getColumn('payment_method')?.getFilterValue() as string) ?? ''} onValueChange={value => table.getColumn('payment_method')?.setFilterValue(value || undefined)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by payment method..." /></SelectTrigger>
          <SelectContent><SelectItem value="">All Methods</SelectItem>{paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results found.</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2"><Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button><Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button></div>
    </div>
  );
};

const SpendingChart = ({ data }: { data: SaleHistory[] }) => {
  const chartData = useMemo(() => data
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(item => ({ date: format(new Date(item.created_at), 'dd MMM'), total: item.total_amount })), [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={value => `UGX ${Number(value) / 1000}k`} /><Tooltip formatter={(value: number) => [formatCurrency(value), 'Total']} /><Legend /><Line type="monotone" dataKey="total" name="Sale Total" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} /></LineChart>
    </ResponsiveContainer>
  );
};

const EditCustomerDialog = ({ customer }: { customer: CustomerDetails['customer'] }) => (
  <Dialog>
    <DialogTrigger asChild><Button><Edit className="mr-2 h-4 w-4" /> Edit Customer</Button></DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader><DialogTitle>Edit Customer</DialogTitle><DialogDescription>Make changes to the customer's profile.</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Name</Label><Input id="name" defaultValue={customer.name} className="col-span-3" /></div>
        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" type="email" defaultValue={customer.email} className="col-span-3" /></div>
        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone" className="text-right">Phone</Label><Input id="phone" defaultValue={customer.phone_number} className="col-span-3" /></div>
      </div>
      <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
    </DialogContent>
  </Dialog>
);

const CustomerDetailSkeleton = () => (
    <div className="space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start gap-4"><div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-5 w-64" /></div><div className="flex items-center gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-32" /></div></header>
        <div className="grid md:grid-cols-3 gap-6"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
            <main><Card><CardHeader className="flex flex-row space-x-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card></main>
        </div>
    </div>
);

export default function CustomerDetailView({ customerId }: { customerId: number }) {
    const { data: details, isLoading, isError, error, refetch } = useQuery({ 
        queryKey: ['customerDetails', customerId], 
        queryFn: () => fetchCustomerDetails(customerId) 
    });

    if (isLoading) return <CustomerDetailSkeleton />;
    if (isError) return <div className="flex flex-col items-center justify-center text-center py-12"><AlertTriangle className="h-12 w-12 text-destructive" /><h2 className="mt-4 text-xl font-semibold">Could not load customer data.</h2><p className="mt-2 text-muted-foreground">{(error as Error).message}</p><Button onClick={() => refetch()} className="mt-4">Try Again</Button></div>;
    if (!details?.customer) return <div className="text-center p-10">Customer not found.</div>;

    const { customer, purchase_history } = details;
    const purchaseHistoryData = purchase_history || [];
    const lifetimeValue = purchaseHistoryData.reduce((sum, sale) => sum + sale.total_amount, 0);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div><h1 className="text-3xl font-bold">{customer.name}</h1><p className="text-muted-foreground">{customer.email} | {customer.phone_number}</p></div>
                <div className="flex items-center gap-2"><Button variant="outline"><Mail className="mr-2 h-4 w-4" /> Send Email</Button><EditCustomerDialog customer={customer} /></div>
            </header>

            <div className="grid md:grid-cols-3 gap-6">
                <StatCard title="Loyalty Points" value={customer.loyalty_points.toLocaleString()} icon={Award} />
                <StatCard title="Total Purchases" value={purchaseHistoryData.length} icon={ShoppingBag} />
                <StatCard title="Lifetime Value" value={formatCurrency(lifetimeValue)} icon={TrendingUp} />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <aside className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Contact & Info</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem icon={Mail} label="Email" value={customer.email} />
                            <DetailItem icon={Phone} label="Phone" value={customer.phone_number} />
                            <DetailItem icon={Award} label="Loyalty Points" value={customer.loyalty_points.toLocaleString()} />
                        </CardContent>
                    </Card>
                </aside>

                <main>
                    <Tabs defaultValue="history">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3"><TabsTrigger value="history"><ShoppingBag className="mr-2 h-4 w-4" />History</TabsTrigger><TabsTrigger value="spending"><TrendingUp className="mr-2 h-4 w-4" />Spending</TabsTrigger><TabsTrigger value="notes"><FileText className="mr-2 h-4 w-4" />Notes</TabsTrigger></TabsList>
                        <TabsContent value="history" className="mt-4"><Card><CardHeader><CardTitle>Purchase History</CardTitle></CardHeader><CardContent><PurchaseHistoryTable data={purchaseHistoryData} /></CardContent></Card></TabsContent>
                        <TabsContent value="spending" className="mt-4"><Card><CardHeader><CardTitle>Spending Over Time</CardTitle></CardHeader><CardContent className="pt-6"><SpendingChart data={purchaseHistoryData} /></CardContent></Card></TabsContent>
                        <TabsContent value="notes" className="mt-4"><Card><CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea placeholder="Add a note about this customer..." /><Button>Save Note</Button></CardContent></Card></TabsContent>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}