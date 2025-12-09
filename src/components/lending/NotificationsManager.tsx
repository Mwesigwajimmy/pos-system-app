'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  Send, Loader2, History, AlertTriangle, Users, FileText, CheckCircle2, XCircle, Info 
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// --- Enterprise Types ---

const notificationSchema = z.object({
  channel: z.enum(["SMS", "EMAIL", "WHATSAPP", "INAPP"]),
  recipient_group: z.enum(["ALL_BORROWERS", "DEFAULTERS_ONLY", "ACTIVE_LOANS", "KYC_PENDING"]),
  template_id: z.string().optional(),
  message_body: z.string().min(10, "Message too short"),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface NotificationLog {
  id: string;
  batch_id: string;
  channel: string;
  recipient_group: string;
  message_preview: string;
  recipient_count: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  sent_by: string; // User email/name
  created_at: string;
}

interface AudienceMetrics {
  count: number;
  estimated_cost: number; // In base currency
}

// Templates (Normally fetched from DB, hardcoded here for UI logic)
const TEMPLATES = [
  { id: 'payment_reminder', label: 'Payment Reminder', text: "Dear {first_name}, your loan payment of {amount_due} is due on {due_date}. Please pay via Mobile Money to avoid penalties." },
  { id: 'default_notice', label: 'Default Notice', text: "URGENT: Dear {first_name}, your loan is now in arrears. Please contact us immediately to restructure your payment plan." },
  { id: 'promo_rate', label: 'Holiday Promo', text: "Hello {first_name}, qualify for a top-up loan today at 50% off interest rates! Apply in the app." },
];

// --- Fetchers ---

async function fetchNotificationHistory(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data as NotificationLog[];
}

async function getAudienceMetrics(tenantId: string, group: string, channel: string) {
  const supabase = createClient();
  // Enterprise RPC: Calculates count based on complex filters and multiplies by channel cost rate
  const { data, error } = await supabase.rpc('get_audience_metrics', { 
    p_tenant_id: tenantId, 
    p_group: group,
    p_channel: channel 
  });
  
  if (error) {
    // Fallback for demo if RPC missing
    return { count: 124, estimated_cost: channel === 'SMS' ? 124 * 50 : 0 }; // 50 UGX per SMS
  }
  return data as AudienceMetrics;
}

async function dispatchBroadcast({ tenantId, data }: { tenantId: string, data: NotificationFormValues }) {
  const supabase = createClient();
  // Enterprise RPC: Inserts into job queue (Redis/BullMQ usually picks this up)
  const { error } = await supabase.rpc('dispatch_bulk_notification', {
    p_tenant_id: tenantId,
    p_channel: data.channel,
    p_group: data.recipient_group,
    p_message: data.message_body
  });

  if (error) throw new Error(error.message);
}

// --- Component ---

export function NotificationsManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("compose");

  // Form
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      channel: 'SMS',
      recipient_group: 'ACTIVE_LOANS',
      message_body: ''
    }
  });

  // Watch values for real-time cost estimation
  const watchedGroup = watch('recipient_group');
  const watchedChannel = watch('channel');
  const watchedMessage = watch('message_body');

  // Queries
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['notification-history', tenantId],
    queryFn: () => fetchNotificationHistory(tenantId),
    enabled: activeTab === 'history'
  });

  const { data: metrics } = useQuery({
    queryKey: ['audience-metrics', tenantId, watchedGroup, watchedChannel],
    queryFn: () => getAudienceMetrics(tenantId, watchedGroup, watchedChannel),
    staleTime: 1000 * 60 // Cache for 1 min
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: (data: NotificationFormValues) => dispatchBroadcast({ tenantId, data }),
    onSuccess: () => {
      toast.success("Broadcast queued successfully");
      reset();
      setActiveTab("history");
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  // Helper to insert variables
  const insertVariable = (variable: string) => {
    const current = watchedMessage || "";
    setValue('message_body', current + ` ${variable} `);
  };

  // Helper to load template
  const loadTemplate = (id: string) => {
    const template = TEMPLATES.find(t => t.id === id);
    if (template) {
        setValue('message_body', template.text);
    }
  };

  const smsCount = Math.ceil((watchedMessage?.length || 0) / 160);

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
            <TabsTrigger value="compose" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                <Send className="w-4 h-4 mr-2"/> Compose Broadcast
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                <History className="w-4 h-4 mr-2"/> Transmission Logs
            </TabsTrigger>
        </TabsList>

        {/* --- Tab 1: Compose --- */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left: Configuration Form */}
            <Card className="md:col-span-2 shadow-sm border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle>New Broadcast</CardTitle>
                <CardDescription>Configure target audience and message content.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Channel</label>
                      <Select onValueChange={(val: any) => setValue('channel', val)} defaultValue="SMS">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SMS">SMS (Direct)</SelectItem>
                          <SelectItem value="WHATSAPP">WhatsApp Business</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="INAPP">In-App Push</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Audience</label>
                      <Select onValueChange={(val: any) => setValue('recipient_group', val)} defaultValue="ACTIVE_LOANS">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL_BORROWERS">All Borrowers</SelectItem>
                          <SelectItem value="ACTIVE_LOANS">Active Loans (Outstanding)</SelectItem>
                          <SelectItem value="DEFAULTERS_ONLY">Defaulters (Risk)</SelectItem>
                          <SelectItem value="KYC_PENDING">KYC Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Message Content</label>
                        <Select onValueChange={loadTemplate}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Load Template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Textarea 
                      {...register('message_body')} 
                      className="min-h-[150px] font-mono text-sm"
                      placeholder="Type your message here..."
                    />
                    
                    {/* Variable Injectors */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-xs text-muted-foreground mr-2 py-1">Insert Variable:</span>
                        {['{first_name}', '{amount_due}', '{due_date}', '{loan_ref}'].map((v) => (
                            <Badge 
                                key={v} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-slate-100 font-mono text-xs"
                                onClick={() => insertVariable(v)}
                            >
                                {v}
                            </Badge>
                        ))}
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>Chars: {watchedMessage?.length || 0} ({smsCount} SMS segment{smsCount !== 1 ? 's' : ''})</span>
                        {errors.message_body && <span className="text-red-500">{errors.message_body.message}</span>}
                    </div>
                  </div>

                  {/* Warning for High Volume */}
                  {metrics && metrics.count > 1000 && (
                      <Alert variant="destructive" className="py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-sm font-bold">High Volume Warning</AlertTitle>
                          <AlertDescription className="text-xs">
                              You are about to message over 1,000 users. This may take some time to process.
                          </AlertDescription>
                      </Alert>
                  )}

                  <div className="pt-4 border-t flex justify-end">
                      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full md:w-auto">
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Confirm & Send Broadcast
                      </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right: Estimation Panel */}
            <div className="space-y-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600"/> Audience Size
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics?.count?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground">Recipients selected</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Info className="h-4 w-4 text-amber-600"/> Estimated Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatCurrency(metrics?.estimated_cost || 0)}</div>
                        <p className="text-xs text-muted-foreground">Based on current rates</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white border rounded p-3 text-sm text-slate-700 shadow-sm relative">
                             {watchedMessage ? (
                                 watchedMessage
                                    .replace('{first_name}', 'John')
                                    .replace('{amount_due}', '50,000')
                                    .replace('{due_date}', '12/10/2025')
                             ) : (
                                 <span className="text-gray-300 italic">Message preview will appear here...</span>
                             )}
                             <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] px-1 rounded">Now</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>

        {/* --- Tab 2: History --- */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
                <CardTitle>Communication Logs</CardTitle>
                <CardDescription>Audit trail of all system-generated and manual broadcasts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="text-right">Recipients</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingHistory ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading logs...</TableCell></TableRow> :
                         history?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No history found.</TableCell></TableRow> :
                         history?.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                    {formatDate(log.created_at)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{log.channel}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">{log.recipient_group.replace('_', ' ')}</TableCell>
                                <TableCell className="max-w-xs truncate text-xs text-slate-600" title={log.message_preview}>
                                    {log.message_preview}
                                </TableCell>
                                <TableCell className="text-right font-medium">{log.recipient_count}</TableCell>
                                <TableCell>
                                    {log.status === 'COMPLETED' && <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Sent</Badge>}
                                    {log.status === 'FAILED' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Failed</Badge>}
                                    {log.status === 'QUEUED' && <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Queued</Badge>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}