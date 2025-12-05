'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, AlertTriangle, Search, Lock } from 'lucide-react';

// --- Types ---
export interface Account {
  id: string;
  business_id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subtype: 'Bank' | 'Cash' | 'Receivable' | 'Payable' | 'Inventory' | 'Other';
  currency: string;
  balance: number;
  is_active: boolean;
  is_system: boolean; // Prevents deletion of core accounts like AR/AP
}

// --- API Functions ---
const fetchAccounts = async (businessId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounting_accounts')
    .select('*')
    .eq('business_id', businessId)
    .order('code', { ascending: true });
    
  if (error) throw new Error(error.message);
  return data as Account[];
};

const upsertAccount = async (accountData: Partial<Account>) => {
  const supabase = createClient();
  // Using standard Supabase upsert
  const { error } = await supabase
    .from('accounting_accounts')
    .upsert({
      id: accountData.id,
      business_id: accountData.business_id,
      code: accountData.code,
      name: accountData.name,
      type: accountData.type,
      subtype: accountData.subtype, // Critical for Banking module
      currency: accountData.currency,
      is_active: true
    })
    .select();

  if (error) throw new Error(error.message);
};

const deleteAccount = async (accountId: string) => {
  const supabase = createClient();
  const { error } = await supabase
    .from('accounting_accounts')
    .delete()
    .eq('id', accountId);
    
  if (error) throw new Error(error.message);
};

// --- Sub-Component: Account Form ---
const AccountFormDialog = ({
  isOpen,
  onClose,
  account,
  businessId
}: {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
  businessId: string;
}) => {
  const queryClient = useQueryClient();
  
  // State
  const [code, setCode] = useState(account?.code || '');
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<string>(account?.type || 'Asset');
  const [subtype, setSubtype] = useState<string>(account?.subtype || 'Other');
  const [currency, setCurrency] = useState(account?.currency || 'USD');

  const { mutate, isPending } = useMutation({
    mutationFn: upsertAccount,
    onSuccess: () => {
      toast.success(`Account ${account ? 'updated' : 'created'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      id: account?.id,
      business_id: businessId,
      code,
      name,
      type: type as Account['type'],
      subtype: subtype as Account['subtype'],
      currency
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>{account ? 'Edit Account' : 'Create New Account'}</DialogTitle>
                <DialogDescription>
                    {account ? 'Modify account details.' : 'Define a new general ledger account.'}
                </DialogDescription>
            </DialogHeader>
            <form id="accountForm" onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1 space-y-2">
                        <Label htmlFor="code">Code</Label>
                        <Input id="code" placeholder="1001" value={code} onChange={(e) => setCode(e.target.value)} required />
                    </div>
                    <div className="col-span-3 space-y-2">
                        <Label htmlFor="name">Account Name</Label>
                        <Input id="name" placeholder="e.g. Chase Operating" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select onValueChange={setType} value={type} disabled={!!account?.is_system}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asset">Asset</SelectItem>
                                <SelectItem value="Liability">Liability</SelectItem>
                                <SelectItem value="Equity">Equity</SelectItem>
                                <SelectItem value="Revenue">Revenue</SelectItem>
                                <SelectItem value="Expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label>Sub-Type (Critical)</Label>
                        <Select onValueChange={setSubtype} value={subtype} disabled={!!account?.is_system}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Bank">Bank (Connects to Banking)</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Receivable">Receivable (Connects to Invoices)</SelectItem>
                                <SelectItem value="Payable">Payable (Connects to Bills)</SelectItem>
                                <SelectItem value="Inventory">Inventory</SelectItem>
                                <SelectItem value="Other">Other / General</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select onValueChange={setCurrency} value={currency} disabled={!!account?.id}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="UGX">UGX - Uganda Shilling</SelectItem>
                            <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                        </SelectContent>
                    </Select>
                    {account?.id && <p className="text-xs text-muted-foreground">Currency cannot be changed once transactions exist.</p>}
                </div>
            </form>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" form="accountForm" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Account
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  )
};

// --- Main Component ---
export default function ChartOfAccounts({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [action, setAction] = useState<{ type: 'add' | 'edit' | 'delete', data?: Account } | null>(null);
  
  const { data: accounts, isLoading, isError, error } = useQuery({ 
    queryKey: ['accounts', businessId], 
    queryFn: () => fetchAccounts(businessId)
  });

  const { mutate: performDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
        toast.success("Account deleted successfully");
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setAction(null);
    },
    onError: (error) => toast.error(`Cannot delete: ${error.message}`),
  });

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(acc => 
        acc.name.toLowerCase().includes(filter.toLowerCase()) || 
        acc.code.includes(filter)
    );
  }, [accounts, filter]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or code..." 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)} 
                        className="pl-8" 
                    />
                </div>
            </div>
            <Button onClick={() => setAction({ type: 'add' })}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                New Account
            </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sub-Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                   <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
                )}
                {isError && (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-destructive"><AlertTriangle className="inline-block mr-2"/> {error.message}</TableCell></TableRow>
                )}
                {filteredAccounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono font-medium text-xs">{acc.code}</TableCell>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className={
                            acc.type === 'Asset' ? 'bg-blue-100 text-blue-800' :
                            acc.type === 'Liability' ? 'bg-orange-100 text-orange-800' :
                            acc.type === 'Revenue' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'
                        }>
                            {acc.type}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{acc.subtype}</TableCell>
                    <TableCell className="text-xs">{acc.currency}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency }).format(acc.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setAction({ type: 'edit', data: acc })}>
                                    <Edit className="mr-2 h-4 w-4"/> Edit
                                </DropdownMenuItem>
                                {acc.is_system || acc.balance !== 0 ? (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        <Lock className="mr-2 h-4 w-4"/> Cannot Delete
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem className="text-destructive" onClick={() => setAction({ type: 'delete', data: acc })}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(action?.type === 'add' || action?.type === 'edit') && (
        <AccountFormDialog 
            isOpen={true}
            onClose={() => setAction(null)}
            account={action.data}
            businessId={businessId}
        />
      )}

      <AlertDialog open={action?.type === 'delete'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete <strong>{action?.data?.code} - {action?.data?.name}</strong>.
                    <br/><br/>
                    Note: You cannot delete an account if it has existing transactions or is a System account.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => action?.data?.id && performDelete(action.data.id)} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Confirm Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}