'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, CalendarClock, Send } from "lucide-react";

// --- Schema ---
const campaignSchema = z.object({
  name: z.string().min(3, "Campaign name is required"),
  channel: z.enum(["EMAIL", "SMS", "NEWSLETTER", "INAPP"]),
  audience: z.enum(["ALL_DONORS", "ALL_VOLUNTEERS", "RECENT_BENEFS", "SEGMENTED"]),
  scheduled: z.string().refine(val => new Date(val) > new Date(), "Schedule time must be in the future"),
  subject: z.string().min(5, "Subject is required"),
  body: z.string().min(10, "Message body must be at least 10 characters"),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

// --- Component ---
export function CreateCommCampaignModal({ 
  open, 
  onClose, 
  tenantId, 
  onComplete 
}: { 
  open: boolean; 
  onClose: () => void; 
  tenantId: string; 
  onComplete: () => void; 
}) {
  const [isSaving, setIsSaving] = React.useState(false);

  // FIX: Explicitly typed generic <CampaignFormValues> removed to prevent TS inference issues
  // Let Zod handle the inference
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      channel: 'EMAIL',
      audience: 'ALL_DONORS',
      scheduled: '',
      subject: '',
      body: ''
    }
  });

  const onSubmit = async (data: CampaignFormValues) => {
    setIsSaving(true);
    try {
      const db = createClient();
      const { error } = await db.from("communication_campaigns").insert([{
        name: data.name, 
        channel: data.channel, 
        scheduled: new Date(data.scheduled).toISOString(), 
        status: "Scheduled", 
        recipients: 0,
        audience: data.audience, 
        subject: data.subject, 
        body: data.body, 
        sent: false, 
        tenant_id: tenantId,
      }]);

      if (error) throw error;

      toast.success("Campaign scheduled successfully!");
      form.reset();
      onComplete(); 
      onClose();
    } catch (e: any) { 
      toast.error(e.message || "Failed to schedule campaign"); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            Create Campaign
          </DialogTitle>
          <DialogDescription>
            Schedule a new mass communication to your stakeholders.
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
                  <FormControl>
                    <Input placeholder="e.g. Q4 Fundraising Drive" {...field} />
                  </FormControl>
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
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="NEWSLETTER">Newsletter</SelectItem>
                        <SelectItem value="INAPP">In-App</SelectItem>
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
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_DONORS">All Donors</SelectItem>
                        <SelectItem value="ALL_VOLUNTEERS">All Volunteers</SelectItem>
                        <SelectItem value="RECENT_BENEFS">Recent Beneficiaries</SelectItem>
                        <SelectItem value="SEGMENTED">Custom Segment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scheduled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Line</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter subject..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Type your message here..." 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Schedule Campaign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}