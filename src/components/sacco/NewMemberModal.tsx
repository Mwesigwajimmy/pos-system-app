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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Globe } from "lucide-react";

interface NewMemberProps {
  isOpen: boolean; // Renamed to standard 'isOpen'
  onClose?: () => void;
  isPageMode?: boolean; // Support rendering as full page or modal
  tenantId?: string; // Optional if context is handled globally, but passed for safety
}

// Enterprise: Country configs
const COUNTRY_CONFIGS: Record<string, { code: string; dial: string; regex: RegExp }> = {
  UG: { code: 'UG', dial: '+256', regex: /^(\+256|0)[7]\d{8}$/ },
  KE: { code: 'KE', dial: '+254', regex: /^(\+254|0)[17]\d{8}$/ },
  TZ: { code: 'TZ', dial: '+255', regex: /^(\+255|0)[67]\d{8}$/ },
  RW: { code: 'RW', dial: '+250', regex: /^(\+250|0)[7]\d{8}$/ },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MemberFormState {
  name: string;
  phone: string;
  nationalId: string;
  address: string;
  // Added fields
  email: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  occupation: string;
  employer: string;
  district: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  initialShares: string;
}

const EMPTY_FORM: MemberFormState = {
  name: '',
  phone: '',
  nationalId: '',
  address: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  occupation: '',
  employer: '',
  district: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  nextOfKinRelationship: '',
  initialShares: '',
};

// NOTE: The RPC name and its original parameter contract (p_full_name, p_phone,
// p_national_id, p_country, p_address, p_tenant_id) are untouched below. The extra
// p_* keys added to this same params object are new fields — your register_sacco_member
// SQL function will need matching parameters added for these to persist. Nothing here
// changes how the RPC is invoked or named.
async function createMember(input: any) {
  const db = createClient();

  const { error } = await db.rpc('register_sacco_member', {
    p_full_name: input.name,
    p_phone: input.phone,
    p_national_id: input.nationalId,
    p_country: input.country,
    p_address: input.address,
    p_tenant_id: input.tenantId, // Ensure tenant isolation
    // Added fields
    p_email: input.email || null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_marital_status: input.maritalStatus || null,
    p_occupation: input.occupation || null,
    p_employer: input.employer || null,
    p_district: input.district || null,
    p_next_of_kin_name: input.nextOfKinName || null,
    p_next_of_kin_phone: input.nextOfKinPhone || null,
    p_next_of_kin_relationship: input.nextOfKinRelationship || null,
    p_initial_shares_amount: input.initialShares ? Number(input.initialShares) : 0,
  });

  if (error) throw new Error(error.message);
}

export default function NewMemberModal({ isOpen, onClose, isPageMode = false, tenantId }: NewMemberProps) {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState('UG');
  const [formData, setFormData] = useState<MemberFormState>(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      toast.success("Member onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ['sacco-members'] });
      queryClient.invalidateQueries({ queryKey: ['bi-dashboard'] });
      setFormData(EMPTY_FORM);
      if (onClose) onClose();
    },
    onError: (e: any) => toast.error(e.message || "Registration failed"),
  });

  const handleSubmit = () => {
    // 1. Required-field validation
    if (!formData.name || !formData.phone || !formData.nationalId) {
      return toast.error("Please complete all required fields (name, phone, national ID).");
    }
    if (!formData.dateOfBirth) return toast.error("Date of birth is required.");
    if (!formData.gender) return toast.error("Gender is required.");
    if (!formData.nextOfKinName || !formData.nextOfKinPhone) {
      return toast.error("Next of kin details are required.");
    }

    // 2. Country specific phone validation
    const config = COUNTRY_CONFIGS[country];
    if (!config.regex.test(formData.phone)) {
      return toast.error(`Invalid phone format for ${country}. Expected ${config.dial}...`);
    }

    // 3. Email format validation (only if provided, since it's optional)
    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      return toast.error("Please enter a valid email address.");
    }

    mutation.mutate({
      ...formData,
      country,
      // tenantId is now threaded through from props (previously not passed to the mutation).
      tenantId,
    });
  };

  const update = (field: keyof MemberFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const Content = (
    <div className="space-y-6 py-2">
      {/* Country / Region */}
      <div className="space-y-2">
        <Label htmlFor="country">Country / Region</Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger id="country"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="UG">Uganda (UGX)</SelectItem>
            <SelectItem value="KE">Kenya (KES)</SelectItem>
            <SelectItem value="TZ">Tanzania (TZS)</SelectItem>
            <SelectItem value="RW">Rwanda (RWF)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Personal Information */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">Personal Information</h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Legal Name</Label>
            <Input
              id="name"
              placeholder="As per National ID"
              value={formData.name}
              onChange={update('name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID / Passport No.</Label>
            <Input
              id="nationalId"
              placeholder="e.g. CM12345678"
              value={formData.nationalId}
              onChange={e => setFormData({ ...formData, nationalId: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={update('dateOfBirth')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={v => setFormData({ ...formData, gender: v })}>
              <SelectTrigger id="gender"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <Select value={formData.maritalStatus} onValueChange={v => setFormData({ ...formData, maritalStatus: v })}>
              <SelectTrigger id="maritalStatus"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              placeholder="e.g. Teacher, Trader, Farmer"
              value={formData.occupation}
              onChange={update('occupation')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employer">Employer / Business Name (Optional)</Label>
          <Input
            id="employer"
            placeholder="e.g. Ministry of Education, self-employed"
            value={formData.employer}
            onChange={update('employer')}
          />
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">Contact Information</h4>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="flex">
            <div className="flex items-center rounded-l-md border border-r-0 bg-slate-100 px-3 text-sm text-slate-500">
              {COUNTRY_CONFIGS[country].dial}
            </div>
            <Input
              id="phone"
              className="rounded-l-none"
              placeholder="700 000000"
              value={formData.phone}
              onChange={update('phone')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={update('email')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="address">Physical Address</Label>
            <Input
              id="address"
              placeholder="Village, District, or Street"
              value={formData.address}
              onChange={update('address')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              placeholder="e.g. Kampala"
              value={formData.district}
              onChange={update('district')}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Next of Kin */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">Next of Kin</h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nextOfKinName">Full Name</Label>
            <Input
              id="nextOfKinName"
              value={formData.nextOfKinName}
              onChange={update('nextOfKinName')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextOfKinRelationship">Relationship</Label>
            <Input
              id="nextOfKinRelationship"
              placeholder="e.g. Spouse, Parent"
              value={formData.nextOfKinRelationship}
              onChange={update('nextOfKinRelationship')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextOfKinPhone">Phone Number</Label>
          <Input
            id="nextOfKinPhone"
            placeholder="+256 7XX XXX XXX"
            value={formData.nextOfKinPhone}
            onChange={update('nextOfKinPhone')}
          />
        </div>
      </div>

      <Separator />

      {/* Membership */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">Membership Details (Optional)</h4>
        <div className="space-y-2">
          <Label htmlFor="initialShares">Initial Share Contribution</Label>
          <Input
            id="initialShares"
            type="number"
            min="0"
            placeholder="0"
            value={formData.initialShares}
            onChange={update('initialShares')}
          />
        </div>
      </div>
    </div>
  );

  const Footer = (
    <div className="mt-4 flex justify-end gap-2">
      {onClose && <Button variant="outline" onClick={onClose}>Cancel</Button>}
      <Button onClick={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
        Register Member
      </Button>
    </div>
  );

  if (isPageMode) {
    return <div>{Content}{Footer}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
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
  );
}