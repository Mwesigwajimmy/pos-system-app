'use client';

import React, { useTransition } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { completeOffboardingStepAction } from "@/lib/hr/actions/offboarding";

export interface OffboardingStep {
  id: string;
  employee: string;
  status: "step complete" | "pending" | "in review";
  step: string;
  responsible: string;
  due: string;
  completedAt?: string;
  entity: string;
  country: string;
}

interface OffboardingPortalProps {
    initialSteps: OffboardingStep[];
}

export default function OffboardingPortal({ initialSteps }: OffboardingPortalProps) {
  const [isPending, startTransition] = useTransition();

  const handleComplete = (id: string) => {
    startTransition(async () => {
        await completeOffboardingStepAction(id);
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Offboarding Portal</CardTitle>
        <CardDescription>
          Manage employee exit procedures, asset recovery, and compliance checklists.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <ScrollArea className="h-[600px] border rounded-md">
              <Table>
                <TableHeader className="bg-slate-100 sticky top-0">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Task / Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsible Role</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialSteps.length === 0
                    ? <TableRow><TableCell colSpan={8} className="text-center p-8 text-muted-foreground">No pending offboarding tasks.</TableCell></TableRow>
                    : initialSteps.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.employee}</TableCell>
                          <TableCell>{row.step}</TableCell>
                          <TableCell>
                            {row.status === "step complete"
                              ? <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Complete</span>
                              : row.status === "in review"
                                ? <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1"><AlertCircle className="w-3 h-3"/> Review</span>
                                : <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">Pending</span>
                            }
                          </TableCell>
                          <TableCell>{row.responsible}</TableCell>
                          <TableCell className={new Date(row.due) < new Date() && row.status !== 'step complete' ? "text-red-600 font-bold" : ""}>
                            {row.due}
                          </TableCell>
                          <TableCell>{row.completedAt ? new Date(row.completedAt).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{row.entity} <span className="text-xs text-muted-foreground">({row.country})</span></TableCell>
                          <TableCell className="text-right">
                            {row.status !== "step complete" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={isPending}
                                onClick={() => handleComplete(row.id)}
                              >
                                {isPending ? <Loader2 className="w-3 h-3 animate-spin"/> : "Mark Done"}
                              </Button>
                            )}
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