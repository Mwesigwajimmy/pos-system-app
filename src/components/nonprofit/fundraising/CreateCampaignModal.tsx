'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, Sparkles, Target, CalendarDays, Plus } from "lucide-react";
import { useRouter } from 'next/navigation';

// --- TYPES ---
interface TenantContext { 
  tenantId: string;
  currency: string;
}

interface CreateCampaignModalProps {
  tenant: TenantContext;
}

// --- SCHEMA ---
const campaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  description: z.string().optional(),
  goal_amount: z.coerce.number().min(1, "Fundraising goal must be a positive number"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after the start date",
  path: ["end_date"]
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

// --- COMPONENT ---
export default function CreateCampaignModal({ tenant }: CreateCampaignModalProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // We rely on type inference here to avoid the "unknown vs number" resolver conflict
  const form = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: { 
      name: '', 
      description: '',
      goal_amount: 0, 
      start_date: new Date().toISOString().split('T')[0], // Default to today
      end_date: '' 
    }
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        description: '',
        goal_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      });
    }
  }, [open, form]);

  const onSubmit = async (data: CampaignFormValues) => {
    setIsSaving(true);
    const supabase = createClient();

    // 1. Get Current User (Audit)
    const { data: { user } } = await supabase.auth.getUser();

    try {
      // 2. Insert Record
      const { error } = await supabase.from("fundraising_campaigns").insert([{
        name: data.name,
        description: data.description,
        goal_amount: data.goal_amount,
        raised_amount: 0, // Initialize at 0
        start_date: data.start_date,
        end_date: data.end_date,
        status: "Active",
        tenant_id: tenant.tenantId,
        created_by: user?.id
      }]);

      if (error) throw error;

      toast.success("Campaign launched successfully!");
      setOpen(false);
      router.refresh(); // Update Server Components (lists/progress bars)
    } catch(e: any) { 
      console.error(e);
      toast.error(e.message || "Failed to create campaign"); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            New Fundraising Campaign
          </DialogTitle>
          <DialogDescription>
            Define goals and timelines for your new initiative.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Name */}
            <FormField 
              control={form.control} 
              name="name" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Annual Charity Gala 2024" {...field} value={field.value as string} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField 
              control={form.control} 
              name="description" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief details about the cause..." 
                      className="resize-none" 
                      {...field}
                      value={field.value as string}
                    />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            {/* Goal Amount */}
            <FormField 
              control={form.control} 
              name="goal_amount" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Fundraising Goal</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">
                        {tenant.currency}
                      </div>
                      <Input 
                        type="number" 
                        className="pl-12" 
                        placeholder="0.00"
                        {...field}
                        // FIX: Explicitly cast value to number to satisfy Strict Type check
                        // because z.coerce causes inference of 'unknown'
                        value={field.value as number}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          field.onChange(isNaN(val) ? 0 : val);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The target financial amount for this campaign.
                  </FormDescription>
                  <FormMessage/>
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="start_date" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="date" className="pl-9" {...field} value={field.value as string} />
                      </div>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField 
                control={form.control} 
                name="end_date" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="date" className="pl-9" {...field} value={field.value as string} />
                      </div>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Target className="mr-2 h-4 w-4" />} 
                Launch Campaign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}