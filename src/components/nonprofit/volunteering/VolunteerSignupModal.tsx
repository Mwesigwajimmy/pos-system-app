'use client';

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, PlusCircle } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(5, "Phone required"),
  type: z.enum(["General", "Skilled", "Pro-bono"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

// Named Export
export function VolunteerSignupModal({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', phone: '', type: 'General' }
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      const db = createClient();
      const { error } = await db.from("volunteers").insert([{
        ...data, 
        status: "ACTIVE", // Auto-activate for now, or use PENDING
        tenant_id: tenantId, 
        joined_date: new Date().toISOString()
      }]);
      
      if(error) throw error;
      
      toast.success("Volunteer added successfully!");
      // Invalidate both lists so they update immediately
      queryClient.invalidateQueries({ queryKey: ['volunteers', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['volunteers-list', tenantId] });
      
      form.reset();
      setOpen(false);
    } catch(e:any) { 
        toast.error(e.message || "Failed to add volunteer"); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Recruit Volunteer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Register New Volunteer</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <FormField 
              control={form.control} 
              name="name" 
              render={({field}) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field}/></FormControl>
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
                    <FormControl><Input placeholder="john@example.com" {...field}/></FormControl>
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
                    <FormControl><Input placeholder="+1 234..." {...field}/></FormControl>
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
                      <SelectItem value="General">General Support</SelectItem>
                      <SelectItem value="Skilled">Skilled (Trade/Tech)</SelectItem>
                      <SelectItem value="Pro-bono">Pro-bono Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
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