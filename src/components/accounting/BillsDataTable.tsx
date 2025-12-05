'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { 
  Loader2, 
  DollarSign, 
  ArrowUpDown, 
  MoreHorizontal, 
  Filter,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types ---

export type BillStatus = 'draft' | 'pending' | 'overdue' | 'paid' | 'partial';

export interface Bill {
  id: string;
  vendor_name: string;
  reference_number: string;
  bill_date: string;
  due_date: string;
  currency: string;
  total_amount: number;
  amount_paid: number;
  status: BillStatus;
  business_id: string;
}

interface PaymentAccount {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

interface BillsDataTableProps {
    initialBills: Bill[];
    businessId: string;
}

// --- API Functions ---

const fetchBillsClient = async (businessId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounting_bills')
    .select('*')
    .eq('business_id', businessId)
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Bill[];
};

const fetchPaymentAccounts = async (businessId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounting_accounts')
    .select('id, name, currency, balance')
    .eq('business_id', businessId)
    .in('type', ['Bank', 'Cash']) // Ensure your DB has these types
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  return data as PaymentAccount[];
};

const recordPayment = async (payload: { bill_id: string; account_id: string; amount: number; payment_date: string, business_id: string }) => {
  const supabase = createClient();
  
  // Calling the secure RPC function created in Part 1
  const { data, error } = await supabase.rpc('record_bill_payment', {
    p_bill_id: payload.bill_id,
    p_account_id: payload.account_id,
    p_amount: payload.amount,
    p_date: payload.payment_date,
    p_business_id: payload.business_id
  });

  if (error) throw new Error(error.message);
  return data;
};

// --- Sub-Component: Payment Dialog ---

interface PaymentDialogProps {
  bill: Bill | null;
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentDialog = ({ bill, businessId, isOpen, onClose }: PaymentDialogProps) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  
  // Fetch accounts only when modal is open to save resources
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['payment_accounts', businessId],
    queryFn: () => fetchPaymentAccounts(businessId),
    enabled: isOpen && !!businessId
  });

  // Effect to set default amount to "Remaining Balance"
  React.useEffect(() => {
    if (bill) {
      const remaining = bill.total_amount - bill.amount_paid;
      setAmount(remaining > 0 ? remaining.toString() : '0');
    }
  }, [bill]);

  const mutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      // Refetch bills to show new status
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      // Refetch accounts to show new bank balance
      queryClient.invalidateQueries({ queryKey: ['payment_accounts'] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Payment failed: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    if (!bill || !accountId || !amount) {
        toast.error("Please fill all fields");
        return;
    }
    
    mutation.mutate({
      bill_id: bill.id,
      account_id: accountId,
      amount: parseFloat(amount),
      payment_date: new Date().toISOString(),
      business_id: businessId
    });
  };

  if (!bill) return null;

  const remaining = bill.total_amount - bill.amount_paid;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Payment for <strong>{bill.vendor_name}</strong> (Ref: {bill.reference_number})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold">Balance Due</Label>
            <div className="col-span-3 font-mono text-sm">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: bill.currency }).format(remaining)}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account" className="text-right">Pay From</Label>
            <div className="col-span-3">
                <Select onValueChange={setAccountId} value={accountId}>
                <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading accounts..." : "Select Bank Account"} />
                </SelectTrigger>
                <SelectContent>
                    {accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency}) - Bal: {acc.balance.toLocaleString()}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              max={remaining}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Main Component ---

export default function BillsDataTable({ initialBills, businessId }: BillsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  
  // Action State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // TanStack Query to manage state and refetching
  const { data: bills, isLoading, isError, error } = useQuery({
    queryKey: ['bills', businessId],
    queryFn: () => fetchBillsClient(businessId),
    initialData: initialBills, // Use server data first
  });

  const columns: ColumnDef<Bill>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const styles = {
          paid: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
          partial: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
          overdue: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
          pending: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
          draft: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
        };
        return (
          <Badge variant="outline" className={cn("capitalize", styles[status as keyof typeof styles] || styles.draft)}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Vendor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "reference_number",
      header: "Ref #",
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => {
        const date = row.getValue("due_date");
        if (!date) return "-";
        return <div className="text-sm text-muted-foreground">{format(new Date(date as string), "PP")}</div>
      },
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_amount"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.currency,
        }).format(amount);
        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      id: "balance",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => {
        const balance = row.original.total_amount - row.original.amount_paid;
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.currency,
        }).format(balance);
        return <div className="text-right font-mono text-xs">{formatted}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const bill = row.original;
        return (
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
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(bill.id)}>
                  Copy Bill ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
                {bill.status !== 'paid' && (
                  <DropdownMenuItem onClick={() => {
                    setSelectedBill(bill);
                    setPaymentModalOpen(true);
                  }}>
                    <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                    Record Payment
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: bills,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (isError) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-md">Error loading bills: {error.message}</div>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter vendors..."
            value={(table.getColumn("vendor_name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("vendor_name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Bill
        </Button>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                   <div className="flex items-center justify-center gap-2">
                     <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     <span>Loading bills...</span>
                   </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No bills found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <PaymentDialog 
        bill={selectedBill} 
        businessId={businessId}
        isOpen={paymentModalOpen} 
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedBill(null);
        }} 
      />
    </div>
  );
}