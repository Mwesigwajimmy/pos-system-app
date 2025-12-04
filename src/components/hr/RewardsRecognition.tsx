'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Gift, Plus, Loader2 } from "lucide-react";
import { addRewardAction } from "@/lib/hr/actions/rewards"; // Import the real action
import { useFormStatus } from "react-dom"; // For loading state

export interface Recognition {
  id: string;
  employee: string;
  award: string;
  type: "Bonus" | "Award" | "Milestone" | "Gift";
  description: string;
  value?: number;
  entity: string;
  country: string;
  date: string;
  currency?: string;
}

interface RewardsRecognitionProps {
    initialRewards: Recognition[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
    </Button>
  );
}

export default function RewardsRecognition({ initialRewards }: RewardsRecognitionProps) {
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Rewards & Recognition</CardTitle>
        <CardDescription>
          Manage performance awards, bonuses, and recognition across all entities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Real Form connected to Server Action */}
        <form action={addRewardAction} className="flex gap-2 mb-4 flex-wrap p-4 bg-slate-50 border rounded-lg">
          <Input required name="employee" className="w-32 bg-white" placeholder="Employee Name" />
          <Input required name="award" className="w-32 bg-white" placeholder="Award Title" />
          <select name="type" className="border rounded px-2 h-10 bg-white text-sm" defaultValue="Bonus">
            <option value="Bonus">Bonus</option>
            <option value="Award">Award</option>
            <option value="Milestone">Milestone</option>
            <option value="Gift">Gift</option>
          </select>
          <Input name="description" className="flex-1 min-w-[200px] bg-white" placeholder="Description / Reason" />
          <div className="flex gap-1">
             <Input name="currency" className="w-16 bg-white" placeholder="CUR" defaultValue="UGX" />
             <Input name="value" type="number" step="0.01" className="w-24 bg-white" placeholder="Value" />
          </div>
          <Input name="entity" className="w-24 bg-white" placeholder="Entity" />
          <Input name="country" className="w-24 bg-white" placeholder="Country" defaultValue="UG" />
          <SubmitButton />
        </form>
        
        <ScrollArea className="h-[500px] border rounded-md">
            <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Award</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {initialRewards.length === 0
                ? <TableRow><TableCell colSpan={8} className="text-center p-8 text-muted-foreground">No rewards records found.</TableCell></TableRow>
                : initialRewards.map(r => (
                    <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employee}</TableCell>
                        <TableCell>{r.award}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {r.type === "Bonus" && <Star className="text-amber-500 w-4 h-4"/>}
                                {r.type === "Gift" && <Gift className="text-emerald-500 w-4 h-4"/>}
                                <span>{r.type}</span>
                            </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={r.description}>{r.description}</TableCell>
                        <TableCell className="text-right font-mono">
                            {r.value ? `${r.currency || 'UGX'} ${r.value.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>{r.entity}</TableCell>
                        <TableCell>{r.country}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                    ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}