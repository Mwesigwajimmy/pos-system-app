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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { 
  Eye, CheckCircle2, XCircle, FileText, UserCheck, AlertCircle, Calendar 
} from "lucide-react";

// --- Enterprise Types ---

interface KYCApplication { 
    id: string; 
    borrower_id: string; 
    full_name: string; 
    national_id: string; 
    document_type: 'National ID' | 'Passport' | 'Driving License';
    document_url: string; // URL to Supabase Storage
    selfie_url?: string;
    kyc_status: 'PENDING' | 'APPROVED' | 'REJECTED'; 
    submitted_at: string;
    reviewed_at?: string;
    compliance_notes?: string;
    risk_score?: number; // Automated OCR match score
}

// Validation for Review
const reviewSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    notes: z.string().min(1, "Audit notes are required"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

// --- Fetcher ---

async function fetchKYCQueue(tenantId: string) {
  const db = createClient();
  // Fetch Pending Queue
  const { data, error } = await db
    .from('lending_kyc')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('kyc_status', 'PENDING')
    .order('submitted_at', { ascending: true }); // Oldest first
  
  if (error) throw new Error(error.message); 
  return data as KYCApplication[];
}

async function fetchKYCHistory(tenantId: string) {
    const db = createClient();
    const { data, error } = await db
      .from('lending_kyc')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('kyc_status', 'PENDING')
      .order('reviewed_at', { ascending: false })
      .limit(50);
    
    if (error) throw new Error(error.message); 
    return data as KYCApplication[];
}

async function submitReview({ id, tenantId, data }: { id: string, tenantId: string, data: ReviewFormValues }) {
  const db = createClient();
  const user = (await db.auth.getUser()).data.user;

  const { error } = await db.from('lending_kyc').update({ 
    kyc_status: data.status,
    compliance_notes: data.notes,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user?.id 
  }).eq('id', id).eq('tenant_id', tenantId);

  if (error) throw error;
}

// --- Component ---

export function KYCManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = React.useState<KYCApplication | null>(null);
  const [activeTab, setActiveTab] = React.useState("queue");

  // Queries
  const { data: queue, isLoading: loadingQueue } = useQuery({ 
      queryKey: ['kyc-queue', tenantId], 
      queryFn: () => fetchKYCQueue(tenantId),
      enabled: activeTab === "queue"
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
      queryKey: ['kyc-history', tenantId],
      queryFn: () => fetchKYCHistory(tenantId),
      enabled: activeTab === "history"
  });

  // Mutation
  const mutation = useMutation({ 
      mutationFn: submitReview, 
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['kyc-queue', tenantId] });
          queryClient.invalidateQueries({ queryKey: ['kyc-history', tenantId] });
          toast.success("Compliance decision recorded");
          setSelectedApp(null);
      }, 
      onError: (e: Error) => toast.error(e.message) 
  });

  // Form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ReviewFormValues>({
      resolver: zodResolver(reviewSchema),
      defaultValues: { status: 'APPROVED', notes: '' }
  });

  const currentStatus = watch('status');

  // Handle Open
  const handleReview = (app: KYCApplication) => {
      setSelectedApp(app);
      reset();
      setValue('notes', '');
      setValue('status', 'APPROVED');
  };

  const statusColors = {
      PENDING: "bg-blue-100 text-blue-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700"
  };

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-primary" /> 
                    KYC & Due Diligence
                </CardTitle>
                <CardDescription>Verify borrower identities and manage compliance risk.</CardDescription>
            </div>
          </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="queue">Pending Review ({queue?.length || 0})</TabsTrigger>
                <TabsTrigger value="history">Decision History</TabsTrigger>
            </TabsList>

            {/* --- Queue Tab --- */}
            <TabsContent value="queue">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Document Type</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingQueue ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading queue...</TableCell></TableRow> :
                         queue?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Queue is empty. All caught up!</TableCell></TableRow> :
                         queue?.map((app) => (
                            <TableRow key={app.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{app.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{app.national_id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{app.document_type}</TableCell>
                                <TableCell>{formatDate(app.submitted_at)}</TableCell>
                                <TableCell>
                                    {/* Simulated Automated OCR Risk Score */}
                                    <Badge variant="outline" className={app.risk_score && app.risk_score < 80 ? "border-red-200 text-red-600" : "border-green-200 text-green-600"}>
                                        {app.risk_score ? `${app.risk_score}% Match` : 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleReview(app)}>
                                        <Eye className="w-4 h-4 mr-2" /> Review
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>

            {/* --- History Tab --- */}
            <TabsContent value="history">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Decision</TableHead>
                            <TableHead>Reviewed At</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingHistory ? <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow> :
                         history?.map((app) => (
                            <TableRow key={app.id} className="opacity-75">
                                <TableCell className="font-medium">{app.full_name}</TableCell>
                                <TableCell>
                                    <Badge className={statusColors[app.kyc_status]}>{app.kyc_status}</Badge>
                                </TableCell>
                                <TableCell>{formatDate(app.reviewed_at || '')}</TableCell>
                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{app.compliance_notes}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TabsContent>
        </Tabs>
      </CardContent>

      {/* --- Detailed Review Modal --- */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Identity Verification</DialogTitle>
                <DialogDescription>Review submitted documents against profile data.</DialogDescription>
            </DialogHeader>
            
            {selectedApp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Left: Documents */}
                    <div className="space-y-4">
                        <div className="border rounded-lg p-2 bg-slate-50 text-center">
                            <span className="text-xs text-muted-foreground block mb-2">Primary ID Document</span>
                            {/* In real app, use Next/Image with protected Supabase URL */}
                            <div className="aspect-video bg-gray-200 rounded flex items-center justify-center relative overflow-hidden group">
                                {selectedApp.document_url ? (
                                    <img src={selectedApp.document_url} alt="ID" className="object-cover w-full h-full" />
                                ) : (
                                    <FileText className="h-12 w-12 text-gray-400" />
                                )}
                            </div>
                        </div>
                        {selectedApp.selfie_url && (
                            <div className="border rounded-lg p-2 bg-slate-50 text-center">
                                <span className="text-xs text-muted-foreground block mb-2">Live Selfie</span>
                                <div className="aspect-square w-32 mx-auto bg-gray-200 rounded overflow-hidden">
                                     <img src={selectedApp.selfie_url} alt="Selfie" className="object-cover w-full h-full" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Decision Form */}
                    <div className="space-y-6">
                        <div className="space-y-2 border-b pb-4">
                            <h4 className="font-semibold text-sm">Profile Data</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{selectedApp.full_name}</span>
                                <span className="text-muted-foreground">National ID:</span>
                                <span className="font-medium">{selectedApp.national_id}</span>
                                <span className="text-muted-foreground">Submitted:</span>
                                <span>{formatDate(selectedApp.submitted_at)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit((data) => mutation.mutate({ id: selectedApp.id, tenantId, data }))} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Decision</label>
                                <div className="flex gap-4">
                                    <Button 
                                        type="button" 
                                        variant={currentStatus === 'APPROVED' ? 'default' : 'outline'}
                                        className={currentStatus === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : ''}
                                        onClick={() => setValue('status', 'APPROVED')}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant={currentStatus === 'REJECTED' ? 'destructive' : 'outline'}
                                        onClick={() => setValue('status', 'REJECTED')}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Compliance Notes <span className="text-red-500">*</span>
                                </label>
                                <Textarea 
                                    placeholder={currentStatus === 'REJECTED' ? "Reason for rejection (e.g., ID expired, Name mismatch)..." : "verification notes..."}
                                    {...register('notes')}
                                    className="h-24"
                                />
                                {errors.notes && <p className="text-red-500 text-xs">{errors.notes.message}</p>}
                            </div>

                            {currentStatus === 'REJECTED' && (
                                <div className="bg-red-50 p-3 rounded text-xs text-red-700 flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>Rejection will trigger an email/SMS notification to the borrower requesting re-submission.</span>
                                </div>
                            )}

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setSelectedApp(null)}>Cancel</Button>
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending ? "Processing..." : "Confirm Decision"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}