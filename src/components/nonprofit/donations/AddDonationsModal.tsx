'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Loader2, DollarSign, CreditCard, Plus } from 'lucide-react';

// --- TYPES ---
interface TenantContext {
  tenantId: string;
  currency: string;
}

interface AddDonationsModalProps {
  tenant: TenantContext;
  userId?: string;
}

// --- VALIDATION SCHEMA ---
const donationSchema = z.object({
  donorId: z.string().min(1, "Please select a donor"),
  // z.coerce handles string->number conversion automatically
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  currency: z.string().default("USD"),
  method: z.enum(["CARD", "CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHECK"]),
  campaignId: z.string().optional(),
  notes: z.string().optional(),
});

type DonationFormValues = z.infer<typeof donationSchema>;

// --- DATA FETCHING HELPERS ---
async function getDonors(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('donors')
    .select('id, first_name, last_name, organization_name')
    .eq('tenant_id', tenantId)
    .eq('status', 'Active')
    .order('last_name');
  
  if (error) console.error("Error fetching donors:", error);
  
  return (data || []).map(d => ({
    id: d.id,
    name: d.organization_name || `${d.first_name} ${d.last_name}`.trim()
  }));
}

async function getCampaigns(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('communication_campaigns')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'Scheduled');
  
  if (error) console.error("Error fetching campaigns:", error);
  return data || [];
}

// --- COMPONENT ---
export default function AddDonationsModal({ tenant, userId }: AddDonationsModalProps) {
  const [open, setOpen] = React.useState(false);
  const [donors, setDonors] = React.useState<{id: string, name: string}[]>([]);
  const [campaigns, setCampaigns] = React.useState<{id: string, name: string}[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();

  // Reset form and load data when modal opens
  React.useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      const loadData = async () => {
        try {
          const [d, c] = await Promise.all([
            getDonors(tenant.tenantId), 
            getCampaigns(tenant.tenantId)
          ]);
          setDonors(d);
          setCampaigns(c);
        } catch (error) {
          toast.error("Failed to load donor data");
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [open, tenant.tenantId]);

  const form = useForm({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: 0,
      currency: tenant.currency || 'USD',
      method: 'CARD' as const,
      notes: '',
      donorId: '',
      campaignId: 'none' 
    }
  });

  const onSubmit = async (data: DonationFormValues) => {
    setIsSaving(true);
    const supabase = createClient();

    try {
      let creatorId = userId;
      if (!creatorId) {
        const { data: { user } } = await supabase.auth.getUser();
        creatorId = user?.id;
      }

      const { error } = await supabase.from("donations").insert([{
        donor_id: data.donorId, 
        amount: data.amount, 
        currency: data.currency, 
        method: data.method, 
        campaign_id: data.campaignId === 'none' ? null : data.campaignId,
        date: new Date().toISOString(),
        notes: data.notes, 
        created_by: creatorId, 
        tenant_id: tenant.tenantId
      }]);

      if (error) throw error;

      toast.success("Donation recorded successfully!");
      form.reset();
      setOpen(false);
      router.refresh(); 
    } catch (e: any) { 
      console.error(e);
      toast.error(e.message || "Failed to record donation"); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Record Donation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Record Donation
          </DialogTitle>
          <DialogDescription>
            Log a new financial contribution from a donor manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="donorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingData ? "Loading donors..." : "Select Donor"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {donors.length === 0 && !isLoadingData && (
                        <SelectItem value="none" disabled>No donors found</SelectItem>
                      )}
                      {donors.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input 
                          type="number" 
                          className="pl-8" 
                          placeholder="0.00"
                          {...field}
                          // FIX: Explicitly cast the value to fix the "unknown is not assignable" error
                          value={field.value as string | number}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="UGX">UGX (USh)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                        <SelectItem value="CHECK">Check</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">General Fund</SelectItem>
                        {campaigns.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                        placeholder="Reference number, check number, or remarks..." 
                        className="min-h-[80px]" 
                        {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving || isLoadingData}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Record Donation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}