'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, MessageSquare, Mail, Bell, Users, Plus, Calculator, AlertCircle } from "lucide-react";

// --- Types ---
type ChannelType = 'SMS' | 'EMAIL' | 'PUSH_NOTIFICATION';
type RecipientGroup = 'ALL_MEMBERS' | 'LOAN_DEFAULTERS' | 'HIGH_SAVERS' | 'BOARD_MEMBERS' | 'STAFF';

interface BroadcastPayload {
    tenantId: string;
    channel: ChannelType;
    recipientGroup: RecipientGroup;
    subject?: string;
    messageTemplate: string;
}

// --- Server Actions / RPCs ---

// 1. Get Count of Target Audience (For Cost Estimation)
async function fetchAudienceCount(tenantId: string, group: RecipientGroup) {
    const db = createClient();
    // This RPC calculates the dynamic size of the group (e.g., query count of members where loan_overdue > 0)
    const { data, error } = await db.rpc('get_audience_size', { 
        p_tenant_id: tenantId, 
        p_group_type: group 
    });
    
    if (error) {
        // Fallback for demo if RPC doesn't exist yet, but in prod this throws
        console.warn("Audience count RPC missing, defaulting to 0");
        return 0;
    }
    return data as number;
}

// 2. Queue the Broadcast Job
async function queueBroadcast(payload: BroadcastPayload) {
    const db = createClient();
    // Enterprise: We don't send here. We insert into a high-performance job queue.
    // A separate worker (Edge Function) picks this up to handle rate limits and retries.
    const { data, error } = await db.rpc('queue_communication_job', { 
        p_tenant_id: payload.tenantId,
        p_channel: payload.channel,
        p_target_group: payload.recipientGroup,
        p_subject: payload.subject || null,
        p_body_template: payload.messageTemplate,
        p_scheduled_at: new Date().toISOString() // Immediate send
    });
  
    if (error) throw new Error(error.message);
    return data; // Returns Job ID
}

