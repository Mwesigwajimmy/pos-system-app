'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Phone, CheckCircle2, Clock, AlertTriangle, MessageSquare, Calendar, MoreHorizontal, Filter 
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// --- Enterprise Types ---

interface ArrearsRecord { 
    id: string; // Loan Application ID
    application_no: string;
    borrower: {
        id: string;
        full_name: string;
        phone_number: string;
    };
    product_name: string;
    amount_overdue: number;
    days_past_due: number; // Critical KPI
    last_payment_date: string | null;
    status: 'In Arrears' | 'Defaulted';
    last_interaction?: {
        outcome: string;
        created_at: string;
    };
}

// Validation for Logging Call
const interactionSchema = z.object({
    outcome: z.enum(['PROMISE_TO_PAY', 'NO_ANSWER', 'BUSY', 'REFUSAL', 'WRONG_NUMBER']),
    notes: z.string().min(5, "Notes are required (min 5 chars)"),
    promise_date: z.string().optional(), // If they promise to pay
});

type InteractionFormValues = z.infer<typeof interactionSchema>;

// --- Data Fetcher ---

async function fetchCollectionsQueue(tenantId: string) {
  const db = createClient();
  
  // Real Enterprise Query:
  // 1. Filter by overdue loans
  // 2. Join borrower details
  // 3. Join last interaction to see if we already called them today
  const { data, error } = await db
    .from('loan_applications')
    .select(`
        id, application_no, status,
        borrower:profiles!inner(id, full_name, phone_number),
        product:loan_products(name),
        balances:loan_balances(amount_overdue, days_past_due, last_payment_date),
        last_interaction:collection_logs(outcome, created_at)
    `)
    .eq('business_id', tenantId)
    .in('status', ['In Arrears', 'Defaulted'])
    .gt('loan_balances.amount_overdue', 0)
    .order('loan_balances(days_past_due)', { ascending: false }) // Prioritize worst offenders
    .limit(50); // Work queue size

  if (error) throw new Error(error.message);

  // Transform data
  return data.map((item: any) => ({
      id: item.id,
      application_no: item.application_no,
      borrower: item.borrower,
      product_name: item.product?.name,
      amount_overdue: item.balances?.[0]?.amount_overdue || 0,
      days_past_due: item.balances?.[0]?.days_past_due || 0,
      last_payment_date: item.balances?.[0]?.last_payment_date,
      status: item.status,
      last_interaction: item.last_interaction?.[0] // Assuming lateral join or picking latest
  })) as ArrearsRecord[];
}

async function logCollectionActivity(
    { loanId, tenantId, data }: { loanId: string, tenantId: string, data: InteractionFormValues }
) {
    const db = createClient();
    const { error } = await db.from('collection_logs').insert({
        loan_application_id: loanId,
        tenant_id: tenantId,
        agent_id: (await db.auth.getUser()).data.user?.id,
        outcome: data.outcome,
        notes: data.notes,
        promise_to_pay_date: data.promise_date || null,
        created_at: new Date().toISOString()
    });
    if (error) throw new Error(error.message);
}

// --- Component ---

export function CollectionsManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [selectedLoan, setSelectedLoan] = React.useState<ArrearsRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Query
  const { data: queue, isLoading } = useQuery({ 
      queryKey: ['collections-queue', tenantId], 
      queryFn: () => fetchCollectionsQueue(tenantId) 
  });

  // Mutation
  const mutation = useMutation({
      mutationFn: logCollectionActivity,
      onSuccess: () => {
          toast.success("Interaction logged");
          setIsDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['collections-queue', tenantId] });
      },
      onError: (err) => toast.error(err.message)
  });

  // Form
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InteractionFormValues>({
      resolver: zodResolver(interactionSchema)
  });

  const outcome = watch('outcome');

  // Open Handler
  const handleLogClick = (loan: ArrearsRecord) => {
      setSelectedLoan(loan);
      reset();
      setIsDialogOpen(true);
  };

  // Helper for DPD Badge
  const getSeverityColor = (dpd: number) => {
      if (dpd > 90) return "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"; // Critical
      if (dpd > 30) return "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"; // Watch
      return "bg-slate-100 text-slate-700 border-slate-200"; // Early
  };

  return (
    <Card className="h-full border-t-4 border-t-amber-500 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-xl flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" /> 
                    Collections Queue
                </CardTitle>
                <CardDescription>
                    {queue?.length || 0} accounts currently requiring attention
                </CardDescription>
            </div>
            <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4"/> Filter Queue
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead className="text-center">Days Past Due</TableHead>
              <TableHead className="text-right">Overdue Amt</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading queue...</TableCell></TableRow>
            ) : queue?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-green-600 font-medium">No arrears found! Good job.</TableCell></TableRow>
            ) : (
                queue?.map((row) => (
                <TableRow key={row.id} className="group hover:bg-slate-50">
                  <TableCell>
                      <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                              <AvatarFallback>{row.borrower.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                              <span className="font-semibold text-sm">{row.borrower.full_name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3"/> {row.borrower.phone_number}
                              </span>
                          </div>
                      </div>
                  </TableCell>
                  <TableCell className="text-center">
                      <Badge className={`${getSeverityColor(row.days_past_due)} border font-mono`}>
                          {row.days_past_due} Days
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(row.amount_overdue)}
                  </TableCell>
                  <TableCell>
                      {row.last_interaction ? (
                          <div className="flex flex-col text-xs">
                              <span className="font-medium">{row.last_interaction.outcome}</span>
                              <span className="text-muted-foreground">{formatDate(row.last_interaction.created_at)}</span>
                          </div>
                      ) : (
                          <span className="text-xs text-muted-foreground italic">Never contacted</span>
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button 
                            size="sm" 
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700 h-8"
                            onClick={() => handleLogClick(row)}
                        >
                            <Phone className="w-3 h-3 mr-1" /> Log Call
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/${row.borrower.phone_number.replace(/\D/g,'')}`, '_blank')}>
                                    <MessageSquare className="mr-2 h-4 w-4 text-green-600"/> WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem>View Statement</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* --- Log Interaction Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Log Interaction</DialogTitle>
                <DialogDescription>
                    Record details of call with <strong>{selectedLoan?.borrower.full_name}</strong> regarding Loan #{selectedLoan?.application_no}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit((data) => mutation.mutate({ 
                loanId: selectedLoan!.id, 
                tenantId, 
                data 
            }))} className="space-y-4">
                
                <div className="space-y-2">
                    <label className="text-sm font-medium">Outcome</label>
                    <Select onValueChange={(val) => setValue('outcome', val as any)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select outcome..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PROMISE_TO_PAY">Promise to Pay (PTP)</SelectItem>
                            <SelectItem value="NO_ANSWER">No Answer</SelectItem>
                            <SelectItem value="BUSY">Line Busy</SelectItem>
                            <SelectItem value="REFUSAL">Refused to Pay</SelectItem>
                            <SelectItem value="WRONG_NUMBER">Wrong Number</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.outcome && <p className="text-red-500 text-xs">{errors.outcome.message}</p>}
                </div>

                {outcome === 'PROMISE_TO_PAY' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-medium">Promise Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-9" {...register('promise_date')} />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea 
                        placeholder="Enter call details..." 
                        {...register('notes')} 
                    />
                    {errors.notes && <p className="text-red-500 text-xs">{errors.notes.message}</p>}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending && <Clock className="mr-2 h-4 w-4 animate-spin" />}
                        Save Record
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}