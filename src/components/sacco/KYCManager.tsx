'use client';

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, differenceInCalendarDays } from "date-fns";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Icons
import {
    Loader2, ShieldCheck, CheckCircle2, XCircle, Eye, AlertTriangle, FileText,
    Search, Download, ZoomIn, X, ShieldAlert, CalendarClock, UserSearch
} from "lucide-react";

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

    // Additional KYC/AML fields — optional so the UI degrades gracefully
    // until the query/RPC on your side returns them.
    date_of_birth?: string;
    address?: string;
    occupation?: string;
    source_of_funds?: string;
    document_expiry_date?: string;
    pep_status?: boolean;
    watchlist_hit?: boolean;
    selfie_url?: string;
    proof_of_address_url?: string;
    reviewed_by?: string;
    reviewed_at?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

// --- API (reads — plain table query, shape untouched) ---
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

// --- API (write — RPC, call shape preserved, only additive params) ---
async function reviewKYC(payload: {
    id: string;
    status: 'APPROVED' | 'REJECTED';
    reason?: string;
    tenantId: string;
    eddConfirmed?: boolean;
    watchlistAck?: boolean;
}) {
  const db = createClient();
  // Using RPC to handle the transaction log and member status update atomically
  const { error } = await db.rpc('review_kyc_application', {
      p_application_id: payload.id,
      p_status: payload.status,
      p_notes: payload.reason || null,
      p_reviewer_id: (await db.auth.getUser()).data.user?.id,
      p_edd_confirmed: payload.eddConfirmed ?? null,
      p_watchlist_ack: payload.watchlistAck ?? null
  });

  if (error) throw new Error(error.message);
}

