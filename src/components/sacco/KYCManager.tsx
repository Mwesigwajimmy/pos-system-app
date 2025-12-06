'use client';

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import { Loader2, ShieldCheck, CheckCircle2, XCircle, Eye, AlertTriangle, FileText } from "lucide-react";

// --- Types ---
interface KYCApplicant { 
    id: string; 
    member_name: string; 
    nationality: string;
    document_type: 'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE';
    document_number: string;
    kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED'; 
    risk_score: 'LOW' | 'MEDIUM' | 'HIGH';
    submitted_at: string;
    // Enterprise: Image URLs for evidence
    doc_front_url: string;
    doc_back_url: string;
    rejection_reason?: string;
}

// --- API ---
async function fetchKYCQueue(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('kyc_applications')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false });
  
  if (error) throw error; 
  return data as KYCApplicant[];
}

async function reviewKYC(payload: { id: string, status: 'APPROVED' | 'REJECTED', reason?: string, tenantId: string }) {
  const db = createClient();
  // Using RPC to handle the transaction log and member status update atomically
  const { error } = await db.rpc('review_kyc_application', {
      p_application_id: payload.id,
      p_status: payload.status,
      p_notes: payload.reason || null,
      p_reviewer_id: (await db.auth.getUser()).data.user?.id
  });
  
  if (error) throw new Error(error.message);
}

