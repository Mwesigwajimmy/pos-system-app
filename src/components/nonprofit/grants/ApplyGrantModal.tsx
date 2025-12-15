'use client';

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus } from "lucide-react";

// --- Types ---
interface ApplyGrantModalProps {
  tenant: {
    tenantId: string;
    currency: string;
  };
}

// --- Schema ---
const grantSchema = z.object({
  title: z.string().min(3, "Title required"),
  funder: z.string().min(2, "Funder name required"),
  requested: z.coerce.number().min(1, "Amount required"),
  deadline: z.string().min(1, "Deadline required"),
});

type GrantFormValues = z.infer<typeof grantSchema>;

// --- Component ---
export default function ApplyGrantModal({ tenant }: ApplyGrantModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // FIX: Removed explicit <GrantFormValues> generic to allow implicit inference
  // from the resolver, preventing the "Type unknown is not assignable to number" error.
  const form = useForm({
    resolver: zodResolver(grantSchema),
    defaultValues: { title: '', funder: '', requested: 0, deadline: '' }
  });

  const onSubmit = async (data: GrantFormValues) => {
    try {
      const db = createClient();
      const { error } = await db.from("grants").insert([{
        ...data, 
        status: "APPLIED", 
        received: 0, 
        tenant_id: tenant.tenantId
      }]);

      if (error) throw error;

      toast.success("Grant application tracked!");
      form.reset();
      setOpen(false);
      router.refresh(); // Refresh Server Components
    } catch(e: any) { 
      toast.error(e.message || "Failed to create grant"); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Track New Grant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Track Grant Application</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField 
              control={form.control} 
              name="title" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Grant Title</FormLabel>
                  <FormControl>
                    {/* Explicitly cast value to string to satisfy strict type checking */}
                    <Input placeholder="e.g. Community Development 2024" {...field} value={field.value as string} />
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
                    <Input placeholder="e.g. Global Giving" {...field} value={field.value as string} />
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
                    <FormLabel>Requested ({tenant.currency})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        // FIX: Explicitly cast value to number and handle NaN in onChange
                        value={field.value as number}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          field.onChange(isNaN(val) ? 0 : val);
                        }}
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
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value as string} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} 
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}