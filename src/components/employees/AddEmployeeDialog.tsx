'use client';
import { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant'; // Import the tenant hook to get business type
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- MASTER ROLE CONFIGURATION ---
// Values must match your DB user_role ENUM exactly
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

// Standard roles available to every business
const SHARED_ROLES = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'auditor', label: 'Auditor' },
];

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
  const { data: tenant } = useTenant();

  // Determine which roles to show based on the business type
  const availableRoles = useMemo(() => {
    const businessType = tenant?.business_type || 'Retail / Wholesale';
    const specificRoles = INDUSTRY_ROLES[businessType] || [];
    
    // Combine shared roles (Admin, Accountant, etc) with industry-specific ones
    return [...SHARED_ROLES, ...specificRoles];
  }, [tenant]);

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
        <DialogHeader>
          <DialogTitle>Invite New Employee</DialogTitle>
          <DialogDescription>
            Invite a team member to join your {tenant?.business_type || 'business'}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="add-employee-form" className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="full_name" className="text-right">Full Name</Label>
            <Input id="full_name" name="full_name" className="col-span-3" placeholder="Samuel Mwezigwa" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" name="email" type="email" className="col-span-3" placeholder="samuel@example.com" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Phone</Label>
            <Input id="phone" name="phone" className="col-span-3" placeholder="+256..." />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Role</Label>
            <Select name="role" required defaultValue='manager'>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a professional role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                        {role.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button 
            type="submit" 
            form="add-employee-form" 
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}