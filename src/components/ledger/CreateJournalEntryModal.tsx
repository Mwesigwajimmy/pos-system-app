"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2 } from 'lucide-react';
import { createJournalEntry } from "@/app/actions/ledger";
import { Account } from "@/lib/types"; // Import from the centralized types file
import { formatCurrency } from "@/lib/utils";

// Re-export the Account type if needed elsewhere, though importing from lib/types is better
export type { Account };

interface JournalLine {
  id: number; // For React key prop
  accountId: string;
  debit: string;
  credit: string;
}

interface CreateJournalEntryModalProps {
  accounts: Account[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function CreateJournalEntryModal({ accounts, isOpen, setIsOpen }: CreateJournalEntryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: 1, accountId: '', debit: '', credit: '' },
    { id: 2, accountId: '', debit: '', credit: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const handleLineChange = (index: number, field: keyof JournalLine, value: string) => {
    const newLines = [...lines];
    const line = newLines[index];
    
    // Prevent entering both debit and credit on the same line
    if (field === 'debit' && value) line.credit = '';
    if (field === 'credit' && value) line.debit = '';
    
    (line[field] as string) = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), accountId: '', debit: '', credit: '' }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };
  
  const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const isBalanced = totalDebits === totalCredits && totalDebits > 0;

  const handleSubmit = async () => {
    setError(null);
    if (!isBalanced) {
      setError("Total debits must equal total credits and cannot be zero.");
      return;
    }

    startTransition(async () => {
      const result = await createJournalEntry({
        date,
        description,
        lines: lines.map(l => ({
            accountId: l.accountId,
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0)
        }))
      });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        // Reset form for next time
        setDescription('');
        setLines([
            { id: 1, accountId: '', debit: '', credit: '' },
            { id: 2, accountId: '', debit: '', credit: '' },
        ]);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[850px]">
        <DialogHeader>
          <DialogTitle>Create New Journal Entry</DialogTitle>
          <DialogDescription>
            Record a transaction. Ensure that total debits equal total credits.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex gap-4">
                <div className="grid w-1/3 items-center gap-1.5">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="grid w-2/3 items-center gap-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Monthly office rent" />
                </div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center font-medium text-sm text-muted-foreground px-2">
                <div className="col-span-5">Account</div>
                <div className="col-span-3 text-right">Debit</div>
                <div className="col-span-3 text-right">Credit</div>
                <div className="col-span-1"></div>
            </div>

            {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                        <Select value={line.accountId} onValueChange={(value) => handleLineChange(index, 'accountId', value)}>
                            <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-3">
                        <Input type="number" placeholder="0.00" className="text-right" value={line.debit} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} />
                    </div>
                    <div className="col-span-3">
                        <Input type="number" placeholder="0.00" className="text-right" value={line.credit} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} />
                    </div>
                    <div className="col-span-1 text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
            ))}
             <Button variant="outline" size="sm" onClick={addLine} className="mt-2"><PlusCircle className="mr-2 h-4 w-4"/>Add Line</Button>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm">
                <div className="font-bold">Totals</div>
                <div>Debits: <span className="font-mono">{formatCurrency(totalDebits, 'USD')}</span></div>
                <div>Credits: <span className="font-mono">{formatCurrency(totalCredits, 'USD')}</span></div>
            </div>
            <div className={`font-bold text-lg p-2 rounded-md ${isBalanced ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                {isBalanced ? "Balanced" : "Unbalanced"}
            </div>
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isBalanced || isPending}>
            {isPending ? "Saving..." : "Save Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}