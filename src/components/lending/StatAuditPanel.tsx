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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  FileText, Download, CheckCircle2, Clock, Plus, Loader2, AlertTriangle, ShieldCheck, RefreshCw 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// --- Enterprise Types ---

interface AuditReport { 
    id: string; 
    report_type: 'PORTFOLIO_QUALITY' | 'LIQUIDITY_RATIO' | 'IFRS9_PROVISIONS' | 'BALANCE_SHEET' | 'SASRA_FORM_1';
    period_start: string;
    period_end: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SUBMITTED';
    file_path: string | null; // Path in Supabase Storage (not public URL)
    generated_by_email: string;
    generated_at: string;
    submitted_at?: string;
}

const generateSchema = z.object({
    report_type: z.enum(['PORTFOLIO_QUALITY', 'LIQUIDITY_RATIO', 'IFRS9_PROVISIONS', 'BALANCE_SHEET', 'SASRA_FORM_1']),
    period_month: z.string().min(1, "Month is required"), // YYYY-MM format
    format: z.enum(['PDF', 'EXCEL', 'XBRL']),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

// --- API Functions ---

async function fetchAuditReports(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
      .from('statutory_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false });
      
  if (error) throw new Error(error.message); 
  return data as AuditReport[];
}

async function triggerReportGeneration({ tenantId, data }: { tenantId: string, data: GenerateFormValues }) {
    const db = createClient();
    
    // Calculate start/end dates from the selected month
    const [year, month] = data.period_month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString(); // Last day of month

    // RPC: Enqueues the job in the background worker
    const { error } = await db.rpc('generate_regulatory_report', { 
        p_tenant_id: tenantId,
        p_report_type: data.report_type,
        p_format: data.format,
        p_start_date: startDate,
        p_end_date: endDate
    });

    if (error) throw new Error(error.message);
}

async function downloadSecureReport(filePath: string) {
    const db = createClient();
    // Security: Generate a signed URL valid for 60 seconds
    const { data, error } = await db.storage
        .from('audit-reports')
        .createSignedUrl(filePath, 60);

    if (error) throw new Error(error.message);
    
    // Trigger browser download
    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = filePath.split('/').pop() || 'report';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function markAsSubmitted(reportId: string) {
    const db = createClient();
    const { error } = await db
        .from('statutory_reports')
        .update({ 
            status: 'SUBMITTED', 
            submitted_at: new Date().toISOString() 
        })
        .eq('id', reportId);
        
    if (error) throw new Error(error.message);
}

// --- Component ---

export function StatAuditPanel({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Queries (Auto-refresh every 10s if reports are processing)
  const { data: reports, isLoading } = useQuery({ 
      queryKey: ['lending-audits', tenantId], 
      queryFn: () => fetchAuditReports(tenantId),
      refetchInterval: (query) => {
          const hasProcessing = query.state.data?.some(r => ['QUEUED', 'PROCESSING'].includes(r.status));
          return hasProcessing ? 5000 : false;
      }
  });

  // Mutations
  const generateMutation = useMutation({
      mutationFn: (data: GenerateFormValues) => triggerReportGeneration({ tenantId, data }),
      onSuccess: () => {
          toast.success("Report generation queued.");
          queryClient.invalidateQueries({ queryKey: ['lending-audits', tenantId] });
          setIsDialogOpen(false);
      },
      onError: (e: Error) => toast.error(e.message)
  });

  const submitMutation = useMutation({
      mutationFn: markAsSubmitted,
      onSuccess: () => {
          toast.success("Report marked as submitted to Regulator.");
          queryClient.invalidateQueries({ queryKey: ['lending-audits', tenantId] });
      },
      onError: (e: Error) => toast.error(e.message)
  });

  // Form
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<GenerateFormValues>({
      resolver: zodResolver(generateSchema),
      defaultValues: {
          report_type: 'PORTFOLIO_QUALITY',
          format: 'EXCEL',
          period_month: new Date().toISOString().slice(0, 7) // Current YYYY-MM
      }
  });

  // Helpers
  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'COMPLETED': return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Ready</Badge>;
          case 'SUBMITTED': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Submitted</Badge>;
          case 'PROCESSING': return <Badge variant="outline" className="animate-pulse text-amber-600 border-amber-300">Processing</Badge>;
          case 'QUEUED': return <Badge variant="outline" className="text-slate-500">Queued</Badge>;
          case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  const formatReportName = (type: string) => {
      return type.replace(/_/g, ' ') + ' Report';
  };

  return (
    <div className="space-y-6">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>Last Audit: {reports?.find(r => r.status === 'SUBMITTED') ? formatDate(reports.find(r => r.status === 'SUBMITTED')!.generated_at) : 'Never'}</span>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Generate New Report
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Statutory Report</DialogTitle>
                        <DialogDescription>
                            Create a compliance report for the Financial Regulator (SASRA/Central Bank).
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit((data) => generateMutation.mutate(data))} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select onValueChange={(val: any) => setValue('report_type', val)} defaultValue="PORTFOLIO_QUALITY">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PORTFOLIO_QUALITY">Portfolio Quality (NPLs)</SelectItem>
                                    <SelectItem value="IFRS9_PROVISIONS">IFRS 9 Expected Credit Loss</SelectItem>
                                    <SelectItem value="LIQUIDITY_RATIO">Liquidity & Solvency Ratios</SelectItem>
                                    <SelectItem value="SASRA_FORM_1">Regulator Return (Form 1)</SelectItem>
                                    <SelectItem value="BALANCE_SHEET">Monthly Balance Sheet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reporting Period</Label>
                            <Input type="month" {...register('period_month')} />
                            <p className="text-[10px] text-muted-foreground">Report will cover the entire selected month.</p>
                            {errors.period_month && <p className="text-red-500 text-xs">{errors.period_month.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Output Format</Label>
                            <Select onValueChange={(val: any) => setValue('format', val)} defaultValue="EXCEL">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXCEL">Excel (.xlsx)</SelectItem>
                                    <SelectItem value="PDF">PDF Document (.pdf)</SelectItem>
                                    <SelectItem value="XBRL">XBRL (Regulator Standard)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={generateMutation.isPending}>
                                {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Start Generation
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>

        {/* Reports Table */}
        <Card className="border-t-4 border-t-slate-700">
            <CardHeader>
                <CardTitle>Audit & Compliance Logs</CardTitle>
                <CardDescription>History of generated regulatory reports and submission status.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400"/></TableCell></TableRow>
                    ) : reports?.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit reports found.</TableCell></TableRow>
                    ) : (
                        reports?.map((a) => (
                        <TableRow key={a.id} className="group">
                            <TableCell className="font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" /> 
                                <div className="flex flex-col">
                                    <span>{formatReportName(a.report_type)}</span>
                                    {a.file_path?.endsWith('.pdf') && <span className="text-[10px] text-muted-foreground">PDF Document</span>}
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                                {new Date(a.period_start).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.generated_by_email}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {formatDate(a.generated_at)}
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(a.status)}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {a.status === 'COMPLETED' && a.file_path && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => downloadSecureReport(a.file_path!)}>
                                                <Download className="h-4 w-4 mr-1" /> Download
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => submitMutation.mutate(a.id)}>
                                                Mark Submitted
                                            </Button>
                                        </>
                                    )}
                                    {a.status === 'FAILED' && (
                                        <span className="text-xs text-red-500 flex items-center">
                                            <AlertTriangle className="h-3 w-3 mr-1"/> Error
                                        </span>
                                    )}
                                    {a.status === 'SUBMITTED' && (
                                        <span className="text-xs text-green-600 flex items-center justify-end">
                                            <CheckCircle2 className="h-3 w-3 mr-1"/> Verified
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}