'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(5, "Phone required"),
  type: z.enum(["General", "Skilled", "Pro-bono"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function VolunteerSignupModal({ open, onClose, tenantId, onComplete }: { open: boolean; onClose: ()=>void; tenantId: string; onComplete: ()=>void; }) {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      phone: '', 
      type: 'General' // This matches the enum literal
    }
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      const db = createClient();
      const { error } = await db.from("volunteers").insert([{
        ...data, status: "PENDING", tenant_id: tenantId, joined: new Date().toISOString()
      }]);
      if(error) throw error;
      toast.success("Volunteer added!");
      form.reset();
      onComplete(); onClose();
    } catch(e:any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Register Volunteer</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField 
              control={form.control} 
              name="name" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field}/></FormControl>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="email" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField 
                control={form.control} 
                name="phone" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field}/></FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>

            <FormField 
              control={form.control} 
              name="type" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Skill Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Skilled">Skilled</SelectItem>
                      <SelectItem value="Pro-bono">Pro-bono Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Register
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}