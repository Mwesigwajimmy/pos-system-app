'use client';

import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";

interface NewMemberProps { 
  open: boolean; 
  onClose: () => void; 
  tenantId: string; 
  onComplete?: () => void; 
}

async function createMember(input: { name: string; phone: string; group: string; tenantId: string }) {
  const db = createClient();
  const { error } = await db.from("members").insert([{ 
    first_name: input.name.split(' ')[0], // Assuming simple name splitting or schema adjustment
    last_name: input.name.split(' ').slice(1).join(' ') || '',
    phone_number: input.phone, 
    group_name: input.group, 
    status: "ACTIVE", 
    joined_at: new Date().toISOString(), 
    tenant_id: input.tenantId 
  }]);
  
  if (error) throw new Error(error.message);
}

export function NewMemberDialog({ open, onClose, tenantId, onComplete }: NewMemberProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('');

  const mutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      toast.success("New member registered successfully");
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] }); // Refresh lists
      
      // Reset & Close
      setName('');
      setPhone('');
      setGroup('');
      if (onComplete) onComplete();
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create member")
  });

  const handleSubmit = () => {
    if (!name || !phone) {
      toast.error("Name and Phone are required");
      return;
    }
    mutation.mutate({ name, phone, group, tenantId });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" /> 
            Add New Member
          </DialogTitle>
          <DialogDescription>
            Register a new individual to the cooperative.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. John Doe" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-right">Phone Number</Label>
            <Input 
              id="phone" 
              placeholder="e.g. +256 700 000000" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group" className="text-right">Group / Zone (Optional)</Label>
            <Input 
              id="group" 
              placeholder="e.g. Kampala Central" 
              value={group} 
              onChange={(e) => setGroup(e.target.value)} 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !name || !phone}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Register Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}