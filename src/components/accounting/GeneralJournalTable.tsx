"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from "date-fns";
import { toast } from 'sonner';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Search, Plus, Trash2 
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

// --- Types ---

interface JournalLine {
  id?: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  account?: { name: string; code: string };
}

interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  status: string;
  lines: JournalLine[];
}

interface Props {
  initialEntries: JournalEntry[];
  businessId: string;
  userId: string;
}

// --- API Functions ---

const fetchEntries = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_journal_entries')
        .select(`*, lines: accounting_journal_lines(id, description, debit, credit, account:accounting_accounts(name, code))`)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as JournalEntry[];
};

const fetchAccounts = async (businessId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('accounting_accounts')
        .select('id, name, code, type')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('code', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
};

const postJournalEntry = async (payload: { 
    business_id: string; 
    date: string; 
    description: string; 
    reference: string; 
    lines: any[]; 
    user_id: string;
}) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_journal_entry', {
        p_business_id: payload.business_id,
        p_date: payload.date,
        p_description: payload.description,
        p_reference: payload.reference,
        p_lines: payload.lines,
        p_user_id: payload.user_id
    });
    if (error) throw new Error(error.message);
    return data;
};

// --- Sub-Component: Create Entry Dialog ---

const CreateEntryDialog = ({ businessId, userId, isOpen, onClose }: { businessId: string, userId: string, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    
    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    
    // Lines State - Start with 2 empty lines for convenience
    const [lines, setLines] = useState<JournalLine[]>([
        { account_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', description: '', debit: 0, credit: 0 }
    ]);

    const { data: accounts } = useQuery({
        queryKey: ['accounts_list', businessId],
        queryFn: () => fetchAccounts(businessId),
        enabled: isOpen
    });

    // Calculations
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

    const updateLine = (index: number, field: keyof JournalLine, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { account_id: '', description: '', debit: 0, credit: 0 }]);
    };

    const removeLine = (index: number) => {
        if (lines.length > 2) {
            const newLines = lines.filter((_, i) => i !== index);
            setLines(newLines);
        }
    };

    const mutation = useMutation({
        mutationFn: postJournalEntry,
        onSuccess: () => {
            toast.success("Journal Entry Posted Successfully");
            queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
            onClose();
            // Reset form
            setLines([{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }]);
            setDescription('');
            setReference('');
        },
        onError: (err) => toast.error(err.message)
    });

    const handleSubmit = () => {
        if (!isBalanced) return;
        
        mutation.mutate({
            business_id: businessId,
            date,
            description,
            reference,
            lines: lines.map(l => ({
                account_id: l.account_id,
                description: l.description || description, // Fallback to header desc
                debit: Number(l.debit),
                credit: Number(l.credit)
            })),
            user_id: userId
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Journal Entry</DialogTitle>
                    <DialogDescription>Create a double-entry bookkeeping record.</DialogDescription>
                </DialogHeader>
                
                {/* Header Fields */}
                <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Reference</Label>
                        <Input placeholder="e.g. ADJ-001" value={reference} onChange={e => setReference(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="Why are you making this entry?" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                {/* Lines Table */}
                <div className="border rounded-md p-2 bg-muted/20">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Account</TableHead>
                                <TableHead>Line Description</TableHead>
                                <TableHead className="w-[120px]">Debit</TableHead>
                                <TableHead className="w-[120px]">Credit</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.map((line, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <Select value={line.account_id} onValueChange={(val) => updateLine(idx, 'account_id', val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts?.map((acc: any) => (
                                                    <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            value={line.description} 
                                            onChange={e => updateLine(idx, 'description', e.target.value)} 
                                            placeholder={description}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            min="0"
                                            value={line.debit || ''} 
                                            onChange={e => {
                                                updateLine(idx, 'debit', e.target.value);
                                                updateLine(idx, 'credit', 0); // Mutually exclusive
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            min="0"
                                            value={line.credit || ''} 
                                            onChange={e => {
                                                updateLine(idx, 'credit', e.target.value);
                                                updateLine(idx, 'debit', 0); // Mutually exclusive
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="mt-2">
                        <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-2"/> Add Line</Button>
                    </div>
                </div>

                {/* Totals & Validation */}
                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                    <div className="text-right font-bold">Total Debit: {totalDebit.toFixed(2)}</div>
                    <div className="text-right font-bold">Total Credit: {totalCredit.toFixed(2)}</div>
                    <div className={`text-right font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        Difference: {difference.toFixed(2)}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!isBalanced || mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---

export default function GeneralJournalTable({ initialEntries, businessId, userId }: Props) {
  const [filter, setFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal_entries', businessId],
    queryFn: () => fetchEntries(businessId),
    initialData: initialEntries
  });

  // Flat map for searchability, but we render by Entry
  const filteredEntries = entries.filter(e => 
    e.description?.toLowerCase().includes(filter.toLowerCase()) || 
    e.reference?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search entries..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8" 
                />
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Journal Entry
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Journal History</CardTitle>
                <CardDescription>All posted ledger entries.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead className="w-[120px]">Reference</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Accounts Impacted</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell>
                                </TableRow>
                            ) : filteredEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">No entries found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredEntries.map((entry) => {
                                    // Calculate total for display
                                    const total = entry.lines.reduce((sum, l) => sum + l.debit, 0);
                                    
                                    return (
                                        <TableRow key={entry.id} className="group cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium align-top py-4">
                                                {format(new Date(entry.date), 'yyyy-MM-dd')}
                                            </TableCell>
                                            <TableCell className="align-top py-4">{entry.reference || '-'}</TableCell>
                                            <TableCell className="align-top py-4">{entry.description}</TableCell>
                                            <TableCell className="py-2">
                                                {/* Mini Table for Lines */}
                                                <div className="text-sm space-y-1">
                                                    {entry.lines.map((line, i) => (
                                                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                                                            <span>{line.account?.code} - {line.account?.name}</span>
                                                            <div className="space-x-4">
                                                                {line.debit > 0 && <span className="text-foreground">{line.debit.toFixed(2)} Dr</span>}
                                                                {line.credit > 0 && <span>{line.credit.toFixed(2)} Cr</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold align-top py-4">
                                                {total.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="align-top py-4">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Posted</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>

        <CreateEntryDialog 
            businessId={businessId} 
            userId={userId}
            isOpen={isCreateOpen} 
            onClose={() => setIsCreateOpen(false)} 
        />
    </div>
  );
}