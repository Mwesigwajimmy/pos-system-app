'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2 } from "lucide-react";
import { addBenefitAction } from "@/lib/hr/actions/benefits";
import { useFormStatus } from "react-dom";

export interface BenefitEntry {
  id: string;
  benefit: string;
  coverage: string;
  availableTo: string;
  entity: string;
  country: string;
  type: "pension" | "insurance" | "allowance" | "other";
  status: "offered" | "ended";
}

interface BenefitsManagerProps {
    initialBenefits: BenefitEntry[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
    </Button>
  );
}

export default function BenefitsManager({ initialBenefits }: BenefitsManagerProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Benefits Governance</CardTitle>
        <CardDescription>
          Administer pension schemes, insurance policies, and allowances globally.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={addBenefitAction} className="flex gap-2 mb-4 flex-wrap p-3 bg-slate-50 border rounded-lg items-end">
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase">Benefit Name</label>
             <Input required name="benefit" className="w-40 bg-white" placeholder="e.g. Health Insurance" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase">Coverage / Details</label>
             <Input required name="coverage" className="min-w-[200px] bg-white" placeholder="Description of coverage" />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase">Eligibility</label>
             <Input required name="availableTo" className="w-40 bg-white" placeholder="e.g. Full-time Staff" />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
             <select name="type" className="h-10 border rounded px-2 bg-white text-sm w-32">
                <option value="pension">Pension</option>
                <option value="insurance">Insurance</option>
                <option value="allowance">Allowance</option>
                <option value="other">Other</option>
             </select>
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase">Entity</label>
             <Input name="entity" className="w-24 bg-white" placeholder="All" />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase">Country</label>
             <Input name="country" className="w-20 bg-white" placeholder="Code" />
          </div>
          <div className="pb-1">
             <SubmitButton />
          </div>
        </form>

        <ScrollArea className="h-[450px] border rounded-md">
            <Table>
            <TableHeader className="bg-slate-100 sticky top-0">
                <TableRow>
                <TableHead>Benefit</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {initialBenefits.length === 0
                ? <TableRow><TableCell colSpan={7} className="text-center p-8 text-muted-foreground">No benefits configured.</TableCell></TableRow>
                : initialBenefits.map(b => (
                    <TableRow key={b.id}>
                        <TableCell className="font-semibold">{b.benefit}</TableCell>
                        <TableCell className="text-sm text-slate-600">{b.coverage}</TableCell>
                        <TableCell className="text-sm">{b.availableTo}</TableCell>
                        <TableCell className="capitalize text-sm"><span className="bg-slate-100 px-2 py-1 rounded">{b.type}</span></TableCell>
                        <TableCell>{b.entity}</TableCell>
                        <TableCell>{b.country}</TableCell>
                        <TableCell>
                        {b.status === "offered"
                            ? <span className="text-emerald-700 text-xs font-bold uppercase border border-emerald-200 bg-emerald-50 px-2 py-1 rounded">Active</span>
                            : <span className="text-red-700 text-xs font-bold uppercase border border-red-200 bg-red-50 px-2 py-1 rounded">Ended</span>}
                        </TableCell>
                    </TableRow>
                    ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}