function downloadCsv(rows: KYCApplicant[]) {
    const header = ["Applicant", "Nationality", "Document Type", "Document No", "Risk Score", "Status", "Submitted"];
    const lines = rows.map(r => [
        r.member_name,
        r.nationality,
        r.document_type,
        r.document_number,
        r.risk_score,
        r.kyc_status,
        format(new Date(r.submitted_at), 'yyyy-MM-dd')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kyc-queue-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function DocumentThumb({ label, url, onZoom }: { label: string; url?: string; onZoom: (url: string) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-semibold">{label}</Label>
            <div
                className={`aspect-video bg-slate-100 rounded-lg border flex items-center justify-center overflow-hidden relative group ${url ? 'cursor-zoom-in' : ''}`}
                onClick={() => url && onZoom(url)}
            >
                {url ? (
                    <>
                        <img src={url} alt={label} className="object-cover w-full h-full" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </>
                ) : (
                    <FileText className="w-10 h-10 text-slate-300" />
                )}
            </div>
        </div>
    );
}

// --- Component ---
export default function KYCManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();

  // Review modal state
  const [selectedApplicant, setSelectedApplicant] = useState<KYCApplicant | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [eddConfirmed, setEddConfirmed] = useState(false);
  const [watchlistAck, setWatchlistAck] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Queue filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');

  const { data, isLoading, isError, refetch } = useQuery({
      queryKey: ['kyc-queue', tenantId],
      queryFn: () => fetchKYCQueue(tenantId)
  });

  React.useEffect(() => {
      if (!selectedApplicant) {
          setReviewNotes("");
          setActionType(null);
          setEddConfirmed(false);
          setWatchlistAck(false);
          setZoomedImage(null);
      }
  }, [selectedApplicant]);

  // Optimistic Mutation
  const mutation = useMutation({
      mutationFn: (status: 'APPROVED' | 'REJECTED') => reviewKYC({
          id: selectedApplicant!.id,
          status,
          reason: reviewNotes,
          tenantId,
          eddConfirmed: selectedApplicant?.risk_score === 'HIGH' ? eddConfirmed : undefined,
          watchlistAck: selectedApplicant?.watchlist_hit ? watchlistAck : undefined
      }),
      onMutate: async (newStatus) => {
          await queryClient.cancelQueries({ queryKey: ['kyc-queue', tenantId] });
          const previous = queryClient.getQueryData(['kyc-queue', tenantId]);

          queryClient.setQueryData(['kyc-queue', tenantId], (old: KYCApplicant[] = []) =>
            old.map(app => app.id === selectedApplicant?.id
                ? { ...app, kyc_status: newStatus }
                : app
            )
          );

          setSelectedApplicant(null);
          return { previous };
      },
      onError: (err, newStatus, context) => {
          queryClient.setQueryData(['kyc-queue', tenantId], context?.previous);
          toast.error("Review failed. Please try again.");
      },
      onSuccess: () => {
          toast.success("Decision recorded successfully");
          queryClient.invalidateQueries({ queryKey: ['kyc-queue', tenantId] });
      }
  });

  const rejectionValid = reviewNotes.trim().length >= 10;
  const eddValid = selectedApplicant?.risk_score !== 'HIGH' || eddConfirmed;
  const watchlistValid = !selectedApplicant?.watchlist_hit || watchlistAck;

  const canConfirm = actionType === 'APPROVE'
      ? eddValid && watchlistValid && !mutation.isPending
      : actionType === 'REJECT'
          ? rejectionValid && !mutation.isPending
          : false;

  const handleReviewSubmit = () => {
      if (actionType === 'REJECT' && !rejectionValid) {
          return toast.error("Please provide a rejection reason of at least 10 characters.");
      }
      if (actionType === 'APPROVE' && !eddValid) {
          return toast.error("Confirm enhanced due diligence before approving a high-risk applicant.");
      }
      if (actionType === 'APPROVE' && !watchlistValid) {
          return toast.error("Acknowledge the watchlist hit before approving.");
      }
      mutation.mutate(actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED');
  };

  // --- Filtering + summary ---
  const filtered = React.useMemo(() => {
      if (!data) return [];
      return data.filter(app => {
          if (statusFilter !== 'ALL' && app.kyc_status !== statusFilter) return false;
          if (riskFilter !== 'ALL' && app.risk_score !== riskFilter) return false;
          if (searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              if (!app.member_name.toLowerCase().includes(q) && !app.document_number.toLowerCase().includes(q)) {
                  return false;
              }
          }
          return true;
      });
  }, [data, statusFilter, riskFilter, searchQuery]);

  const pendingCount = (data || []).filter(a => a.kyc_status === 'PENDING').length;
  const highRiskPendingCount = (data || []).filter(a => a.kyc_status === 'PENDING' && a.risk_score === 'HIGH').length;
  const approvedCount = (data || []).filter(a => a.kyc_status === 'APPROVED').length;
  const rejectedCount = (data || []).filter(a => a.kyc_status === 'REJECTED').length;

  const isViewOnly = !!selectedApplicant && selectedApplicant.kyc_status !== 'PENDING';

  const expiryInfo = React.useMemo(() => {
      if (!selectedApplicant?.document_expiry_date) return null;
      const days = differenceInCalendarDays(new Date(selectedApplicant.document_expiry_date), new Date());
      if (days < 0) return { label: `Expired ${Math.abs(days)} day(s) ago`, tone: 'text-red-600' };
      if (days <= 30) return { label: `Expires in ${days} day(s)`, tone: 'text-amber-600' };
      return { label: `Valid until ${format(new Date(selectedApplicant.document_expiry_date), 'PP')}`, tone: 'text-green-600' };
  }, [selectedApplicant]);

  return (
    <div className="h-full space-y-4">
        <Card className="border-t-4 border-t-indigo-600 shadow-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" /> Identity Verification
            </CardTitle>
            <CardDescription>
                Compliance queue. Review member documents against AML/CFT databases.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 border rounded-lg p-3 text-center">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Pending</span>
                    <span className={`text-sm font-bold leading-tight ${pendingCount ? "text-amber-600" : "text-slate-900"}`}>{pendingCount}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-x">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">High Risk Pending</span>
                    <span className={`text-sm font-bold leading-tight ${highRiskPendingCount ? "text-red-600" : "text-slate-900"}`}>{highRiskPendingCount}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-r">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Approved</span>
                    <span className="text-sm font-bold text-slate-900 leading-tight">{approvedCount}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Rejected</span>
                    <span className="text-sm font-bold text-slate-900 leading-tight">{rejectedCount}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Search by name or document number..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 text-sm"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                    <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Risk</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-9" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                </Button>
            </div>

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
                        Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6} className="h-14">
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : isError ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <div className="flex flex-col items-center gap-2 text-red-600 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    Couldn't load the KYC queue.
                                    <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : !filtered.length ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                {data && data.length > 0 ? "No applications match your filters." : "Queue is empty. All caught up!"}
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map((app) => (
                        <TableRow key={app.id} className="hover:bg-slate-50/50">
                            <TableCell>
                                <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                    {app.member_name}
                                    {app.pep_status && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-700">PEP</Badge>
                                    )}
                                    {app.watchlist_hit && (
                                        <Badge variant="destructive" className="text-[9px] px-1 py-0">Watchlist</Badge>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">{app.nationality}</div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm font-mono">{app.document_number}</div>
                                <Badge variant="outline" className="text-[10px]">{app.document_type.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                                {app.risk_score === 'HIGH' && <Badge variant="destructive" className="flex w-fit items-center gap-1"><AlertTriangle className="w-3 h-3" /> High Risk</Badge>}
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
                                        <Eye className="w-3 h-3 mr-2" /> Review
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-slate-500"
                                        onClick={() => setSelectedApplicant(app)}
                                    >
                                        {app.kyc_status === 'APPROVED'
                                            ? <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-500" />
                                            : <XCircle className="w-4 h-4 mr-1.5 text-red-400" />}
                                        View
                                    </Button>
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

        {/* Review / View Modal */}
        <Dialog open={!!selectedApplicant} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
            <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {isViewOnly ? 'Application: ' : 'Review Application: '}{selectedApplicant?.member_name}
                    </DialogTitle>
                    <DialogDescription>
                        {isViewOnly ? 'Read-only record of a completed review.' : 'Verify document legibility and authenticity.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 grid md:grid-cols-2 gap-6">
                    {/* Document Viewer */}
                    <div className="space-y-4">
                        <DocumentThumb label="Document Front" url={selectedApplicant?.doc_front_url} onZoom={setZoomedImage} />
                        <DocumentThumb label="Document Back" url={selectedApplicant?.doc_back_url} onZoom={setZoomedImage} />
                        {selectedApplicant?.proof_of_address_url && (
                            <DocumentThumb label="Proof of Address" url={selectedApplicant.proof_of_address_url} onZoom={setZoomedImage} />
                        )}
                        {selectedApplicant?.selfie_url && (
                            <DocumentThumb label="Selfie / Liveness Check" url={selectedApplicant.selfie_url} onZoom={setZoomedImage} />
                        )}
                    </div>

                    {/* Decision Panel */}
                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-lg border space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Document No:</span>
                                <span className="font-mono font-medium">{selectedApplicant?.document_number}</span>
                            </div>
                            {selectedApplicant?.date_of_birth && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date of Birth:</span>
                                    <span className="font-medium">{format(new Date(selectedApplicant.date_of_birth), 'PP')}</span>
                                </div>
                            )}
                            {selectedApplicant?.address && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground shrink-0">Address:</span>
                                    <span className="font-medium text-right">{selectedApplicant.address}</span>
                                </div>
                            )}
                            {selectedApplicant?.occupation && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Occupation:</span>
                                    <span className="font-medium">{selectedApplicant.occupation}</span>
                                </div>
                            )}
                            {selectedApplicant?.source_of_funds && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground shrink-0">Source of Funds:</span>
                                    <span className="font-medium text-right">{selectedApplicant.source_of_funds}</span>
                                </div>
                            )}
                            {expiryInfo && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Document Expiry:</span>
                                    <span className={`font-medium ${expiryInfo.tone}`}>{expiryInfo.label}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Risk Score:</span>
                                <span className={`font-bold ${selectedApplicant?.risk_score === 'HIGH' ? 'text-red-600' : selectedApplicant?.risk_score === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}`}>
                                    {selectedApplicant?.risk_score}
                                </span>
                            </div>
                        </div>

                        {selectedApplicant?.pep_status && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded flex items-start gap-2">
                                <UserSearch className="w-4 h-4 mt-0.5 shrink-0" />
                                This applicant is flagged as a Politically Exposed Person. Enhanced due diligence applies.
                            </div>
                        )}

                        {selectedApplicant?.watchlist_hit && (
                            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-2.5 rounded flex items-start gap-2">
                                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                                A potential sanctions/watchlist match was found for this applicant. Confirm this is not a true match before approving.
                            </div>
                        )}

                        {isViewOnly ? (
                            <div className="space-y-2 text-sm">
                                {selectedApplicant?.reviewed_by && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Reviewed By:</span>
                                        <span className="font-medium">{selectedApplicant.reviewed_by}</span>
                                    </div>
                                )}
                                {selectedApplicant?.reviewed_at && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Reviewed At:</span>
                                        <span className="font-medium">{format(new Date(selectedApplicant.reviewed_at), 'PP p')}</span>
                                    </div>
                                )}
                                {selectedApplicant?.kyc_status === 'REJECTED' && selectedApplicant?.rejection_reason && (
                                    <div className="space-y-1 pt-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-semibold">Rejection Reason</Label>
                                        <p className="text-sm bg-red-50 border border-red-100 rounded p-2.5 text-red-900">
                                            {selectedApplicant.rejection_reason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {actionType && (
                                    <div className="space-y-2 animate-in fade-in zoom-in-95">
                                        <Label htmlFor="reason" className={actionType === 'REJECT' ? "text-red-600 font-semibold" : "font-semibold"}>
                                            {actionType === 'REJECT' ? 'Reason for Rejection' : 'Notes (optional)'}
                                        </Label>
                                        <Textarea
                                            id="reason"
                                            placeholder={actionType === 'REJECT'
                                                ? "e.g., Image blurred, Document expired, Name mismatch..."
                                                : "Any context worth recording for the audit trail..."}
                                            value={reviewNotes}
                                            onChange={(e) => setReviewNotes(e.target.value)}
                                            className={actionType === 'REJECT' ? "border-red-200 focus-visible:ring-red-500" : ""}
                                        />
                                        {actionType === 'REJECT' && (
                                            <p className={`text-[11px] ${rejectionValid ? 'text-muted-foreground' : 'text-red-600'}`}>
                                                {rejectionValid ? `${reviewNotes.trim().length} characters` : 'Minimum 10 characters required.'}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {actionType === 'APPROVE' && selectedApplicant?.risk_score === 'HIGH' && (
                                    <div className="flex items-start gap-2">
                                        <Checkbox id="edd" checked={eddConfirmed} onCheckedChange={(v) => setEddConfirmed(v === true)} />
                                        <Label htmlFor="edd" className="text-sm font-normal leading-snug">
                                            I confirm enhanced due diligence has been completed for this high-risk applicant.
                                        </Label>
                                    </div>
                                )}

                                {actionType === 'APPROVE' && selectedApplicant?.watchlist_hit && (
                                    <div className="flex items-start gap-2">
                                        <Checkbox id="watchlist" checked={watchlistAck} onCheckedChange={(v) => setWatchlistAck(v === true)} />
                                        <Label htmlFor="watchlist" className="text-sm font-normal leading-snug">
                                            I confirm the watchlist match was investigated and is not a true positive.
                                        </Label>
                                    </div>
                                )}

                                <Separator />

                                <div className="flex flex-col gap-3">
                                     {!actionType ? (
                                         <>
                                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setActionType('APPROVE')}>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Application
                                            </Button>
                                            <Button variant="destructive" className="w-full" onClick={() => setActionType('REJECT')}>
                                                <XCircle className="mr-2 h-4 w-4" /> Reject Application
                                            </Button>
                                         </>
                                     ) : (
                                         <div className="flex gap-2">
                                             <Button variant="outline" className="flex-1" onClick={() => { setActionType(null); setReviewNotes(""); }}>
                                                 Back
                                             </Button>
                                             <Button
                                                className={`flex-1 ${actionType === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                                                onClick={handleReviewSubmit}
                                                disabled={!canConfirm}
                                             >
                                                 {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                 Confirm {actionType}
                                             </Button>
                                         </div>
                                     )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Lightbox for document zoom */}
        {zoomedImage && (
            <div
                className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6"
                onClick={() => setZoomedImage(null)}
            >
                <button
                    className="absolute top-4 right-4 text-white/80 hover:text-white"
                    onClick={() => setZoomedImage(null)}
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>
                <img src={zoomedImage} alt="Document zoom" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
        )}
    </div>
  )
}