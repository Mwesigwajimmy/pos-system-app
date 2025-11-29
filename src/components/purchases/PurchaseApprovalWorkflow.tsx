'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, FileText, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

interface ApprovalStep {
  approver_name: string;
  approver_email: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  date: string | null;
  comments: string | null;
  step_order: number;
}

interface PurchaseRequestForApproval {
  id: number;
  request_number: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  entity: string;
  status: string;
  requester_name: string;
  created_at: string;
  steps: ApprovalStep[];
  is_current_approver: boolean; // Computed by backend ideally, or frontend logic
}

// --- API Logic ---

async function fetchRequestsForApproval(tenantId: string, currentUserEmail: string) {
  const supabase = createClient();
  
  // Enterprise Pattern: Use RPC to encapsulate complex join/filter logic
  // logic: SELECT * FROM purchase_requests WHERE tenant_id = X AND current_approver = Y
  const { data, error } = await supabase.rpc('get_pending_approvals', { 
    p_tenant_id: tenantId, 
    p_user_email: currentUserEmail 
  });

  if (error) {
    console.error("Fetch Error:", error);
    throw new Error(error.message);
  }
  return data as PurchaseRequestForApproval[];
}

async function processApprovalAction(
  { reqId, approve, comments, userEmail }: 
  { reqId: number; approve: boolean; comments: string; userEmail: string }
) {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('process_approval_step', {
    p_request_id: reqId,
    p_approver_email: userEmail,
    p_status: approve ? 'approved' : 'rejected',
    p_comments: comments
  });

  if (error) throw new Error(error.message);
  return data;
}

// --- Main Component ---

export default function PurchaseApprovalWorkflow({ tenant, currentUser }: { tenant: TenantContext, currentUser: string }) {
  const queryClient = useQueryClient();
  
  // State
  const [selectedReq, setSelectedReq] = useState<PurchaseRequestForApproval | null>(null);
  const [comment, setComment] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Query
  const { data: requests, isLoading, isError } = useQuery({
    queryKey: ['reqs-for-approval', tenant.tenantId, currentUser],
    queryFn: () => fetchRequestsForApproval(tenant.tenantId, currentUser),
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: processApprovalAction,
    onSuccess: () => {
      const action = selectedReq ? 'processed' : 'recorded';
      toast.success(`Request ${action} successfully.`);
      
      // FIX: New syntax for TanStack Query v5+
      queryClient.invalidateQueries({ 
        queryKey: ['reqs-for-approval', tenant.tenantId, currentUser] 
      });
      
      handleCloseDialog();
    },
    onError: (e: any) => toast.error(e.message || 'Approval action failed'),
  });

  const handleOpenReview = (req: PurchaseRequestForApproval) => {
    setSelectedReq(req);
    setComment('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedReq(null), 300); // clear after anim
  };

  const handleAction = (approve: boolean) => {
    if (!selectedReq) return;
    mutation.mutate({
      reqId: selectedReq.id,
      approve,
      comments: comment,
      userEmail: currentUser
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper for currency
  const formatMoney = (amount: number, currency: string) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  return (
    <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600"/> 
          Pending Approvals
        </CardTitle>
        <CardDescription>Review and authorize purchase requisitions assigned to you.</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-red-500">Failed to load approvals.</TableCell></TableRow>
              ) : !requests || requests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">You have no pending approvals at this time.</TableCell></TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-medium">{req.request_number}</TableCell>
                    <TableCell className="font-medium text-slate-800">{req.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                          {req.requester_name.charAt(0)}
                        </div>
                        <span className="text-sm">{req.requester_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatMoney(req.amount, req.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleOpenReview(req)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* --- Review Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedReq && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <DialogTitle>Review Request {selectedReq.request_number}</DialogTitle>
                  <Badge variant="outline" className="font-mono">{selectedReq.entity}</Badge>
                </div>
                <DialogDescription>
                  Submitted by <b>{selectedReq.requester_name}</b> on {format(new Date(selectedReq.created_at), 'PPP')}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Details Box */}
                <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-semibold text-slate-600">Total Amount</span>
                    <span className="text-xl font-bold text-slate-900">{formatMoney(selectedReq.amount, selectedReq.currency)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Description</span>
                    <p className="text-sm text-slate-700 mt-1">{selectedReq.description}</p>
                  </div>
                </div>

                {/* Approval Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4"/> Approval Chain</h4>
                  <ScrollArea className="h-[120px] rounded-md border p-3">
                    <ul className="space-y-3">
                      {selectedReq.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-sm">
                          <div className="mt-0.5">
                            {step.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-green-500"/> :
                             step.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-500"/> :
                             <div className="w-4 h-4 rounded-full border-2 border-slate-300"/>}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="font-medium text-slate-800">{step.approver_name}</span>
                              <span className="text-xs text-muted-foreground">{step.date ? format(new Date(step.date), 'MMM d, h:mm a') : ''}</span>
                            </div>
                            <p className="text-xs text-slate-500 capitalize">{step.status}</p>
                            {step.comments && <p className="text-xs italic text-slate-600 mt-1">"{step.comments}"</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>

                {/* Action Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Comments (Optional)</label>
                  <Textarea 
                    placeholder="Reason for approval or rejection..." 
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleCloseDialog} disabled={mutation.isPending}>
                  Cancel
                </Button>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleAction(false)}
                    disabled={mutation.isPending}
                  >
                    Reject
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => handleAction(true)}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                    Approve
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}