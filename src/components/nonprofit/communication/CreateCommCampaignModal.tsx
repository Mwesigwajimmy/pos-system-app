'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription 
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  Loader2, CalendarClock, Send, Users, 
  Mail, MessageSquare, Smartphone, Bell, RefreshCw, Plus 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

// --- TYPES ---
interface TenantContext { 
  tenantId: string;
  currency: string;
}

interface CreateCommCampaignModalProps {
  tenant: TenantContext;
  onComplete?: () => void; // Optional now
  trigger?: React.ReactNode; // Optional custom trigger
}

// --- SCHEMA ---
const campaignSchema = z.object({
  name: z.string().min(3, "Campaign name is required"),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP", "PUSH"]),
  audience: z.enum(["ALL_DONORS", "ALL_VOLUNTEERS", "RECENT_BENEFS", "CUSTOM_SEGMENT"]),
  scheduled_at: z.string().refine((val) => new Date(val) > new Date(), {
    message: "Schedule time must be in the future",
  }),
  subject: z.string().optional(),
  body: z.string().min(10, "Message body must be at least 10 characters"),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function CreateCommCampaignModal({ 
  tenant, 
  onComplete,
  trigger
}: CreateCommCampaignModalProps) {
  
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      channel: 'EMAIL',
      audience: 'ALL_DONORS',
      scheduled_at: '',
      subject: '',
      body: ''
    }
  });

  const selectedAudience = form.watch("audience");
  const selectedChannel = form.watch("channel");
  const messageBody = form.watch("body");

  // Reset on open
  useEffect(() => {
    if (open) {
      form.reset();
      setEstimatedRecipients(null);
    }
  }, [open, form]);

  // Estimation Logic
  useEffect(() => {
    let isMounted = true;
    async function calculateAudienceSize() {
      if (!selectedAudience || !tenant.tenantId || !open) return;

      setIsEstimating(true);
      const supabase = createClient();
      let count = 0;

      try {
        if (selectedAudience === 'ALL_DONORS') {
          const { count: c } = await supabase.from('donors').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.tenantId).eq('status', 'Active');
          count = c || 0;
        } else if (selectedAudience === 'ALL_VOLUNTEERS') {
           const { count: c } = await supabase.from('volunteers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.tenantId).eq('status', 'Active');
           count = c || 0;
        } else if (selectedAudience === 'RECENT_BENEFS') {
           const d = new Date(); d.setDate(d.getDate() - 90);
           const { count: c } = await supabase.from('beneficiaries').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.tenantId).gte('created_at', d.toISOString());
           count = c || 0;
        } 
        if (isMounted) setEstimatedRecipients(count);
      } catch (err) {
        if (isMounted) setEstimatedRecipients(0);
      } finally {
        if (isMounted) setIsEstimating(false);
      }
    }
    calculateAudienceSize();
    return () => { isMounted = false; };
  }, [selectedAudience, tenant.tenantId, open]);

  const onSubmit = async (data: CampaignFormValues) => {
    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase.from("communication_campaigns").insert([{
        name: data.name, 
        channel: data.channel, 
        scheduled_at: new Date(data.scheduled_at).toISOString(), 
        status: "Scheduled", 
        recipient_count: estimatedRecipients || 0, 
        audience_segment: data.audience, 
        subject: data.subject, 
        body: data.body, 
        created_by: user?.id,
        tenant_id: tenant.tenantId,
      }]);

      if (error) throw error;

      toast.success("Campaign scheduled successfully!");
      
      // Handle cache and UI updates
      if (onComplete) onComplete();
      queryClient.invalidateQueries({ queryKey: ['comms-campaigns', tenant.tenantId] });
      router.refresh();
      
      setOpen(false);
    } catch (e: any) { 
      toast.error(e.message || "Failed to schedule campaign"); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Schedule Campaign
          </DialogTitle>
          <DialogDescription>
            Configure mass communication to be sent automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Monthly Newsletter" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="PUSH">Push</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_DONORS">All Donors</SelectItem>
                        <SelectItem value="ALL_VOLUNTEERS">Volunteers</SelectItem>
                        <SelectItem value="RECENT_BENEFS">Recent Beneficiaries</SelectItem>
                        <SelectItem value="CUSTOM_SEGMENT">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center h-5">
                       {isEstimating ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Users className="w-3 h-3 mr-1"/>}
                       {isEstimating ? "Calculating..." : estimatedRecipients !== null ? `${estimatedRecipients} recipients` : "Select audience"}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Time</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedChannel === 'EMAIL' && (
                <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input placeholder="Subject line..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            )}

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving || isEstimating}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}