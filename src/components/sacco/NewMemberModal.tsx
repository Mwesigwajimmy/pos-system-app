'use client';

import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Globe } from "lucide-react";

interface NewMemberProps { 
  isOpen: boolean; // Renamed to standard 'isOpen'
  onClose?: () => void; 
  isPageMode?: boolean; // Support rendering as full page or modal
  tenantId?: string; // Optional if context is handled globally, but passed for safety
}

// Enterprise: Country configs
const COUNTRY_CONFIGS: Record<string, { code: string, dial: string, regex: RegExp }> = {
    'UG': { code: 'UG', dial: '+256', regex: /^(\+256|0)[7]\d{8}$/ },
    'KE': { code: 'KE', dial: '+254', regex: /^(\+254|0)[17]\d{8}$/ },
    'TZ': { code: 'TZ', dial: '+255', regex: /^(\+255|0)[67]\d{8}$/ },
    'RW': { code: 'RW', dial: '+250', regex: /^(\+250|0)[7]\d{8}$/ },
};

async function createMember(input: any) {
  const db = createClient();
  
  // Enterprise: Use RPC to ensure atomic creation of Member + Default Savings Account
  const { error } = await db.rpc('register_sacco_member', {
    p_full_name: input.name,
    p_phone: input.phone,
    p_national_id: input.nationalId,
    p_country: input.country,
    p_address: input.address,
    p_tenant_id: input.tenantId // Ensure tenant isolation
  });
  
  if (error) throw new Error(error.message);
}

export default function NewMemberModal({ isOpen, onClose, isPageMode = false }: NewMemberProps) {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState('UG');
  const [formData, setFormData] = useState({ name: '', phone: '', nationalId: '', address: '' });

  // Access current user/tenant from simple hook or context in real app
  // For this component, we assume tenantId is handled server-side by the RPC context or passed down
  
  const mutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      toast.success("Member onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      queryClient.invalidateQueries({ queryKey: ['bi-dashboard'] });
      setFormData({ name: '', phone: '', nationalId: '', address: '' });
      if (onClose) onClose();
    },
    onError: (e: any) => toast.error(e.message || "Registration failed")
  });

  const handleSubmit = () => {
    // 1. Validation
    if (!formData.name || !formData.phone || !formData.nationalId) return toast.error("Required fields missing");
    
    // 2. Country specific phone validation
    const config = COUNTRY_CONFIGS[country];
    if (!config.regex.test(formData.phone)) {
        return toast.error(`Invalid phone format for ${country}. Expected ${config.dial}...`);
    }

    mutation.mutate({ 
        ...formData, 
        country, 
        // In a real component, tenantId is injected via Props or Context. 
        // We'll leave it to the RPC to resolve from auth.uid() if not passed explicitly.
    });
  };

  const Content = (
    <div className="grid gap-4 py-4">
        {/* Country Selector */}
        <div className="space-y-2">
            <Label>Country / Region</Label>
            <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="UG">Uganda (UGX)</SelectItem>
                    <SelectItem value="KE">Kenya (KES)</SelectItem>
                    <SelectItem value="TZ">Tanzania (TZS)</SelectItem>
                    <SelectItem value="RW">Rwanda (RWF)</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Full Legal Name</Label>
                <Input 
                    placeholder="As per National ID" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
            <div className="space-y-2">
                <Label>National ID / Passport No.</Label>
                <Input 
                    placeholder="e.g. CM12345678" 
                    value={formData.nationalId} 
                    onChange={e => setFormData({...formData, nationalId: e.target.value.toUpperCase()})}
                />
            </div>
        </div>

        <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="flex">
                <div className="bg-slate-100 border border-r-0 rounded-l-md px-3 flex items-center text-sm text-slate-500">
                    {COUNTRY_CONFIGS[country].dial}
                </div>
                <Input 
                    className="rounded-l-none"
                    placeholder="700 000000" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                />
            </div>
        </div>

        <div className="space-y-2">
            <Label>Physical Address</Label>
            <Input 
                placeholder="Village, District, or Street" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})}
            />
        </div>
    </div>
  );

  const Footer = (
    <div className="flex justify-end gap-2 mt-4">
        {onClose && <Button variant="outline" onClick={onClose}>Cancel</Button>}
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
            Register Member
        </Button>
    </div>
  );

  if (isPageMode) {
      return <div>{Content}{Footer}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" /> 
            New Member Registration
          </DialogTitle>
          <DialogDescription>
            Onboard a new member. Ensures KYC compliance for {country}.
          </DialogDescription>
        </DialogHeader>
        {Content}
        <DialogFooter>{Footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}