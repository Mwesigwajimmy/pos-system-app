'use client';
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function addCustomer(customerData: { name: string; phone: string; email: string; }) {
    const supabase = createClient();
    const { error } = await supabase.from('customers').insert({
        name: customerData.name,
        phone_number: customerData.phone || null,
        email: customerData.email || null,
    });
    if (error) throw error;
}

export default function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      toast.success("Customer added successfully!");
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
    },
    onError: (error) => toast.error(`Failed to add customer: ${error.message}`),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
    };
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add New Customer</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Add New Customer</DialogTitle><DialogDescription>Add a new customer to your records.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} id="add-customer-form" className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Full Name</Label><Input id="name" name="name" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone" className="text-right">Phone</Label><Input id="phone" name="phone" className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" name="email" type="email" className="col-span-3" /></div>
        </form>
        <DialogFooter><Button type="submit" form="add-customer-form" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Customer"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}