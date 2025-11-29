'use client';

import * as React from "react";
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

const grantSchema = z.object({
  title: z.string().min(3, "Title required"),
  funder: z.string().min(2, "Funder name required"),
  requested: z.coerce.number().min(1, "Amount required"),
  deadline: z.string().min(1, "Deadline required"),
});

export function ApplyGrantModal({ open, onClose, tenantId, onComplete }: { open: boolean; onClose: ()=>void; tenantId: string; onComplete: ()=>void; }) {
  // Removed strict generic to allow Zod coercion logic
  const form = useForm({
    resolver: zodResolver(grantSchema),
    defaultValues: { title: '', funder: '', requested: 0, deadline: '' }
  });

  const onSubmit = async (data: z.infer<typeof grantSchema>) => {
    try {
      const db = createClient();
      await db.from("grants").insert([{
        ...data, status: "APPLIED", received: 0, tenant_id: tenantId
      }]);
      toast.success("Grant application tracked!");
      form.reset();
      onComplete(); onClose();
    } catch(e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Track Grant Application</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField 
              control={form.control} 
              name="title" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Grant Title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value as string} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="funder" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Funder/Organization</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value as string} />
                  </FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="requested" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Requested Amount</FormLabel>
                    <FormControl>
                      {/* FIX: Manually handle number input to satisfy TS */}
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

              <FormField 
                control={form.control} 
                name="deadline" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Submission Deadline</FormLabel>
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
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Track
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}