// --- Component ---
export default function KYCManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  
  // State for the "Review Modal"
  const [selectedApplicant, setSelectedApplicant] = useState<KYCApplicant | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  const { data, isLoading } = useQuery({ 
      queryKey: ['kyc-queue', tenantId], 
      queryFn: () => fetchKYCQueue(tenantId) 
  });

  // Optimistic Mutation
  const mutation = useMutation({ 
      mutationFn: (status: 'APPROVED' | 'REJECTED') => reviewKYC({ 
          id: selectedApplicant!.id, 
          status, 
          reason: rejectionReason,
          tenantId 
      }), 
      onMutate: async (newStatus) => {
          // Optimistic UI: Immediately update the list locally
          await queryClient.cancelQueries({ queryKey: ['kyc-queue', tenantId] });
          const previous = queryClient.getQueryData(['kyc-queue', tenantId]);
          
          queryClient.setQueryData(['kyc-queue', tenantId], (old: KYCApplicant[] = []) => 
            old.map(app => app.id === selectedApplicant?.id 
                ? { ...app, kyc_status: newStatus } 
                : app
            )
          );
          
          // Close modal immediately for speed
          setSelectedApplicant(null);
          setRejectionReason("");
          return { previous };
      },
      onError: (err, newStatus, context) => {
          // Revert if server fails
          queryClient.setQueryData(['kyc-queue', tenantId], context?.previous);
          toast.error("Review failed. Please try again.");
      },
      onSuccess: () => {
          toast.success("Decision recorded successfully");
          queryClient.invalidateQueries({ queryKey: ['kyc-queue', tenantId] });
      } 
  });

  const handleReviewSubmit = () => {
      if (actionType === 'REJECT' && !rejectionReason) {
          return toast.error("Please provide a reason for rejection.");
      }
      mutation.mutate(actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED');
  };

  return (
    <div className="h-full space-y-4">
        <Card className="border-t-4 border-t-indigo-600 shadow-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600"/> Identity Verification
            </CardTitle>
            <CardDescription>
                Compliance queue. Review member documents against AML/CFT databases.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Document Details</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
                    ) : !data || data.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Queue is empty. All caught up!</TableCell></TableRow>
                    ) : (
                        data.map((app) => (
                        <TableRow key={app.id} className="hover:bg-slate-50/50">
                            <TableCell>
                                <div className="font-medium text-slate-900">{app.member_name}</div>
                                <div className="text-xs text-muted-foreground">{app.nationality}</div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm font-mono">{app.document_number}</div>
                                <Badge variant="outline" className="text-[10px]">{app.document_type.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                                {app.risk_score === 'HIGH' && <Badge variant="destructive" className="flex w-fit items-center gap-1"><AlertTriangle className="w-3 h-3"/> High Risk</Badge>}
                                {app.risk_score === 'MEDIUM' && <Badge className="bg-amber-500 hover:bg-amber-600">Medium</Badge>}
                                {app.risk_score === 'LOW' && <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Low Risk</Badge>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(app.submitted_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                                <Badge variant={app.kyc_status === 'APPROVED' ? 'default' : app.kyc_status === 'REJECTED' ? 'destructive' : 'outline'} 
                                       className={app.kyc_status === 'APPROVED' ? 'bg-green-600' : ''}>
                                    {app.kyc_status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {app.kyc_status === "PENDING" ? (
                                    <Button 
                                        size="sm" 
                                        variant="secondary"
                                        className="h-8"
                                        onClick={() => setSelectedApplicant(app)}
                                    >
                                        <Eye className="w-3 h-3 mr-2"/> Review
                                    </Button>
                                ) : (
                                    <div className="flex justify-end text-slate-400">
                                        {app.kyc_status === 'APPROVED' ? <CheckCircle2 className="w-5 h-5 text-green-500"/> : <XCircle className="w-5 h-5 text-red-400"/>}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
        </Card>

        {/* Review Modal */}
        <Dialog open={!!selectedApplicant} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Review Application: {selectedApplicant?.member_name}</DialogTitle>
                    <DialogDescription>Verify document legibility and authenticity.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto py-4 grid md:grid-cols-2 gap-6">
                    {/* Document Viewer */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground font-semibold">Document Front</Label>
                            <div className="aspect-video bg-slate-100 rounded-lg border flex items-center justify-center overflow-hidden">
                                {selectedApplicant?.doc_front_url ? (
                                    <img src={selectedApplicant.doc_front_url} alt="ID Front" className="object-cover w-full h-full" />
                                ) : (
                                    <FileText className="w-10 h-10 text-slate-300"/>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground font-semibold">Document Back</Label>
                            <div className="aspect-video bg-slate-100 rounded-lg border flex items-center justify-center overflow-hidden">
                                {selectedApplicant?.doc_back_url ? (
                                    <img src={selectedApplicant.doc_back_url} alt="ID Back" className="object-cover w-full h-full" />
                                ) : (
                                    <FileText className="w-10 h-10 text-slate-300"/>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Decision Panel */}
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">National ID:</span>
                                <span className="font-mono font-medium">{selectedApplicant?.document_number}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Risk Score:</span>
                                <span className={`font-bold ${selectedApplicant?.risk_score === 'HIGH' ? 'text-red-600' : 'text-green-600'}`}>
                                    {selectedApplicant?.risk_score}
                                </span>
                            </div>
                        </div>

                        {actionType === 'REJECT' && (
                            <div className="space-y-2 animate-in fade-in zoom-in-95">
                                <Label htmlFor="reason" className="text-red-600 font-semibold">Reason for Rejection</Label>
                                <Textarea 
                                    id="reason" 
                                    placeholder="e.g., Image blurred, Document expired, Name mismatch..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="border-red-200 focus-visible:ring-red-500"
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-4">
                             {!actionType ? (
                                 <>
                                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setActionType('APPROVE')}>
                                        <CheckCircle2 className="mr-2 h-4 w-4"/> Approve Application
                                    </Button>
                                    <Button variant="destructive" className="w-full" onClick={() => setActionType('REJECT')}>
                                        <XCircle className="mr-2 h-4 w-4"/> Reject Application
                                    </Button>
                                 </>
                             ) : (
                                 <div className="flex gap-2">
                                     <Button variant="outline" className="flex-1" onClick={() => { setActionType(null); setRejectionReason(""); }}>
                                         Back
                                     </Button>
                                     <Button 
                                        className={`flex-1 ${actionType === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                                        onClick={handleReviewSubmit}
                                        disabled={mutation.isPending}
                                     >
                                         {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                         Confirm {actionType}
                                     </Button>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}