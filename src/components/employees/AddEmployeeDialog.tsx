'use client';

import { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant'; // Import the tenant hook to get business context
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

// --- MASTER ROLE CONFIGURATION ---
// These values are surgically matched to your DB user_role ENUM to prevent casting crashes.
const INDUSTRY_ROLES: Record<string, { value: string; label: string }[]> = {
    'Retail / Wholesale': [
        { value: 'cashier', label: 'Cashier' },
        { value: 'pharmacist', label: 'Pharmacist' },
        { value: 'inventory_manager', label: 'Inventory Manager' },
    ],
    'Restaurant / Cafe': [
        { value: 'chef', label: 'Chef' },
        { value: 'waiter_staff', label: 'Server / Waiter' },
        { value: 'barista', label: 'Barista' },
        { value: 'bartender', label: 'Bartender' },
        { value: 'kitchen_staff', label: 'Kitchen Staff' },
    ],
    'SACCO / Co-operative': [
        { value: 'sacco_manager', label: 'SACCO Manager' },
        { value: 'teller', label: 'Teller' },
        { value: 'loan_officer', label: 'Loan Officer' },
        { value: 'matatu_driver', label: 'Driver' },
        { value: 'conductor', label: 'Conductor' },
    ],
    'Lending / Microfinance': [
        { value: 'loan_officer', label: 'Loan Officer' },
        { value: 'credit_analyst', label: 'Credit Analyst' },
        { value: 'debt_collector', label: 'Debt Collector' },
    ],
    'Telecom & Mobile Money': [
        { value: 'agent', label: 'Telecom Agent' },
        { value: 'dsr_rep', label: 'DSR (Sales Rep)' },
        { value: 'float_manager', label: 'Float Manager' },
    ],
    'Professional Services (Accounting, Medical)': [
        { value: 'lawyer', label: 'Legal Counsel' },
        { value: 'medical_officer', label: 'Medical Doctor' },
        { value: 'nurse', label: 'Nurse' },
        { value: 'practitioner', label: 'Practitioner' },
    ],
    'Contractor (General, Remodeling)': [
        { value: 'engineer', label: 'Engineer' },
        { value: 'site_manager', label: 'Site Manager' },
        { value: 'foreman', label: 'Foreman' },
    ],
    'Distribution / Wholesale Supply': [
        { value: 'warehouse_manager', label: 'Warehouse Manager' },
        { value: 'driver', label: 'Driver' },
        { value: 'procurement_officer', label: 'Procurement Officer' },
    ],
    'Nonprofit / Education / NGO': [
        { value: 'grant_manager', label: 'Grant Manager' },
        { value: 'donor_relations', label: 'Donor Relations' },
        { value: 'teacher_principal', label: 'Teacher / Principal' },
    ],
    'Rentals / Real Estate': [
        { value: 'property_manager', label: 'Property Manager' },
        { value: 'leasing_agent', label: 'Leasing Agent' },
    ],
    'Field Service (Trades, Barber, Salon)': [
        { value: 'barber_stylist', label: 'Barber / Stylist' },
        { value: 'field_technician', label: 'Technician' },
        { value: 'dispatcher', label: 'Dispatcher' },
    ]
};

// Standard roles available to every business context
const SHARED_ROLES = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'auditor', label: 'Auditor' },
];

/**
 * IDENTITY WELD MUTATION
 * Executes the cross-business invitation protocol.
 */
async function inviteEmployee(employeeData: { 
    email: string; 
    fullName: string; 
    phone: string; 
    role: string; 
    businessId: string; // --- ADDED: SOVEREIGN CONTEXT ---
}) {
    const supabase = createClient();
    
    // We call the RPC which handles the Supabase Auth Invitation and 
    // sets the 'is_invite' metadata flag to TRUE.
    const { error } = await supabase.rpc('invite_user_to_business', {
        p_email: employeeData.email,
        p_full_name: employeeData.fullName,
        p_phone: employeeData.phone,
        p_role: employeeData.role,
        p_business_id: employeeData.businessId
    });
    
    if (error) throw error;
}

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: tenant, isLoading: isTenantLoading } = useTenant();

  // --- 1. DYNAMIC ROLE RESOLUTION ---
  // Calculates the roles available specifically for this business type
  const availableRoles = useMemo(() => {
    const businessType = tenant?.business_type || 'Retail / Wholesale';
    const specificRoles = INDUSTRY_ROLES[businessType] || [];
    
    // Combine shared enterprise roles with the specific sector DNA roles
    return [...SHARED_ROLES, ...specificRoles];
  }, [tenant]);

  // --- 2. THE MUTATION WING ---
  const mutation = useMutation({
    mutationFn: inviteEmployee,
    onSuccess: () => {
      toast.success("Identity Invitation Sent Successfully!");
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['allEmployees'] });
      setOpen(false);
    },
    onError: (error: any) => {
      console.error("INVITATION_BREACH:", error);
      toast.error(`Protocol Failed: ${error.message}`);
    },
  });

  // --- 3. SUBMISSION PROTOCOL ---
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Safety: Ensure business context is loaded before inviting
    if (!tenant?.id) {
        toast.error("Business context not resolved. Please refresh.");
        return;
    }

    const formData = new FormData(event.currentTarget);
    const data = {
        email: formData.get('email') as string,
        fullName: formData.get('full_name') as string,
        phone: formData.get('phone') as string,
        role: formData.get('role') as string,
        businessId: tenant.id // --- INJECTING THE ACTIVE NODE ID ---
    };

    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-bold tracking-tight shadow-lg active:scale-95 transition-all">
            Add New Employee
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tighter uppercase">
            Invite New Employee
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Invite a team member to join <span className="text-blue-600 font-bold">{tenant?.name || 'this business'}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="add-employee-form" className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Full Name
            </Label>
            <Input 
                id="full_name" 
                name="full_name" 
                className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-semibold" 
                placeholder="e.g. Samuel Mwezigwa" 
                required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Work Email Address
            </Label>
            <Input 
                id="email" 
                name="email" 
                type="email" 
                className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-semibold" 
                placeholder="samuel@company.com" 
                required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Phone Number (Optional)
            </Label>
            <Input 
                id="phone" 
                name="phone" 
                className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 font-semibold" 
                placeholder="+256..." 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                Professional System Role
            </Label>
            <Select name="role" required defaultValue='manager'>
              <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-600 font-semibold">
                <SelectValue placeholder="Select an authorized role" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                {availableRoles.map((role) => (
                    <SelectItem 
                        key={role.value} 
                        value={role.value}
                        className="rounded-lg m-1 font-semibold focus:bg-blue-50 focus:text-blue-600"
                    >
                        {role.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter className="pt-2">
          <Button 
            type="submit" 
            form="add-employee-form" 
            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
            disabled={mutation.isPending || isTenantLoading}
          >
            {mutation.isPending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Authorizing...
                </span>
            ) : "Send Secure Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}