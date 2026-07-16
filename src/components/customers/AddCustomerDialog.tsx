'use client';

/**
 * --- BBU1 CUSTOMER ONBOARDING NODE ---
 * VERSION: v2.0 OMEGA (ADVANCED IDENTITY)
 * Use: Establishing master customer records with forensic contact mapping.
 * Logic: Integrated WhatsApp Identity + Multi-tenant Business ID Weld.
 */

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { 
    Loader2, 
    UserPlus, 
    Phone, 
    Mail, 
    MessageSquare, 
    ShieldCheck 
} from 'lucide-react';

// --- UI COMPONENTS ---
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
import { Label } from "@/components/ui/label";

/**
 * Logic: Adds a new customer to the forensic registry.
 * Note: Whatsapp number is optional to maintain industrial flexibility.
 */
async function addCustomer(customerData: { 
    name: string; 
    phone: string; 
    email: string; 
    whatsapp: string; 
}) {
    const supabase = createClient();
    
    // 1. Resolve User Identity for Tenant Context
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.business_id) throw new Error("Business context not resolved.");

    // 2. Execute Database Insert
    const { error } = await supabase.from('customers').insert({
        name: customerData.name,
        phone_number: customerData.phone || null,
        email: customerData.email || null,
        whatsapp_number: customerData.whatsapp || null, // THE ADVANCEMENT WELD
        business_id: profile.business_id,
        tenant_id: profile.business_id
    });
    
    if (error) throw error;
}

export default function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      toast.success("Customer identity committed to registry.", {
        icon: <ShieldCheck className="text-emerald-500" />
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
    },
    onError: (error: any) => toast.error(`Registry Error: ${error.message}`),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const data = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        whatsapp: formData.get('whatsapp') as string, // Logic: Extract WhatsApp node
    };

    if (!data.name.trim()) return toast.error("Customer name is required.");
    
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl px-6 transition-all active:scale-95 shadow-lg">
            <UserPlus size={16} className="mr-2" /> Add New Customer
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white">
        {/* HEADER BLOCK */}
        <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-blue-400" /> Identity Enrollment
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-2 leading-relaxed font-medium">
                    Establish a new client node within your business ecosystem. Contact details enable forensic document dispatch.
                </DialogDescription>
            </DialogHeader>
        </div>

        {/* FORM GRID: Strictly maintaining your UI structure */}
        <form onSubmit={handleSubmit} id="add-customer-form" className="p-8 space-y-5">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-[10px] font-bold uppercase text-slate-400 tracking-widest">Full Name</Label>
            <Input id="name" name="name" className="col-span-3 h-11 border-slate-100 bg-slate-50/50 rounded-xl font-bold focus:bg-white" required placeholder="Legal Name" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right text-[10px] font-bold uppercase text-slate-400 tracking-widest">Phone</Label>
            <Input id="phone" name="phone" className="col-span-3 h-11 border-slate-100 bg-slate-50/50 rounded-xl font-medium focus:bg-white" placeholder="+256..." />
          </div>

          {/* ADVANCEMENT: WHATSAPP IDENTITY NODE */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="whatsapp" className="text-right text-[10px] font-bold uppercase text-blue-500 tracking-widest">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" className="col-span-3 h-11 border-blue-50 bg-blue-50/10 rounded-xl font-bold text-blue-700 focus:bg-white" placeholder="International format" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right text-[10px] font-bold uppercase text-slate-400 tracking-widest">Email</Label>
            <Input id="email" name="email" type="email" className="col-span-3 h-11 border-slate-100 bg-slate-50/50 rounded-xl font-medium focus:bg-white" placeholder="client@example.com" />
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <DialogFooter className="p-8 bg-slate-50 border-t flex gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cancel</Button>
          <Button 
            type="submit" 
            form="add-customer-form" 
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black h-12 px-10 rounded-xl shadow-xl shadow-blue-600/20 uppercase tracking-widest text-[10px] flex-1 active:scale-95 transition-all"
          >
            {mutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Authenticating...</>
            ) : "Authorize Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}