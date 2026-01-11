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
  Plus,
  Link as LinkIcon,
  CheckCircle2,
  ShieldCheck,
  History,
  Trash2,
  X,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
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

// --- Enterprise Interconnect Components & Actions ---
import CreateBillModal from './CreateBillModal'; 
import { postBillPayment } from '@/lib/actions/bills';

// --- Types ---

export type BillStatus = 'draft' | 'awaiting_approval' | 'posted' | 'overdue' | 'paid' | 'partial';

export interface Bill {
  id: string;
  vendor_name: string;
  bill_number: string;     
  reference_id: string;    
  bill_date: string;
  due_date: string;
  currency_code: string;   
  total_amount: number;
  amount_paid: number;
  status: BillStatus;
  business_id: string;
  transaction_id: string;  
  location_id?: string;    
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

// --- API Functions (Interconnected) ---

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
    .in('subtype', ['bank', 'cash']) 
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  return data as PaymentAccount[];
};

// Enterprise Action: Bulk Approval
const bulkApproveBills = async (payload: { billIds: string[], businessId: string }) => {
  const supabase = createClient();
  const { error } = await supabase
    .from('accounting_bills')
    .update({ status: 'posted' })
    .in('id', payload.billIds)
    .eq('business_id', payload.businessId);

  if (error) throw new Error(error.message);
  return true;
};

const recordPayment = async (payload: { bill_id: string; account_id: string; amount: number; payment_date: string, business_id: string }) => {
  const result = await postBillPayment({
      billId: payload.bill_id,
      accountId: payload.account_id,
      amount: payload.amount,
      paymentDate: payload.payment_date,
      businessId: payload.business_id
  });

  if (!result.success) throw new Error(result.message);
  return result;
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
  
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['payment_accounts', businessId],
    queryFn: () => fetchPaymentAccounts(businessId),
    enabled: isOpen && !!businessId
  });

  React.useEffect(() => {
    if (bill) {
      const remaining = bill.total_amount - bill.amount_paid;
      setAmount(remaining > 0 ? remaining.toString() : '0');
    }
  }, [bill]);

  const mutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      toast.success("Payment recorded & Ledger balanced successfully");
      queryClient.invalidateQueries({ queryKey: ['bills', businessId] });
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
          <DialogDescription>
            Post payment for <strong>{bill.vendor_name}</strong> (Bill: {bill.bill_number})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold">Balance Due</Label>
            <div className="col-span-3 font-mono text-sm">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: bill.currency_code }).format(bill.total_amount - bill.amount_paid)}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account" className="text-right">Account</Label>
            <div className="col-span-3">
                <Select onValueChange={setAccountId} value={accountId}>
                <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading..." : "Select Source Account"} />
                </SelectTrigger>
                <SelectContent>
                    {accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Post Ledger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Main Component ---

export default function BillsDataTable({ initialBills, businessId }: BillsDataTableProps) {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  
  // Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', businessId],
    queryFn: () => fetchBillsClient(businessId),
    initialData: initialBills,
  });

  const bulkApproveMutation = useMutation({
    mutationFn: bulkApproveBills,
    onSuccess: () => {
      toast.success("Batch bills authorized successfully");
      queryClient.invalidateQueries({ queryKey: ['bills', businessId] });
      setRowSelection({});
    }
  });

  const columns: ColumnDef<Bill>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "status",
      header: "Workflow Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const styles = {
          paid: "bg-green-100 text-green-800 border-green-200",
          partial: "bg-blue-100 text-blue-800 border-blue-200",
          overdue: "bg-red-100 text-red-800 border-red-200",
          posted: "bg-yellow-100 text-yellow-800 border-yellow-200",
          awaiting_approval: "bg-orange-100 text-orange-800 border-orange-200 animate-pulse",
          draft: "bg-gray-100 text-gray-800 border-gray-200",
        };
        return (
          <Badge variant="outline" className={cn("capitalize font-semibold", styles[status as keyof typeof styles] || styles.draft)}>
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "vendor_name",
      header: "Vendor Partner",
    },
    {
      accessorKey: "bill_number",
      header: "Reference",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-mono text-xs">
          <LinkIcon className="w-3 h-3 text-primary" />
          {row.getValue("bill_number")}
        </div>
      )
    },
    {
      accessorKey: "due_date",
      header: "Maturity Date",
      cell: ({ row }) => format(new Date(row.getValue("due_date")), "MMM dd, yyyy")
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => {
        const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: row.original.currency_code }).format(row.original.total_amount);
        return <div className="text-right font-bold text-primary">{formatted}</div>;
      },
    },
    {
      id: "balance",
      header: () => <div className="text-right">Outstanding</div>,
      cell: ({ row }) => {
        const balance = row.original.total_amount - row.original.amount_paid;
        const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: row.original.currency_code }).format(balance);
        return <div className="text-right font-mono text-xs text-red-600">{formatted}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bill = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Control Panel</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { setSelectedBill(bill); setPaymentModalOpen(true); }} disabled={bill.status === 'paid'}>
                  <DollarSign className="mr-2 h-4 w-4 text-green-600" /> Record Payment
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <History className="mr-2 h-4 w-4" /> View Audit Trail
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Void Transaction
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: bills || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="w-full space-y-4 relative">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter by vendor..."
          value={(table.getColumn("vendor_name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("vendor_name")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setCreateModalOpen(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> New Vendor Bill
        </Button>
      </div>
      
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={columns.length} className="h-48 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />Syncing Ledger...</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="transition-colors hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center italic">No records found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- ENTERPRISE FLOATING BATCH ACTION BAR --- */}
      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-bold">{selectedCount} Bills Selected</span>
            </div>
            <div className="flex items-center gap-3">
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-slate-800 hover:text-green-400"
                    onClick={() => {
                        const ids = table.getSelectedRowModel().rows.map(r => r.original.id);
                        bulkApproveMutation.mutate({ billIds: ids, businessId });
                    }}
                    disabled={bulkApproveMutation.isPending}
                >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Authorize Batch
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Batch Payment
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setRowSelection({})} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
      )}

      <PaymentDialog 
        bill={selectedBill} 
        businessId={businessId}
        isOpen={paymentModalOpen} 
        onClose={() => { setPaymentModalOpen(false); setSelectedBill(null); }} 
      />

      <CreateBillModal 
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        businessId={businessId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['bills', businessId] })}
      />
    </div>
  );
}