'use client';

import * as React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(3, "Name required"),
  goal: z.coerce.number().min(1, "Goal must be positive"),
  start: z.string().min(1, "Start date required"),
  end: z.string().min(1, "End date required"),
}).refine(data => new Date(data.end) > new Date(data.start), {
  message: "End date must be after start date",
  path: ["end"]
});

export function CreateCampaignModal({ open, onClose, tenantId, onComplete }: { open: boolean; onClose: ()=>void; tenantId: string; onComplete: ()=>void; }) {
  // Removed explicit generic to allow loose typing for coercion
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', goal: 0, start: '', end: '' }
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const db = createClient();
      await db.from("fundraising_campaigns").insert([{
        ...data, status: "ACTIVE", raised: 0, tenant_id: tenantId
      }]);
      toast.success("Campaign created!");
      form.reset();
      onComplete(); onClose();
    } catch(e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Fundraising Campaign</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField 
              control={form.control} 
              name="name" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    {/* Explicit cast to string */}
                    <Input {...field} value={field.value as string} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="goal" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Fundraising Goal</FormLabel>
                  <FormControl>
                    {/* Explicit cast to number or string for number input */}
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value as number}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || e.target.value)}
                    />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="start" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value as string} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField 
                control={form.control} 
                name="end" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value as string} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}