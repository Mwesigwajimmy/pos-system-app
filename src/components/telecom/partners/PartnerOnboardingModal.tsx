'use client';

import * as React from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Handshake } from "lucide-react";

interface PartnerModalProps {
    open: boolean;
    onClose: () => void;
    tenantId: string;
    onComplete: () => void;
}

export function PartnerOnboardingModal({ open, onClose, tenantId, onComplete }: PartnerModalProps) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !country) {
        toast.error("Name and Country are required");
        return;
    }

    setSaving(true);
    try {
      const db = createClient();
      const { error } = await db
        .from("telecom_partners")
        .insert([{ 
            name, 
            country, 
            region, 
            tenant_id: tenantId, 
            status: "PENDING_APPROVAL",
            onboarded_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      toast.success("Partner onboarded successfully");
      setName(''); setCountry(''); setRegion('');
      onComplete();
      onClose();
    } catch (e: any) {
        toast.error(e.message || "Onboarding failed");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-indigo-600"/> Onboard Partner
          </DialogTitle>
          <DialogDescription>Register a new channel partner or distributor.</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Partner Name</Label>
            <Input placeholder="e.g. City Distributors Ltd" value={name} onChange={e => setName(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Country</Label>
                <Input placeholder="e.g. Uganda" value={country} onChange={e => setCountry(e.target.value)}/>
            </div>
            <div className="space-y-2">
                <Label>Region/Zone</Label>
                <Input placeholder="e.g. North" value={region} onChange={e => setRegion(e.target.value)}/>
            </div>
          </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !name}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Complete Onboarding"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}