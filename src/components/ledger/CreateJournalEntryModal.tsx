"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  PlusCircle, Trash2, BookOpen, ShieldCheck, 
  AlertTriangle, Loader2, Landmark 
} from 'lucide-react';
import { submitJournalEntry } from "@/lib/actions/journal"; // The enterprise action
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface JournalLine {
  id: string; 
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

interface Props {
  accounts: any[];
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateJournalEntryModal({ accounts, businessId, isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // Enterprise default: Start with a balanced pair
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountId: '', description: '', debit: 0, credit: 0 },
  ]);

  // 1. Double-Entry Validation Logic
  const totals = useMemo(() => {
    const dr = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const cr = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return { debit: dr, credit: cr, diff: dr - cr };
  }, [lines]);

  const isBalanced = Math.abs(totals.diff) < 0.01 && totals.debit > 0;

  // 2. Line Modification Engine
  const updateLine = (idx: number, field: keyof JournalLine, val: any) => {
    const newLines = [...lines];
    const line = newLines[idx];

    if (field === 'debit' && val > 0) line.credit = 0;
    if (field === 'credit' && val > 0) line.debit = 0;
    
    (line as any)[field] = val;
    setLines(newLines);
  };

  // 3. Enterprise Submission Handshake
  const handleSubmit = () => {
    if (!isBalanced) return;

    startTransition(async () => {
      try {
        const result = await submitJournalEntry({
          businessId,
          date,
          description,
          reference,
          lines: lines.map(l => ({
            account_id: l.accountId,
            description: l.description || description,
            debit: l.debit,
            credit: l.credit
          }))
        });

        if (result.success) {
          toast.success("Journal Entry Posted Successfully");
          onClose();
          resetForm();
        } else {
          toast.error(result.message);
        }
      } catch (err) {
        toast.error("Critical Ledger Connection Error");
      }
    });
  };

  const resetForm = () => {
    setDescription('');
    setReference('');
    setLines([
      { id: '1', accountId: '', description: '', debit: 0, credit: 0 },
      { id: '2', accountId: '', description: '', debit: 0, credit: 0 },
    ]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl border-t-8 border-t-blue-600 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Landmark className="w-6 h-6 text-blue-600" />
            Record General Journal Entry
          </DialogTitle>
          <DialogDescription>
            Authorized ledger modification. Every entry must be balanced according to GAAP standards.
          </DialogDescription>
        </DialogHeader>
        
        {/* Header Metadata */}
        <div className="grid grid-cols-3 gap-6 py-6 bg-slate-50 border rounded-xl px-4">
            <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Posting Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Document Reference</Label>
                <Input placeholder="JE-2024-XXXX" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Master Narrative</Label>
                <Input placeholder="Reason for entry..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white" />
            </div>
        </div>

        {/* Lines Entry Table */}
        <div className="space-y-3 mt-4">
            <div className="grid grid-cols-12 gap-4 px-2 text-[10px] font-black uppercase text-slate-400">
                <div className="col-span-4">Account Account</div>
                <div className="col-span-3">Line Memo</div>
                <div className="col-span-2 text-right">Debit</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-1"></div>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                {lines.map((line, index) => (
                    <div key={line.id} className="grid grid-cols-12 gap-3 items-center group">
                        <div className="col-span-4">
                            <Select value={line.accountId} onValueChange={(v) => updateLine(index, 'accountId', v)}>
                                <SelectTrigger className="bg-white shadow-sm border-slate-200">
                                    <SelectValue placeholder="Search COA..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            <span className="font-mono text-xs text-muted-foreground mr-2">[{acc.code}]</span>
                                            {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-3">
                            <Input 
                                placeholder={description || "Line detail..."} 
                                value={line.description} 
                                onChange={(e) => updateLine(index, 'description', e.target.value)} 
                                className="bg-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <Input 
                                type="number" 
                                step="0.01"
                                className="text-right font-mono font-bold text-blue-700 bg-white" 
                                value={line.debit || ''} 
                                onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value))} 
                            />
                        </div>
                        <div className="col-span-2">
                            <Input 
                                type="number" 
                                step="0.01"
                                className="text-right font-mono font-bold text-red-700 bg-white" 
                                value={line.credit || ''} 
                                onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value))} 
                            />
                        </div>
                        <div className="col-span-1 text-right">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setLines(lines.filter((_, i) => i !== index))} 
                                disabled={lines.length <= 2}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLines([...lines, { id: Math.random().toString(), accountId: '', description: '', debit: 0, credit: 0 }])} 
                className="mt-2 border-dashed"
             >
                <PlusCircle className="mr-2 h-4 w-4"/> Add Journal Line
             </Button>
        </div>
        
        {/* The Enterprise Summary & Balance Bar */}
        <div className="flex justify-between items-center p-6 bg-slate-900 rounded-2xl mt-6 shadow-xl border border-slate-700">
            <div className="flex gap-12 text-white">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-500">Total Debits</p>
                    <p className="font-mono text-xl font-bold">{totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-500">Total Credits</p>
                    <p className="font-mono text-xl font-bold">{totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all duration-300",
                isBalanced ? "bg-green-500/10 border-green-500 text-green-400" : "bg-red-500/10 border-red-500 text-red-400 animate-pulse"
            )}>
                {isBalanced ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest">{isBalanced ? "Balanced" : "Out of Balance"}</span>
                    {!isBalanced && <span className="text-[10px] font-mono">Offset: {totals.diff.toFixed(2)}</span>}
                </div>
            </div>
        </div>

        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isBalanced || isPending}
            className="px-10 bg-blue-700 hover:bg-blue-800 shadow-lg"
          >
            {isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting to Ledger...
                </>
            ) : (
                "Post Journal Entry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}