'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Send, Loader2 } from "lucide-react";

// Validation Schema
const notificationSchema = z.object({
  message: z.string().min(5, "Message must be at least 5 characters"),
  channel: z.enum(["SMS", "EMAIL", "WHATSAPP", "INAPP"]),
  recipient_group: z.enum(["ALL", "DEFAULTERS", "ACTIVE_LOANS"]).default("ALL"), 
});

type NotificationForm = z.infer<typeof notificationSchema>;

async function sendLendingNotification({ tenantId, data }: { tenantId: string, data: NotificationForm }) {
  const db = createClient();
  const { error } = await db.rpc('dispatch_lending_notification', { 
    p_tenant_id: tenantId, 
    p_message: data.message, 
    p_channel: data.channel,
    p_recipient_group: data.recipient_group
  });
  if (error) throw error;
}

export function NotificationManager({ tenantId }: { tenantId: string }) {
  // FIX: Removed explicit <NotificationForm> generic to resolve type conflict with Zod default values
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: { 
      message: '',
      channel: 'SMS', 
      recipient_group: 'ALL' 
    }
  });

  const mutation = useMutation({
    mutationFn: (data: NotificationForm) => sendLendingNotification({ tenantId, data }),
    onSuccess: () => {
      toast.success("Notification dispatch started successfully.");
      reset();
    },
    onError: (e: Error) => toast.error(`Failed to send: ${e.message}`)
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Broadcast Notifications</CardTitle>
        <CardDescription>Send payment reminders or marketing messages to borrowers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data as NotificationForm))} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <Select onValueChange={(val: any) => setValue('channel', val)} defaultValue="SMS">
                <SelectTrigger>
                  <SelectValue placeholder="Select Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="INAPP">In-App Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Group</label>
              <Select onValueChange={(val: any) => setValue('recipient_group', val)} defaultValue="ALL">
                <SelectTrigger>
                  <SelectValue placeholder="Select Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Borrowers</SelectItem>
                  <SelectItem value="DEFAULTERS">Overdue / Defaulters</SelectItem>
                  <SelectItem value="ACTIVE_LOANS">Active Loans Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message Content</label>
            <Textarea 
              {...register('message')} 
              placeholder="e.g. Your payment of UGX 50,000 is due tomorrow." 
              className="h-32"
            />
            {errors.message && <p className="text-xs text-red-500">{errors.message.message as string}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Dispatch Notification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}