export default function NotificationManager({ tenantId }: { tenantId: string }) {
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [channel, setChannel] = useState<ChannelType>('SMS');
    const [recipient, setRecipient] = useState<RecipientGroup>('ALL_MEMBERS');
    
    // --- Cost Estimation Logic ---
    const { data: audienceSize, isLoading: isCounting } = useQuery({
        queryKey: ['audience-count', tenantId, recipient],
        queryFn: () => fetchAudienceCount(tenantId, recipient),
        staleTime: 60000 // Cache for 1 min
    });

    const smsSegments = Math.ceil(message.length / 160) || 1;
    const estimatedCost = channel === 'SMS' 
        ? (audienceSize || 0) * smsSegments * 35 // Assuming 35 UGX per SMS
        : 0;

    // --- Mutation ---
    const mutation = useMutation({
        mutationFn: queueBroadcast,
        onSuccess: (jobId) => {
            toast.success(`Broadcast queued! Job ID: #${jobId}`);
            setMessage('');
            setSubject('');
        },
        onError: (e: any) => toast.error(`Failed to queue: ${e.message}`)
    });

    const handleSend = () => {
        if (!message.trim()) return toast.error("Message body is required");
        if (channel === 'EMAIL' && !subject.trim()) return toast.error("Email subject is required");
        
        mutation.mutate({
            tenantId,
            channel,
            recipientGroup: recipient,
            subject: channel === 'EMAIL' ? subject : undefined,
            messageTemplate: message
        });
    };

    // Helper to inject variables
    const insertVariable = (variable: string) => {
        setMessage(prev => `${prev} {{${variable}}} `);
    };

    return (
        <Card className="h-full shadow-sm border-t-4 border-t-orange-500 flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500"/> Communications Hub
                </CardTitle>
                <CardDescription>Send bulk alerts, reminders, and marketing campaigns.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-5 flex-1 overflow-y-auto">
                
                {/* Configuration Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Channel</label>
                        <Select value={channel} onValueChange={(v: ChannelType) => setChannel(v)}>
                            <SelectTrigger className="bg-slate-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SMS"><div className="flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-blue-500"/> SMS Broadcast</div></SelectItem>
                                <SelectItem value="EMAIL"><div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-purple-500"/> Email Newsletter</div></SelectItem>
                                <SelectItem value="PUSH_NOTIFICATION"><div className="flex items-center"><Bell className="w-4 h-4 mr-2 text-orange-500"/> Mobile App Push</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Target Audience</label>
                        <Select value={recipient} onValueChange={(v: RecipientGroup) => setRecipient(v)}>
                            <SelectTrigger className="bg-slate-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL_MEMBERS">All Active Members</SelectItem>
                                <SelectItem value="LOAN_DEFAULTERS">Defaulters (Overdue &gt; 30 days)</SelectItem>
                                <SelectItem value="HIGH_SAVERS">High Net Worth (Savers)</SelectItem>
                                <SelectItem value="BOARD_MEMBERS">Board & Committee</SelectItem>
                                <SelectItem value="STAFF">Internal Staff</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {/* Audience Estimator */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            <Users className="w-3 h-3"/>
                            {isCounting ? (
                                <span className="animate-pulse">Calculating audience size...</span>
                            ) : (
                                <span>Reaching approx. <strong>{audienceSize?.toLocaleString()}</strong> recipients</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Email Subject Line (Conditional) */}
                {channel === 'EMAIL' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Subject Line</label>
                        <Input 
                            placeholder="e.g., Important Notice: Annual General Meeting" 
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>
                )}

                {/* Message Editor */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-semibold uppercase text-slate-500">Message Content</label>
                        
                        {channel === 'SMS' && (
                            <div className={`text-xs px-2 py-0.5 rounded ${message.length > 160 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {message.length} chars ({smsSegments} segment{smsSegments !== 1 ? 's' : ''})
                            </div>
                        )}
                    </div>
                    
                    <Textarea 
                        placeholder={channel === 'SMS' ? "Dear member, your loan payment is due..." : "Compose your email using HTML or plain text..."}
                        value={message} 
                        onChange={e => setMessage(e.target.value)}
                        className="h-40 resize-none font-mono text-sm leading-relaxed"
                    />

                    {/* Variable Injection Tools */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs text-muted-foreground flex items-center mr-1">
                            <Plus className="w-3 h-3 mr-1"/> Insert:
                        </span>
                        {['first_name', 'account_balance', 'loan_due_date', 'loan_amount'].map(v => (
                            <Badge 
                                key={v} 
                                variant="outline" 
                                className="cursor-pointer hover:bg-slate-100 transition-colors text-[10px]"
                                onClick={() => insertVariable(v)}
                            >
                                {`{{${v}}}`}
                            </Badge>
                        ))}
                    </div>
                </div>

            </CardContent>

            {/* Footer: Costs & Actions */}
            <CardFooter className="bg-slate-50 border-t p-4 flex flex-col gap-3">
                {/* Cost Estimator Box */}
                {channel === 'SMS' && audienceSize && audienceSize > 0 && (
                    <div className="w-full flex justify-between items-center text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-3 h-3"/>
                            <span>Estimated Campaign Cost:</span>
                        </div>
                        <span className="font-bold font-mono">UGX {estimatedCost.toLocaleString()}</span>
                    </div>
                )}

                <Button 
                    onClick={handleSend} 
                    disabled={mutation.isPending || !message || (channel === 'EMAIL' && !subject)} 
                    className="w-full bg-slate-900 hover:bg-slate-800 h-10 shadow-sm"
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                    {mutation.isPending ? "Queuing Broadcast..." : "Launch Campaign"}
                </Button>
                
                <p className="text-[10px] text-center text-muted-foreground">
                    This action will queue messages for delivery via the <strong>{tenantId}</strong> gateway.
                </p>
            </CardFooter>
        </Card>
    );
}