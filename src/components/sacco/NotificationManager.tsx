'use client';

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, MessageSquare, Mail, Bell } from "lucide-react";

async function sendNotification({ tenantId, message, channel, recipient }: { tenantId: string, message: string, channel: string, recipient: string }) {
  const db = createClient();
  const { error } = await db.from('notifications').insert([{ 
      tenant_id: tenantId, 
      message, 
      channel, 
      recipient_group: recipient, // e.g., 'ALL', 'DEFAULTERS', specific user ID
      status: 'QUEUED',
      sent_at: new Date().toISOString() 
  }]);
  
  if (error) throw error;
  // In a real app, this would trigger an Edge Function or background job
}

export function NotificationManager({ tenantId }: { tenantId: string }) {
  const [message, setMessage] = React.useState('');
  const [channel, setChannel] = React.useState('SMS');
  const [recipient, setRecipient] = React.useState('ALL_MEMBERS');

  const mutation = useMutation({
      mutationFn: sendNotification,
      onSuccess: () => {
          toast.success("Broadcast queued successfully");
          setMessage('');
      },
      onError: (e: any) => toast.error(e.message || "Failed to send")
  });

  const handleSend = () => {
      if (!message.trim()) return;
      mutation.mutate({ tenantId, message, channel, recipient });
  };

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500"/> Communications Center
          </CardTitle>
          <CardDescription>Send alerts, reminders, and updates to members.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Channel</label>
                <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="SMS"><div className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> SMS</div></SelectItem>
                        <SelectItem value="EMAIL"><div className="flex items-center"><Mail className="w-4 h-4 mr-2"/> Email</div></SelectItem>
                        <SelectItem value="INAPP"><div className="flex items-center"><Bell className="w-4 h-4 mr-2"/> In-App Push</div></SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Group</label>
                <Select value={recipient} onValueChange={setRecipient}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL_MEMBERS">All Active Members</SelectItem>
                        <SelectItem value="LOAN_DEFAULTERS">Loan Defaulters (Overdue)</SelectItem>
                        <SelectItem value="SAVERS">High Savings Balance</SelectItem>
                        <SelectItem value="STAFF">Staff Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium">Message Body</label>
                {channel === 'SMS' && (
                    <span className={`text-xs ${message.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                        {message.length}/160 chars
                    </span>
                )}
            </div>
            <Textarea 
                placeholder="Type your message here..." 
                value={message} 
                onChange={e => setMessage(e.target.value)}
                className="h-32 resize-none"
            />
        </div>

        <div className="pt-2">
            <Button 
                onClick={handleSend} 
                disabled={mutation.isPending || !message} 
                className="w-full bg-slate-900 hover:bg-slate-800"
            >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                Send Broadcast
            </Button>
        </div>

      </CardContent>
    </Card>
  )
}