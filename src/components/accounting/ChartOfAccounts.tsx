'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Account } from '@/types/dashboard'; // Using the type from our master types file
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge'; // <-- FIX: Added this import
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// --- API Functions ---
const supabase = createClient();

async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('type').order('name');
  if (error) throw new Error(error.message);
  return data;
}

// Enterprise Practice: Use RPC for secure and centralized data mutations
async function upsertAccount(accountData: Partial<Account>) {
  const { error } = await supabase.rpc('upsert_account', {
    p_id: accountData.id,
    p_name: accountData.name,
    p_type: accountData.type,
  });
  if (error) throw new Error(error.message);
}

async function deleteAccount(accountId: number) {
  const { error } = await supabase.rpc('delete_account', { p_id: accountId });
  if (error) throw new Error(error.message);
}


// --- Account Form Component ---
const AccountFormDialog = ({
  isOpen,
  onClose,
  account,
}: {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || '');

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
    if (!name || !type) return toast.error('Name and Type are required.');
    mutate({ id: account?.id, name, type: type as Account['type'] });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{account ? 'Edit Account' : 'Create New Account'}</DialogTitle>
                <DialogDescription>
                    Define a new account for your general ledger.
                </DialogDescription>
            </DialogHeader>
            <form id="accountForm" onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Account Type</Label>
                    <Select onValueChange={setType} value={type} required>
                        <SelectTrigger id="type"><SelectValue placeholder="Select a type..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ASSET">Asset</SelectItem>
                            <SelectItem value="LIABILITY">Liability</SelectItem>
                            <SelectItem value="EQUITY">Equity</SelectItem>
                            <SelectItem value="REVENUE">Revenue</SelectItem>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                        </SelectContent>
                    </Select>
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

// --- Main Chart of Accounts Component ---
export default function ChartOfAccounts() {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<{ type: 'add' | 'edit' | 'delete', data?: Account } | null>(null);
  
  const { data: accounts, isLoading, isError, error } = useQuery({ 
    queryKey: ['accounts'], 
    queryFn: fetchAccounts 
  });

  const { mutate: performDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
        toast.success("Account deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        setAction(null);
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>The complete list of all financial accounts for your business.</CardDescription>
            </div>
            <Button onClick={() => setAction({ type: 'add' })}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add Account
            </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                )}
                {isError && (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center text-destructive"><AlertTriangle className="inline-block mr-2"/> {error.message}</TableCell></TableRow>
                )}
                {accounts?.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{acc.type.toLowerCase()}</Badge></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setAction({ type: 'edit', data: acc })}>
                                    <Edit className="mr-2 h-4 w-4"/> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setAction({ type: 'delete', data: acc })}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                </DropdownMenuItem>
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
        />
      )}

      <AlertDialog open={action?.type === 'delete'} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the account "{action?.data?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => performDelete(action!.data!.id)} disabled={isDeleting}>
                    {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...</> : 'Continue'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}