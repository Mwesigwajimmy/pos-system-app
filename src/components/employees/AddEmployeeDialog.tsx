'use client';
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// This function now calls our new, secure wrapper function in the database.
async function inviteEmployee(employeeData: { email: string; fullName: string; phone: string; role: string; }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('invite_user_to_business', {
        p_email: employeeData.email,
        p_full_name: employeeData.fullName,
        p_phone: employeeData.phone,
        p_role: employeeData.role,
    });
    if (error) throw error;
}

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: inviteEmployee,
    onSuccess: () => {
      toast.success("Invitation sent successfully!");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setOpen(false);
    },
    onError: (error: any) => toast.error(`Failed to send invitation: ${error.message}`),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
        email: formData.get('email') as string,
        fullName: formData.get('full_name') as string,
        phone: formData.get('phone') as string,
        role: formData.get('role') as string,
    };
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add New Employee</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Invite New Employee</DialogTitle><DialogDescription>Send an email invitation for a new employee to join your team.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} id="add-employee-form" className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="full_name" className="text-right">Full Name</Label><Input id="full_name" name="full_name" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" name="email" type="email" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone" className="text-right">Phone</Label><Input id="phone" name="phone" className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Role</Label>
            <Select name="role" required defaultValue='cashier'>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem> 
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter><Button type="submit" form="add-employee-form" disabled={mutation.isPending}>{mutation.isPending ? "Sending Invitation..." : "Send Invitation"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}