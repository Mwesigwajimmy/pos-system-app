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
import { submitJournalEntry } from "@/lib/actions/journal";
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

  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountId: '', description: '', debit: 0, credit: 0 },
  ]);

  const totals = useMemo(() => {
    const dr = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const cr = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return { debit: dr, credit: cr, diff: dr - cr };
  }, [lines]);

  const isBalanced = Math.abs(totals.diff) < 0.01 && totals.debit > 0;

  const updateLine = (idx: number, field: keyof JournalLine, val: any) => {
    const newLines = [...lines];
    const line = newLines[idx];

    if (field === 'debit' && val > 0) line.credit = 0;
    if (field === 'credit' && val > 0) line.debit = 0;

    (line as any)[field] = val;
    setLines(newLines);
  };

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
          toast.success("Journal entry posted");
          onClose();
          resetForm();
        } else {
          toast.error(result.message);
        }
      } catch (err) {
        toast.error("Could not reach the ledger service");
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
      <DialogContent className="max-w-4xl border-slate-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BookOpen className="w-5 h-5 text-slate-700" />
            New general journal entry
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Every entry must balance before it can be posted.
          </DialogDescription>
        </DialogHeader>

        {/* Header metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 bg-slate-50 border border-slate-200 rounded-lg px-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Posting date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white border-slate-200 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Reference</Label>
            <Input placeholder="JE-2024-XXXX" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-white border-slate-200 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Description</Label>
            <Input placeholder="Reason for entry..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white border-slate-200 h-10" />
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-2 mt-2">
          <div className="grid grid-cols-12 gap-3 px-1 text-xs font-medium text-slate-500">
            <div className="col-span-4">Account</div>
            <div className="col-span-3">Line description</div>
            <div className="col-span-2 text-right">Debit</div>
            <div className="col-span-2 text-right">Credit</div>
            <div className="col-span-1"></div>
          </div>

          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
            {lines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-12 gap-3 items-center group">
                <div className="col-span-4">
                  <Select value={line.accountId} onValueChange={(v) => updateLine(index, 'accountId', v)}>
                    <SelectTrigger className="bg-white border-slate-200 h-10">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="font-mono text-xs text-slate-400 mr-2">[{acc.code}]</span>
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
                    className="bg-white border-slate-200 h-10"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right font-mono bg-white border-slate-200 h-10"
                    value={line.debit || ''}
                    onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right font-mono bg-white border-slate-200 h-10"
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines([...lines, { id: Math.random().toString(), accountId: '', description: '', debit: 0, credit: 0 }])}
            className="mt-2 border-dashed border-slate-300 text-slate-600"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add line
          </Button>
        </div>

        {/* Balance summary */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 p-5 bg-slate-900 rounded-lg mt-6">
          <div className="flex gap-10 text-white">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Total debits</p>
              <p className="font-mono text-lg font-semibold">{totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Total credits</p>
              <p className="font-mono text-lg font-semibold">{totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-md border text-sm font-medium",
            isBalanced ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
          )}>
            {isBalanced ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <div className="flex flex-col">
              <span>{isBalanced ? "Balanced" : "Out of balance"}</span>
              {!isBalanced && <span className="text-xs font-mono text-red-300">Offset: {totals.diff.toFixed(2)}</span>}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="border-slate-200">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isBalanced || isPending}
            className="px-8 bg-slate-900 hover:bg-slate-800 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post journal entry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}